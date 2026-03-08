import {
  Home,
  MessageSquare,
  Hash,
  Star,
  Trophy,
  Users,
  HelpCircle,
  Diamond,
  Zap,
  BookOpen,
  LayoutDashboard,
  Shield,
  Megaphone,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Feed", url: "/feed", icon: Home },
  { title: "Channels", url: "/channels", icon: Hash },
  { title: "Messages", url: "/messages", icon: MessageSquare },
];

const channelItems = [
  { title: "Feed", url: "/channels", icon: Hash },
  { title: "Intros", url: "/channels", icon: Hash },
  { title: "Share Your Wins", url: "/channels", icon: Star },
  { title: "Accountability", url: "/channels", icon: Zap },
  { title: "Support Forum", url: "/channels", icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
  const isCoachOrAdmin = hasRole("coach") || hasRole("admin");

  return (
    <Sidebar collapsible="icon" className="border-r border-border top-14">
      <SidebarContent className="pt-3">
        {/* Create Button with Popover */}
        {!collapsed && (
          <div className="px-3 mb-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg">
                  + Create
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <button
                  onClick={() => navigate("/feed")}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Megaphone className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Post on Feed</p>
                    <p className="text-xs text-muted-foreground">Share with everyone in your community.</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/channels")}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <div className="p-2 rounded-lg bg-info/10">
                    <Hash className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Post in a Channel</p>
                    <p className="text-xs text-muted-foreground">Engage with a specific audience.</p>
                  </div>
                </button>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-secondary/80" activeClassName="bg-secondary text-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isCoachOrAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" className="hover:bg-secondary/80" activeClassName="bg-secondary text-foreground font-medium">
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Courses */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Learning
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/courses" className="hover:bg-secondary/80" activeClassName="bg-secondary text-foreground font-medium">
                    <BookOpen className="h-4 w-4" />
                    {!collapsed && <span>Courses</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Continue Learning */}
        {!collapsed && (
          <div className="px-3 mt-2">
            <div className="bg-info/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-4 w-4 text-info" />
                <span className="text-xs font-semibold text-info">Continue learning</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">Browse courses to get started</p>
              <Progress value={0} className="h-1.5" />
            </div>
          </div>
        )}

        {/* Channels quick links */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Channels
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {channelItems.map((item, i) => (
                <SidebarMenuItem key={i}>
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
