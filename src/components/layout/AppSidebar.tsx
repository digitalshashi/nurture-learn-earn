import {
  Home,
  MessageSquare,
  Hash,
  ChevronDown,
  ChevronRight,
  Star,
  Trophy,
  Users,
  HelpCircle,
  Diamond,
  Zap,
  BookOpen,
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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const mainItems = [
  { title: "Feed", url: "/feed", icon: Home },
  { title: "Messages", url: "/messages", icon: MessageSquare },
];

const hiveItems = [
  { title: "Hive Connect", url: "/hive", icon: Users },
];

const channelItems = [
  { title: "Feed", url: "/channels/feed", icon: Hash },
  { title: "Intros", url: "/channels/intros", icon: Hash },
  { title: "Share Your Wins", url: "/channels/wins", icon: Star },
  { title: "Accountability", url: "/channels/accountability", icon: Zap },
  { title: "Support Forum", url: "/channels/support", icon: HelpCircle },
  { title: "Why Diamond?", url: "/channels/diamond", icon: Diamond },
  { title: "Champions", url: "/channels/champions", icon: Trophy },
  { title: "Affiliates", url: "/channels/affiliates", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border top-14">
      <SidebarContent className="pt-3">
        {/* Create Button */}
        {!collapsed && (
          <div className="px-3 mb-2">
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg">
              + Create
            </Button>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-secondary/80"
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

        {/* HIVE */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            HIVE
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hiveItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="hover:bg-secondary/80" activeClassName="bg-secondary text-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Inner Circle */}
        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Inner Circle
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-3 text-sm text-muted-foreground">
                By Internet Lifestyle Hub
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Continue Learning */}
        {!collapsed && (
          <div className="px-3 mt-2">
            <div className="bg-info/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-4 w-4 text-info" />
                <span className="text-xs font-semibold text-info">Continue learning</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">Freedom Business Blueprint</p>
              <Progress value={96} className="h-1.5" />
              <span className="text-[10px] text-muted-foreground">96%</span>
            </div>
          </div>
        )}

        {/* Channels */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Channels
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {channelItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="hover:bg-secondary/80 text-sm" activeClassName="bg-secondary text-foreground font-medium">
                      <item.icon className="h-3.5 w-3.5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
