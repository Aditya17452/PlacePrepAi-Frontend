import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { RequireAuth } from "@/app/RequireAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import ChatBot from "./components/ChatBot";

// Route-level code splitting: the interview room, reports and admin consoles load on demand.
const Verify = lazy(() => import("./pages/Verify"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const InterviewRoom = lazy(() => import("./pages/InterviewRoom"));
const PreInterview = lazy(() => import("./pages/PreInterview"));
const Report = lazy(() => import("./pages/Report"));
const Plans = lazy(() => import("./pages/Plans"));
const CollegeAdminDashboard = lazy(() => import("./pages/CollegeAdminDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/invite" element={<AcceptInvite />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

            {/* Any signed-in user */}
            <Route path="/verify" element={<RequireAuth><Verify /></RequireAuth>} />

            {/* Student */}
            <Route path="/dashboard" element={<RequireAuth roles={["student"]}><Dashboard /></RequireAuth>} />
            <Route path="/pre-interview" element={<RequireAuth roles={["student"]}><PreInterview /></RequireAuth>} />
            <Route path="/interview" element={<RequireAuth roles={["student"]}><InterviewRoom /></RequireAuth>} />
            <Route path="/plans" element={<RequireAuth roles={["student"]}><Plans /></RequireAuth>} />
            <Route path="/buy-credits" element={<Navigate to="/plans" replace />} />

            {/* Reports: the student who took it, their college admin, or a platform admin. */}
            <Route path="/report" element={<RequireAuth><Report /></RequireAuth>} />

            {/* College admin */}
            <Route path="/college" element={<RequireAuth roles={["college_admin"]}><CollegeAdminDashboard /></RequireAuth>} />
            <Route path="/officer/*" element={<Navigate to="/college" replace />} />

            {/* Platform admin */}
            <Route path="/admin" element={<RequireAuth roles={["admin"]}><AdminDashboard /></RequireAuth>} />
            <Route path="/super-admin" element={<Navigate to="/admin" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <ChatBot />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
