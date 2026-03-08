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
import StudentEvents from "./pages/StudentEvents";
import Customers from "./pages/Customers";
import Leads from "./pages/Leads";
import SalesEarnings from "./pages/SalesEarnings";
import SalesTransactions from "./pages/SalesTransactions";
import EmailAutomation from "./pages/EmailAutomation";
import WhatsAppAutomation from "./pages/WhatsAppAutomation";
import NotificationAutomation from "./pages/NotificationAutomation";
import AutomationPath from "./pages/AutomationPath";
import AutomationTemplates from "./pages/AutomationTemplates";
import EventsPersonalisation from "./pages/EventsPersonalisation";
import WhatsAppAccountManagement from "./pages/WhatsAppAccountManagement";
import AutomationLogs from "./pages/AutomationLogs";
import Certificates from "./pages/Certificates";
import Integrations from "./pages/Integrations";
import Partnerships from "./pages/Partnerships";
import Gamification from "./pages/Gamification";
import LevelUp from "./pages/LevelUp";
import SettingsPage from "./pages/SettingsPage";
import PlatformSettings from "./pages/PlatformSettings";
import Billing from "./pages/Billing";
import Referral from "./pages/Referral";
import PageBuilder from "./pages/PageBuilder";
import MarketingEmail from "./pages/MarketingEmail";
import Broadcasts from "./pages/Broadcasts";
import Banners from "./pages/Banners";
import Coupons from "./pages/Coupons";
import UnsubscribedUsers from "./pages/UnsubscribedUsers";
import StudentAffiliate from "./pages/StudentAffiliate";
import CoachAffiliateManagement from "./pages/CoachAffiliateManagement";
import NavigationSettings from "./pages/NavigationSettings";
import SuperAdmin from "./pages/SuperAdmin";
import EmailSettings from "./pages/EmailSettings";
import Services from "./pages/Services";
import ServiceBuilder from "./pages/ServiceBuilder";
import ServiceCheckout from "./pages/ServiceCheckout";
import Leaderboard from "./pages/Leaderboard";
import StudentProfile from "./pages/StudentProfile";
import MyAccount from "./pages/MyAccount";
import Messages from "./pages/Messages";
import AICourseGenerator from "./pages/AICourseGenerator";

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
            <Route path="/checkout/:idOrSlug" element={<ServiceCheckout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
            <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
            <Route path="/service-builder" element={<ProtectedRoute><ServiceBuilder /></ProtectedRoute>} />
            <Route path="/service-builder/:id" element={<ProtectedRoute><ServiceBuilder /></ProtectedRoute>} />
            <Route path="/ai-course-generator" element={<ProtectedRoute><AICourseGenerator /></ProtectedRoute>} />
            <Route path="/course-builder" element={<ProtectedRoute><CourseBuilder /></ProtectedRoute>} />
            <Route path="/course-builder/:id" element={<ProtectedRoute><CourseBuilder /></ProtectedRoute>} />
            <Route path="/course-player/:id" element={<ProtectedRoute><CoursePlayer /></ProtectedRoute>} />
            <Route path="/course-manage/:id" element={<ProtectedRoute><CourseManage /></ProtectedRoute>} />
            <Route path="/channels" element={<ProtectedRoute><Channels /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/workshops" element={<ProtectedRoute><Workshops /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/student-events" element={<ProtectedRoute><StudentEvents /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
            <Route path="/sales/earnings" element={<ProtectedRoute><SalesEarnings /></ProtectedRoute>} />
            <Route path="/sales/transactions" element={<ProtectedRoute><SalesTransactions /></ProtectedRoute>} />
            <Route path="/sales/subscriptions" element={<ProtectedRoute><SalesEarnings /></ProtectedRoute>} />
            <Route path="/sales/withdrawals" element={<ProtectedRoute><SalesEarnings /></ProtectedRoute>} />
            <Route path="/page-builder" element={<ProtectedRoute><PageBuilder /></ProtectedRoute>} />
            <Route path="/marketing/email" element={<ProtectedRoute><MarketingEmail /></ProtectedRoute>} />
            <Route path="/marketing/broadcasts" element={<ProtectedRoute><Broadcasts /></ProtectedRoute>} />
            <Route path="/marketing/banners" element={<ProtectedRoute><Banners /></ProtectedRoute>} />
            <Route path="/marketing/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
            <Route path="/marketing/unsubscribed" element={<ProtectedRoute><UnsubscribedUsers /></ProtectedRoute>} />
            <Route path="/automation/path" element={<ProtectedRoute><AutomationPath /></ProtectedRoute>} />
            <Route path="/automation/email" element={<ProtectedRoute><EmailAutomation /></ProtectedRoute>} />
            <Route path="/automation/whatsapp" element={<ProtectedRoute><WhatsAppAutomation /></ProtectedRoute>} />
            <Route path="/automation/notifications" element={<ProtectedRoute><NotificationAutomation /></ProtectedRoute>} />
            <Route path="/automation/templates" element={<ProtectedRoute><AutomationTemplates /></ProtectedRoute>} />
            <Route path="/automation/events-personalisation" element={<ProtectedRoute><EventsPersonalisation /></ProtectedRoute>} />
            <Route path="/automation/account-management" element={<ProtectedRoute><WhatsAppAccountManagement /></ProtectedRoute>} />
            <Route path="/automation/logs" element={<ProtectedRoute><AutomationLogs /></ProtectedRoute>} />
            <Route path="/automation/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
            <Route path="/automation/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
            <Route path="/partnerships" element={<ProtectedRoute><Partnerships /></ProtectedRoute>} />
            <Route path="/gamification" element={<ProtectedRoute><Gamification /></ProtectedRoute>} />
            <Route path="/levelup" element={<ProtectedRoute><LevelUp /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="/affiliate" element={<ProtectedRoute><StudentAffiliate /></ProtectedRoute>} />
            <Route path="/affiliate/manage" element={<ProtectedRoute><CoachAffiliateManagement /></ProtectedRoute>} />
            <Route path="/navigation-settings" element={<ProtectedRoute><NavigationSettings /></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
            <Route path="/settings/email" element={<ProtectedRoute><EmailSettings /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
            <Route path="/my-account" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messages/:recipientId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
