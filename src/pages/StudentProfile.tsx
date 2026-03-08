import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, Calendar, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserBadges } from "@/components/badges/UserBadges";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  email: string;
  created_at: string;
}

interface Post {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

function getBadge(xp: number) {
  if (xp >= 100000) return <Badge className="bg-purple-500/20 text-purple-600 border-purple-300">💎 Diamond</Badge>;
  if (xp >= 50000) return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-300">🥇 Gold</Badge>;
  if (xp >= 10000) return <Badge className="bg-slate-400/20 text-slate-600 border-slate-300">🥈 Silver</Badge>;
  if (xp >= 1000) return <Badge className="bg-orange-400/20 text-orange-600 border-orange-300">🥉 Bronze</Badge>;
  return <Badge variant="secondary">Starter</Badge>;
}

function formatXP(xp: number): string {
  if (xp >= 100000) return (xp / 100000).toFixed(2) + "L";
  if (xp >= 1000) return (xp / 1000).toFixed(1) + "K";
  return String(xp);
}

export default function StudentProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    const [profileRes, xpRes, postsRes, enrollRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId!).single(),
      supabase.from("xp_transactions").select("xp_amount").eq("user_id", userId!),
      supabase.from("posts").select("id, content, image_url, created_at").eq("user_id", userId!).eq("is_feed_post", true).order("created_at", { ascending: false }).limit(20),
      supabase.from("enrollments").select("id").eq("user_id", userId!),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (xpRes.data) setTotalXP(xpRes.data.reduce((s: number, t: any) => s + (t.xp_amount || 0), 0));
    if (postsRes.data) setPosts(postsRes.data as Post[]);
    if (enrollRes.data) setEnrolledCount(enrollRes.data.length);
    setLoading(false);
  };

  const handleChat = () => {
    if (userId) navigate(`/messages/${userId}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">Profile not found</div>
      </AppLayout>
    );
  }

  const isOwnProfile = user?.id === userId;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <Avatar className="h-20 w-20 border-2 border-accent">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="bg-accent/20 text-accent text-2xl font-bold">
                  {profile.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{profile.full_name}</h1>
                  <UserBadges userId={profile.id} maxVisible={3} size="sm" />
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                  <span className="text-lg font-bold text-accent">{formatXP(totalXP)} XP</span>
                  {getBadge(totalXP)}
                </div>
                {profile.bio && <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-center sm:justify-start">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                  <span>{enrolledCount} courses</span>
                </div>
              </div>
              {!isOwnProfile && (
                <Button onClick={handleChat} size="sm" className="shrink-0">
                  <MessageCircle className="h-4 w-4 mr-1" /> Chat
                </Button>
              )}
              {isOwnProfile && (
                <Button onClick={() => navigate("/my-account")} variant="outline" size="sm" className="shrink-0">
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="posts">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No posts yet</div>
            ) : (
              <div className="space-y-3 mt-3">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-accent/20 text-accent">{profile.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{profile.full_name}</span>
                        <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                      {post.content && <p className="text-sm">{post.content}</p>}
                      {post.image_url && <img src={post.image_url} alt="" className="mt-2 rounded-lg max-h-64 object-cover" />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="achievements">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <Card className="text-center p-4">
                <Award className="h-8 w-8 mx-auto text-accent mb-1" />
                <p className="text-lg font-bold">{formatXP(totalXP)}</p>
                <p className="text-xs text-muted-foreground">Total XP</p>
              </Card>
              <Card className="text-center p-4">
                <span className="text-2xl">📚</span>
                <p className="text-lg font-bold">{enrolledCount}</p>
                <p className="text-xs text-muted-foreground">Courses</p>
              </Card>
              <Card className="text-center p-4">
                <span className="text-2xl">✍️</span>
                <p className="text-lg font-bold">{posts.length}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="text-center py-12 text-muted-foreground text-sm">
              Activity feed coming soon
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
