import { useEffect, useState, lazy, Suspense } from "react";
import { Bell, LogOut, LayoutDashboard, icons } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface NavMenuItem {
  id: string;
  label: string;
  icon_name: string;
  link: string;
  sort_order: number;
  visible_roles: string[];
}

// Fallback static nav items when no DB items configured
const defaultNavItems = [
  { label: "FEED", link: "/feed", icon_name: "users" },
  { label: "COURSES", link: "/courses", icon_name: "book-open" },
  { label: "QUEST", link: "/levelup", icon_name: "trophy" },
  { label: "EVENTS", link: "/student-events", icon_name: "calendar" },
  { label: "TOOLS", link: "/channels", icon_name: "wrench" },
];

function LucideIcon({ name, className }: { name: string; className?: string }) {
  // Convert kebab-case to PascalCase for lucide-react icons lookup
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

  useEffect(() => {
    loadNav();
  }, []);

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  // Filter by user role
  const visibleItems = menuItems.length > 0
    ? menuItems.filter((item) => {
        if (!item.visible_roles || item.visible_roles.length === 0) return true;
        return roles.some((r) => item.visible_roles.includes(r));
      })
    : defaultNavItems;

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 sticky top-0 z-50">
      {/* Left: Logo */}
      <div className="flex items-center shrink-0">
        <div
          className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <span className="text-primary-foreground text-sm font-bold">L</span>
        </div>
      </div>

      {/* Center: Nav */}
      <nav className="hidden md:flex items-center justify-center gap-0 flex-1">
        {visibleItems.map((item, i) => (
          <NavLink
            key={item.label + i}
            to={item.link}
            end={item.link === "/dashboard"}
            className="flex flex-col items-center px-3 py-1 text-muted-foreground hover:text-accent transition-colors text-xs gap-0.5"
            activeClassName="text-accent border-b-2 border-accent"
          >
            <LucideIcon name={item.icon_name} className="h-5 w-5" />
            <span className="font-medium uppercase">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Right: Actions */}

      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
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
