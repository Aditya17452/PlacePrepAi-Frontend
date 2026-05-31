import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import {
  Users, CreditCard, BarChart3, TrendingUp,
  Plus, RotateCcw, ChevronDown, ChevronUp, Shield,
  Activity, Award, RefreshCw, Building2, CheckCircle2,
  Trash2, X
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const SuperAdminPanel = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [creditLogs, setCreditLogs] = useState<any[]>([]);
  const [tab, setTab] = useState<"overview" | "students" | "colleges" | "logs">("overview");
  const [creditInputs, setCreditInputs] = useState<{ [id: string]: string }>({});
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [studentReports, setStudentReports] = useState<{ [id: string]: any[] }>({});
  const [msg, setMsg] = useState({ text: "", type: "success" as "success" | "error" });
  const [loading, setLoading] = useState(true);

  // Enroll college state
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    name: "", domain: "", plan: "100", handler_name: "", handler_email: "", handler_password: ""
  });
  const [enrolling, setEnrolling] = useState(false);

  // Deactivate college state
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [collegeToDeactivate, setCollegeToDeactivate] = useState<{id: string, name: string} | null>(null);
  const [deactivateConfirmName, setDeactivateConfirmName] = useState("");

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("token") || localStorage.getItem("token") || ""}`,
  });

  useEffect(() => {
    const role = sessionStorage.getItem("role") || localStorage.getItem("role");
    if (role !== "super_admin") {
      navigate("/dashboard");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchStudents(), fetchColleges(), fetchCreditLogs()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/super/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Stats fetch failed:", e);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API}/super/students`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setStudents(data.students || []);
    } catch (e) {
      console.error("Students fetch failed:", e);
    }
  };

  const fetchColleges = async () => {
    try {
      const res = await fetch(`${API}/super/colleges`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setColleges(data.colleges || []);
    } catch (e) {
      console.error("Colleges fetch failed:", e);
    }
  };

  const fetchCreditLogs = async () => {
    try {
      const res = await fetch(`${API}/super/credit-logs`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCreditLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Credit logs fetch failed:", e);
    }
  };

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "success" }), 3500);
  };

  const handleEnrollCollege = async () => {
    if (!enrollForm.name || !enrollForm.domain || !enrollForm.handler_email || !enrollForm.handler_password) {
      showMsg("Please fill all required fields", "error");
      return;
    }
    setEnrolling(true);
    try {
      const res = await fetch(`${API}/super/colleges/enroll`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: enrollForm.name,
          domain: enrollForm.domain,
          plan: parseInt(enrollForm.plan),
          handler_name: enrollForm.handler_name,
          handler_email: enrollForm.handler_email,
          handler_password: enrollForm.handler_password
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg("✓ College enrolled successfully!");
        setEnrollOpen(false);
        setEnrollForm({ name: "", domain: "", plan: "100", handler_name: "", handler_email: "", handler_password: "" });
        fetchColleges();
        fetchStats();
      } else {
        showMsg(data.detail || "Failed to enroll college", "error");
      }
    } catch (e) {
      showMsg("Error connecting to server", "error");
    } finally {
      setEnrolling(false);
    }
  };

  const triggerDeactivate = (id: string, name: string) => {
    setCollegeToDeactivate({ id, name });
    setDeactivateConfirmName("");
    setDeactivateOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!collegeToDeactivate) return;
    if (deactivateConfirmName !== collegeToDeactivate.name) {
      showMsg("Name does not match", "error");
      return;
    }
    
    try {
      const res = await fetch(`${API}/super/colleges/${collegeToDeactivate.id}/deactivate`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) {
        showMsg(`✓ ${collegeToDeactivate.name} deactivated`);
        setDeactivateOpen(false);
        fetchColleges();
      } else {
        showMsg("Failed to deactivate", "error");
      }
    } catch (e) {
      showMsg("Error", "error");
    }
  };

  const addCredits = async (studentId: string) => {
    const amount = parseInt(creditInputs[studentId] || "5");
    if (!amount || amount <= 0) { showMsg("Enter a valid amount", "error"); return; }
    const res = await fetch(`${API}/super/credits/${studentId}/add`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ amount }),
    });
    if (res.ok) {
      showMsg(`✓ Added ${amount} credits`);
      setCreditInputs(p => ({ ...p, [studentId]: "" }));
      fetchStudents();
      fetchStats();
    } else {
      showMsg("Failed to add credits", "error");
    }
  };

  const resetCredits = async (studentId: string) => {
    const res = await fetch(`${API}/super/credits/${studentId}/reset`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ credits: 5 }),
    });
    if (res.ok) {
      showMsg("✓ Reset to 5 credits");
      fetchStudents();
      fetchStats();
    } else {
      showMsg("Failed to reset credits", "error");
    }
  };

  const toggleReports = async (studentId: string) => {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
      return;
    }
    setExpandedStudent(studentId);
    if (!studentReports[studentId]) {
      const res = await fetch(`${API}/super/student/${studentId}/reports`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      setStudentReports(prev => ({ ...prev, [studentId]: data.reports || [] }));
    }
  };

  const statCards = stats
    ? [
        { label: "Total Students",     value: stats.total_students,           icon: Users,      color: "from-violet-500 to-indigo-600" },
        { label: "Active Colleges",    value: stats.total_colleges,           icon: Building2,  color: "from-fuchsia-500 to-pink-600" },
        { label: "Total Interviews",   value: stats.total_interviews,         icon: BarChart3,  color: "from-blue-500 to-cyan-600" },
        { label: "Credits Remaining",  value: stats.total_credits_remaining,  icon: CreditCard, color: "from-amber-500 to-orange-600" },
        { label: "Credits Consumed",   value: stats.total_credits_consumed,   icon: Activity,   color: "from-rose-500 to-red-600" },
      ]
    : [];

  const visibleStudents = tab === "overview" ? students.slice(0, 8) : students;

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-foreground">
      <Navbar />

      <div className="pt-24 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" />
            Super Admin — Team Saksham
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground">
            Platform <span className="text-gradient">Control Center</span>
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Full visibility and control over colleges, students, and credits.
          </p>
        </motion.div>

        {/* Toast */}
        <AnimatePresence>
          {msg.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className={`mb-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium
                ${msg.type === "success"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"}`}>
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white border border-border rounded-2xl p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {statCards.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-medium leading-tight">{s.label}</span>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                    <s.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-display font-bold text-foreground">{s.value ?? "—"}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tabs + refresh */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-1 p-1 bg-white border border-border rounded-xl shadow-sm overflow-x-auto">
            {(["overview", "colleges", "students", "logs"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-colors capitalize whitespace-nowrap
                  ${tab === t ? "bg-gradient-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "overview" ? "📊 Overview" : t === "colleges" ? `🏛️ Colleges (${colleges.length})` : t === "students" ? `👥 All Students (${students.length})` : `📋 Credits Log`}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {tab === "colleges" && (
              <button onClick={() => setEnrollOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-foreground rounded-xl hover:bg-foreground/90 transition-colors shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Enroll College
              </button>
            )}
            <button onClick={fetchData}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-border bg-white rounded-xl hover:bg-secondary transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Dynamic Content based on Tab */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-display font-bold text-foreground text-lg">
                {tab === "overview" ? "Recent Students" : tab === "colleges" ? "Enrolled Institutions" : tab === "students" ? "All Students" : "Credits Audit Log"}
              </h2>
            </div>

            {/* Colleges Table */}
            {tab === "colleges" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {["Institution", "Plan", "Credits", "Handler Email", "Enrolled", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {colleges.map((c) => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground text-sm">{c.name}</div>
                          <div className="text-xs text-muted-foreground">@{c.domain}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                            {c.plan} Students
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-bold text-foreground">{c.credits_left} <span className="text-xs font-normal text-muted-foreground">left</span></div>
                          <div className="text-xs text-muted-foreground">{c.credits_used} used / {c.total_credits} total</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{c.handler_email}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{c.enrolled_students} <Users className="w-3 h-3 inline ml-1 opacity-50"/></td>
                        <td className="px-4 py-3">
                          {c.is_active ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                              <X className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.is_active && (
                            <button onClick={() => triggerDeactivate(c.id, c.name)}
                              className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1">
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {colleges.length === 0 && !loading && (
                      <tr>
                        <td colSpan={7} className="py-20 text-center text-muted-foreground text-sm">
                          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No colleges enrolled yet. Click "Enroll College" to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Students Table */}
            {(tab === "overview" || tab === "students") && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {["Student", "College", "Branch", "CGPA", "Credits Left", "Interviews", "Avg Score", "Manage"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((s) => (
                      <React.Fragment key={s.id}>
                        <tr className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer"
                          onClick={() => toggleReports(s.id)}>
                          
                          {/* Name + email */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {s.name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground text-sm">{s.name}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[160px]">{s.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{s.college || "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{s.branch || "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{s.cgpa || "—"}</td>

                          {/* Credits remaining */}
                          <td className="px-4 py-3">
                            <span className={`text-lg font-display font-bold ${s.credits_remaining > 0 ? "text-primary" : "text-red-500"}`}>
                              {s.credits_remaining}
                            </span>
                            <div className="text-[10px] text-muted-foreground -mt-1">{s.credits_used} used</div>
                          </td>

                          <td className="px-4 py-3 text-sm text-muted-foreground">{s.total_interviews}</td>

                          {/* Avg score */}
                          <td className="px-4 py-3">
                            {s.avg_score > 0 ? (
                              <span className={`inline-flex items-center gap-1 text-sm font-semibold
                                ${s.avg_score >= 70 ? "text-green-600" : s.avg_score >= 50 ? "text-amber-600" : "text-red-500"}`}>
                                <Award className="w-3 h-3" />
                                {s.avg_score}%
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No data</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number" min="1" max="50" placeholder="N"
                                value={creditInputs[s.id] || ""}
                                onChange={e => setCreditInputs(p => ({ ...p, [s.id]: e.target.value }))}
                                className="w-12 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                              />
                              <button
                                onClick={() => addCredits(s.id)}
                                title="Add credits"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs hover:bg-primary/20 transition-colors">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => resetCredits(s.id)}
                                title="Reset to 5 credits"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary border border-border text-muted-foreground rounded-lg text-xs hover:bg-secondary/80 transition-colors">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <div className="ml-1 text-muted-foreground">
                                {expandedStudent === s.id
                                  ? <ChevronUp className="w-4 h-4" />
                                  : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable reports row */}
                        {expandedStudent === s.id && (
                          <tr key={`${s.id}-reports`}>
                            <td colSpan={8} className="px-5 py-4 bg-gradient-to-r from-violet-50/50 to-indigo-50/30 border-b border-border/50">
                              <div className="flex items-center gap-2 mb-3">
                                <BarChart3 className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold text-foreground">
                                  Interview Reports — {s.name}
                                </span>
                              </div>
                              {(studentReports[s.id] || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">No completed interviews yet.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2.5">
                                  {(studentReports[s.id] || []).map((r: any) => (
                                    <div key={r.session_id}
                                      className="px-4 py-3 bg-white border border-border rounded-xl text-xs shadow-sm min-w-[180px]">
                                      <div className="text-muted-foreground mb-1">{r.date}</div>
                                      <div className={`text-base font-display font-bold mb-1
                                        ${(r.overall_score || 0) >= 70 ? "text-green-600" : (r.overall_score || 0) >= 50 ? "text-amber-600" : "text-red-500"}`}>
                                        {r.overall_score ?? 0}% — {r.verdict || "N/A"}
                                      </div>
                                      <div className="text-muted-foreground space-y-0.5">
                                        <div>Tech: <span className="text-foreground font-medium">{r.technical ?? 0}%</span></div>
                                        <div>Comm: <span className="text-foreground font-medium">{r.communication ?? 0}%</span></div>
                                      </div>
                                      <div className="mt-2 pt-2 border-t border-border">
                                        <button onClick={() => navigate(`/report?session=${r.session_id}`)} className="text-primary hover:underline text-[11px] font-bold uppercase w-full text-center py-1">View Full Report</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {students.length === 0 && !loading && (
                      <tr>
                        <td colSpan={8} className="py-20 text-center text-muted-foreground text-sm">
                          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No students registered yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Logs Table */}
            {tab === "logs" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {["Student Name", "Amount", "Reason", "Date"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {creditLogs.map((log, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{log.student_name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={log.amount > 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                            {log.amount > 0 ? "+" : ""}{log.amount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <span className="px-2 py-1 bg-secondary rounded text-xs">{log.reason}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{log.date}</td>
                      </tr>
                    ))}
                    {creditLogs.length === 0 && !loading && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-muted-foreground text-sm">
                          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No credit transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </div>

      {/* Enroll College Modal */}
      <Dialog.Root open={enrollOpen} onOpenChange={setEnrollOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-card p-6 shadow-xl border border-border animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <Dialog.Title className="text-xl font-display font-bold">Enroll Institution</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-1">
                  Create a new college and institute handler account.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              </Dialog.Close>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground/70 block mb-1.5">College Name *</label>
                <input value={enrollForm.name} onChange={e => setEnrollForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                  placeholder="e.g. Indore Institute of Science and Tech" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground/70 block mb-1.5">Email Domain *</label>
                  <input value={enrollForm.domain} onChange={e => setEnrollForm(f => ({ ...f, domain: e.target.value }))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                    placeholder="e.g. indoreinstitute.com" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/70 block mb-1.5">Plan *</label>
                  <select value={enrollForm.plan} onChange={e => setEnrollForm(f => ({ ...f, plan: e.target.value }))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                    <option value="100">100 Students (500 CR)</option>
                    <option value="300">300 Students (1500 CR)</option>
                    <option value="600">600 Students (3000 CR)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 pb-1 border-t border-border mt-2">
                <span className="text-xs font-bold text-foreground/60 uppercase tracking-wider">Institute Handler Details</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground/70 block mb-1.5">Handler Name</label>
                <input value={enrollForm.handler_name} onChange={e => setEnrollForm(f => ({ ...f, handler_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                  placeholder="e.g. Placement Officer" />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground/70 block mb-1.5">Handler Login Email *</label>
                <input type="email" value={enrollForm.handler_email} onChange={e => setEnrollForm(f => ({ ...f, handler_email: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                  placeholder="e.g. placement@indoreinstitute.com" />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground/70 block mb-1.5">Handler Initial Password *</label>
                <input type="password" value={enrollForm.handler_password} onChange={e => setEnrollForm(f => ({ ...f, handler_password: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                  placeholder="••••••••" />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 py-2.5 rounded-xl border border-border font-medium hover:bg-secondary transition-colors text-sm">
                  Cancel
                </button>
              </Dialog.Close>
              <button onClick={handleEnrollCollege} disabled={enrolling}
                className="flex-1 py-2.5 rounded-xl bg-gradient-primary text-white font-medium shadow-glow hover:opacity-90 transition-opacity disabled:opacity-60 text-sm">
                {enrolling ? "Enrolling..." : "Enroll College"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Deactivate College Modal */}
      <Dialog.Root open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-card p-6 shadow-xl border border-border animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div>
                <Dialog.Title className="text-xl font-display font-bold text-red-600">Deactivate College</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-1">
                  This will suspend all student accounts under this college.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              </Dialog.Close>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground/70 block mb-1.5">
                  Type <span className="font-bold text-foreground">"{collegeToDeactivate?.name}"</span> to confirm:
                </label>
                <input value={deactivateConfirmName} onChange={e => setDeactivateConfirmName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none" 
                  placeholder="College Name" />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 py-2.5 rounded-xl border border-border font-medium hover:bg-secondary transition-colors text-sm">
                  Cancel
                </button>
              </Dialog.Close>
              <button onClick={confirmDeactivate} disabled={deactivateConfirmName !== collegeToDeactivate?.name}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 text-sm">
                Deactivate
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
};

// We need React to use React.Fragment
import React from 'react';

export default SuperAdminPanel;
