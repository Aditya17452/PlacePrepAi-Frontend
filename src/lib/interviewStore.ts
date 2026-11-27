/**
 * Client-side memory of the active interview, kept in sessionStorage so a page refresh
 * resumes the same session instead of losing it. The server is the source of truth for
 * scoring and tokens; this only restores what the student was looking at.
 */

import type { StartInterviewResponse } from "@/services/api";

export interface ChatMessage {
  role: "ai" | "user";
  text: string;
}

export interface InterviewContext {
  sessionId: string;
  openingQuestion: string;
  company: string;
  role: string;
  maxQuestions: number;
  maxMinutes: number;
  startedAt: number;
}

export interface InterviewProgress {
  messages: ChatMessage[];
  questionsAsked: number;
  phase: string;
  lastQuestion: string;
  greeted: boolean;
  /** A submitted answer whose response never arrived; resent with the same turn_id. */
  pendingTurn: { turnId: string; transcript: string; answeredQuestion: string } | null;
}

const CONTEXT_KEY = "pp.interview";
const progressKey = (sessionId: string) => `pp.interview.${sessionId}`;

export function saveInterviewContext(data: StartInterviewResponse): InterviewContext {
  const ctx: InterviewContext = {
    sessionId: data.sessionId,
    openingQuestion: data.openingQuestion,
    company: data.company,
    role: data.role,
    maxQuestions: data.maxQuestions,
    maxMinutes: data.maxMinutes,
    startedAt: Date.now(),
  };
  sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
  return ctx;
}

export function getInterviewContext(): InterviewContext | null {
  const raw = sessionStorage.getItem(CONTEXT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InterviewContext;
  } catch {
    return null;
  }
}

export function loadProgress(sessionId: string): InterviewProgress | null {
  const raw = sessionStorage.getItem(progressKey(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InterviewProgress;
  } catch {
    return null;
  }
}

export function saveProgress(sessionId: string, progress: InterviewProgress): void {
  sessionStorage.setItem(progressKey(sessionId), JSON.stringify(progress));
}

export function clearInterview(sessionId?: string): void {
  sessionStorage.removeItem(CONTEXT_KEY);
  if (sessionId) sessionStorage.removeItem(progressKey(sessionId));
}

/**
 * What the student picked, saved before the session exists.
 *
 * The consent notice has to be read and agreed to *before* `/interviews/start`, because
 * the backend refuses a proctored session without a current consent. So the chosen role
 * is parked here, the student reads the notice on `/pre-interview`, and the session is
 * created when they agree.
 *
 * This also stops a token being reserved for someone who then backs out of the checklist:
 * the reservation used to happen on the dashboard click, and an abandoned session blocked
 * the next one until it timed out.
 */
export interface PendingInterview {
  jdId?: string;
  customJdId?: string;
  company: string;
  role: string;
}

const PENDING_KEY = "pp.interview.pending";

export function savePendingInterview(pending: PendingInterview): void {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function getPendingInterview(): PendingInterview | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingInterview;
  } catch {
    return null;
  }
}

export function clearPendingInterview(): void {
  sessionStorage.removeItem(PENDING_KEY);
}
