/**
 * AuthCallback.tsx
 * Handles the redirect from the backend Google OAuth callback.
 * The backend redirects to:  /auth/callback?token=...&role=...&name=...&id=...
 * This page reads those params, stores them, and navigates appropriately.
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const role  = params.get("role");
    const name  = params.get("name");
    const id    = params.get("id");
    const error = params.get("error");

    // ── Error cases ──────────────────────────────────────────────────────────
    if (error === "domain_not_allowed") {
      navigate("/login?error=domain_not_allowed");
      return;
    }
    if (error) {
      navigate("/login?error=signin_failed");
      return;
    }

    // ── Success ───────────────────────────────────────────────────────────────
    if (token && role) {
      // Store everything the rest of the app expects
      sessionStorage.setItem("token",        token);
      sessionStorage.setItem("role",         role);
      sessionStorage.setItem("student_name", name ?? "");
      sessionStorage.setItem("name",         name ?? "");
      sessionStorage.setItem("student_id",   id   ?? "");

      // Route based on role
      if      (role === "super_admin")                         navigate("/super-admin");
      else if (role === "college_admin" || role === "officer") navigate("/officer");
      else                                                     navigate("/dashboard");
    } else {
      // Something unexpected — bail to login
      navigate("/login");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full mx-auto mb-5"
        />
        <p className="text-foreground font-semibold">Signing you in...</p>
        <p className="text-sm text-muted-foreground mt-1">Just a moment</p>
      </motion.div>
    </div>
  );
};

export default AuthCallback;

