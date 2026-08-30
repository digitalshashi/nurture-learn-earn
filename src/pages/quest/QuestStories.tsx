import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PenLine,
  Plus,
  ArrowLeft,
  Eye,
  Loader2,
  Trash2,
  Send,
  Lock,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuest } from "@/contexts/QuestContext";
import { toast } from "@/hooks/use-toast";
import { LockedPanel, StatusPill } from "@/components/quest/QuestPrimitives";
import { SOCIALS_REQUIRED_TO_PUBLISH } from "@/lib/quest/socials";

interface MyStory {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_url: string | null;
  status: string;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

interface ReceivedComment {
  id: string;
  body: string;
  created_at: string;
  story: { id: string; title: string } | null;
  author: { full_name: string; avatar_url: string | null } | null;
}

/**
 * A lightweight CMS for one thing: members writing up what happened to them.
 *
 * Publishing is gated on three social links rather than on the whole profile.
 * A story carries a name into the community and a reader will want to click
 * through — the links are the part that has to exist.
 */
export default function QuestStories() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const quest = useQuest();

  const [stories, setStories] = useState<MyStory[]>([]);
  const [received, setReceived] = useState<ReceivedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MyStory | "new" | null>(null);

  // Keyed on the id rather than the user object: the object's identity is not
  // guaranteed stable across renders, and an effect that re-fires on identity
  // re-queries on every state change it causes.
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;

