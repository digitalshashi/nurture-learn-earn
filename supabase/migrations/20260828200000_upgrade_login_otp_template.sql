-- Upgrade the stock login OTP email to the designed template.
--
-- login_otp was seeded back in 20260731112441 as three bare paragraphs, so the
-- earlier seed migration skipped it (its NOT EXISTS guard protects rows that
-- are already there). That left the one template the platform actually sends
-- as the only undesigned one.
--
-- The WHERE clause matches the original stock body exactly, so a coach who
-- edited theirs keeps their version untouched.

UPDATE public.email_templates
SET subject = '{{otp_code}} is your {{academy_name}} login code',
    body_html = '<!doctype html>
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
</html>',
    updated_at = now()
WHERE template_key = 'login_otp'
  AND coach_id IS NULL
  AND body_html = '<p>Hi {{full_name}},</p><p>Your one-time login code is:</p><h2 style="letter-spacing:4px;">{{otp_code}}</h2><p>This code expires in {{expiry_minutes}} minutes. If you didn''t request this, you can safely ignore this email.</p>';
