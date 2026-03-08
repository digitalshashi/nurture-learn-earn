import {
  Home,
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

const sidebarSections = [
  {
    label: null,
    items: [
      { title: "Get Started", url: "/dashboard", icon: Rocket },
    ],
  },
  {
    label: null,
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: null,
    items: [
      { title: "Services", url: "/services", icon: Megaphone },
    ],
  },
  {
    label: "Products",
    items: [
      { title: "Courses", url: "/courses", icon: BookOpen },
      { title: "Workshops", url: "/workshops", icon: Video },
      { title: "Events", url: "/events", icon: Calendar },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Earnings", url: "/sales/earnings", icon: DollarSign },
      { title: "Transactions", url: "/sales/transactions", icon: CreditCard },
      { title: "Subscriptions", url: "/sales/subscriptions", icon: ArrowLeftRight },
      { title: "Withdrawals", url: "/sales/withdrawals", icon: Wallet },
    ],
  },
  {
    label: null,
    items: [
      { title: "Page Builder", url: "/page-builder", icon: Layout },
    ],
  },
  {
    label: "Customers",
    items: [
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Leads", url: "/leads", icon: UserPlus },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Broadcasts", url: "/marketing/broadcasts", icon: Send },
      { title: "Email Settings", url: "/settings/email", icon: Mail },
      { title: "Banners", url: "/marketing/banners", icon: Image },
      { title: "Coupons", url: "/marketing/coupons", icon: Tag },
      { title: "Unsubscribed Users", url: "/marketing/unsubscribed", icon: UserMinus },
    ],
  },
  {
    label: "Automation",
    items: [
      { title: "Path", url: "/automation/path", icon: Route },
      { title: "Email Automation", url: "/automation/email", icon: Mail },
      { title: "WhatsApp Automation", url: "/automation/whatsapp", icon: Phone },
      { title: "Notifications", url: "/automation/notifications", icon: Bell },
      { title: "Templates", url: "/automation/templates", icon: FileText },
      { title: "Events Personalisation", url: "/automation/events-personalisation", icon: ToggleRight },
      { title: "Account Management", url: "/automation/account-management", icon: Phone },
      { title: "Logs", url: "/automation/logs", icon: Activity },
      { title: "Certificates", url: "/automation/certificates", icon: Award },
      { title: "Integrations", url: "/automation/integrations", icon: Puzzle },
    ],
  },
  {
    label: null,
    items: [
      { title: "Partnerships", url: "/partnerships", icon: Handshake },
      { title: "Affiliate", url: "/affiliate", icon: Gift },
      { title: "Gamification", url: "/gamification", icon: Trophy },
      { title: "LevelUp", url: "/levelup", icon: Trophy },
    ],
  },
  {
    label: null,
    items: [
      { title: "Settings", url: "/settings", icon: Settings },
      { title: "Billing & Plans", url: "/billing", icon: Receipt },
      { title: "Refer & Earn", url: "/referral", icon: Gift },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const isCoachOrAdmin = hasRole("coach") || hasRole("admin");

  return (
    <Sidebar collapsible="icon" className="border-r border-border top-14">
      <SidebarContent className="pt-2 gap-0">
        {sidebarSections.map((section, si) => {
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
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className="hover:bg-secondary/80 text-sm"
                          activeClassName="bg-secondary text-foreground font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
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
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" className="hover:bg-secondary/80 text-sm" activeClassName="bg-secondary text-foreground font-medium">
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasRole("admin") && (
          <SidebarGroup className="py-0.5">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/super-admin" className="hover:bg-secondary/80 text-sm" activeClassName="bg-secondary text-foreground font-medium">
                      <Crown className="h-4 w-4" />
                      {!collapsed && <span>Super Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
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
    <Collapsible open={collapsed ? false : open} onOpenChange={setOpen}>
      <SidebarGroup className="py-0.5">
        <CollapsibleTrigger className="w-full">
          <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer flex items-center justify-between pr-2">
            {!collapsed && label}
            {!collapsed && (
              <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-secondary/80 text-sm"
                      activeClassName="bg-secondary text-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
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
