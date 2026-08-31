import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TenantHome } from "@/components/TenantHome";
import { SeoDefaults } from "@/components/SeoDefaults";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import { useAffiliateCapture } from "@/hooks/useAffiliateCapture";
import Feed from "./pages/Feed";
import Courses from "./pages/Courses";
import CourseBuilder from "./pages/CourseBuilder";
import CoursePlayer from "./pages/CoursePlayer";
import CourseDetail from "./pages/CourseDetail";
import CourseManage from "./pages/CourseManage";
import CourseManageIndex from "./pages/CourseManageIndex";
import Channels from "./pages/Channels";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import Workshops from "./pages/Workshops";
import Events from "./pages/Events";
import StudentEvents from "./pages/StudentEvents";
import Customers from "./pages/Customers";
import Leads from "./pages/Leads";
import SalesEarnings from "./pages/SalesEarnings";
import SalesTransactions from "./pages/SalesTransactions";
import SalesSubscriptions from "./pages/SalesSubscriptions";
import SalesWithdrawals from "./pages/SalesWithdrawals";
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
import ReferralLanding from "./pages/ReferralLanding";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import PageBuilder from "./pages/PageBuilder";
import PageEditor from "./pages/PageEditor";
import PublicPage from "./pages/PublicPage";
import MarketingEmail from "./pages/MarketingEmail";
import Broadcasts from "./pages/Broadcasts";
import Banners from "./pages/Banners";
import Coupons from "./pages/Coupons";
import UnsubscribedUsers from "./pages/UnsubscribedUsers";
import CoachAffiliateManagement from "./pages/CoachAffiliateManagement";
import NavigationSettings from "./pages/NavigationSettings";
import CapsulePage from "./pages/CapsulePage";
import SuperAdmin from "./pages/SuperAdmin";
import EmailSettings from "./pages/EmailSettings";
import Services from "./pages/Services";
import ServiceBuilder from "./pages/ServiceBuilder";
import ServiceCheckout from "./pages/ServiceCheckout";
import ServiceCheckoutSuccess from "./pages/ServiceCheckoutSuccess";
import Leaderboard from "./pages/Leaderboard";
import StudentProfile from "./pages/StudentProfile";
import MyAccount from "./pages/MyAccount";
import Messages from "./pages/Messages";
import AICourseGenerator from "./pages/AICourseGenerator";
import CourseEngine from "./pages/CourseEngine";
import CourseBlueprintEditor from "./pages/CourseBlueprintEditor";
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
import { QuestShell } from "./components/quest/QuestShell";
import QuestHome from "./pages/quest/QuestHome";
import QuestProfileSetup from "./pages/quest/QuestProfileSetup";
import QuestHandbook from "./pages/quest/QuestHandbook";
import QuestRituals from "./pages/quest/QuestRituals";
import QuestStories from "./pages/quest/QuestStories";
import QuestPowerTools from "./pages/quest/QuestPowerTools";
import QuestAwards from "./pages/quest/QuestAwards";
import QuestLeaderboard from "./pages/quest/QuestLeaderboard";
import QuestCertificates from "./pages/quest/QuestCertificates";
import QuestHackathon from "./pages/quest/QuestHackathon";
import QuestSupport from "./pages/quest/QuestSupport";
import RolePermissions from "./pages/RolePermissions";
import VideoLibrary from "./pages/VideoLibrary";
import Support from "./pages/Support";
import SupportManage from "./pages/SupportManage";
import GrowthGoal from "./pages/GrowthGoal";
import GrowthActions from "./pages/GrowthActions";
import GrowthBusiness from "./pages/GrowthBusiness";
import GrowthBoosters from "./pages/GrowthBoosters";
const queryClient = new QueryClient();

/**
 * Hooks need a component; this one exists only to run the two capture hooks
 * inside the router.
 *
 * They are separate because they answer separate links: `/r/CODE` invites
 * somebody to join the platform, `?affiliate=CODE` sends a buyer at one
 * specific product. A visitor can arrive on both at once and each should count.
 */
