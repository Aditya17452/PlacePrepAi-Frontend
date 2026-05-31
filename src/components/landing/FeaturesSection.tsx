import { motion } from "framer-motion";
import { Mic, Camera, FileText, Brain, BarChart3, Users } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Interview Agent",
    description: "Powered by Claude, asks JD-specific questions with real-time follow-ups based on your answers.",
  },
  {
    icon: Mic,
    title: "Voice Analysis",
    description: "Whisper API transcribes your speech live, analyzing pace, filler words, and confidence tone.",
  },
  {
    icon: Camera,
    title: "Posture & Eye Contact",
    description: "MediaPipe tracks your webcam feed in real-time, scoring body language throughout the session.",
  },
  {
    icon: FileText,
    title: "Resume-JD Matching",
    description: "Upload your resume and get AI-ranked job description suggestions with skill gap analysis.",
  },
  {
    icon: BarChart3,
    title: "Detailed Reports",
    description: "Get scored breakdowns on technical accuracy, communication, and body language with improvement tips.",
  },
  {
    icon: Users,
    title: "Officer Shortlisting",
    description: "Placement officers generate AI-ranked candidate shortlists per company with one click.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-surface pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Everything You Need to <span className="text-gradient">Ace Placements</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Three AI agents, real-time analysis, and automated shortlisting — all running on your college infrastructure.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-glow"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

