import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedPost } from "@/components/feed/FeedPost";
import { FeedSidebar } from "@/components/feed/FeedSidebar";
import { CreatePostCard } from "@/components/feed/CreatePostCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Post {
  id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  created_at: string;
  user_id: string;
  comments_enabled: boolean;
  hide_comment_count: boolean;
  hide_like_count: boolean;
  view_count: number;
  profiles?: { full_name: string; avatar_url: string | null };
}

type ShowingFilter = "all" | "mine" | "creators";
type SortMode = "latest" | "trending" | "popular" | "oldest";

export default function Feed() {
  const { user, hasRole } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [engagement, setEngagement] = useState<Record<string, { likes: number; comments: number }>>({});
  const [creatorIds, setCreatorIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showing, setShowing] = useState<ShowingFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("latest");

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(full_name, avatar_url)")
      .eq("is_feed_post", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setPosts(data as any);

      const postIds = data.map((p: any) => p.id);
      if (postIds.length > 0) {
        const [{ data: likeRows }, { data: commentRows }, { data: roleRows }] = await Promise.all([
          supabase.from("post_likes").select("post_id").in("post_id", postIds),
          supabase.from("comments").select("post_id").in("post_id", postIds),
          supabase.from("user_roles").select("user_id").eq("role", "coach"),
        ]);
        const counts: Record<string, { likes: number; comments: number }> = {};
        postIds.forEach((id: string) => { counts[id] = { likes: 0, comments: 0 }; });
        (likeRows || []).forEach((r: any) => { counts[r.post_id].likes++; });
        (commentRows || []).forEach((r: any) => { counts[r.post_id].comments++; });
        setEngagement(counts);
        setCreatorIds(new Set((roleRows || []).map((r: any) => r.user_id)));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel("feed-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter: "is_feed_post=eq.true" }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const visiblePosts = useMemo(() => {
    let filtered = posts;
    if (showing === "mine" && user) filtered = filtered.filter((p) => p.user_id === user.id);
    if (showing === "creators") filtered = filtered.filter((p) => creatorIds.has(p.user_id));

    const withScore = filtered.map((p) => {
      const eng = engagement[p.id] || { likes: 0, comments: 0 };
      const ageHours = (Date.now() - new Date(p.created_at).getTime()) / 3600000;
      return { post: p, likes: eng.likes, comments: eng.comments, trending: (eng.likes + eng.comments * 2) / Math.pow(ageHours + 2, 1.3) };
    });

    switch (sortMode) {
      case "oldest":
        withScore.sort((a, b) => new Date(a.post.created_at).getTime() - new Date(b.post.created_at).getTime());
        break;
      case "popular":
        withScore.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));
        break;
      case "trending":
        withScore.sort((a, b) => b.trending - a.trending);
        break;
      default:
        withScore.sort((a, b) => new Date(b.post.created_at).getTime() - new Date(a.post.created_at).getTime());
    }
    return withScore;
  }, [posts, engagement, showing, sortMode, creatorIds, user]);

  return (
    <AppLayout>
      <div className="flex max-w-7xl mx-auto w-full">
        <div className="flex-1 max-w-2xl mx-auto py-4 px-4">
          <CreatePostCard onPostCreated={fetchPosts} />

          <div className="flex items-center gap-2 mt-4">
            <Select value={showing} onValueChange={(v) => setShowing(v as ShowingFilter)}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All posts</SelectItem>
                <SelectItem value="mine">My posts</SelectItem>
                <SelectItem value="creators">Creator's posts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="trending">Trending now</SelectItem>
                <SelectItem value="popular">Most popular</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 mt-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading posts...</div>
            ) : visiblePosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No posts yet. Be the first to share!</div>
            ) : (
              visiblePosts.map(({ post }) => (
                <FeedPost
                  key={post.id}
                  id={post.id}
                  author={post.profiles?.full_name || "Unknown"}
                  authorAvatar={post.profiles?.avatar_url || ""}
                  authorId={post.user_id}
                  content={post.content || ""}
                  image={post.image_url || undefined}
                  videoUrl={post.video_url || undefined}
                  linkUrl={post.link_url || undefined}
                  timeAgo={getTimeAgo(post.created_at)}
                  likes={0}
                  comments={0}
                  viewCount={post.view_count || 0}
                  commentsEnabled={post.comments_enabled !== false}
                  hideCommentCount={!!post.hide_comment_count}
                  hideLikeCount={!!post.hide_like_count}
                  isCreatorPost={creatorIds.has(post.user_id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="hidden lg:block w-80 py-4 pr-4">
          <FeedSidebar />
        </div>
      </div>
    </AppLayout>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
