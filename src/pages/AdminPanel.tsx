import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, BookOpen } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
}

export default function AdminPanel() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [stats, setStats] = useState({ users: 0, courses: 0, posts: 0 });

  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  const loadUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    if (profiles && roles) {
      const mapped = profiles.map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        roles: roles.filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      }));
      setUsers(mapped);
    }
  };

  const loadStats = async () => {
    const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: courseCount } = await supabase.from("courses").select("*", { count: "exact", head: true });
    const { count: postCount } = await supabase.from("posts").select("*", { count: "exact", head: true });
    setStats({ users: userCount || 0, courses: courseCount || 0, posts: postCount || 0 });
  };

  const changeRole = async (userId: string, newRole: string) => {
    // Remove existing roles, add new one
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    toast({ title: "Role updated" });
    loadUsers();
  };

  if (!hasRole("admin") && !hasRole("super_admin")) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-var(--nav-height))]">
          <p className="text-muted-foreground">Admin access required</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6 flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" /> Admin Panel
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="card-shadow">
            <CardContent className="pt-6 flex items-center gap-3">
              <Users className="h-8 w-8 text-accent" />
              <div><p className="text-xs text-muted-foreground">Total Users</p><p className="text-xl font-bold">{stats.users}</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-6 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-success" />
              <div><p className="text-xs text-muted-foreground">Total Courses</p><p className="text-xl font-bold">{stats.courses}</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-6 flex items-center gap-3">
              <Shield className="h-8 w-8 text-info" />
              <div><p className="text-xs text-muted-foreground">Total Posts</p><p className="text-xl font-bold">{stats.posts}</p></div>
            </CardContent>
          </Card>
        </div>

        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-base">Manage Users</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-accent/20 text-accent text-sm font-semibold">{(u.full_name || u.email).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name || "No name"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Select value={u.roles[0] || "student"} onValueChange={(v) => changeRole(u.id, v)}>
                    <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
