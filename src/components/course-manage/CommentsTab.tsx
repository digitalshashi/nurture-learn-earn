/**
 * Comments left on this course's lessons.
 *
 * This used to read the `comments` table — the one behind community posts —
 * with no course filter at all, so a coach opening it saw every comment on
 * the platform and none of their own lessons' discussion. Lesson comments
 * live in `chapter_comments`, which is what the player writes to.
 *
 * Read/unread is kept in this browser rather than in the database: there is
 * no column for it, and "which of these have I already looked at" is a
 * per-person question, not a property of the comment.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CornerDownRight,
  ExternalLink,
  Loader2,
  Mail,
  MailOpen,
  MessageCircle,
  Reply,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

interface CommentRow {
  id: string;
  chapter_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
}

interface Thread extends CommentRow {
  authorName: string;
  chapterTitle: string;
  replies: (CommentRow & { authorName: string })[];
}

type Filter = "all" | "unread" | "read";

const readKey = (courseId: string) => `course-manage:comments-read:${courseId}`;

function loadRead(courseId: string): Set<string> {
  try {
    const raw = localStorage.getItem(readKey(courseId));
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
}

function persistRead(courseId: string, ids: Set<string>) {
  try {
    localStorage.setItem(readKey(courseId), JSON.stringify([...ids]));
  } catch {
    /* A browser with storage blocked simply treats everything as unread. */
  }
}

export default function CommentsTab({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [read, setRead] = useState<Set<string>>(() => loadRead(courseId));
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: secs } = await supabase
      .from("sections")
      .select("id, chapters(id, title)")
      .eq("course_id", courseId);

    const chapterIds: string[] = [];
    const chapterTitles: Record<string, string> = {};
    (secs || []).forEach((s: any) =>
      (s.chapters || []).forEach((c: any) => {
        chapterIds.push(c.id);
        chapterTitles[c.id] = c.title;
      }),
    );

    if (chapterIds.length === 0) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from("chapter_comments")
      .select("*")
      .in("chapter_id", chapterIds)
      .order("created_at", { ascending: false });

    const comments = (rows || []) as CommentRow[];

    // chapter_comments has no FK to profiles, so names come from a second read.
    const userIds = [...new Set(comments.map((c) => c.user_id))];
    const names: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      (profiles || []).forEach((p: any) => {
        names[p.id] = p.full_name || "Member";
      });
    }

    const byParent: Record<string, (CommentRow & { authorName: string })[]> = {};
    comments
      .filter((c) => c.parent_id)
      .forEach((c) => {
        (byParent[c.parent_id!] ||= []).push({ ...c, authorName: names[c.user_id] || "Member" });
      });
    Object.values(byParent).forEach((list) =>
      list.sort((a, b) => a.created_at.localeCompare(b.created_at)),
    );

    setThreads(
      comments
        .filter((c) => !c.parent_id)
        .map((c) => ({
          ...c,
          authorName: names[c.user_id] || "Member",
          chapterTitle: chapterTitles[c.chapter_id] || "—",
          replies: byParent[c.id] || [],
        })),
    );
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setRead(loadRead(courseId));
  }, [courseId]);

  const setReadState = (ids: string[], value: boolean) => {
    const next = new Set(read);
    ids.forEach((id) => {
      if (value) next.add(id);
      else next.delete(id);
    });
    setRead(next);
    persistRead(courseId, next);
  };

  const postReply = async (thread: Thread) => {
    const text = draft.trim();
    if (!text || !user) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("chapter_comments").insert({
        chapter_id: thread.chapter_id,
        user_id: user.id,
        content: text,
        parent_id: thread.id,
      });
      if (error) throw error;
      setDraft("");
      setReplyingTo(null);
      setReadState([thread.id], true);
      await load();
      toast({ title: "Reply posted" });
    } catch (err: any) {
      toast({ title: "Could not reply", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("chapter_comments").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    await load();
    toast({ title: "Comment deleted" });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((t) => {
      const isRead = read.has(t.id);
      if (filter === "read" && !isRead) return false;
      if (filter === "unread" && isRead) return false;
      if (!q) return true;
      return (
        t.content.toLowerCase().includes(q) ||
        t.authorName.toLowerCase().includes(q) ||
        t.chapterTitle.toLowerCase().includes(q) ||
        t.replies.some((r) => r.content.toLowerCase().includes(q))
      );
    });
  }, [threads, search, filter, read]);

  const unreadCount = threads.filter((t) => !read.has(t.id)).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Comments</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {threads.length} {threads.length === 1 ? "thread" : "threads"} on your lessons · {unreadCount} unread
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filtered.length === 0}
            onClick={() => setReadState(filtered.map((t) => t.id), true)}
          >
            <MailOpen className="mr-1 h-3.5 w-3.5" /> Mark all read
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={filtered.length === 0}
            onClick={() => setReadState(filtered.map((t) => t.id), false)}
          >
            <Mail className="mr-1 h-3.5 w-3.5" /> Mark all unread
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search comments, learners or lessons"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(
            [
              { key: "all", label: `All (${threads.length})` },
              { key: "unread", label: `Unread (${unreadCount})` },
              { key: "read", label: `Read (${threads.length - unreadCount})` },
            ] as const
          ).map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === chip.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">
            {threads.length === 0 ? "No comments yet" : "Nothing matches this filter"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Whatever learners write under a lesson shows up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((thread) => {
            const isRead = read.has(thread.id);
            const replying = replyingTo === thread.id;
            return (
              <div
                key={thread.id}
                className={cn(
                  "rounded-xl border bg-card p-4 transition-colors",
                  isRead ? "border-border" : "border-accent/40 bg-accent/[0.03]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{thread.content}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{thread.authorName}</span>
                      <span aria-hidden>·</span>
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                        onClick={() => navigate(`/course-player/${courseId}/watch/${thread.chapter_id}`)}
                      >
                        {thread.chapterTitle} <ExternalLink className="h-3 w-3" />
                      </button>
                      <span aria-hidden>·</span>
                      {format(new Date(thread.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  {!isRead && (
                    <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                      New
                    </span>
                  )}
                </div>

                {thread.replies.length > 0 && (
                  <div className="mt-3 space-y-2 border-l-2 border-border pl-3">
                    {thread.replies.map((r) => (
                      <div key={r.id} className="group flex items-start gap-2">
                        <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {r.authorName} · {format(new Date(r.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => remove(r.id)}
                          aria-label="Delete reply"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {replying ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={`Reply to ${thread.authorName}…`}
                      className="min-h-[80px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={posting || !draft.trim()} onClick={() => postReply(thread)}>
                        {posting ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="mr-1 h-3.5 w-3.5" />
                        )}
                        Post reply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={posting}
                        onClick={() => {
                          setReplyingTo(null);
                          setDraft("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReplyingTo(thread.id);
                        setDraft("");
                      }}
                    >
                      <Reply className="mr-1 h-3.5 w-3.5" /> Reply
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReadState([thread.id], !isRead)}>
                      {isRead ? <Mail className="mr-1 h-3.5 w-3.5" /> : <MailOpen className="mr-1 h-3.5 w-3.5" />}
                      Mark as {isRead ? "unread" : "read"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(thread.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
