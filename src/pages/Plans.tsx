/**
 * Plans & tokens.
 *
 * Payment flow:
 *   1. POST /payments/create-order with only the plan code (price comes from the server).
 *   2. Razorpay Checkout collects the payment.
 *   3. Tokens are granted ONLY by the backend's signature-verified webhook. The browser
 *      never claims a payment succeeded; it polls GET /payments/status/{order_id}.
 */

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, CreditCard, Loader2, Sparkles, XCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import {
  createOrder, getMe, getPaymentHistory, getPaymentStatus, getPlans, getWallet,
  type Plan, type PaymentStatus,
} from "@/services/api";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const STATUS_POLL_MS = 2500;
const STATUS_MAX_POLLS = 48; // ~2 minutes

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: unknown) => void) => void };
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment window. Check your connection and try again."));
    if (!existing) document.body.appendChild(script);
  });
}

const rupees = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

const Plans = () => {
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ["plans"], queryFn: getPlans });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: getWallet });
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const history = useQuery({ queryKey: ["payments"], queryFn: getPaymentHistory });

  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PaymentStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(pollRef.current), []);

  const refreshBalances = () => {
    void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    void queryClient.invalidateQueries({ queryKey: ["me"] });
    void queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  const pollStatus = (orderId: string, attempt = 0) => {
    getPaymentStatus(orderId)
      .then((status) => {
        setResult(status);
        if (status.status === "created" && attempt < STATUS_MAX_POLLS) {
          pollRef.current = setTimeout(() => pollStatus(orderId, attempt + 1), STATUS_POLL_MS);
          return;
        }
        refreshBalances();
      })
      .catch(() => {
        if (attempt < STATUS_MAX_POLLS) pollRef.current = setTimeout(() => pollStatus(orderId, attempt + 1), STATUS_POLL_MS);
      });
  };

  const buy = async (plan: Plan) => {
    setError("");
    setResult(null);
    if (plan.requires_phone_verification && me.data && !me.data.phone_verified) {
      setError("Verify your mobile number first (Profile → Verify).");
      return;
    }
    setBuying(plan.code);
    try {
      await loadCheckout();
      const order = await createOrder(plan.code);
      if (!window.Razorpay) throw new Error("Payment window unavailable.");
      const checkout = new window.Razorpay({
        key: order.razorpay_key_id,
        order_id: order.order_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: "PlacePrep AI",
        description: `${order.plan.name} — ${order.plan.tokens} interview tokens`,
        prefill: { name: me.data?.name ?? "", email: me.data?.email ?? "" },
        theme: { color: "#6366f1" },
        handler: () => {
          // Do not trust this callback for crediting; wait for the webhook to land.
          setResult({ order_id: order.order_id, status: "created", tokens_granted: 0, message: "Confirming your payment..." });
          pollStatus(order.order_id);
        },
        modal: {
          ondismiss: () => {
            setBuying(null);
            // A UPI payment can complete after the window closes, so check once.
            pollStatus(order.order_id, STATUS_MAX_POLLS - 3);
          },
        },
      });
      checkout.on("payment.failed", () => {
        setResult({ order_id: order.order_id, status: "failed", tokens_granted: 0, message: "That payment did not go through. You have not been charged." });
      });
      checkout.open();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBuying(null);
    }
  };

  const w = wallet.data;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Interview tokens</h1>
        <p className="text-muted-foreground mb-8">One token = one full AI mock interview. Prices include GST.</p>

        {/* Balance */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="text-sm text-muted-foreground mb-1">Available now</div>
            <div className="text-3xl font-black text-foreground">{w ? w.total_available : "…"}</div>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="text-sm text-muted-foreground mb-1">Personal tokens</div>
            <div className="text-2xl font-bold text-foreground">{w ? w.personal_balance : "…"}</div>
            {w?.next_expiry && (
              <div className="text-xs text-muted-foreground mt-1">
                {w.next_expiry_qty} expire on {new Date(w.next_expiry).toLocaleDateString("en-IN")}
              </div>
            )}
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="text-sm text-muted-foreground mb-1">College quota left</div>
            <div className="text-2xl font-bold text-foreground">{w ? (w.college_allowance_remaining ?? "—") : "…"}</div>
            {w && w.college_allowance_remaining == null && <div className="text-xs text-muted-foreground mt-1">Not linked to a college</div>}
          </div>
        </div>

        {/* Payment result */}
        {result && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 text-sm
            ${result.status === "captured" ? "bg-green-500/10 border-green-500/30 text-green-700"
              : result.status === "failed" ? "bg-red-500/10 border-red-500/30 text-red-600"
              : "bg-primary/5 border-primary/20 text-foreground"}`}>
            {result.status === "captured" ? <CheckCircle className="w-5 h-5" /> : result.status === "failed" ? <XCircle className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
            <span>{result.message}</span>
          </div>
        )}
        {error && <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-600 text-sm mb-6">{error}</div>}

        {/* Plans */}
        {plans.isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        {plans.error && <p className="text-sm text-destructive">{(plans.error as Error).message}</p>}
        <div className="grid md:grid-cols-3 gap-5">
          {(plans.data ?? []).map((plan) => (
            <div key={plan.code}
              className={`relative p-6 rounded-2xl border bg-card flex flex-col ${plan.is_recommended ? "border-primary shadow-glow" : "border-border"}`}>
              {plan.is_recommended && (
                <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-primary text-white text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Recommended
                </span>
              )}
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              <div className="text-3xl font-black text-foreground mt-2">{rupees(plan.price_paise)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {plan.tokens} interviews · {rupees(Math.round(plan.price_paise / Math.max(plan.tokens, 1)))} each
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
                <Clock className="w-3.5 h-3.5" /> {plan.validity_days ? `Valid ${plan.validity_days} days` : "No expiry"}
              </div>
              <Button className="mt-6" variant={plan.is_recommended ? "hero" : "hero-outline"} disabled={buying !== null} onClick={() => buy(plan)}>
                {buying === plan.code ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4 mr-1" /> Buy</>}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Payments are processed securely by Razorpay. Tokens are added once the payment is confirmed, usually within seconds.
          See our refund policy on the Contact page.
        </p>

        {/* History */}
        {(history.data?.length ?? 0) > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-foreground mb-3">Payment history</h2>
            <div className="space-y-2">
              {history.data!.map((p) => (
                <div key={p.order_id} className="flex justify-between items-center p-3 rounded-xl bg-card border border-border text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{p.order_id}</span>
                  <span className="text-foreground">{p.message}</span>
                  <span className={`text-xs font-semibold ${p.status === "captured" ? "text-green-600" : p.status === "failed" ? "text-red-500" : "text-muted-foreground"}`}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;
