import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Monitor, Smartphone, LogOut, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";

interface LoginSession {
  id: string;
  user_id: string;
  device: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  last_active: string;
  is_active: boolean;
}

export function LoginSessionsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxSessions, setMaxSessions] = useState(5);

  useEffect(() => {
    if (user) loadSessions();
  }, [user]);

  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("login_sessions")
      .select("*")
      .eq("is_active", true)
      .order("last_active", { ascending: false });
    if (data) setSessions(data as LoginSession[]);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const logoutSession = async (sessionId: string) => {
    const { error } = await supabase
      .from("login_sessions")
      .update({ is_active: false } as any)
      .eq("id", sessionId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Session terminated" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }
  };

  const logoutAllSessions = async () => {
    const { error } = await supabase
      .from("login_sessions")
      .update({ is_active: false } as any)
      .eq("is_active", true);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "All sessions terminated" });
      setSessions([]);
    }
  };

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes("mobile") || device.toLowerCase().includes("phone")) {
      return <Smartphone className="h-4 w-4 text-muted-foreground" />;
    }
    return <Monitor className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Active Login Sessions</CardTitle>
            {sessions.length > 0 && (
              <Button variant="destructive" size="sm" onClick={logoutAllSessions}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Logout All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active sessions found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(session.device)}
                        <div>
                          <p className="text-xs font-medium">{session.os || "Unknown OS"} — {session.browser || "Unknown Browser"}</p>
                          <p className="text-[10px] text-muted-foreground">{session.device || "Desktop"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{session.location || "Unknown"}</TableCell>
                    <TableCell className="text-xs font-mono">{session.ip_address || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {session.last_active
                        ? formatDistanceToNow(new Date(session.last_active), { addSuffix: true })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => logoutSession(session.id)}>
                        <LogOut className="h-3.5 w-3.5 mr-1" /> Logout
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-sm">Session Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Maximum Sessions Per User</Label>
            <Input
              type="number"
              value={maxSessions}
              onChange={(e) => setMaxSessions(Number(e.target.value))}
              min={1}
              max={20}
              className="text-xs w-32 mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Oldest session will be terminated when limit is exceeded.
            </p>
          </div>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            Save Limit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
