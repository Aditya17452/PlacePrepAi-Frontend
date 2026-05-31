import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Circle, ChevronRight, Mic, Monitor, Wifi, Clock, Brain, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";

const INSTRUCTIONS = [
  {
    icon: <Wifi className="w-5 h-5" />,
    title: "Stable Internet",
    desc: "Make sure you have a stable internet connection throughout the interview.",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20"
  },
  {
    icon: <Mic className="w-5 h-5" />,
    title: "Microphone Access",
    desc: "Allow microphone access when prompted. Your voice will be used for answers.",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20"
  },
  {
    icon: <Monitor className="w-5 h-5" />,
    title: "Quiet Environment",
    desc: "Find a quiet place with minimal background noise for best performance.",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20"
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Time Commitment",
    desc: "The interview takes 15-20 minutes. Do not close the tab in between.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20"
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "Answer Honestly",
    desc: "Be honest about your skills. The AI evaluates based on your actual knowledge.",
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20"
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Type Your Answers",
    desc: "Type answers clearly in the text box. Press Enter or click Submit when done.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20"
  }
];

const PreInterview = () => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<boolean[]>(new Array(INSTRUCTIONS.length).fill(false));

  const studentName = sessionStorage.getItem("student_name") || "Candidate";
  const company = sessionStorage.getItem("interview_company") || "Company";
  const role = sessionStorage.getItem("interview_role") || "Role";
  const sessionId = sessionStorage.getItem("session_id");

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" } })
      .then(s => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => console.error("Camera preview failed:", err));

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const allChecked = checked.every(Boolean);

  const toggle = (i: number) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
  };

  const handleStart = () => {
    if (!allChecked) return;
    if (!sessionId) { navigate("/dashboard"); return; }
    navigate("/interview");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Interview Ready Check
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome, <span className="text-primary">{studentName}</span> 👋
          </h1>
          <p className="text-muted-foreground">
            You're about to interview for <span className="text-foreground font-medium">{role}</span> at <span className="text-foreground font-medium">{company}</span>
          </p>
        </motion.div>

        {/* Warning banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-6"
        >
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200">
            This interview uses <strong>1 interview credit</strong>. Once started, the session cannot be paused. Make sure you are ready before proceeding.
          </p>
        </motion.div>

        {/* Camera Preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-muted/10 border border-border rounded-xl"
        >
          <p className="text-sm font-semibold mb-3 text-foreground text-center">Camera Check</p>
          <div className="w-56 h-40 mx-auto rounded-lg overflow-hidden bg-black border border-border relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">Please ensure you are clearly visible in the frame.</p>
        </motion.div>

        {/* Checklist */}
        <div className="space-y-3 mb-8">
          {INSTRUCTIONS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              onClick={() => toggle(i)}
              className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all select-none
                ${checked[i]
                  ? "bg-primary/10 border-primary/30"
                  : `${item.bg} hover:opacity-90`
                }`}
            >
              <div className={`mt-0.5 flex-shrink-0 ${item.color}`}>
                {checked[i]
                  ? <CheckCircle className="w-5 h-5 text-primary" />
                  : <Circle className="w-5 h-5" />
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={item.color}>{item.icon}</span>
                  <p className="font-semibold text-sm text-foreground">{item.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${(checked.filter(Boolean).length / INSTRUCTIONS.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 200 }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {checked.filter(Boolean).length}/{INSTRUCTIONS.length} confirmed
          </span>
        </div>

        {/* Start button */}
        <AnimatePresence>
          <motion.div
            animate={{ opacity: allChecked ? 1 : 0.5 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              onClick={handleStart}
              disabled={!allChecked}
              className="w-full h-14 text-base font-bold gap-2 bg-primary hover:bg-primary/90 disabled:cursor-not-allowed"
            >
              {allChecked ? (
                <>
                  Start Interview <ChevronRight className="w-5 h-5" />
                </>
              ) : (
                `Check all ${INSTRUCTIONS.length - checked.filter(Boolean).length} remaining items to continue`
              )}
            </Button>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By starting, you agree that this session will use 1 credit from your account.
        </p>
      </div>
    </div>
  );
};

export default PreInterview;

