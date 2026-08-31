import { useEffect, useRef, useState } from "react";
import {
  IoApps,
  IoBook,
  IoBriefcase,
  IoCalendar,
  IoCard,
  IoChatbubbles,
  IoCompass,
  IoFlash,
  IoFolder,
  IoGift,
  IoHeart,
  IoHelpBuoy,
  IoHome,
  IoLayers,
  IoMail,
  IoMegaphone,
  IoNotifications,
  IoPeople,
  IoPlayCircle,
  IoRocket,
  IoSearch,
  IoSettings,
  IoSparkles,
  IoStar,
  IoStatsChart,
  IoTicket,
  IoTrophy,
  IoVideocam,
} from "react-icons/io5";
import type { IconType } from "react-icons";
import {
  LifeBuoy,
  LogOut,
  Megaphone,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Trophy,
  UserCircle,
  type LucideIcon as LucideIconType,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LucideIcon } from "./LucideIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSearch } from "@/contexts/SearchContext";
import { BRAND } from "@/lib/brand";
import { normalizeUrl } from "@/lib/safeUrl";
import { cn } from "@/lib/utils";

/**
 * Custom nav items (Member navigation settings) can point anywhere; only a
 * bare "/path" is one of our own routes. Anything else — "instagram.com",
 * "https://...", etc. — is an external site and gets routed through the
 * capsule page instead of `react-router`'s `Link`, which would otherwise
 * try (and fail) to resolve it as an internal route.
 */
function isExternalLink(link: string): boolean {
  return !link.startsWith("/");
}

function capsuleHref(label: string, link: string): string {
  const params = new URLSearchParams({ url: normalizeUrl(link), label });
  return `/capsule?${params.toString()}`;
}

/**
 * Every tab is the same width, so the active indicator can be placed by index
 * alone — one bar that slides, rather than a border per tab.
 */
const TAB_WIDTH = 116;

const APPS_MENU_ITEMS: { label: string; link: string; icon: LucideIconType; description: string }[] = [
  { label: "Support", link: "/support", icon: LifeBuoy, description: "Stuck areas & FAQ" },
  { label: "Gamification", link: "/gamification", icon: Trophy, description: "Badges, XP & rewards" },
  { label: "Marketing", link: "/marketing/broadcasts", icon: Megaphone, description: "Broadcasts & campaigns" },
];

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
  { label: "QUEST", link: "/quest", icon_name: "sword" },
  { label: "COURSES", link: "/courses", icon_name: "book-open" },
  { label: "EVENTS", link: "/student-events", icon_name: "calendar" },
  { label: "LEVEL UP", link: "/levelup", icon_name: "sparkles" },
  { label: "SUPPORT", link: "/support", icon_name: "life-buoy" },
];

// Fallback static nav items when no DB items configured
const defaultNavItems = [...PINNED_NAV_ITEMS];

// Items that require LevelUp access for students
const LEVELUP_LINKS = ["/levelup"];

/**
 * Nav rows store a Lucide name (`icon_name`), but the bar draws filled
 * Ionicons — this is the bridge. A name with no Ionicon counterpart falls
 * back to the Lucide glyph it asked for rather than to a placeholder.
 */
const IONICON_BY_NAME: Record<string, IconType> = {
  "bar-chart": IoStatsChart,
  "book-open": IoBook,
  "credit-card": IoCard,
  "graduation-cap": IoBook,
  "help-circle": IoHelpBuoy,
  "life-buoy": IoHelpBuoy,
  "message-circle": IoChatbubbles,
  "message-square": IoChatbubbles,
  "play-circle": IoPlayCircle,
  apps: IoApps,
  book: IoBook,
  briefcase: IoBriefcase,
  calendar: IoCalendar,
  compass: IoCompass,
  folder: IoFolder,
  gift: IoGift,
  grid: IoApps,
  heart: IoHeart,
  home: IoHome,
  layers: IoLayers,
  mail: IoMail,
  megaphone: IoMegaphone,
  play: IoPlayCircle,
  rocket: IoRocket,
  settings: IoSettings,
  sparkles: IoSparkles,
  star: IoStar,
  sword: IoRocket,
  ticket: IoTicket,
  trophy: IoTrophy,
  users: IoPeople,
  video: IoVideocam,
  videocam: IoVideocam,
  zap: IoFlash,
};

function TabIcon({ name }: { name: string }) {
  const Ionicon = IONICON_BY_NAME[name];
  if (Ionicon) return <Ionicon size={20} aria-hidden />;
  return <LucideIcon name={name} className="h-5 w-5" />;
}

/** A tab owns its sub-routes: /courses stays lit on /courses/anything. */
function isTabActive(pathname: string, search: string, link: string) {
  if (isExternalLink(link)) {
    return pathname === "/capsule" && new URLSearchParams(search).get("url") === normalizeUrl(link);
  }
  return pathname === link || pathname.startsWith(link + "/");
}

