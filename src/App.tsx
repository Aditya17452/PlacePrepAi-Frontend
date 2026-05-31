import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import InterviewRoom from "./pages/InterviewRoom";
import PreInterview from "./pages/PreInterview";
import Report from "./pages/Report";
import OfficerDashboard from "./pages/OfficerDashboard";
import OfficerCredits from "./pages/OfficerCredits";
import About from "./pages/About";
import Contact from "./pages/Contact";
import BuyCredits from "./pages/BuyCredits";
import AdminPanel from "./pages/AdminPanel";
import SuperAdminPanel from "./pages/SuperAdminPanel";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import ChatBot from "./components/ChatBot";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/interview" element={<InterviewRoom />} />
      <Route path="/pre-interview" element={<PreInterview />} />
      <Route path="/report" element={<Report />} />
      <Route path="/officer" element={<OfficerDashboard />} />
      <Route path="/officer/credits" element={<OfficerCredits />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/buy-credits" element={<BuyCredits />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/super-admin" element={<SuperAdminPanel />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <ChatBot />
  </BrowserRouter>
);

export default App;

