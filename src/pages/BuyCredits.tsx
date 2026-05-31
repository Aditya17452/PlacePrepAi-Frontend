import Navbar from "@/components/layout/Navbar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Zap, Star, Check, X, Loader2 } from "lucide-react";

const PACKAGES = [
  { key: "basic",    credits: 5,  price: 100,  label: "Starter",  icon: Zap,
    features: ["5 mock interviews", "Full PDF report", "AI scoring & feedback", "No expiry"] },
  { key: "standard", credits: 12, price: 249,  label: "Standard", icon: Star,
    features: ["12 mock interviews", "Full PDF report", "AI scoring & feedback", "Priority support"], hot: true },
  { key: "pro",      credits: 25, price: 499, label: "Pro",       icon: CreditCard,
    features: ["25 mock interviews", "Full PDF report", "AI scoring & feedback", "Best value per credit"] },
];

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const BuyCredits = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(0);
  const [selectedPkg, setSelectedPkg] = useState<typeof PACKAGES[0] | null>(null);
  const [step, setStep] = useState<"confirm"|"processing"|"done">("confirm");
  const [success, setSuccess] = useState("");
  const studentId = sessionStorage.getItem("student_id") || "";

  useEffect(() => {
    if (!sessionStorage.getItem("token")) { navigate("/login"); return; }
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const res = await fetch(`${API}/credits/${studentId}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      const data = await res.json();
      setCredits(data.credits || 0);
    } catch (e) {}
  };

  const handleBuy = async () => {
    if (!selectedPkg) return;
    setStep("processing");
    await new Promise(r => setTimeout(r, 1800));
    try {
      // Intentionally removed real API call so credits aren't actually added (Demo Mode)
      setStep("done");
      setSuccess(`${selectedPkg.credits} credits purchased (Demo only)!`);
      setTimeout(() => { setSelectedPkg(null); setStep("confirm"); setSuccess(""); }, 3000);
    } catch (e) { setStep("confirm"); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-semibold mb-5">
            <CreditCard className="w-3 h-3" /> Credits
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-3">
            Buy Interview <span className="text-gradient">Credits</span>
          </h1>
          <p className="text-muted-foreground mb-6">Each credit gives you one full AI mock interview session with PDF report.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 px-5 py-3 bg-white border border-border rounded-2xl shadow-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${credits > 0 ? "bg-green-500" : "bg-red-400"} animate-pulse`} />
              <span className="text-2xl font-display font-bold text-primary">{credits}</span>
              <span className="text-sm text-muted-foreground font-medium">credits remaining</span>
            </div>
            {success && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-semibold shadow-sm">
                <Check className="w-4 h-4" /> {success}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Packages grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {PACKAGES.map((pkg, i) => (
            <motion.div key={pkg.key}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`relative bg-white rounded-3xl p-7 border transition-all cursor-pointer group
                ${pkg.hot
                  ? "border-primary shadow-glow ring-1 ring-primary/20"
                  : "border-border shadow-card hover:shadow-lg hover:border-primary/30 hover:-translate-y-1"}`}
              onClick={() => { setSelectedPkg(pkg); setStep("confirm"); }}>

              {pkg.hot && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary text-white text-xs font-bold rounded-full shadow-glow">
                  MOST POPULAR
                </div>
              )}

              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-5
                ${pkg.hot ? "bg-primary/10 border border-primary/20" : "bg-secondary border border-border"}`}>
                <pkg.icon className={`w-5 h-5 ${pkg.hot ? "text-primary" : "text-muted-foreground"}`} />
              </div>

              <div className="text-xs font-semibold text-muted-foreground mb-1 tracking-wide uppercase">{pkg.label}</div>
              <div className="text-6xl font-display font-bold text-foreground mb-1">{pkg.credits}</div>
              <div className="text-xs text-muted-foreground mb-5">interview credits</div>

              <div className="text-4xl font-display font-bold text-primary mb-1">₹{pkg.price}</div>
              <div className="text-xs text-muted-foreground mb-6">₹{(pkg.price/pkg.credits).toFixed(0)} per interview</div>

              <div className="space-y-2.5 mb-7">
                {pkg.features.map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0
                      ${pkg.hot ? "bg-primary/10" : "bg-secondary"}`}>
                      <Check className={`w-2.5 h-2.5 ${pkg.hot ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className="text-sm text-foreground/70">{f}</span>
                  </div>
                ))}
              </div>

              <button className={`w-full py-3 rounded-2xl text-sm font-semibold transition-all
                ${pkg.hot
                  ? "bg-gradient-primary text-white shadow-glow hover:opacity-90"
                  : "bg-secondary text-foreground hover:bg-primary/5 hover:text-primary border border-border"}`}>
                Buy Now →
              </button>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center max-w-sm">
          Demo mode · Credits added instantly · No real payment processed
        </p>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {selectedPkg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-elevated border border-border">

              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <div className="text-xs text-muted-foreground font-medium mb-0.5">CHECKOUT</div>
                  <div className="font-display font-bold text-foreground text-lg">{selectedPkg.label} Pack</div>
                </div>
                {step === "confirm" && (
                  <button onClick={() => setSelectedPkg(null)}
                    className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="p-6">
                {step === "confirm" && (
                  <>
                    <div className="flex justify-between items-center p-4 bg-secondary/50 border border-border rounded-2xl mb-5">
                      <div>
                        <div className="font-semibold text-foreground text-sm">{selectedPkg.credits} Interview Credits</div>
                        <div className="text-xs text-muted-foreground mt-0.5">No expiry · Instant delivery</div>
                      </div>
                      <div className="text-2xl font-display font-bold text-primary">₹{selectedPkg.price}</div>
                    </div>
                    <div className="mb-5">
                      <label className="text-xs font-semibold text-muted-foreground block mb-2">UPI ID (Demo)</label>
                      <input defaultValue="demo@upi" readOnly
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground font-mono" />
                      <p className="text-xs text-primary/70 mt-2 flex items-center gap-1">
                        <span>â“˜</span> Demo mode — no real payment processed
                      </p>
                    </div>
                    <button onClick={handleBuy}
                      className="w-full py-3.5 bg-gradient-primary text-white rounded-2xl text-sm font-bold shadow-glow hover:opacity-90 transition-all">
                      Pay ₹{selectedPkg.price} →
                    </button>
                  </>
                )}

                {step === "processing" && (
                  <div className="flex flex-col items-center py-10">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <div className="font-display font-bold text-foreground text-lg mb-1">Processing Payment</div>
                    <div className="text-sm text-muted-foreground">Adding {selectedPkg.credits} credits to your account...</div>
                  </div>
                )}

                {step === "done" && (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mb-5">
                      <Check className="w-7 h-7 text-green-600" />
                    </div>
                    <div className="font-display font-bold text-foreground text-xl mb-1">Payment Successful!</div>
                    <div className="text-sm text-muted-foreground mb-5">{selectedPkg.credits} credits purchased (Demo Mode)</div>
                    <div className="text-5xl font-display font-bold text-primary">{credits}</div>
                    <div className="text-xs text-muted-foreground mt-1">total credits now</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BuyCredits;

