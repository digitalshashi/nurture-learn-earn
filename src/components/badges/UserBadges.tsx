import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface BadgeData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  icon_url: string | null;
  badge_type: string;
}

interface UserBadgesProps {
  userId: string;
  maxVisible?: number;
  size?: "sm" | "md";
}

export function UserBadges({ userId, maxVisible = 3, size = "sm" }: UserBadgesProps) {
  const [badges, setBadges] = useState<BadgeData[]>([]);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await supabase
        .from("user_badges" as any)
        .select("badge_id")
        .eq("user_id", userId);
      if (!data || data.length === 0) return;

      const badgeIds = (data as any[]).map((ub) => ub.badge_id);
      const { data: badgeData } = await supabase
        .from("badges")
        .select("id, name, description, icon, icon_url, badge_type")
        .in("id", badgeIds);
      if (badgeData) setBadges(badgeData as any as BadgeData[]);
    };
    load();
  }, [userId]);

  if (badges.length === 0) return null;

  const visible = badges.slice(0, maxVisible);
  const overflow = badges.length - maxVisible;
  const iconSize = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="inline-flex items-center gap-0.5">
        {visible.map((b) => (
          <Tooltip key={b.id}>
            <TooltipTrigger asChild>
              <span className={`inline-flex items-center justify-center ${iconSize} rounded-full shrink-0 cursor-default`}>
                {b.icon_url ? (
                  <img src={b.icon_url} alt={b.name} className={`${iconSize} rounded-full object-cover`} />
                ) : (
                  <span className={textSize}>{b.icon || "🏅"}</span>
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-48">
              <p className="font-semibold">{b.name}</p>
              {b.description && <p className="text-muted-foreground">{b.description}</p>}
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <button className={`${textSize} text-muted-foreground hover:text-foreground font-medium ml-0.5`}>
                +{overflow}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>All Badges</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                {badges.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg border">
                    <span className="text-xl shrink-0">
                      {b.icon_url ? (
                        <img src={b.icon_url} alt={b.name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        b.icon || "🏅"
                      )}
                    </span>
                    <div>
                      <p className="text-xs font-semibold">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground">{b.badge_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
}
