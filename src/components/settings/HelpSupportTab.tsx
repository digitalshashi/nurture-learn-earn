import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, HelpCircle, Mail, MessageSquare, Phone, Clock, MessageCircle, Save } from "lucide-react";

export function HelpSupportTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [senderEmail, setSenderEmail] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [supportHours, setSupportHours] = useState("");
  const [directChatEnabled, setDirectChatEnabled] = useState(true);
  const [aiChatName, setAiChatName] = useState("Coach AI");
  const [aiChatUrl, setAiChatUrl] = useState("");
  const [aiChatEnabled, setAiChatEnabled] = useState(true);
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
      setWhatsappNumber(d.whatsapp_number || "");
      setWhatsappMessage(d.whatsapp_message || "");
      setPhoneNumber(d.phone_number || "");
      setSupportHours(d.support_hours || "");
      setDirectChatEnabled(d.direct_chat_enabled !== false);
      setAiChatName(d.ai_chat_name || "Coach AI");
      setAiChatUrl(d.ai_chat_url || "");
      setAiChatEnabled(d.ai_chat_enabled !== false);
      setWidgetEnabled(d.widget_enabled || false);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("support_settings" as any)
      .upsert(
        {
          coach_id: user.id,
          sender_email: senderEmail.trim() || null,
          support_email: supportEmail.trim() || null,
          whatsapp_number: whatsappNumber.trim() || null,
          whatsapp_message: whatsappMessage.trim() || null,
          phone_number: phoneNumber.trim() || null,
          support_hours: supportHours.trim() || null,
          direct_chat_enabled: directChatEnabled,
          ai_chat_name: aiChatName.trim() || "Coach AI",
          ai_chat_url: aiChatUrl.trim() || null,
          ai_chat_enabled: aiChatEnabled,
          widget_enabled: widgetEnabled,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "coach_id" }
      );
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Support channels updated successfully" });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Coach AI Configuration */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-[#5B4DF5] text-white flex items-center justify-center font-bold text-xs">
                AI
              </div>
              <div>
                <h3 className="font-semibold text-sm">Coach AI Assistant</h3>
                <p className="text-xs text-muted-foreground">Add your custom AI chat link that appears as a pill button on Support Hub.</p>
              </div>
            </div>
            <Switch checked={aiChatEnabled} onCheckedChange={setAiChatEnabled} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">AI Chat Name / Label</Label>
              <Input
                value={aiChatName}
                onChange={(e) => setAiChatName(e.target.value)}
                placeholder="e.g. Sidz.ai or Coach AI"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Custom AI Link / URL</Label>
              <Input
                value={aiChatUrl}
                onChange={(e) => setAiChatUrl(e.target.value)}
                placeholder="https://..."
                className="text-sm font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* In-App Direct Chat */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-accent" />
              <div>
                <h3 className="font-semibold text-sm">Direct In-App Chat</h3>
                <p className="text-xs text-muted-foreground">Allow students to message you directly inside the platform inbox.</p>
              </div>
            </div>
            <Switch checked={directChatEnabled} onCheckedChange={setDirectChatEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Support */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#25D366]" />
            <h3 className="font-semibold text-sm">WhatsApp Support</h3>
          </div>
          <p className="text-xs text-muted-foreground">Enable 1-tap WhatsApp chat for your students and subscribers.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">WhatsApp Number (with country code)</Label>
              <Input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default Message (optional)</Label>
              <Input
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Hi! I have a question regarding..."
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Phone */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-sm">Support Phone / Mobile Number</h3>
          </div>
          <p className="text-xs text-muted-foreground">Mobile number for incoming student support calls.</p>
          <Input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+91 98765 43210"
            className="font-mono text-sm max-w-sm"
          />
        </CardContent>
      </Card>

      {/* Support Email */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-sm">Support Email Address (for incoming inquiries)</h3>
          </div>
          <p className="text-xs text-muted-foreground">Share your email id where your subscribers can reach out for support.</p>
          <Input
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            placeholder="support@yourdomain.com"
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      {/* Sender Email */}
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

      {/* Support Hours */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-sm">Support Operating Hours</h3>
          </div>
          <p className="text-xs text-muted-foreground">Expected working hours and average reply time.</p>
          <Input
            value={supportHours}
            onChange={(e) => setSupportHours(e.target.value)}
            placeholder="Mon–Sat: 9:00 AM – 7:00 PM IST · Replies within 2 hours"
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Quick Support Widget */}
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
            <Switch checked={widgetEnabled} onCheckedChange={setWidgetEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving changes...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Save All Support Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
