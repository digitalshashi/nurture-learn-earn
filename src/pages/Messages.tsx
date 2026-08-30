import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, PenSquare, Search, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { MessageThread } from "@/components/messages/MessageThread";
import { NewChatDialog } from "@/components/messages/NewChatDialog";
import {
  fetchConversations,
  initials,
  shortAge,
  type ConversationSummary,
} from "@/lib/messaging";

interface Party {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * The inbox.
 *
 * Two panes side by side on desktop, one at a time on mobile — the route is
 * the same either way, so a link to a conversation works from anywhere and the
 * back button behaves. /messages is the list; /messages/:id is the thread.
 */
export default function Messages() {
  const { recipientId } = useParams<{ recipientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [composing, setComposing] = useState(false);
  const [other, setOther] = useState<Party | null>(null);

  const reload = useCallback(async () => {
    const rows = await fetchConversations();
    setConversations(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    void reload();
  }, [user, reload]);

  // The list has to move when a message arrives while it is on screen — that
  // is most of what makes an inbox feel live rather than cached.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`inbox:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => void reload(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, reload]);

  // Whoever the open thread is with. Taken from the list when it is already
  // there, and fetched when the thread was opened from a link or a fresh pick.
  useEffect(() => {
    if (!recipientId) {
      setOther(null);
      return;
    }

    const known = conversations.find((c) => c.other_user_id === recipientId);
    if (known) {
      setOther({
        id: known.other_user_id,
        full_name: known.full_name,
        avatar_url: known.avatar_url,
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", recipientId)
        .maybeSingle();
      if (!cancelled) {
        setOther(
          data
            ? { id: data.id, full_name: data.full_name, avatar_url: data.avatar_url }
            : { id: recipientId, full_name: null, avatar_url: null },
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recipientId, conversations]);

  const visible = conversations.filter((c) =>
    (c.full_name || "").toLowerCase().includes(search.trim().toLowerCase()),
  );

  const list = (
    <div className="flex h-full min-h-0 flex-col border-border lg:border-r">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">Messages</h1>
          <Button
            size="sm"
            onClick={() => setComposing(true)}
            className="h-9 gap-1.5 touch-manipulation"
          >
            <PenSquare className="h-4 w-4" /> New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="h-10 rounded-full pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">
              {search ? "No conversations match" : "No conversations yet"}
            </p>
            {!search && (
              <p className="mt-1 text-xs text-muted-foreground">
                Start one with anyone who has enrolled or bought from you.
              </p>
            )}
          </div>
        ) : (
          <ul>
            {visible.map((c) => {
              const active = c.other_user_id === recipientId;
              const unread = Number(c.unread_count) > 0;
              const youSpokeLast = c.last_sender_id === user?.id;

              return (
                <li key={c.other_user_id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/messages/${c.other_user_id}`)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation",
                      active ? "bg-muted" : "hover:bg-muted/50 active:bg-muted",
                    )}
                  >
                    <Avatar className="h-11 w-11 shrink-0">
                      {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                      <AvatarFallback className="bg-accent/15 text-sm font-semibold text-accent">
                        {initials(c.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            unread ? "font-bold" : "font-medium",
                          )}
                        >
                          {c.full_name || "Member"}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {shortAge(c.last_at)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "truncate text-xs",
                          unread ? "font-semibold text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {youSpokeLast && "You: "}
                        {c.last_message}
                      </p>
                    </div>

                    {unread && (
                      <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                        {c.unread_count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="grid h-[calc(100vh-var(--nav-height))] min-h-0 lg:grid-cols-[340px_1fr]">
        {/* Mobile shows one pane at a time; desktop shows both. */}
        <div className={cn("min-h-0", recipientId ? "hidden lg:flex lg:flex-col" : "flex flex-col")}>
          {list}
        </div>

        <div className={cn("min-h-0", recipientId ? "flex flex-col" : "hidden lg:flex lg:flex-col")}>
          {recipientId && other && user ? (
            <MessageThread
              key={other.id}
              meId={user.id}
              other={other}
              onActivity={reload}
              className="h-full"
            />
          ) : (
            <div className="hidden h-full flex-col items-center justify-center gap-2 text-center lg:flex">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Pick a conversation</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Or start a new one with anyone who has enrolled or bought from you.
              </p>
            </div>
          )}
        </div>
      </div>

      <NewChatDialog
        open={composing}
        onOpenChange={setComposing}
        onPick={(person) => {
          setComposing(false);
          setOther({
            id: person.user_id,
            full_name: person.full_name,
            avatar_url: person.avatar_url,
          });
          navigate(`/messages/${person.user_id}`);
        }}
      />
    </AppLayout>
  );
}
