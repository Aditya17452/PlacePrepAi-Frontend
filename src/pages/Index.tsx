import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import { ArrowRight, Star, Users, Trophy, Zap, Brain, FileText, BarChart, CheckCircle, ChevronRight, Play } from "lucide-react";

const roles = ["Software Engineer", "Data Analyst", "Product Manager", "ML Engineer", "DevOps Engineer", "Full Stack Dev"];

const stats = [
  { val: "2,800+", label: "Mock Interviews", icon: Users },
  { val: "94%", label: "Success Rate", icon: Trophy },
  { val: "12", label: "Questions per Session", icon: Brain },
  { val: "15 min", label: "Average Session", icon: Zap },
];

const steps = [
  { num: "01", title: "Create Account", desc: "Sign up with your college email in under a minute. No credit card needed to start.", img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80" },
  { num: "02", title: "Upload Resume", desc: "Our AI analyzes your resume and matches you with the most relevant job descriptions.", img: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&q=80" },
  { num: "03", title: "Start Interview", desc: "Face a real-time AI interviewer that adapts questions based on your profile and role.", img: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&q=80" },
  { num: "04", title: "Get Your Report", desc: "Download a detailed PDF report with scores, feedback, and improvement tips.", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80" },
];

const features = [
  { icon: Brain, title: "AI-Powered Questions", desc: "Questions adapt to your resume, role, and previous answers in real-time." },
  { icon: BarChart, title: "Detailed Scoring", desc: "Get scored on technical accuracy, communication, confidence, and more." },
  { icon: FileText, title: "PDF Reports", desc: "Download comprehensive interview reports to track your progress over time." },
  { icon: Zap, title: "Voice Input", desc: "Answer naturally with voice input — just like a real interview setting." },
  { icon: CheckCircle, title: "Body Language Monitor", desc: "Camera-based attention monitoring keeps you focused throughout." },
  { icon: Trophy, title: "Role Matching", desc: "Resume-matched job descriptions ensure relevant interview questions." },
];

const testimonials = [
  { name: "Rahul Sharma", branch: "CSE, IIST Indore", text: "PlacePrepAI helped me crack my TCS interview on the first attempt. The questions were exactly what I faced in the real interview.", score: "89/100" },
  { name: "Priya Patel", branch: "ECE, NIT Bhopal", text: "The AI feedback was incredibly specific. It told me exactly where I was losing marks and how to improve my answers.", score: "92/100" },
  { name: "Aditya Singh", branch: "IT, RGPV", text: "I practiced 5 sessions before my campus placement. Cleared Infosys and Wipro both in one shot!", score: "85/100" },
];

const CountUp = ({ end, duration = 2000 }: { end: string; duration?: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    if (!inView) return;
    const num = parseInt(end.replace(/\D/g, ""));
    const suffix = end.replace(/[\d,]/g, "");
    if (isNaN(num)) { setDisplay(end); return; }
    let start = 0;
    const step = Math.ceil(num / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, num);
      setDisplay(start.toLocaleString() + suffix);
      if (start >= num) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView]);
  return <span ref={ref}>{display || end}</span>;
};

const Index = () => {
  const navigate = useNavigate();
  const [roleIdx, setRoleIdx] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem("token")) navigate("/dashboard");
  }, []);

  useEffect(() => {
    const t = setInterval(() => setRoleIdx(i => (i + 1) % roles.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* ── HERO — Light ── */}
      <section className="relative pt-28 pb-20 px-6 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/6 blur-3xl translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/6 blur-3xl -translate-x-1/3 translate-y-1/4" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: "linear-gradient(hsl(235 85% 55%) 1px, transparent 1px), linear-gradient(90deg, hsl(235 85% 55%) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-semibold mb-8 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  AI-Powered Placement Preparation
                </div>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground leading-[1.05] mb-6">
                Crack Your<br />
                <span className="text-gradient">Campus</span><br />
                Placement
              </motion.h1>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="flex items-center gap-3 mb-6">
                <span className="text-muted-foreground text-lg font-medium">For roles like</span>
                <div className="relative h-9 overflow-hidden flex items-center">
                  <AnimatePresence mode="wait">
                    <motion.span key={roleIdx}
                      initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-lg font-semibold text-primary whitespace-nowrap">
                      {roles[roleIdx]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </motion.div>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-lg">
                Practice with a real AI interviewer tailored to your resume. Get honest scores, detailed feedback, and a downloadable report — all in 15 minutes.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                className="flex flex-wrap gap-4">
                <button onClick={() => navigate("/register")}
                  className="group flex items-center gap-2 px-7 py-4 bg-gradient-primary text-white font-semibold rounded-2xl shadow-glow hover:opacity-90 transition-all hover:scale-[1.02] text-sm">
                  Start Free Today
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => navigate("/login")}
                  className="flex items-center gap-2 px-7 py-4 bg-white border border-border text-foreground font-semibold rounded-2xl shadow-sm hover:shadow-md transition-all text-sm">
                  Sign In
                </button>
              </motion.div>

              {/* Social proof */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="flex items-center gap-4 mt-10">
                <div className="flex -space-x-2">
                  {["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&q=80",
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&q=80",
                    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&q=80",
                    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&q=80"].map((src, i) => (
                    <img key={i} src={src} alt="" className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-sm" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Trusted by <span className="font-semibold text-foreground">2,800+ students</span></p>
                </div>
              </motion.div>
            </div>

            {/* Right — hero image */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
              className="relative hidden lg:block">
              <div className="relative">
                {/* Main image */}
                <div className="rounded-3xl overflow-hidden shadow-elevated border border-border">
                  <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80"
                    alt="Student in interview" className="w-full h-[480px] object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
                </div>

                {/* Floating card 1 */}
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -left-8 top-12 bg-white rounded-2xl shadow-elevated p-4 border border-border w-48">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Score</div>
                      <div className="font-bold text-foreground text-sm">89 / 100</div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: "89%" }} />
                  </div>
                </motion.div>

                {/* Floating card 2 */}
                <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -right-8 bottom-20 bg-white rounded-2xl shadow-elevated p-4 border border-border w-52">
                  <div className="text-xs text-muted-foreground mb-2">Interview Progress</div>
                  <div className="space-y-2">
                    {[["Technical", 78], ["Communication", 92], ["Confidence", 85]].map(([k, v]) => (
                      <div key={k as string}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-foreground">{k}</span>
                          <span className="font-semibold text-primary">{v}%</span>
                        </div>
                        <div className="h-1 bg-secondary rounded-full">
                          <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${v}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Floating card 3 */}
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -right-4 top-8 bg-white rounded-2xl shadow-elevated px-4 py-3 border border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-foreground">AI Interviewer Active</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS — Dark ── */}
      <section className="dark-section py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-4xl font-display font-bold text-white mb-1">
                  <CountUp end={s.val} />
                </div>
                <div className="text-sm ds-muted">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — Light ── */}
      <section id="how-it-works" className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/8 border border-accent/15 text-accent text-xs font-semibold mb-5">
              How It Works
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              From signup to <span className="text-gradient">offer letter</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Four simple steps to transform your interview performance</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="group relative bg-white rounded-3xl overflow-hidden border border-border shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="h-48 overflow-hidden">
                  <img src={step.img} alt={step.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 h-48 bg-gradient-to-b from-transparent to-white/30" />
                </div>
                <div className="p-7">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-5xl font-display font-bold text-primary/15">{step.num}</span>
                    <h3 className="text-xl font-display font-bold text-foreground">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-sm">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES — Dark ── */}
      <section className="dark-section py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/20 text-primary text-xs font-semibold mb-5">
              Features
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              Everything you need to <span className="text-gradient">succeed</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="ds-card p-6 hover:border-primary/30 transition-all group cursor-default">
                <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-bold text-white mb-2 text-lg">{f.title}</h3>
                <p className="ds-muted text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS — Light ── */}
      <section className="py-24 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/20 text-warning text-xs font-semibold mb-5">
              <Star className="w-3 h-3 fill-warning" /> Student Stories
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Real students, <span className="text-gradient">real results</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                className="bg-white rounded-3xl p-7 shadow-card border border-border hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-warning text-warning" />)}
                </div>
                <p className="text-foreground/80 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{t.name[0]}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.branch}</div>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-green-50 border border-green-100 rounded-xl">
                    <span className="text-green-700 font-bold text-sm">{t.score}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA — Dark ── */}
      <section className="dark-section py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/20 text-primary text-xs font-semibold mb-8">
              Get Started Today
            </div>
            <h2 className="text-5xl md:text-6xl font-display font-bold text-white mb-6 leading-tight">
              Your placement is<br /><span className="text-gradient">one interview away</span>
            </h2>
            <p className="ds-muted text-lg mb-10 leading-relaxed">
              Join thousands of students who cracked their campus placements using PlacePrepAI. Start for free — no credit card needed.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button onClick={() => navigate("/register")}
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-primary text-white font-semibold rounded-2xl shadow-glow hover:opacity-90 transition-all hover:scale-[1.02]">
                Start Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navigate("/login")}
                className="px-8 py-4 glass-dark text-white font-semibold rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                Sign In
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="dark-section border-t ds-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs font-display">P</span>
            </div>
            <span className="font-display font-bold text-white">PlacePrep AI</span>
          </div>
          <div className="flex gap-6 text-sm ds-muted">
            {[["About", "/about"], ["Contact", "/contact"], ["Sign In", "/login"], ["Get Started", "/register"]].map(([l, p]) => (
              <a key={l} href={p} className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>
          <p className="text-xs ds-muted">© 2026 Team Saksham, Indore</p>
        </div>
      </footer>
    </div>
  );
};

// Need AnimatePresence for role ticker
import { AnimatePresence } from "framer-motion";
export default Index;

