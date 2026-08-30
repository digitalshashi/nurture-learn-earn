-- Seed every email template as a platform-level row (coach_id IS NULL).
--
-- The bodies previously lived only as defaults inside the settings UI, so a
-- template did not exist server-side until a coach opened that screen and
-- pressed Save. Anything trying to send one found nothing and fell back to a
-- bare paragraph. These rows give every template a real, editable home.
--
-- Generated from src/lib/emailTemplates.ts — regenerate rather than hand-edit.
-- Existing rows are left alone so nobody's customised copy is overwritten.

INSERT INTO public.email_templates (coach_id, template_key, subject, body_html, is_active)
SELECT NULL, v.template_key, v.subject, v.body_html, true
FROM (VALUES
  ('welcome_email', 'Welcome to {{academy_name}}, {{full_name}} 👋', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>You''re in, {{full_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Here''s how to get started in the next five minutes.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Welcome</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                You''re in, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Thanks for joining <strong>{{academy_name}}</strong>. Everything you need is in one place, and you can start whenever you''re ready.</p>
              
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
        
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">Open your dashboard to see what''s available to you</td>
        </tr>
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">Start your first lesson — most people finish one in under 20 minutes</td>
        </tr>
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">Say hello in the community so we know you''re here</td>
        </tr>
      </table>
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{dashboard_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Go to your dashboard
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Questions? Just reply to this email — {{coach_name}} reads every one.</p>
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
</html>'),
  ('course_enrollment', 'You''re enrolled in {{course_name}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{course_name}} is ready for you</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your course is unlocked and ready when you are.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Enrollment confirmed</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{course_name}} is ready for you
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your place is confirmed. You have full access from now on, and your progress saves automatically.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Course details</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Course</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{course_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Lessons</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{lesson_count}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Access</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">Unlimited</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{course_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Start learning
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">You can pick up exactly where you left off on any device.</p>
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
</html>'),
  ('payment_receipt', 'Receipt for {{item_name}} — {{amount}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Thanks, {{full_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your payment went through. Here''s your receipt.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Payment receipt</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Thanks, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">We''ve received your payment. Keep this email for your records — it''s your receipt.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Receipt</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Item</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{item_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Date</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{payment_date}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Method</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{payment_method}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Transaction ID</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{transaction_id}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Total paid</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{amount}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Access is already active on your account. If anything looks wrong, reply to this email and we''ll sort it out.</p>
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
</html>'),
  ('certificate_issued', 'Your {{course_name}} certificate is ready 🎓', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Congratulations, {{full_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    You finished the course — here''s your certificate.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Course complete</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Congratulations, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">You''ve completed <strong>{{course_name}}</strong>. Your certificate is issued and ready to download or share.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Certificate</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Course</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{course_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Completed</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{completion_date}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Awarded to</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{full_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{certificate_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              View your certificate
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Add it to LinkedIn or your CV — the link stays valid permanently.</p>
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
</html>'),
  ('course_reminder', 'Pick up where you left off in {{course_name}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>You''re {{progress_percent}} through {{course_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    You''re partway through — one lesson gets you moving again.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Keep going</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                You''re {{progress_percent}} through {{course_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your next lesson is <strong>{{lesson_name}}</strong>. It''s waiting exactly where you stopped.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Where you are</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Course</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{course_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Next lesson</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{lesson_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Progress</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{progress_percent}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{resume_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Resume the course
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Short on time? Even one lesson keeps your streak alive.</p>
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
</html>'),
  ('event_reminder', '{{event_name}} starts at {{event_time}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{event_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your session is coming up — here''s the join link.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Starting soon</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{event_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, this is your reminder. The join link below works from a few minutes before the start.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Session details</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Date</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{event_date}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Time</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{event_time}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Duration</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{duration}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{join_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Join the session
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Can''t make it live? A recording is usually posted afterwards.</p>
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
</html>'),
  ('new_lesson_available', 'New in {{course_name}}: {{lesson_name}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{lesson_name}} is now available</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    A new lesson just unlocked in your course.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New lesson</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{lesson_name}} is now available
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, the next part of <strong>{{course_name}}</strong> has just unlocked. It picks up right where the last lesson finished.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">What''s new</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Course</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{course_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Lesson</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{lesson_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Length</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{lesson_duration}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{lesson_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Watch the lesson
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">It stays in your library, so you can come back to it whenever suits you.</p>
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
</html>'),
  ('assignment_submitted', 'We''ve got your {{assignment_name}} submission', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Thanks, {{full_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your submission is in — here''s what happens next.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Submission received</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Thanks, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Your work for <strong>{{assignment_name}}</strong> came through safely. Nothing else is needed from you right now.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Submission</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Course</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{course_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Assignment</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{assignment_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Submitted</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{submitted_at}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
        
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">Your submission is queued for review</td>
        </tr>
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">You''ll get an email the moment feedback is ready</td>
        </tr>
        <tr>
          <td width="24" valign="top" style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;color:#f97316;line-height:24px;">&#8226;</td>
          <td style="padding:4px 0;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:15px;line-height:24px;color:#374151;">Typical turnaround is {{review_window}}</td>
        </tr>
      </table>
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Spotted a mistake? Reply to this email and we''ll let you resubmit.</p>
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
</html>'),
  ('assignment_reviewed', 'Your feedback on {{assignment_name}} is ready', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{reviewer_name}} reviewed your work</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    {{reviewer_name}} has reviewed your work.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Feedback ready</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{reviewer_name}} reviewed your work
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your submission for <strong>{{assignment_name}}</strong> has been marked. The full comments are waiting for you.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Result</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Course</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{course_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Assignment</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{assignment_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Reviewed by</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{reviewer_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Result</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{grade}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{feedback_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Read the feedback
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Questions about the feedback? Reply here and it goes straight to your coach.</p>
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
</html>'),
  ('course_completed', 'You finished {{course_name}} 🎉', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>That''s a wrap, {{full_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Every lesson done. Here''s what you covered.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Course complete</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                That''s a wrap, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">You''ve finished every lesson in <strong>{{course_name}}</strong>. That takes real consistency, and it''s worth a moment to notice.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Your run</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Course</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{course_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Lessons completed</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{lessons_completed}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Time invested</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{time_invested}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{next_course_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Start {{next_course_name}}
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Your certificate arrives separately, and the course stays in your library for reference.</p>
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
</html>'),
  ('course_progress_digest', 'Your week in {{course_name}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Nice work this week, {{full_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    A quick look at what you covered this week.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Weekly summary</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Nice work this week, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Here''s where you got to in <strong>{{course_name}}</strong> over the last seven days.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">This week</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Lessons completed</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{lessons_this_week}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Current streak</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{streak_days}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Course progress</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{progress_percent}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{resume_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Keep going
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Consistency beats intensity — even one lesson next week keeps you moving.</p>
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
</html>'),
  ('course_access_expiring', 'Your access to {{course_name}} ends {{expiry_date}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{days_left}} left on {{course_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your access ends soon — here''s how to keep it.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Action needed</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{days_left}} left on {{course_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your access to <strong>{{course_name}}</strong> ends on {{expiry_date}}. After that the lessons and your notes are no longer available.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Where you are</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Course</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{course_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Progress so far</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{progress_percent}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Access ends</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{expiry_date}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{renew_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Extend my access
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">If you''d rather not continue, no action is needed — access simply ends on that date.</p>
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
</html>'),
  ('qna_reply', '{{replier_name}} replied to your question', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{replier_name}} answered you</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    There''s a new reply on your course question.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New reply</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{replier_name}} answered you
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, you asked a question on <strong>{{lesson_name}}</strong> in {{course_name}}, and there''s now a reply:</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><span style="display:block;padding:14px 16px;border-left:3px solid #f97316;background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:#374151;">{{reply_excerpt}}</span></p>
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{thread_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              View the full thread
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Reply in the thread so other learners with the same question can see it too.</p>
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
</html>'),
  ('abandoned_checkout', 'You left {{course_name}} in your basket', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Still thinking about {{course_name}}?</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your checkout is still open — pick up where you left off.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Almost there</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Still thinking about {{course_name}}?
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, you started signing up for <strong>{{course_name}}</strong> but didn''t finish. Your place isn''t reserved, though the checkout link below still works.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        
        
        <tr>
          <td style="padding:14px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Course</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{course_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Price</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{amount}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{checkout_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Finish signing up
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Not the right time? You can ignore this — we won''t chase you again about it.</p>
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
</html>'),
  ('service_purchase_confirmed', 'You''re booked in for {{service_name}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{service_name}} is confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your purchase is confirmed — here''s what happens next.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Purchase confirmed</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{service_name}} is confirmed
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, thanks for booking <strong>{{service_name}}</strong> with {{coach_name}}. Everything is set up on your account.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Your booking</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Service</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{service_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">With</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{coach_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Paid</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{amount}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{booking_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Pick your slot
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Need to move things around? Reply here and we''ll sort it out.</p>
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
</html>'),
  ('event_registration_confirmed', 'You''re registered for {{event_name}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>See you at {{event_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your place is saved. Add it to your calendar.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">You''re registered</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                See you at {{event_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, your place is saved. We''ll send a reminder shortly before it starts, so there''s nothing else to do for now.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">When</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Date</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{event_date}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Time</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{event_time}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Duration</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{duration}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{calendar_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Add to calendar
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">The join link is {{join_link}} — it opens a few minutes before the start.</p>
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
</html>'),
  ('workshop_reminder', '{{workshop_name}} starts at {{start_time}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{workshop_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your workshop session is about to begin.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Starting soon</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{workshop_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, session {{session_number}} of {{total_sessions}} begins at {{start_time}}. Grab a notebook — this one is hands-on.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">This session</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Workshop</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{workshop_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Session</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{session_number}} of {{total_sessions}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Starts</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{start_time}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{join_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Join now
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Joining late is fine — the room stays open for the full session.</p>
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
</html>'),
  ('recording_available', 'The {{session_name}} recording is up', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{session_name}} is available to watch</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Missed it, or want to rewatch? The recording is ready.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Recording ready</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{session_name}} is available to watch
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, the recording from <strong>{{session_name}}</strong> is now in your library — whether you were there live or not.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Recording</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Session</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{session_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Length</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{recording_length}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Available until</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{available_until}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{recording_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Watch the recording
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">You can skip around — your position is remembered between visits.</p>
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
</html>'),
  ('subscription_renewal_reminder', 'Your {{plan_name}} renews on {{renewal_date}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{plan_name}} renews soon</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    A heads-up before your next payment.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Upcoming charge</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{plan_name}} renews soon
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, this is a heads-up that your subscription renews automatically on {{renewal_date}}. No action is needed if you''re happy to continue.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Next payment</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Plan</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{plan_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Renews on</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{renewal_date}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Amount</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{amount}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{billing_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Manage billing
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Cancel any time before {{renewal_date}} and you won''t be charged again.</p>
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
</html>'),
  ('payment_failed', 'We couldn''t process your payment for {{plan_name}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your payment didn''t go through</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your payment didn''t go through — here''s how to fix it.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Action needed</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Your payment didn''t go through
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, the payment of {{amount}} for <strong>{{plan_name}}</strong> was declined. This is usually an expired card or a bank block, and it''s quick to fix.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">What failed</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Plan</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{plan_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Amount</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{amount}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">We''ll retry on</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{retry_date}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{update_payment_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Update payment method
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Your access stays active until the retry. Update the card and nothing is interrupted.</p>
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
</html>'),
  ('refund_processed', 'Your refund for {{item_name}} is on its way', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your refund is on its way</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your refund has been issued.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Refund issued</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Your refund is on its way
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, we''ve refunded your payment for <strong>{{item_name}}</strong>. Banks usually take 5–10 working days to show it.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Refund</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Item</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{item_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Issued</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{refund_date}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Reference</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{transaction_id}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Refunded</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{amount}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">If it hasn''t appeared after 10 working days, reply with this reference and we''ll chase it.</p>
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
</html>'),
  ('badge_earned', 'You earned the {{badge_name}} badge 🏅', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{badge_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    A new badge just landed in your profile.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Badge unlocked</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{badge_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Nice one, {{full_name}} — {{badge_description}}</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Your progress</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Badge</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{badge_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">XP from this</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{xp_earned}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Total XP</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{total_xp}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{badges_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              See your badges
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">Badges show on your profile for everyone in the community to see.</p>
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
</html>'),
  ('level_up', 'Level {{level_number}} unlocked — you''re now {{level_name}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>You''re now {{level_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    You''ve reached a new level.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Level up</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                You''re now {{level_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, you''ve reached <strong>level {{level_number}}</strong>. That''s earned, not given — it tracks the work you''ve actually put in.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Standing</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Level</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{level_number}} — {{level_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Total XP</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{total_xp}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">To {{next_level_name}}</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{xp_to_next}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{leaderboard_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              View the leaderboard
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">XP comes from finishing lessons, keeping habits and joining sessions.</p>
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
</html>'),
  ('streak_milestone', '{{streak_days}} in a row 🔥', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{streak_days}} in a row</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Your streak just hit a milestone.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Streak</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{streak_days}} in a row
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, showing up this consistently is the hard part, and you''ve done it {{streak_days}} running.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        
        
        <tr>
          <td style="padding:14px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Current streak</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{streak_days}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Bonus XP</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{xp_bonus}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{resume_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Keep it going
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">One short session tomorrow is all it takes to keep the run alive.</p>
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
</html>'),
  ('team_invite', '{{inviter_name}} invited you to join {{academy_name}}', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Join {{academy_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    You''ve been invited to join the team.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Invitation</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Join {{academy_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, {{inviter_name}} has invited you to join <strong>{{academy_name}}</strong> as {{role_name}}.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Invitation</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Workspace</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{academy_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Invited by</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{inviter_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Your role</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{role_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
      </table>
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{accept_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Accept the invitation
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">This invitation expires in {{expiry_days}}. If you weren''t expecting it, you can ignore this email.</p>
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
</html>'),
  ('new_message', '{{sender_name}} sent you a message', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{{sender_name}} messaged you</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    You have an unread message.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New message</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{sender_name}} messaged you
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, you have an unread message:</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><span style="display:block;padding:14px 16px;border-left:3px solid #f97316;background-color:#fafafa;border-radius:0 8px 8px 0;font-size:15px;line-height:24px;color:#374151;">{{message_excerpt}}</span></p>
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{conversation_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Reply
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">You can turn these notifications off in your account settings.</p>
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
</html>'),
  ('password_reset', 'Reset your {{academy_name}} password', '<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <!-- Preheader: shown beside the subject in the inbox, hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    Use the button below to choose a new password.
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Security</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Reset your password
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">Hi {{full_name}}, we got a request to reset your password. Choose a new one using the button below.</p>
              
              
              
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
        <tr>
          <td align="center" bgcolor="#f97316" style="border-radius:8px;">
            <a href="{{reset_link}}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;padding:14px 28px;font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              Choose a new password
            </a>
          </td>
        </tr>
      </table>
              <p style="margin:16px 0 0;font-size:13px;line-height:21px;color:#6b7280;">This link expires in {{expiry_minutes}} minutes and can only be used once. If you didn''t ask for this, you can ignore this email — your password stays unchanged.</p>
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
</html>'),
  ('login_otp', '{{otp_code}} is your {{academy_name}} login code', '<!doctype html>
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
</html>')
) AS v(template_key, subject, body_html)
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates e
  WHERE e.template_key = v.template_key AND e.coach_id IS NULL
);
