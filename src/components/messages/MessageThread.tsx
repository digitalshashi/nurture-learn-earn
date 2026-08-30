import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  belongsToThread,
  clockTime,
  continuesRun,
  dayLabel,
  fetchThread,
  initials,
  markConversationRead,
  mergeMessage,
  sendMessage,
  startsNewDay,
  type ChatMessage,
} from "@/lib/messaging";

interface Party {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** How long a typing indicator survives without another keystroke. */
const TYPING_TIMEOUT = 2500;

export function MessageThread({
  meId,
  other,
  onActivity,
  className,
}: {
  meId: string;
  other: Party;
  /** Fires when this thread changes something the conversation list shows. */
  onActivity?: () => void;
  className?: string;
}) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theyAreTyping, setTheyAreTyping] = useState(false);
  const [theyAreOnline, setTheyAreOnline] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // ------------------------------------------------------------- history --
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const history = await fetchThread(meId, other.id);
      if (cancelled) return;
      setMessages(history);
      setLoading(false);
      await markConversationRead(other.id);
      onActivity?.();
      // Jump rather than glide on first paint: animating from the top of a
      // long history is a scroll the reader did not ask for.
      requestAnimationFrame(() => scrollToBottom("auto"));
    })();

    return () => {
      cancelled = true;
    };
    // onActivity is intentionally omitted: it changes identity on every render
    // of the parent and would reload the thread each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, other.id, scrollToBottom]);

  // ------------------------------------------------------------ realtime --
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${meId}:${other.id}`)
      // Anything sent to me. Filtered server-side so this socket is not woken
      // by every message on the platform.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${meId}` },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          if (!belongsToThread(incoming, meId, other.id)) return;

          setMessages((prev) => mergeMessage(prev, incoming));
          // Reading it while the thread is open is the same as reading it.
          void markConversationRead(other.id).then(() => onActivity?.());
        },
      )
      // My own messages being marked read — this is the "Seen" tick.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `sender_id=eq.${meId}` },
        (payload) => {
          const updated = payload.new as ChatMessage;
          if (!belongsToThread(updated, meId, other.id)) return;
          setMessages((prev) => mergeMessage(prev, updated));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [meId, other.id, onActivity]);

  // --------------------------------------------------- typing & presence --
  useEffect(() => {
    // One channel name for the pair, whichever side opens it first.
    const pair = [meId, other.id].sort().join("__");
    const channel = supabase.channel(`dm:${pair}`, {
      config: { presence: { key: meId } },
    });

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.from !== other.id) return;
        setTheyAreTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        // The sender does not tell us when they stop; it lapses.
        typingTimerRef.current = setTimeout(() => setTheyAreTyping(false), TYPING_TIMEOUT);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setTheyAreOnline(Boolean(state[other.id]?.length));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ at: Date.now() });
      });

    typingChannelRef.current = channel;

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [meId, other.id]);

  const announceTyping = () => {
    const now = Date.now();
    // Throttled: a broadcast per keystroke is a lot of socket traffic to say
    // one boolean.
    if (now - lastTypingSentRef.current < 1200) return;
    lastTypingSentRef.current = now;
    void typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { from: meId },
    });
  };

  // --------------------------------------------------------------- scroll --
  useEffect(() => {
    if (atBottom) scrollToBottom();
  }, [messages, theyAreTyping, atBottom, scrollToBottom]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    // A little slack, so being a few pixels off the end still counts.
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };

  // ----------------------------------------------------------------- send --
  const submit = async () => {
    const body = draft.trim();
    if (!body || sending) return;

    setError(null);
    setSending(true);
    setDraft("");

    // Optimistic: the message appears immediately and is reconciled when the
    // server confirms it. mergeMessage is what keeps the confirmed row from
    // landing beside this one instead of replacing it.
    const localId = `pending-${crypto.randomUUID()}`;
    const optimistic: ChatMessage = {
      id: localId,
      sender_id: meId,
      receiver_id: other.id,
      message: body,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setAtBottom(true);

    const { message: saved, error: sendError } = await sendMessage(other.id, body);
    setSending(false);

    if (!saved) {
      setError(sendError);
      // The bubble stays, marked as failed, rather than vanishing — losing
      // what someone typed is worse than showing them it did not go.
      setMessages((prev) =>
        prev.map((m) => (m.id === localId ? { ...m, pending: false, failed: true } : m)),
      );
      return;
    }

    setMessages((prev) =>
      mergeMessage(
        prev.filter((m) => m.id !== localId),
        saved,
      ),
    );
    onActivity?.();
  };

  const lastMineRead = [...messages]
    .reverse()
    .find((m) => m.sender_id === meId && m.is_read);

  return (
    <div className={cn("flex min-h-0 flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-2.5 lg:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 lg:hidden"
          onClick={() => navigate("/messages")}
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="relative shrink-0">
          <Avatar className="h-9 w-9">
            {other.avatar_url && <AvatarImage src={other.avatar_url} />}
            <AvatarFallback className="bg-accent/15 text-xs font-semibold text-accent">
              {initials(other.full_name)}
            </AvatarFallback>
          </Avatar>
          {theyAreOnline && (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500"
              aria-label="Online"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate(`/profile/${other.id}`)}
            className="block max-w-full truncate text-sm font-semibold hover:text-accent"
          >
            {other.full_name || "Member"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            {theyAreTyping ? "typing…" : theyAreOnline ? "Active now" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="relative flex-1 overflow-y-auto overscroll-contain px-3 py-4 lg:px-4"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Say hello to {other.full_name || "them"}.
          </p>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-0.5">
            {messages.map((message, i) => {
              const previous = messages[i - 1];
              const mine = message.sender_id === meId;
              const newDay = startsNewDay(message, previous);
              const runs = !newDay && continuesRun(message, previous);
              const showSeen = mine && lastMineRead?.id === message.id;

              return (
                <div key={message.id}>
                  {newDay && (
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {dayLabel(message.created_at)}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex",
                      mine ? "justify-end" : "justify-start",
                      runs ? "mt-0.5" : "mt-2",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] px-3 py-2 text-sm sm:max-w-[70%]",
                        mine
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-foreground",
                        // Rounded as a run: only the outer corners of a group
                        // stay full, which is what makes consecutive messages
                        // read as one block.
                        "rounded-2xl",
                        mine && runs && "rounded-tr-md",
                        mine && "rounded-br-md",
                        !mine && runs && "rounded-tl-md",
                        !mine && "rounded-bl-md",
                        message.failed && "opacity-70 ring-1 ring-destructive",
                        message.pending && "opacity-60",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.message}</p>
                      <span
                        className={cn(
                          "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
                          mine ? "text-accent-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {message.failed ? (
                          <>
                            <AlertCircle className="h-3 w-3" /> Not sent
                          </>
                        ) : message.pending ? (
                          "Sending…"
                        ) : (
                          clockTime(message.created_at)
                        )}
                      </span>
                    </div>
                  </div>

                  {showSeen && (
                    <p className="mt-0.5 pr-1 text-right text-[10px] text-muted-foreground">
                      Seen
                    </p>
                  )}
                </div>
              );
            })}

            {theyAreTyping && (
              <div className="mt-2 flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-secondary px-3 py-2.5">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
                      style={{ animationDelay: `${dot * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Jump to latest, when the reader has scrolled away from it. */}
      {!atBottom && !loading && (
        <div className="pointer-events-none relative">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setAtBottom(true);
              scrollToBottom();
            }}
            className="pointer-events-auto absolute -top-12 left-1/2 z-10 h-9 -translate-x-1/2 rounded-full shadow-md"
          >
            <ChevronDown className="mr-1 h-4 w-4" /> Latest
          </Button>
        </div>
      )}

      {/* Composer */}
      <div
        className="shrink-0 border-t border-border bg-card px-3 py-2.5 lg:px-4"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      >
        {error && (
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              announceTyping();
            }}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter is a new line, as every chat does it.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={`Message ${other.full_name?.split(" ")[0] || ""}`.trim()}
            rows={1}
            className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-2xl py-3"
          />
          <Button
            size="icon"
            onClick={() => void submit()}
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            className="h-11 w-11 shrink-0 rounded-full transition-transform active:scale-95 touch-manipulation"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MessageThread;
