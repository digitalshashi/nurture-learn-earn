import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AiWriteButton } from "@/components/ai/AiWriteButton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Send,
  Loader2,
  Code,
  Eye,
  Type,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { extractEditable, isFullDocument, spliceEditable } from "@/lib/emailTemplates";

export interface EmailTemplateEditorProps {
  subject: string;
  html: string;
  onSubjectChange: (v: string) => void;
  onHtmlChange: (v: string) => void;
  /** Placeholders offered as one-click inserts, e.g. ["student_name"]. */
  variables?: string[];
  /** Sender account to test through; falls back to the routed one. */
  accountId?: string | null;
  purpose?: "transactional" | "marketing" | "automation" | "support";
  /**
   * What this email is for, e.g. "Certificate issued - sent when a student
   * finishes a course". Given to the AI writer so it drafts this email rather
   * than a generic one.
   */
  describes?: string;
  /** Sample values used for preview and test sends. */
  sampleValues?: Record<string, string>;
}

// Covers every placeholder the shipped templates use, so a preview never
// shows a raw {{token}} and a test send reads like a real message.
const DEFAULT_SAMPLES: Record<string, string> = {
  full_name: "Alex Fernandes",
  student_name: "Alex Fernandes",
  // account_created tells the reader the address and one-time password their
  // account was made with. The sample is obviously fake on purpose: a preview
  // that looks like a real credential invites someone to try it.
  email: "alex@example.com",
  temporary_password: "Temp-1234-Example",
  // sale_notification is addressed to the coach, about the person who bought.
  buyer_name: "Alex Fernandes",
  buyer_email: "alex@example.com",
  coach_name: "Priya Sharma",
  academy_name: "Bright Path Academy",
  year: String(new Date().getFullYear()),

  course_name: "Foundations of Coaching",
  lesson_name: "Session 3 — Asking better questions",
  lesson_count: "12 lessons",
  progress_percent: "45%",
  service_name: "1:1 Strategy Call",

  event_name: "Live Q&A with Priya",
  event_date: "Friday, 12 September",
  event_time: "6:30 PM IST",
  duration: "45 minutes",

  amount: "₹1,499",
  item_name: "Foundations of Coaching",
  transaction_id: "pay_29Qv8ZbXk1LmNq",
  payment_date: "28 August 2026",
  payment_method: "UPI",
  completion_date: "26 August 2026",

  otp: "482913",
  otp_code: "482913",
  expiry_minutes: "10",

  lesson_duration: "14 min",
  assignment_name: "Module 2 — Client intake plan",
  submitted_at: "27 August 2026, 9:14 PM",
  review_window: "2 working days",
  grade: "Passed — 88%",
  reviewer_name: "Priya Sharma",
  lessons_completed: "12 of 12",
  time_invested: "4h 20m",
  next_course_name: "Coaching at Scale",
  lessons_this_week: "3",
  streak_days: "6 days",
  expiry_date: "14 September 2026",
  days_left: "7 days",
  replier_name: "Priya Sharma",
  reply_excerpt: "Great question — start with the intake form, then layer the goals on top.",

  workshop_name: "Coaching Intensive",
  session_name: "Live Q&A — week 3",
  session_number: "2",
  total_sessions: "4",
  start_time: "6:30 PM IST",
  recording_length: "52 min",
  available_until: "30 November 2026",

  plan_name: "Pro — monthly",
  renewal_date: "15 September 2026",
  retry_date: "31 August 2026",
  refund_date: "28 August 2026",

  badge_name: "Fast Starter",
  badge_description: "you finished three lessons in your first week.",
  xp_earned: "150 XP",
  xp_bonus: "200 XP",
  total_xp: "1,240 XP",
  level_number: "4",
  level_name: "Practitioner",
  next_level_name: "Mentor",
  xp_to_next: "260 XP",

  inviter_name: "Priya Sharma",
  role_name: "Coach",
  expiry_days: "7 days",
  sender_name: "Priya Sharma",
  message_excerpt: "Just reviewed your notes — can we move Thursday's call to 4pm?",


  author_name: "Priya Sharma",
  commenter_name: "Dev Menon",
  liker_name: "Dev Menon",
  mentioner_name: "Dev Menon",
  post_title: "How I structure a first coaching call",
  post_excerpt: "Three questions I ask before anything else, and why the order matters.",
  comment_excerpt: "This is exactly what I needed — do you use the same order for group sessions?",
  service_description: "A 60-minute working session to map out your next quarter.",
  price: "₹4,999",
  session_count: "4 sessions",
  previous_date: "Friday, 12 September",
  refund_note: "You have been refunded in full — it should land within 5 working days.",
  link: "https://example.com/open",
  dashboard_link: "https://example.com/dashboard",
  course_link: "https://example.com/course",
  resume_link: "https://example.com/resume",
  join_link: "https://example.com/join",
  certificate_link: "https://example.com/certificate",
  reset_link: "https://example.com/reset",
  login_link: "https://example.com/login",
  lesson_link: "https://example.com/lesson",
  feedback_link: "https://example.com/feedback",
  next_course_link: "https://example.com/next-course",
  renew_link: "https://example.com/renew",
  thread_link: "https://example.com/thread",
  checkout_link: "https://example.com/checkout",
  booking_link: "https://example.com/book",
  calendar_link: "https://example.com/calendar.ics",
  recording_link: "https://example.com/recording",
  billing_link: "https://example.com/billing",
  update_payment_link: "https://example.com/billing/card",
  badges_link: "https://example.com/badges",
  leaderboard_link: "https://example.com/leaderboard",
  accept_link: "https://example.com/invite/accept",
  conversation_link: "https://example.com/messages",
  post_link: "https://example.com/community/post",
  service_link: "https://example.com/service",
};

