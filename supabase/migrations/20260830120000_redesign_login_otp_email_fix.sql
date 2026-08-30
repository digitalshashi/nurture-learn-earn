-- Redesign the login OTP email — for real this time.
--
-- 20260830110000 tried to do this and silently changed nothing. Its WHERE
-- compared body_html against a literal written with LF newlines, but the
-- migration that seeded that body is a CRLF file, so what Postgres actually
-- stored carries \r\n on every line. The comparison could never be true, the
-- UPDATE matched zero rows, and the push reported success.
--
-- So the comparison here strips carriage returns from both sides. That is
-- immune to the line endings of whichever file wrote the row, which is not
-- something a template's identity should ever have depended on.
--
-- What changes, for anyone reading this later:
--   * the code gets its own centred panel instead of being a <span> inside a
--     <p>, where it inherited the paragraph's left alignment and read as prose
--   * the expiry sits under the code as a caption rather than as another grey
--     sentence three lines further down
--   * the security note becomes a bordered callout, not the middle line of a
--     wall of muted text
--   * the footer collapses from three stacked grey paragraphs to one
--   * the code scales down at 620px and again at 360px, so six tracked digits
--     cannot wrap mid-code on a small phone
--
-- The platform sends this from the coach_id IS NULL row, so this migration is
-- the only thing that reaches a real inbox — the TypeScript default only ever
-- seeds new rows.
--
-- An admin who edited theirs keeps their version: the body must still match
-- what was shipped.

UPDATE public.email_templates
SET body_html = '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your login code</title>
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
    Your one-time sign-in code.
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
                  <td style="font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:20px 32px 32px;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Sign in</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Your login code
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, enter this code to finish signing in. It works once, and only for this attempt.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 8px;">
        <tr>
          <td align="center" style="padding:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
              <tr>
                <td align="center" class="em-code"
                    style="padding:20px 32px;background-color:#f4f5f7;border:1px solid #e5e7eb;border-radius:12px;font-family:''SFMono-Regular'', Consolas, ''Liberation Mono'', Menlo, monospace;font-size:34px;line-height:42px;font-weight:700;letter-spacing:.28em;text-indent:.28em;color:#111827;white-space:nowrap;">
                  {{otp_code}}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td align="center" style="padding:12px 0 0;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;font-size:13px;line-height:20px;color:#6b7280;">Expires in {{expiry_minutes}} minutes</td></tr>
      </table>
              
              
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;">
        <tr>
          <td style="padding:14px 16px;background-color:#fff7ed;border-left:3px solid #f97316;border-radius:0 8px 8px 0;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;font-size:13px;line-height:21px;color:#7c2d12;">
            <strong>Didn''t try to sign in?</strong> Ignore this email — the code is useless without your address. If this keeps happening, change your password.
          </td>
        </tr>
      </table>
              
              <!--/content-->
            </td>
          </tr>

          <!-- Footer. One line, not three: the body already ends in muted
               text, and stacking more grey paragraphs turns the close of every
               email into a wall nobody reads. -->
          <tr>
            <td class="em-pad" style="padding:18px 32px 22px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
              <p style="margin:0;font-size:12px;line-height:19px;color:#6b7280;">
                Sent by {{academy_name}}. If this wasn''t meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>',
    updated_at = now()
WHERE template_key = 'login_otp'
  AND coach_id IS NULL
  AND replace(body_html, chr(13), '') = '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your login code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your one-time sign-in code.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">

          <!-- Brand bar -->
          <tr>
            <td style="padding:20px 32px;border-bottom:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:17px;font-weight:700;color:#111827;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Sign in</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Your login code
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, use this code to finish signing in. It works once and only for this login.</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><span style="display:inline-block;margin:8px 0;padding:16px 24px;background-color:#f4f5f7;border:1px solid #e5e7eb;border-radius:10px;font-family:''SFMono-Regular'',Consolas,''Liberation Mono'',Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:.28em;color:#111827;">{{otp_code}}</span></p>
              
              
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">The code expires in {{expiry_minutes}} minutes. If you didn''t try to sign in, ignore this email and consider changing your password.</p>
              <!--/content-->
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
              <p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#6b7280;">
                Sent by {{academy_name}}.
              </p>
              <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;">
                If this wasn''t meant for you, you can ignore it safely.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;color:#6b7280;">
          &copy; {{year}} {{academy_name}}
        </p>

      </td>
    </tr>
  </table>
</body>
</html>';
