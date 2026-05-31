import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Users, FileSpreadsheet, BarChart3, Download, Zap, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { getStudents, generateShortlist, ShortlistCandidate } from "@/services/api";

interface Student {
  id: string;
  name: string;
  email: string;
  branch: string;
  cgpa: number;
  skills: string[];
  latest_session?: {
    id: string;
    company: string;
    role: string;
    created_at: string;
  } | null;
  latest_scores?: {
    technical_score: number | null;
    communication_score: number | null;
    body_language_score: number | null;
    overall_score: number | null;
  } | null;
}

const OfficerDashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [shortlist, setShortlist] = useState<ShortlistCandidate[]>([]);
  const [selectedJdId, setSelectedJdId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [activeJDs, setActiveJDs] = useState([
    { company: "Google", role: "SDE Intern", students: 0, shortlisted: 0, status: "Ready", jdId: "google-sde" },
    { company: "Microsoft", role: "SWE Intern", students: 0, shortlisted: 0, status: "Pending", jdId: "microsoft-swe" },
    { company: "Flipkart", role: "Backend Dev", students: 0, shortlisted: 0, status: "Ready", jdId: "flipkart-backend" },
  ]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const result = await getStudents();
      setStudents(result.students || []);
      
      // Update JD stats based on actual student data
      const updatedJDs = activeJDs.map(jd => {
        const studentsWithSessions = result.students.filter(s => 
          s.latest_session && s.latest_session.company && s.latest_session.company.toLowerCase().includes(jd.company.toLowerCase())
        );
        return {
          ...jd,
          students: studentsWithSessions.length,
          shortlisted: studentsWithSessions.filter(s => s.latest_scores?.overall_score && s.latest_scores.overall_score > 75).length
        };
      });
      setActiveJDs(updatedJDs);
    } catch (err) {
      console.error(err);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateShortlist = async (jdId: string) => {
    setSelectedJdId(jdId);
    setGenerating(true);
    setError("");
    setShortlist([]);
    
    try {
      const result = await generateShortlist(jdId);
      setShortlist(result);
      
      // Update JD status
      setActiveJDs(prev => prev.map(jd => 
        jd.jdId === jdId ? { ...jd, shortlisted: result.length, status: "Ready" } : jd
      ));
    } catch (err) {
      console.error(err);
      setError("Failed to generate shortlist");
    } finally {
      setGenerating(false);
    }
  };

  const exportCSV = () => {
    if (shortlist.length === 0) return;
    
    const headers = ["Rank", "Name", "Match Score", "CGPA", "Technical Score", "Communication Score", "Reasoning"];
    const rows = shortlist.map(s => [
      s.rank,
      s.name,
      `${s.matchScore}%`,
      s.cgpa,
      s.technicalScore || "N/A",
      s.communicationScore || "N/A",
      s.reasoning
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shortlist_${selectedJdId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getAverageScore = () => {
    if (students.length === 0) return 0;
    const total = students.reduce((sum, s) => sum + (s.latest_scores?.overall_score || 0), 0);
    return Math.round(total / students.length);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Placement Officer Dashboard</h1>
            <p className="text-muted-foreground">Manage JDs, view student performance, and generate AI shortlists.</p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Users, label: "Total Students", value: students.length.toString(), color: "text-primary" },
              { icon: FileSpreadsheet, label: "Active JDs", value: activeJDs.length.toString(), color: "text-accent" },
              { icon: BarChart3, label: "Avg Score", value: `${getAverageScore()}%`, color: "text-success" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl bg-card border border-border"
              >
                <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Active JDs */}
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">Active Job Descriptions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {activeJDs.map((jd, i) => (
              <motion.div
                key={jd.company}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="p-5 rounded-xl bg-card border border-border"
              >
                <h3 className="font-display font-semibold text-foreground">{jd.company}</h3>
                <p className="text-sm text-muted-foreground mb-3">{jd.role}</p>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>{jd.students} students</span>
                  <span>{jd.shortlisted > 0 ? `${jd.shortlisted} shortlisted` : "Not generated"}</span>
                </div>
                <Progress value={(jd.shortlisted / Math.max(1, jd.students)) * 100} className="h-1.5 mb-4" />
                <div className="flex gap-2">
                  <Button 
                    variant="hero" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleGenerateShortlist(jd.jdId)}
                    disabled={generating && selectedJdId === jd.jdId}
                  >
                    {generating && selectedJdId === jd.jdId ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 mr-1" /> Generate Shortlist
                      </>
                    )}
                  </Button>
                  {jd.shortlisted > 0 && (
                    <Button variant="hero-outline" size="sm" onClick={exportCSV}>
                      <Download className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Student Table */}
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">Student Overview</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-card border border-border overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Name</th>
                      <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Branch</th>
                      <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">CGPA</th>
                      <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Technical</th>
                      <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Communication</th>
                      <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Overall</th>
                      <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                        <td className="p-4 font-medium text-foreground">{student.name}</td>
                        <td className="p-4 text-sm text-muted-foreground">{student.branch}</td>
                        <td className="p-4 text-sm text-foreground">{student.cgpa}</td>
                        <td className="p-4 text-sm text-foreground">
                          {student.latest_scores?.technical_score || "N/A"}
                        </td>
                        <td className="p-4 text-sm text-foreground">
                          {student.latest_scores?.communication_score || "N/A"}
                        </td>
                        <td className="p-4">
                          <span className={`font-display font-bold ${
                            (student.latest_scores?.overall_score || 0) >= 80 ? "text-success" :
                            (student.latest_scores?.overall_score || 0) >= 60 ? "text-warning" : "text-destructive"
                          }`}>
                            {student.latest_scores?.overall_score || "N/A"}%
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {student.latest_session ? "Active" : "No Interview"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Shortlist Results */}
          {shortlist.length > 0 && (
            <>
              <h2 className="font-display text-xl font-semibold text-foreground mb-4 mt-10">
                {activeJDs.find(jd => jd.jdId === selectedJdId)?.company} — {activeJDs.find(jd => jd.jdId === selectedJdId)?.role} Shortlist
              </h2>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-xl bg-card border border-border overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Rank</th>
                        <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Student</th>
                        <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Match</th>
                        <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">CGPA</th>
                        <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Technical</th>
                        <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">Communication</th>
                        <th className="text-left p-4 text-xs text-muted-foreground uppercase tracking-wider">AI Reasoning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shortlist.map((s) => (
                        <tr key={s.rank} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                          <td className="p-4">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              s.rank <= 3 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                            }`}>
                              {s.rank}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-foreground">{s.name}</td>
                          <td className="p-4">
                            <span className="font-display font-bold text-success">{s.matchScore}%</span>
                          </td>
                          <td className="p-4 text-foreground">{s.cgpa}</td>
                          <td className="p-4 text-foreground">{s.technicalScore || "N/A"}</td>
                          <td className="p-4 text-foreground">{s.communicationScore || "N/A"}</td>
                          <td className="p-4 text-sm text-muted-foreground">{s.reasoning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-border flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    {shortlist.length} candidates shortlisted
                  </div>
                  <Button variant="hero" size="sm" onClick={exportCSV}>
                    <Download className="w-4 h-4 mr-1" /> Export as CSV
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;