function LinkCapture() {
  useReferralCapture();
  useAffiliateCapture();
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CurrencyProvider>
          {/* Resets the head to the 1corehub defaults on every navigation;
              pages with their own metadata override it from their own effect. */}
          <SeoDefaults />
          {/* A referral or affiliate code in the URL is banked here, at the
              root, so it counts whichever page the shared link lands on. */}
          <LinkCapture />
          <Routes>
            <Route path="/" element={<TenantHome />} />
            <Route path="/checkout/:idOrSlug" element={<ServiceCheckout />} />
            <Route path="/checkout/:idOrSlug/success" element={<ProtectedRoute><ServiceCheckoutSuccess /></ProtectedRoute>} />
            <Route path="/workshop/:slug" element={<WorkshopLandingPage />} />
            <Route path="/login" element={<Login />} />
            {/* Public: this is the link members hand to their friends. */}
            <Route path="/r/:code" element={<ReferralLanding />} />
            <Route path="/p/:slug" element={<PublicPage />} />
            {/* The page existed but was never routed, so the reset link in the
                recovery email had nowhere to land. */}
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute featureKey="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute featureKey="community_feed"><Feed /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute featureKey="courses"><Courses /></ProtectedRoute>} />
            <Route path="/services" element={<ProtectedRoute featureKey="services"><Services /></ProtectedRoute>} />
            <Route path="/service-builder" element={<ProtectedRoute featureKey="services"><ServiceBuilder /></ProtectedRoute>} />
            <Route path="/service-builder/:id" element={<ProtectedRoute featureKey="services"><ServiceBuilder /></ProtectedRoute>} />
            <Route path="/ai-course-generator" element={<ProtectedRoute featureKey="ai_suite"><AICourseGenerator /></ProtectedRoute>} />
            <Route path="/course-engine" element={<ProtectedRoute featureKey="courses"><CourseEngine /></ProtectedRoute>} />
            <Route path="/course-engine/:id" element={<ProtectedRoute featureKey="courses"><CourseBlueprintEditor /></ProtectedRoute>} />
            <Route path="/course-builder" element={<ProtectedRoute featureKey="courses"><CourseBuilder /></ProtectedRoute>} />
            <Route path="/course-builder/:id" element={<ProtectedRoute featureKey="courses"><CourseBuilder /></ProtectedRoute>} />
            <Route path="/course-player/:id" element={<ProtectedRoute featureKey="courses"><CourseDetail /></ProtectedRoute>} />
            <Route path="/course-player/:id/watch" element={<ProtectedRoute featureKey="courses"><CoursePlayer /></ProtectedRoute>} />
            <Route path="/course-player/:id/watch/:chapterId" element={<ProtectedRoute featureKey="courses"><CoursePlayer /></ProtectedRoute>} />
            <Route path="/course-manage" element={<ProtectedRoute featureKey="courses"><CourseManageIndex /></ProtectedRoute>} />
            <Route path="/course-manage/:id" element={<ProtectedRoute featureKey="courses"><CourseManage /></ProtectedRoute>} />
            <Route path="/channels" element={<ProtectedRoute featureKey="channels"><Channels /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute featureKey="analytics"><Analytics /></ProtectedRoute>} />
            <Route path="/workshops" element={<ProtectedRoute featureKey="workshops"><Workshops /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute featureKey="events" blockRoles={["student"]}><Events /></ProtectedRoute>} />
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
            <Route path="/sales/subscriptions" element={<ProtectedRoute featureKey="sales"><SalesSubscriptions /></ProtectedRoute>} />
            <Route path="/sales/withdrawals" element={<ProtectedRoute featureKey="sales"><SalesWithdrawals /></ProtectedRoute>} />
            <Route path="/growth/goal" element={<ProtectedRoute featureKey="growth"><GrowthGoal /></ProtectedRoute>} />
            <Route path="/growth/actions" element={<ProtectedRoute featureKey="growth"><GrowthActions /></ProtectedRoute>} />
            <Route path="/growth/business" element={<ProtectedRoute featureKey="growth"><GrowthBusiness /></ProtectedRoute>} />
            <Route path="/growth/boosters" element={<ProtectedRoute featureKey="growth"><GrowthBoosters /></ProtectedRoute>} />
            <Route path="/page-builder" element={<ProtectedRoute featureKey="page_builder"><PageBuilder /></ProtectedRoute>} />
            <Route path="/page-builder/:id" element={<ProtectedRoute featureKey="page_builder"><PageEditor /></ProtectedRoute>} />
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
            {/* Quest is a section, not a page: the shell mounts once as the
                parent so its data loads a single time and the rail does not
                reset on every navigation inside it. */}
            <Route path="/quest" element={<ProtectedRoute featureKey="quest"><QuestShell /></ProtectedRoute>}>
              <Route index element={<QuestHome />} />
              <Route path="profile" element={<QuestProfileSetup />} />
              <Route path="handbook" element={<QuestHandbook />} />
              <Route path="rituals" element={<QuestRituals />} />
              <Route path="stories" element={<QuestStories />} />
              <Route path="power-tools" element={<QuestPowerTools />} />
              <Route path="awards" element={<QuestAwards />} />
              <Route path="leaderboard" element={<QuestLeaderboard />} />
              <Route path="certificates" element={<QuestCertificates />} />
              <Route path="hackathon" element={<QuestHackathon />} />
              <Route path="support" element={<QuestSupport />} />
            </Route>
            <Route path="/ai/content-generator" element={<ProtectedRoute featureKey="ai_suite"><AIContentGenerator /></ProtectedRoute>} />
            <Route path="/video-library" element={<ProtectedRoute featureKey="video_library"><VideoLibrary /></ProtectedRoute>} />
            <Route path="/levelup-upgrade" element={<ProtectedRoute featureKey="levelup"><LevelUpUpgrade /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute featureKey="leaderboard"><Leaderboard /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute featureKey="my_settings" blockRoles={["student"]}><SettingsPage /></ProtectedRoute>} />
            <Route path="/settings/platform" element={<ProtectedRoute featureKey="platform_settings"><PlatformSettings /></ProtectedRoute>} />
            <Route path="/settings/security" element={<ProtectedRoute featureKey="security_settings"><SecuritySettings /></ProtectedRoute>} />
            <Route path="/settings/team" element={<ProtectedRoute featureKey="team_management"><TeamManagement /></ProtectedRoute>} />
            <Route path="/settings/cloud" element={<ProtectedRoute featureKey="cloud_storage"><CloudStorage /></ProtectedRoute>} />
            <Route path="/settings/roles" element={<ProtectedRoute featureKey="platform_settings"><RolePermissions /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute featureKey="billing"><Billing /></ProtectedRoute>} />
            {/* The affiliates dashboard answers to both names: /referral is
                where it was asked for, /affiliate is where the sidebar and
                every existing bookmark already point. */}
            <Route path="/referral" element={<ProtectedRoute featureKey="referral"><AffiliateDashboard /></ProtectedRoute>} />
            {/* Refer & Earn — the platform-wide invite bonus, a different offer
                from the per-product commissions above. */}
            <Route path="/referral/invite" element={<ProtectedRoute featureKey="referral"><Referral /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="/affiliate" element={<ProtectedRoute featureKey="affiliate"><AffiliateDashboard /></ProtectedRoute>} />
            <Route path="/affiliate/manage" element={<ProtectedRoute featureKey="affiliate"><CoachAffiliateManagement /></ProtectedRoute>} />
            <Route path="/navigation-settings" element={<ProtectedRoute featureKey="navigation_settings"><NavigationSettings /></ProtectedRoute>} />
            <Route path="/capsule" element={<ProtectedRoute><CapsulePage /></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
            <Route path="/settings/email" element={<ProtectedRoute featureKey="marketing"><EmailSettings /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
            <Route path="/my-account" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute featureKey="messages"><Messages /></ProtectedRoute>} />
            <Route path="/messages/:recipientId" element={<ProtectedRoute featureKey="messages"><Messages /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute featureKey="support"><Support /></ProtectedRoute>} />
            <Route path="/support-manage" element={<ProtectedRoute featureKey="support"><SupportManage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </CurrencyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
