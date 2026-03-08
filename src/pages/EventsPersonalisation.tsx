import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Mail, MessageSquare, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface EventToggle {
  event_key: string;
  label: string;
  channel: "email" | "whatsapp" | "notification";
  is_enabled: boolean;
}

const DEFAULT_EMAIL_EVENTS: EventToggle[] = [
  { event_key: "email_purchase_confirmation", label: "Confirmation Email on Service Purchase", channel: "email", is_enabled: true },
  { event_key: "email_purchase_dropoff", label: "Reminder Email on Purchase Drop-off", channel: "email", is_enabled: true },
  { event_key: "email_failed_purchase", label: "Reminder Email on Failed Purchase", channel: "email", is_enabled: false },
  { event_key: "email_new_post", label: "Notification Email on New Post Creation", channel: "email", is_enabled: true },
  { event_key: "email_post_comment", label: "Notification Email on Post Comment", channel: "email", is_enabled: true },
  { event_key: "email_comment_like", label: "Notification Email on Comment Like", channel: "email", is_enabled: true },
  { event_key: "email_comment_reply", label: "Notification Email on Comment Reply", channel: "email", is_enabled: true },
  { event_key: "email_tag_in_comment", label: "Notification Email on Tagging Someone in Comment", channel: "email", is_enabled: true },
  { event_key: "email_service_creation", label: "Promotional Email on Service Creation", channel: "email", is_enabled: false },
  { event_key: "email_single_workshop", label: "Notification Email on Single Workshop Creation", channel: "email", is_enabled: true },
  { event_key: "email_recurring_workshop", label: "Notification Email on Recurring Workshop Creation", channel: "email", is_enabled: true },
  { event_key: "email_reschedule_workshop", label: "Notification Email on Rescheduling a Workshop", channel: "email", is_enabled: true },
  { event_key: "email_cancel_workshop", label: "Notification Email on Workshop Cancellation", channel: "email", is_enabled: true },
  { event_key: "email_24h_workshop", label: "Reminder Email 24 hours before Workshop", channel: "email", is_enabled: true },
  { event_key: "email_30m_workshop", label: "Reminder Email 30 mins before Workshop", channel: "email", is_enabled: true },
  { event_key: "email_15m_workshop", label: "Reminder Email 15 mins before Workshop", channel: "email", is_enabled: true },
  { event_key: "email_post_workshop", label: "Post Workshop Email 15 mins after Workshop", channel: "email", is_enabled: true },
  { event_key: "email_subscription_expired", label: "Notification Email after Subscription Expired", channel: "email", is_enabled: false },
  { event_key: "email_10_course", label: "Notification Email for 10% Course Completion", channel: "email", is_enabled: false },
  { event_key: "email_50_course", label: "Notification Email for 50% Course Completion", channel: "email", is_enabled: false },
  { event_key: "email_100_course", label: "Notification Email for 100% Course Completion", channel: "email", is_enabled: true },
  { event_key: "email_consultation_booking", label: "Confirmation Email on 1-1 Consultation Booking", channel: "email", is_enabled: true },
  { event_key: "email_30m_consultation", label: "Reminder Email 30 mins before 1-1 Consultation", channel: "email", is_enabled: true },
  { event_key: "email_cancel_consultation", label: "Cancellation Email on 1-1 Consultation Cancel", channel: "email", is_enabled: true },
];

