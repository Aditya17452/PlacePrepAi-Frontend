import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Target, TrendingUp,
  CreditCard, CheckCircle
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  analyzeResume, fetchSessions, getCredits,
  type InterviewSession
} from "@/services/api";
import JDUploadSection from "@/components/JDUploadSection";

const Dashboard = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sessions,      setSessions]      = useState<InterviewSession[]>([]);
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileName,      setFileName]      = useState("");
  const [credits,       setCredits]       = useState<number | null>(null);

  const studentName =
    sessionStorage.getItem("student_name") ||
    sessionStorage.getItem("name") ||
    "Student";

  useEffect(() => {
    fetchSessions().then(setSessions).catch(console.error);
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      const data = await getCredits();
      setCredits(data.credits);
    } catch {
      setCredits(99); // fallback: unlimited if API not ready
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsAnalyzing(true);
    setUploadSuccess(false);
    try {
      // Still calls the backend so resume_text is stored for JD matching
      await analyzeResume(file);
      setUploadSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Welcome, {studentName} 👋
            </h1>
            <p className="text-muted-foreground">Upload your resume, match with JDs, and start practicing.</p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Target,     label: "Sessions",   value: sessions.length.toString(), color: "text-primary" },
              {
                icon: TrendingUp, label: "Avg Score",  color: "text-success",
                value: sessions.length
                  ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length) + "%"
                  : "—"
              },
              {
                icon: CreditCard, label: "Credits Left",
                color: credits === 0 ? "text-red-400" : "text-green-400",
                value: credits === null ? "..." : credits === 99 ? "∞" : String(credits)
              },
            ].map((stat) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl bg-card border border-border">
                <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Resume Upload */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/30 transition-colors mb-4 text-center cursor-pointer"
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">
              {fileName || "Upload Your Resume"}
            </p>
            <p className="text-sm text-muted-foreground">PDF format · AI stores your skills for JD matching below</p>
            <Button variant="hero" size="sm" className="mt-4" disabled={isAnalyzing}>
              <FileText className="w-4 h-4 mr-1" />
              {isAnalyzing ? "Analyzing resume..." : "Choose PDF"}
            </Button>
          </motion.div>

          {/* Upload success banner */}
          <AnimatePresence>
            {uploadSuccess && !isAnalyzing && (
              <motion.div
                key="upload-success"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 mb-6"
              >
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-400">Resume uploaded successfully!</p>
                  <p className="text-xs text-green-300/70 mt-0.5">
                    Now add the job descriptions you want to apply for below.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── CUSTOM JD MATCH SECTION ──────────────────────────────── */}
          <JDUploadSection />



          {/* Past Sessions */}
          {sessions.length > 0 && (
            <>
              <h2 className="font-display text-xl font-semibold text-foreground mb-4 mt-4">Past Sessions</h2>
              <div className="space-y-3">
                {sessions.map((s, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div>
                      <p className="font-medium text-foreground">{s.company} — {s.role}</p>
                      <p className="text-sm text-muted-foreground">{s.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-display font-bold text-lg ${
                        s.score >= 80 ? "text-green-400"
                        : s.score >= 60 ? "text-primary"
                        : "text-warning"
                      }`}>{s.score}%</span>
                      <Button variant="hero-outline" size="sm"
                        onClick={() => navigate(`/report?session=${s.id}`)}>
                        View Report
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;

