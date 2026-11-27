import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getGoogleAuthUrl, login } from "@/services/api";
import { homeFor, isLoggedIn, getUser } from "@/lib/session";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

const OAUTH_ERRORS: Record<string, string> = {
  google_failed: "Google sign-in failed. Please try again.",
  email_not_verified: "Your Google account email is not verified.",
  oauth_expired: "The sign-in link expired. Please try again.",
};

/** Only allow same-site relative redirects after login. */
function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleTab, setRoleTab] = useState<"student" | "handler">("student");
  const [error, setError] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);

  // Already signed in → go home.
  useEffect(() => {
    const user = getUser();
    if (isLoggedIn() && user) navigate(homeFor(user.role), { replace: true });
  }, [navigate]);

  // Show errors redirected back from the Google OAuth callback.
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) setError(OAUTH_ERRORS[oauthError] ?? "Sign-in failed. Please try again.");
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const { auth_url } = await getGoogleAuthUrl();
      window.location.href = auth_url;
    } catch (e) {
      setError((e as Error).message || "Google sign-in is not available right now.");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    if (needsMfa && !/^\d{6}$/.test(mfaCode)) { setError("Enter the 6-digit code from your authenticator app."); return; }
    setLoading(true); setError("");
    try {
      const data = await login(email, password, needsMfa ? mfaCode : undefined);
      const role = getUser()?.role ?? "student";
      if (data.needs_verification && role === "student") { navigate("/verify"); return; }
      navigate(safeNext(searchParams.get("next")) ?? homeFor(role));
    } catch (e) {
      const message = (e as Error).message || "Invalid credentials";
      if (/authenticator code/i.test(message)) setNeedsMfa(true);
      setError(message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Left — image panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80"
          alt="Interview" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/70" />
        <div className="absolute inset-0 flex flex-col justify-between p-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-white font-bold font-display">P</span>
            </div>
            <span className="text-white font-display font-bold text-xl">PlacePrep AI</span>
          </div>

          {/* Quote */}
          <div>
            <blockquote className="text-white/90 text-2xl font-display font-semibold leading-snug mb-6">
              "The interview that used to terrify me became my strongest asset."
            </blockquote>
            <div className="flex items-center gap-3">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&q=80"
                alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white/30" />
              <div>
                <div className="text-white font-semibold text-sm">Rahul Sharma</div>
                <div className="text-white/60 text-xs">Placed at TCS · IIST Indore</div>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4">
            {[["2,800+", "Students"], ["94%", "Success Rate"], ["15 min", "Per Session"]].map(([v, l]) => (
              <div key={l} className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15">
                <div className="text-white font-display font-bold text-2xl">{v}</div>
                <div className="text-white/60 text-xs mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm font-display">P</span>
            </div>
            <span className="font-display font-bold text-foreground text-lg">PlacePrep <span className="text-gradient">AI</span></span>
          </div>

          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground mb-6">Sign in to continue your journey</p>

          {/* Role Toggle */}
          <div className="flex p-1 bg-secondary rounded-xl mb-6 shadow-inner">
            {(["student", "handler"] as const).map(r => (
              <button key={r} onClick={() => setRoleTab(r)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors
                  ${roleTab === r ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {r === "student" ? "Student" : "Institute Handler"}
              </button>
            ))}
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 bg-destructive/8 border border-destructive/20 rounded-xl text-destructive text-sm">
              {error}
            </motion.div>
          )}

          {/* Google Sign-In */}
          {roleTab === "student" && (
            <>
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-secondary transition-all shadow-sm mb-4"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Continue with Google
              </button>
              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground/70 block mb-2">
                {roleTab === "student" ? "Student Email" : "Handler Email"}
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all shadow-sm"
                placeholder={roleTab === "student" ? "you@college.edu" : "placement@college.edu"} />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground/70 block mb-2">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  className="w-full px-4 py-3.5 pr-12 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all shadow-sm"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {needsMfa && (
              <div>
                <label className="text-xs font-semibold text-foreground/70 block mb-2">Authenticator code</label>
                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  className="w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary/25"
                  placeholder="123456" />
              </div>
            )}
          </div>

          <button onClick={handleLogin} disabled={loading}
            className="w-full mt-6 flex items-center justify-center gap-2 py-4 bg-gradient-primary text-white font-semibold rounded-xl shadow-glow hover:opacity-90 transition-all disabled:opacity-60 text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
          </button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">Create one free</Link>
          </p>

        </motion.div>
      </div>
    </div>
  );
};

export default Login;

