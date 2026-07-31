import { useEffect, useState } from "react";
import { Bell, LogOut, LayoutDashboard, icons, UserCircle, MessageCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface NavMenuItem {
  id: string;
  label: string;
  icon_name: string;
  link: string;
  sort_order: number;
  visible_roles: string[];
}

// These items ALWAYS show in the top nav for all roles
const PINNED_NAV_ITEMS = [
  { label: "FEED", link: "/feed", icon_name: "users" },
  { label: "COURSES", link: "/courses", icon_name: "book-open" },
  { label: "QUEST", link: "/quest", icon_name: "sword" },
  { label: "EVENTS", link: "/student-events", icon_name: "calendar" },
];

// Fallback static nav items when no DB items configured
const defaultNavItems = [
  ...PINNED_NAV_ITEMS,
  { label: "LEVEL UP", link: "/levelup", icon_name: "trophy" },
];

// Items that require LevelUp access for students
const LEVELUP_LINKS = ["/levelup"];

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const pascalName = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const IconComp = (icons as any)[pascalName];
  if (!IconComp) {
    const Fallback = (icons as any)["Circle"];
    return Fallback ? <Fallback className={className} /> : null;
  }
  return <IconComp className={className} />;
}

export function TopNav() {
  const { user, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState<NavMenuItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasLevelupAccess, setHasLevelupAccess] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNav();
  }, []);

  useEffect(() => {
    if (user) checkLevelupAccess();
  }, [user, roles]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      if (!cancelled) setUnreadCount(count || 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadNav = async () => {
    const { data } = await supabase
      .from("navigation_menu")
      .select("*")
      .eq("is_enabled", true)
      .order("sort_order");
    if (data && data.length > 0) {
      setMenuItems(data as NavMenuItem[]);
    }
    setLoaded(true);
  };

  const checkLevelupAccess = async () => {
    if (!user) return;
    // Coaches/admins always have access
    const isCoachOrAdmin = roles.includes("coach") || roles.includes("admin") || roles.includes("super_admin" as any);
    if (isCoachOrAdmin) {
      setHasLevelupAccess(true);
      return;
    }
    // For students, check via RPC
    const { data, error } = await supabase.rpc("user_has_levelup_access", { _user_id: user.id });
    setHasLevelupAccess(!!data);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  // Start with pinned items, then add DB-configured items (excluding duplicates of pinned links)
  const pinnedLinks = new Set(PINNED_NAV_ITEMS.map((p) => p.link));
  const roleFiltered = menuItems.length > 0
    ? [
        ...PINNED_NAV_ITEMS,
        ...menuItems
          .filter((item) => !pinnedLinks.has(item.link))
          .filter((item) => {
            if (!item.visible_roles || item.visible_roles.length === 0) return true;
            return roles.some((r) => item.visible_roles.includes(r));
          }),
      ]
    : defaultNavItems;

  // Filter LevelUp items for students without access
  const visibleItems = roleFiltered.filter((item) => {
    if (LEVELUP_LINKS.includes(item.link) && !hasLevelupAccess) return false;
    return true;
  });

  return (
    <header className="h-16 border-b border-border bg-card flex items-center px-5 sticky top-0 z-50">
      {/* Left: Logo */}
      <div className="flex items-center shrink-0 gap-4">
        <SidebarTrigger className="text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors" />
        <div
          className="h-[45px] w-[45px] bg-primary rounded-lg flex items-center justify-center cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <span className="text-primary-foreground text-lg font-bold">L</span>
        </div>
      </div>

      {/* Center: Nav */}
      <nav className="hidden md:flex items-center justify-center flex-1">
        {visibleItems.map((item, i) => (
          <NavLink
            key={item.label + i}
            to={item.link}
            end={item.link === "/dashboard"}
            className="flex flex-col items-center px-5 py-2 text-muted-foreground hover:text-accent transition-colors gap-1.5 min-w-[72px]"
            activeClassName="text-accent border-b-[3px] border-accent"
          >
            <LucideIcon name={item.icon_name} className="h-6 w-6" />
            <span className="text-xs font-semibold uppercase tracking-wide">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors relative">
          <Bell className="h-6 w-6 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src="" />
              <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm font-medium truncate">
                {user?.user_metadata?.full_name || user?.email}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {roles.join(", ") || "student"}
              </p>
            </div>
            <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => navigate("/my-account")}>
              <UserCircle className="h-4 w-4 mr-2" /> My Account
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => navigate("/messages")}>
              <MessageCircle className="h-4 w-4 mr-2" /> Messages
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}

export { LucideIcon };
