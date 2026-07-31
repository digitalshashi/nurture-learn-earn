import { useState, useMemo, useEffect } from "react";
import { Heart, MessageCircle, Share2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractEmbeds, removeEmbedUrls, parseEmbed } from "@/lib/link-embed";
import { LinkEmbed } from "@/components/feed/LinkEmbed";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { UserBadges } from "@/components/badges/UserBadges";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profile?: { full_name: string; avatar_url: string | null };
}

interface FeedPostProps {
  id: string;
  author: string;
  authorAvatar: string;
  authorId?: string;
  content: string;
  image?: string;
  videoUrl?: string;
  linkUrl?: string;
  timeAgo: string;
  likes: number;
  comments: number;
}

export function FeedPost({ id, author, authorAvatar, authorId, content, image, videoUrl, linkUrl, timeAgo, likes: initialLikes, comments: initialComments }: FeedPostProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [likeCount, setLikeCount] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [commentCount, setCommentCount] = useState(initialComments);
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // Check if user already liked + fetch counts
  useEffect(() => {
    if (!user) return;
    
    const fetchLikeState = async () => {
      const [{ count: likeTotal }, { data: userLike }, { count: commentTotal }] = await Promise.all([
        supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", id),
        supabase.from("post_likes").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", id),
      ]);
      setLikeCount(likeTotal || 0);
      setIsLiked(!!userLike);
      setCommentCount(commentTotal || 0);
    };
    fetchLikeState();
  }, [id, user]);

  const handleLike = async () => {
    if (!user || liking) return;
    setLiking(true);
    try {
      if (isLiked) {
        await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", user.id);
        setIsLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        const { error } = await supabase.from("post_likes").insert({ post_id: id, user_id: user.id });
        if (error) throw error;
        setIsLiked(true);
        setLikeCount((c) => c + 1);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLiking(false);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    const { data } = await supabase
      .from("comments")
      .select("id, content, user_id, created_at")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .limit(50);
    
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
      setCommentsList(
        data.map((c) => ({
          ...c,
          profile: profiles?.find((p) => p.id === c.user_id) || { full_name: "User", avatar_url: null },
        }))
      );
    } else {
      setCommentsList([]);
    }
    setLoadingComments(false);
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && commentsList.length === 0) loadComments();
  };

  const submitComment = async () => {
    if (!user || !newComment.trim() || posting) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        post_id: id,
        user_id: user.id,
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      setCommentCount((c) => c + 1);
      await loadComments();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  // Auto-detect embeds from content text
  const embeds = useMemo(() => extractEmbeds(content || ""), [content]);
  const richEmbeds = embeds.filter((e) => e.type !== "generic");
  const cleanContent = useMemo(
    () => (richEmbeds.length > 0 ? removeEmbedUrls(content || "", richEmbeds) : content),
    [content, richEmbeds]
  );

  // Legacy video_url support
  const legacyVideoEmbed = useMemo(() => {
    if (!videoUrl || richEmbeds.some((e) => e.url === videoUrl)) return null;
    return parseEmbed(videoUrl);
  }, [videoUrl, richEmbeds]);

  const getTimeAgoShort = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={authorAvatar} />
            <AvatarFallback className="bg-accent/20 text-accent font-semibold text-sm">
              {author.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="font-semibold text-sm truncate">{author}</p>
              {authorId && <UserBadges userId={authorId} maxVisible={2} size="sm" />}
            </div>
            <p className="text-[13px] font-medium text-muted-foreground">{timeAgo}</p>
          </div>
        </div>

        {cleanContent && <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">{cleanContent}</p>}

        {linkUrl && !richEmbeds.some((e) => e.url === linkUrl) && (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all mb-3 block">
            🔗 {linkUrl}
          </a>
        )}
      </div>

      {image && image !== "/placeholder.svg" && (
        <img src={image} alt="" className="w-full max-h-96 object-cover" loading="lazy" />
      )}

      {richEmbeds.length > 0 && (
        <div className="px-4 pb-3 space-y-3">
          {richEmbeds.map((embed, idx) => (
            <LinkEmbed key={`${embed.url}-${idx}`} embed={embed} />
          ))}
        </div>
      )}

      {legacyVideoEmbed && (
        <div className="px-4 pb-3">
          <LinkEmbed embed={legacyVideoEmbed} />
        </div>
      )}

      {/* Actions Bar */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-6">
        <button
          onClick={handleLike}
          disabled={liking}
          className={`flex items-center gap-1.5 transition-colors text-sm ${
            isLiked ? "text-destructive" : "text-muted-foreground hover:text-destructive"
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
          {likeCount > 0 && <span className="font-medium">{likeCount}</span>}
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors text-sm"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount > 0 && <span className="font-medium">{commentCount}</span>}
          {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.origin + `/feed#post-${id}`);
            toast({ title: "Link copied!" });
          }}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors text-sm"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border">
          {/* Comment input */}
          <div className="p-3 flex gap-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-secondary text-xs font-semibold">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[36px] max-h-[100px] text-sm resize-none py-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); }
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 h-9 w-9"
                onClick={submitComment}
                disabled={posting || !newComment.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Comments list */}
          {loadingComments ? (
            <div className="px-4 pb-3 text-xs text-muted-foreground">Loading comments...</div>
          ) : (
            <div className="px-4 pb-3 space-y-3">
              {commentsList.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={comment.profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                      {(comment.profile?.full_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-secondary rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold">{comment.profile?.full_name || "User"}</p>
                      <p className="text-sm mt-0.5">{comment.content}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">{getTimeAgoShort(comment.created_at)}</p>
                  </div>
                </div>
              ))}
              {commentsList.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first!</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
