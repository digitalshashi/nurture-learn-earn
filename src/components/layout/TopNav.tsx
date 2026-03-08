import { useEffect, useState } from "react";
import { Bell, LogOut, icons, ArrowLeftRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useCommunity } from "@/contexts/CommunityContext";
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
  const { activeCommunity } = useCommunity();
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState<NavMenuItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const prefix = activeCommunity ? `/c/${activeCommunity.slug}` : "";

  const defaultNavItems = [
    { label: "FEED", link: `${prefix}/feed`, icon_name: "users" },
    { label: "COURSES", link: `${prefix}/courses`, icon_name: "book-open" },
    { label: "QUEST", link: `${prefix}/levelup`, icon_name: "trophy" },
    { label: "EVENTS", link: `${prefix}/student-events`, icon_name: "calendar" },
    { label: "TOOLS", link: `${prefix}/channels`, icon_name: "wrench" },
  ];

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

  const visibleItems = menuItems.length > 0
    ? menuItems.filter((item) => {
        if (!item.visible_roles || item.visible_roles.length === 0) return true;
        return roles.some((r) => item.visible_roles.includes(r));
      }).map((item) => ({ ...item, link: `${prefix}${item.link}` }))
    : defaultNavItems;

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 justify-between sticky top-0 z-50">
      <div className="flex items-center gap-1">
        <div
          className="h-8 w-8 rounded-lg mr-2 flex items-center justify-center cursor-pointer shrink-0"
          style={{ backgroundColor: activeCommunity?.brand_color || "hsl(var(--primary))" }}
          onClick={() => navigate(prefix ? `${prefix}/dashboard` : "/communities")}
        >
          {activeCommunity?.logo_url ? (
            <img src={activeCommunity.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="text-primary-foreground text-sm font-bold">
              {activeCommunity?.name?.charAt(0)?.toUpperCase() || "L"}
            </span>
          )}
        </div>
        {activeCommunity && (
          <span className="text-sm font-semibold text-foreground mr-3 hidden sm:inline truncate max-w-[120px]">
            {activeCommunity.name}
          </span>
        )}
        <nav className="hidden md:flex items-center gap-0">
          {visibleItems.map((item, i) => (
            <NavLink
              key={item.label + i}
              to={item.link}
              className="flex flex-col items-center px-3 py-1 text-muted-foreground hover:text-accent transition-colors text-xs gap-0.5"
              activeClassName="text-accent border-b-2 border-accent"
            >
              <LucideIcon name={item.icon_name} className="h-5 w-5" />
              <span className="font-medium uppercase">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => navigate("/communities")}
          title="Switch Community"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
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
