import {
  Activity,
  ArrowLeftRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  Contact,
  CreditCard,
  DollarSign,
  Facebook,
  FileText,
  Gift,
  Handshake,
  Hash,
  Home,
  Image,
  Kanban,
  Layout,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Megaphone,
  MessageSquare,
  Layers,
  PencilRuler,
  Phone,
  Rocket,
  Route,
  Search,
  Send,
  Tag,
  Target,
  ToggleRight,
  TrendingUp,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  UsersRound,
  Video,
  Wallet,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/hooks/usePermissions";

export interface AppNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  permissionKey: FeatureKey;
  /**
   * Extra gate for destinations a feature flag alone cannot describe. The
   * `courses` flag says "may see courses", which every student has; an editor
   * needs "may author them" on top of it.
   */
  role?: "coach" | "admin" | "super_admin";
}

export interface AppNavSection {
  /** A named, collapsible group; null for a standalone top-level entry. */
  label: string | null;
  /** Stands in for the whole group in the collapsed icon rail. */
  icon?: LucideIcon;
  permissionKey: FeatureKey | null;
  items: AppNavItem[];
}

/**
 * The app's primary navigation, in one place.
 *
 * The sidebar renders it and universal search indexes it, so a destination
 * added here is reachable both by clicking and by searching — neither can
 * drift from the other.
 */
