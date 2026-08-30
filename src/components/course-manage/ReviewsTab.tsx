/**
 * Reviews learners left on the course.
 *
 * The table showed a name, a truncated line of text and an empty Phone column
 * — the rating itself, which is the whole point of a review, was not on
 * screen, and `coach_reply` had no way in. Both are here now, alongside the
 * distribution that tells a coach at a glance whether a 4.6 is "everyone
 * liked it" or "mostly fives and two ones".
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquare, Search, Star, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  coach_reply: string | null;
  created_at: string;
  user_id: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("h-3.5 w-3.5", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
        />
      ))}
    </span>
  );
}

export default function ReviewsTab({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("*, profiles:user_id(full_name, email)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    setReviews((data || []) as Review[]);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveReply = async (review: Review) => {
    const text = draft.trim();
    setPosting(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .update({ coach_reply: text || null })
        .eq("id", review.id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("The reply was not saved — you may not have permission to reply on this course.");
      }
      toast({ title: text ? "Reply saved" : "Reply removed" });
      setReplyingTo(null);
      setDraft("");
      await load();
    } catch (err: any) {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Review deleted" });
  };

  const { average, distribution } = useMemo(() => {
    if (reviews.length === 0) return { average: 0, distribution: [0, 0, 0, 0, 0] };
    const dist = [0, 0, 0, 0, 0];
    let sum = 0;
    reviews.forEach((r) => {
      const rating = Math.min(5, Math.max(1, Math.round(r.rating || 0)));
      dist[rating - 1] += 1;
      sum += rating;
    });
    return { average: sum / reviews.length, distribution: dist };
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (ratingFilter && Math.round(r.rating) !== ratingFilter) return false;
      if (!q) return true;
      return (
        (r.review_text || "").toLowerCase().includes(q) ||
        (r.profiles?.full_name || "").toLowerCase().includes(q) ||
        (r.profiles?.email || "").toLowerCase().includes(q)
      );
    });
  }, [reviews, search, ratingFilter]);

  const awaitingReply = reviews.filter((r) => !r.coach_reply).length;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold">Reviews</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {reviews.length} {reviews.length === 1 ? "review" : "reviews"} · {awaitingReply} without a reply
        </p>
      </div>

      {reviews.length > 0 && (
        <div className="mb-5 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-[160px_1fr]">
          <div className="flex flex-col items-center justify-center border-border sm:border-r">
            <p className="text-4xl font-extrabold tabular-nums">{average.toFixed(1)}</p>
            <Stars value={Math.round(average)} className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">out of 5</p>
          </div>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star - 1];
              const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
              const active = ratingFilter === star;
              return (
                <button
                  key={star}
                  onClick={() => setRatingFilter(active ? null : star)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded px-1.5 py-0.5 text-left transition-colors hover:bg-secondary/60",
                    active && "bg-secondary",
                  )}
                >
                  <span className="w-8 shrink-0 text-xs font-medium tabular-nums">{star} ★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {count} ({pct}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews or learners"
            className="pl-9"
          />
        </div>
        {ratingFilter && (
          <Button variant="outline" size="sm" onClick={() => setRatingFilter(null)}>
            Clear {ratingFilter}★ filter
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Star className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm font-medium">
            {reviews.length === 0 ? "No reviews yet" : "Nothing matches this filter"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ratings learners leave on the course appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => {
            const replying = replyingTo === review.id;
            return (
              <div key={review.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={Math.round(review.rating)} />
                      <span className="text-sm font-medium">{review.profiles?.full_name || "A learner"}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    {review.review_text && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{review.review_text}</p>
                    )}
                    {review.profiles?.email && (
                      <p className="mt-1.5 text-xs text-muted-foreground">{review.profiles.email}</p>
                    )}
                  </div>
                </div>

                {review.coach_reply && !replying && (
                  <div className="mt-3 rounded-lg border-l-2 border-accent bg-secondary/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">Your reply</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{review.coach_reply}</p>
                  </div>
                )}

                {replying ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Thank them, or answer what they raised…"
                      className="min-h-[80px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={posting} onClick={() => saveReply(review)}>
                        {posting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                        {draft.trim() ? "Save reply" : "Remove reply"}
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
                      variant={review.coach_reply ? "outline" : "default"}
                      onClick={() => {
                        setReplyingTo(review.id);
                        setDraft(review.coach_reply || "");
                      }}
                    >
                      <MessageSquare className="mr-1 h-3.5 w-3.5" />
                      {review.coach_reply ? "Edit reply" : "Reply"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(review.id)}>
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
