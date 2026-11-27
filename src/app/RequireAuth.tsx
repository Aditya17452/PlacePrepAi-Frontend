import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { homeFor, type Role } from "@/lib/session";
import { useSession } from "@/app/useSession";

/**
 * Route guard. UX only: it decides what to render, while the backend decides what data
 * each role may read or change.
 */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loggedIn } = useSession();
  const location = useLocation();

  if (!loggedIn || !user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }
  return <>{children}</>;
}
