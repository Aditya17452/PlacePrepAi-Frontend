/**
 * Email and phone verification.
 *
 * Email verification is required to use the account. Phone verification unlocks the
 * one-time free interviews for direct students (one free grant per phone number).
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Loader2, Mail, Smartphone } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { getMe, sendOtp, verifyOtp } from "@/services/api";
import { homeFor, getUser } from "@/lib/session";

type Channel = "email" | "phone";

function ChannelCard({
  channel, verified, destinationLabel, onVerified,
}: { channel: Channel; verified: boolean; destinationLabel: string; onVerified: () => void }) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const Icon = channel === "email" ? Mail : Smartphone;

  const send = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const res = await sendOtp(channel, channel === "phone" ? phone.trim() || undefined : undefined);
      setSent(true);
      setMessage(res.message || `We sent a 6-digit code to your ${channel}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { setError("Enter the 6-digit code."); return; }
    setBusy(true); setError("");
    try {
      await verifyOtp(channel, code);
      onVerified();
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Icon className="w-4 h-4 text-primary" /> {channel === "email" ? "Email" : "Mobile number"}
        </div>
        {verified && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="w-4 h-4" /> Verified</span>}
      </div>
      {verified ? (
        <p className="text-sm text-muted-foreground">{destinationLabel}</p>
      ) : (
        <div className="space-y-3">
          {channel === "phone" && !sent && (
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210 (leave blank to use the one you registered)"
              className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25" />
          )}
          {sent && (
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code"
              className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary/25" />
          )}
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            {sent ? (
              <>
                <Button size="sm" onClick={verify} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}</Button>
                <Button size="sm" variant="outline" onClick={send} disabled={busy}>Resend</Button>
              </>
            ) : (
              <Button size="sm" onClick={send} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send code"}</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const Verify = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me, isLoading, error } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["me"] });
  const home = homeFor(getUser()?.role ?? "student");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-12 space-y-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Verify your account</h1>
        <p className="text-sm text-muted-foreground">
          Verifying your email secures your account. Verifying your mobile number unlocks your free interviews
          (one free trial per number).
        </p>
        {isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
        {me && (
          <>
            <ChannelCard channel="email" verified={me.email_verified} destinationLabel={me.email} onVerified={refresh} />
            <ChannelCard channel="phone" verified={me.phone_verified} destinationLabel="Mobile number verified" onVerified={refresh} />
            <Button variant="hero" className="w-full" disabled={!me.email_verified} onClick={() => navigate(home)}>
              {me.email_verified ? "Continue" : "Verify your email to continue"}
            </Button>
            {me.email_verified && !me.phone_verified && (
              <p className="text-xs text-center text-muted-foreground">You can verify your phone later from your profile.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Verify;
