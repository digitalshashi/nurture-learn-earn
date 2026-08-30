-- Push the redesigned shell into the rows that are actually sent.
--
-- The templates were seeded once, in 20260828160000. Everything since — the
-- brand stripe, the code panel, the security callout, the single-line footer,
-- the fixed-layout detail table that stops a transaction id running through the
-- side of its own box — changed src/lib/emailTemplates.ts and therefore changed
-- nothing a recipient sees. The seed had already run; the rows still held the
-- original markup. A receipt arriving today still looked like the old design.
--
-- Only coach_id IS NULL rows are touched. Those are the platform defaults: a
-- coach who edits a template gets a row of their own keyed on their coach_id,
-- so no customised copy is overwritten. login_otp is excluded — it is the one
-- stock row an admin edits in place, and it has its own guarded migration.
--
-- Generated: node scripts/generate-template-seed.mjs --refresh

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>You're in, {{full_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Here's how to get started in the next five minutes.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Welcome</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                You're in, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Thanks for joining <strong>{{academy_name}}</strong>. Everything you need is in one place, and you can start whenever you're ready.</p>
              
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
        
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">Open your dashboard to see what's available to you</td>
        </tr>
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">Start your first lesson — most people finish one in under 20 minutes</td>
        </tr>
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">Say hello in the community so we know you're here</td>
        </tr>
      </table>
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{dashboard_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Go to your dashboard
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Questions? Just reply to this email — {{coach_name}} reads every one.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$welcome_email$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your account is ready, {{full_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Here are your sign-in details.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Account created</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Your account is ready, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">You bought from <strong>{{academy_name}}</strong> without an account, so we made one for you. Sign in with the details below to get to everything you purchased.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Your sign-in details</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Email</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{email}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Temporary password</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{temporary_password}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{login_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Sign in
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Please change this password once you are in — it was generated for you and is only meant to get you started.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$account_created$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{item_name}} just sold</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    {{buyer_name}} just bought {{item_name}}.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New sale</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{item_name}} just sold
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><strong>{{buyer_name}}</strong> completed a payment. Access has already been granted automatically — nothing needs doing.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Sale</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Item</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{item_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Buyer</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{buyer_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Email</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{buyer_email}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Method</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{payment_method}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Reference</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{transaction_id}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Amount</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{amount}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{dashboard_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Open your dashboard
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Sold by {{coach_name}}.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$sale_notification$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{course_name}} is ready for you</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your course is unlocked and ready when you are.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Enrollment confirmed</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{course_name}} is ready for you
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your place is confirmed. You have full access from now on, and your progress saves automatically.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Course details</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Course</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{course_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Lessons</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{lesson_count}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Access</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">Unlimited</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{course_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Start learning
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">You can pick up exactly where you left off on any device.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$course_enrollment$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Thanks, {{full_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your payment went through. Here's your receipt.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Payment receipt</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Thanks, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">We've received your payment. Keep this email for your records — it's your receipt.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Receipt</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Item</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{item_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Date</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{payment_date}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Method</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{payment_method}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Transaction ID</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{transaction_id}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Total paid</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{amount}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Access is already active on your account. If anything looks wrong, reply to this email and we'll sort it out.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$payment_receipt$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Congratulations, {{full_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    You finished the course — here's your certificate.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Course complete</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Congratulations, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">You've completed <strong>{{course_name}}</strong>. Your certificate is issued and ready to download or share.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Certificate</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Course</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{course_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Completed</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{completion_date}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Awarded to</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{full_name}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{certificate_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              View your certificate
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Add it to LinkedIn or your CV — the link stays valid permanently.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$certificate_issued$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>You're {{progress_percent}} through {{course_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    You're partway through — one lesson gets you moving again.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Keep going</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                You're {{progress_percent}} through {{course_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your next lesson is <strong>{{lesson_name}}</strong>. It's waiting exactly where you stopped.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Where you are</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Course</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{course_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Next lesson</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{lesson_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Progress</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{progress_percent}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{resume_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Resume the course
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Short on time? Even one lesson keeps your streak alive.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$course_reminder$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{event_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your session is coming up — here's the join link.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Starting soon</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{event_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, this is your reminder. The join link below works from a few minutes before the start.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Session details</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Date</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{event_date}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Time</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{event_time}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Duration</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{duration}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{join_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Join the session
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Can't make it live? A recording is usually posted afterwards.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$event_reminder$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{lesson_name}} is now available</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    A new lesson just unlocked in your course.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New lesson</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{lesson_name}} is now available
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, the next part of <strong>{{course_name}}</strong> has just unlocked. It picks up right where the last lesson finished.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">What's new</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Course</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{course_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Lesson</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{lesson_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Length</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{lesson_duration}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{lesson_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Watch the lesson
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">It stays in your library, so you can come back to it whenever suits you.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$new_lesson_available$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Thanks, {{full_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your submission is in — here's what happens next.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Submission received</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Thanks, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Your work for <strong>{{assignment_name}}</strong> came through safely. Nothing else is needed from you right now.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Submission</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Course</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{course_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Assignment</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{assignment_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Submitted</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{submitted_at}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
        
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">Your submission is queued for review</td>
        </tr>
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">You'll get an email the moment feedback is ready</td>
        </tr>
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">Typical turnaround is {{review_window}}</td>
        </tr>
      </table>
              
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Spotted a mistake? Reply to this email and we'll let you resubmit.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$assignment_submitted$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{reviewer_name}} reviewed your work</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    {{reviewer_name}} has reviewed your work.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Feedback ready</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{reviewer_name}} reviewed your work
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your submission for <strong>{{assignment_name}}</strong> has been marked. The full comments are waiting for you.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Result</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Course</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{course_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Assignment</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{assignment_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Reviewed by</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{reviewer_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Result</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{grade}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{feedback_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Read the feedback
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Questions about the feedback? Reply here and it goes straight to your coach.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$assignment_reviewed$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>That's a wrap, {{full_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Every lesson done. Here's what you covered.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Course complete</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                That's a wrap, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">You've finished every lesson in <strong>{{course_name}}</strong>. That takes real consistency, and it's worth a moment to notice.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Your run</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Course</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{course_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Lessons completed</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{lessons_completed}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Time invested</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{time_invested}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{next_course_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Start {{next_course_name}}
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Your certificate arrives separately, and the course stays in your library for reference.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$course_completed$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Nice work this week, {{full_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    A quick look at what you covered this week.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Weekly summary</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Nice work this week, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Here's where you got to in <strong>{{course_name}}</strong> over the last seven days.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">This week</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Lessons completed</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{lessons_this_week}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Current streak</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{streak_days}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Course progress</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{progress_percent}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{resume_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Keep going
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Consistency beats intensity — even one lesson next week keeps you moving.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$course_progress_digest$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{days_left}} left on {{course_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your access ends soon — here's how to keep it.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Action needed</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{days_left}} left on {{course_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your access to <strong>{{course_name}}</strong> ends on {{expiry_date}}. After that the lessons and your notes are no longer available.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Where you are</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Course</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{course_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Progress so far</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{progress_percent}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Access ends</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{expiry_date}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{renew_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Extend my access
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">If you'd rather not continue, no action is needed — access simply ends on that date.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$course_access_expiring$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{replier_name}} answered you</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    There's a new reply on your course question.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New reply</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{replier_name}} answered you
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, you asked a question on <strong>{{lesson_name}}</strong> in {{course_name}}, and there's now a reply:</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><span style="display:block;padding:14px 16px;border-left:3px solid #f97316;background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:#374151;">{{reply_excerpt}}</span></p>
              
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{thread_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              View the full thread
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Reply in the thread so other learners with the same question can see it too.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$qna_reply$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Still thinking about {{course_name}}?</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your checkout is still open — pick up where you left off.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Almost there</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Still thinking about {{course_name}}?
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, you started signing up for <strong>{{course_name}}</strong> but didn't finish. Your place isn't reserved, though the checkout link below still works.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:16px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Course</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:16px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{course_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Price</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{amount}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{checkout_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Finish signing up
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Not the right time? You can ignore this — we won't chase you again about it.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$abandoned_checkout$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{service_name}} is confirmed</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your purchase is confirmed — here's what happens next.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Purchase confirmed</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{service_name}} is confirmed
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, thanks for booking <strong>{{service_name}}</strong> with {{coach_name}}. Everything is set up on your account.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Your booking</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Service</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{service_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">With</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{coach_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Paid</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{amount}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{booking_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Pick your slot
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Need to move things around? Reply here and we'll sort it out.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$service_purchase_confirmed$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>See you at {{event_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your place is saved. Add it to your calendar.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">You're registered</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                See you at {{event_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your place is saved. We'll send a reminder shortly before it starts, so there's nothing else to do for now.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">When</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Date</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{event_date}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Time</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{event_time}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Duration</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{duration}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{calendar_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Add to calendar
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">The join link is {{join_link}} — it opens a few minutes before the start.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$event_registration_confirmed$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{workshop_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your workshop session is about to begin.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Starting soon</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{workshop_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, session {{session_number}} of {{total_sessions}} begins at {{start_time}}. Grab a notebook — this one is hands-on.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">This session</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Workshop</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{workshop_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Session</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{session_number}} of {{total_sessions}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Starts</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{start_time}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{join_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Join now
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Joining late is fine — the room stays open for the full session.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$workshop_reminder$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{session_name}} is available to watch</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Missed it, or want to rewatch? The recording is ready.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Recording ready</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{session_name}} is available to watch
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, the recording from <strong>{{session_name}}</strong> is now in your library — whether you were there live or not.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Recording</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Session</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{session_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Length</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{recording_length}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Available until</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{available_until}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{recording_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Watch the recording
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">You can skip around — your position is remembered between visits.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$recording_available$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{plan_name}} renews soon</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    A heads-up before your next payment.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Upcoming charge</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{plan_name}} renews soon
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, this is a heads-up that your subscription renews automatically on {{renewal_date}}. No action is needed if you're happy to continue.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Next payment</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Plan</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{plan_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Renews on</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{renewal_date}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Amount</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{amount}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{billing_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Manage billing
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Cancel any time before {{renewal_date}} and you won't be charged again.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$subscription_renewal_reminder$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your payment didn't go through</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your payment didn't go through — here's how to fix it.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Action needed</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Your payment didn't go through
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, the payment of {{amount}} for <strong>{{plan_name}}</strong> was declined. This is usually an expired card or a bank block, and it's quick to fix.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">What failed</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Plan</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{plan_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Amount</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{amount}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">We'll retry on</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{retry_date}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{update_payment_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Update payment method
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Your access stays active until the retry. Update the card and nothing is interrupted.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$payment_failed$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your refund is on its way</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your refund has been issued.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Refund issued</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Your refund is on its way
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, we've refunded your payment for <strong>{{item_name}}</strong>. Banks usually take 5–10 working days to show it.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Refund</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Item</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{item_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Issued</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{refund_date}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Reference</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{transaction_id}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Refunded</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{amount}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">If it hasn't appeared after 10 working days, reply with this reference and we'll chase it.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$refund_processed$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{badge_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    A new badge just landed in your profile.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Badge unlocked</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{badge_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Nice one, {{full_name}} — {{badge_description}}</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Your progress</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Badge</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{badge_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">XP from this</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{xp_earned}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Total XP</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{total_xp}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{badges_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              See your badges
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Badges show on your profile for everyone in the community to see.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$badge_earned$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>You're now {{level_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    You've reached a new level.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Level up</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                You're now {{level_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, you've reached <strong>level {{level_number}}</strong>. That's earned, not given — it tracks the work you've actually put in.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Standing</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Level</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{level_number}} — {{level_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Total XP</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{total_xp}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">To {{next_level_name}}</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{xp_to_next}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{leaderboard_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              View the leaderboard
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">XP comes from finishing lessons, keeping habits and joining sessions.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$level_up$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{streak_days}} in a row</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your streak just hit a milestone.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Streak</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{streak_days}} in a row
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, showing up this consistently is the hard part, and you've done it {{streak_days}} running.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:16px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Current streak</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:16px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{streak_days}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Bonus XP</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{xp_bonus}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{resume_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Keep it going
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">One short session tomorrow is all it takes to keep the run alive.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$streak_milestone$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Join {{academy_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    You've been invited to join the team.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Invitation</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Join {{academy_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, {{inviter_name}} has invited you to join <strong>{{academy_name}}</strong> as {{role_name}}.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Invitation</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Workspace</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{academy_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Invited by</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{inviter_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Your role</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{role_name}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{accept_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Accept the invitation
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">This invitation expires in {{expiry_days}}. If you weren't expecting it, you can ignore this email.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$team_invite$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{sender_name}} messaged you</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    You have an unread message.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New message</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{sender_name}} messaged you
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, you have an unread message:</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><span style="display:block;padding:14px 16px;border-left:3px solid #f97316;background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:#374151;">{{message_excerpt}}</span></p>
              
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{conversation_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Reply
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">You can turn these notifications off in your account settings.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$new_message$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Reset your password</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Use the button below to choose a new password.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Security</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Reset your password
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, we got a request to reset your password. Choose a new one using the button below.</p>
              
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{reset_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Choose a new password
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">This link expires in {{expiry_minutes}} minutes and can only be used once. If you didn't ask for this, you can ignore this email — your password stays unchanged.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$password_reset$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{post_title}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Something new to read in the community.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New post</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{post_title}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, {{author_name}} just posted in {{academy_name}}:</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><span style="display:block;padding:14px 16px;border-left:3px solid #f97316;background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:#374151;">{{post_excerpt}}</span></p>
              
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{post_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Read the post
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">You can turn these notifications off in your account settings.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$post_published$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{commenter_name}} commented</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Someone replied to something you wrote.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New comment</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{commenter_name}} commented
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, there's a new comment on <strong>{{post_title}}</strong>:</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><span style="display:block;padding:14px 16px;border-left:3px solid #f97316;background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:#374151;">{{comment_excerpt}}</span></p>
              
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{post_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Reply to the comment
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">You can turn these notifications off in your account settings.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$post_comment$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{liker_name}} liked your comment</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your comment got a like.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New like</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{liker_name}} liked your comment
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your comment on <strong>{{post_title}}</strong> got a like:</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><span style="display:block;padding:14px 16px;border-left:3px solid #f97316;background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:#374151;">{{comment_excerpt}}</span></p>
              
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{post_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              View the thread
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">You can turn these notifications off in your account settings.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$comment_like$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{replier_name}} replied</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    You have a new reply.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New reply</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{replier_name}} replied
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, someone picked up the thread on <strong>{{post_title}}</strong>:</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><span style="display:block;padding:14px 16px;border-left:3px solid #f97316;background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:#374151;">{{comment_excerpt}}</span></p>
              
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{post_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Read the reply
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">You can turn these notifications off in your account settings.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$comment_reply$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{mentioner_name}} tagged you</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Someone wants your input.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">You were tagged</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{mentioner_name}} tagged you
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, you were mentioned on <strong>{{post_title}}</strong>:</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><span style="display:block;padding:14px 16px;border-left:3px solid #f97316;background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:#374151;">{{comment_excerpt}}</span></p>
              
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{post_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Join the conversation
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">You can turn these notifications off in your account settings.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$comment_mention$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{service_name}} is live</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Something new is available to book.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Now available</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{service_name}} is live
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, {{coach_name}} has just opened up something new:</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">{{service_description}}</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">What you get</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Service</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{service_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Price</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{price}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{service_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              See the details
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Places are limited and go in the order they're booked.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$service_announcement$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{workshop_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Save the date — here are the details.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Workshop scheduled</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{workshop_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, a new workshop is on the calendar. Add it now so you don't miss it.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">When</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Date</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{event_date}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Time</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{event_time}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Duration</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{duration}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Sessions</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{session_count}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{join_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Save your place
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">We'll remind you again shortly before it starts.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$workshop_scheduled$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{workshop_name}} has moved</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    The date has moved — here's the new one.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Rescheduled</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{workshop_name}} has moved
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, sorry for the change of plan. Your place is still booked — only the time has changed.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">The change</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Was</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{previous_date}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Now</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{event_date}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Time</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{event_time}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{join_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Update your calendar
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Nothing else changes — the same link gets you in.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$workshop_rescheduled$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{workshop_name}} is cancelled</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    This session will no longer take place.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Cancelled</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{workshop_name}} is cancelled
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, unfortunately the session on {{event_date}} can't go ahead.</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">{{refund_note}}</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Apologies for the short notice — {{coach_name}} will be in touch about the next date.</p>
              
              
              
              
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Questions? Reply to this email and we'll sort it out.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$workshop_cancelled$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>You're booked in with {{coach_name}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your one-to-one session is booked.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Booking confirmed</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                You're booked in with {{coach_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your session is confirmed. Add it to your calendar so it doesn't creep up on you.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Your session</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Session</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{session_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Date</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{event_date}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Time</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{event_time}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Duration</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{duration}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{join_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Join when it's time
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Add it to your calendar: {{calendar_link}}</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$consultation_booked$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your session starts at {{event_time}}</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Starting shortly — here's your link.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Starting soon</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Your session starts at {{event_time}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your {{duration}} session with {{coach_name}} is about to begin. The link below takes you straight in.</p>
              
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{join_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Join the call
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Running late? Reply here and we'll let {{coach_name}} know.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$consultation_reminder$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{session_name}} is cancelled</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    This booking has been cancelled.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Cancelled</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{session_name}} is cancelled
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your session with {{coach_name}} on {{event_date}} at {{event_time}} has been cancelled.</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Nothing else is affected, and you can pick a new time whenever suits you.</p>
              
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{booking_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Book another time
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">If this was a mistake, reply to this email and we'll put it back.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$consultation_cancelled$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{progress_percent}} done</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Nice work — here's how far you've come.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Milestone</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{progress_percent}} done
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, you've reached {{progress_percent}} of <strong>{{course_name}}</strong>. The next lesson is waiting whenever you are.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="table-layout:fixed;width:100%;margin:12px 0 22px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td colspan="2" style="padding:16px 18px 4px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Your progress</td></tr>
        
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Course</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{course_name}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="padding:7px 10px 7px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Lessons done</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="padding:7px 18px 7px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;font-weight:600;color:#374151;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{lessons_completed}}</td>
        </tr>
        <tr>
          <td class="em-cell em-label" width="40%" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 10px 4px 18px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:14px;line-height:22px;color:#6b7280;">Progress</td>
          <td class="em-cell em-value" width="60%" align="right" valign="top"
              style="border-top:1px solid #e5e7eb;padding:14px 18px 4px 10px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#111827;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">{{progress_percent}}</td>
        </tr>
        <tr><td colspan="2" style="padding:0 18px 14px;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{resume_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Keep going
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Most people finish a lesson in under 20 minutes.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$course_progress_milestone$tpl$;

UPDATE public.email_templates
SET body_html = $tpl$<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your {{plan_name}} plan has ended</title>
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
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Renew any time to pick up where you left off.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" class="em-gutter" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="em-shell"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">

          <!-- A brand stripe: identity without needing a hosted logo, which
               would be blocked by every client that turns images off. -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background-color:#f97316;">&nbsp;</td>
          </tr>

          <!-- Brand bar. Set small and tracked so it reads as chrome rather
               than competing with the headline directly beneath it. -->
          <tr>
            <td class="em-pad" style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Subscription ended</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Your {{plan_name}} plan has ended
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your subscription ended on {{expiry_date}}, so access is paused for now.</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Your progress is safe. Renew whenever you like and everything comes back exactly as you left it.</p>
              
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="em-cta" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;mso-padding-alt:14px 28px;">
            <a href="{{renew_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
              Renew my plan
            </a>
          </td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Not coming back? No action needed — you won't be charged again.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn't meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>$tpl$,
    updated_at = now()
WHERE coach_id IS NULL AND template_key = $tpl$subscription_expired$tpl$;
