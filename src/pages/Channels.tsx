import { useEffect, useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ChannelSidebar } from "@/components/channels/ChannelSidebar";
import { ChannelHeader } from "@/components/channels/ChannelHeader";
import { ChannelMessage, MessageData } from "@/components/channels/ChannelMessage";
import { MessageInput } from "@/components/channels/MessageInput";
import { ThreadPanel } from "@/components/channels/ThreadPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pin, X, Search, UserPlus, UserMinus } from "lucide-react";
import { format } from "date-fns";

interface Channel {
  id: string;
  name: string;
  channel_type: string;
  is_global: boolean;
  description: string | null;
  unread?: number;
}

interface MemberProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role?: string;
}

export default function Channels() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [threadMessage, setThreadMessage] = useState<MessageData | null>(null);
  const [showPins, setShowPins] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [msgSearch, setMsgSearch] = useState("");
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isCoachOrAdmin = hasRole("coach") || hasRole("admin") || hasRole("super_admin");

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    const { data } = await supabase.from("channels").select("*").order("created_at");
    if (data) {
      setChannels(data.map((c: any) => ({ ...c, description: c.description || null })));
      if (!selectedChannel && data.length > 0) setSelectedChannel(data[0]);
    }
  }, [selectedChannel]);

  // Fetch messages for selected channel
  const fetchMessages = useCallback(async (channelId: string) => {
    const { data } = await supabase
      .from("channel_messages")
      .select("*")
      .eq("channel_id", channelId)
      .is("parent_id", null)
      .order("created_at", { ascending: true })
      .limit(200);

    if (!data) return;

    const userIds = [...new Set(data.map((m: any) => m.user_id))];
    const msgIds = data.map((m: any) => m.id);

    const [profilesRes, reactionsRes, threadsRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
        : { data: [] },
      msgIds.length > 0
        ? supabase.from("message_reactions").select("*").in("message_id", msgIds)
        : { data: [] },
      msgIds.length > 0
        ? supabase
            .from("channel_messages")
            .select("parent_id")
            .in("parent_id", msgIds)
        : { data: [] },
    ]);

    const profiles = profilesRes.data || [];
    const reactions = reactionsRes.data || [];
    const threadCounts: Record<string, number> = {};
    (threadsRes.data || []).forEach((t: any) => {
      threadCounts[t.parent_id] = (threadCounts[t.parent_id] || 0) + 1;
    });

    setMessages(
      data.map((m: any) => ({
        ...m,
        profile: profiles.find((p: any) => p.id === m.user_id) || { full_name: "User", avatar_url: null },
        reactions: buildReactions(m.id, reactions, user?.id || ""),
        thread_count: threadCounts[m.id] || 0,
      }))
    );

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [user?.id]);

  // Fetch channel members
  const fetchMembers = useCallback(async (channelId: string) => {
    const { data } = await supabase
      .from("channel_members")
      .select("user_id, role")
      .eq("channel_id", channelId);

    if (data && data.length > 0) {
      const ids = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);

      setMembers(
        (profiles || []).map((p: any) => ({
          ...p,
          role: data.find((m: any) => m.user_id === p.id)?.role || "member",
        }))
      );
    } else {
      setMembers([]);
    }
  }, []);

  useEffect(() => { fetchChannels(); }, []);

  useEffect(() => {
    if (!selectedChannel) return;
    fetchMessages(selectedChannel.id);
    fetchMembers(selectedChannel.id);
    setThreadMessage(null);
    setShowPins(false);
    setShowMembers(false);
    setShowSearch(false);
    setMsgSearch("");

    const channel = supabase
      .channel(`ch-msgs-${selectedChannel.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "channel_messages",
        filter: `channel_id=eq.${selectedChannel.id}`,
      }, () => fetchMessages(selectedChannel.id))
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "message_reactions",
      }, () => fetchMessages(selectedChannel.id))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedChannel?.id]);

  const createChannel = async (name: string, type: string, description: string) => {
    const { error } = await supabase.from("channels").insert({
      name,
      channel_type: type,
      description,
      created_by: user!.id,
      is_global: type !== "private",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    fetchChannels();
    toast({ title: "Channel created!" });
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!user) return;
    // Toggle: check if reaction exists
    const { data: existing } = await supabase
      .from("message_reactions")
      .select("id")
      .eq("message_id", msgId)
      .eq("user_id", user.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({
        message_id: msgId,
        user_id: user.id,
        emoji,
      });
    }
  };

  const handlePin = async (msgId: string, pin: boolean) => {
    await supabase.from("channel_messages").update({ is_pinned: pin }).eq("id", msgId);
    if (selectedChannel) fetchMessages(selectedChannel.id);
    toast({ title: pin ? "Message pinned" : "Message unpinned" });
  };

  const handleDelete = async (msgId: string) => {
    await supabase.from("channel_messages").delete().eq("id", msgId);
    if (selectedChannel) fetchMessages(selectedChannel.id);
  };

  const handleOpenThread = (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (msg) setThreadMessage(msg);
  };

  // Filter channels by search
  const filteredChannels = channels.filter((c) =>
    !sidebarSearch || c.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  const pinnedMessages = messages.filter((m) => m.is_pinned);
  const pinnedCount = pinnedMessages.length;
  const isAnnouncement = selectedChannel?.channel_type === "announcement";
  const canPost = !isAnnouncement || isCoachOrAdmin;

  // Message search
  const displayMessages = msgSearch
    ? messages.filter((m) => m.content.toLowerCase().includes(msgSearch.toLowerCase()))
    : showPins
    ? pinnedMessages
    : messages;

  // Group messages by date
  const groupedMessages: { date: string; msgs: MessageData[] }[] = [];
  displayMessages.forEach((m) => {
    const dateStr = format(new Date(m.created_at), "MMMM d, yyyy");
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateStr) {
      last.msgs.push(m);
    } else {
      groupedMessages.push({ date: dateStr, msgs: [m] });
    }
  });

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-var(--nav-height))]">
        {/* Sidebar */}
        <ChannelSidebar
          channels={filteredChannels}
          selectedChannelId={selectedChannel?.id || null}
          onSelectChannel={setSelectedChannel}
          onCreateChannel={createChannel}
          isCoachOrAdmin={isCoachOrAdmin}
          searchQuery={sidebarSearch}
          onSearchChange={setSidebarSearch}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChannel ? (
            <>
              <ChannelHeader
                name={selectedChannel.name}
                type={selectedChannel.channel_type}
                description={selectedChannel.description}
                memberCount={members.length}
                pinnedCount={pinnedCount}
                onTogglePins={() => { setShowPins(!showPins); setShowMembers(false); setShowSearch(false); }}
                onToggleMembers={() => { setShowMembers(!showMembers); setShowPins(false); setShowSearch(false); }}
                onToggleSearch={() => { setShowSearch(!showSearch); setShowPins(false); setShowMembers(false); }}
                showPins={showPins}
              />

              {/* Search bar */}
              {showSearch && (
                <div className="px-4 py-2 border-b border-border flex items-center gap-2 bg-secondary/30">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={msgSearch}
                    onChange={(e) => setMsgSearch(e.target.value)}
                    placeholder="Search messages..."
                    className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-0"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowSearch(false); setMsgSearch(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Pinned banner */}
              {showPins && (
                <div className="px-4 py-2 border-b border-border bg-accent/5 flex items-center gap-2">
                  <Pin className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Pinned Messages ({pinnedCount})</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setShowPins(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1">
                <div className="py-2">
                  {groupedMessages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-12">
                      {msgSearch ? "No messages match your search" : showPins ? "No pinned messages" : "No messages yet — start the conversation!"}
                    </p>
                  ) : (
                    groupedMessages.map((group) => (
                      <div key={group.date}>
                        <div className="flex items-center gap-3 px-4 py-2">
                          <div className="flex-1 border-t border-border" />
                          <span className="text-xs text-muted-foreground font-medium">{group.date}</span>
                          <div className="flex-1 border-t border-border" />
                        </div>
                        {group.msgs.map((m) => (
                          <ChannelMessage
                            key={m.id}
                            message={m}
                            currentUserId={user?.id || ""}
                            isCoachOrAdmin={isCoachOrAdmin}
                            onOpenThread={handleOpenThread}
                            onReact={handleReact}
                            onPin={handlePin}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {canPost && selectedChannel && user && (
                <MessageInput
                  channelId={selectedChannel.id}
                  userId={user.id}
                  onSent={() => fetchMessages(selectedChannel.id)}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a channel to start chatting
            </div>
          )}
        </div>

        {/* Thread Panel */}
        {threadMessage && selectedChannel && user && (
          <ThreadPanel
            parentMessage={threadMessage}
            channelId={selectedChannel.id}
            currentUserId={user.id}
            isCoachOrAdmin={isCoachOrAdmin}
            onClose={() => setThreadMessage(null)}
            onReact={handleReact}
            onPin={handlePin}
            onDelete={handleDelete}
          />
        )}

        {/* Members Panel */}
        {showMembers && (
          <div className="w-72 border-l border-border bg-card flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-sm">Members ({members.length})</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowMembers(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-secondary/40">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {m.full_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.full_name}</p>
                    </div>
                    {m.role && m.role !== "member" && (
                      <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No members yet</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function buildReactions(msgId: string, reactions: any[], currentUserId: string) {
  const map: Record<string, { count: number; users: string[] }> = {};
  reactions
    .filter((r: any) => r.message_id === msgId)
    .forEach((r: any) => {
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
