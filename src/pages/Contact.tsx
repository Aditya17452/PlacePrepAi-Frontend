import Navbar from "@/components/layout/Navbar";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, CheckCircle, Loader2 } from "lucide-react";

const team = [
  { name: "Aditya Chouksey", role: "Full Stack Developer", sub: "Backend · AI Agents · WebSockets", initials: "AC", color: "from-blue-500 to-indigo-600" },
  { name: "Team Member 2",   role: "Frontend Developer",  sub: "React · TypeScript · UI/UX",        initials: "TM", color: "from-violet-500 to-purple-600" },
  { name: "Team Member 3",   role: "ML Engineer",         sub: "Resume Matching · Evaluation",       initials: "TM", color: "from-pink-500 to-rose-600" },
  { name: "Team Member 4",   role: "Data Engineer",       sub: "Database · Pipeline · Deployment",   initials: "TM", color: "from-amber-500 to-orange-600" },
];

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSend = () => {
    if (!form.name || !form.email || !form.message) return;
    setLoading(true);
    setTimeout(() => {
      const mailto = `mailto:sakshamservices2025@gmail.com?subject=${encodeURIComponent(form.subject || "Message from PlacePrepAI")}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
      window.location.href = mailto;
      setSent(true);
      setLoading(false);
    }, 600);
  };

  const inputCls = "w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all shadow-sm";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <div className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-semibold mb-6">
              <Mail className="w-3 h-3" /> Get In Touch
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground mb-4 leading-tight">
              Let's Build<br /><span className="text-gradient">Something Together</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
              We're Team Saksham — engineers from Indore building AI-powered solutions. Reach out for partnerships, collaborations, or just to say hello.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Contact grid */}
      <div className="px-6 pb-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">

          {/* Info card */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-border shadow-card p-8">
            <h2 className="text-xl font-display font-bold text-foreground mb-7">Contact Information</h2>
            <div className="space-y-6">
              {[
                { icon: Mail,    label: "Email",    val: "sakshamservices2025@gmail.com", href: "mailto:sakshamservices2025@gmail.com" },
                { icon: Phone,   label: "Phone",    val: "+91 7999105415",                href: "tel:+917999105415" },
                { icon: MapPin,  label: "Location", val: "Indore, Madhya Pradesh, India", href: null },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{item.label}</div>
                    {item.href
                      ? <a href={item.href} className="text-foreground font-medium hover:text-primary transition-colors text-sm">{item.val}</a>
                      : <span className="text-foreground font-medium text-sm">{item.val}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Team Vision</p>
              <p className="text-sm text-foreground/70 leading-relaxed">
                Building AI-powered solutions for real-world problems. PlacePrepAI is our flagship product helping students crack campus placements.
              </p>
            </div>

            <div className="mt-7 flex gap-3">
              <a href="mailto:sakshamservices2025@gmail.com"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-primary text-white rounded-2xl text-sm font-semibold shadow-glow hover:opacity-90 transition-all">
                <Mail className="w-3.5 h-3.5" /> Email Us
              </a>
              <a href="tel:+917999105415"
                className="flex items-center gap-2 px-5 py-2.5 bg-secondary border border-border text-foreground rounded-2xl text-sm font-semibold hover:bg-secondary/80 transition-colors">
                <Phone className="w-3.5 h-3.5" /> Call Us
              </a>
            </div>
          </motion.div>

          {/* Form card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl border border-border shadow-card p-8">
            <h2 className="text-xl font-display font-bold text-foreground mb-7">Send a Message</h2>

            {sent ? (
              <div className="flex flex-col items-center justify-center h-56 text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mb-4">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <p className="font-display font-bold text-foreground text-lg mb-1">Message Sent!</p>
                <p className="text-sm text-muted-foreground">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground/60 block mb-2">Your Name</label>
                    <input value={form.name} onChange={e => set("name", e.target.value)} className={inputCls} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground/60 block mb-2">Email</label>
                    <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls} placeholder="you@email.com" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60 block mb-2">Subject</label>
                  <input value={form.subject} onChange={e => set("subject", e.target.value)} className={inputCls} placeholder="Project / Partnership / Other" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60 block mb-2">Message</label>
                  <textarea value={form.message} onChange={e => set("message", e.target.value)} rows={5}
                    className={`${inputCls} resize-none`} placeholder="Tell us what you have in mind..." />
                </div>
                <button onClick={handleSend} disabled={loading || !form.name || !form.email || !form.message}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-primary text-white font-semibold rounded-2xl shadow-glow hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send Message</>}
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Team */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/8 border border-accent/15 text-accent text-xs font-semibold">
              Team Saksham
            </div>
            <span className="text-muted-foreground text-sm">— Indore, MP, India</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map((member, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i + 0.4 }}
                className="bg-white rounded-3xl border border-border shadow-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all group">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center mb-4 shadow-sm`}>
                  <span className="text-white font-bold text-sm">{member.initials}</span>
                </div>
                <h3 className="font-display font-bold text-foreground text-sm mb-1">{member.name}</h3>
                <p className="text-primary text-xs font-medium mb-1.5">{member.role}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{member.sub}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;

