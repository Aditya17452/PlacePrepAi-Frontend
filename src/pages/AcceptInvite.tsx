/**
 * College admins land here from their invite email: they enter the invite code and choose
 * their own password. We never set or send passwords.
 */

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/services/api";
import { getUser, homeFor } from "@/lib/session";

const inputCls = "w-full px-4 py-3.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25";

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!code.trim()) { setError("Enter the invite code from your email."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true); setError("");
    try {
      await acceptInvite(code.trim(), password);
      navigate(homeFor(getUser()?.role ?? "college_admin"), { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Activate your college admin account</h1>
        <p className="text-sm text-muted-foreground">Enter the invite code from your email and choose a password.</p>
        {error && <div className="px-4 py-3 bg-destructive/8 border border-destructive/20 rounded-xl text-destructive text-sm">{error}</div>}
        <input className={inputCls} placeholder="Invite code" value={code} onChange={(e) => setCode(e.target.value)} />
        <input className={inputCls} type="password" placeholder="New password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input className={inputCls} type="password" placeholder="Confirm password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <Button variant="hero" className="w-full" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activate account"}
        </Button>
      </div>
    </div>
  );
};

export default AcceptInvite;
