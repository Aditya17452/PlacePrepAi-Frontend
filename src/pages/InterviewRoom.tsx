/**
 * Live interview room.
 *
 * Talks to the backend over plain HTTP, one request per answer:
 *   POST /interviews/{id}/turns   { turn_id, transcript, audio?, answered_question }
 * `turn_id` is generated here and reused on every retry, so a dropped request never
 * double-advances the interview or loses an answer. Progress is mirrored to
 * sessionStorage, so a refresh resumes where the student was.
 *
 * Proctoring signals are reported to the server (see useProctoring). The server computes
 * integrity and is the only one that can stop an interview for proctoring reasons; the
 * browser shows warnings but never ends a session on its own.
 */

import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Clock, Lightbulb, Camera, Send, Volume2, Mic, MicOff, Eye, EyeOff, AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { endInterview, submitTurn, type SubmitTurnResponse } from "@/services/api";
import { ApiError, newId, withRetry } from "@/lib/api/client";
import { displayName, getUser } from "@/lib/session";
import {
  clearInterview, getInterviewContext, loadProgress, saveProgress,
  type ChatMessage, type InterviewProgress,
} from "@/lib/interviewStore";
import { useProctoring } from "@/hooks/useProctoring";

/** A look-away / missing face lasting this long shows a warning to the student. */
const LOOK_AWAY_THRESHOLD_MS = 5000;
/** While a condition holds, re-report it (with its running duration) this often. */
const CONDITION_REPORT_EVERY_MS = 5000;
const FACE_CHECK_INTERVAL_MS = 500;

type Message = ChatMessage;
type Condition = "no_face" | "multiple_faces" | "gaze_away";

interface PendingTurn {
  turnId: string;
  transcript: string;
  answeredQuestion: string;
}

const speakWithGirlVoice = (text: string, onEnd?: () => void) => {
  if (!window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();

  // Small delay for smoother experience
  setTimeout(() => {
    // If text is fully uppercase, TTS might spell it out. We don't want that for names in greetings.
    // However, the TTS engine handles capitalization better if we just pass normal sentence casing.
    const utter = new SpeechSynthesisUtterance(text);

    // Optimized for natural sound
    utter.rate = 0.88;      // slightly slower = clearer
    utter.pitch = 1.15;     // natural female pitch
    utter.volume = 0.95;    // not too loud

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();

      // Priority order — best sounding voices first
      const preferred = [
        "Google UK English Female",
        "Microsoft Sonia Online (Natural) - English (United Kingdom)",
        "Microsoft Aria Online (Natural) - English (United States)",
        "Microsoft Jenny Online (Natural) - English (United States)",
        "Microsoft Zira - English (United States)",
        "Samantha",
        "Karen",
        "Moira",
        "Tessa"
      ];

      let chosen = null;
      for (const name of preferred) {
        chosen = voices.find(v => v.name === name);
        if (chosen) break;
      }

      // Fallback: any natural/online voice
      if (!chosen) {
        chosen = voices.find(v =>
          v.name.includes("Natural") ||
          v.name.includes("Online")
        );
      }

      // Last fallback: any female voice
      if (!chosen) {
        chosen = voices.find(v =>
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("sonia") ||
          v.name.toLowerCase().includes("aria")
        );
      }

      if (chosen) {
        utter.voice = chosen;
      }
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      pickVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }

    if (onEnd) utter.onend = onEnd;
    utter.onerror = () => onEnd?.();

    // Chrome bug fix — long text sometimes cuts off
    const MAX_CHUNK = 200;
    if (text.length > MAX_CHUNK) {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      let index = 0;

      const speakNext = () => {
        if (index >= sentences.length) { onEnd?.(); return; }
        const chunk = new SpeechSynthesisUtterance(sentences[index].trim());
        chunk.rate = utter.rate;
        chunk.pitch = utter.pitch;
        chunk.volume = utter.volume;
        if (utter.voice) chunk.voice = utter.voice;
        chunk.onend = () => { index++; speakNext(); };
        chunk.onerror = () => { index++; speakNext(); };
        window.speechSynthesis.speak(chunk);
        index++;
      };

      // Wait for voice to be set
      setTimeout(speakNext, 100);
      return;
    }

    window.speechSynthesis.speak(utter);
  }, 50);
};

