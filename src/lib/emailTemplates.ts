/**
 * Email design system.
 *
 * Email clients are not browsers: Outlook renders through Word, Gmail strips
 * much of <head>, and flexbox/grid are unreliable. So everything here is
 * table-based with inline styles, sized to 600px, and built from a small set of
 * blocks so every template looks like it came from the same product.
 */

export const EMAIL_THEME = {
  accent: "#f97316",
  accentDark: "#ea580c",
  ink: "#111827",
  body: "#374151",
  muted: "#6b7280",
  hairline: "#e5e7eb",
  surface: "#ffffff",
  canvas: "#f4f5f7",
  success: "#059669",
  /** Behind a one-time code, so it reads as a field rather than as prose. */
  codeBg: "#f4f5f7",
  /** A heads-up panel: warm enough to notice, quiet enough not to alarm. */
  warnBg: "#fff7ed",
  warnInk: "#7c2d12",
  radius: "14px",
  // Single quotes, never double: this is interpolated into style="..."
  // attributes, and a double quote inside one ends the attribute early — which
  // silently drops every declaration after font-family, and makes some clients
  // discard the whole style. That is how buttons lost their colour and the
  // footer lost its sizing.
  font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  /** Digits in a code must be unmistakable: 0 from O, 1 from l. */
  mono: `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace`,
} as const;

const T = EMAIL_THEME;

/**
 * Marks the part of a template a rich editor may touch.
 *
 * contentEditable silently discards <!doctype>, <html>, <head> and <body>:
 * assigning a whole document to innerHTML and reading it back loses the shell,
 * so editing the full markup would destroy the layout on the first keystroke.
 * The editor works inside these markers and splices the result back.
 */
export const EDITABLE_START = "<!--content-->";
export const EDITABLE_END = "<!--/content-->";

/** The editable inner region, or null when a template has no markers. */
export function extractEditable(html: string): string | null {
  const a = html.indexOf(EDITABLE_START);
  const b = html.indexOf(EDITABLE_END);
  if (a === -1 || b === -1 || b < a) return null;
  return html.slice(a + EDITABLE_START.length, b);
}

/** Puts an edited region back into its shell. */
export function spliceEditable(html: string, inner: string): string {
  const a = html.indexOf(EDITABLE_START);
  const b = html.indexOf(EDITABLE_END);
  if (a === -1 || b === -1 || b < a) return inner;
  return html.slice(0, a + EDITABLE_START.length) + inner + html.slice(b);
}

/** True for a complete HTML document rather than a fragment. */
export function isFullDocument(html: string): boolean {
  return /<!doctype html|<html[\s>]/i.test(html);
}

/** A key/value row — receipts, booking details, anything itemised. */
export interface DetailRow {
  label: string;
  value: string;
  /** Renders bolder and larger, for totals. */
  emphasis?: boolean;
}

export interface EmailParts {
  /** Hidden line shown next to the subject in most inboxes. */
  preheader: string;
  /** Small label above the headline, e.g. "Payment receipt". */
  eyebrow?: string;
  heading: string;
  /** Paragraphs of body copy; each becomes its own <p>. */
  paragraphs: string[];
  details?: { title?: string; rows: DetailRow[] };
  cta?: { label: string; url: string };
  /** A one-time code, rendered as its own panel rather than as a sentence. */
  code?: { value: string; caption?: string };
  /** A heads-up shown in its own panel, not as another grey paragraph. */
  security?: string;
  /** Reassurance or next-step copy under the button. */
  footnote?: string;
  /** Bullet list of what happens next — the "informative" half. */
  checklist?: string[];
}

const p = (html: string) =>
  `<p style="margin:0 0 16px;font-size:16px;line-height:26px;color:${T.body};">${html}</p>`;

/**
 * Outlook ignores border-radius and padding on <a>, so the shape comes from the
 * <td> and the tap target from the anchor. mso-padding-alt gives Word the
 * padding it will not take from the anchor; on mobile the em-cta rules stretch
 * the whole thing to full width.
 */
const button = (label: string, url: string) => `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="${T.accent}" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="${url}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:${T.font};font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              ${label}
            </a>
          </td>
        </tr>
      </table>`;

/**
 * An itemised panel — receipts, bookings, anything with a label and a value.
 *
 * table-layout:fixed with explicit column widths is what stops a long value
 * overflowing the panel. A transaction id like pay_TVRveT4vxunVyT has no break
 * opportunity, so an auto-layout table widens to fit it and the content runs
 * straight through the rounded border. Fixed columns force it to wrap instead,
 * and word-break gives it somewhere to do that.
 */
