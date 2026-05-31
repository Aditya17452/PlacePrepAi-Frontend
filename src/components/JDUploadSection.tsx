/**
 * JDUploadSection.tsx
 * Rich UI component for students to paste custom JDs,
 * view Groq AI match %, and launch interviews for matched roles.
 *
 * Rules obeyed:
 *  - Does NOT touch InterviewRoom, Report, Login, Register, credits system, or auth flow
 *  - 100% backward-compatible addition to Dashboard
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Plus, Trash2, Play, Lock, CheckCircle,
  AlertCircle, ChevronUp, Loader2, CreditCard, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  submitStudentJD,
  getStudentJDs,
  getJDStatus,
  deleteStudentJD,
  startInterviewWithCustomJD,
  getCredits,
  useCredit,
  getStudentId,
} from "@/services/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StudentJD {
  id: string;
  company_name: string;
  role_title: string;
  match_pct: number;
  matched_skills: string[];
  missing_skills: string[];
  advice: string;
  status: "pending" | "complete" | "failed";
  created_at: string;
}

// ── Colour helpers ─────────────────────────────────────────────────────────────

const getMatchColors = (pct: number) => {
  if (pct >= 80) return { hex: "#22c55e", text: "text-green-400", ring: "ring-green-500/20" };
  if (pct >= 70) return { hex: "#3b82f6", text: "text-blue-400",  ring: "ring-blue-500/20"  };
  if (pct >= 50) return { hex: "#f59e0b", text: "text-yellow-400", ring: "ring-yellow-500/20" };
  return          { hex: "#6b7280", text: "text-gray-400",  ring: "ring-gray-500/20"  };
};

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Animated match % progress bar with a 70% threshold marker */
const MatchBar = ({ pct, animate: shouldAnimate = true }: { pct: number; animate?: boolean }) => {
  const { hex } = getMatchColors(pct);
  return (
    <div className="relative mt-4 mb-1">
      {/* 70% label */}
      <div
        className="absolute -top-4 text-[10px] text-muted-foreground/70 whitespace-nowrap"
        style={{ left: "70%", transform: "translateX(-50%)" }}
      >
        Min 70%
      </div>
      {/* Track */}
      <div className="h-2.5 rounded-full bg-muted overflow-visible relative">
        {/* Fill */}
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: hex }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: shouldAnimate ? 1.1 : 0, ease: "easeOut", delay: 0.15 }}
        />
        {/* 70% marker line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/50 pointer-events-none"
          style={{ left: "70%" }}
        />
      </div>
    </div>
  );
};

/** Skeleton shimmer while AI is matching */
const SkeletonCard = () => (
  <div className="p-5 rounded-2xl bg-card border border-border">
    <div className="flex items-start justify-between mb-4 animate-pulse">
      <div>
        <div className="h-4 bg-muted rounded w-32 mb-2" />
        <div className="h-3 bg-muted rounded w-24" />
      </div>
      <div className="h-7 w-12 bg-muted rounded-lg" />
    </div>
    <div className="relative mt-5 mb-1 animate-pulse">
      <div className="h-2.5 rounded-full bg-muted" />
    </div>
    <div className="flex gap-2 mt-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-5 w-16 bg-muted rounded-full" />
      ))}
    </div>
    <div className="h-9 bg-muted rounded-xl mt-4 animate-pulse" />
    <p className="text-[11px] text-center text-muted-foreground mt-3 animate-pulse">
      🤖 AI is matching your resume...
    </p>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

