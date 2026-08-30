/**
 * Direct messaging: the data access and the presentation rules.
 *
 * The rules live here rather than in the page so they can be tested without a
 * browser — how messages group into runs, when a date separator belongs, what
 * a timestamp reads like — and so the page is left doing layout.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  /**
   * Set on a message this browser has sent but the server has not confirmed.
   * Carries the local id so the confirmed row can replace it rather than
   * appearing beside it.
   */
  pending?: boolean;
  failed?: boolean;
}

export interface ConversationSummary {
  other_user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_message: string;
  last_at: string;
  last_sender_id: string;
  unread_count: number;
}

export interface MessageablePerson {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  relationship: string;
}

// ------------------------------------------------------------------ data ---

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc("conversation_summaries");
  if (error) {
    console.error("conversation_summaries failed:", error);
    return [];
  }
  return (data ?? []) as ConversationSummary[];
}

export async function fetchThread(
  meId: string,
  otherId: string,
  limit = 200,
): Promise<ChatMessage[]> {
  // Newest first with a limit, then reversed: taking the *oldest* 200 would
  // show someone the start of a long history and hide what just arrived.
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, message, is_read, read_at, created_at")
    .or(
      `and(sender_id.eq.${meId},receiver_id.eq.${otherId}),` +
        `and(sender_id.eq.${otherId},receiver_id.eq.${meId})`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("thread load failed:", error);
    return [];
  }
  return ((data ?? []) as ChatMessage[]).slice().reverse();
}

export async function fetchMessageablePeople(search: string): Promise<MessageablePerson[]> {
  const { data, error } = await supabase.rpc("messageable_people", {
    _search: search.trim() || null,
  });
  if (error) {
    console.error("messageable_people failed:", error);
    return [];
  }
  return (data ?? []) as MessageablePerson[];
}

/**
 * Returns { message, error } rather than a discriminated union: this project
 * compiles with `strict: false`, where TypeScript will not narrow a union by a
 * boolean literal, so `if (!result.ok)` would leave the error branch untyped.
 * It also matches the { data, error } shape used everywhere else here.
 */
export async function sendMessage(
  receiverId: string,
  body: string,
): Promise<{ message: ChatMessage | null; error: string | null }> {
  const { data: session } = await supabase.auth.getSession();
  const senderId = session?.session?.user?.id;
  if (!senderId) return { message: null, error: "You are signed out" };

  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: senderId, receiver_id: receiverId, message: body })
    .select("id, sender_id, receiver_id, message, is_read, read_at, created_at")
    .single();

  if (error || !data) {
    // The send policy is the likely refusal: you may only write to someone you
    // actually have a relationship with.
    const denied = error?.code === "42501";
    return {
      message: null,
      error: denied
        ? "You can only message people you work with."
        : error?.message || "Message could not be sent",
    };
  }
  return { message: data as ChatMessage, error: null };
}

export async function markConversationRead(otherId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_conversation_read", {
    _other_user_id: otherId,
  });
  if (error) console.error("mark_conversation_read failed:", error);
}

export async function fetchUnreadCount(): Promise<number> {
  const { data, error } = await supabase.rpc("unread_message_count");
  if (error) {
    console.error("unread_message_count failed:", error);
    return 0;
  }
  return Number(data ?? 0);
}

// ------------------------------------------------------------ presenting ---

/** Does this message belong to the same visual run as the one before it? */
export function continuesRun(
  message: ChatMessage,
  previous: ChatMessage | undefined,
  withinMinutes = 5,
): boolean {
  if (!previous) return false;
  if (previous.sender_id !== message.sender_id) return false;

  const gap =
    new Date(message.created_at).getTime() - new Date(previous.created_at).getTime();
  // A reply an hour later is a new thought, not a continuation, even from the
  // same person.
  return gap >= 0 && gap <= withinMinutes * 60_000;
}

/** True when a date separator belongs above this message. */
export function startsNewDay(
  message: ChatMessage,
  previous: ChatMessage | undefined,
): boolean {
  if (!previous) return true;
  return new Date(message.created_at).toDateString() !==
    new Date(previous.created_at).toDateString();
}

/** "Today" / "Yesterday" / "12 March 2026", for a date separator. */
export function dayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diffDays = Math.round((day(now) - day(date)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** Clock time on a bubble. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Relative age for the conversation list: "now", "4m", "3h", "2d", or a date. */
export function shortAge(iso: string, now = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Initials for an avatar fallback. */
export function initials(name: string | null | undefined): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Puts a confirmed message into a list, replacing its optimistic placeholder.
 *
 * The realtime echo of a message this browser just sent arrives *after* the
 * insert response, so without this the sender watches their own message appear
 * twice.
 */
export function mergeMessage(list: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (list.some((m) => m.id === incoming.id)) {
    return list.map((m) => (m.id === incoming.id ? { ...m, ...incoming } : m));
  }

  // A pending copy of the same text from the same sender is this message.
  const pendingIndex = list.findIndex(
    (m) =>
      m.pending &&
      m.sender_id === incoming.sender_id &&
      m.message === incoming.message,
  );
  if (pendingIndex !== -1) {
    const next = list.slice();
    next[pendingIndex] = incoming;
    return next;
  }

  return [...list, incoming];
}

/** Whether a message belongs to the conversation between these two people. */
export function belongsToThread(
  message: Pick<ChatMessage, "sender_id" | "receiver_id">,
  meId: string,
  otherId: string,
): boolean {
  return (
    (message.sender_id === meId && message.receiver_id === otherId) ||
    (message.sender_id === otherId && message.receiver_id === meId)
  );
}
