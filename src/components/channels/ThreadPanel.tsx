import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChannelMessage, MessageData } from "./ChannelMessage";
import { MessageInput } from "./MessageInput";

interface ThreadPanelProps {
  parentMessage: MessageData;
  channelId: string;
  currentUserId: string;
  isCoachOrAdmin: boolean;
  onClose: () => void;
  onReact: (msgId: string, emoji: string) => void;
  onPin: (msgId: string, pin: boolean) => void;
  onDelete: (msgId: string) => void;
}

export function ThreadPanel({
  parentMessage,
  channelId,
  currentUserId,
  isCoachOrAdmin,
  onClose,
  onReact,
  onPin,
  onDelete,
}: ThreadPanelProps) {
  const [replies, setReplies] = useState<MessageData[]>([]);

  const loadReplies = async () => {
    const { data } = await supabase
      .from("channel_messages")
      .select("*")
      .eq("parent_id", parentMessage.id)
      .order("created_at", { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      // Load reactions
      const msgIds = data.map((m: any) => m.id);
      const { data: reactions } = msgIds.length > 0
        ? await supabase.from("message_reactions").select("*").in("message_id", msgIds)
        : { data: [] };

      setReplies(
        data.map((m: any) => ({
          ...m,
          profile: profiles?.find((p) => p.id === m.user_id) || { full_name: "User", avatar_url: null },
          reactions: buildReactions(m.id, reactions || [], currentUserId),
        }))
      );
    }
  };

  useEffect(() => {
    loadReplies();

    const channel = supabase
      .channel(`thread-${parentMessage.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "channel_messages",
        filter: `parent_id=eq.${parentMessage.id}`,
      }, () => loadReplies())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [parentMessage.id]);

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-bold text-sm">Thread</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {/* Parent message */}
        <div className="border-b border-border">
          <ChannelMessage
            message={parentMessage}
            currentUserId={currentUserId}
            isCoachOrAdmin={isCoachOrAdmin}
            onOpenThread={() => {}}
            onReact={onReact}
            onPin={onPin}
            onDelete={onDelete}
            isThreadView
          />
        </div>

        <div className="px-4 py-2">
          <p className="text-xs text-muted-foreground font-medium">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </p>
        </div>

        {/* Thread replies */}
        {replies.map((r) => (
          <ChannelMessage
            key={r.id}
            message={r}
            currentUserId={currentUserId}
            isCoachOrAdmin={isCoachOrAdmin}
            onOpenThread={() => {}}
            onReact={onReact}
            onPin={onPin}
            onDelete={onDelete}
            isThreadView
          />
        ))}
      </ScrollArea>

      <MessageInput
        channelId={channelId}
        userId={currentUserId}
        parentId={parentMessage.id}
        placeholder="Reply in thread..."
        onSent={loadReplies}
      />
    </div>
  );
}

function buildReactions(msgId: string, reactions: any[], currentUserId: string) {
  const map: Record<string, { count: number; users: string[] }> = {};
  reactions
    .filter((r) => r.message_id === msgId)
    .forEach((r) => {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, users: [] };
      map[r.emoji].count++;
      map[r.emoji].users.push(r.user_id);
    });
  return Object.entries(map).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    users: data.users,
    myReaction: data.users.includes(currentUserId),
  }));
}
