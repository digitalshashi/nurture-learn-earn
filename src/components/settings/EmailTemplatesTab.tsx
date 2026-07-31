import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface TemplateDef {
  key: string;
  label: string;
  variables: string[];
  defaultSubject: string;
  defaultBody: string;
}

const COACH_TEMPLATES: TemplateDef[] = [
  {
    key: "welcome_email",
    label: "Welcome Email",
    variables: ["full_name", "academy_name"],
    defaultSubject: "Welcome to {{academy_name}}!",
    defaultBody: "<p>Hi {{full_name}},</p><p>Welcome aboard! We're excited to have you.</p>",
  },
  {
    key: "course_enrollment",
    label: "Course Enrollment Confirmation",
    variables: ["full_name", "course_name"],
    defaultSubject: "You're enrolled in {{course_name}}",
    defaultBody: "<p>Hi {{full_name}},</p><p>You've been successfully enrolled in <strong>{{course_name}}</strong>.</p>",
  },
  {
    key: "payment_receipt",
    label: "Payment Receipt",
    variables: ["full_name", "amount", "item_name", "transaction_id"],
    defaultSubject: "Your receipt for {{item_name}}",
    defaultBody: "<p>Hi {{full_name}},</p><p>Thanks for your payment of {{amount}} for {{item_name}}.</p><p>Transaction ID: {{transaction_id}}</p>",
  },
  {
    key: "certificate_issued",
    label: "Certificate Issued",
    variables: ["full_name", "course_name"],
    defaultSubject: "Your certificate for {{course_name}} is ready",
    defaultBody: "<p>Hi {{full_name}},</p><p>Congratulations on completing <strong>{{course_name}}</strong>! Your certificate is ready.</p>",
  },
  {
    key: "course_reminder",
    label: "Course / Lesson Reminder",
    variables: ["full_name", "course_name", "lesson_name"],
    defaultSubject: "Continue learning: {{course_name}}",
    defaultBody: "<p>Hi {{full_name}},</p><p>Don't forget to continue with {{lesson_name}} in {{course_name}}.</p>",
  },
  {
    key: "event_reminder",
    label: "Event Reminder",
    variables: ["full_name", "event_name", "event_time"],
    defaultSubject: "Reminder: {{event_name}} starts soon",
    defaultBody: "<p>Hi {{full_name}},</p><p>{{event_name}} starts at {{event_time}}. See you there!</p>",
  },
  {
    key: "password_reset",
    label: "Password Reset",
    variables: ["full_name", "reset_link"],
    defaultSubject: "Reset your password",
    defaultBody: "<p>Hi {{full_name}},</p><p>Click the link below to reset your password:</p><p>{{reset_link}}</p>",
  },
];

const SYSTEM_TEMPLATE: TemplateDef = {
  key: "login_otp",
  label: "System — Login OTP Email",
  variables: ["full_name", "otp_code", "expiry_minutes"],
  defaultSubject: "Your login code: {{otp_code}}",
  defaultBody: "<p>Hi {{full_name}},</p><p>Your one-time login code is:</p><h2>{{otp_code}}</h2><p>This code expires in {{expiry_minutes}} minutes.</p>",
};

interface TemplateRow {
  id?: string;
  coach_id: string | null;
  template_key: string;
  subject: string;
  from_name: string | null;
  reply_to_name: string | null;
  reply_to_email: string | null;
  body_html: string;
  is_active: boolean;
}

function makeEmptyRow(def: TemplateDef, coachId: string | null): TemplateRow {
  return {
    coach_id: coachId,
    template_key: def.key,
    subject: def.defaultSubject,
    from_name: null,
    reply_to_name: null,
    reply_to_email: null,
    body_html: def.defaultBody,
    is_active: true,
  };
}

function TemplateEditor({
  def,
  row,
  onChange,
  onSave,
  saving,
}: {
  def: TemplateDef;
  row: TemplateRow;
  onChange: (row: TemplateRow) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <AccordionItem value={def.key}>
      <AccordionTrigger className="text-sm">{def.label}</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Available variables: {def.variables.map((v) => `{{${v}}}`).join(", ")}
          </p>
          <div><Label className="text-xs">Subject</Label><Input value={row.subject} onChange={(e) => onChange({ ...row, subject: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">From Name (optional override)</Label><Input value={row.from_name || ""} onChange={(e) => onChange({ ...row, from_name: e.target.value || null })} /></div>
            <div><Label className="text-xs">Reply-To Email (optional override)</Label><Input value={row.reply_to_email || ""} onChange={(e) => onChange({ ...row, reply_to_email: e.target.value || null })} /></div>
          </div>
          <div><Label className="text-xs">Body (HTML)</Label><Textarea rows={8} className="font-mono text-xs" value={row.body_html} onChange={(e) => onChange({ ...row, body_html: e.target.value })} /></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Active</Label>
              <Switch checked={row.is_active} onCheckedChange={(v) => onChange({ ...row, is_active: v })} />
            </div>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={onSave} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Save
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function EmailTemplatesTab({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, TemplateRow>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: coachRows } = await supabase
        .from("email_templates" as any)
        .select("*")
        .eq("coach_id", user.id);

      const { data: systemRow } = isAdmin
        ? await supabase.from("email_templates" as any).select("*").is("coach_id", null).eq("template_key", "login_otp").maybeSingle()
        : { data: null };

      const next: Record<string, TemplateRow> = {};
      for (const def of COACH_TEMPLATES) {
        const existing = (coachRows as any as TemplateRow[] | null)?.find((r) => r.template_key === def.key);
        next[def.key] = existing || makeEmptyRow(def, user.id);
      }
      if (isAdmin) {
        next[SYSTEM_TEMPLATE.key] = (systemRow as any as TemplateRow | null) || makeEmptyRow(SYSTEM_TEMPLATE, null);
      }
      setRows(next);
      setLoaded(true);
    })();
  }, [user, isAdmin]);

  const handleSave = async (key: string) => {
    if (!user) return;
    const row = rows[key];
    setSavingKey(key);
    const payload = { ...row, updated_at: new Date().toISOString() };
    const onConflict = row.coach_id ? "coach_id,template_key" : "template_key";
    const { error } = await supabase.from("email_templates" as any).upsert(payload as any, { onConflict });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Template saved" });
    setSavingKey(null);
  };

  if (!loaded) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="card-shadow">
        <CardHeader><CardTitle className="text-base">Your Email Templates</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {COACH_TEMPLATES.map((def) => (
              <TemplateEditor
                key={def.key}
                def={def}
                row={rows[def.key]}
                onChange={(r) => setRows((prev) => ({ ...prev, [def.key]: r }))}
                onSave={() => handleSave(def.key)}
                saving={savingKey === def.key}
              />
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="card-shadow border-accent/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-accent" /> System Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <TemplateEditor
                def={SYSTEM_TEMPLATE}
                row={rows[SYSTEM_TEMPLATE.key]}
                onChange={(r) => setRows((prev) => ({ ...prev, [SYSTEM_TEMPLATE.key]: r }))}
                onSave={() => handleSave(SYSTEM_TEMPLATE.key)}
                saving={savingKey === SYSTEM_TEMPLATE.key}
              />
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
