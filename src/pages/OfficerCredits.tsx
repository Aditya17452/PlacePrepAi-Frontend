import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, RefreshCw, CreditCard, Users, TrendingUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";

interface StudentCredit {
  student_id: string;
  name: string;
  email: string;
  credits: number;
  total_used: number;
}

interface CollegeStats {
  total_credits: number;
  credits_used: number;
  credit_limit: number;
}

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const OfficerCredits = () => {
  const [students, setStudents] = useState<StudentCredit[]>([]);
  const [collegeStats, setCollegeStats] = useState<CollegeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [amount, setAmount] = useState(1);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const r = await window.fetch(`${API}/officer/credits`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      const data = await r.json();
      if (data.students) {
        setStudents(data.students);
        setCollegeStats(data.college);
      } else {
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load students:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadStudents(); }, []);

  const addCredits = async (studentId: string, amt: number) => {
    try {
      const r = await window.fetch(`${API}/officer/credits/${studentId}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify({ amount: amt })
      });
      if (r.ok) {
        setStudents(prev => prev.map(s =>
          s.student_id === studentId ? { ...s, credits: s.credits + amt } : s
        ));
        setAdding(null);
      }
    } catch (e) { console.error(e); }
  };

  const resetCredits = async (studentId: string, credits: number) => {
    try {
      const r = await window.fetch(`${API}/officer/credits/${studentId}/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`
        },
        body: JSON.stringify({ credits })
      });
      if (r.ok) {
        setStudents(prev => prev.map(s =>
          s.student_id === studentId ? { ...s, credits } : s
        ));
      }
    } catch (e) { console.error(e); }
  };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const poolRemaining = collegeStats ? Math.max(0, collegeStats.total_credits - collegeStats.credits_used) : 0;
  const poolUsed = collegeStats ? collegeStats.credits_used : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-12">

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-black text-foreground mb-1">Credit Management</h1>
          <p className="text-muted-foreground mb-8">Assign and manage interview credits for students</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Students", value: students.length, icon: <Users className="w-5 h-5" />, color: "text-blue-400" },
            { label: "Credits Remaining", value: poolRemaining, icon: <CreditCard className="w-5 h-5" />, color: "text-green-400" },
            { label: "Interviews Used", value: poolUsed, icon: <TrendingUp className="w-5 h-5" />, color: "text-purple-400" },
          ].map((s, i) => (
            <div key={i} className="p-5 rounded-xl bg-card border border-border">
              <div className={`flex items-center gap-2 mb-2 ${s.color}`}>{s.icon}<span className="text-xs font-medium text-muted-foreground">{s.label}</span></div>
              <div className="text-3xl font-black text-foreground">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button variant="outline" onClick={loadStudents} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-card border-b border-border">
                <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credits Left</th>
                <th className="text-center p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Used</th>
                <th className="text-right p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center p-10 text-muted-foreground"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-10 text-muted-foreground">{search ? "No match" : "No students found"}</td></tr>
              ) : filtered.map((s, i) => (
                <motion.tr key={s.student_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="border-b border-border/50 hover:bg-card/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-foreground text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-xl font-black ${s.credits === 0 ? "text-red-400" : s.credits <= 1 ? "text-yellow-400" : "text-green-400"}`}>{s.credits}</span>
                    {s.credits === 0 && <div className="text-xs text-red-400 mt-0.5">No credits</div>}
                  </td>
                  <td className="p-4 text-center"><span className="text-sm text-muted-foreground">{s.total_used}</span></td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end flex-wrap">
                      {adding === s.student_id ? (
                        <div className="flex items-center gap-2">
                          <input type="number" min={1} max={10} value={amount}
                            onChange={e => setAmount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                            className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground text-center focus:outline-none focus:border-primary" />
                          <Button size="sm" onClick={() => addCredits(s.student_id, amount)} className="bg-green-600 hover:bg-green-700 text-xs h-8">Add</Button>
                          <Button size="sm" variant="outline" onClick={() => setAdding(null)} className="text-xs h-8">Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => { setAdding(s.student_id); setAmount(1); }}
                            className="gap-1 text-xs h-8 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                            <Plus className="w-3 h-3" /> Add
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => resetCredits(s.student_id, collegeStats?.credit_limit || 3)} className="gap-1 text-xs h-8">
                            <RefreshCw className="w-3 h-3" /> Reset to {collegeStats?.credit_limit || 3}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Each student starts with {collegeStats?.credit_limit || 5} credits. 1 credit is used per interview session. <br/>
          Added credits draw from the institution's master pool of {collegeStats?.total_credits || 500} credits.
        </p>
      </div>
    </div>
  );
};

export default OfficerCredits;

