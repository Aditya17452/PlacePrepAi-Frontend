import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { register } from "@/services/api";
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", branch: "", cgpa: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

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

  const next = () => {
    if (!form.name || !form.email) { setError("Name and email are required"); return; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError("Enter a valid email"); return; }
    setError(""); setStep(2);
  };

  const handleRegister = async () => {
    if (!form.password) { setError("Password is required"); return; }
    if (form.password !== form.confirm) { setError("Passwords don't match"); return; }
    setLoading(true); setError("");
    try {
      await register({ name: form.name, email: form.email, password: form.password, branch: form.branch, cgpa: parseFloat(form.cgpa) || undefined });
      navigate("/dashboard");
    } catch (e: any) { setError(e.message || "Registration failed"); }
    finally { setLoading(false); }
  };

  const inputCls = "w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all shadow-sm";

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80"
          alt="Students" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-accent/80 to-primary/70" />
        <div className="absolute inset-0 flex flex-col justify-between p-14">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-white font-bold font-display">P</span>
            </div>
            <span className="text-white font-display font-bold text-xl">PlacePrep AI</span>
          </div>

          <div>
            <h2 className="text-4xl font-display font-bold text-white mb-6 leading-tight">
              Your placement journey<br />starts here.
            </h2>
            <div className="space-y-4">
              {["Free to start — no credit card needed", "AI interview tailored to your resume", "Detailed feedback after every session", "Download PDF reports anytime"].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-white/80 flex-shrink-0" />
                  <span className="text-white/80 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&q=80",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&q=80",
                "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&q=80"].map((src, i) => (
                <img key={i} src={src} alt="" className="w-9 h-9 rounded-full border-2 border-white/30 object-cover" />
              ))}
            </div>
            <p className="text-white/70 text-sm">Join <span className="text-white font-semibold">2,800+ students</span> already using PlacePrepAI</p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">

          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm font-display">P</span>
            </div>
            <span className="font-display font-bold text-foreground text-lg">PlacePrep <span className="text-gradient">AI</span></span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${step >= s ? "bg-gradient-primary text-white shadow-glow" : "bg-secondary text-muted-foreground"}`}>
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Basic Info" : "Account Setup"}
                </span>
                {s < 2 && <div className={`w-12 h-0.5 rounded ${step > s ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {step === 1 ? "Create your account" : "Set up your profile"}
          </h1>
          <p className="text-muted-foreground mb-8 text-sm">
            {step === 1 ? "Enter your basic details to get started" : "Add your academic info and create a password"}
          </p>

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 bg-destructive/8 border border-destructive/20 rounded-xl text-destructive text-sm">
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-4">
                
                {/* Google Sign-In — only shown on step 1 */}
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-secondary transition-all shadow-sm"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                  Continue with Google
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or register with email</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/70 block mb-2">Full Name</label>
                  <input value={form.name} onChange={e => set("name", e.target.value)} className={inputCls} placeholder="Aditya Sharma" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/70 block mb-2">Email Address</label>
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls} placeholder="you@college.edu" />
                </div>
                <button onClick={next}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-4 bg-gradient-primary text-white font-semibold rounded-xl shadow-glow hover:opacity-90 transition-all text-sm">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground/70 block mb-2">Branch</label>
                    <input value={form.branch} onChange={e => set("branch", e.target.value)} className={inputCls} placeholder="CSE" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground/70 block mb-2">CGPA</label>
                    <input type="number" step="0.1" min="0" max="10" value={form.cgpa} onChange={e => set("cgpa", e.target.value)} className={inputCls} placeholder="8.5" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/70 block mb-2">Password</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)} className={`${inputCls} pr-12`} placeholder="Min 6 characters" />
                    <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/70 block mb-2">Confirm Password</label>
                  <input type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleRegister()} className={inputCls} placeholder="Repeat password" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setStep(1); setError(""); }}
                    className="flex-1 py-4 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                    Back
                  </button>
                  <button onClick={handleRegister} disabled={loading}
                    className="flex-[2] flex items-center justify-center gap-2 py-4 bg-gradient-primary text-white font-semibold rounded-xl shadow-glow hover:opacity-90 transition-all disabled:opacity-60 text-sm">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;

