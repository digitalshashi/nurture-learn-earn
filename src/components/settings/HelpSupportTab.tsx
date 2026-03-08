import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, HelpCircle } from "lucide-react";

export function HelpSupportTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [senderEmail, setSenderEmail] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [widgetEnabled, setWidgetEnabled] = useState(false);

  useEffect(() => {
    if (user) loadSettings();
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("support_settings" as any)
      .select("*")
      .eq("coach_id", user!.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setSenderEmail(d.sender_email || "");
      setSupportEmail(d.support_email || "");
      setWidgetEnabled(d.widget_enabled || false);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("support_settings" as any)
      .upsert({
        coach_id: user.id,
        sender_email: senderEmail,
        support_email: supportEmail,
        widget_enabled: widgetEnabled,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "coach_id" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Settings updated successfully" });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-2">
          <h3 className="font-semibold text-sm">Sender Email Address (for outgoing emails)</h3>
          <p className="text-xs text-muted-foreground">
            {senderEmail ? `All system emails will go from ${senderEmail}` : "Configure the email address used for sending system emails."}
          </p>
          {senderEmail && (
            <span className="text-xs text-primary cursor-pointer hover:underline" onClick={() => setSenderEmail("")}>(change)</span>
          )}
          {!senderEmail && <Input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="hi@yourdomain.com" />}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <h3 className="font-semibold text-sm">Support Email Address (for incoming emails)</h3>
          <p className="text-xs text-muted-foreground">Share your email id where your subscribers can reach out for support.</p>
          <div className="flex gap-2 items-end">
            <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="Enter email" className="max-w-sm" />
            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-sm">Quick Support Widget</h3>
                <p className="text-xs text-muted-foreground">Stay in touch with your subscribers with a quick support widget in the feed page.</p>
              </div>
            </div>
            <Switch checked={widgetEnabled} onCheckedChange={(v) => { setWidgetEnabled(v); }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
