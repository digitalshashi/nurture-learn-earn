import { useEffect, useState } from "react";
import { Eye, Loader2, Send, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface StoryCard {
  id: string;
  user_id: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_url: string | null;
  view_count: number;
  published_at: string | null;
  author?: { full_name: string; avatar_url: string | null } | null;
}

interface CommentRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: { full_name: string; avatar_url: string | null } | null;
}

/**
 * Reading somebody else's story, and replying to it.
 *
 * The view counter is bumped through an RPC rather than an UPDATE: a member
 * has no write access to another member's story row, and granting one so a
 * counter could move would also let them rewrite the title.
 */
export function StoryReader({
  story,
  onClose,
  onCommented,
}: {
  story: StoryCard;
  onClose: () => void;
  onCommented?: () => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  // The author is fetched separately: quest_story_comments.user_id points at
  // auth.users, so there is no relationship for PostgREST to embed through.
  const load = async () => {
    const { data } = await supabase
      .from("quest_story_comments")
      .select("id, user_id, body, created_at")
      .eq("story_id", story.id)
      .order("created_at");

    const rows = data ?? [];
    if (rows.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", [...new Set(rows.map((r) => r.user_id))]);

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    setComments(
      rows.map((row) => ({
        ...row,
        author: byId.get(row.user_id)
          ? { full_name: byId.get(row.user_id)!.full_name, avatar_url: byId.get(row.user_id)!.avatar_url }
          : null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // Fire and forget: a failed view count is not worth telling anybody about.
    void supabase.rpc("quest_record_story_view", { p_story_id: story.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id]);

  const post = async () => {
    if (!user || !draft.trim()) return;
    setPosting(true);

    const { error } = await supabase.from("quest_story_comments").insert({
      story_id: story.id,
      user_id: user.id,
      body: draft.trim(),
    });

    if (error) {
      setPosting(false);
      toast({ title: "Couldn't post", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("xp_transactions").insert({
      user_id: user.id,
      action: "story_comment",
      xp_amount: 5,
      description: `Commented on "${story.title}"`,
    });

    setDraft("");
    setPosting(false);
    await load();
    onCommented?.();
    toast({ title: "Comment posted", description: "+5 XP" });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("quest_story_comments").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 text-left font-display text-lg leading-snug">
            {story.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-6 w-6">
            <AvatarImage src={story.author?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-[9px]">
              {(story.author?.full_name ?? "M").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{story.author?.full_name ?? "Member"}</span>
          {story.published_at && <span>· {new Date(story.published_at).toLocaleDateString()}</span>}
          <span className="flex items-center gap-1">
            · <Eye className="h-3 w-3" />
            {story.view_count}
          </span>
        </div>

        {story.cover_url && (
          <img
            src={story.cover_url}
            alt=""
            className="max-h-64 w-full rounded-xl border border-border object-cover"
          />
        )}

        <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {story.body}
        </div>

        <section className="border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-semibold">
            {loading ? "Comments" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
          </h3>

          {loading ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={comment.author?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="text-[9px]">
                      {(comment.author?.full_name ?? "M").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 rounded-xl bg-secondary/50 px-3 py-2">
                    <p className="text-xs font-semibold">{comment.author?.full_name ?? "Member"}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {comment.body}
                    </p>
                  </div>
                  {comment.user_id === user?.id && (
                    <button
                      type="button"
                      onClick={() => void remove(comment.id)}
                      aria-label="Delete comment"
                      className="shrink-0 self-start p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {comments.length === 0 && (
                <p className="py-2 text-xs text-muted-foreground">
                  Nothing yet. Be the one who says something useful.
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Encourage a fellow member — specifics beat 'great post'."
              className="min-h-[60px] flex-1"
            />
            <Button size="sm" onClick={post} disabled={posting || !draft.trim()} className="self-end">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
