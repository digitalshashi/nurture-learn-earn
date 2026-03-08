import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CommunityProvider } from "@/contexts/CommunityContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CommunityRoute } from "@/components/CommunityRoute";
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
import Certificates from "./pages/Certificates";
import Integrations from "./pages/Integrations";
import Partnerships from "./pages/Partnerships";
import Gamification from "./pages/Gamification";
import LevelUp from "./pages/LevelUp";
import SettingsPage from "./pages/SettingsPage";
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
import CommunitySelector from "./pages/CommunitySelector";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CommunityProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/communities" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/communities" element={<ProtectedRoute><CommunitySelector /></ProtectedRoute>} />

              {/* Community-scoped routes */}
              <Route path="/c/:slug/dashboard" element={<CommunityRoute><Dashboard /></CommunityRoute>} />
              <Route path="/c/:slug/feed" element={<CommunityRoute><Feed /></CommunityRoute>} />
              <Route path="/c/:slug/courses" element={<CommunityRoute><Courses /></CommunityRoute>} />
              <Route path="/c/:slug/course-builder" element={<CommunityRoute><CourseBuilder /></CommunityRoute>} />
              <Route path="/c/:slug/course-builder/:id" element={<CommunityRoute><CourseBuilder /></CommunityRoute>} />
              <Route path="/c/:slug/course-player/:id" element={<CommunityRoute><CoursePlayer /></CommunityRoute>} />
              <Route path="/c/:slug/course-manage/:id" element={<CommunityRoute><CourseManage /></CommunityRoute>} />
              <Route path="/c/:slug/channels" element={<CommunityRoute><Channels /></CommunityRoute>} />
              <Route path="/c/:slug/analytics" element={<CommunityRoute><Analytics /></CommunityRoute>} />
              <Route path="/c/:slug/workshops" element={<CommunityRoute><Workshops /></CommunityRoute>} />
              <Route path="/c/:slug/events" element={<CommunityRoute><Events /></CommunityRoute>} />
              <Route path="/c/:slug/student-events" element={<CommunityRoute><StudentEvents /></CommunityRoute>} />
              <Route path="/c/:slug/customers" element={<CommunityRoute><Customers /></CommunityRoute>} />
              <Route path="/c/:slug/leads" element={<CommunityRoute><Leads /></CommunityRoute>} />
              <Route path="/c/:slug/sales/earnings" element={<CommunityRoute><SalesEarnings /></CommunityRoute>} />
              <Route path="/c/:slug/sales/transactions" element={<CommunityRoute><SalesTransactions /></CommunityRoute>} />
              <Route path="/c/:slug/sales/subscriptions" element={<CommunityRoute><SalesEarnings /></CommunityRoute>} />
              <Route path="/c/:slug/sales/withdrawals" element={<CommunityRoute><SalesEarnings /></CommunityRoute>} />
              <Route path="/c/:slug/page-builder" element={<CommunityRoute><PageBuilder /></CommunityRoute>} />
              <Route path="/c/:slug/marketing/email" element={<CommunityRoute><MarketingEmail /></CommunityRoute>} />
              <Route path="/c/:slug/marketing/broadcasts" element={<CommunityRoute><Broadcasts /></CommunityRoute>} />
              <Route path="/c/:slug/marketing/banners" element={<CommunityRoute><Banners /></CommunityRoute>} />
              <Route path="/c/:slug/marketing/coupons" element={<CommunityRoute><Coupons /></CommunityRoute>} />
              <Route path="/c/:slug/marketing/unsubscribed" element={<CommunityRoute><UnsubscribedUsers /></CommunityRoute>} />
              <Route path="/c/:slug/automation/email" element={<CommunityRoute><EmailAutomation /></CommunityRoute>} />
              <Route path="/c/:slug/automation/certificates" element={<CommunityRoute><Certificates /></CommunityRoute>} />
              <Route path="/c/:slug/automation/integrations" element={<CommunityRoute><Integrations /></CommunityRoute>} />
              <Route path="/c/:slug/partnerships" element={<CommunityRoute><Partnerships /></CommunityRoute>} />
              <Route path="/c/:slug/affiliate" element={<CommunityRoute><StudentAffiliate /></CommunityRoute>} />
              <Route path="/c/:slug/affiliate/manage" element={<CommunityRoute><CoachAffiliateManagement /></CommunityRoute>} />
              <Route path="/c/:slug/gamification" element={<CommunityRoute><Gamification /></CommunityRoute>} />
              <Route path="/c/:slug/levelup" element={<CommunityRoute><LevelUp /></CommunityRoute>} />
              <Route path="/c/:slug/settings" element={<CommunityRoute><SettingsPage /></CommunityRoute>} />
              <Route path="/c/:slug/billing" element={<CommunityRoute><Billing /></CommunityRoute>} />
              <Route path="/c/:slug/referral" element={<CommunityRoute><Referral /></CommunityRoute>} />
              <Route path="/c/:slug/admin" element={<CommunityRoute><AdminPanel /></CommunityRoute>} />
              <Route path="/c/:slug/navigation-settings" element={<CommunityRoute><NavigationSettings /></CommunityRoute>} />

              {/* Platform-level routes (no community) */}
              <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />

              {/* Legacy redirects */}
              <Route path="/dashboard" element={<Navigate to="/communities" replace />} />
              <Route path="/feed" element={<Navigate to="/communities" replace />} />
              <Route path="/courses" element={<Navigate to="/communities" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </CommunityProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
