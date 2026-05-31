import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview"|"students"|"payments"|"officers">("overview");
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditInput, setCreditInput] = useState<{ [id: string]: string }>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    if (role !== "admin" && role !== "officer") { navigate("/"); return; }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${sessionStorage.getItem("token")}` };
      const [s, p] = await Promise.all([
        fetch(`${API}/api/officer/students`, { headers }).then(r => r.json()),
        fetch(`${API}/api/officer/payments`, { headers }).then(r => r.json()).catch(() => ({ payments: [] }))
      ]);
      setStudents(s.students || []);
      setPayments(p.payments || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const addCredits = async (studentId: string) => {
    const amount = parseInt(creditInput[studentId] || "1");
    if (!amount || amount < 1) return;
    try {
      await fetch(`${API}/api/officer/credits/${studentId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        body: JSON.stringify({ amount })
      });
      setMsg(`✓ Added ${amount} credits`);
      setTimeout(() => setMsg(""), 3000);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const resetCredits = async (studentId: string) => {
    try {
      await fetch(`${API}/api/officer/credits/${studentId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        body: JSON.stringify({ credits: 3 })
      });
      setMsg("✓ Credits reset to 3");
      setTimeout(() => setMsg(""), 3000);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const totalInterviews = students.reduce((a, s) => a + (s.total_interviews || 0), 0);
  const avgScore = students.length
    ? Math.round(students.reduce((a, s) => a + (s.avg_score || 0), 0) / students.length)
    : 0;
  const totalRevenue = payments.reduce((a, p) => a + (p.amount || 0), 0);

  const tabStyle = (t: string) => ({
    padding: "10px 24px", fontSize: "10px", letterSpacing: "2px", cursor: "pointer",
    border: "none", background: "transparent",
    color: tab === t ? "#FF5A00" : "rgba(240,240,240,0.3)",
    borderBottom: tab === t ? "2px solid #FF5A00" : "2px solid transparent",
    fontFamily: "'DM Mono', monospace", transition: "all 0.2s"
  });

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#f0f0f0", fontFamily: "'DM Sans', sans-serif", paddingTop: "60px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <Navbar />

      <div style={{ padding: "40px 48px" }}>
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#FF5A00", marginBottom: "8px" }}>ADMIN</div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "56px", lineHeight: 1, color: "#f0f0f0" }}>
            CONTROL <span style={{ color: "#FF5A00" }}>PANEL</span>
          </h1>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "0", marginBottom: "40px" }}>
          {[
            { label: "TOTAL STUDENTS", val: students.length, color: "#f0f0f0" },
            { label: "TOTAL INTERVIEWS", val: totalInterviews, color: "#FF5A00" },
            { label: "AVG SCORE", val: avgScore ? `${avgScore}%` : "—", color: avgScore >= 65 ? "#4ade80" : "#facc15" },
            { label: "REVENUE", val: `â‚¹${totalRevenue}`, color: "#4ade80" },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "20px 32px",
              borderLeft: i === 0 ? "2px solid #FF5A00" : "1px solid rgba(255,90,0,0.15)",
              borderTop: "1px solid rgba(255,90,0,0.15)",
              borderBottom: "1px solid rgba(255,90,0,0.15)",
              borderRight: i === 3 ? "1px solid rgba(255,90,0,0.15)" : "none",
            }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "40px", color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: "rgba(240,240,240,0.3)", marginTop: "4px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,90,0,0.1)", marginBottom: "32px" }}>
          {(["overview", "students", "payments"] as const).map(t => (
            <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ padding: "10px 20px", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", fontSize: "12px", color: "#4ade80", marginBottom: "20px" }}>
            {msg}
          </div>
        )}

        {/* STUDENTS TAB */}
        {(tab === "overview" || tab === "students") && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div style={{ width: "32px", height: "1px", background: "#FF5A00" }} />
              <span style={{ fontSize: "10px", letterSpacing: "4px", color: "#FF5A00" }}>
                {tab === "overview" ? "RECENT STUDENTS" : "ALL STUDENTS"}
              </span>
            </div>

            <div style={{ border: "1px solid rgba(255,90,0,0.1)" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 200px",
                padding: "12px 24px", background: "rgba(255,90,0,0.04)",
                borderBottom: "1px solid rgba(255,90,0,0.1)"
              }}>
                {["NAME", "BRANCH", "CGPA", "CREDITS", "AVG SCORE", "ACTIONS"].map(h => (
                  <span key={h} style={{ fontSize: "9px", letterSpacing: "3px", color: "rgba(240,240,240,0.3)" }}>{h}</span>
                ))}
              </div>

              {(tab === "overview" ? students.slice(0, 8) : students).map((s, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 200px",
                  padding: "14px 24px", borderBottom: "1px solid rgba(255,90,0,0.06)",
                  alignItems: "center", transition: "background 0.2s"
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,90,0,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div>
                    <div style={{ fontSize: "13px", color: "#f0f0f0", fontWeight: 500 }}>{s.name}</div>
                    <div style={{ fontSize: "10px", color: "rgba(240,240,240,0.3)", fontFamily: "'DM Mono', monospace" }}>{s.email}</div>
                  </div>
                  <span style={{ fontSize: "12px", color: "rgba(240,240,240,0.5)" }}>{s.branch || "—"}</span>
                  <span style={{ fontSize: "12px", color: "rgba(240,240,240,0.5)" }}>{s.cgpa || "—"}</span>
                  <span style={{
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: "20px",
                    color: (s.credits || 0) > 0 ? "#FF5A00" : "#f87171"
                  }}>{s.credits || 0}</span>
                  <span style={{ fontSize: "12px", color: "rgba(240,240,240,0.5)" }}>
                    {s.avg_score ? `${s.avg_score}%` : "—"}
                  </span>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input
                      type="number" min="1" max="20"
                      placeholder="N"
                      value={creditInput[s.id] || ""}
                      onChange={e => setCreditInput(prev => ({ ...prev, [s.id]: e.target.value }))}
                      style={{
                        width: "48px", background: "transparent",
                        border: "1px solid rgba(255,90,0,0.2)",
                        color: "#f0f0f0", padding: "4px 8px",
                        fontSize: "12px", fontFamily: "'DM Mono', monospace", outline: "none"
                      }} />
                    <button onClick={() => addCredits(s.id)} style={{
                      background: "#FF5A00", border: "none", color: "#080808",
                      padding: "4px 10px", fontSize: "9px", letterSpacing: "1px",
                      cursor: "pointer", fontFamily: "'DM Mono', monospace"
                    }}>+ADD</button>
                    <button onClick={() => resetCredits(s.id)} style={{
                      background: "transparent", border: "1px solid rgba(240,240,240,0.15)",
                      color: "rgba(240,240,240,0.4)", padding: "4px 10px",
                      fontSize: "9px", cursor: "pointer", fontFamily: "'DM Mono', monospace"
                    }}>RST</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {tab === "payments" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div style={{ width: "32px", height: "1px", background: "#FF5A00" }} />
              <span style={{ fontSize: "10px", letterSpacing: "4px", color: "#FF5A00" }}>PAYMENT HISTORY</span>
            </div>

            {payments.length === 0 ? (
              <div style={{ padding: "60px", textAlign: "center", border: "1px dashed rgba(255,90,0,0.15)" }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "24px", color: "rgba(240,240,240,0.2)" }}>
                  NO PAYMENTS YET
                </div>
              </div>
            ) : (
              <div style={{ border: "1px solid rgba(255,90,0,0.1)" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                  padding: "12px 24px", background: "rgba(255,90,0,0.04)",
                  borderBottom: "1px solid rgba(255,90,0,0.1)"
                }}>
                  {["STUDENT", "PACKAGE", "CREDITS", "AMOUNT", "STATUS"].map(h => (
                    <span key={h} style={{ fontSize: "9px", letterSpacing: "3px", color: "rgba(240,240,240,0.3)" }}>{h}</span>
                  ))}
                </div>
                {payments.map((p, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                    padding: "14px 24px", borderBottom: "1px solid rgba(255,90,0,0.06)",
                    transition: "background 0.2s"
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,90,0,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ fontSize: "12px", color: "#f0f0f0", fontFamily: "'DM Mono', monospace" }}>{p.student_id?.slice(0, 8)}...</span>
                    <span style={{ fontSize: "12px", color: "rgba(240,240,240,0.5)", textTransform: "uppercase" }}>{p.package}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "20px", color: "#FF5A00" }}>{p.credits_added}</span>
                    <span style={{ fontSize: "12px", color: "#4ade80" }}>â‚¹{p.amount}</span>
                    <span style={{
                      fontSize: "9px", letterSpacing: "2px",
                      color: p.status === "success" ? "#4ade80" : "#f87171"
                    }}>{p.status?.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;

