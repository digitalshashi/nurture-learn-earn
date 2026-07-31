import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users, TrendingUp, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import LeaderboardWidget from "@/components/dashboard/LeaderboardWidget";
import XPSummaryWidget from "@/components/dashboard/XPSummaryWidget";

export default function Dashboard() {
  const { user, hasRole, roles } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ courses: 0, students: 0, posts: 0 });

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    if (hasRole("coach") || hasRole("admin")) {
      const { count: courseCount } = await supabase.from("courses").select("*", { count: "exact", head: true }).eq("coach_id", user.id);
      const { count: enrollCount } = await supabase.from("enrollments").select("*", { count: "exact", head: true });
      const { count: postCount } = await supabase.from("posts").select("*", { count: "exact", head: true });
      setStats({ courses: courseCount || 0, students: enrollCount || 0, posts: postCount || 0 });
    } else {
      const { count: enrollCount } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const { count: postCount } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setStats({ courses: enrollCount || 0, students: 0, posts: postCount || 0 });
    }
  };

  const isCoachOrAdmin = hasRole("coach") || hasRole("admin");

  const statCards = isCoachOrAdmin
    ? [
        { title: "My Courses", value: stats.courses, icon: BookOpen, color: "text-accent" },
        { title: "Students", value: stats.students, icon: Users, color: "text-success" },
        { title: "Community Posts", value: stats.posts, icon: TrendingUp, color: "text-info" },
      ]
    : [
        { title: "Enrolled Courses", value: stats.courses, icon: BookOpen, color: "text-accent" },
        { title: "My Posts", value: stats.posts, icon: TrendingUp, color: "text-info" },
      ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold font-display">Dashboard</h1>
            <p className="text-sm text-muted-foreground capitalize">Role: {roles.join(", ") || "student"}</p>
          </div>
          <div className="flex gap-2">
            {isCoachOrAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate("/navigation-settings")}>
                  <Settings className="h-4 w-4 mr-1" /> Nav Settings
                </Button>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/course-builder")}>
                  <Plus className="h-4 w-4 mr-1" /> New Course
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main grid: content + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {statCards.map((stat) => (
                <Card key={stat.title} className="card-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate("/feed")}>
                  <TrendingUp className="h-5 w-5" /><span className="text-xs">Feed</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate("/courses")}>
                  <BookOpen className="h-5 w-5" /><span className="text-xs">Courses</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate("/channels")}>
                  <Users className="h-5 w-5" /><span className="text-xs">Channels</span>
                </Button>
                {isCoachOrAdmin && (
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate("/course-builder")}>
                    <Plus className="h-5 w-5" /><span className="text-xs">Create Course</span>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar: XP + Leaderboard */}
          <div className="space-y-6">
            <XPSummaryWidget />
            <LeaderboardWidget />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
