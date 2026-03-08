import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, MessageSquare, Bell, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LogEntry {
  id: string;
  channel: string;
  action_type: string;
  status: string;
  user_name: string | null;
  user_email: string | null;
  metadata: any;
  created_at: string;
}

export default function AutomationLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("automation_logs")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setLogs((data as LogEntry[]) || []));
  }, [user]);

  const channelIcon = (ch: string) => {
    if (ch === "whatsapp") return <MessageSquare className="h-3.5 w-3.5 text-green-600" />;
    if (ch === "notification") return <Bell className="h-3.5 w-3.5 text-accent" />;
    return <Mail className="h-3.5 w-3.5 text-accent" />;
  };

  const statusBadge = (s: string) => {
    const cls = s === "delivered" || s === "sent" ? "bg-success text-success-foreground" :
                s === "failed" ? "bg-destructive text-destructive-foreground" :
                "bg-warning text-warning-foreground";
    return <Badge className={`${cls} text-xs`}>{s}</Badge>;
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Automation Logs</h1>

        <Card className="card-shadow">
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm font-medium">No automation logs yet</p>
                <p className="text-xs text-muted-foreground mt-1">Logs will appear when automations are triggered</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{log.user_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{log.user_email}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {channelIcon(log.channel)}
                          <span className="text-sm capitalize">{log.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{log.action_type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
