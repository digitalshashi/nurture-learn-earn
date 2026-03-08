import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Feed from "./pages/Feed";
import Courses from "./pages/Courses";
import CourseBuilder from "./pages/CourseBuilder";
import CoursePlayer from "./pages/CoursePlayer";
import CourseManage from "./pages/CourseManage";
import Channels from "./pages/Channels";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import Workshops from "./pages/Workshops";
import Events from "./pages/Events";
import Customers from "./pages/Customers";
import Leads from "./pages/Leads";
import SalesEarnings from "./pages/SalesEarnings";
import SalesTransactions from "./pages/SalesTransactions";
import EmailAutomation from "./pages/EmailAutomation";
import Certificates from "./pages/Certificates";
import Integrations from "./pages/Integrations";
import Partnerships from "./pages/Partnerships";
import Gamification from "./pages/Gamification";
import SettingsPage from "./pages/SettingsPage";
import Billing from "./pages/Billing";
import Referral from "./pages/Referral";
import PageBuilder from "./pages/PageBuilder";
import MarketingEmail from "./pages/MarketingEmail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
            <Route path="/course-builder" element={<ProtectedRoute><CourseBuilder /></ProtectedRoute>} />
            <Route path="/course-builder/:id" element={<ProtectedRoute><CourseBuilder /></ProtectedRoute>} />
            <Route path="/course-player/:id" element={<ProtectedRoute><CoursePlayer /></ProtectedRoute>} />
            <Route path="/course-manage/:id" element={<ProtectedRoute><CourseManage /></ProtectedRoute>} />
            <Route path="/channels" element={<ProtectedRoute><Channels /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/workshops" element={<ProtectedRoute><Workshops /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
            <Route path="/sales/earnings" element={<ProtectedRoute><SalesEarnings /></ProtectedRoute>} />
            <Route path="/sales/transactions" element={<ProtectedRoute><SalesTransactions /></ProtectedRoute>} />
            <Route path="/sales/subscriptions" element={<ProtectedRoute><SalesEarnings /></ProtectedRoute>} />
            <Route path="/sales/withdrawals" element={<ProtectedRoute><SalesEarnings /></ProtectedRoute>} />
            <Route path="/page-builder" element={<ProtectedRoute><PageBuilder /></ProtectedRoute>} />
            <Route path="/marketing/email" element={<ProtectedRoute><MarketingEmail /></ProtectedRoute>} />
            <Route path="/marketing/broadcasts" element={<ProtectedRoute><MarketingEmail /></ProtectedRoute>} />
            <Route path="/automation/email" element={<ProtectedRoute><EmailAutomation /></ProtectedRoute>} />
            <Route path="/automation/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
            <Route path="/automation/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
            <Route path="/partnerships" element={<ProtectedRoute><Partnerships /></ProtectedRoute>} />
            <Route path="/gamification" element={<ProtectedRoute><Gamification /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
