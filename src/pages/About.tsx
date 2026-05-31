import { motion } from "framer-motion";
import { Brain, Target, Users, Zap, Github, Mail, Heart } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const teamMembers = [
  { name: "PlacePrepAI Team", role: "Builders & Dreamers", avatar: "" },
];

const VALUES = [
  { icon: <Target className="w-6 h-6" />, title: "Mission", desc: "Democratize placement preparation so every student — regardless of coaching budget — gets fair practice.", color: "from-primary to-blue-600" },
  { icon: <Zap className="w-6 h-6" />, title: "Innovation", desc: "We use the latest LLM technology to create dynamic, role-specific interview questions that adapt in real time.", color: "from-purple-500 to-pink-500" },
  { icon: <Users className="w-6 h-6" />, title: "Students First", desc: "Every feature is designed around one question: does this help a student perform better in a real interview?", color: "from-green-500 to-emerald-600" },
  { icon: <Heart className="w-6 h-6" />, title: "Honest Feedback", desc: "We give honest, data-driven feedback — not empty encouragement. Real improvement requires honest assessment.", color: "from-orange-500 to-red-500" },
];

const TECH = ["FastAPI", "React", "TypeScript", "Groq LLM", "SQLite", "Framer Motion", "Whisper AI", "Python"];

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "radial-gradient(circle at 50% 50%, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-black text-foreground mb-4">
            About <span className="text-primary">PlacePrepAI</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We built PlacePrepAI because placement season is stressful enough.
            Students shouldn't have to pay â‚¹10,000 for mock interviews when AI can do it better, faster, and for free.
          </p>
        </motion.div>
      </section>

      {/* Story */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-card border border-border"
          >
            <h2 className="text-2xl font-bold text-foreground mb-4">Our Story</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                PlacePrepAI was born from a simple observation: most college students go into placement interviews unprepared — not because they lack knowledge, but because they never get to practice with real, dynamic questions.
              </p>
              <p>
                Mock interviews at colleges are often one-time events, limited to a few students, and give generic feedback. Coaching institutes charge thousands of rupees for the same thing.
              </p>
              <p>
                We built a platform where <strong className="text-foreground">any student can practice unlimited mock interviews</strong>, get AI-generated questions tailored to their resume and target role, and receive honest, detailed feedback — all without spending a rupee.
              </p>
              <p>
                The AI interviewer adapts to your answers, follows up on what you say, and evaluates you exactly like a real interviewer would. No sugar-coating. No generic questions. Real preparation.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-black text-foreground mb-2">What We Stand For</h2>
            <p className="text-muted-foreground">The principles that guide every decision we make</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VALUES.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${v.color} flex items-center justify-center text-white mb-4`}>
                  {v.icon}
                </div>
                <h3 className="font-bold text-foreground mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-black text-foreground mb-2">Built With</h2>
            <p className="text-muted-foreground mb-8">Modern, production-grade technology stack</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {TECH.map((t, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium"
                >
                  {t}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">Ready to Practice?</h2>
            <p className="text-muted-foreground mb-6">
              Join students who are using PlacePrepAI to crack their placement interviews.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/register")} className="gap-2 font-bold">
                Get Started Free <Brain className="w-4 h-4" />
              </Button>
              <Button onClick={() => navigate("/dashboard")} variant="outline">
                Dashboard
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <span>Made with</span>
          <Heart className="w-4 h-4 text-red-400" />
          <span>for students everywhere</span>
        </div>
      </footer>
    </div>
  );
};

export default About;