const WarningOverlay = ({
  flagCount, reason, actionLabel, onDismiss,
}: {
  flagCount: number; reason: string; actionLabel: string; onDismiss: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
  >
    <motion.div
      initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 20 }}
      className="relative w-full max-w-md mx-4 p-8 rounded-2xl border-2 shadow-2xl text-center bg-card border-yellow-500/60 shadow-yellow-500/10"
    >
      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-yellow-500/20">
        <AlertTriangle className="w-8 h-8 text-yellow-400" />
      </div>
      <h2 className="text-xl font-black mb-2 text-yellow-500">Attention flag {flagCount}</h2>
      <p className="text-muted-foreground text-sm mb-2">{reason}</p>
      <p className="text-sm text-foreground/80 mb-6 mt-3">
        This has been recorded and lowers your integrity score, which is shown on your report and to your placement cell.
        Please keep your attention on the interview.
      </p>
      <Button onClick={onDismiss} className="w-full font-bold bg-yellow-500 hover:bg-yellow-600 text-black">
        {actionLabel}
      </Button>
    </motion.div>
  </motion.div>
);

const formatElapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const InterviewRoom = () => {
  const navigate = useNavigate();
  const ctx = getInterviewContext();
  const sessionId = ctx?.sessionId ?? "";
  const maxQuestions = ctx?.maxQuestions ?? 12;
  const openingQ = ctx?.openingQuestion || "Tell me about yourself.";
  const role = ctx?.role || "Session";
  const studentName = displayName(getUser()?.name);
  const greetingText = `Hello ${studentName}! Welcome to your PlacePrep AI mock interview for the ${role} position. I'm your AI interviewer today. Take a breath, relax, and answer clearly. Let's begin!`;

  const restored = useRef<InterviewProgress | null>(sessionId ? loadProgress(sessionId) : null).current;

  const [messages, setMessages] = useState<Message[]>(restored?.messages ?? []);
  const [feedback, setFeedback] = useState<{ tip: string; tone: string }[]>([]);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [connectionProblem, setConnectionProblem] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(restored?.questionsAsked ?? 1);
  const [phase, setPhase] = useState(restored?.phase ?? "warmup");
  const [elapsed, setElapsed] = useState("00:00");
  const [statusMsg, setStatusMsg] = useState("Getting ready...");
  const [textInput, setTextInput] = useState("");
  const [greeted, setGreeted] = useState(restored?.greeted ?? false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioSupported, setAudioSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const micIdleTimerRef = useRef<any>(null);
  const micStopReasonRef = useRef("unknown");
  const transcriptFinalRef = useRef("");
  const transcriptInterimRef = useRef("");
  const pendingSubmitRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pendingAudioRef = useRef<string | null>(null);
  const [flagCount, setFlagCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningReason, setWarningReason] = useState("");
  const [warningAction, setWarningAction] = useState<"dismiss" | "fullscreen">("dismiss");
  const [webcamActive, setWebcamActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceCheckRef = useRef<any>(null);
  const conditionTimerRef = useRef<any>(null);
  const hasFirstFrameProcessedRef = useRef(false);
  const sessionEndedRef = useRef(false);
  const showWarningRef = useRef(false);
  const greetedRef = useRef(restored?.greeted ?? false);
  const isProcessingRef = useRef(false);
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textInputRef = useRef("");
  const lastQuestionRef = useRef(restored?.lastQuestion ?? openingQ);
  const pendingTurnRef = useRef<PendingTurn | null>(restored?.pendingTurn ?? null);
  const pendingTurnAudioRef = useRef<string | null>(null);
  const progressRef = useRef({ messages, questionsAsked, phase });
  const handleSubmitRef = useRef<() => void>(() => {});
  /** When each condition started (ms), and when it was last reported. */
  const conditionSinceRef = useRef<Record<Condition, number | null>>({ no_face: null, multiple_faces: null, gaze_away: null });
  const conditionReportedRef = useRef<Record<Condition, number>>({ no_face: 0, multiple_faces: 0, gaze_away: 0 });
  const conditionWarnedRef = useRef<Record<Condition, boolean>>({ no_face: false, multiple_faces: false, gaze_away: false });

  textInputRef.current = textInput;
  showWarningRef.current = showWarning;
  progressRef.current = { messages, questionsAsked, phase };

  // ── Persistence ────────────────────────────────────────────────────────
  const persist = useCallback(
    (patch: Partial<InterviewProgress> = {}) => {
      if (!sessionId) return;
      saveProgress(sessionId, {
        messages: progressRef.current.messages,
        questionsAsked: progressRef.current.questionsAsked,
        phase: progressRef.current.phase,
        lastQuestion: lastQuestionRef.current,
        greeted: greetedRef.current,
        pendingTurn: pendingTurnRef.current,
        ...patch,
      });
    },
    [sessionId],
  );

  useEffect(() => { persist(); }, [messages, questionsAsked, phase, greeted, persist]);

  const markMicStopReason = (reason: string) => {
    micStopReasonRef.current = reason;
  };

  const speak = (text: string, onEnd?: () => void) => {
    setIsSpeaking(true);
    speakWithGirlVoice(text, () => { setIsSpeaking(false); onEnd?.(); });
  };

  const stopMic = () => {
    recognitionRef.current?.stop();
    isListeningRef.current = false;
    setIsListening(false);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ── Ending ─────────────────────────────────────────────────────────────
  const proctoringRef = useRef<ReturnType<typeof useProctoring> | null>(null);

  const finish = useCallback(
    async (reason: "completed" | "student_ended" | "client_error" | "server_stopped", spokenMessage: string, status: string) => {
      if (sessionEndedRef.current) return;
      sessionEndedRef.current = true;
      setSessionEnded(true);
      setShowWarning(false);
      window.speechSynthesis?.cancel();
      markMicStopReason(`end:${reason}`);
      stopMic();
      setStatusMsg(status);
      clearInterval(timerRef.current);

      const wrapUp = async () => {
        await proctoringRef.current?.stop().catch(() => {});
        stopWebcam();
        if (reason !== "server_stopped") {
          try { await endInterview(sessionId, reason === "completed" ? "completed" : reason); } catch { /* already ended server-side */ }
        }
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        clearInterview(sessionId);
        navigate(`/report?session=${encodeURIComponent(sessionId)}`, { replace: true });
      };

      if (spokenMessage) speak(spokenMessage, () => setTimeout(() => void wrapUp(), 600));
      else void wrapUp();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, navigate],
  );

  const proctoring = useProctoring({
    sessionId,
    enabled: Boolean(sessionId),
    onTerminate: (reason) =>
      void finish("server_stopped", `The interview has been stopped. ${reason}`, `Interview stopped — ${reason}`),
  });
  proctoringRef.current = proctoring;

  // ── Warnings (shown to the student; recorded server-side) ─────────────
  const showFlag = useCallback((reason: string, action: "dismiss" | "fullscreen" = "dismiss") => {
    if (sessionEndedRef.current || showWarningRef.current) return;
    setFlagCount((c) => c + 1);
    setWarningReason(reason);
    setWarningAction(action);
    setShowWarning(true);
    window.speechSynthesis?.cancel();
    markMicStopReason("attention-warning");
    stopMic();
    speakWithGirlVoice(`${reason} Please keep your attention on the interview.`);
  }, []);

  const dismissWarning = () => {
    if (warningAction === "fullscreen" && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
    setShowWarning(false);
    setTimeout(() => textareaRef.current?.focus(), 200);
  };

  // ── Webcam & face analysis ─────────────────────────────────────────────
  const captureSnapshot = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    canvas.width = 160; canvas.height = 120;
    const c = canvas.getContext("2d");
    if (!c) return null;
    c.drawImage(video, 0, 0, 160, 120);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
    return dataUrl.split(",")[1] ?? null;
  };

  const setCondition = (condition: Condition, active: boolean) => {
    const since = conditionSinceRef.current;
    if (active && since[condition] === null) since[condition] = Date.now();
    if (!active && since[condition] !== null) {
      since[condition] = null;
      conditionWarnedRef.current[condition] = false;
    }
  };

  /** Every second: report running conditions with their duration, warn after the threshold. */
  const startConditionReporter = () => {
    clearInterval(conditionTimerRef.current);
    conditionTimerRef.current = setInterval(() => {
      if (sessionEndedRef.current || !hasFirstFrameProcessedRef.current || !greetedRef.current) return;
      const now = Date.now();
      (Object.keys(conditionSinceRef.current) as Condition[]).forEach((condition) => {
        const since = conditionSinceRef.current[condition];
        if (since === null) return;
        const duration = now - since;
        if (duration < 1500) return; // ignore single-frame blips
        if (now - conditionReportedRef.current[condition] >= CONDITION_REPORT_EVERY_MS) {
          conditionReportedRef.current[condition] = now;
          const severity = condition === "multiple_faces" ? 4 : condition === "no_face" ? 3 : 2;
          const snapshot = condition === "multiple_faces" && duration < CONDITION_REPORT_EVERY_MS + 1500 ? captureSnapshot() : null;
          proctoring.report(condition, severity, { duration_ms: duration }, snapshot);
        }
        if (duration >= LOOK_AWAY_THRESHOLD_MS && !conditionWarnedRef.current[condition]) {
          conditionWarnedRef.current[condition] = true;
          const reasons: Record<Condition, string> = {
            no_face: "Your face is not visible to the camera.",
            multiple_faces: "More than one person is visible on camera.",
            gaze_away: "You appear to be looking away from the screen.",
          };
          showFlag(reasons[condition]);
        }
      });
    }, 1000);
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      setWebcamActive(true);
      startConditionReporter();
      void startFaceDetection();
    } catch {
      setWebcamActive(false);
      proctoring.report("no_face", 2, { reason: "camera_unavailable" });
    }
  };

  const stopWebcam = () => {
    clearTimeout(faceCheckRef.current);
    clearInterval(faceCheckRef.current);
    clearInterval(conditionTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setWebcamActive(false);
  };

  // MediaPipe FaceMesh, with a skin-pixel heuristic when it cannot load.
  const startFaceDetection = async () => {
    try {
      const { FaceMesh } = await import("@mediapipe/face_mesh");
      const faceMesh = new FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 3,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results: any) => {
        if (sessionEndedRef.current) return;
        hasFirstFrameProcessedRef.current = true;
        const faces: any[] = results.multiFaceLandmarks ?? [];
        const facePresent = faces.length > 0;
        setFaceDetected(facePresent);
        setCondition("no_face", !facePresent);
        setCondition("multiple_faces", faces.length > 1);
        if (!facePresent) { setCondition("gaze_away", false); return; }

        const landmarks = faces[0];
        const noseTip = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const eyeMidX = (leftEye.x + rightEye.x) / 2;
        const isLookingAtScreen = Math.abs(noseTip.x - eyeMidX) < 0.15;
        setCondition("gaze_away", !isLookingAtScreen);

        const faceHeight = landmarks[152].y - landmarks[10].y;
        const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
        let posture = 100;
        if (faceHeight < 0.15 || faceHeight > 0.85) posture -= 30;
        if (Math.abs(angle) > 15) posture -= 20;
        proctoring.setVision({ posture_score: Math.max(0, posture), eye_contact_score: isLookingAtScreen ? 100 : 0 });
      });

      const processVideo = async () => {
        if (sessionEndedRef.current) return;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try { await faceMesh.send({ image: videoRef.current }); } catch { /* bad frame */ }
        }
        faceCheckRef.current = setTimeout(() => requestAnimationFrame(processVideo), FACE_CHECK_INTERVAL_MS);
      };
      void processVideo();
    } catch (err) {
      console.warn("MediaPipe unavailable, using fallback detection:", err);
      faceCheckRef.current = setInterval(() => {
        if (sessionEndedRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const c = canvas?.getContext("2d");
        if (!video || !canvas || !c || video.readyState < 2) return;
        hasFirstFrameProcessedRef.current = true;
        canvas.width = 80; canvas.height = 60;
        c.drawImage(video, 0, 0, 80, 60);
        const data = c.getImageData(0, 0, 80, 60).data;
        let skin = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && r - b > 15) skin++;
        }
        const facePresent = skin / (80 * 60) > 0.04;
        setFaceDetected(facePresent);
        setCondition("no_face", !facePresent);
      }, 800);
    }
  };

  // ── Browser-level signals ──────────────────────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !sessionEndedRef.current && greetedRef.current) {
        proctoring.report("tab_switch", 3);
        showFlag("You switched tabs or minimized the window.");
      }
    };
    const onBlur = () => {
      if (!document.hidden && !sessionEndedRef.current && greetedRef.current) proctoring.report("window_blur", 2);
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement && !sessionEndedRef.current && greetedRef.current) {
        proctoring.report("fullscreen_exit", 3);
        showFlag("You left full screen.", "fullscreen");
      }
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("blur", onBlur);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [proctoring, showFlag]);

  const blockClipboard = (e: React.ClipboardEvent | React.MouseEvent) => e.preventDefault();

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const length = e.clipboardData?.getData("text")?.length ?? 0;
    proctoring.report("paste_attempt", 3, { length });
    setStatusMsg("Pasting is disabled during the interview. Type or speak your answer.");
  };


  // ── Voice input ──────────────────────────────────────────────────────
  // ── VOICE INPUT SETUP ─────────────────────────────────────────────────
  useEffect(() => {
    const clearMicIdleTimer = () => {
      if (micIdleTimerRef.current) {
        clearTimeout(micIdleTimerRef.current);
        micIdleTimerRef.current = null;
      }
    };

    const resetMicIdleTimer = () => {
      clearMicIdleTimer();
      micIdleTimerRef.current = setTimeout(() => {
        if (recognitionRef.current && isListeningRef.current) {
          markMicStopReason("idle-timeout");
          recognitionRef.current.stop();
          setStatusMsg("Mic stopped due to silence. Tap mic to continue.");
        }
      }, 9000);
    };

    // Pre-warm audio permission so first words are less likely to be missed.
    navigator.mediaDevices?.getUserMedia?.({ audio: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch(() => {});

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        micStopReasonRef.current = "active";
        transcriptFinalRef.current = "";
        transcriptInterimRef.current = "";
        isListeningRef.current = true;
        setIsListening(true);
        setStatusMsg("Listening... speak your answer");
        resetMicIdleTimer();
      };

      recognition.onresult = (event: any) => {
        let interim = "", finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalChunk += t; else interim += t;
        }
        if (finalChunk) transcriptFinalRef.current = `${transcriptFinalRef.current} ${finalChunk}`.trim();
        transcriptInterimRef.current = interim.trim();
        const merged = `${transcriptFinalRef.current} ${transcriptInterimRef.current}`.trim();
        setTextInput(merged);
        resetMicIdleTimer();
      };

      recognition.onspeechend = () => {
        markMicStopReason("speech-end");
        recognition.stop();
      };

      recognition.onend = () => {
        clearMicIdleTimer();
        isListeningRef.current = false;
        setIsListening(false);
        const merged = `${transcriptFinalRef.current} ${transcriptInterimRef.current}`.trim();
        if (merged) setTextInput(merged);
        if (pendingSubmitRef.current) {
          pendingSubmitRef.current = false;
          setTimeout(() => handleSubmitRef.current(), 60);
        }
        setTimeout(() => textareaRef.current?.focus(), 100);
      };

      recognition.onerror = (event: any) => {
        clearMicIdleTimer();
        isListeningRef.current = false;
        setIsListening(false);
        markMicStopReason(`error:${event.error || "unknown"}`);
        if (pendingSubmitRef.current) {
          pendingSubmitRef.current = false;
          setTimeout(() => handleSubmitRef.current(), 60);
        }
        if (event.error === "not-allowed") setStatusMsg("Mic denied. Allow mic in browser settings.");
        else if (event.error === "no-speech") setStatusMsg("No speech detected. Tap mic and try again.");
        else if (event.error !== "aborted") setStatusMsg("Voice error. Use text input instead.");
      };
      recognitionRef.current = recognition;
    }

    return () => clearMicIdleTimer();
  }, []);

  const toggleMic = async () => {
    const wasRecording = isRecording && mediaRecorderRef.current;
    const wasListening = isListeningRef.current;

    // Stop currently active recording/listening
    if (wasRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
    if (wasListening) {
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current?.stop();
    }
    if (wasRecording || wasListening) return;

    // Start both
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setTextInput("");
    transcriptFinalRef.current = "";

    // 1. Start MediaRecorder for Whisper audio (Start this FIRST to get permissions)
    if (audioSupported) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
        });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          setIsRecording(false);
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          if (audioBlob.size < 1000) { setStatusMsg("Recording too short, try again"); return; }
          const reader = new FileReader();
          reader.onloadend = () => {
            pendingAudioRef.current = (reader.result as string).split(',')[1];
            setStatusMsg("Recording captured — press Send or Enter");
            if (pendingSubmitRef.current) {
              pendingSubmitRef.current = false;
              handleSubmitRef.current();
            }
          };
          reader.readAsDataURL(audioBlob);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (e) {
        console.warn("MediaRecorder failed:", e);
      }
    }

    // 2. Start Web Speech API (Live text in textarea)
    // Needs a slight delay after getUserMedia in Chrome to prevent silent abortion
    setTimeout(() => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          isListeningRef.current = true;
          setIsListening(true);
          setStatusMsg("Recording & Listening... speak your answer");
        } catch (e: any) {
          if (e.name === 'InvalidStateError') {
            // Already started, which is perfectly fine
            isListeningRef.current = true;
            setIsListening(true);
            setStatusMsg("Recording & Listening... speak your answer");
          } else {
            console.warn("Could not start recognition:", e);
            if (isRecording) {
              setStatusMsg("Recording... (Live text unavailable)");
            } else {
              setStatusMsg("Could not start microphone");
            }
          }
        }
      } else if (isRecording) {
        setStatusMsg("Recording... (Live text unavailable)");
      } else {
        setStatusMsg("Could not start microphone");
      }
    }, 100);
  };

  // ── Turns ──────────────────────────────────────────────────────────────
  const applyTurnResponse = (res: SubmitTurnResponse) => {
    pendingTurnRef.current = null;
    pendingTurnAudioRef.current = null;
    isProcessingRef.current = false;
    setIsProcessing(false);
    setConnectionProblem("");
    setQuestionsAsked(res.questions_asked);
    setPhase(res.phase);
    if (res.feedback) setFeedback((prev) => [res.feedback!, ...prev].slice(0, 5));

    if (res.session_complete || !res.question) {
      persist({ pendingTurn: null });
      void finish(
        "completed",
        `Thank you ${studentName}! That's the end of the interview. Your report is being prepared. Well done!`,
        "Interview complete! Generating report...",
      );
      return;
    }

    lastQuestionRef.current = res.question;
    setMessages((prev) => [...prev, { role: "ai", text: res.question! }]);
    persist({ pendingTurn: null, lastQuestion: res.question });
    setStatusMsg("AI is speaking...");
    speak(res.question, () => {
      setStatusMsg("Type or speak your answer, then press Enter");
      setTimeout(() => textareaRef.current?.focus(), 200);
    });
  };

  const sendTurn = async (turn: PendingTurn, audio: string | null) => {
    isProcessingRef.current = true;
    setIsProcessing(true);
    setConnectionProblem("");
    setStatusMsg("AI is thinking...");
    pendingTurnRef.current = turn;
    pendingTurnAudioRef.current = audio;
    persist({ pendingTurn: turn });

    const attempt = () =>
      submitTurn(sessionId, {
        turn_id: turn.turnId,
        transcript: turn.transcript,
        audio,
        answered_question: turn.answeredQuestion,
      });

    try {
      let res: SubmitTurnResponse;
      try {
        res = await withRetry(attempt, {
          attempts: 4,
          onRetry: (n) => setStatusMsg(`Connection is slow — retrying (${n})...`),
        });
      } catch (err) {
        // Two copies of the same turn raced; the server has it. Replaying returns the stored response.
        if (err instanceof ApiError && err.status === 409 && /already submitted/i.test(err.message)) {
          await new Promise((r) => setTimeout(r, 1500));
          res = await attempt();
        } else {
          throw err;
        }
      }
      applyTurnResponse(res);
    } catch (err) {
      isProcessingRef.current = false;
      setIsProcessing(false);
      const e = err as ApiError;
      if (e instanceof ApiError && (e.status === 404 || (e.status === 409 && /already ended/i.test(e.message)))) {
        pendingTurnRef.current = null;
        void finish("server_stopped", "", "This interview has already ended. Opening your report...");
        return;
      }
      // Answer is kept (pendingTurn) and can be resent with the same turn_id.
      setConnectionProblem(e.message || "Could not send your answer.");
      setStatusMsg("Your answer is saved. Tap Retry to send it.");
    }
  };

  const retryPendingTurn = () => {
    const turn = pendingTurnRef.current;
    if (turn && !isProcessingRef.current) void sendTurn(turn, pendingTurnAudioRef.current);
  };

  const handleSubmit = () => {
    if (sessionEndedRef.current || showWarningRef.current || isProcessingRef.current) return;
    if (pendingTurnRef.current) { retryPendingTurn(); return; }

    // Stop recording first; its onstop handler stores the audio and calls submit again.
    if (mediaRecorderRef.current?.state === "recording") {
      pendingSubmitRef.current = true;
      mediaRecorderRef.current.stop();
      if (isListeningRef.current) {
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current?.stop();
      }
      return;
    }
    if (isListeningRef.current) {
      pendingSubmitRef.current = true;
      markMicStopReason("submit-stop");
      recognitionRef.current?.stop();
      return;
    }

    const answer = (textInputRef.current || `${transcriptFinalRef.current} ${transcriptInterimRef.current}`).trim();
    if (!answer && !pendingAudioRef.current) { textareaRef.current?.focus(); return; }
    setMessages((prev) => [...prev, { role: "user", text: answer || "[Audio answer]" }]);
    setTextInput("");
    transcriptFinalRef.current = "";
    transcriptInterimRef.current = "";
    window.speechSynthesis?.cancel();
    const audio = pendingAudioRef.current;
    pendingAudioRef.current = null;

    void sendTurn({ turnId: newId(), transcript: answer, answeredQuestion: lastQuestionRef.current }, audio);
  };
  handleSubmitRef.current = handleSubmit;


  // ── Main init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) { navigate("/dashboard", { replace: true }); return; }

    if (typeof MediaRecorder !== "undefined" && navigator.mediaDevices?.getUserMedia) setAudioSupported(true);

    const startedAt = ctx?.startedAt ?? Date.now();
    timerRef.current = setInterval(() => setElapsed(formatElapsed(Date.now() - startedAt)), 1000);
    void startWebcam();

    if (restored?.greeted) {
      // Resumed after a refresh: no greeting, pick up where we were.
      setStatusMsg("Welcome back — your interview has been restored.");
      if (pendingTurnRef.current) {
        setTimeout(() => retryPendingTurn(), 400);
      } else {
        setTimeout(() => textareaRef.current?.focus(), 300);
      }
    } else {
      setMessages([{ role: "ai", text: greetingText }]);
      setTimeout(() => {
        speak(greetingText, () => {
          setTimeout(() => {
            setMessages((prev) => [...prev, { role: "ai", text: openingQ }]);
            lastQuestionRef.current = openingQ;
            greetedRef.current = true;
            setGreeted(true);
            speak(openingQ, () => {
              setStatusMsg("Type or speak your answer, then press Enter");
              setTimeout(() => textareaRef.current?.focus(), 200);
            });
          }, 600);
        });
      }, 800);
    }

    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      stopWebcam();
      clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleEndInterview = () => {
    if (!confirm("End interview early? Your report will be generated from the answers so far.")) return;
    pendingAudioRef.current = null;
    void finish("student_ended", "", "Ending interview...");
  };

  const isConnected = online && !connectionProblem;
  const phaseColor = phase === "warmup" ? "text-warning" : phase === "technical" ? "text-primary" : "text-success";
  const canUseMic = !isProcessing && !isSpeaking && greeted && !sessionEnded && !showWarning && (voiceSupported || audioSupported);
  const canSubmit = !isProcessing && !isSpeaking && (textInput.trim().length > 0 || Boolean(pendingAudioRef.current)) && greeted && !sessionEnded && !showWarning;

  if (!sessionId) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col select-none" onCopy={blockClipboard} onCut={blockClipboard} onContextMenu={blockClipboard}>
      <Navbar />
      <AnimatePresence>
        {showWarning && (
          <WarningOverlay
            flagCount={flagCount}
            reason={warningReason}
            actionLabel={warningAction === "fullscreen" ? "Return to full screen" : "I understand — continue interview"}
            onDismiss={dismissWarning}
          />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="mt-16 flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <span className="font-medium text-foreground text-sm">{role}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full bg-primary/10 font-semibold ${phaseColor}`}>{phase}</span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" /> {elapsed}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {flagCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" /> {flagCount} flag{flagCount > 1 ? "s" : ""}
            </span>
          )}
          {webcamActive && (
            <div className={`flex items-center gap-1 text-xs ${faceDetected ? "text-green-500" : "text-red-500"}`}>
              {faceDetected ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{faceDetected ? "Focused" : "Look here"}</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground font-mono">Q {Math.min(questionsAsked, maxQuestions)}/{maxQuestions}</span>
          <Progress value={(Math.min(questionsAsked, maxQuestions) / maxQuestions) * 100} className="w-24 h-2" />
          <div title={isConnected ? "Connected" : "Connection problem"} className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
          {!sessionEnded && (
            <Button variant="destructive" size="sm" onClick={handleEndInterview}>
              <Phone className="w-3 h-3 mr-1" /> End
            </Button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className={`px-6 py-2 text-xs text-center font-medium border-b border-border transition-all
        ${connectionProblem || !online ? "bg-red-500/10 text-red-500"
          : isRecording || isListening ? "bg-red-500/10 text-red-500"
          : isProcessing ? "bg-primary/10 text-primary"
          : isSpeaking ? "bg-purple-500/10 text-purple-500" : "bg-green-500/10 text-green-600"}`}>
        {!online ? "You are offline. Your answer will be sent when you reconnect." : statusMsg}
      </div>

      {connectionProblem && !sessionEnded && (
        <div className="mx-auto mt-2 flex items-center gap-3 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-600">
          <WifiOff className="w-4 h-4" />
          <span>{connectionProblem}</span>
          <Button size="sm" variant="outline" onClick={retryPendingTurn} disabled={isProcessing}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] overflow-hidden">
        <div className="flex flex-col overflow-hidden border-r border-border">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl max-w-[85%] ${msg.role === "ai"
                  ? "bg-primary/10 border border-primary/20 mr-auto" : "bg-card border border-border ml-auto"}`}>
                <p className={`text-xs font-bold mb-1.5 flex items-center gap-1.5 ${msg.role === "ai" ? "text-primary" : "text-muted-foreground"}`}>
                  {msg.role === "ai" ? <><Volume2 className="w-3 h-3" /> AI Interviewer</> : " You"}
                </p>
                <p className="text-sm leading-relaxed text-foreground">{msg.text}</p>
              </motion.div>
            ))}
            {isSpeaking && !isProcessing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-xl bg-purple-500/8 border border-purple-500/20 mr-auto max-w-[180px]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5 items-end">
                    {[8,14,10,16,8].map((h,i) => (
                      <div key={i} className="w-1 bg-purple-400 rounded-full animate-bounce" style={{height:`${h}px`,animationDelay:`${i*0.1}s`}} />
                    ))}
                  </div>
                  <p className="text-xs text-purple-400 font-medium">Speaking...</p>
                </div>
              </motion.div>
            )}
            {isListening && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mr-auto max-w-[200px]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5 items-end">
                    {[6,12,8,14,6].map((h,i) => (
                      <div key={i} className="w-1 bg-red-400 rounded-full animate-bounce" style={{height:`${h}px`,animationDelay:`${i*0.12}s`}} />
                    ))}
                  </div>
                  <p className="text-xs text-red-400 font-medium">Listening...</p>
                </div>
              </motion.div>
            )}
            {isProcessing && !isSpeaking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-4 rounded-xl bg-primary/5 border border-primary/10 mr-auto max-w-[220px]">
                <p className="text-xs text-primary mb-2">AI is thinking...</p>
                <div className="flex gap-1.5">
                  {[0,0.2,0.4].map((d,i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{animationDelay:`${d}s`}} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-card">
            {sessionEnded ? (
              <div className="text-center py-4 text-green-400 font-medium text-sm">
                Interview complete — redirecting to your report...
              </div>
            ) : (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <textarea ref={textareaRef} value={textInput}
                    onChange={e => setTextInput(e.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste}
                    disabled={isProcessing || !greeted || sessionEnded || showWarning}
                    placeholder={
                      showWarning ? "Dismiss the warning to continue..."
                        : !greeted ? "Wait for greeting..."
                        : isProcessing ? "Processing..."
                        : isRecording ? "Stop recording — click mic to finish"
                        : isListening ? "Listening — speak now..."
                        : isSpeaking ? "Wait for AI..."
                        : "Type or speak your answer... (Enter to submit)"
                    }
                    rows={3}
                    className={`w-full px-4 py-3 text-sm bg-background border rounded-xl resize-none
                      focus:outline-none focus:ring-2 transition-all text-foreground placeholder:text-muted-foreground
                      ${isListening ? "border-red-500/50 focus:ring-red-500/20"
                        : isProcessing || !greeted || showWarning ? "border-border opacity-50 cursor-not-allowed focus:ring-0"
                        : "border-primary/30 hover:border-primary/60 focus:ring-primary/40"}`}
                  />
                  <p className="text-xs text-muted-foreground mt-1 ml-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Enter</kbd> to submit ·{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Shift+Enter</kbd> new line
                    {voiceSupported && <span className="ml-2">· mic to speak</span>}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {(voiceSupported || audioSupported) && (
                    <button onClick={toggleMic} disabled={!canUseMic}
                      title={isRecording ? "Stop recording" : isListening ? "Stop listening" : "Record answer"}
                      className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all
                        ${isRecording
                          ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/40 animate-pulse ring-2 ring-red-400"
                          : isListening
                          ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 animate-pulse"
                          : canUseMic
                          ? "bg-secondary hover:bg-secondary/80 border border-border"
                          : "bg-muted opacity-40 cursor-not-allowed"}`}>
                      {isRecording
                        ? <MicOff className="w-4 h-4 text-white" />
                        : isListening
                        ? <MicOff className="w-4 h-4 text-white" />
                        : <Mic className={`w-4 h-4 ${canUseMic ? "text-foreground" : "text-muted-foreground"}`} />}
                    </button>
                  )}
                  <button onClick={handleSubmit} disabled={!canSubmit}
                    className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all
                      ${canSubmit ? "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20" : "bg-muted cursor-not-allowed opacity-40"}`}>
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            )}
            {!sessionEnded && (
              <p className="text-center text-xs text-muted-foreground mt-3 bg-secondary/30 py-1.5 rounded-md inline-block px-4 mx-auto block w-fit">
                Note: If a word is transcribed incorrectly, relax! The AI evaluates your answers contextually.
              </p>
            )}

          </div>
        </div>

        {/* Right coaching panel */}
        <div className="hidden lg:flex flex-col">
          <div className="px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <Lightbulb className="w-4 h-4" /> Live Coaching
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="rounded-xl bg-muted/10 border border-border overflow-hidden relative h-36">
              <video ref={videoRef} className={`w-full h-full object-cover ${webcamActive ? 'block' : 'hidden'}`} autoPlay muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              
              {webcamActive && (
                <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium
                  ${faceDetected ? "bg-green-500/80 text-white" : "bg-red-500/80 text-white"}`}>
                  {faceDetected ? "Focused" : "Face Missing!"}
                </div>
              )}
              
              {!webcamActive && (
                <div className="w-full h-full flex items-center justify-center absolute inset-0">
                  <div className="text-center">
                    <Camera className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground/50">Camera not active</p>
                  </div>
                </div>
              )}
            </div>
            {/* Live Tracking Status Text */}
            <div className="text-center mt-2 mb-4">
              <p className={`text-xs font-semibold ${faceDetected ? 'text-green-500' : 'text-red-500'}`}>
                {faceDetected ? "✅ Face Tracking Active & Visible" : "❌ Face Not Detected - Please return to camera!"}
              </p>
            </div>
            {flagCount > 0 && (
              <div className="p-3 rounded-xl border text-xs bg-amber-500/15 border-amber-600/30 text-amber-700 font-medium">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="font-bold">Attention flags: {flagCount}</span>
                </div>
                <p className="text-muted-foreground text-xs">Flags lower your integrity score on the report.</p>
              </div>
            )}
            {feedback.length === 0
              ? <p className="text-xs text-muted-foreground text-center mt-2">Tips appear every 3rd answer</p>
              : feedback.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-xl border text-xs ${f.tone === "positive"
                    ? "bg-green-500/10 border-green-500/20 text-green-600 font-medium"
                    : "bg-amber-500/15 border-amber-600/30 text-amber-600 font-medium"}`}>
                  {f.tip}
                </motion.div>
              ))
            }
            <div className="mt-2 space-y-2">
              {["Use STAR method for behavioral answers","Be specific — mention tools & metrics",
                "Think 3 seconds before answering","Show enthusiasm for the role"].map((tip, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
                  {i+1}. {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
