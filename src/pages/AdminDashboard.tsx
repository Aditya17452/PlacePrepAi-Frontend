/**
 * Platform admin control center: colleges, token pools, platform stats and the audit log.
 * Every action here is authorised and audited by the backend.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Coins, Loader2, Users, Activity, IndianRupee } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deactivateCollege, enrollCollege, freezeCollege, getAuditLog, getPlatformStats, getTokenLogs,
  grantCollegeTokens, listColleges, revokeCollegeTokens, verifyCollegeDomain, type College,
} from "@/services/api";

const inputCls = "w-full px-3 py-2.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25";
const rupees = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

function StatsRow() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: getPlatformStats });
  const s = stats.data;
  const items = [
    { label: "Students", value: s?.total_students, icon: Users },
    { label: "Colleges", value: s?.total_colleges, icon: Building2 },
    { label: "Interviews (completed)", value: s ? `${s.total_interviews} (${s.completed_interviews})` : undefined, icon: Activity },
    { label: "Tokens outstanding / used", value: s ? `${s.tokens_outstanding} / ${s.tokens_consumed}` : undefined, icon: Coins },
    { label: "Revenue", value: s ? rupees(s.revenue_paise) : undefined, icon: IndianRupee },
    { label: "Cost / interview (₹)", value: s ? (s.cost_per_interview_inr != null ? s.cost_per_interview_inr.toFixed(2) : "—") : undefined, icon: Activity },
  ];
  if (stats.error) return <p className="text-sm text-destructive mb-6">{(stats.error as Error).message}</p>;
  return (
    <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="p-4 rounded-xl bg-card border border-border">
          <Icon className="w-4 h-4 text-primary mb-1.5" />
          <div className="text-lg font-bold text-foreground">{value ?? "…"}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

function CollegeRow({ college, onChanged }: { college: College; onChanged: (msg: string) => void }) {
  const [tokens, setTokens] = useState("");
  const [reason, setReason] = useState("");
  const [validity, setValidity] = useState("365");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const act = async (fn: () => Promise<{ message?: string | null }>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true); setErr("");
    try {
      const res = await fn();
      onChanged(res.message || "Done.");
      setTokens(""); setReason("");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const qty = parseInt(tokens, 10);
  const canMove = Number.isFinite(qty) && qty > 0 && reason.trim().length >= 3 && !busy;

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{college.name} {!college.is_active && <span className="text-xs text-red-500">(inactive)</span>} {college.distribution_frozen && <span className="text-xs text-amber-600">(frozen)</span>}</p>
          <p className="text-xs text-muted-foreground">{college.domain || "no domain"} · {college.students} students · pool {college.pool_balance} / granted {college.pool_granted} · default {college.monthly_allowance_default}/month · cap {college.daily_interview_cap}/day</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {college.domain && <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => verifyCollegeDomain(college.id), `Mark ${college.domain} as verified for ${college.name}? Only do this after confirming the college owns it.`)}>Verify domain</Button>}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => freezeCollege(college.id, !college.distribution_frozen))}>{college.distribution_frozen ? "Unfreeze" : "Freeze"}</Button>
          {college.is_active && <Button size="sm" variant="destructive" disabled={busy} onClick={() => act(() => deactivateCollege(college.id), `Deactivate ${college.name}? Its students lose access to the college pool. Data is kept.`)}>Deactivate</Button>}
        </div>
      </div>
      <div className="grid sm:grid-cols-4 gap-2">
        <input className={inputCls} type="number" min={1} placeholder="Tokens" value={tokens} onChange={(e) => setTokens(e.target.value)} />
        <input className={`${inputCls} sm:col-span-2`} placeholder="Reason (invoice no., pilot, correction…)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <input className={inputCls} type="number" min={1} placeholder="Valid days" value={validity} onChange={(e) => setValidity(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={!canMove} onClick={() => act(() => grantCollegeTokens({ college_id: college.id, tokens: qty, reason: reason.trim(), validity_days: parseInt(validity, 10) || null }), `Grant ${qty} tokens to ${college.name}?`)}>Grant tokens</Button>
        <Button size="sm" variant="outline" disabled={!canMove} onClick={() => act(() => revokeCollegeTokens({ college_id: college.id, tokens: qty, reason: reason.trim() }), `Revoke ${qty} tokens from ${college.name}?`)}>Revoke tokens</Button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

function CollegesTab() {
  const queryClient = useQueryClient();
  const colleges = useQuery({ queryKey: ["admin", "colleges"], queryFn: listColleges });
  const [form, setForm] = useState({ name: "", admin_name: "", admin_email: "", domain: "", allowance: "4", cap: "3" });
  const [msg, setMsg] = useState("");
  const enroll = useMutation({
    mutationFn: () => enrollCollege({
      name: form.name.trim(),
      admin_name: form.admin_name.trim(),
      admin_email: form.admin_email.trim(),
      domain: form.domain.trim() || null,
      monthly_allowance_default: parseInt(form.allowance, 10) || 4,
      daily_interview_cap: parseInt(form.cap, 10) || 3,
    }),
    onSuccess: (res) => {
      setMsg(res.message || "College enrolled and admin invited.");
      setForm({ name: "", admin_name: "", admin_email: "", domain: "", allowance: "4", cap: "3" });
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const changed = (m: string) => { setMsg(m); void queryClient.invalidateQueries({ queryKey: ["admin"] }); };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-card border border-border space-y-3">
        <h3 className="font-semibold text-foreground">Enroll a college</h3>
        <p className="text-xs text-muted-foreground">The college admin receives an invite code by email and sets their own password at /invite.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <input className={inputCls} placeholder="College name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} placeholder="Admin name" value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} />
          <input className={inputCls} type="email" placeholder="Admin email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} />
          <input className={inputCls} placeholder="Student email domain (optional)" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
          <input className={inputCls} type="number" min={0} placeholder="Default interviews/month" value={form.allowance} onChange={(e) => setForm({ ...form, allowance: e.target.value })} />
          <input className={inputCls} type="number" min={1} placeholder="Daily cap per student" value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value })} />
        </div>
        <Button variant="hero" disabled={enroll.isPending || !form.name || !form.admin_name || !form.admin_email} onClick={() => enroll.mutate()}>
          {enroll.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enroll college"}
        </Button>
        {enroll.error && <p className="text-xs text-destructive">{(enroll.error as Error).message}</p>}
      </div>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {colleges.isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
      {colleges.error && <p className="text-sm text-destructive">{(colleges.error as Error).message}</p>}
      <div className="space-y-3">
        {(colleges.data ?? []).map((c) => <CollegeRow key={c.id} college={c} onChanged={changed} />)}
      </div>
    </div>
  );
}

function LogsTab() {
  const audit = useQuery({ queryKey: ["admin", "audit"], queryFn: () => getAuditLog(200) });
  const tokens = useQuery({ queryKey: ["admin", "tokenlogs"], queryFn: () => getTokenLogs(200) });
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold text-foreground mb-3">Audit log</h3>
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
          {(audit.data ?? []).map((a) => (
            <div key={a.id} className="p-2.5 rounded-lg bg-card border border-border text-xs">
              <div className="flex justify-between"><span className="font-semibold">{a.action}</span><span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("en-IN")}</span></div>
              <div className="text-muted-foreground">{a.actor_role ?? "system"} → {a.target ?? "—"}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-3">Token ledger</h3>
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
          {(tokens.data ?? []).map((t) => (
            <div key={t.id} className="p-2.5 rounded-lg bg-card border border-border text-xs flex justify-between">
              <span><span className="font-semibold">{t.kind}</span> · {t.reason}</span>
              <span className={t.amount >= 0 ? "text-green-600" : "text-red-500"}>{t.amount > 0 ? `+${t.amount}` : t.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const AdminDashboard = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
      <h1 className="text-3xl font-display font-bold text-foreground mb-1">Control Center</h1>
      <p className="text-muted-foreground mb-6">Platform administration</p>
      <StatsRow />
      <Tabs defaultValue="colleges">
        <TabsList>
          <TabsTrigger value="colleges">Colleges & tokens</TabsTrigger>
          <TabsTrigger value="logs">Audit & ledger</TabsTrigger>
        </TabsList>
        <TabsContent value="colleges" className="mt-6"><CollegesTab /></TabsContent>
        <TabsContent value="logs" className="mt-6"><LogsTab /></TabsContent>
      </Tabs>
    </div>
  </div>
);

export default AdminDashboard;
