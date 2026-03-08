import { Hash, Lock, Megaphone, Pin, Users, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
}: ChannelHeaderProps) {
  const Icon = type === "announcement" ? Megaphone : type === "private" ? Lock : Hash;

  return (
    <div className="px-4 py-2.5 border-b border-border flex items-center gap-3 bg-card shrink-0">
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-base">{name}</h3>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={onToggleMembers}>
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
      </div>
    </div>
  );
}
