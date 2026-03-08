import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

export function DomainTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    if (user) loadSettings();
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("domain_settings" as any)
      .select("*")
      .eq("coach_id", user!.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setDomain(d.domain || "");
      setStatus(d.status || "pending");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !domain.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("domain_settings" as any)
      .upsert({
        coach_id: user.id,
        domain: domain.trim(),
        status: "pending",
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "coach_id" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Domain saved! Verification pending." }); setStatus("pending"); }
    setSaving(false);
  };

  const statusBadge = () => {
    switch (status) {
      case "verified":
      case "active":
        return <Badge className="bg-green-100 text-green-700 border-0"><CheckCircle2 className="h-3 w-3 mr-1" /> {status === "active" ? "Active" : "Verified"}</Badge>;
      case "pending":
        return <Badge variant="secondary" className="border-0"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="destructive" className="border-0"><AlertTriangle className="h-3 w-3 mr-1" /> {status}</Badge>;
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-sm">Link your domain to the Website Builder</h3>
          <p className="text-xs text-muted-foreground">Choose the domain to host your website on.</p>

          {domain && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{domain}</span>
              {statusBadge()}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs">Custom Domain</Label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="learn.yourdomain.com" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Configure now"}
            </Button>
          </div>

          {domain && status === "pending" && (
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs font-medium">DNS Configuration Required</p>
                <p className="text-xs text-muted-foreground">Add the following CNAME record at your domain registrar:</p>
                <div className="bg-background rounded p-3 font-mono text-xs space-y-1">
                  <div><span className="text-muted-foreground">Type:</span> CNAME</div>
                  <div><span className="text-muted-foreground">Name:</span> learn</div>
                  <div><span className="text-muted-foreground">Value:</span> platform.yourlms.app</div>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            <strong>Important –</strong> Connecting a domain that is already hosting an existing website will disconnect that website. Configure your domain if you don't have a website on it or want a new one.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