const JDUploadSection = () => {
  const navigate    = useNavigate();
  const studentId   = getStudentId();

  const [jds,        setJds]        = useState<StudentJD[]>([]);
  const [showForm,   setShowForm]   = useState(false);

  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [roleTitle,   setRoleTitle]   = useState("");
  const [jdText,      setJdText]      = useState("");
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [submitting,  setSubmitting]  = useState(false);

  // Credits
  const [credits,     setCredits]     = useState<number | null>(null);
  const [creditError, setCreditError] = useState("");

  // Per-card actions
  const [isStarting,  setIsStarting]  = useState<string | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  // ── Load on mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) return;
    loadJDs();
    getCredits()
      .then(d => setCredits(d.credits))
      .catch(() => setCredits(99));
  }, [studentId]);

  const loadJDs = async () => {
    if (!studentId) return;
    try {
      const data = await getStudentJDs(studentId);
      setJds(data as StudentJD[]);
    } catch (e) {
      console.error("Failed to load student JDs:", e);
    }
  };

  // ── Poll pending JDs every 2 s ───────────────────────────────────────────────
  const pendingIds = jds.filter(j => j.status === "pending").map(j => j.id);

  useEffect(() => {
    if (pendingIds.length === 0) return;

    const timer = setInterval(async () => {
      const updates = await Promise.all(
        pendingIds.map(id => getJDStatus(id).catch(() => null))
      );
      setJds(prev =>
        prev.map(jd => {
          const fresh = updates.find((u: any) => u?.id === jd.id);
          return fresh ? { ...jd, ...(fresh as Partial<StudentJD>) } : jd;
        })
      );
    }, 2000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIds.join(",")]);

  // ── Form validation ──────────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!companyName.trim()) errs.companyName = "Company name is required";
    if (!roleTitle.trim())   errs.roleTitle   = "Role title is required";
    if (jdText.trim().length < 50)
      errs.jdText = `JD text too short — ${jdText.trim().length} / 50 chars minimum`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit JD ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate() || !studentId) return;
    setSubmitting(true);
    try {
      const result: any = await submitStudentJD({
        student_id:   studentId,
        company_name: companyName.trim(),
        role_title:   roleTitle.trim(),
        jd_text:      jdText.trim(),
      });

      // Optimistic pending card
      const optimistic: StudentJD = {
        id:             result.id,
        company_name:   companyName.trim(),
        role_title:     roleTitle.trim(),
        match_pct:      0,
        matched_skills: [],
        missing_skills: [],
        advice:         "",
        status:         "pending",
        created_at:     new Date().toISOString(),
      };
      setJds(prev => [optimistic, ...prev]);

      // Reset form
      setShowForm(false);
      setCompanyName(""); setRoleTitle(""); setJdText("");
      setErrors({});
    } catch (e: any) {
      setErrors({ submit: e.message || "Failed to submit JD. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete JD ────────────────────────────────────────────────────────────────
  const handleDelete = async (jdId: string) => {
    if (!studentId) return;
    setDeletingId(jdId);
    try {
      await deleteStudentJD(jdId, studentId);
      setJds(prev => prev.filter(j => j.id !== jdId));
    } catch (e) {
      console.error("Delete failed:", e);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Start interview with custom JD ────────────────────────────────────────────
  const handleStartInterview = async (jd: StudentJD) => {
    setCreditError("");
    if (credits !== null && credits !== 99 && credits <= 0) {
      setCreditError("No interview credits left. Contact your placement officer.");
      return;
    }

    setIsStarting(jd.id);
    try {
      if (credits !== null && credits !== 99) {
        await useCredit();
        setCredits(c => Math.max(0, (c ?? 1) - 1));
      }
      await startInterviewWithCustomJD(jd.id);
      navigate("/pre-interview");
    } catch (err: any) {
      setCreditError(err.message || "Failed to start interview. Please try again.");
      getCredits().then(d => setCredits(d.credits)).catch(() => {});
    } finally {
      setIsStarting(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <section className="mb-10">

      {/* ── Section Divider ── */}
      <div className="flex items-center gap-4 mb-6 mt-2">
        <div className="flex-1 h-px bg-border" />
        <div className="text-center px-2">
          <p className="text-sm font-semibold text-muted-foreground">
            — Your Job Descriptions —
          </p>
          <p className="text-xs text-muted-foreground/55 mt-0.5">
            Match your resume against any company JD
          </p>
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Briefcase className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl font-semibold text-foreground">
            Custom JD Match
          </h2>
          {jds.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/15">
              {jds.length} JD{jds.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <Button
          variant="hero-outline"
          size="sm"
          onClick={() => { setShowForm(v => !v); setErrors({}); }}
          className="gap-1.5"
        >
          {showForm
            ? <><ChevronUp className="w-4 h-4" /> Close</>
            : <><Plus    className="w-4 h-4" /> Add JD</>
          }
        </Button>
      </div>

      {/* ── Credit error banner ── */}
      <AnimatePresence>
        {creditError && (
          <motion.div
            key="credit-err"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4 text-sm text-red-400"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{creditError}</span>
            <button onClick={() => setCreditError("")}><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add JD Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="jd-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl bg-card border border-border mb-6 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Paste a Job Description
              </h3>

              {/* Company + Role row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Company */}
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => { setCompanyName(e.target.value); setErrors(p => ({ ...p, companyName: "" })); }}
                    placeholder="e.g. Google, Infosys, Amazon"
                    className={`w-full px-4 py-2.5 text-sm bg-background border rounded-xl text-foreground
                      placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all
                      ${errors.companyName
                        ? "border-red-500/50 focus:ring-red-500/20"
                        : "border-border hover:border-primary/40 focus:ring-primary/30"}`}
                  />
                  {errors.companyName && (
                    <p className="text-xs text-red-400 mt-1">{errors.companyName}</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                    Role Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={e => { setRoleTitle(e.target.value); setErrors(p => ({ ...p, roleTitle: "" })); }}
                    placeholder="e.g. Software Engineer, Data Analyst"
                    className={`w-full px-4 py-2.5 text-sm bg-background border rounded-xl text-foreground
                      placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all
                      ${errors.roleTitle
                        ? "border-red-500/50 focus:ring-red-500/20"
                        : "border-border hover:border-primary/40 focus:ring-primary/30"}`}
                  />
                  {errors.roleTitle && (
                    <p className="text-xs text-red-400 mt-1">{errors.roleTitle}</p>
                  )}
                </div>
              </div>

              {/* JD Text */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">
                  Job Description Text <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={jdText}
                  onChange={e => { setJdText(e.target.value); setErrors(p => ({ ...p, jdText: "" })); }}
                  placeholder="Paste the full job description — required skills, responsibilities, qualifications..."
                  rows={5}
                  className={`w-full px-4 py-3 text-sm bg-background border rounded-xl text-foreground
                    placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none transition-all
                    md:row-span-7
                    ${errors.jdText
                      ? "border-red-500/50 focus:ring-red-500/20"
                      : "border-border hover:border-primary/40 focus:ring-primary/30"}`}
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-red-400 min-h-[16px]">{errors.jdText || ""}</p>
                  <p className="text-xs text-muted-foreground">{jdText.length} characters</p>
                </div>
              </div>

              {/* Submit error */}
              {errors.submit && (
                <p className="text-xs text-red-400 mb-3">{errors.submit}</p>
              )}

              {/* Form actions */}
              <div className="flex gap-3 justify-end flex-wrap">
                <Button
                  variant="outline" size="sm"
                  onClick={() => { setShowForm(false); setErrors({}); }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  variant="hero" size="sm"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="gap-1.5 w-full sm:w-auto min-w-[130px]"
                >
                  {submitting
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                    : <><Plus    className="w-3.5 h-3.5" /> Check Match</>
                  }
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state ── */}
      {jds.length === 0 && !showForm && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="py-14 text-center border-2 border-dashed border-border rounded-2xl"
        >
          <Briefcase className="w-10 h-10 text-muted-foreground/25 mx-auto mb-3" />
          <p className="font-medium text-foreground/60 mb-1">
            Add your first JD to check resume match
          </p>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            Paste any company's job description — we'll tell you if you qualify
          </p>
          <Button
            variant="hero-outline" size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add JD
          </Button>
        </motion.div>
      )}

      {/* ── JD Card Grid ── */}
      {jds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {jds.map((jd, i) => {
              const isPending      = jd.status === "pending";
              const isFailed       = jd.status === "failed";
              const isUnlocked     = jd.status === "complete" && jd.match_pct >= 70;
              const isLocked       = jd.status === "complete" && jd.match_pct < 70;
              const colors         = getMatchColors(jd.match_pct);
              const isThisDeleting = deletingId  === jd.id;
              const isThisStarting = isStarting  === jd.id;

              if (isPending) {
                return (
                  <motion.div
                    key={jd.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <SkeletonCard />
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={jd.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: isThisDeleting ? 0.4 : 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.93 }}
                  transition={{ delay: i * 0.04 }}
                  className={`relative p-5 rounded-2xl border transition-all duration-200 ${
                    isUnlocked
                      ? "bg-card border-green-500/20 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/5"
                      : isLocked
                      ? "bg-card/55 border-border opacity-70"
                      : "bg-card/55 border-border opacity-70"
                  }`}
                >
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(jd.id)}
                    disabled={isThisDeleting || isThisStarting}
                    title="Remove"
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center
                      text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                  >
                    {isThisDeleting
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2  className="w-3.5 h-3.5" />
                    }
                  </button>

                  {/* Card header */}
                  <div className="pr-8 mb-3">
                    <div className="flex items-start gap-2">
                      {isUnlocked
                        ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        : <Lock        className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      }
                      <div>
                        <h3 className="font-display font-semibold text-foreground text-sm leading-tight">
                          {jd.company_name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{jd.role_title}</p>
                      </div>
                    </div>
                  </div>

                  {/* Failed state */}
                  {isFailed ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Match analysis failed. Please upload your resume first, then try again.
                    </div>
                  ) : (
                    <>
                      {/* Match % score */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Resume Match</span>
                        <span className={`text-3xl font-black tabular-nums ${colors.text}`}>
                          {jd.match_pct}<span className="text-base font-semibold opacity-70">%</span>
                        </span>
                      </div>

                      {/* Animated bar */}
                      <MatchBar pct={jd.match_pct} />

                      {/* Advice */}
                      {jd.advice && (
                        <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">
                          {jd.advice}
                        </p>
                      )}

                      {/* Skill tags */}
                      {(jd.matched_skills.length > 0 || jd.missing_skills.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {jd.matched_skills.slice(0, 5).map(s => (
                            <span
                              key={s}
                              className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium"
                            >
                              ✓ {s}
                            </span>
                          ))}
                          {jd.missing_skills.slice(0, 4).map(s => (
                            <span
                              key={s}
                              className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-400/80 border border-red-500/20"
                            >
                              ✗ {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Credits note (only when unlocked) */}
                      {isUnlocked && credits !== null && credits !== 99 && (
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                          <CreditCard className="w-3 h-3" />
                          Uses 1 credit · {credits} remaining
                        </div>
                      )}

                      {/* CTA */}
                      <div className="mt-4">
                        {isUnlocked ? (
                          <Button
                            variant="hero"
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700"
                            disabled={isThisStarting || credits === 0}
                            onClick={() => handleStartInterview(jd)}
                          >
                            <Play className="w-3.5 h-3.5 mr-1.5" />
                            {isThisStarting  ? "Starting..."
                            : credits === 0  ? "No Credits Left"
                            :                  "Start Interview"}
                          </Button>
                        ) : (
                          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                            <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-400/80 leading-snug">
                              Requires â‰¥70% match. Add the missing skills to your resume and re-upload.
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};

export default JDUploadSection;

