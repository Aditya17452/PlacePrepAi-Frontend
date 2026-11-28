/**
 * Google OAuth landing page.
 *
 * The backend redirects here with a short-lived one-time `code` (never the JWT itself, so
 * no credential lands in browser history or Referer headers). We exchange it over POST.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { exchangeOAuthCode } from "@/services/api";
import { getUser, homeFor } from "@/lib/session";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [failed, setFailed] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode double-invoke would burn the one-time code.
    started.current = true;

    const code = params.get("code");
    const error = params.get("error");
    if (error || !code) {
      navigate(`/login?error=${encodeURIComponent(error || "google_failed")}`, { replace: true });
      return;
    }

    exchangeOAuthCode(code)
      .then((data) => {
        const role = getUser()?.role ?? "student";
        if (data.needs_verification && role === "student") navigate("/verify", { replace: true });
        else navigate(homeFor(role), { replace: true });
      })
      .catch((e: Error) => setFailed(e.message || "Sign-in failed."));
  }, [navigate, params]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        {failed ? (
          <>
            <p className="text-foreground font-semibold">{failed}</p>
            <button onClick={() => navigate("/login")} className="mt-4 text-sm text-primary font-semibold hover:underline">
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full mx-auto mb-5"
            />
            <p className="text-foreground font-semibold">Signing you in...</p>
            <p className="text-sm text-muted-foreground mt-1">Just a moment</p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AuthCallback;
