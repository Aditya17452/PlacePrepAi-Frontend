import { useEffect, useState } from "react";
import { getUser, isLoggedIn, type SessionUser } from "@/lib/session";

/** Re-renders when the user logs in or out (in this tab). */
export function useSession(): { user: SessionUser | null; loggedIn: boolean } {
  const [state, setState] = useState(() => ({ user: getUser(), loggedIn: isLoggedIn() }));
  useEffect(() => {
    const sync = () => setState({ user: getUser(), loggedIn: isLoggedIn() });
    window.addEventListener("pp:session", sync);
    return () => window.removeEventListener("pp:session", sync);
  }, []);
  return state;
}
