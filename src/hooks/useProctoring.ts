/**
 * Proctoring reporter.
 *
 * The browser only observes and reports. Events are queued and sent to the backend in
 * batches every few seconds; the server stores them, computes the integrity score and
 * alone decides whether a session must stop (sustained multiple faces / no face).
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { sendProctoringBatch, type ProctoringEvent, type VisionScores } from "@/services/api";

export type ProctoringEventType =
  | "tab_switch"
  | "window_blur"
  | "fullscreen_exit"
  | "no_face"
  | "multiple_faces"
  | "gaze_away"
  | "paste_attempt"
  | "mic_muted";

const FLUSH_EVERY_MS = 5_000;
const VISION_EVERY_MS = 15_000;
const MAX_BATCH = 50;
const MAX_QUEUE = 200;

interface Options {
  sessionId: string;
  enabled: boolean;
  onTerminate: (reason: string) => void;
}

export function useProctoring({ sessionId, enabled, onTerminate }: Options) {
  const queueRef = useRef<ProctoringEvent[]>([]);
  const visionRef = useRef<VisionScores | null>(null);
  const lastVisionSentRef = useRef(0);
  const sendingRef = useRef(false);
  const stoppedRef = useRef(false);
  const onTerminateRef = useRef(onTerminate);
  onTerminateRef.current = onTerminate;

  const report = useCallback(
    (type: ProctoringEventType, severity: number, detail?: Record<string, unknown>, snapshot?: string | null) => {
      if (!enabled || stoppedRef.current) return;
      queueRef.current.push({
        type,
        severity: Math.min(5, Math.max(1, Math.round(severity))),
        client_ts: new Date().toISOString(),
        detail: (detail ?? null) as ProctoringEvent["detail"],
        snapshot: snapshot ?? null,
      });
      if (queueRef.current.length > MAX_QUEUE) queueRef.current.splice(0, queueRef.current.length - MAX_QUEUE);
    },
    [enabled],
  );

  const setVision = useCallback((scores: VisionScores) => {
    visionRef.current = scores;
  }, []);

  const flush = useCallback(
    async (force = false) => {
      if (!enabled || !sessionId || sendingRef.current) return;
      const now = Date.now();
      const visionDue = visionRef.current && now - lastVisionSentRef.current >= VISION_EVERY_MS;
      if (!force && queueRef.current.length === 0 && !visionDue) return;

      const batch = queueRef.current.splice(0, MAX_BATCH);
      const vision = visionDue || force ? visionRef.current : null;
      sendingRef.current = true;
      try {
        const res = await sendProctoringBatch(sessionId, batch, vision);
        if (vision) lastVisionSentRef.current = now;
        if (res.terminate && !stoppedRef.current) {
          stoppedRef.current = true;
          onTerminateRef.current(res.terminate_reason || "The interview was stopped by proctoring.");
        }
      } catch {
        // Keep the events for the next attempt (newest kept if the queue overflows).
        queueRef.current = [...batch, ...queueRef.current].slice(-MAX_QUEUE);
      } finally {
        sendingRef.current = false;
      }
    },
    [enabled, sessionId],
  );

  /** Stop reporting (interview over). Sends whatever is still queued first. */
  const stop = useCallback(async () => {
    if (stoppedRef.current) return;
    await flush(true);
    stoppedRef.current = true;
  }, [flush]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => void flush(), FLUSH_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [enabled, flush]);

  return useMemo(() => ({ report, setVision, flush, stop }), [report, setVision, flush, stop]);
}
