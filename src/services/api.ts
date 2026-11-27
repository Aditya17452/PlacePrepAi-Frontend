/**
 * Typed API surface for the PlacePrep backend.
 *
 * Request/response types come from the backend's OpenAPI schema
 * (`src/lib/api/schema.d.ts`, regenerated with `npm run gen:api`), so a backend contract
 * change shows up as a type error here instead of a runtime surprise.
 */

import { request } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { saveSession } from "@/lib/session";

type S = components["schemas"];

export type TokenResponse = S["TokenResponse"];
export type Me = S["MeResponse"];
export type JDMatch = S["JDMatchOut"];
export type JDListItem = S["JDListItem"];
export type StudentJD = S["StudentJDOut"];
export type StartInterviewResponse = S["StartInterviewResponse"];
export type SubmitTurnRequest = S["SubmitTurnRequest"];
export type SubmitTurnResponse = S["SubmitTurnResponse"];
export type Report = S["ReportResponse"];
export type SessionHistoryItem = S["SessionHistoryItem"];
export type ProctoringEvent = S["ProctoringEventIn"];
export type ProctoringBatchResponse = S["ProctoringBatchResponse"];
export type VisionScores = S["VisionScores"];
export type Wallet = S["WalletResponse"];
export type LedgerEntry = S["LedgerEntryOut"];
export type Plan = S["PlanOut"];
export type CreateOrderResponse = S["CreateOrderResponse"];
export type PaymentStatus = S["PaymentStatusResponse"];
export type College = S["CollegeOut"];
export type StudentSummary = S["StudentSummaryOut"];
export type RosterRow = S["RosterRowIn"];
export type RosterUploadResponse = S["RosterUploadResponse"];
export type AllowanceGroupRequest = S["AllowanceGroupRequest"];
export type AllowanceOverrideRequest = S["AllowanceOverrideRequest"];
export type PlatformStats = S["PlatformStatsResponse"];
export type EnrollCollegeRequest = S["EnrollCollegeRequest"];
export type AuditLogEntry = S["AuditLogOut"];
export type SimpleOk = S["SimpleOk"];
export type RegisterRequest = S["RegisterRequest"];

// ── Auth ──────────────────────────────────────────────────────────────────────

function remember(data: TokenResponse): TokenResponse {
  saveSession(data.token, { id: data.id, name: data.name, role: data.role });
  return data;
}

export async function login(email: string, password: string, mfaCode?: string) {
  const data = await request<TokenResponse>("/auth/login", {
    method: "POST",
    anonymous: true,
    body: { email, password, mfa_code: mfaCode || null },
  });
  return remember(data);
}

export async function register(payload: RegisterRequest) {
  const data = await request<TokenResponse>("/auth/register", { method: "POST", anonymous: true, body: payload });
  return remember(data);
}

export const getMe = () => request<Me>("/auth/me");

export const logoutEverywhere = () => request<SimpleOk>("/auth/logout-all", { method: "POST" });

export const sendOtp = (channel: "email" | "phone", destination?: string) =>
  request<SimpleOk>("/auth/otp/send", { method: "POST", body: { channel, destination: destination || null } });

export const verifyOtp = (channel: "email" | "phone", code: string) =>
  request<Me>("/auth/otp/verify", { method: "POST", body: { channel, code } });

export const getGoogleAuthUrl = () => request<S["OAuthUrlResponse"]>("/auth/google", { anonymous: true });

export async function exchangeOAuthCode(code: string) {
  const data = await request<TokenResponse>("/auth/google/exchange", { method: "POST", anonymous: true, body: { code } });
  return remember(data);
}

export async function acceptInvite(code: string, password: string, mfaCode?: string) {
  const data = await request<TokenResponse>("/super/invite/accept", {
    method: "POST",
    anonymous: true,
    body: { code, password, mfa_code: mfaCode || null },
  });
  return remember(data);
}

// ── Resume & JDs ──────────────────────────────────────────────────────────────

export function uploadResume(file: File) {
  const form = new FormData();
  form.append("resume", file);
  return request<S["ResumeUploadResponse"]>("/resume/upload", { method: "POST", body: form });
}

export const listPresetJDs = () => request<JDListItem[]>("/resume/jds");

export const submitStudentJD = (payload: S["SubmitJDRequest"]) =>
  request<StudentJD>("/jd/submit", { method: "POST", body: payload });

export const listMyJDs = () => request<StudentJD[]>("/jd/mine");

export const getStudentJD = (jdId: string) => request<StudentJD>(`/jd/${encodeURIComponent(jdId)}`);

export const deleteStudentJD = (jdId: string) =>
  request<SimpleOk>(`/jd/${encodeURIComponent(jdId)}`, { method: "DELETE" });

// ── Interview ─────────────────────────────────────────────────────────────────

