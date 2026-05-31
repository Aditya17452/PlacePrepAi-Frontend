import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, CreditCard, User, Menu, X, Mail, BookOpen, Award, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { getMe } from "@/services/api";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const handleOpenProfile = async (open: boolean) => {
    setProfileOpen(open);
    if (open && !profileData) {
      setLoadingProfile(true);
      try {
        const data = await getMe();
        setProfileData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProfile(false);
      }
    }
  };

  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role");
  const name = sessionStorage.getItem("student_name") || sessionStorage.getItem("name") || "";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logout = () => { sessionStorage.clear(); navigate("/"); };

  const isActive = (path: string) => location.pathname === path;

  const navLink = (label: string, path: string) => (
    <button key={path} onClick={() => { navigate(path); setMobileOpen(false); }}
      className={`relative text-sm font-medium transition-colors px-1 py-0.5
        ${isActive(path) ? "text-primary" : "text-foreground/60 hover:text-foreground"}`}>
      {label}
      {isActive(path) && (
        <motion.div layoutId="nav-indicator"
          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-primary rounded-full" />
      )}
    </button>
  );

  const guestLinks = [
    { label: "How It Works", path: "/#how-it-works" },
    { label: "About", path: "/about" },
    { label: "Contact", path: "/contact" },
  ];
  const studentLinks = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Buy Credits", path: "/buy-credits" },
    { label: "Contact", path: "/contact" },
  ];
  const officerLinks = [
    { label: "Students", path: "/officer" },
    { label: "Credits", path: "/officer/credits" },
    { label: "Contact", path: "/contact" },
  ];
  const superAdminLinks = [
    { label: "Control Center", path: "/super-admin" },
    { label: "Contact", path: "/contact" },
  ];

  const links =
    !token          ? guestLinks :
    role === "super_admin"                        ? superAdminLinks :
    role === "officer" || role === "admin"        ? officerLinks :
    studentLinks;

  return (
    <>
      <motion.nav
        initial={{ y: -80 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled ? "bg-white/90 backdrop-blur-xl shadow-md border-b border-border" : "bg-white/60 backdrop-blur-md"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-sm font-display">P</span>
            </div>
            <span className="font-display font-bold text-foreground text-lg tracking-tight">PlacePrep <span className="text-gradient">AI</span></span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            {links.map(l => navLink(l.label, l.path))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {!token ? (
              <>
                <button onClick={() => navigate("/login")}
                  className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors px-4 py-2 rounded-xl hover:bg-secondary">
                  Sign In
                </button>
                <button onClick={() => navigate("/register")}
                  className="text-sm font-semibold bg-gradient-primary text-white px-5 py-2.5 rounded-xl shadow-glow hover:opacity-90 transition-opacity">
                  Get Started →
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {role === "student" && (
                  <button onClick={() => navigate("/buy-credits")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/8 border border-primary/15 text-primary text-xs font-medium hover:bg-primary/15 transition-colors">
                    <CreditCard className="w-3.5 h-3.5" /> Credits
                  </button>
                )}
                <Dialog.Root open={profileOpen} onOpenChange={handleOpenProfile}>
                  <Dialog.Trigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border hover:bg-secondary/80 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{name?.[0]?.toUpperCase() || "U"}</span>
                      </div>
                      <span className="text-sm text-foreground font-medium max-w-[96px] truncate">{name}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    </button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-card p-6 shadow-xl border border-border animate-in fade-in zoom-in-95">
                      <div className="flex justify-between items-center mb-5">
                        <Dialog.Title className="text-lg font-bold">Student Profile</Dialog.Title>
                        <Dialog.Close asChild>
                          <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
                        </Dialog.Close>
                      </div>
                      
                      {loadingProfile ? (
                        <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                      ) : profileData ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border">
                            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xl font-bold">
                              {profileData.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-foreground">{profileData.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Mail className="w-3 h-3"/> {profileData.email}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl border border-border bg-card">
                              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3"/> Branch</div>
                              <div className="font-semibold text-sm">{profileData.branch}</div>
                            </div>
                            <div className="p-3 rounded-xl border border-border bg-card">
                              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Award className="w-3 h-3"/> CGPA</div>
                              <div className="font-semibold text-sm">{profileData.cgpa}</div>
                            </div>
                          </div>
                          
                          <div className="p-4 rounded-xl border border-border bg-card flex justify-between items-center">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3"/> Credits</div>
                              <div className="font-bold text-lg text-primary">{profileData.credits} <span className="text-xs text-muted-foreground font-normal">remaining</span></div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground mb-1">Total Used</div>
                              <div className="font-semibold text-sm">{profileData.total_used}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-sm text-red-400">Failed to load profile</div>
                      )}
                      
                      <div className="mt-6 pt-4 border-t border-border">
                        <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors">
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>

              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(o => !o)} className="md:hidden p-2 rounded-xl hover:bg-secondary transition-colors">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-border shadow-lg md:hidden">
            <div className="px-6 py-4 flex flex-col gap-1">
              {links.map(l => (
                <button key={l.path} onClick={() => { navigate(l.path); setMobileOpen(false); }}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors
                    ${isActive(l.path) ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-secondary hover:text-foreground"}`}>
                  {l.label}
                </button>
              ))}
              {!token ? (
                <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                  <button onClick={() => { navigate("/login"); setMobileOpen(false); }}
                    className="flex-1 py-2.5 text-sm font-medium border border-border rounded-xl hover:bg-secondary transition-colors">Sign In</button>
                  <button onClick={() => { navigate("/register"); setMobileOpen(false); }}
                    className="flex-1 py-2.5 text-sm font-semibold bg-gradient-primary text-white rounded-xl">Get Started</button>
                </div>
              ) : (
                <button onClick={logout} className="flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/5 rounded-xl mt-2">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;

