import {
  Home,
  Contact,
  Kanban,
  ClipboardCheck,
  UsersRound,
  Facebook,
  BarChart3,
  Route,
  BookOpen,
  Video,
  Calendar,
  Users,
  UserPlus,
  DollarSign,
  CreditCard,
  ArrowLeftRight,
  Wallet,
  Layout,
  Mail,
  Phone,
  Activity,
  FileText,
  ToggleRight,
  MessageSquare,
  Send,
  Award,
  Puzzle,
  Handshake,
  Trophy,
  Settings,
  Receipt,
  Gift,
  Search,
  Rocket,
  ChevronDown,
  Hash,
  Shield,
  Megaphone,
  LayoutDashboard,
  Image,
  Tag,
  UserMinus,
  Crown,
  Bell,
  HardDrive,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { usePermissions, FeatureKey } from "@/hooks/usePermissions";

// Each item/section has a permissionKey that maps to the role_permissions table
const sidebarSections = [
  {
    label: "Community",
    permissionKey: "community_feed" as FeatureKey,
    items: [
      { title: "Feed", url: "/feed", icon: Home, permissionKey: "community_feed" as FeatureKey },
      { title: "Messages", url: "/messages", icon: MessageSquare, permissionKey: "messages" as FeatureKey },
      { title: "Channels", url: "/channels", icon: Hash, permissionKey: "channels" as FeatureKey },
      { title: "Leaderboard", url: "/leaderboard", icon: Trophy, permissionKey: "leaderboard" as FeatureKey },
      { title: "Events", url: "/student-events", icon: Calendar, permissionKey: "events" as FeatureKey },
    ],
  },
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
    label: null,
    permissionKey: "services" as FeatureKey,
    items: [
      { title: "Services", url: "/services", icon: Megaphone, permissionKey: "services" as FeatureKey },
    ],
  },
  {
    label: "Products",
    permissionKey: "courses" as FeatureKey,
    items: [
      { title: "Courses", url: "/courses", icon: BookOpen, permissionKey: "courses" as FeatureKey },
      { title: "Workshops", url: "/workshops", icon: Video, permissionKey: "workshops" as FeatureKey },
      { title: "Events", url: "/events", icon: Calendar, permissionKey: "events" as FeatureKey },
      { title: "Video Library", url: "/video-library", icon: Video, permissionKey: "courses" as FeatureKey },
    ],
  },
  {
    label: "Sales",
    permissionKey: "sales" as FeatureKey,
    items: [
      { title: "Earnings", url: "/sales/earnings", icon: DollarSign, permissionKey: "sales" as FeatureKey },
      { title: "Transactions", url: "/sales/transactions", icon: CreditCard, permissionKey: "sales" as FeatureKey },
      { title: "Subscriptions", url: "/sales/subscriptions", icon: ArrowLeftRight, permissionKey: "sales" as FeatureKey },
      { title: "Withdrawals", url: "/sales/withdrawals", icon: Wallet, permissionKey: "sales" as FeatureKey },
    ],
  },
  {
    label: null,
    permissionKey: "page_builder" as FeatureKey,
    items: [
      { title: "Page Builder", url: "/page-builder", icon: Layout, permissionKey: "page_builder" as FeatureKey },
    ],
  },
  {
    label: "CRM",
    permissionKey: "crm" as FeatureKey,
    items: [
      { title: "CRM", url: "/crm", icon: Contact, permissionKey: "crm" as FeatureKey },
      { title: "Follow-ups", url: "/crm/follow-ups", icon: ClipboardCheck, permissionKey: "crm" as FeatureKey },
      { title: "Contacts", url: "/crm/contacts", icon: UsersRound, permissionKey: "crm" as FeatureKey },
      { title: "Contact Groups", url: "/crm/contact-groups", icon: Users, permissionKey: "crm" as FeatureKey },
      { title: "Meta Leads", url: "/crm/meta-leads", icon: Facebook, permissionKey: "crm" as FeatureKey },
      { title: "Pipelines", url: "/crm/pipelines", icon: Kanban, permissionKey: "crm" as FeatureKey },
    ],
  },
  {
    label: "Customers",
    permissionKey: "customers" as FeatureKey,
    items: [
      { title: "Customers", url: "/customers", icon: Users, permissionKey: "customers" as FeatureKey },
      { title: "Leads", url: "/leads", icon: UserPlus, permissionKey: "customers" as FeatureKey },
    ],
  },
  {
    label: "Marketing",
    permissionKey: "marketing" as FeatureKey,
    items: [
      { title: "Broadcasts", url: "/marketing/broadcasts", icon: Send, permissionKey: "marketing" as FeatureKey },
      { title: "Email Settings", url: "/settings/email", icon: Mail, permissionKey: "marketing" as FeatureKey },
      { title: "Banners", url: "/marketing/banners", icon: Image, permissionKey: "marketing" as FeatureKey },
      { title: "Coupons", url: "/marketing/coupons", icon: Tag, permissionKey: "marketing" as FeatureKey },
      { title: "Unsubscribed Users", url: "/marketing/unsubscribed", icon: UserMinus, permissionKey: "marketing" as FeatureKey },
    ],
  },
  {
    label: "Automation",
    permissionKey: "automation" as FeatureKey,
    items: [
      { title: "Path", url: "/automation/path", icon: Route, permissionKey: "automation" as FeatureKey },
      { title: "Email Automation", url: "/automation/email", icon: Mail, permissionKey: "automation" as FeatureKey },
      { title: "WhatsApp Automation", url: "/automation/whatsapp", icon: Phone, permissionKey: "automation" as FeatureKey },
      { title: "Notifications", url: "/automation/notifications", icon: Bell, permissionKey: "automation" as FeatureKey },
      { title: "Templates", url: "/automation/templates", icon: FileText, permissionKey: "automation" as FeatureKey },
      { title: "Events Personalisation", url: "/automation/events-personalisation", icon: ToggleRight, permissionKey: "automation" as FeatureKey },
      { title: "Account Management", url: "/automation/account-management", icon: Phone, permissionKey: "automation" as FeatureKey },
      { title: "Logs", url: "/automation/logs", icon: Activity, permissionKey: "automation" as FeatureKey },
      { title: "Certificates", url: "/automation/certificates", icon: Award, permissionKey: "certificates" as FeatureKey },
      { title: "Integrations", url: "/automation/integrations", icon: Puzzle, permissionKey: "automation" as FeatureKey },
    ],
  },
  {
    label: null,
    permissionKey: null,
    items: [
      { title: "Partnerships", url: "/partnerships", icon: Handshake, permissionKey: "partnerships" as FeatureKey },
      { title: "Affiliate", url: "/affiliate", icon: Gift, permissionKey: "affiliate" as FeatureKey },
      { title: "Gamification", url: "/gamification", icon: Trophy, permissionKey: "gamification" as FeatureKey },
      { title: "LevelUp", url: "/levelup", icon: Trophy, permissionKey: "levelup" as FeatureKey },
    ],
  },
  {
    label: "AI Suite",
    permissionKey: "ai_suite" as FeatureKey,
    items: [
      { title: "AI Lead Intelligence", url: "/crm/contacts", icon: Contact, permissionKey: "ai_suite" as FeatureKey },
      { title: "AI Content Generator", url: "/ai/content-generator", icon: Rocket, permissionKey: "ai_suite" as FeatureKey },
    ],
  },
  {
    label: "Settings",
    permissionKey: "my_settings" as FeatureKey,
    items: [
      { title: "Platform Settings", url: "/settings/platform", icon: Settings, permissionKey: "platform_settings" as FeatureKey },
      { title: "Security", url: "/settings/security", icon: Shield, permissionKey: "security_settings" as FeatureKey },
      { title: "Team Management", url: "/settings/team", icon: Users, permissionKey: "team_management" as FeatureKey },
      { title: "Roles & Permissions", url: "/settings/roles", icon: Shield, permissionKey: "platform_settings" as FeatureKey },
      { title: "Cloud Storage", url: "/settings/cloud", icon: HardDrive, permissionKey: "cloud_storage" as FeatureKey },
      { title: "My Settings", url: "/settings", icon: Settings, permissionKey: "my_settings" as FeatureKey },
      { title: "Billing & Plans", url: "/billing", icon: Receipt, permissionKey: "billing" as FeatureKey },
      { title: "Refer & Earn", url: "/referral", icon: Gift, permissionKey: "referral" as FeatureKey },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { hasRole } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const isCoachOrAdmin = hasRole("coach") || hasRole("admin") || hasRole("super_admin");

  const filteredSections = sidebarSections
    .filter((section) => {
      if (!section.permissionKey) return true;
      return hasPermission(section.permissionKey);
    })
    .map((section) => ({
      ...section,
      items: section.items.filter((item: any) => hasPermission(item.permissionKey)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-2 gap-0">
        {filteredSections.map((section, si) => {
          if (section.label) {
            return (
              <CollapsibleGroup
                key={si}
                label={section.label}
                items={section.items}
                collapsed={collapsed}
                currentPath={location.pathname}
              />
            );
          }
          return (
            <SidebarGroup key={si} className="py-0.5">
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className="hover:bg-secondary/80 text-sm rounded-[6px]"
                          activeClassName="bg-accent-tint text-accent font-medium"
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {isCoachOrAdmin && (
          <SidebarGroup className="py-0.5">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin">
                    <NavLink to="/admin" className="hover:bg-secondary/80 text-sm rounded-[6px]" activeClassName="bg-accent-tint text-accent font-medium">
                      <Shield className="h-5 w-5 shrink-0" />
                      <span className="truncate">Admin</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(hasRole("admin") || hasRole("super_admin")) && (
          <SidebarGroup className="py-0.5">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Super Admin">
                    <NavLink to="/super-admin" className="hover:bg-secondary/80 text-sm rounded-[6px]" activeClassName="bg-accent-tint text-accent font-medium">
                      <Crown className="h-5 w-5 shrink-0" />
                      <span className="truncate">Super Admin</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!collapsed && (
          <div className="mt-auto p-3">
            <button
              onClick={() => navigate("/affiliate")}
              className="w-full text-left rounded-lg bg-[#3D1B16] p-4 hover:bg-[#4A211B] transition-colors"
            >
              <p className="text-white font-semibold text-base">Refer & Earn</p>
              <p className="text-gray-300 text-xs mt-1">
                Invite others and earn rewards for every referral that joins.
              </p>
            </button>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

function CollapsibleGroup({
  label,
  items,
  collapsed,
  currentPath,
}: {
  label: string;
  items: { title: string; url: string; icon: any }[];
  collapsed: boolean;
  currentPath: string;
}) {
  const isActive = items.some((i) => currentPath.startsWith(i.url));
  const [open, setOpen] = useState(isActive);

  return (
    <Collapsible open={collapsed ? true : open} onOpenChange={setOpen}>
      <SidebarGroup className="py-0.5">
        <CollapsibleTrigger className="w-full group/trigger">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer flex items-center justify-between pr-2 hover:text-foreground transition-colors group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none">
            {label}
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="hover:bg-secondary/80 text-sm rounded-[6px]"
                      activeClassName="bg-accent-tint text-accent font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
