import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Compass, MessageCircle, Radio, Trophy, Users2, Link2, X, LifeBuoy } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MenuRow {
  label: string;
  link: string;
  icon: typeof Compass;
  badgeCount?: number;
  showDot?: boolean;
}

export function MobileMenuSheet({ open, onOpenChange }: MobileMenuSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user || !open) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      if (!cancelled) setUnreadMessages(count || 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, open]);

  const rows: MenuRow[] = [
    { label: "Feed", link: "/feed", icon: Compass },
    { label: "Messages", link: "/messages", icon: MessageCircle, badgeCount: unreadMessages },
    { label: "Channels", link: "/channels", icon: Radio, showDot: true },
    { label: "Champions", link: "/leaderboard", icon: Trophy, showDot: true },
    { label: "Groups", link: "/channels", icon: Users2, showDot: true },
    { label: "Support", link: "/support", icon: LifeBuoy },
    { label: "Links", link: "/referral", icon: Link2 },
  ];

  const handleNavigate = (link: string) => {
    onOpenChange(false);
    navigate(link);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="p-0 gap-0 rounded-b-2xl border-none shadow-xl [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="flex items-center justify-end px-4 py-3">
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close menu"
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="pb-2">
          {rows.map((row) => {
            const isActive = location.pathname === row.link;
            const Icon = row.icon;
            return (
              <button
                key={row.label}
                onClick={() => handleNavigate(row.link)}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 text-left border-b border-border/60 last:border-b-0 transition-colors",
                  isActive ? "bg-accent/10" : "hover:bg-secondary/60",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-accent" : "text-accent/80")} />
                <span
                  className={cn(
                    "flex-1 text-[15px] font-semibold",
                    isActive ? "text-accent" : "text-foreground",
                  )}
                >
                  {row.label}
                </span>
                {!!row.badgeCount && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center">
                    {row.badgeCount > 9 ? "9+" : row.badgeCount}
                  </span>
                )}
                {row.showDot && !row.badgeCount && (
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                )}
              </button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
