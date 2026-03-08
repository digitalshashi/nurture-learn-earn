import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatePostCard } from "@/components/feed/CreatePostCard";
import { FeedPost } from "@/components/feed/FeedPost";
import { Hash, Plus, Megaphone, Users, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Channel {
  id: string;
  name: string;
  channel_type: string;
  is_global: boolean;
}

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

export default function Channels() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState("public");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchChannels = async () => {
    const { data } = await supabase.from("channels").select("*").order("created_at");
    if (data) {
      setChannels(data as Channel[]);
      if (!selectedChannel && data.length > 0) setSelectedChannel(data[0] as Channel);
    }
  };

  const fetchPosts = async (channelId: string) => {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(full_name, avatar_url)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setPosts(data as any);
  };

  useEffect(() => { fetchChannels(); }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchPosts(selectedChannel.id);

      const channel = supabase
        .channel(`channel-${selectedChannel.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter: `channel_id=eq.${selectedChannel.id}` }, () => {
          fetchPosts(selectedChannel.id);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedChannel]);

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    const { error } = await supabase.from("channels").insert({
      name: newChannelName.trim(),
      channel_type: newChannelType,
      created_by: user!.id,
      is_global: true,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setNewChannelName("");
    setDialogOpen(false);
    fetchChannels();
  };

  const isCoachOrAdmin = hasRole("coach") || hasRole("admin");
  const isAnnouncement = selectedChannel?.channel_type === "announcement";
  const canPost = !isAnnouncement || isCoachOrAdmin;

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-var(--nav-height))]">
        {/* Channel List Sidebar */}
        <div className="w-64 border-r border-border bg-card p-3 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Channels</h2>
            {isCoachOrAdmin && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Channel</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Channel name</Label>
                      <Input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="e.g. Announcements" className="mt-1" />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newChannelType} onValueChange={setNewChannelType}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public — everyone can post</SelectItem>
                          <SelectItem value="announcement">Announcement — only coach posts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={createChannel}>
                      Create Channel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="space-y-0.5 flex-1 overflow-y-auto">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedChannel?.id === ch.id ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                {ch.channel_type === "announcement" ? <Megaphone className="h-4 w-4 shrink-0" /> : <Hash className="h-4 w-4 shrink-0" />}
                <span className="truncate">{ch.name}</span>
              </button>
            ))}

            {channels.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No channels yet</p>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChannel ? (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                {selectedChannel.channel_type === "announcement" ? <Megaphone className="h-4 w-4 text-accent" /> : <Hash className="h-4 w-4 text-muted-foreground" />}
                <h3 className="font-semibold text-sm">{selectedChannel.name}</h3>
                <span className="text-xs text-muted-foreground ml-2">
                  {selectedChannel.channel_type === "announcement" ? "Announcement channel" : "Public channel"}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {posts.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">No messages yet</p>
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

              {canPost && (
                <div className="border-t border-border p-3">
                  <CreatePostCard channelId={selectedChannel.id} onPostCreated={() => fetchPosts(selectedChannel.id)} />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a channel to start chatting
            </div>
          )}
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
  return `${Math.floor(hours / 24)}d`;
}
