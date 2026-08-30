import { Hash, Lock, Megaphone, Pin, Search, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChannelHeaderProps {
  name: string;
  type: string;
  description: string | null;
  memberCount: number;
  pinnedCount: number;
  onTogglePins: () => void;
  onToggleMembers: () => void;
  onToggleSearch: () => void;
  showPins: boolean;
  /** The channel's own picture, like a group DP. */
  avatarUrl?: string | null;
  /** The banner behind it. */
  coverUrl?: string | null;
  /** "admins" means a broadcast: members read, the owner writes. */
  postPolicy?: string;
  canManage?: boolean;
  onOpenSettings?: () => void;
  onOpenMembers?: () => void;
}

export function ChannelHeader({
  name,
  type,
  description,
  memberCount,
  pinnedCount,
  onTogglePins,
  onToggleMembers,
  onToggleSearch,
  showPins,
  avatarUrl,
  coverUrl,
  postPolicy = "everyone",
  canManage = false,
  onOpenSettings,
  onOpenMembers,
}: ChannelHeaderProps) {
  const broadcast = postPolicy === "admins" || type === "announcement";
  const Icon = broadcast ? Megaphone : type === "private" ? Lock : Hash;

  return (
    <div className="border-b border-border bg-card shrink-0">
      {/* The cover only takes space when there is one to show. */}
      {coverUrl && (
        <div className="h-24 w-full overflow-hidden">
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className={cn("px-4 py-2.5 flex items-center gap-3", coverUrl && "-mt-6 relative")}>
        <div
          className={cn(
            "h-10 w-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center",
            coverUrl ? "border-4 border-card h-12 w-12" : "bg-secondary",
          )}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base truncate">{name}</h3>
            {broadcast && (
              <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                <Megaphone className="h-3 w-3" /> Broadcast
              </Badge>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onOpenMembers ?? onToggleMembers}
          >
            <Users className="h-3.5 w-3.5" />
            {memberCount}
          </Button>

          {pinnedCount > 0 && (
            <Button
              variant={showPins ? "secondary" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={onTogglePins}
            >
              <Pin className="h-3.5 w-3.5" />
              {pinnedCount}
            </Button>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleSearch}>
            <Search className="h-4 w-4" />
          </Button>

          {canManage && onOpenSettings && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onOpenSettings}
              aria-label="Channel settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