export function TopNav() {
  const { user, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { openSearch } = useSearch();
  const { state, isMobile, openMobile, toggleSidebar } = useSidebar();
  const [menuItems, setMenuItems] = useState<NavMenuItem[]>([]);
  const [hasLevelupAccess, setHasLevelupAccess] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appsOpen, setAppsOpen] = useState(false);

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
  };

  const checkLevelupAccess = async () => {
    if (!user) return;
    // Coaches/admins always have access
    const isCoachOrAdmin =
      roles.includes("coach") || roles.includes("admin") || roles.includes("super_admin" as any);
    if (isCoachOrAdmin) {
      setHasLevelupAccess(true);
      return;
    }
    // For students, check via RPC
    const { data } = await supabase.rpc("user_has_levelup_access", { _user_id: user.id });
    setHasLevelupAccess(!!data);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const fullName = user?.user_metadata?.full_name as string | undefined;
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) || "";
  const initials = fullName
    ? fullName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  // Start with pinned items, then add DB-configured items (excluding duplicates of pinned links)
  const pinnedLinks = new Set(PINNED_NAV_ITEMS.map((p) => p.link));
  const roleFiltered =
    menuItems.length > 0
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

  // Below md the sidebar is a sheet, so "open" is a different piece of state
  // than the desktop rail's.
  const sidebarOpen = isMobile ? openMobile : state === "expanded";

  const activeIndex = visibleItems.findIndex((item) => isTabActive(pathname, search, item.link));

  // On a route outside the tabs the bar fades where it stands rather than
  // snapping back to tab 0, so returning to a tab slides from the last one.
  const lastActiveIndex = useRef(0);
  useEffect(() => {
    if (activeIndex >= 0) lastActiveIndex.current = activeIndex;
  }, [activeIndex]);
  const indicatorIndex = activeIndex >= 0 ? activeIndex : lastActiveIndex.current;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[1000] h-[60px] px-5",
        "grid grid-cols-[1fr_auto_1fr] items-center",
        // bg-card, not bg-background: the header keeps the surface colour it
        // has always had (white on the off-white page) — as a token, not a
        // hard-coded white.
        "border-b border-border bg-card",
      )}
    >
      {/* Left: sidebar control, then logo. The control lives here rather than
          floating off the sidebar's edge, where it landed on top of the first
          nav row; one button covers both jobs — the sheet below md, the icon
          rail above it. */}
      <div className="flex items-center gap-3 justify-self-start">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          className={cn(
            "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full",
            "bg-secondary text-muted-foreground transition-colors hover:bg-accent-tint",
          )}
        >
          {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
        <Link to="/dashboard" aria-label={BRAND.name + " home"} className="flex items-center">
          <img src={BRAND.assets.icon} alt={BRAND.name} className="h-[45px] w-[45px] object-contain" />
        </Link>
      </div>

      {/* Centre: the nav tabs. Hidden below md, where MobileBottomNav carries
          navigation instead — 116px tabs do not fit a phone. */}
      <nav
        aria-label="Primary"
        className="relative hidden h-full min-w-0 max-w-full overflow-x-auto scrollbar-none md:flex"
      >
        {visibleItems.map((item, i) => {
          const active = i === activeIndex;
          const to = isExternalLink(item.link) ? capsuleHref(item.label, item.link) : item.link;
          return (
            <Link
              key={item.label + i}
              to={to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-full w-[116px] shrink-0 flex-col items-center justify-center gap-1 px-3",
                "[transition:color_0.2s]",
                active ? "text-accent" : "text-foreground",
              )}
            >
              <TabIcon name={item.icon_name} />
              <span className="whitespace-nowrap font-sans text-xs font-semibold uppercase tracking-[1.11px]">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* One bar for every tab: it translates into place instead of being
            torn down and rebuilt under the newly active tab. */}
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-1 w-[116px] bg-accent"
          style={{
            transform: "translateX(" + indicatorIndex * TAB_WIDTH + "px)",
            transition: "transform 0.1s ease-in-out",
            opacity: activeIndex >= 0 ? 1 : 0,
          }}
        />
      </nav>

      {/* Right: search, apps, notifications, account. */}
      <div className="flex items-center gap-3 justify-self-end">
        <button
          type="button"
          aria-label="Search"
          title="Search (Ctrl+K)"
          onClick={openSearch}
          className={cn(
            "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full",
            "bg-secondary text-muted-foreground transition-colors hover:bg-accent-tint",
          )}
        >
          <IoSearch size={20} />
        </button>

        <Popover open={appsOpen} onOpenChange={setAppsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Apps menu"
              className={cn(
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full",
                "bg-secondary text-muted-foreground transition-colors hover:bg-accent-tint",
                appsOpen && "bg-accent-tint",
              )}
            >
              <IoApps size={20} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-3" align="end" sideOffset={8}>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Apps
            </p>
            <div className="grid grid-cols-3 gap-1">
              {APPS_MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.link}
                    type="button"
                    onClick={() => {
                      setAppsOpen(false);
                      navigate(item.link);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl p-3 text-center",
                      "transition-colors hover:bg-secondary",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-tint">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <div className="w-full min-w-0">
                      <p className="truncate text-xs font-semibold">{item.label}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <button
          type="button"
          aria-label="Notifications"
          className={cn(
            "relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full",
            "bg-secondary text-muted-foreground transition-colors hover:bg-accent-tint",
          )}
        >
          <IoNotifications size={20} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
            >
              <Avatar className="h-[30px] w-[30px]">
                <AvatarImage src={avatarUrl} alt={fullName || "Account"} />
                <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="mb-1 border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium">{fullName || user?.email}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {roles.join(", ") || "student"}
              </p>
            </div>
            <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => navigate("/my-account")}>
              <UserCircle className="mr-2 h-4 w-4" /> My Account
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => navigate("/messages")}>
              <MessageCircle className="mr-2 h-4 w-4" /> Messages
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
