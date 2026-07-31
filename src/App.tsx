import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HomeRedirect } from "@/components/HomeRedirect";
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
import AIContentGenerator from "./pages/AIContentGenerator";
import AILandingPageBuilder from "./pages/AILandingPageBuilder";
import WorkshopLandingPage from "./pages/WorkshopLandingPage";
import SecuritySettings from "./pages/SecuritySettings";
import TeamManagement from "./pages/TeamManagement";
import CloudStorage from "./pages/CloudStorage";
import LevelUpUpgrade from "./pages/LevelUpUpgrade";
import CrmDashboard from "./pages/CrmDashboard";
import CrmPipelines from "./pages/CrmPipelines";
import CrmContacts from "./pages/CrmContacts";
import CrmFollowUps from "./pages/CrmFollowUps";
import CrmContactGroups from "./pages/CrmContactGroups";
import CrmMetaLeads from "./pages/CrmMetaLeads";
import CrmLeadProfile from "./pages/CrmLeadProfile";
import QuestDashboard from "./pages/QuestDashboard";
import RolePermissions from "./pages/RolePermissions";
import VideoLibrary from "./pages/VideoLibrary";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
            <Route path="/checkout/:idOrSlug" element={<ServiceCheckout />} />
            <Route path="/workshop/:slug" element={<WorkshopLandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute featureKey="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute featureKey="community_feed"><Feed /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute featureKey="courses"><Courses /></ProtectedRoute>} />
            <Route path="/services" element={<ProtectedRoute featureKey="services"><Services /></ProtectedRoute>} />
            <Route path="/service-builder" element={<ProtectedRoute featureKey="services"><ServiceBuilder /></ProtectedRoute>} />
            <Route path="/service-builder/:id" element={<ProtectedRoute featureKey="services"><ServiceBuilder /></ProtectedRoute>} />
            <Route path="/ai-course-generator" element={<ProtectedRoute featureKey="ai_suite"><AICourseGenerator /></ProtectedRoute>} />
            <Route path="/course-builder" element={<ProtectedRoute featureKey="courses"><CourseBuilder /></ProtectedRoute>} />
            <Route path="/course-builder/:id" element={<ProtectedRoute featureKey="courses"><CourseBuilder /></ProtectedRoute>} />
            <Route path="/course-player/:id" element={<ProtectedRoute featureKey="courses"><CoursePlayer /></ProtectedRoute>} />
            <Route path="/course-manage/:id" element={<ProtectedRoute featureKey="courses"><CourseManage /></ProtectedRoute>} />
            <Route path="/channels" element={<ProtectedRoute featureKey="channels"><Channels /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute featureKey="analytics"><Analytics /></ProtectedRoute>} />
            <Route path="/workshops" element={<ProtectedRoute featureKey="workshops"><Workshops /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute featureKey="events"><Events /></ProtectedRoute>} />
            <Route path="/student-events" element={<ProtectedRoute featureKey="events"><StudentEvents /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute featureKey="customers"><Customers /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute featureKey="customers"><Leads /></ProtectedRoute>} />
            <Route path="/crm" element={<ProtectedRoute featureKey="crm"><CrmDashboard /></ProtectedRoute>} />
            <Route path="/crm/pipelines" element={<ProtectedRoute featureKey="crm"><CrmPipelines /></ProtectedRoute>} />
            <Route path="/crm/contacts" element={<ProtectedRoute featureKey="crm"><CrmContacts /></ProtectedRoute>} />
            <Route path="/crm/follow-ups" element={<ProtectedRoute featureKey="crm"><CrmFollowUps /></ProtectedRoute>} />
            <Route path="/crm/contact-groups" element={<ProtectedRoute featureKey="crm"><CrmContactGroups /></ProtectedRoute>} />
            <Route path="/crm/meta-leads" element={<ProtectedRoute featureKey="crm"><CrmMetaLeads /></ProtectedRoute>} />
            <Route path="/crm/leads/:id" element={<ProtectedRoute featureKey="crm"><CrmLeadProfile /></ProtectedRoute>} />
            <Route path="/sales/earnings" element={<ProtectedRoute featureKey="sales"><SalesEarnings /></ProtectedRoute>} />
            <Route path="/sales/transactions" element={<ProtectedRoute featureKey="sales"><SalesTransactions /></ProtectedRoute>} />
            <Route path="/sales/subscriptions" element={<ProtectedRoute featureKey="sales"><SalesEarnings /></ProtectedRoute>} />
            <Route path="/sales/withdrawals" element={<ProtectedRoute featureKey="sales"><SalesEarnings /></ProtectedRoute>} />
            <Route path="/page-builder" element={<ProtectedRoute featureKey="page_builder"><PageBuilder /></ProtectedRoute>} />
            <Route path="/page-builder/ai-landing" element={<ProtectedRoute featureKey="page_builder"><AILandingPageBuilder /></ProtectedRoute>} />
            <Route path="/marketing/email" element={<ProtectedRoute featureKey="marketing"><MarketingEmail /></ProtectedRoute>} />
            <Route path="/marketing/broadcasts" element={<ProtectedRoute featureKey="marketing"><Broadcasts /></ProtectedRoute>} />
            <Route path="/marketing/banners" element={<ProtectedRoute featureKey="marketing"><Banners /></ProtectedRoute>} />
            <Route path="/marketing/coupons" element={<ProtectedRoute featureKey="marketing"><Coupons /></ProtectedRoute>} />
            <Route path="/marketing/unsubscribed" element={<ProtectedRoute featureKey="marketing"><UnsubscribedUsers /></ProtectedRoute>} />
            <Route path="/automation/path" element={<ProtectedRoute featureKey="automation"><AutomationPath /></ProtectedRoute>} />
            <Route path="/automation/email" element={<ProtectedRoute featureKey="automation"><EmailAutomation /></ProtectedRoute>} />
            <Route path="/automation/whatsapp" element={<ProtectedRoute featureKey="automation"><WhatsAppAutomation /></ProtectedRoute>} />
            <Route path="/automation/notifications" element={<ProtectedRoute featureKey="automation"><NotificationAutomation /></ProtectedRoute>} />
            <Route path="/automation/templates" element={<ProtectedRoute featureKey="automation"><AutomationTemplates /></ProtectedRoute>} />
            <Route path="/automation/events-personalisation" element={<ProtectedRoute featureKey="automation"><EventsPersonalisation /></ProtectedRoute>} />
            <Route path="/automation/account-management" element={<ProtectedRoute featureKey="automation"><WhatsAppAccountManagement /></ProtectedRoute>} />
            <Route path="/automation/logs" element={<ProtectedRoute featureKey="automation"><AutomationLogs /></ProtectedRoute>} />
            <Route path="/automation/certificates" element={<ProtectedRoute featureKey="certificates"><Certificates /></ProtectedRoute>} />
            <Route path="/automation/integrations" element={<ProtectedRoute featureKey="automation"><Integrations /></ProtectedRoute>} />
            <Route path="/partnerships" element={<ProtectedRoute featureKey="partnerships"><Partnerships /></ProtectedRoute>} />
            <Route path="/gamification" element={<ProtectedRoute featureKey="gamification"><Gamification /></ProtectedRoute>} />
            <Route path="/levelup" element={<ProtectedRoute featureKey="levelup"><LevelUp /></ProtectedRoute>} />
            <Route path="/quest" element={<ProtectedRoute featureKey="quest"><QuestDashboard /></ProtectedRoute>} />
            <Route path="/ai/content-generator" element={<ProtectedRoute featureKey="ai_suite"><AIContentGenerator /></ProtectedRoute>} />
            <Route path="/video-library" element={<ProtectedRoute featureKey="video_library"><VideoLibrary /></ProtectedRoute>} />
            <Route path="/levelup-upgrade" element={<ProtectedRoute featureKey="levelup"><LevelUpUpgrade /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute featureKey="leaderboard"><Leaderboard /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute featureKey="my_settings"><SettingsPage /></ProtectedRoute>} />
            <Route path="/settings/platform" element={<ProtectedRoute featureKey="platform_settings"><PlatformSettings /></ProtectedRoute>} />
            <Route path="/settings/security" element={<ProtectedRoute featureKey="security_settings"><SecuritySettings /></ProtectedRoute>} />
            <Route path="/settings/team" element={<ProtectedRoute featureKey="team_management"><TeamManagement /></ProtectedRoute>} />
            <Route path="/settings/cloud" element={<ProtectedRoute featureKey="cloud_storage"><CloudStorage /></ProtectedRoute>} />
            <Route path="/settings/roles" element={<ProtectedRoute featureKey="platform_settings"><RolePermissions /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute featureKey="billing"><Billing /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute featureKey="referral"><Referral /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="/affiliate" element={<ProtectedRoute featureKey="affiliate"><StudentAffiliate /></ProtectedRoute>} />
            <Route path="/affiliate/manage" element={<ProtectedRoute featureKey="affiliate"><CoachAffiliateManagement /></ProtectedRoute>} />
            <Route path="/navigation-settings" element={<ProtectedRoute featureKey="navigation_settings"><NavigationSettings /></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
            <Route path="/settings/email" element={<ProtectedRoute featureKey="marketing"><EmailSettings /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
            <Route path="/my-account" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute featureKey="messages"><Messages /></ProtectedRoute>} />
            <Route path="/messages/:recipientId" element={<ProtectedRoute featureKey="messages"><Messages /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
