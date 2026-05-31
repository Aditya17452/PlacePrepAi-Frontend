import { useState, useRef, useCallback } from "react";
import { startInterview, endInterview, getInterviewWebSocketURL } from "@/services/api";

export function useInterview() {
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const start = useCallback(async (jdId: string) => {
    setIsStarting(true);
    try {
      const data = await startInterview(jdId);
      setSessionId(data.sessionId);
      sessionStorage.setItem("session_id", data.sessionId);
      sessionStorage.setItem("opening_question", data.openingQuestion);
      sessionStorage.setItem("interview_company", data.company);
      sessionStorage.setItem("interview_role", data.role);

      const ws = new WebSocket(getInterviewWebSocketURL(data.sessionId));
      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      wsRef.current = ws;
      return data;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stop = useCallback(async () => {
    wsRef.current?.close();
    if (sessionId) await endInterview(sessionId);
    setIsConnected(false);
  }, [sessionId]);

  return { isConnected, isStarting, sessionId, start, stop };
}
