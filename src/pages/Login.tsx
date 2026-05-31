import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { login } from "@/services/api";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleTab, setRoleTab] = useState<"student" | "handler">("student");
  const [error, setError] = useState("");

  // Show errors redirected back from Google OAuth callback
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError === "domain_not_allowed")
      setError(`Only @indoreinstitute.com emails are allowed to register.`);
    else if (oauthError) setError("Sign-in failed. Please try again.");
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res  = await fetch(`${API_BASE}/auth/google`);
      const data = await res.json();
      if (data.auth_url) window.location.href = data.auth_url;
      else setError("Google Sign-In is not configured yet.");
    } catch {
      setError("Could not reach the server. Is the backend running?");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true); setError("");
    try {
      const data = await login(email, password);
      if (data.role === "super_admin")                        navigate("/super-admin");
      else if (data.role === "officer" || data.role === "admin") navigate("/officer");
      else navigate("/dashboard");
    } catch (e: any) {
      setError(e.message || "Invalid credentials");
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
          </div>

          <button onClick={handleLogin} disabled={loading}
            className="w-full mt-6 flex items-center justify-center gap-2 py-4 bg-gradient-primary text-white font-semibold rounded-xl shadow-glow hover:opacity-90 transition-all disabled:opacity-60 text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
          </button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">Create one free</Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-secondary/60 border border-border rounded-xl">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Demo Credentials</p>
            <div className="space-y-1">
              <p className="text-xs text-foreground/70 font-mono">Student: test@test.com / test123</p>
              <p className="text-xs text-foreground/70 font-mono">Officer: officer@placeprep.com / admin123</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

