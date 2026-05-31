import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Mic, Camera, Brain } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Glow background */}
      <div className="absolute inset-0 bg-glow pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm mb-8"
          >
            <Brain className="w-4 h-4" />
            AI-Powered College Placement Platform
          </motion.div>

          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            Ace Every Interview with{" "}
            <span className="text-gradient">PlacePrep AI</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Real-time AI mock interviews with voice analysis, webcam posture tracking,
            and JD-specific preparation. Built for college placement cells.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button variant="hero" size="lg" className="text-base px-8">
              Start Mock Interview <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base px-8">
              Officer Dashboard
            </Button>
          </div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {[
              { icon: Mic, label: "Voice Analysis" },
              { icon: Camera, label: "Posture Tracking" },
              { icon: Brain, label: "AI Evaluation" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground"
              >
                <item.icon className="w-4 h-4 text-primary" />
                {item.label}
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Mock UI preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="rounded-xl border border-border bg-card shadow-elevated overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="text-xs text-muted-foreground ml-2">PlacePrep AI — Interview Room</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
              <div className="p-6 border-r border-border">
                <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Live Transcript</div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-primary font-medium mb-1">AI Interviewer</p>
                    <p className="text-sm text-foreground">Tell me about your experience with React.js and how you've used it in real projects.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary">
                    <p className="text-xs text-muted-foreground font-medium mb-1">You</p>
                    <p className="text-sm text-foreground">I built a full-stack e-commerce platform using React with Redux for state management...</p>
                  </div>
                </div>
              </div>
              <div className="p-6 flex flex-col items-center justify-center border-r border-border">
                <div className="w-full aspect-video rounded-lg bg-muted/50 border border-border flex items-center justify-center mb-4">
                  <Camera className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <div className="flex gap-4 w-full">
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-display font-bold text-success">87%</div>
                    <div className="text-xs text-muted-foreground">Eye Contact</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-display font-bold text-primary">92%</div>
                    <div className="text-xs text-muted-foreground">Posture</div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Coaching Tips</div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                    <p className="text-sm text-foreground">✅ Great use of specific examples</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-sm text-foreground">💡 Try to mention the scale of your project</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;

