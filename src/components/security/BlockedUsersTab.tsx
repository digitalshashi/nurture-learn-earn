import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserX, Unlock, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface BlockedUser {
  id: string;
  user_id: string;
  blocked_by: string;
  reason: string;
  blocked_at: string;
}

export function BlockedUsersTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [blockEmail, setBlockEmail] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string; email: string }>>({});

  useEffect(() => {
    if (user) loadBlockedUsers();
  }, [user]);

  const loadBlockedUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blocked_users")
      .select("*")
      .order("blocked_at", { ascending: false });
    if (data) {
      setBlockedUsers(data as BlockedUser[]);
      // Load profile info for blocked users
      const userIds = (data as BlockedUser[]).map((b) => b.user_id);
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        if (profileData) {
          const map: Record<string, { full_name: string; email: string }> = {};
          profileData.forEach((p: any) => { map[p.id] = { full_name: p.full_name, email: p.email }; });
          setProfiles(map);
        }
      }
    }
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const blockUser = async () => {
    if (!blockEmail.trim()) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" });
      return;
    }
    setBlocking(true);
    // Find user by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", blockEmail.trim())
      .maybeSingle();
    if (!profile) {
      toast({ title: "Error", description: "User not found with that email", variant: "destructive" });
      setBlocking(false);
      return;
    }
    const { error } = await supabase.from("blocked_users").insert({
      user_id: (profile as any).id,
      blocked_by: user!.id,
      reason: blockReason,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "User blocked" });
      setDialogOpen(false);
      setBlockEmail("");
      setBlockReason("");
      loadBlockedUsers();
    }
    setBlocking(false);
  };

  const unblockUser = async (id: string) => {
    const { error } = await supabase.from("blocked_users").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "User unblocked" });
      setBlockedUsers((prev) => prev.filter((b) => b.id !== id));
    }
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserX className="h-4 w-4" /> Blocked Users
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-3.5 w-3.5 mr-1" /> Block User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm">Block User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-xs">User Email</Label>
                  <Input placeholder="user@example.com" value={blockEmail} onChange={(e) => setBlockEmail(e.target.value)} className="text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Reason</Label>
                  <Textarea placeholder="Why is this user being blocked?" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} rows={3} className="text-xs mt-1" />
                </div>
                <Button onClick={blockUser} disabled={blocking} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full">
                  {blocking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Block User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No blocked users.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Blocked Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blockedUsers.map((blocked) => (
                <TableRow key={blocked.id}>
                  <TableCell>
                    <div>
                      <p className="text-xs font-medium">{profiles[blocked.user_id]?.full_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{profiles[blocked.user_id]?.email || blocked.user_id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{blocked.reason || "—"}</TableCell>
                  <TableCell className="text-xs">{format(new Date(blocked.blocked_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => unblockUser(blocked.id)}>
                      <Unlock className="h-3.5 w-3.5 mr-1" /> Unblock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