const detailBlock = (details: NonNullable<EmailParts["details"]>) => {
  const rows = details.rows;

  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid ${T.hairline};border-radius:10px;background-color:#fafafa;">
        ${
          details.title
            ? `<tr><td colspan="2" style="padding:16px 18px 4px;font-family:${T.font};font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${T.muted};">${details.title}</td></tr>`
            : ""
        }
        ${rows
          .map((row, i) => {
            const first = i === 0 && !details.title;
            // A total is the answer to the whole panel, so it gets a rule above
            // it rather than sitting in the list as one more line.
            const divider = row.emphasis ? `border-top:1px solid ${T.hairline};` : "";
            const top = row.emphasis ? "14px" : first ? "16px" : "7px";
            const bottom = row.emphasis ? "4px" : "7px";

            return `
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="${divider}padding:${top} 10px ${bottom} 18px;font-family:${T.font};font-size:14px;line-height:22px;color:${T.muted};">${row.label}</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="${divider}padding:${top} 18px ${bottom} 10px;font-family:${T.font};font-size:${
                row.emphasis ? "18px" : "14px"
              };line-height:${row.emphasis ? "24px" : "22px"};font-weight:${
                row.emphasis ? "700" : "600"
              };color:${
                row.emphasis ? T.ink : T.body
              };word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">${row.value}</td>
        </tr>`;
          })
          .join("")}
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>`;
};

const checklistBlock = (items: string[]) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
        ${items
          .map(
            (item) => `
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:${T.font};font-size:16px;color:${T.accent};line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:${T.font};font-size:15px;line-height:24px;color:${T.body};">${item}</td>
        </tr>`,
          )
          .join("")}
      </table>`;

/**
 * A one-time code, as the single thing the reader is here to do.
 *
 * It used to be a <span> inside a paragraph, which meant it inherited the
 * paragraph's left alignment and margins and read as a sentence rather than as
 * the thing to copy. This is its own centred panel with its own breathing room.
 *
 * The text-indent cancels the trailing letter-space: without it the gap after
 * the last digit pushes the whole code visibly left of centre.
 */
const codeBlock = (value: string, caption?: string) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 8px;">
        <tr>
          <td align="center" style="padding:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
              <tr>
                <td align="center" class="em-code"
                    style="padding:20px 32px;background-color:${T.codeBg};border:1px solid ${T.hairline};border-radius:12px;font-family:${T.mono};font-size:34px;line-height:42px;font-weight:700;letter-spacing:.28em;text-indent:.28em;color:${T.ink};white-space:nowrap;">
                  ${value}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${
          caption
            ? `<tr><td align="center" style="padding:12px 0 0;font-family:${T.font};font-size:13px;line-height:20px;color:${T.muted};">${caption}</td></tr>`
            : ""
        }
      </table>`;

/**
 * A heads-up that must not read as more body copy.
 *
 * "If you didn't try to sign in" was the same size and colour as everything
 * else, so the one line that matters when something is wrong was the easiest
 * one to skim past.
 */
const securityBlock = (text: string) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;">
        <tr>
          <td style="padding:14px 16px;background-color:${T.warnBg};border-left:3px solid ${T.accent};border-radius:0 8px 8px 0;font-family:${T.font};font-size:13px;line-height:21px;color:${T.warnInk};">
            ${text}
          </td>
        </tr>
      </table>`;

/**
 * Wraps content in the shared shell.
 *
 * {{academy_name}} and {{year}} are left as placeholders so the same markup
 * works for any coach without rebuilding the template.
 */
export function buildEmail(parts: EmailParts): string {
  const { preheader, eyebrow, heading, paragraphs, details, cta, footnote, checklist, code, security } =
    parts;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${heading}</title>
<!-- Mobile only. Every rule here narrows or stacks something that is already
     styled inline, so a client that drops this block still renders correctly —
     it just keeps the desktop spacing. -->
<style>
  @media only screen and (max-width:620px) {
    .em-gutter { padding:16px 0 !important; }
    .em-shell { border-radius:0 !important; border-left-width:0 !important; border-right-width:0 !important; }
    .em-pad { padding-left:20px !important; padding-right:20px !important; }
    .em-body { padding-top:24px !important; padding-bottom:24px !important; }
    .em-h1 { font-size:21px !important; line-height:28px !important; }
    .em-cta, .em-cta a { display:block !important; width:100% !important; text-align:center !important; }
    /* Six tracked digits at 34px overflow a 320px screen and wrap mid-code,
       which is worse than useless — the reader has to reassemble it. */
    .em-cell { display:block !important; width:100% !important; }
    .em-label { padding:12px 18px 0 18px !important; }
    .em-value { padding:2px 18px 10px 18px !important; text-align:left !important; }
    .em-code { font-size:27px !important; line-height:34px !important; padding:16px 20px !important; letter-spacing:.2em !important; text-indent:.2em !important; }
  }
  @media only screen and (max-width:360px) {
    .em-code { font-size:23px !important; letter-spacing:.16em !important; text-indent:.16em !important; padding:14px 14px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${T.canvas};">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.canvas};">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:${T.surface};border:1px solid ${T.hairline};border-radius:${T.radius};overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:${T.accent};">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:${T.font};font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${T.muted};">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:${T.font};">
              ${EDITABLE_START}
              ${
                eyebrow
                  ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${T.accent};">${eyebrow}</p>`
                  : ""
              }
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:${T.ink};">
                ${heading}
              </h1>
              ${paragraphs.map(p).join("\n              ")}
              ${code ? codeBlock(code.value, code.caption) : ""}
              ${details ? detailBlock(details) : ""}
              ${checklist ? checklistBlock(checklist) : ""}
              ${cta ? button(cta.label, cta.url) : ""}
              ${security ? securityBlock(security) : ""}
              ${
                footnote
                  ? `<p style="margin:16px 0 0;font-size:13px;line-height:21px;color:${T.muted};">${footnote}</p>`
                  : ""
              }
              ${EDITABLE_END}
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid ${T.hairline};background-color:#fafafa;font-family:${T.font};">
              <p style="margin:0;font-size:12px;line-height:19px;color:${T.muted};">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:${T.font};font-size:12px;color:${T.muted};">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface TemplateDef {
  key: string;
  label: string;
  /** One line describing when this email goes out. */
  description: string;
  variables: string[];
  defaultSubject: string;
  defaultBody: string;
}

export const COACH_TEMPLATES: TemplateDef[] = [
  {
    key: "welcome_email",
    label: "Welcome Email",
    description: "Sent once, right after someone joins your academy.",
    variables: ["full_name", "academy_name", "coach_name", "dashboard_link", "year"],
    defaultSubject: "Welcome to {{academy_name}}, {{full_name}} 👋",
    defaultBody: buildEmail({
      preheader: "Here's how to get started in the next five minutes.",
      eyebrow: "Welcome",
      heading: "You're in, {{full_name}}",
      paragraphs: [
        "Thanks for joining <strong>{{academy_name}}</strong>. Everything you need is in one place, and you can start whenever you're ready.",
      ],
      checklist: [
        "Open your dashboard to see what's available to you",
        "Start your first lesson — most people finish one in under 20 minutes",
        "Say hello in the community so we know you're here",
      ],
      cta: { label: "Go to your dashboard", url: "{{dashboard_link}}" },
      footnote: "Questions? Just reply to this email — {{coach_name}} reads every one.",
    }),
  },
  {
    key: "account_created",
    label: "Account Created At Checkout",
    description:
      "Sent when someone buys without an account — carries the sign-in details for the one made for them.",
    variables: [
      "full_name",
      "email",
      "temporary_password",
      "login_link",
      "academy_name",
      "coach_name",
      "year",
    ],
    defaultSubject: "Your {{academy_name}} account is ready",
    defaultBody: buildEmail({
      preheader: "Here are your sign-in details.",
      eyebrow: "Account created",
      heading: "Your account is ready, {{full_name}}",
      paragraphs: [
        "You bought from <strong>{{academy_name}}</strong> without an account, so we made one for you. Sign in with the details below to get to everything you purchased.",
      ],
      details: {
        title: "Your sign-in details",
        rows: [
          { label: "Email", value: "{{email}}" },
          { label: "Temporary password", value: "{{temporary_password}}", emphasis: true },
        ],
      },
      cta: { label: "Sign in", url: "{{login_link}}" },
      footnote:
        "Please change this password once you are in — it was generated for you and is only meant to get you started.",
    }),
  },
  {
    key: "sale_notification",
    label: "New Sale (Internal)",
    description:
      "Sent to the coach and the platform admins the moment a payment is confirmed.",
    variables: [
      "buyer_name",
      "buyer_email",
      "item_name",
      "amount",
      "payment_method",
      "transaction_id",
      "coach_name",
      "dashboard_link",
      "academy_name",
      "year",
    ],
    defaultSubject: "New sale: {{item_name}} — {{amount}}",
    defaultBody: buildEmail({
      preheader: "{{buyer_name}} just bought {{item_name}}.",
      eyebrow: "New sale",
      heading: "{{item_name}} just sold",
      paragraphs: [
        "<strong>{{buyer_name}}</strong> completed a payment. Access has already been granted automatically — nothing needs doing.",
      ],
      details: {
        title: "Sale",
        rows: [
          { label: "Item", value: "{{item_name}}" },
          { label: "Buyer", value: "{{buyer_name}}" },
          { label: "Email", value: "{{buyer_email}}" },
          { label: "Method", value: "{{payment_method}}" },
          { label: "Reference", value: "{{transaction_id}}" },
          { label: "Amount", value: "{{amount}}", emphasis: true },
        ],
      },
      cta: { label: "Open your dashboard", url: "{{dashboard_link}}" },
      footnote: "Sold by {{coach_name}}.",
    }),
  },
  {
    key: "course_enrollment",
    label: "Course Enrollment Confirmation",
    description: "Sent when someone is enrolled in a course.",
    variables: ["full_name", "course_name", "lesson_count", "course_link", "academy_name", "year"],
    defaultSubject: "You're enrolled in {{course_name}}",
    defaultBody: buildEmail({
      preheader: "Your course is unlocked and ready when you are.",
      eyebrow: "Enrollment confirmed",
      heading: "{{course_name}} is ready for you",
      paragraphs: [
        "Hi {{full_name}}, your place is confirmed. You have full access from now on, and your progress saves automatically.",
      ],
      details: {
        title: "Course details",
        rows: [
          { label: "Course", value: "{{course_name}}" },
          { label: "Lessons", value: "{{lesson_count}}" },
          { label: "Access", value: "Unlimited" },
        ],
      },
      cta: { label: "Start learning", url: "{{course_link}}" },
      footnote: "You can pick up exactly where you left off on any device.",
    }),
  },
  {
    key: "payment_receipt",
    label: "Payment Receipt",
    description: "Sent after a successful payment.",
    variables: [
      "full_name",
      "amount",
      "item_name",
      "transaction_id",
      "payment_date",
      "payment_method",
      "academy_name",
      "year",
    ],
    defaultSubject: "Receipt for {{item_name}} — {{amount}}",
    defaultBody: buildEmail({
      preheader: "Your payment went through. Here's your receipt.",
      eyebrow: "Payment receipt",
      heading: "Thanks, {{full_name}}",
      paragraphs: [
        "We've received your payment. Keep this email for your records — it's your receipt.",
      ],
      details: {
        title: "Receipt",
        rows: [
          { label: "Item", value: "{{item_name}}" },
          { label: "Date", value: "{{payment_date}}" },
          { label: "Method", value: "{{payment_method}}" },
          { label: "Transaction ID", value: "{{transaction_id}}" },
          { label: "Total paid", value: "{{amount}}", emphasis: true },
        ],
      },
      footnote:
        "Access is already active on your account. If anything looks wrong, reply to this email and we'll sort it out.",
    }),
  },
  {
    key: "certificate_issued",
    label: "Certificate Issued",
    description: "Sent when a learner completes a course.",
    variables: ["full_name", "course_name", "completion_date", "certificate_link", "academy_name", "year"],
    defaultSubject: "Your {{course_name}} certificate is ready 🎓",
    defaultBody: buildEmail({
      preheader: "You finished the course — here's your certificate.",
      eyebrow: "Course complete",
      heading: "Congratulations, {{full_name}}",
      paragraphs: [
        "You've completed <strong>{{course_name}}</strong>. Your certificate is issued and ready to download or share.",
      ],
      details: {
        title: "Certificate",
        rows: [
          { label: "Course", value: "{{course_name}}" },
          { label: "Completed", value: "{{completion_date}}" },
          { label: "Awarded to", value: "{{full_name}}" },
        ],
      },
      cta: { label: "View your certificate", url: "{{certificate_link}}" },
      footnote: "Add it to LinkedIn or your CV — the link stays valid permanently.",
    }),
  },
  {
    key: "course_reminder",
    label: "Course / Lesson Reminder",
    description: "Nudges a learner who hasn't opened the course in a while.",
    variables: ["full_name", "course_name", "lesson_name", "progress_percent", "resume_link", "academy_name", "year"],
    defaultSubject: "Pick up where you left off in {{course_name}}",
    defaultBody: buildEmail({
      preheader: "You're partway through — one lesson gets you moving again.",
      eyebrow: "Keep going",
      heading: "You're {{progress_percent}} through {{course_name}}",
      paragraphs: [
        "Hi {{full_name}}, your next lesson is <strong>{{lesson_name}}</strong>. It's waiting exactly where you stopped.",
      ],
      details: {
        title: "Where you are",
        rows: [
          { label: "Course", value: "{{course_name}}" },
          { label: "Next lesson", value: "{{lesson_name}}" },
          { label: "Progress", value: "{{progress_percent}}", emphasis: true },
        ],
      },
      cta: { label: "Resume the course", url: "{{resume_link}}" },
      footnote: "Short on time? Even one lesson keeps your streak alive.",
    }),
  },
  {
    key: "event_reminder",
    label: "Event Reminder",
    description: "Sent shortly before a live session starts.",
    variables: ["full_name", "event_name", "event_time", "event_date", "duration", "join_link", "academy_name", "year"],
    defaultSubject: "{{event_name}} starts at {{event_time}}",
    defaultBody: buildEmail({
      preheader: "Your session is coming up — here's the join link.",
      eyebrow: "Starting soon",
      heading: "{{event_name}}",
      paragraphs: [
        "Hi {{full_name}}, this is your reminder. The join link below works from a few minutes before the start.",
      ],
      details: {
        title: "Session details",
        rows: [
          { label: "Date", value: "{{event_date}}" },
          { label: "Time", value: "{{event_time}}", emphasis: true },
          { label: "Duration", value: "{{duration}}" },
        ],
      },
      cta: { label: "Join the session", url: "{{join_link}}" },
      footnote: "Can't make it live? A recording is usually posted afterwards.",
    }),
  },
  {
    key: "new_lesson_available",
    label: "New Lesson Released",
    description: "Sent when dripped content unlocks for a learner.",
    variables: ["full_name", "course_name", "lesson_name", "lesson_duration", "lesson_link", "academy_name", "year"],
    defaultSubject: "New in {{course_name}}: {{lesson_name}}",
    defaultBody: buildEmail({
      preheader: "A new lesson just unlocked in your course.",
      eyebrow: "New lesson",
      heading: "{{lesson_name}} is now available",
      paragraphs: [
        "Hi {{full_name}}, the next part of <strong>{{course_name}}</strong> has just unlocked. It picks up right where the last lesson finished.",
      ],
      details: {
        title: "What's new",
        rows: [
          { label: "Course", value: "{{course_name}}" },
          { label: "Lesson", value: "{{lesson_name}}" },
          { label: "Length", value: "{{lesson_duration}}" },
        ],
      },
      cta: { label: "Watch the lesson", url: "{{lesson_link}}" },
      footnote: "It stays in your library, so you can come back to it whenever suits you.",
    }),
  },
  {
    key: "assignment_submitted",
    label: "Assignment Received",
    description: "Confirms an assignment submission was received.",
    variables: ["full_name", "course_name", "assignment_name", "submitted_at", "review_window", "academy_name", "year"],
    defaultSubject: "We've got your {{assignment_name}} submission",
    defaultBody: buildEmail({
      preheader: "Your submission is in — here's what happens next.",
      eyebrow: "Submission received",
      heading: "Thanks, {{full_name}}",
      paragraphs: [
        "Your work for <strong>{{assignment_name}}</strong> came through safely. Nothing else is needed from you right now.",
      ],
      details: {
        title: "Submission",
        rows: [
          { label: "Course", value: "{{course_name}}" },
          { label: "Assignment", value: "{{assignment_name}}" },
          { label: "Submitted", value: "{{submitted_at}}" },
        ],
      },
      checklist: [
        "Your submission is queued for review",
        "You'll get an email the moment feedback is ready",
        "Typical turnaround is {{review_window}}",
      ],
      footnote: "Spotted a mistake? Reply to this email and we'll let you resubmit.",
    }),
  },
  {
    key: "assignment_reviewed",
    label: "Assignment Feedback Ready",
    description: "Sent when a coach has reviewed a submission.",
    variables: ["full_name", "course_name", "assignment_name", "grade", "reviewer_name", "feedback_link", "academy_name", "year"],
    defaultSubject: "Your feedback on {{assignment_name}} is ready",
    defaultBody: buildEmail({
      preheader: "{{reviewer_name}} has reviewed your work.",
      eyebrow: "Feedback ready",
      heading: "{{reviewer_name}} reviewed your work",
      paragraphs: [
        "Hi {{full_name}}, your submission for <strong>{{assignment_name}}</strong> has been marked. The full comments are waiting for you.",
      ],
      details: {
        title: "Result",
        rows: [
          { label: "Course", value: "{{course_name}}" },
          { label: "Assignment", value: "{{assignment_name}}" },
          { label: "Reviewed by", value: "{{reviewer_name}}" },
          { label: "Result", value: "{{grade}}", emphasis: true },
        ],
      },
      cta: { label: "Read the feedback", url: "{{feedback_link}}" },
      footnote: "Questions about the feedback? Reply here and it goes straight to your coach.",
    }),
  },
  {
    key: "course_completed",
    label: "Course Completed",
    description: "Congratulates a learner who finished every lesson.",
    variables: ["full_name", "course_name", "lessons_completed", "time_invested", "next_course_name", "next_course_link", "academy_name", "year"],
    defaultSubject: "You finished {{course_name}} 🎉",
    defaultBody: buildEmail({
      preheader: "Every lesson done. Here's what you covered.",
      eyebrow: "Course complete",
      heading: "That's a wrap, {{full_name}}",
      paragraphs: [
        "You've finished every lesson in <strong>{{course_name}}</strong>. That takes real consistency, and it's worth a moment to notice.",
      ],
      details: {
        title: "Your run",
        rows: [
          { label: "Course", value: "{{course_name}}" },
          { label: "Lessons completed", value: "{{lessons_completed}}" },
          { label: "Time invested", value: "{{time_invested}}", emphasis: true },
        ],
      },
      cta: { label: "Start {{next_course_name}}", url: "{{next_course_link}}" },
      footnote: "Your certificate arrives separately, and the course stays in your library for reference.",
    }),
  },
  {
    key: "course_progress_digest",
    label: "Weekly Progress Digest",
    description: "A weekly summary of what a learner got through.",
    variables: ["full_name", "course_name", "lessons_this_week", "progress_percent", "streak_days", "resume_link", "academy_name", "year"],
    defaultSubject: "Your week in {{course_name}}",
    defaultBody: buildEmail({
      preheader: "A quick look at what you covered this week.",
      eyebrow: "Weekly summary",
      heading: "Nice work this week, {{full_name}}",
      paragraphs: [
        "Here's where you got to in <strong>{{course_name}}</strong> over the last seven days.",
      ],
      details: {
        title: "This week",
        rows: [
          { label: "Lessons completed", value: "{{lessons_this_week}}" },
          { label: "Current streak", value: "{{streak_days}}" },
          { label: "Course progress", value: "{{progress_percent}}", emphasis: true },
        ],
      },
      cta: { label: "Keep going", url: "{{resume_link}}" },
      footnote: "Consistency beats intensity — even one lesson next week keeps you moving.",
    }),
  },
  {
    key: "course_access_expiring",
    label: "Access Expiring Soon",
    description: "Warns a learner before their course access ends.",
    variables: ["full_name", "course_name", "expiry_date", "days_left", "progress_percent", "renew_link", "academy_name", "year"],
    defaultSubject: "Your access to {{course_name}} ends {{expiry_date}}",
    defaultBody: buildEmail({
      preheader: "Your access ends soon — here's how to keep it.",
      eyebrow: "Action needed",
      heading: "{{days_left}} left on {{course_name}}",
      paragraphs: [
        "Hi {{full_name}}, your access to <strong>{{course_name}}</strong> ends on {{expiry_date}}. After that the lessons and your notes are no longer available.",
      ],
      details: {
        title: "Where you are",
        rows: [
          { label: "Course", value: "{{course_name}}" },
          { label: "Progress so far", value: "{{progress_percent}}" },
          { label: "Access ends", value: "{{expiry_date}}", emphasis: true },
        ],
      },
      cta: { label: "Extend my access", url: "{{renew_link}}" },
      footnote: "If you'd rather not continue, no action is needed — access simply ends on that date.",
    }),
  },
  {
    key: "qna_reply",
    label: "Reply to Your Question",
    description: "Sent when someone answers a learner's course question.",
    variables: ["full_name", "course_name", "lesson_name", "replier_name", "reply_excerpt", "thread_link", "academy_name", "year"],
    defaultSubject: "{{replier_name}} replied to your question",
    defaultBody: buildEmail({
      preheader: "There's a new reply on your course question.",
      eyebrow: "New reply",
      heading: "{{replier_name}} answered you",
      paragraphs: [
        "Hi {{full_name}}, you asked a question on <strong>{{lesson_name}}</strong> in {{course_name}}, and there's now a reply:",
        `<span style="display:block;padding:14px 16px;border-left:3px solid ${T.accent};background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:${T.body};">{{reply_excerpt}}</span>`,
      ],
      cta: { label: "View the full thread", url: "{{thread_link}}" },
      footnote: "Reply in the thread so other learners with the same question can see it too.",
    }),
  },
  {
    key: "abandoned_checkout",
    label: "Unfinished Checkout",
    description: "Nudges someone who started buying a course but didn't finish.",
    variables: ["full_name", "course_name", "amount", "checkout_link", "academy_name", "year"],
    defaultSubject: "You left {{course_name}} in your basket",
    defaultBody: buildEmail({
      preheader: "Your checkout is still open — pick up where you left off.",
      eyebrow: "Almost there",
      heading: "Still thinking about {{course_name}}?",
      paragraphs: [
        "Hi {{full_name}}, you started signing up for <strong>{{course_name}}</strong> but didn't finish. Your place isn't reserved, though the checkout link below still works.",
      ],
      details: {
        rows: [
          { label: "Course", value: "{{course_name}}" },
          { label: "Price", value: "{{amount}}", emphasis: true },
        ],
      },
      cta: { label: "Finish signing up", url: "{{checkout_link}}" },
      footnote: "Not the right time? You can ignore this — we won't chase you again about it.",
    }),
  },
  {
    key: "service_purchase_confirmed",
    label: "Service Purchase Confirmed",
    description: "Sent when someone buys a service such as a 1:1 session.",
    variables: ["full_name", "service_name", "amount", "coach_name", "booking_link", "academy_name", "year"],
    defaultSubject: "You're booked in for {{service_name}}",
    defaultBody: buildEmail({
      preheader: "Your purchase is confirmed — here's what happens next.",
      eyebrow: "Purchase confirmed",
      heading: "{{service_name}} is confirmed",
      paragraphs: [
        "Hi {{full_name}}, thanks for booking <strong>{{service_name}}</strong> with {{coach_name}}. Everything is set up on your account.",
      ],
      details: {
        title: "Your booking",
        rows: [
          { label: "Service", value: "{{service_name}}" },
          { label: "With", value: "{{coach_name}}" },
          { label: "Paid", value: "{{amount}}", emphasis: true },
        ],
      },
      cta: { label: "Pick your slot", url: "{{booking_link}}" },
      footnote: "Need to move things around? Reply here and we'll sort it out.",
    }),
  },
  {
    key: "event_registration_confirmed",
    label: "Event Registration Confirmed",
    description: "Sent when a member registers for an event.",
    variables: ["full_name", "event_name", "event_date", "event_time", "duration", "join_link", "calendar_link", "academy_name", "year"],
    defaultSubject: "You're registered for {{event_name}}",
    defaultBody: buildEmail({
      preheader: "Your place is saved. Add it to your calendar.",
      eyebrow: "You're registered",
      heading: "See you at {{event_name}}",
      paragraphs: [
        "Hi {{full_name}}, your place is saved. We'll send a reminder shortly before it starts, so there's nothing else to do for now.",
      ],
      details: {
        title: "When",
        rows: [
          { label: "Date", value: "{{event_date}}" },
          { label: "Time", value: "{{event_time}}", emphasis: true },
          { label: "Duration", value: "{{duration}}" },
        ],
      },
      cta: { label: "Add to calendar", url: "{{calendar_link}}" },
      footnote: "The join link is {{join_link}} — it opens a few minutes before the start.",
    }),
  },
  {
    key: "workshop_reminder",
    label: "Workshop Starting Soon",
    description: "Sent shortly before a workshop session begins.",
    variables: ["full_name", "workshop_name", "session_number", "total_sessions", "start_time", "join_link", "academy_name", "year"],
    defaultSubject: "{{workshop_name}} starts at {{start_time}}",
    defaultBody: buildEmail({
      preheader: "Your workshop session is about to begin.",
      eyebrow: "Starting soon",
      heading: "{{workshop_name}}",
      paragraphs: [
        "Hi {{full_name}}, session {{session_number}} of {{total_sessions}} begins at {{start_time}}. Grab a notebook — this one is hands-on.",
      ],
      details: {
        title: "This session",
        rows: [
          { label: "Workshop", value: "{{workshop_name}}" },
          { label: "Session", value: "{{session_number}} of {{total_sessions}}" },
          { label: "Starts", value: "{{start_time}}", emphasis: true },
        ],
      },
      cta: { label: "Join now", url: "{{join_link}}" },
      footnote: "Joining late is fine — the room stays open for the full session.",
    }),
  },
  {
    key: "recording_available",
    label: "Recording Available",
    description: "Sent after a live session, when the recording is posted.",
    variables: ["full_name", "session_name", "recording_length", "recording_link", "available_until", "academy_name", "year"],
    defaultSubject: "The {{session_name}} recording is up",
    defaultBody: buildEmail({
      preheader: "Missed it, or want to rewatch? The recording is ready.",
      eyebrow: "Recording ready",
      heading: "{{session_name}} is available to watch",
      paragraphs: [
        "Hi {{full_name}}, the recording from <strong>{{session_name}}</strong> is now in your library — whether you were there live or not.",
      ],
      details: {
        title: "Recording",
        rows: [
          { label: "Session", value: "{{session_name}}" },
          { label: "Length", value: "{{recording_length}}" },
          { label: "Available until", value: "{{available_until}}" },
        ],
      },
      cta: { label: "Watch the recording", url: "{{recording_link}}" },
      footnote: "You can skip around — your position is remembered between visits.",
    }),
  },
  {
    key: "subscription_renewal_reminder",
    label: "Subscription Renewing Soon",
    description: "Warns before a subscription charges again.",
    variables: ["full_name", "plan_name", "amount", "renewal_date", "billing_link", "academy_name", "year"],
    defaultSubject: "Your {{plan_name}} renews on {{renewal_date}}",
    defaultBody: buildEmail({
      preheader: "A heads-up before your next payment.",
      eyebrow: "Upcoming charge",
      heading: "{{plan_name}} renews soon",
      paragraphs: [
        "Hi {{full_name}}, this is a heads-up that your subscription renews automatically on {{renewal_date}}. No action is needed if you're happy to continue.",
      ],
      details: {
        title: "Next payment",
        rows: [
          { label: "Plan", value: "{{plan_name}}" },
          { label: "Renews on", value: "{{renewal_date}}" },
          { label: "Amount", value: "{{amount}}", emphasis: true },
        ],
      },
      cta: { label: "Manage billing", url: "{{billing_link}}" },
      footnote: "Cancel any time before {{renewal_date}} and you won't be charged again.",
    }),
  },
  {
    key: "payment_failed",
    label: "Payment Failed",
    description: "Sent when a scheduled payment does not go through.",
    variables: ["full_name", "plan_name", "amount", "retry_date", "update_payment_link", "academy_name", "year"],
    defaultSubject: "We couldn't process your payment for {{plan_name}}",
    defaultBody: buildEmail({
      preheader: "Your payment didn't go through — here's how to fix it.",
      eyebrow: "Action needed",
      heading: "Your payment didn't go through",
      paragraphs: [
        "Hi {{full_name}}, the payment of {{amount}} for <strong>{{plan_name}}</strong> was declined. This is usually an expired card or a bank block, and it's quick to fix.",
      ],
      details: {
        title: "What failed",
        rows: [
          { label: "Plan", value: "{{plan_name}}" },
          { label: "Amount", value: "{{amount}}" },
          { label: "We'll retry on", value: "{{retry_date}}", emphasis: true },
        ],
      },
      cta: { label: "Update payment method", url: "{{update_payment_link}}" },
      footnote: "Your access stays active until the retry. Update the card and nothing is interrupted.",
    }),
  },
  {
    key: "refund_processed",
    label: "Refund Processed",
    description: "Confirms a refund has been issued.",
    variables: ["full_name", "item_name", "amount", "refund_date", "transaction_id", "academy_name", "year"],
    defaultSubject: "Your refund for {{item_name}} is on its way",
    defaultBody: buildEmail({
      preheader: "Your refund has been issued.",
      eyebrow: "Refund issued",
      heading: "Your refund is on its way",
      paragraphs: [
        "Hi {{full_name}}, we've refunded your payment for <strong>{{item_name}}</strong>. Banks usually take 5–10 working days to show it.",
      ],
      details: {
        title: "Refund",
        rows: [
          { label: "Item", value: "{{item_name}}" },
          { label: "Issued", value: "{{refund_date}}" },
          { label: "Reference", value: "{{transaction_id}}" },
          { label: "Refunded", value: "{{amount}}", emphasis: true },
        ],
      },
      footnote: "If it hasn't appeared after 10 working days, reply with this reference and we'll chase it.",
    }),
  },
  {
    key: "badge_earned",
    label: "Badge Earned",
    description: "Sent when a member unlocks a badge.",
    variables: ["full_name", "badge_name", "badge_description", "xp_earned", "total_xp", "badges_link", "academy_name", "year"],
    defaultSubject: "You earned the {{badge_name}} badge 🏅",
    defaultBody: buildEmail({
      preheader: "A new badge just landed in your profile.",
      eyebrow: "Badge unlocked",
      heading: "{{badge_name}}",
      paragraphs: [
        "Nice one, {{full_name}} — {{badge_description}}",
      ],
      details: {
        title: "Your progress",
        rows: [
          { label: "Badge", value: "{{badge_name}}" },
          { label: "XP from this", value: "{{xp_earned}}" },
          { label: "Total XP", value: "{{total_xp}}", emphasis: true },
        ],
      },
      cta: { label: "See your badges", url: "{{badges_link}}" },
      footnote: "Badges show on your profile for everyone in the community to see.",
    }),
  },
  {
    key: "level_up",
    label: "Level Up",
    description: "Sent when a member reaches a new level.",
    variables: ["full_name", "level_number", "level_name", "total_xp", "next_level_name", "xp_to_next", "leaderboard_link", "academy_name", "year"],
    defaultSubject: "Level {{level_number}} unlocked — you're now {{level_name}}",
    defaultBody: buildEmail({
      preheader: "You've reached a new level.",
      eyebrow: "Level up",
      heading: "You're now {{level_name}}",
      paragraphs: [
        "Hi {{full_name}}, you've reached <strong>level {{level_number}}</strong>. That's earned, not given — it tracks the work you've actually put in.",
      ],
      details: {
        title: "Standing",
        rows: [
          { label: "Level", value: "{{level_number}} — {{level_name}}" },
          { label: "Total XP", value: "{{total_xp}}" },
          { label: "To {{next_level_name}}", value: "{{xp_to_next}}", emphasis: true },
        ],
      },
      cta: { label: "View the leaderboard", url: "{{leaderboard_link}}" },
      footnote: "XP comes from finishing lessons, keeping habits and joining sessions.",
    }),
  },
  {
    key: "streak_milestone",
    label: "Streak Milestone",
    description: "Celebrates a learning streak reaching a milestone.",
    variables: ["full_name", "streak_days", "xp_bonus", "resume_link", "academy_name", "year"],
    defaultSubject: "{{streak_days}} in a row 🔥",
    defaultBody: buildEmail({
      preheader: "Your streak just hit a milestone.",
      eyebrow: "Streak",
      heading: "{{streak_days}} in a row",
      paragraphs: [
        "Hi {{full_name}}, showing up this consistently is the hard part, and you've done it {{streak_days}} running.",
      ],
      details: {
        rows: [
          { label: "Current streak", value: "{{streak_days}}" },
          { label: "Bonus XP", value: "{{xp_bonus}}", emphasis: true },
        ],
      },
      cta: { label: "Keep it going", url: "{{resume_link}}" },
      footnote: "One short session tomorrow is all it takes to keep the run alive.",
    }),
  },
  {
    key: "team_invite",
    label: "Team Invitation",
    description: "Invites someone to join the workspace as a teammate.",
    variables: ["full_name", "inviter_name", "role_name", "accept_link", "expiry_days", "academy_name", "year"],
    defaultSubject: "{{inviter_name}} invited you to join {{academy_name}}",
    defaultBody: buildEmail({
      preheader: "You've been invited to join the team.",
      eyebrow: "Invitation",
      heading: "Join {{academy_name}}",
      paragraphs: [
        "Hi {{full_name}}, {{inviter_name}} has invited you to join <strong>{{academy_name}}</strong> as {{role_name}}.",
      ],
      details: {
        title: "Invitation",
        rows: [
          { label: "Workspace", value: "{{academy_name}}" },
          { label: "Invited by", value: "{{inviter_name}}" },
          { label: "Your role", value: "{{role_name}}", emphasis: true },
        ],
      },
      cta: { label: "Accept the invitation", url: "{{accept_link}}" },
      footnote: "This invitation expires in {{expiry_days}}. If you weren't expecting it, you can ignore this email.",
    }),
  },
  {
    key: "new_message",
    label: "New Direct Message",
    description: "Notifies a member of an unread direct message.",
    variables: ["full_name", "sender_name", "message_excerpt", "conversation_link", "academy_name", "year"],
    defaultSubject: "{{sender_name}} sent you a message",
    defaultBody: buildEmail({
      preheader: "You have an unread message.",
      eyebrow: "New message",
      heading: "{{sender_name}} messaged you",
      paragraphs: [
        "Hi {{full_name}}, you have an unread message:",
        `<span style="display:block;padding:14px 16px;border-left:3px solid ${T.accent};background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:${T.body};">{{message_excerpt}}</span>`,
      ],
      cta: { label: "Reply", url: "{{conversation_link}}" },
      footnote: "You can turn these notifications off in your account settings.",
    }),
  },
  {
    key: "password_reset",
    label: "Password Reset",
    description: "Sent when someone asks to reset their password.",
    variables: ["full_name", "reset_link", "expiry_minutes", "academy_name", "year"],
    defaultSubject: "Reset your {{academy_name}} password",
    defaultBody: buildEmail({
      preheader: "Use the button below to choose a new password.",
      eyebrow: "Security",
      heading: "Reset your password",
      paragraphs: [
        "Hi {{full_name}}, we got a request to reset your password. Choose a new one using the button below.",
      ],
      cta: { label: "Choose a new password", url: "{{reset_link}}" },
      footnote:
        "This link expires in {{expiry_minutes}} minutes and can only be used once. If you didn't ask for this, you can ignore this email — your password stays unchanged.",
    }),
  },
  // ---------------------------------------------------------- community ---
  {
    key: "post_published",
    label: "New Post Published",
    description: "Tells members when a new post goes up in the community.",
    variables: ["full_name", "author_name", "post_title", "post_excerpt", "post_link", "academy_name", "year"],
    defaultSubject: "New post: {{post_title}}",
    defaultBody: buildEmail({
      preheader: "Something new to read in the community.",
      eyebrow: "New post",
      heading: "{{post_title}}",
      paragraphs: [
        "Hi {{full_name}}, {{author_name}} just posted in {{academy_name}}:",
        `<span style="display:block;padding:14px 16px;border-left:3px solid ${T.accent};background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:${T.body};">{{post_excerpt}}</span>`,
      ],
      cta: { label: "Read the post", url: "{{post_link}}" },
      footnote: "You can turn these notifications off in your account settings.",
    }),
  },
  {
    key: "post_comment",
    label: "New Comment on Your Post",
    description: "Notifies the author when someone comments on their post.",
    variables: ["full_name", "commenter_name", "post_title", "comment_excerpt", "post_link", "academy_name", "year"],
    defaultSubject: "{{commenter_name}} commented on your post",
    defaultBody: buildEmail({
      preheader: "Someone replied to something you wrote.",
      eyebrow: "New comment",
      heading: "{{commenter_name}} commented",
      paragraphs: [
        "Hi {{full_name}}, there's a new comment on <strong>{{post_title}}</strong>:",
        `<span style="display:block;padding:14px 16px;border-left:3px solid ${T.accent};background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:${T.body};">{{comment_excerpt}}</span>`,
      ],
      cta: { label: "Reply to the comment", url: "{{post_link}}" },
      footnote: "You can turn these notifications off in your account settings.",
    }),
  },
  {
    key: "comment_like",
    label: "Someone Liked Your Comment",
    description: "Notifies a member when their comment gets a like.",
    variables: ["full_name", "liker_name", "comment_excerpt", "post_title", "post_link", "academy_name", "year"],
    defaultSubject: "{{liker_name}} liked your comment",
    defaultBody: buildEmail({
      preheader: "Your comment got a like.",
      eyebrow: "New like",
      heading: "{{liker_name}} liked your comment",
      paragraphs: [
        "Hi {{full_name}}, your comment on <strong>{{post_title}}</strong> got a like:",
        `<span style="display:block;padding:14px 16px;border-left:3px solid ${T.accent};background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:${T.body};">{{comment_excerpt}}</span>`,
      ],
      cta: { label: "View the thread", url: "{{post_link}}" },
      footnote: "You can turn these notifications off in your account settings.",
    }),
  },
  {
    key: "comment_reply",
    label: "Reply to Your Comment",
    description: "Notifies a member when someone replies to their comment.",
    variables: ["full_name", "replier_name", "comment_excerpt", "post_title", "post_link", "academy_name", "year"],
    defaultSubject: "{{replier_name}} replied to your comment",
    defaultBody: buildEmail({
      preheader: "You have a new reply.",
      eyebrow: "New reply",
      heading: "{{replier_name}} replied",
      paragraphs: [
        "Hi {{full_name}}, someone picked up the thread on <strong>{{post_title}}</strong>:",
        `<span style="display:block;padding:14px 16px;border-left:3px solid ${T.accent};background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:${T.body};">{{comment_excerpt}}</span>`,
      ],
      cta: { label: "Read the reply", url: "{{post_link}}" },
      footnote: "You can turn these notifications off in your account settings.",
    }),
  },
  {
    key: "comment_mention",
    label: "You Were Tagged in a Comment",
    description: "Notifies a member when someone tags them in a comment.",
    variables: ["full_name", "mentioner_name", "comment_excerpt", "post_title", "post_link", "academy_name", "year"],
    defaultSubject: "{{mentioner_name}} tagged you in a comment",
    defaultBody: buildEmail({
      preheader: "Someone wants your input.",
      eyebrow: "You were tagged",
      heading: "{{mentioner_name}} tagged you",
      paragraphs: [
        "Hi {{full_name}}, you were mentioned on <strong>{{post_title}}</strong>:",
        `<span style="display:block;padding:14px 16px;border-left:3px solid ${T.accent};background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:${T.body};">{{comment_excerpt}}</span>`,
      ],
      cta: { label: "Join the conversation", url: "{{post_link}}" },
      footnote: "You can turn these notifications off in your account settings.",
    }),
  },

  // ------------------------------------------------------------ services ---
  {
    key: "service_announcement",
    label: "New Service Announcement",
    description: "Promotes a newly published service to your audience.",
    variables: ["full_name", "service_name", "service_description", "price", "service_link", "coach_name", "academy_name", "year"],
    defaultSubject: "Just launched: {{service_name}}",
    defaultBody: buildEmail({
      preheader: "Something new is available to book.",
      eyebrow: "Now available",
      heading: "{{service_name}} is live",
      paragraphs: [
        "Hi {{full_name}}, {{coach_name}} has just opened up something new:",
        "{{service_description}}",
      ],
      details: {
        title: "What you get",
        rows: [
          { label: "Service", value: "{{service_name}}" },
          { label: "Price", value: "{{price}}", emphasis: true },
        ],
      },
      cta: { label: "See the details", url: "{{service_link}}" },
      footnote: "Places are limited and go in the order they're booked.",
    }),
  },

  // ----------------------------------------------------------- workshops ---
  {
    key: "workshop_scheduled",
    label: "Workshop Scheduled",
    description: "Announces a new workshop, one-off or recurring.",
    variables: ["full_name", "workshop_name", "event_date", "event_time", "duration", "session_count", "join_link", "academy_name", "year"],
    defaultSubject: "{{workshop_name}} is scheduled for {{event_date}}",
    defaultBody: buildEmail({
      preheader: "Save the date — here are the details.",
      eyebrow: "Workshop scheduled",
      heading: "{{workshop_name}}",
      paragraphs: [
        "Hi {{full_name}}, a new workshop is on the calendar. Add it now so you don't miss it.",
      ],
      details: {
        title: "When",
        rows: [
          { label: "Date", value: "{{event_date}}" },
          { label: "Time", value: "{{event_time}}", emphasis: true },
          { label: "Duration", value: "{{duration}}" },
          { label: "Sessions", value: "{{session_count}}" },
        ],
      },
      cta: { label: "Save your place", url: "{{join_link}}" },
      footnote: "We'll remind you again shortly before it starts.",
    }),
  },
  {
    key: "workshop_rescheduled",
    label: "Workshop Rescheduled",
    description: "Sent when a workshop moves to a new date or time.",
    variables: ["full_name", "workshop_name", "previous_date", "event_date", "event_time", "join_link", "academy_name", "year"],
    defaultSubject: "New time for {{workshop_name}}",
    defaultBody: buildEmail({
      preheader: "The date has moved — here's the new one.",
      eyebrow: "Rescheduled",
      heading: "{{workshop_name}} has moved",
      paragraphs: [
        "Hi {{full_name}}, sorry for the change of plan. Your place is still booked — only the time has changed.",
      ],
      details: {
        title: "The change",
        rows: [
          { label: "Was", value: "{{previous_date}}" },
          { label: "Now", value: "{{event_date}}", emphasis: true },
          { label: "Time", value: "{{event_time}}" },
        ],
      },
      cta: { label: "Update your calendar", url: "{{join_link}}" },
      footnote: "Nothing else changes — the same link gets you in.",
    }),
  },
  {
    key: "workshop_cancelled",
    label: "Workshop Cancelled",
    description: "Sent when a workshop is called off.",
    variables: ["full_name", "workshop_name", "event_date", "refund_note", "coach_name", "academy_name", "year"],
    defaultSubject: "{{workshop_name}} on {{event_date}} is cancelled",
    defaultBody: buildEmail({
      preheader: "This session will no longer take place.",
      eyebrow: "Cancelled",
      heading: "{{workshop_name}} is cancelled",
      paragraphs: [
        "Hi {{full_name}}, unfortunately the session on {{event_date}} can't go ahead.",
        "{{refund_note}}",
        "Apologies for the short notice — {{coach_name}} will be in touch about the next date.",
      ],
      footnote: "Questions? Reply to this email and we'll sort it out.",
    }),
  },

  // ------------------------------------------------------- consultations ---
  {
    key: "consultation_booked",
    label: "1-1 Consultation Confirmed",
    description: "Confirms a booked one-to-one consultation.",
    variables: ["full_name", "coach_name", "session_name", "event_date", "event_time", "duration", "join_link", "calendar_link", "academy_name", "year"],
    defaultSubject: "Your call with {{coach_name}} is confirmed",
    defaultBody: buildEmail({
      preheader: "Your one-to-one session is booked.",
      eyebrow: "Booking confirmed",
      heading: "You're booked in with {{coach_name}}",
      paragraphs: [
        "Hi {{full_name}}, your session is confirmed. Add it to your calendar so it doesn't creep up on you.",
      ],
      details: {
        title: "Your session",
        rows: [
          { label: "Session", value: "{{session_name}}" },
          { label: "Date", value: "{{event_date}}" },
          { label: "Time", value: "{{event_time}}", emphasis: true },
          { label: "Duration", value: "{{duration}}" },
        ],
      },
      cta: { label: "Join when it's time", url: "{{join_link}}" },
      footnote: "Add it to your calendar: {{calendar_link}}",
    }),
  },
  {
    key: "consultation_reminder",
    label: "1-1 Consultation Reminder",
    description: "Nudges both sides shortly before a one-to-one starts.",
    variables: ["full_name", "coach_name", "event_time", "duration", "join_link", "academy_name", "year"],
    defaultSubject: "Your call with {{coach_name}} starts soon",
    defaultBody: buildEmail({
      preheader: "Starting shortly — here's your link.",
      eyebrow: "Starting soon",
      heading: "Your session starts at {{event_time}}",
      paragraphs: [
        "Hi {{full_name}}, your {{duration}} session with {{coach_name}} is about to begin. The link below takes you straight in.",
      ],
      cta: { label: "Join the call", url: "{{join_link}}" },
      footnote: "Running late? Reply here and we'll let {{coach_name}} know.",
    }),
  },
  {
    key: "consultation_cancelled",
    label: "1-1 Consultation Cancelled",
    description: "Sent when a one-to-one booking is cancelled.",
    variables: ["full_name", "coach_name", "session_name", "event_date", "event_time", "booking_link", "academy_name", "year"],
    defaultSubject: "Your call on {{event_date}} is cancelled",
    defaultBody: buildEmail({
      preheader: "This booking has been cancelled.",
      eyebrow: "Cancelled",
      heading: "{{session_name}} is cancelled",
      paragraphs: [
        "Hi {{full_name}}, your session with {{coach_name}} on {{event_date}} at {{event_time}} has been cancelled.",
        "Nothing else is affected, and you can pick a new time whenever suits you.",
      ],
      cta: { label: "Book another time", url: "{{booking_link}}" },
      footnote: "If this was a mistake, reply to this email and we'll put it back.",
    }),
  },

  // ------------------------------------------------- progress & billing ---
  {
    key: "course_progress_milestone",
    label: "Course Progress Milestone",
    description: "Congratulates a learner at a progress mark, e.g. 10% or 50%.",
    variables: ["full_name", "course_name", "progress_percent", "lessons_completed", "resume_link", "academy_name", "year"],
    defaultSubject: "You're {{progress_percent}} through {{course_name}}",
    defaultBody: buildEmail({
      preheader: "Nice work — here's how far you've come.",
      eyebrow: "Milestone",
      heading: "{{progress_percent}} done",
      paragraphs: [
        "Hi {{full_name}}, you've reached {{progress_percent}} of <strong>{{course_name}}</strong>. The next lesson is waiting whenever you are.",
      ],
      details: {
        title: "Your progress",
        rows: [
          { label: "Course", value: "{{course_name}}" },
          { label: "Lessons done", value: "{{lessons_completed}}" },
          { label: "Progress", value: "{{progress_percent}}", emphasis: true },
        ],
      },
      cta: { label: "Keep going", url: "{{resume_link}}" },
      footnote: "Most people finish a lesson in under 20 minutes.",
    }),
  },
  {
    key: "subscription_expired",
    label: "Subscription Expired",
    description: "Sent once a subscription has lapsed and access has stopped.",
    variables: ["full_name", "plan_name", "expiry_date", "renew_link", "academy_name", "year"],
    defaultSubject: "Your {{academy_name}} subscription has ended",
    defaultBody: buildEmail({
      preheader: "Renew any time to pick up where you left off.",
      eyebrow: "Subscription ended",
      heading: "Your {{plan_name}} plan has ended",
      paragraphs: [
        "Hi {{full_name}}, your subscription ended on {{expiry_date}}, so access is paused for now.",
        "Your progress is safe. Renew whenever you like and everything comes back exactly as you left it.",
      ],
      cta: { label: "Renew my plan", url: "{{renew_link}}" },
      footnote: "Not coming back? No action needed — you won't be charged again.",
    }),
  },
];

export const SYSTEM_TEMPLATE: TemplateDef = {
  key: "login_otp",
  label: "System — Login OTP Email",
  description: "The one-time code used to sign in. Sent by the platform itself.",
  variables: ["full_name", "otp_code", "expiry_minutes", "academy_name", "year"],
  defaultSubject: "{{otp_code}} is your {{academy_name}} login code",
  defaultBody: buildEmail({
    preheader: "Your one-time sign-in code.",
    eyebrow: "Sign in",
    heading: "Your login code",
    paragraphs: [
      "Hi {{full_name}}, enter this code to finish signing in. It works once, and only for this attempt.",
    ],
    code: {
      value: "{{otp_code}}",
      caption: "Expires in {{expiry_minutes}} minutes",
    },
    security:
      "<strong>Didn't try to sign in?</strong> Ignore this email — the code is useless without your address. If this keeps happening, change your password.",
  }),
};

export const ALL_TEMPLATES = [...COACH_TEMPLATES, SYSTEM_TEMPLATE];