    const [mine, comments] = await Promise.all([
      supabase
        .from("quest_stories")
        .select("id, title, excerpt, body, cover_url, status, view_count, published_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      // Comments *on* my stories, not comments I left. The story embed works
      // because story_id is a real foreign key; the commenter's name is not,
      // so that comes from a second query below.
      supabase
        .from("quest_story_comments")
        .select("id, user_id, body, created_at, story:story_id!inner(id, title, user_id)")
        .eq("story.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    setStories((mine.data as MyStory[]) ?? []);

    const rows = comments.data ?? [];
    if (rows.length === 0) {
      setReceived([]);
    } else {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", [...new Set(rows.map((r) => r.user_id))]);

      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      setReceived(
        rows.map((row) => ({
          id: row.id,
          body: row.body,
          created_at: row.created_at,
          story: row.story ? { id: row.story.id, title: row.story.title } : null,
          author: byId.get(row.user_id)
            ? {
                full_name: byId.get(row.user_id)!.full_name,
                avatar_url: byId.get(row.user_id)!.avatar_url,
              }
            : null,
        })),
      );
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!quest.gate.unlocked) {
    return (
      <LockedPanel
        title="The Story Engine opens after setup"
        description="Finish your profile and the handbook first — a story with no byline behind it is not much use to a reader."
        action={<Button size="sm" onClick={() => navigate("/quest")}>Back to the gate</Button>}
      />
    );
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from("quest_stories").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    await load();
    await quest.refresh();
    toast({ title: "Story deleted" });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/quest")}
        className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Quest
      </button>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
            <PenLine className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold sm:text-2xl">Story Engine</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Document your journey and give somebody two months behind you a map.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Write
        </Button>
      </header>

      {!quest.profile.canPublish && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-[hsl(25_95%_53%/0.3)] bg-[hsl(25_95%_53%/0.08)] p-3">
          <Lock className="h-4 w-4 shrink-0 text-[hsl(25_95%_43%)]" />
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {quest.profile.socialCount}/{SOCIALS_REQUIRED_TO_PUBLISH} social profiles.
            </span>{" "}
            You can write and save drafts now, but publishing needs all three.
          </p>
          <Button size="sm" variant="outline" onClick={() => navigate("/quest/profile")}>
            Add links
          </Button>
        </div>
      )}

      <Tabs defaultValue="mine">
        <TabsList className="mb-4">
          <TabsTrigger value="mine">My stories</TabsTrigger>
          <TabsTrigger value="comments">
            Comments{received.length > 0 && ` (${received.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          {loading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          ) : stories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/12 text-accent">
                <PenLine className="h-5 w-5" />
              </span>
              <p className="font-display text-base font-semibold">Ready to share your story?</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                The most useful thing you can publish is the part you found hard. Somebody is stuck
                there right now.
              </p>
              <Button className="mt-4" onClick={() => setEditing("new")}>
                <Plus className="mr-1.5 h-4 w-4" />
                Write your first story
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {stories.map((story) => (
                <article
                  key={story.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  {story.cover_url && (
                    <img
                      src={story.cover_url}
                      alt=""
                      className="hidden h-16 w-24 shrink-0 rounded-lg object-cover sm:block"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{story.title}</p>
                      <StatusPill
                        status={story.status === "published" ? "achieved" : "next"}
                        label={story.status === "published" ? "PUBLISHED" : "DRAFT"}
                      />
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {story.excerpt || story.body.slice(0, 160)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {story.view_count} view{story.view_count === 1 ? "" : "s"}
                      </span>
                      <span>
                        {story.published_at
                          ? `Published ${new Date(story.published_at).toLocaleDateString()}`
                          : `Saved ${new Date(story.created_at).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditing(story)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void remove(story.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Delete {story.title}</span>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments">
          {received.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <MessageSquare className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">No comments yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Replies to your published stories land here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {received.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {comment.author?.full_name ?? "Member"}
                    </span>{" "}
                    on <span className="font-medium text-foreground">{comment.story?.title}</span> ·{" "}
                    {new Date(comment.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editing && (
        <StoryEditor
          story={editing === "new" ? null : editing}
          canPublish={quest.profile.canPublish}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            await quest.refresh();
          }}
        />
      )}

    </div>
  );
}

function StoryEditor({
  story,
  canPublish,
  onClose,
  onSaved,
}: {
  story: MyStory | null;
  canPublish: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(story?.title ?? "");
  const [excerpt, setExcerpt] = useState(story?.excerpt ?? "");
  const [body, setBody] = useState(story?.body ?? "");
  const [coverUrl, setCoverUrl] = useState(story?.cover_url ?? "");
  const [saving, setSaving] = useState(false);

  const save = async (publish: boolean) => {
    if (!user) return;
    if (!title.trim() || !body.trim()) {
      toast({ title: "A story needs a title and a body", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      user_id: user.id,
      title: title.trim(),
      excerpt: excerpt.trim() || null,
      body: body.trim(),
      cover_url: coverUrl.trim() || null,
      status: publish ? "published" : "draft",
      // Set once. Re-editing a published story does not re-date it, so the
      // community feed keeps its real order.
      published_at: publish ? (story?.published_at ?? new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = story
      ? await supabase.from("quest_stories").update(payload).eq("id", story.id)
      : await supabase.from("quest_stories").insert(payload);

    if (error) {
      setSaving(false);
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }

    // XP for putting something in front of people, not for saving a draft.
    if (publish && story?.status !== "published") {
      await supabase.from("xp_transactions").insert({
        user_id: user.id,
        action: "story_published",
        xp_amount: 150,
        description: `Published "${title.trim()}"`,
      });
    }

    setSaving(false);
    onSaved();
    toast({
      title: publish ? "Story published" : "Draft saved",
      description: publish && story?.status !== "published" ? "+150 XP" : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{story ? "Edit story" : "Write a story"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium">Title</Label>
            <Input
              className="mt-1.5"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The month I stopped chasing more clients"
            />
          </div>

          <div>
            <Label className="text-xs font-medium">One-line summary</Label>
            <Input
              className="mt-1.5"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="What a reader gets out of this, in one line."
            />
          </div>

          <div>
            <Label className="text-xs font-medium">Cover image URL</Label>
            <Input
              className="mt-1.5"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div>
            <Label className="text-xs font-medium">Your story</Label>
            <Textarea
              className="mt-1.5 min-h-56"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start where it was hard. Nobody needs the version where it went well from the start."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              {canPublish
                ? "Publishing puts this in front of the whole community."
                : `Add ${SOCIALS_REQUIRED_TO_PUBLISH} social profiles to unlock publishing.`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void save(false)} disabled={saving}>
                Save draft
              </Button>
              <Button size="sm" onClick={() => void save(true)} disabled={saving || !canPublish}>
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                Publish
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