// Each item/section has a permissionKey that maps to the role_permissions table
// Primary navigation only — the places people work.
//
// Everything configuration-shaped used to sit here too, which pushed the list
// past sixty entries and buried the day-to-day destinations. Those screens now
// live behind a single Settings entry and are listed by src/lib/settingsNav.ts,
// so this list stays short enough to scan. No route was removed.
export const APP_NAV_SECTIONS: AppNavSection[] = [
  {
    label: null,
    permissionKey: "dashboard" as FeatureKey,
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, permissionKey: "dashboard" as FeatureKey },
    ],
  },
  {
    label: null,
    permissionKey: "analytics" as FeatureKey,
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3, permissionKey: "analytics" as FeatureKey },
    ],
  },
  {
    label: "Community",
    icon: UsersRound,
    permissionKey: "community_feed" as FeatureKey,
    items: [
      { title: "Feed", url: "/feed", icon: Home, permissionKey: "community_feed" as FeatureKey },
      { title: "Messages", url: "/messages", icon: MessageSquare, permissionKey: "messages" as FeatureKey },
      { title: "Channels", url: "/channels", icon: Hash, permissionKey: "channels" as FeatureKey },
      { title: "Events", url: "/student-events", icon: Calendar, permissionKey: "events" as FeatureKey },
      { title: "Leaderboard", url: "/leaderboard", icon: Trophy, permissionKey: "leaderboard" as FeatureKey },
      { title: "Support", url: "/support", icon: LifeBuoy, permissionKey: "support" as FeatureKey },
    ],
  },
  {
    label: "Products",
    icon: BookOpen,
    permissionKey: "courses" as FeatureKey,
    items: [
      { title: "Courses", url: "/courses", icon: BookOpen, permissionKey: "courses" as FeatureKey },
      {
        title: "Manage Courses",
        url: "/course-manage",
        icon: PencilRuler,
        permissionKey: "courses" as FeatureKey,
        role: "coach",
      },
      {
        title: "Course Engine",
        url: "/course-engine",
        icon: Layers,
        permissionKey: "courses" as FeatureKey,
        role: "coach",
      },
      { title: "Services", url: "/services", icon: Megaphone, permissionKey: "services" as FeatureKey },
      { title: "Workshops", url: "/workshops", icon: Video, permissionKey: "workshops" as FeatureKey },
      { title: "Events", url: "/events", icon: Calendar, permissionKey: "events" as FeatureKey },
      { title: "Video Library", url: "/video-library", icon: Video, permissionKey: "video_library" as FeatureKey },
      { title: "Page Builder", url: "/page-builder", icon: Layout, permissionKey: "page_builder" as FeatureKey },
    ],
  },
  {
    label: "Sales",
    icon: DollarSign,
    permissionKey: "sales" as FeatureKey,
    items: [
      { title: "Earnings", url: "/sales/earnings", icon: DollarSign, permissionKey: "sales" as FeatureKey },
      { title: "Transactions", url: "/sales/transactions", icon: ArrowLeftRight, permissionKey: "sales" as FeatureKey },
      { title: "Subscriptions", url: "/sales/subscriptions", icon: CreditCard, permissionKey: "sales" as FeatureKey },
      { title: "Withdrawals", url: "/sales/withdrawals", icon: Wallet, permissionKey: "sales" as FeatureKey },
    ],
  },
  {
    label: "Customers",
    icon: Contact,
    permissionKey: "customers" as FeatureKey,
    items: [
      { title: "Customers", url: "/customers", icon: Users, permissionKey: "customers" as FeatureKey },
      { title: "Leads", url: "/leads", icon: UserPlus, permissionKey: "customers" as FeatureKey },
    ],
  },
  {
    label: "CRM",
    icon: Kanban,
    permissionKey: "crm" as FeatureKey,
    items: [
      { title: "CRM", url: "/crm", icon: Kanban, permissionKey: "crm" as FeatureKey },
      { title: "Pipelines", url: "/crm/pipelines", icon: Route, permissionKey: "crm" as FeatureKey },
      { title: "Contacts", url: "/crm/contacts", icon: Contact, permissionKey: "crm" as FeatureKey },
      { title: "Contact Groups", url: "/crm/contact-groups", icon: UsersRound, permissionKey: "crm" as FeatureKey },
      { title: "Follow-ups", url: "/crm/follow-ups", icon: ClipboardCheck, permissionKey: "crm" as FeatureKey },
      { title: "Meta Leads", url: "/crm/meta-leads", icon: Facebook, permissionKey: "crm" as FeatureKey },
    ],
  },
  {
    label: "Marketing",
    icon: Send,
    permissionKey: "marketing" as FeatureKey,
    items: [
      { title: "Broadcasts", url: "/marketing/broadcasts", icon: Send, permissionKey: "marketing" as FeatureKey },
      { title: "Banners", url: "/marketing/banners", icon: Image, permissionKey: "marketing" as FeatureKey },
      { title: "Coupons", url: "/marketing/coupons", icon: Tag, permissionKey: "marketing" as FeatureKey },
      { title: "Unsubscribed", url: "/marketing/unsubscribed", icon: UserMinus, permissionKey: "marketing" as FeatureKey },
    ],
  },
  {
    label: "Automation",
    icon: Route,
    permissionKey: "automation" as FeatureKey,
    items: [
      { title: "Journeys", url: "/automation/path", icon: Route, permissionKey: "automation" as FeatureKey },
      { title: "Email", url: "/automation/email", icon: Mail, permissionKey: "automation" as FeatureKey },
      { title: "WhatsApp", url: "/automation/whatsapp", icon: Phone, permissionKey: "automation" as FeatureKey },
      { title: "Notifications", url: "/automation/notifications", icon: Bell, permissionKey: "automation" as FeatureKey },
      { title: "Templates", url: "/automation/templates", icon: FileText, permissionKey: "automation" as FeatureKey },
      { title: "Personalisation", url: "/automation/events-personalisation", icon: ToggleRight, permissionKey: "automation" as FeatureKey },
      { title: "Certificates", url: "/automation/certificates", icon: Award, permissionKey: "certificates" as FeatureKey },
      { title: "Logs", url: "/automation/logs", icon: Activity, permissionKey: "automation" as FeatureKey },
    ],
  },
  {
    label: "Growth",
    icon: Target,
    permissionKey: "growth" as FeatureKey,
    items: [
      { title: "Goal", url: "/growth/goal", icon: Target, permissionKey: "growth" as FeatureKey },
      { title: "Actions", url: "/growth/actions", icon: CheckSquare, permissionKey: "growth" as FeatureKey },
      { title: "Business", url: "/growth/business", icon: BarChart3, permissionKey: "growth" as FeatureKey },
      { title: "Boosters", url: "/growth/boosters", icon: Rocket, permissionKey: "growth" as FeatureKey },
      { title: "Gamification", url: "/gamification", icon: Trophy, permissionKey: "gamification" as FeatureKey },
      { title: "LevelUp", url: "/levelup", icon: TrendingUp, permissionKey: "levelup" as FeatureKey },
      { title: "Partnerships", url: "/partnerships", icon: Handshake, permissionKey: "partnerships" as FeatureKey },
      { title: "Affiliate", url: "/affiliate", icon: Gift, permissionKey: "affiliate" as FeatureKey },
    ],
  },
  {
    // Member-facing and permission-gated, so it shows for whoever the
    // referral feature is enabled for — members, admins and super admins alike.
    label: null,
    permissionKey: "referral" as FeatureKey,
    items: [
      { title: "Refer & Earn", url: "/referral", icon: Gift, permissionKey: "referral" as FeatureKey },
    ],
  },
  {
    label: "AI Suite",
    icon: Wand2,
    permissionKey: "ai_suite" as FeatureKey,
    items: [
      { title: "Lead Intelligence", url: "/leads", icon: Search, permissionKey: "ai_suite" as FeatureKey },
      { title: "Content Generator", url: "/ai/content-generator", icon: Wand2, permissionKey: "ai_suite" as FeatureKey },
    ],
  },
];