/** Fills {{placeholders}} for preview. Mirrors the server's substitution. */
export function renderPreview(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) =>
    values[key] === undefined ? whole : values[key],
  );
}

/**
 * Edit an email body three ways: formatted, as HTML source, and as a preview,
 * plus a real test send.
 *
 * Templates were previously a bare <textarea> of raw HTML with no way to see
 * the result or try it, so the only way to check a change was to trigger the
 * real automation and hope.
 */
export function EmailTemplateEditor({
  describes,
  subject,
  html,
  onSubjectChange,
  onHtmlChange,
  variables = [],
  accountId,
  purpose = "transactional",
  sampleValues,
}: EmailTemplateEditorProps) {
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState("rich");
  const [testTo, setTestTo] = useState("");
  const [sending, setSending] = useState(false);

  const samples = { ...DEFAULT_SAMPLES, ...(sampleValues ?? {}) };

  // contentEditable discards <!doctype>, <html>, <head> and <body>, so a full
  // document cannot be round-tripped through it. Templates built by
  // buildEmail() mark an inner region the editor may safely own; anything else
  // that is a full document is HTML-only, or the shell would be lost on the
  // first keystroke.
  const editableRegion = extractEditable(html);
  const richEditable = editableRegion !== null || !isFullDocument(html);
  const richValue = editableRegion ?? html;

  /** Wraps an edit of the inner region back into its shell. */
  const commitRich = (inner: string) =>
    onHtmlChange(editableRegion !== null ? spliceEditable(html, inner) : inner);

  // Push external changes into the contentEditable, but never while it has
  // focus — rewriting innerHTML mid-edit collapses the caret to the start.
  useEffect(() => {
    const el = editorRef.current;
    if (!el || mode !== "rich") return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== richValue) el.innerHTML = richValue;
  }, [richValue, mode]);

  const exec = useCallback(
    (command: string, value?: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      // execCommand is deprecated but remains the only broadly supported way to
      // do rich editing without pulling in a full editor framework.
      document.execCommand(command, false, value);
      commitRich(el.innerHTML);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onHtmlChange, html, editableRegion],
  );

  const insertVariable = (name: string) => {
    const token = `{{${name}}}`;
    if (mode === "rich") {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      document.execCommand("insertText", false, token);
      commitRich(el.innerHTML);
    } else {
      onHtmlChange(html + token);
    }
  };

  const addLink = () => {
    const url = window.prompt("Link URL");
    if (!url) return;
    // Block javascript: and other script-bearing schemes.
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
      toast({
        title: "Unsupported link",
        description: "Use an http(s):// or mailto: address.",
        variant: "destructive",
      });
      return;
    }
    exec("createLink", url);
  };

  const sendTest = async () => {
    if (!testTo.trim()) {
      toast({ title: "Enter an address to send to", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            to: testTo.trim(),
            subject,
            html,
            account_id: accountId ?? null,
            purpose,
            variables: samples,
          }),
        },
      );

      const body = await res.json();
      if (res.ok && body.success) {
        toast({ title: "Test sent", description: `From ${body.sent_from} via ${body.provider}` });
      } else {
        toast({
          title: "Couldn't send",
          description: body.error || "The provider rejected the message.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Couldn't send", description: "Network error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const ToolbarButton = ({
    onClick,
    label,
    children,
  }: {
    onClick: () => void;
    label: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the selection alive
      onClick={onClick}
      title={label}
      aria-label={label}
      className="h-8 w-8 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <Label htmlFor="email-subject" className="text-xs">
            Subject
          </Label>
          <AiWriteButton
            task="a transactional email for an online course platform"
            label="Draft with AI"
            context={{
              "This email is": describes,
              Purpose: purpose,
              "Placeholders you may use": variables.map((v) => `{{${v}}}`).join(", "),
              "Current subject": subject,
            }}
            fields={[
              { key: "subject", hint: "Subject line, under 60 characters" },
              {
                key: "html",
                hint:
                  "Email body as simple HTML paragraphs. Use only the placeholders listed, " +
                  "written exactly as {{name}}. No <html> or <body> wrapper.",
              },
            ]}
            onResult={(r) => {
              if (r.subject) onSubjectChange(r.subject);
              if (r.html) onHtmlChange(r.html);
            }}
          />
        </div>
        <Input
          id="email-subject"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Your course starts tomorrow"
        />
      </div>

      {variables.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Insert:</span>
          {variables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              className="text-[11px] font-mono px-2 py-0.5 rounded border border-border hover:bg-secondary transition-colors"
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      )}

      <Tabs value={richEditable ? mode : "html"} onValueChange={setMode}>
        <TabsList>
          <TabsTrigger value="rich" className="gap-1.5" disabled={!richEditable}>
            <Type className="h-3.5 w-3.5" /> Editor
          </TabsTrigger>
          <TabsTrigger value="html" className="gap-1.5">
            <Code className="h-3.5 w-3.5" /> HTML
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rich" className="mt-3">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1.5 py-1">
              <ToolbarButton onClick={() => exec("bold")} label="Bold">
                <Bold className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => exec("italic")} label="Italic">
                <Italic className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => exec("underline")} label="Underline">
                <Underline className="h-4 w-4" />
              </ToolbarButton>
              <div className="w-px h-5 bg-border mx-1" />
              <ToolbarButton onClick={() => exec("formatBlock", "<h2>")} label="Heading">
                <Heading2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => exec("insertUnorderedList")} label="Bulleted list">
                <List className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => exec("insertOrderedList")} label="Numbered list">
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>
              <div className="w-px h-5 bg-border mx-1" />
              <ToolbarButton onClick={addLink} label="Insert link">
                <Link2 className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <div
              ref={editorRef}
              contentEditable
              role="textbox"
              aria-multiline="true"
              aria-label="Email body"
              onInput={(e) => commitRich((e.target as HTMLDivElement).innerHTML)}
              className={cn(
                "min-h-[220px] max-h-[420px] overflow-y-auto p-4 text-sm outline-none",
                "prose prose-sm dark:prose-invert max-w-none",
              )}
            />
          </div>
        </TabsContent>

        {!richEditable && (
          <p className="text-[11px] text-muted-foreground mt-2">
            This template is a full HTML document without an editable region, so it is
            edited as source to avoid losing its layout.
          </p>
        )}

        <TabsContent value="html" className="mt-3">
          <Textarea
            aria-label="Email HTML source"
            value={html}
            onChange={(e) => onHtmlChange(e.target.value)}
            rows={14}
            className="font-mono text-xs"
            placeholder="<p>Hi {{student_name}},</p>"
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-3">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="border-b border-border bg-muted/40 px-4 py-2">
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="text-sm font-semibold">
                {renderPreview(subject, samples) || "(no subject)"}
              </p>
            </div>
            {/* Sandboxed: template HTML is rendered as a document, not injected
                into this page, so a stray script cannot touch the app. */}
            <iframe
              title="Email preview"
              sandbox=""
              className="w-full h-[420px] bg-white"
              srcDoc={
                // Templates are complete documents; wrapping one in another
                // <body> would nest two documents and drop the outer styling.
                isFullDocument(html)
                  ? renderPreview(html, samples)
                  : `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,sans-serif;padding:16px;color:#111">${renderPreview(
                      html,
                      samples,
                    )}</body>`
              }
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Placeholders are filled with sample values so you can see the real shape.
          </p>
        </TabsContent>
      </Tabs>

      <div className="rounded-lg border border-border p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Send className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold">Send a test</p>
          <Badge variant="outline" className="text-[10px] capitalize">
            {purpose}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            type="email"
            aria-label="Test recipient"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 min-w-[200px]"
          />
          <Button variant="outline" onClick={sendTest} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send test
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Goes to any address you enter, through the sender account routed for {purpose}.
        </p>
      </div>
    </div>
  );
}

export default EmailTemplateEditor;
