import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface Report {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string;
  status: string;
  action_taken: string | null;
  created_at: string;
}

export function ReportedContentTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (user) loadReports();
  }, [user, filter]);

  const loadReports = async () => {
    setLoading(true);
    let query = supabase
      .from("reported_content")
      .select("*")
      .order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (data) setReports(data as Report[]);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const updateReport = async (id: string, action: string) => {
    const { error } = await supabase
      .from("reported_content")
      .update({
        status: "resolved",
        action_taken: action,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      } as any)
      .eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Report updated" });
      loadReports();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "resolved":
        return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Resolved</Badge>;
      case "dismissed":
        return <Badge variant="outline" className="text-muted-foreground text-[10px]"><XCircle className="h-3 w-3 mr-1" /> Dismissed</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Reported Content</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32 text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No reports found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] capitalize">{report.content_type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs capitalize">{report.reason || "—"}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{report.description || "—"}</TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-xs">{format(new Date(report.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    {report.status === "pending" ? (
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateReport(report.id, "content_deleted")}>
                          Delete Content
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateReport(report.id, "user_warned")}>
                          Warn User
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => {
                          supabase.from("reported_content").update({ status: "dismissed", reviewed_by: user!.id, reviewed_at: new Date().toISOString() } as any).eq("id", report.id).then(() => loadReports());
                        }}>
                          Dismiss
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground capitalize">{report.action_taken?.replace("_", " ") || "—"}</span>
                    )}
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
