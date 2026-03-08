import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedPost } from "@/components/feed/FeedPost";
import { FeedSidebar } from "@/components/feed/FeedSidebar";
import { CreatePostCard } from "@/components/feed/CreatePostCard";
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
  profiles?: { full_name: string; avatar_url: string | null };
}

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(full_name, avatar_url)")
      .eq("is_feed_post", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setPosts(data as any);
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

  return (
    <AppLayout>
      <div className="flex max-w-7xl mx-auto w-full">
        <div className="flex-1 max-w-2xl mx-auto py-4 px-4">
          <CreatePostCard onPostCreated={fetchPosts} />

          <div className="space-y-4 mt-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No posts yet. Be the first to share!</div>
            ) : (
              posts.map((post) => (
                <FeedPost
                  key={post.id}
                  id={post.id}
                  author={post.profiles?.full_name || "Unknown"}
                  authorAvatar={post.profiles?.avatar_url || ""}
                  content={post.content || ""}
                  image={post.image_url || undefined}
                  videoUrl={post.video_url || undefined}
                  linkUrl={post.link_url || undefined}
                  timeAgo={getTimeAgo(post.created_at)}
                  likes={0}
                  comments={0}
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
