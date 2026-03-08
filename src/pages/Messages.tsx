import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Conversation {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  last_message: string;
  last_time: string;
  unread: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function Messages() {
  const { recipientId } = useParams<{ recipientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipient, setRecipient] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (recipientId) {
      loadChat();
    } else {
      loadConversations();
    }
  }, [recipientId, user]);

  useEffect(() => {
    if (!recipientId || !user) return;
    const channel = supabase
      .channel("chat-" + recipientId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
        const msg = payload.new as Message;
        if (
          (msg.sender_id === user.id && msg.receiver_id === recipientId) ||
          (msg.sender_id === recipientId && msg.receiver_id === user.id)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recipientId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!data) return;

    const convMap: Record<string, { msgs: Message[] }> = {};
    data.forEach((m: any) => {
      const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!convMap[otherId]) convMap[otherId] = { msgs: [] };
      convMap[otherId].msgs.push(m);
    });

    const userIds = Object.keys(convMap);
    if (userIds.length === 0) { setConversations([]); return; }

    const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);

    const convs: Conversation[] = userIds.map((uid) => {
      const msgs = convMap[uid].msgs;
      const p = profiles?.find((pr) => pr.id === uid);
      const unread = msgs.filter((m) => m.receiver_id === user.id && !m.is_read).length;
      return {
        user_id: uid,
        full_name: p?.full_name || "User",
        avatar_url: p?.avatar_url || null,
        last_message: msgs[0]?.message || "",
        last_time: msgs[0]?.created_at || "",
        unread,
      };
    }).sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());

    setConversations(convs);
  };

  const loadChat = async () => {
    if (!user || !recipientId) return;
    const [msgsRes, profileRes] = await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(200),
      supabase.from("profiles").select("full_name, avatar_url").eq("id", recipientId).single(),
    ]);

    if (msgsRes.data) setMessages(msgsRes.data as Message[]);
    if (profileRes.data) setRecipient(profileRes.data);

    // Mark as read
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", recipientId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !user || !recipientId || sending) return;
    setSending(true);
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: recipientId,
      message: newMsg.trim(),
    });
    setNewMsg("");
    setSending(false);
  };

  // Conversation list view
  if (!recipientId) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-6 px-4">
          <h1 className="text-xl font-bold mb-4">Messages</h1>
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No conversations yet</div>
          ) : (
            <div className="space-y-2">
              {conversations.map((c) => (
                <Card
                  key={c.user_id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/messages/${c.user_id}`)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-accent/20 text-accent text-sm font-bold">
                        {c.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold truncate">{c.full_name}</p>
                        <span className="text-xs text-muted-foreground">
                          {c.last_time ? new Date(c.last_time).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.last_message}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="h-5 w-5 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold">
                        {c.unread}
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // Chat view
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Chat header */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-card sticky top-14 z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/messages")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-accent/20 text-accent text-xs font-bold">
              {recipient?.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <p
            className="font-semibold text-sm cursor-pointer hover:text-accent transition-colors"
            onClick={() => navigate(`/profile/${recipientId}`)}
          >
            {recipient?.full_name || "User"}
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isMine ? "bg-accent text-accent-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"
                }`}>
                  {msg.message}
                  <span className={`block text-[10px] mt-0.5 ${isMine ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border bg-card flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1"
          />
          <Button size="icon" onClick={sendMessage} disabled={sending || !newMsg.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