export const startInterview = (target: { jdId?: string; customJdId?: string }, proctoringEnabled = true) =>
  request<StartInterviewResponse>("/interviews/start", {
    method: "POST",
    body: { jd_id: target.jdId ?? null, custom_jd_id: target.customJdId ?? null, proctoring_enabled: proctoringEnabled },
  });

export const submitTurn = (sessionId: string, body: SubmitTurnRequest, signal?: AbortSignal) =>
  request<SubmitTurnResponse>(`/interviews/${encodeURIComponent(sessionId)}/turns`, { method: "POST", body, signal });

export const endInterview = (sessionId: string, reason: "student_ended" | "completed" | "client_error" = "student_ended") =>
  request<SimpleOk>(`/interviews/${encodeURIComponent(sessionId)}/end`, { method: "POST", body: { reason } });

export const sendProctoringBatch = (sessionId: string, events: ProctoringEvent[], vision?: VisionScores | null) =>
  request<ProctoringBatchResponse>(`/interviews/${encodeURIComponent(sessionId)}/proctoring`, {
    method: "POST",
    body: { events, vision: vision ?? null },
  });

export const getReport = (sessionId: string) => request<Report>(`/interviews/${encodeURIComponent(sessionId)}/report`);

export const getMyHistory = () => request<SessionHistoryItem[]>("/interviews/history");

export const getStudentHistory = (studentId: string) =>
  request<SessionHistoryItem[]>(`/interviews/history/${encodeURIComponent(studentId)}`);

// ── Tokens & payments ─────────────────────────────────────────────────────────

export const getWallet = () => request<Wallet>("/tokens/wallet");

export const getLedger = (limit = 50) => request<LedgerEntry[]>("/tokens/ledger", { query: { limit } });

export const getPlans = () => request<Plan[]>("/payments/plans");

export const createOrder = (planCode: string) =>
  request<CreateOrderResponse>("/payments/create-order", { method: "POST", body: { plan_code: planCode } });

export const getPaymentStatus = (orderId: string) =>
  request<PaymentStatus>(`/payments/status/${encodeURIComponent(orderId)}`);

export const getPaymentHistory = () => request<PaymentStatus[]>("/payments/history");

// ── College admin ─────────────────────────────────────────────────────────────

export const getMyCollege = () => request<College>("/officer/me/college");

export const getCollegeStudents = () => request<StudentSummary[]>("/officer/students");

export const uploadRoster = (rows: RosterRow[], replaceExisting = false) =>
  request<RosterUploadResponse>("/officer/roster", { method: "POST", body: { rows, replace_existing: replaceExisting } });

export const getEnrollmentRequests = () => request<Record<string, unknown>[]>("/officer/enrollment-requests");

export const decideEnrollmentRequest = (requestId: string, approve: boolean) =>
  request<SimpleOk>(`/officer/enrollment-requests/${encodeURIComponent(requestId)}`, {
    method: "POST",
    query: { approve },
  });

export const generateShortlist = (jdId: string) =>
  request<Record<string, unknown>[]>("/officer/shortlist", { method: "POST", query: { jd_id: jdId } });

export const getCollegePool = () => request<College>("/college/pool");

export const createAllowanceGroup = (body: AllowanceGroupRequest) =>
  request<SimpleOk>("/college/allowance-groups", { method: "POST", body });

export const createAllowanceOverride = (body: AllowanceOverrideRequest) =>
  request<SimpleOk>("/college/allowance-overrides", { method: "POST", body });

// ── Platform admin ────────────────────────────────────────────────────────────

export const getPlatformStats = () => request<PlatformStats>("/super/stats");

export const listColleges = () => request<College[]>("/super/colleges");

export const enrollCollege = (body: EnrollCollegeRequest) =>
  request<SimpleOk>("/super/colleges/enroll", { method: "POST", body });

export const deactivateCollege = (collegeId: string) =>
  request<SimpleOk>(`/super/colleges/${encodeURIComponent(collegeId)}/deactivate`, { method: "POST" });

export const verifyCollegeDomain = (collegeId: string) =>
  request<SimpleOk>(`/super/colleges/${encodeURIComponent(collegeId)}/verify-domain`, { method: "POST" });

export const freezeCollege = (collegeId: string, frozen: boolean) =>
  request<SimpleOk>(`/super/colleges/${encodeURIComponent(collegeId)}/freeze`, { method: "POST", query: { frozen } });

export const getAuditLog = (limit = 100) => request<AuditLogEntry[]>("/super/audit-log", { query: { limit } });

export const getTokenLogs = (limit = 100) => request<LedgerEntry[]>("/super/credit-logs", { query: { limit } });

export const grantCollegeTokens = (body: S["GrantTokensRequest"]) =>
  request<SimpleOk>("/admin/tokens/grant", { method: "POST", body });

export const revokeCollegeTokens = (body: S["RevokeTokensRequest"]) =>
  request<SimpleOk>("/admin/tokens/revoke", { method: "POST", body });

export const refundPayment = (body: S["RefundRequest"]) =>
  request<SimpleOk>("/payments/refund", { method: "POST", body });
