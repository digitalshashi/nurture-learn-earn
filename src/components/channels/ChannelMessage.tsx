import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, Pin, Smile, MoreHorizontal, Trash2, FileText, Download, Edit2 } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "💯"];

export interface MessageData {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  parent_id: string | null;
  is_pinned: boolean;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  profile?: { full_name: string; avatar_url: string | null };
  reactions?: { emoji: string; count: number; users: string[]; myReaction: boolean }[];
  thread_count?: number;
}

interface ChannelMessageProps {
  message: MessageData;
  currentUserId: string;
  isCoachOrAdmin: boolean;
  onOpenThread: (msgId: string) => void;
  onReact: (msgId: string, emoji: string) => void;
  onPin: (msgId: string, pin: boolean) => void;
  onDelete: (msgId: string) => void;
  isThreadView?: boolean;
}

export function ChannelMessage({
  message,
  currentUserId,
  isCoachOrAdmin,
  onOpenThread,
  onReact,
  onPin,
  onDelete,
  isThreadView = false,
}: ChannelMessageProps) {
  const [hovered, setHovered] = useState(false);
  const isMine = message.user_id === currentUserId;
  const name = message.profile?.full_name || "User";

  // Parse @mentions in content
  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="bg-primary/15 text-primary font-medium rounded px-0.5">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div
      className={`group relative flex gap-3 px-4 py-1.5 hover:bg-secondary/30 transition-colors ${
        message.is_pinned ? "bg-accent/5 border-l-2 border-accent" : ""
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm">{name}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), "h:mm a")}
          </span>
          {message.is_pinned && (
            <span className="text-xs text-accent flex items-center gap-0.5">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
        </div>

        <div className="text-sm leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
          {renderContent(message.content)}
        </div>

        {/* File attachment */}
        {message.file_url && (
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 border border-border rounded-lg p-2.5 hover:bg-secondary/40 transition-colors max-w-xs"
          >
            {message.file_type?.startsWith("image/") ? (
              <img
                src={message.file_url}
                alt={message.file_name || "Image"}
                className="max-w-[280px] max-h-[200px] rounded object-cover"
              />
            ) : (
              <>
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{message.file_name || "File"}</p>
                  <p className="text-xs text-muted-foreground">{message.file_type || "Unknown"}</p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground shrink-0" />
              </>
            )}
          </a>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact(message.id, r.emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  r.myReaction
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}

        {/* Thread indicator */}
        {!isThreadView && message.thread_count && message.thread_count > 0 && (
          <button
            onClick={() => onOpenThread(message.id)}
            className="flex items-center gap-1.5 mt-1.5 text-xs text-primary hover:underline font-medium"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {message.thread_count} {message.thread_count === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* Hover actions */}
      {hovered && (
        <div className="absolute right-3 -top-3 flex items-center gap-0.5 bg-card border border-border rounded-md shadow-sm p-0.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top">
              <div className="flex gap-1">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => onReact(message.id, e)}
                    className="text-lg hover:scale-125 transition-transform p-1"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {!isThreadView && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenThread(message.id)}>
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}

          {(isMine || isCoachOrAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isCoachOrAdmin && (
                  <DropdownMenuItem onClick={() => onPin(message.id, !message.is_pinned)}>
                    <Pin className="h-4 w-4 mr-2" />
                    {message.is_pinned ? "Unpin" : "Pin message"}
                  </DropdownMenuItem>
                )}
                {(isMine || isCoachOrAdmin) && (
                  <DropdownMenuItem
                    onClick={() => onDelete(message.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