const DEFAULT_WHATSAPP_EVENTS: EventToggle[] = [
  { event_key: "wa_purchase_confirmation", label: "Confirmation WhatsApp on Service Purchase", channel: "whatsapp", is_enabled: true },
  { event_key: "wa_new_post", label: "Notification WhatsApp on New Post Creation", channel: "whatsapp", is_enabled: false },
  { event_key: "wa_incomplete_order", label: "Notification WhatsApp on Incomplete Order", channel: "whatsapp", is_enabled: false },
  { event_key: "wa_failed_order", label: "Notification WhatsApp on Failed Order", channel: "whatsapp", is_enabled: false },
  { event_key: "wa_workshop_creation", label: "Notification WhatsApp on Workshop Creation", channel: "whatsapp", is_enabled: true },
  { event_key: "wa_24h_workshop", label: "Notification WhatsApp 24 hours before Workshop", channel: "whatsapp", is_enabled: true },
  { event_key: "wa_30m_workshop", label: "Notification WhatsApp 30 mins before Workshop", channel: "whatsapp", is_enabled: true },
  { event_key: "wa_15m_workshop", label: "Notification WhatsApp 15 mins before Workshop", channel: "whatsapp", is_enabled: true },
  { event_key: "wa_post_workshop", label: "Notification WhatsApp 15 mins after Workshop", channel: "whatsapp", is_enabled: true },
  { event_key: "wa_subscription_expired", label: "Notification WhatsApp 24 hours after Subscription Expired", channel: "whatsapp", is_enabled: false },
  { event_key: "wa_10_course", label: "Reminder WhatsApp for 10% Course Completion", channel: "whatsapp", is_enabled: false },
  { event_key: "wa_50_course", label: "Reminder WhatsApp for 50% Course Completion", channel: "whatsapp", is_enabled: false },
  { event_key: "wa_100_course", label: "Reminder WhatsApp for 100% Course Completion", channel: "whatsapp", is_enabled: true },
  { event_key: "wa_consultation_booking", label: "Confirmation WhatsApp for 1-1 Consultation Booking", channel: "whatsapp", is_enabled: true },
  { event_key: "wa_30m_consultation", label: "Reminder WhatsApp 30 mins before 1-1 Consultation", channel: "whatsapp", is_enabled: true },
];

export default function EventsPersonalisation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [emailEvents, setEmailEvents] = useState(DEFAULT_EMAIL_EVENTS);
  const [whatsappEvents, setWhatsappEvents] = useState(DEFAULT_WHATSAPP_EVENTS);

  const loadToggles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("automation_event_toggles")
      .select("*")
      .eq("coach_id", user.id);

    if (data && data.length > 0) {
      const map = new Map(data.map((d: any) => [d.event_key, d.is_enabled]));
      setEmailEvents(prev => prev.map(e => ({ ...e, is_enabled: map.has(e.event_key) ? map.get(e.event_key)! : e.is_enabled })));
      setWhatsappEvents(prev => prev.map(e => ({ ...e, is_enabled: map.has(e.event_key) ? map.get(e.event_key)! : e.is_enabled })));
    }
  };

  useEffect(() => { loadToggles(); }, [user]);

  const handleToggle = async (event_key: string, channel: string, newValue: boolean) => {
    if (!user) return;

    if (channel === "email") {
      setEmailEvents(prev => prev.map(e => e.event_key === event_key ? { ...e, is_enabled: newValue } : e));
    } else {
      setWhatsappEvents(prev => prev.map(e => e.event_key === event_key ? { ...e, is_enabled: newValue } : e));
    }

    const { error } = await supabase.from("automation_event_toggles").upsert({
      coach_id: user.id,
      event_key,
      channel,
      is_enabled: newValue,
    } as any, { onConflict: "coach_id,event_key" });

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    }
  };

  const channelIcon = (ch: string) => {
    if (ch === "whatsapp") return <MessageSquare className="h-4 w-4 text-green-600" />;
    if (ch === "notification") return <Bell className="h-4 w-4 text-accent" />;
    return <Mail className="h-4 w-4 text-accent" />;
  };

  const renderEventList = (events: EventToggle[]) => (
    <div className="space-y-0">
      <div className="grid grid-cols-[1fr_80px_60px] gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
        <span>Template Type</span>
        <span className="text-center">Enabled</span>
        <span className="text-center">Actions</span>
      </div>
      {events.map((evt, i) => (
        <div key={evt.event_key} className="grid grid-cols-[1fr_80px_60px] gap-2 items-center px-4 py-3 border-b border-border last:border-0">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">+</span>
            <span className="text-sm">{evt.label}</span>
          </div>
          <div className="flex justify-center">
            <Switch checked={evt.is_enabled} onCheckedChange={(v) => handleToggle(evt.event_key, evt.channel, v)} />
          </div>
          <div className="flex justify-center">
            <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Events Personalisation</h1>

        <Tabs defaultValue="email">
          <TabsList className="mb-4">
            <TabsTrigger value="email" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-sm">Email Event Templates</CardTitle></CardHeader>
              <CardContent className="p-0">
                {renderEventList(emailEvents)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp">
            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-sm">WhatsApp Event Templates</CardTitle></CardHeader>
              <CardContent className="p-0">
                {renderEventList(whatsappEvents)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
