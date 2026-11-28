/**
 * Browser-side auth session.
 *
 * The JWT and a display copy of the user live in sessionStorage (per tab, cleared when the
 * tab closes). The role stored here is for UX only — which menu to show, which page to
 * open after login. Every protected API call is authorised by the backend from the
 * database, so editing these values in devtools grants nothing.
 */

export type Role = "student" | "college_admin" | "admin";

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
}

const TOKEN_KEY = "pp.token";
const USER_KEY = "pp.user";

/** Keys from the pre-2.0 frontend; cleared on login/logout so stale values never leak. */
const LEGACY_KEYS = ["token", "role", "name", "student_id", "student_name"];

export function normalizeRole(raw: string | null | undefined): Role {
  switch (raw) {
    case "admin":
    case "super_admin":
      return "admin";
    case "college_admin":
    case "officer":
      return "college_admin";
    default:
      return "student";
  }
}

export function getToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function getUser(): SessionUser | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    return { ...parsed, role: normalizeRole(parsed.role) };
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getToken() && getUser());
}

export function saveSession(token: string, user: { id: string; name: string; role: string }): void {
  LEGACY_KEYS.forEach((k) => sessionStorage.removeItem(k));
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(
    USER_KEY,
    JSON.stringify({ id: user.id, name: user.name, role: normalizeRole(user.role) }),
  );
  window.dispatchEvent(new Event("pp:session"));
}

export function updateUserName(name: string): void {
  const user = getUser();
  if (!user) return;
  sessionStorage.setItem(USER_KEY, JSON.stringify({ ...user, name }));
}

export function clearSession(): void {
  [TOKEN_KEY, USER_KEY, ...LEGACY_KEYS].forEach((k) => sessionStorage.removeItem(k));
  window.dispatchEvent(new Event("pp:session"));
}

/** Where each role lands after login. */
export function homeFor(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "college_admin") return "/college";
  return "/dashboard";
}

/** Title-cases a name so TTS does not spell out an all-caps name letter by letter. */
export function displayName(name: string | undefined | null): string {
  if (!name) return "there";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
