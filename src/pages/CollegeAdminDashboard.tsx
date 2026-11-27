/**
 * College admin console.
 *
 * Scope is enforced by the backend: every call returns only this admin's college. A
 * college admin manages the roster and distributes allowance from the pool; they can
 * never create tokens.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Users, Coins, ShieldCheck, Search } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseCsv } from "@/lib/csv";
import {
  createAllowanceGroup, createAllowanceOverride, decideEnrollmentRequest, getCollegeStudents,
  getEnrollmentRequests, getMyCollege, getStudentHistory, uploadRoster,
  type AllowanceGroupRequest, type RosterRow, type SessionHistoryItem, type StudentSummary,
} from "@/services/api";

const inputCls = "w-full px-3 py-2.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25";

const Stat = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) => (
  <div className="p-5 rounded-xl bg-card border border-border">
    <Icon className="w-5 h-5 text-primary mb-2" />
    <div className="text-2xl font-bold text-foreground">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);

function StudentsTab() {
  const navigate = useNavigate();
  const students = useQuery({ queryKey: ["college", "students"], queryFn: getCollegeStudents });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, SessionHistoryItem[]>>({});

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (students.data ?? []).filter((s) => !term || s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term) || (s.branch ?? "").toLowerCase().includes(term));
  }, [students.data, q]);

  const toggle = async (s: StudentSummary) => {
    if (open === s.id) { setOpen(null); return; }
    setOpen(s.id);
    if (!history[s.id]) {
      try {
        const items = await getStudentHistory(s.id);
        setHistory((h) => ({ ...h, [s.id]: items }));
      } catch { setHistory((h) => ({ ...h, [s.id]: [] })); }
    }
  };

  const exportCsv = () => {
    const rows = [["name", "email", "branch", "cgpa", "interviews", "latest_score", "latest_integrity", "allowance_remaining"],
      ...filtered.map((s) => [s.name, s.email, s.branch ?? "", s.cgpa ?? "", s.interviews_taken ?? 0, s.latest_score ?? "", s.latest_integrity ?? "", s.allowance_remaining ?? ""])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "students.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (students.isLoading) return <Loader2 className="w-6 h-6 animate-spin text-primary" />;
  if (students.error) return <p className="text-sm text-destructive">{(students.error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={`${inputCls} pl-9`} placeholder="Search name, email or branch" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>Export CSV</Button>
      </div>
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No students yet. Upload your roster to let students join.</p>}
      <div className="space-y-2">
        {filtered.map((s) => (
          <div key={s.id} className="rounded-xl bg-card border border-border">
            <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => toggle(s)}>
              <div>
                <p className="font-medium text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.email}{s.branch ? ` · ${s.branch}` : ""}{s.cgpa != null ? ` · CGPA ${s.cgpa}` : ""}</p>
              </div>
              <div className="flex gap-4 text-xs text-right">
                <div><div className="font-bold text-foreground">{s.interviews_taken ?? 0}</div><div className="text-muted-foreground">interviews</div></div>
                <div><div className="font-bold text-foreground">{s.latest_score != null ? Math.round(s.latest_score) : "—"}</div><div className="text-muted-foreground">latest score</div></div>
                <div><div className="font-bold text-foreground">{s.latest_integrity != null ? Math.round(s.latest_integrity) : "—"}</div><div className="text-muted-foreground">integrity</div></div>
                <div><div className="font-bold text-foreground">{s.allowance_remaining ?? "—"}</div><div className="text-muted-foreground">quota left</div></div>
              </div>
            </button>
            {open === s.id && (
              <div className="border-t border-border p-4 space-y-2">
                {!history[s.id] && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                {history[s.id]?.length === 0 && <p className="text-xs text-muted-foreground">No interviews yet.</p>}
                {history[s.id]?.map((h) => (
                  <div key={h.id} className="flex justify-between items-center text-sm">
                    <span>{h.company} — {h.role} <span className="text-muted-foreground text-xs">· {h.date}</span></span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold">{h.score != null ? `${Math.round(h.score)}%` : h.status}</span>
                      <Button size="sm" variant="hero-outline" onClick={() => navigate(`/report?session=${encodeURIComponent(h.id)}`)}>Report</Button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RosterTab() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [replace, setReplace] = useState(false);
  const [parseError, setParseError] = useState("");
  const upload = useMutation({
    mutationFn: () => uploadRoster(rows, replace),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["college"] }); },
  });
  const requests = useQuery({ queryKey: ["college", "requests"], queryFn: getEnrollmentRequests });
  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => decideEnrollmentRequest(id, approve),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["college"] }); },
  });

  const onFile = async (file: File | undefined) => {
    setParseError(""); upload.reset();
    if (!file) return;
    setFileName(file.name);
    const parsed = parseCsv(await file.text());
    const mapped: RosterRow[] = parsed.map((r) => ({
      enrollment_no: r.enrollment_no || r.enrollment || r.roll_no || null,
      name: r.name || null,
      batch: r.batch || null,
      branch: r.branch || null,
      email: r.email || null,
      phone: r.phone || r.mobile || null,
      valid_until: r.valid_until || null,
    })).filter((r) => r.email || r.phone);
    if (mapped.length === 0) setParseError("No rows with an email or phone were found. Check the column headers.");
    setRows(mapped);
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-card border border-border space-y-3">
        <h3 className="font-semibold text-foreground">Upload student roster</h3>
        <p className="text-xs text-muted-foreground">
          CSV columns: <code>enrollment_no, name, batch, branch, email, phone, valid_until</code> (YYYY-MM-DD).
          A student can join your college only if their verified email or mobile matches a roster row.
        </p>
        <label className="flex items-center gap-2 text-sm cursor-pointer w-fit px-4 py-2 rounded-xl border border-border hover:bg-secondary">
          <Upload className="w-4 h-4" /> {fileName || "Choose CSV file"}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
        {parseError && <p className="text-xs text-destructive">{parseError}</p>}
        {rows.length > 0 && <p className="text-sm text-foreground">{rows.length} students ready to upload.</p>}
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
          Replace existing roster (students not in this file lose college access)
        </label>
        <Button variant="hero" disabled={rows.length === 0 || upload.isPending} onClick={() => upload.mutate()}>
          {upload.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload roster"}
        </Button>
        {upload.data && (
          <p className="text-sm text-green-600">
            Created {upload.data.created}, updated {upload.data.updated}, deactivated {upload.data.deactivated}
            {upload.data.skipped.length > 0 ? `, skipped ${upload.data.skipped.length}` : ""}.
          </p>
        )}
        {upload.error && <p className="text-sm text-destructive">{(upload.error as Error).message}</p>}
      </div>

      <div className="p-5 rounded-xl bg-card border border-border space-y-3">
        <h3 className="font-semibold text-foreground">Join requests</h3>
        {requests.isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        {(requests.data ?? []).length === 0 && !requests.isLoading && <p className="text-xs text-muted-foreground">No pending requests.</p>}
        {(requests.data ?? []).map((r) => {
          const id = String(r.id ?? "");
          return (
            <div key={id} className="flex items-center justify-between text-sm">
              <span>{String(r.name ?? r.student_name ?? "")} <span className="text-muted-foreground text-xs">{String(r.email ?? "")}</span></span>
              <span className="flex gap-2">
                <Button size="sm" onClick={() => decide.mutate({ id, approve: true })} disabled={decide.isPending}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => decide.mutate({ id, approve: false })} disabled={decide.isPending}>Reject</Button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AllowanceTab({ defaultAllowance, frozen }: { defaultAllowance: number; frozen: boolean }) {
  const queryClient = useQueryClient();
  const students = useQuery({ queryKey: ["college", "students"], queryFn: getCollegeStudents });
  const [group, setGroup] = useState({ name: "", allowance: String(defaultAllowance || 4), period: "month" as "month" | "term", batch: "", branch: "", validUntil: "" });
  const [override, setOverride] = useState({ studentId: "", extra: "2", kind: "topup" as "topup" | "drive", reason: "", label: "", validUntil: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const run = async (fn: () => Promise<{ message?: string | null }>) => {
    setMsg(""); setErr("");
    try {
      const res = await fn();
      setMsg(res.message || "Saved.");
      void queryClient.invalidateQueries({ queryKey: ["college"] });
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className="space-y-6">
      {frozen && <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700">Distribution is frozen by the platform admin. Changes are disabled.</p>}
      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="p-5 rounded-xl bg-card border border-border space-y-3">
        <h3 className="font-semibold text-foreground">Allowance group</h3>
        <p className="text-xs text-muted-foreground">Sets how many interviews each matching student can take from the college pool. Tokens are deducted only when used.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Group name, e.g. Final year CSE 2027" value={group.name} onChange={(e) => setGroup({ ...group, name: e.target.value })} />
          <input className={inputCls} type="number" min={0} placeholder="Interviews per student" value={group.allowance} onChange={(e) => setGroup({ ...group, allowance: e.target.value })} />
          <select className={inputCls} value={group.period} onChange={(e) => setGroup({ ...group, period: e.target.value as "month" | "term" })}>
            <option value="month">Per month</option>
            <option value="term">Per term</option>
          </select>
          <input className={inputCls} type="date" value={group.validUntil} onChange={(e) => setGroup({ ...group, validUntil: e.target.value })} />
          <input className={inputCls} placeholder="Batch filter (optional), e.g. 2027" value={group.batch} onChange={(e) => setGroup({ ...group, batch: e.target.value })} />
          <input className={inputCls} placeholder="Branch filter (optional), e.g. CSE" value={group.branch} onChange={(e) => setGroup({ ...group, branch: e.target.value })} />
        </div>
        <Button disabled={frozen || !group.name.trim()} onClick={() => run(() => createAllowanceGroup({
          name: group.name.trim(),
          per_student_allowance: Math.max(0, parseInt(group.allowance, 10) || 0),
          period: group.period,
          filters: { ...(group.batch ? { batch: group.batch } : {}), ...(group.branch ? { branch: group.branch } : {}) } as unknown as AllowanceGroupRequest["filters"],
          valid_until: group.validUntil || null,
        }))}>Save group</Button>
      </div>

      <div className="p-5 rounded-xl bg-card border border-border space-y-3">
        <h3 className="font-semibold text-foreground">Extra allowance for one student</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <select className={inputCls} value={override.studentId} onChange={(e) => setOverride({ ...override, studentId: e.target.value })}>
            <option value="">Select student</option>
            {(students.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
          </select>
          <input className={inputCls} type="number" min={1} value={override.extra} onChange={(e) => setOverride({ ...override, extra: e.target.value })} />
          <select className={inputCls} value={override.kind} onChange={(e) => setOverride({ ...override, kind: e.target.value as "topup" | "drive" })}>
            <option value="topup">Top-up</option>
            <option value="drive">Company drive</option>
          </select>
          <input className={inputCls} type="date" value={override.validUntil} onChange={(e) => setOverride({ ...override, validUntil: e.target.value })} />
          <input className={inputCls} placeholder="Label, e.g. TCS drive prep" value={override.label} onChange={(e) => setOverride({ ...override, label: e.target.value })} />
          <input className={inputCls} placeholder="Reason (required)" value={override.reason} onChange={(e) => setOverride({ ...override, reason: e.target.value })} />
        </div>
        <Button disabled={frozen || !override.studentId || !override.reason.trim()} onClick={() => run(() => createAllowanceOverride({
          student_id: override.studentId,
          extra_allowance: Math.max(1, parseInt(override.extra, 10) || 1),
          kind: override.kind,
          reason: override.reason.trim(),
          label: override.label.trim() || null,
          valid_until: override.validUntil || null,
        }))}>Give extra allowance</Button>
      </div>
    </div>
  );
}

const CollegeAdminDashboard = () => {
  const college = useQuery({ queryKey: ["college", "me"], queryFn: getMyCollege });
  const c = college.data;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-3xl font-display font-bold text-foreground mb-1">{c?.name ?? "College"}</h1>
        <p className="text-muted-foreground mb-6">Placement cell console</p>
        {college.error && <p className="text-sm text-destructive mb-4">{(college.error as Error).message}</p>}

        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          <Stat label="Students enrolled" value={c?.students ?? "…"} icon={Users} />
          <Stat label="Tokens in pool" value={c?.pool_balance ?? "…"} icon={Coins} />
          <Stat label="Tokens granted" value={c?.pool_granted ?? "…"} icon={Coins} />
          <Stat label="Daily cap / student" value={c?.daily_interview_cap ?? "…"} icon={ShieldCheck} />
        </div>
        {c && c.pool_granted > 0 && c.pool_balance / c.pool_granted < 0.1 && (
          <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 mb-6">
            Your token pool is below 10%. Contact PlacePrep AI to top it up.
          </p>
        )}

        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">Students & reports</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="allowance">Allowance</TabsTrigger>
          </TabsList>
          <TabsContent value="students" className="mt-6"><StudentsTab /></TabsContent>
          <TabsContent value="roster" className="mt-6"><RosterTab /></TabsContent>
          <TabsContent value="allowance" className="mt-6">
            <AllowanceTab defaultAllowance={c?.monthly_allowance_default ?? 4} frozen={Boolean(c?.distribution_frozen)} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CollegeAdminDashboard;
