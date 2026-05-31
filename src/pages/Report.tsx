import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download, Star, TrendingUp, AlertCircle, CheckCircle,
  BarChart3, Brain, MessageSquare, Eye, ArrowLeft, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";

interface ReportData {
  status: string;
  overallScore: number;
  verdict: string;
  categories: {
    technicalAccuracy: number;
    communication: number;
    problemSolving: number;
    confidence: number;
    bodyLanguage: number;
  };
  strengths: string[];
  improvements: string[];
  summary: string;
  tips: string[];
  topics: { name: string; score: number; feedback: string }[];
  questionBreakdown: { question: string; answer: string; turn: number; phase: string }[];
}

const ScoreRing = ({ score, size = 120, color }: { score: number; size?: number; color: string }) => {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </svg>
  );
};

const getColor = (score: number) => {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
};

const getVerdict = (verdict: string) => {
  const map: Record<string, { color: string; bg: string }> = {
    "Excellent": { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    "Good": { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    "Needs Work": { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    "Poor": { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  };
  return map[verdict] || map["Good"];
};

const Report = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session") || sessionStorage.getItem("session_id") || "";
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState("");
  const [expandedTranscript, setExpandedTranscript] = useState<number | null>(null);

  const studentName = sessionStorage.getItem("student_name") || "Candidate";
  const company = sessionStorage.getItem("interview_company") || "Company";
  const role = sessionStorage.getItem("interview_role") || "Role";

  useEffect(() => {
    if (!sessionId) { navigate("/dashboard"); return; }
    fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    try {
      const r = await fetch(`http://localhost:8000/api/interviews/${sessionId}/report`);
      const data = await r.json();
      if (data.status === "processing") {
        setPolling(p => p + 1);
        setTimeout(fetchReport, 3000);
        return;
      }
      setReport(data);
    } catch (e) {
      setTimeout(fetchReport, 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setMsg("Link copied!");
    setTimeout(() => setMsg(""), 2000);
  };

  const downloadPDF = async () => {
    if (!report) return;
    setDownloading(true);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => {
      try {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        
        const W = 210; // page width
        const margin = 20;
        const contentW = W - margin * 2;
        let y = 0;
        
        // Helper functions
        const addPage = () => { doc.addPage(); y = 20; };
        
        const checkPage = (needed: number) => {
            if (y + needed > 270) addPage();
        };
        
        const drawText = (text: string, x: number, yPos: number, size: number, style: string = "normal", color: number[] = [30,30,30]) => {
            doc.setFontSize(size);
            doc.setFont("helvetica", style);
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(text, x, yPos);
        };
        
        const wrapText = (text: string, x: number, yPos: number, maxW: number, size: number, lineH: number): number => {
            if (!text) return yPos;
            doc.setFontSize(size);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(60, 60, 60);
            const lines = doc.splitTextToSize(String(text), maxW);
            doc.text(lines, x, yPos);
            return yPos + lines.length * lineH;
        };

        // ── HEADER BLOCK ──────────────────────────────────────────
        // Dark header background
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, W, 52, "F");
        
        // Brand name
        drawText("PlacePrepAI", margin, 16, 22, "bold", [255, 255, 255]);
        
        // Tagline
        drawText("AI-Powered Interview Assessment Report", margin, 24, 9, "normal", [148, 163, 184]);
        
        // Date right aligned
        const dateStr = new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
        drawText(dateStr, W - margin, 16, 9, "normal", [148, 163, 184]);
        
        // Divider line in header
        doc.setDrawColor(255, 255, 255, 0.2);
        doc.setLineWidth(0.3);
        doc.line(margin, 30, W - margin, 30);
        
        // Candidate info
        drawText(studentName || "Candidate", margin, 40, 16, "bold", [255, 255, 255]);
        drawText(`${role} | ${company || "PlacePrepAI Assessment"}`, margin, 48, 9, "normal", [100, 160, 255]);
        
        y = 64;

        // ── SCORE SECTION ─────────────────────────────────────────
        // Score box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, contentW, 36, 3, 3, "FD");
        
        // Overall score circle simulation
        const scoreColor = report.overallScore >= 70 ? [22, 163, 74] : report.overallScore >= 50 ? [234, 179, 8] : [220, 38, 38];
        doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        doc.circle(margin + 20, y + 18, 13, "F");
        drawText(`${report.overallScore}`, margin + 20, y + 21, 16, "bold", [255, 255, 255]);
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text("/100", margin + 20, y + 27, { align: "center" });
        
        // Verdict
        drawText("Overall Score", margin + 38, y + 12, 9, "normal", [100, 116, 139]);
        drawText(`Verdict: ${report.verdict || "N/A"}`, margin + 38, y + 20, 13, "bold", scoreColor);
        
        // Session info
        drawText(`Session: ${sessionId.slice(0, 8)}...`, W - margin, y + 12, 8, "normal", [148, 163, 184]);
        doc.text(`Session: ${sessionId.slice(0,8)}...`, W - margin, y + 12, { align: "right" });
        
        y += 46;

        // ── SCORE BREAKDOWN ───────────────────────────────────────
        checkPage(60);
        drawText("Score Breakdown", margin, y, 12, "bold", [15, 23, 42]);
        y += 8;
        
        const categories = [
            { label: "Technical Accuracy", value: report.categories?.technicalAccuracy || 0 },
            { label: "Communication", value: report.categories?.communication || 0 },
            { label: "Problem Solving", value: report.categories?.problemSolving || 0 },
            { label: "Confidence", value: report.categories?.confidence || 0 },
            { label: "Body Language", value: report.categories?.bodyLanguage || 0 },
        ];
        
        categories.forEach(cat => {
            checkPage(12);
            // Label
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(60, 60, 60);
            doc.text(cat.label, margin, y);
            
            // Score value right side
            doc.setFont("helvetica", "bold");
            doc.text(`${cat.value}%`, W - margin, y, { align: "right" });
            
            // Progress bar background
            doc.setFillColor(226, 232, 240);
            doc.roundedRect(margin, y + 2, contentW, 4, 1, 1, "F");
            
            // Progress bar fill
            const barColor = cat.value >= 70 ? [22, 163, 74] : cat.value >= 50 ? [234, 179, 8] : [220, 38, 38];
            doc.setFillColor(barColor[0], barColor[1], barColor[2]);
            const barW = (cat.value / 100) * contentW;
            if (barW > 0) doc.roundedRect(margin, y + 2, barW, 4, 1, 1, "F");
            
            y += 12;
        });

        // ── TOPIC ANALYSIS ────────────────────────────────────────
        const topics = Array.isArray(report.topics) ? report.topics : [];
        if (topics.length > 0) {
            checkPage(20);
            y += 4;
            doc.setFillColor(241, 245, 249);
            doc.rect(margin, y, contentW, 8, "F");
            drawText("Topic Analysis", margin + 3, y + 5.5, 10, "bold", [15, 23, 42]);
            y += 14;
            
            topics.forEach((topic: any) => {
                checkPage(16);
                const topicScore = topic.score || 0;
                const topicColor = topicScore >= 70 ? [22,163,74] : topicScore >= 50 ? [234,179,8] : [220,38,38];
                
                doc.setFillColor(topicColor[0], topicColor[1], topicColor[2]);
                doc.circle(margin + 2, y - 1, 1.5, "F");
                
                drawText(`${topic.name || "Topic"} — ${topicScore}%`, margin + 6, y, 9, "bold", [30, 30, 30]);
                y += 5;
                if (topic.feedback) {
                    y = wrapText(topic.feedback, margin + 6, y, contentW - 6, 8, 5);
                }
                y += 3;
            });
        }

        // ── STRENGTHS ─────────────────────────────────────────────
        const strengths = Array.isArray(report.strengths) ? report.strengths : [];
        if (strengths.length > 0) {
            checkPage(20);
            y += 4;
            doc.setFillColor(240, 253, 244);
            doc.setDrawColor(187, 247, 208);
            doc.setLineWidth(0.5);
            doc.rect(margin, y, contentW, 8, "FD");
            drawText("Strengths", margin + 3, y + 5.5, 10, "bold", [22, 101, 52]);
            y += 13;
            
            strengths.forEach((s: string) => {
                checkPage(10);
                doc.setFillColor(22, 163, 74);
                doc.circle(margin + 2, y - 1, 1.5, "F");
                y = wrapText(s, margin + 6, y, contentW - 6, 9, 5);
                y += 3;
            });
        }

        // ── AREAS TO IMPROVE ──────────────────────────────────────
        const improvements = Array.isArray(report.improvements) ? report.improvements : [];
        if (improvements.length > 0) {
            checkPage(20);
            y += 4;
            doc.setFillColor(254, 252, 232);
            doc.setDrawColor(253, 224, 71);
            doc.setLineWidth(0.5);
            doc.rect(margin, y, contentW, 8, "FD");
            drawText("Areas to Improve", margin + 3, y + 5.5, 10, "bold", [113, 63, 18]);
            y += 13;
            
            improvements.forEach((imp: string) => {
                checkPage(10);
                doc.setFillColor(234, 179, 8);
                doc.circle(margin + 2, y - 1, 1.5, "F");
                y = wrapText(imp, margin + 6, y, contentW - 6, 9, 5);
                y += 3;
            });
        }

        // ── ACTIONABLE TIPS ───────────────────────────────────────
        const tips = Array.isArray(report.tips) ? report.tips : [];
        if (tips.length > 0) {
            checkPage(20);
            y += 4;
            doc.setFillColor(239, 246, 255);
            doc.setDrawColor(147, 197, 253);
            doc.setLineWidth(0.5);
            doc.rect(margin, y, contentW, 8, "FD");
            drawText("Actionable Tips", margin + 3, y + 5.5, 10, "bold", [30, 64, 175]);
            y += 13;
            
            tips.forEach((tip: string, idx: number) => {
                checkPage(10);
                drawText(`${idx + 1}.`, margin + 1, y, 9, "bold", [30, 64, 175]);
                y = wrapText(tip, margin + 7, y, contentW - 7, 9, 5);
                y += 3;
            });
        }

        // ── FOOTER ────────────────────────────────────────────────
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFillColor(248, 250, 252);
            doc.rect(0, 282, W, 15, "F");
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, 282, W - margin, 282);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text("Generated by PlacePrepAI  |  AI-Powered Placement Preparation  |  Team Saksham, Indore", margin, 289);
            doc.text(`Page ${i} of ${pageCount}`, W - margin, 289, { align: "right" });
        }

        // Save
        const filename = `PlacePrepAI_${(studentName||"Report").replace(/\s+/g,"_")}_${new Date().toISOString().split("T")[0]}.pdf`;
        doc.save(filename);
      } catch (err) {
        console.error("PDF Generation Error:", err);
        alert("Failed to generate PDF. Some report data might be missing.");
      } finally {
        setDownloading(false);
      }
    };

    script.onerror = () => {
      alert("PDF library failed to load. Please check your internet connection.");
      setDownloading(false);
    };
    
    document.body.appendChild(script);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <div className="text-center mt-20">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-foreground font-medium">Generating your evaluation...</p>
          <p className="text-sm text-muted-foreground mt-1">This takes 15-30 seconds</p>
          {polling > 3 && (
            <p className="text-xs text-muted-foreground mt-3">Still processing... please wait</p>
          )}
        </div>
      </div>
    );
  }

  if (!report || report.status === "failed") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-md mx-auto text-center pt-40 px-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Report Not Available</h2>
          <p className="text-muted-foreground mb-6">The evaluation could not be completed. Please try again.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
            <Button onClick={fetchReport} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const verdictStyle = getVerdict(report.verdict);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-5 h-5 text-primary" />
                <span className="text-sm text-primary font-semibold">PlacePrepAI Report</span>
              </div>
              <h1 className="text-3xl font-black text-foreground">{studentName}</h1>
              <p className="text-muted-foreground">{role} · {company}</p>
            </div>
            <Button
              onClick={downloadPDF}
              disabled={downloading}
              className="gap-2 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20"
            >
              <Download className="w-4 h-4" />
              {downloading ? "Generating PDF..." : "Download PDF Report"}
            </Button>
          </div>
        </motion.div>

        {/* Overall Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-2xl bg-card border border-border mb-6 text-center"
        >
          <div className="relative inline-block mb-4">
            <ScoreRing score={report.overallScore} size={140} color={getColor(report.overallScore)} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-foreground">{report.overallScore}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${verdictStyle.bg} ${verdictStyle.color}`}>
            <Star className="w-4 h-4" /> {report.verdict}
          </div>
        </motion.div>

        {/* Category bars */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-card border border-border mb-6"
        >
          <h2 className="font-bold text-foreground mb-5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Score Breakdown
          </h2>
          <div className="space-y-4">
            {[
              ["Technical Accuracy", report.categories.technicalAccuracy, <Brain className="w-4 h-4" />],
              ["Communication", report.categories.communication, <MessageSquare className="w-4 h-4" />],
              ["Problem Solving", report.categories.problemSolving, <TrendingUp className="w-4 h-4" />],
              ["Confidence", report.categories.confidence, <Star className="w-4 h-4" />],
              ["Body Language", report.categories.bodyLanguage, <Eye className="w-4 h-4" />],
            ].map(([label, val, icon]: any) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span style={{ color: getColor(val) }}>{icon}</span>
                    {label}
                  </div>
                  <span className="text-sm font-bold" style={{ color: getColor(val) }}>{val}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: getColor(val) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Topics */}
        {report.topics && report.topics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-card border border-border mb-6"
          >
            <h2 className="font-bold text-foreground mb-4">Topic Analysis</h2>
            <div className="space-y-3">
              {report.topics.map((t, i) => (
                <div key={i} className="p-4 rounded-xl bg-background border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-foreground">{t.name}</span>
                    <span className="text-sm font-bold" style={{ color: getColor(t.score) }}>{t.score}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.feedback}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Strengths + Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl bg-green-500/5 border border-green-500/20"
          >
            <h2 className="font-bold text-green-400 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Strengths
            </h2>
            <ul className="space-y-2">
              {(report.strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="text-green-400 mt-0.5">✓</span> {s}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl bg-yellow-500/5 border border-yellow-500/20"
          >
            <h2 className="font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Areas to Improve
            </h2>
            <ul className="space-y-2">
              {(report.improvements || []).map((imp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="text-yellow-400 mt-0.5">â†‘</span> {imp}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-2xl bg-primary/5 border border-primary/20 mb-6"
        >
          <h2 className="font-bold text-primary mb-4">💡 Actionable Tips</h2>
          <div className="space-y-3">
            {(report.tips || []).map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground/80 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3 justify-center items-center flex-wrap">
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          <Button onClick={handleShare} variant="secondary" className="gap-2 relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            Share Link
            {msg && (
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs py-1 px-3 rounded shadow-lg whitespace-nowrap">
                {msg}
              </span>
            )}
          </Button>
          <Button onClick={downloadPDF} disabled={downloading} className="gap-2">
            <Download className="w-4 h-4" />
            {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </div>

        {/* Transcript Breakdown */}
        {report.questionBreakdown && report.questionBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 pt-8 border-t border-border"
          >
            <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Interview Transcript
            </h2>
            <div className="space-y-4">
              {report.questionBreakdown.map((q, idx) => {
                const isExpanded = expandedTranscript === idx;
                const truncatedAnswer = q.answer.length > 150 ? q.answer.slice(0, 150) + "..." : q.answer;
                return (
                  <div key={idx} className="p-4 rounded-xl bg-secondary/20 border border-border text-sm">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <p className="font-semibold text-primary"><span className="text-muted-foreground mr-1">Q{q.turn}:</span> {q.question}</p>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded flex-shrink-0 ${q.phase === 'warmup' ? 'bg-blue-500/20 text-blue-400' : q.phase === 'technical' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                        {q.phase}
                      </span>
                    </div>
                    <div className="text-foreground/80 pl-6 border-l-2 border-border/50">
                      <span className="text-muted-foreground font-semibold mr-1">A:</span> 
                      {isExpanded ? q.answer : truncatedAnswer}
                      {q.answer.length > 150 && (
                        <button 
                          onClick={() => setExpandedTranscript(isExpanded ? null : idx)}
                          className="ml-2 text-xs text-primary hover:underline font-semibold"
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Report;

