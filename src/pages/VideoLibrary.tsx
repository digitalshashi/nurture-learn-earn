import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  Video, Search, Filter, Play, Clock, HardDrive,
  Loader2, Trash2, ExternalLink, Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { deleteFromCloud, listCloudFiles } from "@/lib/cloud-storage";

interface VideoFile {
  name: string;
  id: string;
  created_at: string;
  folder: string;
  key: string;
  publicUrl: string;
  metadata: {
    size: number;
    mimetype: string;
  };
}

export default function VideoLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (user) loadVideos();
  }, [user]);

  const loadVideos = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // List from R2/S3 bucket (1corehub) under user videos + recordings
      const [recordings, uploads] = await Promise.all([
        listCloudFiles(`${user.id}/recordings/`),
        listCloudFiles(`${user.id}/videos/`),
      ]);

      const mapItems = (items: typeof recordings, folder: string): VideoFile[] =>
        items
          .filter((f) => f.key && !f.key.endsWith("/"))
          .map((f) => {
            const name = f.key.split("/").pop() || f.key;
            return {
              name,
              id: f.key,
              key: f.key,
              folder,
              publicUrl: f.publicUrl || "",
              created_at: f.lastModified || new Date().toISOString(),
              metadata: { size: f.size, mimetype: "video/*" },
            };
          });

      const allVideos: VideoFile[] = [
        ...mapItems(recordings, "recordings"),
        ...mapItems(uploads, "videos"),
      ].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setVideos(allVideos);
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not load videos",
        description: err instanceof Error ? err.message : "Check cloud storage config",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const getPublicUrl = (video: VideoFile) => video.publicUrl;

  const copyLink = (video: VideoFile) => {
    const url = getPublicUrl(video);
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!" });
  };

  const deleteVideo = async (video: VideoFile) => {
    try {
      await deleteFromCloud(video.key);
      toast({ title: "Video deleted" });
      setVideos((v) => v.filter((f) => f.id !== video.id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredVideos = videos.filter((v: any) => {
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "recordings" && v.folder === "recordings") ||
      (filter === "uploads" && v.folder === "videos");
    return matchSearch && matchFilter;
  });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Video className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display">Video Library</h1>
              <p className="text-xs text-muted-foreground">{videos.length} videos</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos..."
              className="pl-9 h-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Videos</SelectItem>
              <SelectItem value="recordings">Recordings</SelectItem>
              <SelectItem value="uploads">Uploads</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Video Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No videos found</p>
            <p className="text-xs">Record or upload videos in your courses to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((video: any) => (
              <Card key={video.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                <div className="aspect-video bg-black relative flex items-center justify-center">
                  <video
                    src={getPublicUrl(video)}
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-10 w-10 text-white" />
                  </div>
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 text-[10px] bg-black/60 text-white border-0"
                  >
                    {video.folder === "recordings" ? "🎥 Recorded" : "📤 Uploaded"}
                  </Badge>
                </div>
                <CardContent className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate">{video.name}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {formatSize(video.metadata?.size)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(video.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] flex-1"
                      onClick={() => copyLink(video)}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => window.open(getPublicUrl(video), "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] text-destructive"
                      onClick={() => deleteVideo(video)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
