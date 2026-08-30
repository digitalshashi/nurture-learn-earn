-- Let someone buy before they have an account.
--
-- Checkout used to bounce anyone signed out to /login. For a link a coach
-- shares publicly that is the wrong order of events: the buyer has to invent
-- an account, on a page they have no reason to trust yet, before they are
-- allowed to hand over money. So the buyer is identified by the contact
-- details they type, and an account is created for them *after* the payment
-- succeeds.
--
-- Creating the account only on success is the point. An endpoint that makes a
-- user on request is an open invitation to fill the auth table with junk;
-- one that makes a user because a gateway confirmed a payment is not.

ALTER TABLE public.payment_orders ALTER COLUMN user_id DROP NOT NULL;

-- Who is buying, when there is no account to read it from yet. Also worth
-- keeping for orders that do have a user: it records what the buyer actually
-- typed at checkout rather than whatever their profile said at the time.
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_email text,
  ADD COLUMN IF NOT EXISTS buyer_phone text;

-- Where the buyer was when they checked out. The "here is your account" email
-- has to link somewhere, and a coach on a white-label domain must not be sent
-- a link to the platform's own hostname. A webhook has no request origin to
-- infer this from, so it is recorded up front.
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS checkout_origin text;

-- An order has to identify its buyer somehow, or fulfilment has nobody to
-- grant access to and no address to write to.
ALTER TABLE public.payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_has_a_buyer;
ALTER TABLE public.payment_orders
  ADD CONSTRAINT payment_orders_has_a_buyer
  CHECK (user_id IS NOT NULL OR buyer_email IS NOT NULL);

-- Fulfilment looks the buyer up by address to decide between attaching the
-- purchase to an existing account and creating one.
CREATE INDEX IF NOT EXISTS payment_orders_buyer_email_idx
  ON public.payment_orders (lower(buyer_email))
  WHERE buyer_email IS NOT NULL;

-- ------------------------------------------------------------- template ----
-- Sign-in details for an account created during checkout. Generated from
-- src/lib/emailTemplates.ts by scripts/generate-template-seed.mjs — regenerate
-- rather than hand-editing, so the seeded copy cannot drift from the source.
INSERT INTO public.email_templates (coach_id, template_key, subject, body_html, is_active)
SELECT NULL, v.template_key, v.subject, v.body_html, true
FROM (VALUES
  ($tpl$account_created$tpl$, $tpl$Your {{academy_name}} account is ready$tpl$, $tpl$<!doctype html>
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
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">

          <!-- Brand bar -->
          <tr>
            <td class="em-pad" style="padding:20px 32px;border-bottom:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:17px;font-weight:700;color:#111827;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">Account created</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                Your account is ready, {{full_name}}
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">You bought from <strong>{{academy_name}}</strong> without an account, so we made one for you. Sign in with the details below to get to everything you purchased.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Your sign-in details</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Email</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{email}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Temporary password</td>
                <td align="right" style="font-size:18px;font-weight:700;color:#111827;">{{temporary_password}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:0 18px 14px;"></td></tr>
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

          <!-- Footer -->
          <tr>
            <td class="em-pad" style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#6b7280;">
                Sent by {{academy_name}}.
              </p>
              <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;">
                If this wasn't meant for you, you can ignore it safely.
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
</html>$tpl$),
  ($tpl$sale_notification$tpl$, $tpl$New sale: {{item_name}} — {{amount}}$tpl$, $tpl$<!doctype html>
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
               style="width:600px;max-width:100%;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">

          <!-- Brand bar -->
          <tr>
            <td class="em-pad" style="padding:20px 32px;border-bottom:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:17px;font-weight:700;color:#111827;">
                    {{academy_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="em-pad em-body" style="padding:32px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!--content-->
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#f97316;">New sale</p>
              <h1 class="em-h1" style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:#111827;">
                {{item_name}} just sold
              </h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;"><strong>{{buyer_name}}</strong> completed a payment. Access has already been granted automatically — nothing needs doing.</p>
              
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:10px;background-color:#fafafa;">
        <tr><td style="padding:14px 18px 6px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;">Sale</td></tr>
        
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Item</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{item_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Buyer</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{buyer_name}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Email</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{buyer_email}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Method</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{payment_method}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:14px;color:#6b7280;">Reference</td>
                <td align="right" style="font-size:14px;font-weight:600;color:#374151;">{{transaction_id}}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 18px 8px;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
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

          <!-- Footer -->
          <tr>
            <td class="em-pad" style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;background-color:#fafafa;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <p style="margin:0 0 6px;font-size:13px;line-height:20px;color:#6b7280;">
                Sent by {{academy_name}}.
              </p>
              <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;">
                If this wasn't meant for you, you can ignore it safely.
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
</html>$tpl$)
) AS v(template_key, subject, body_html)
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates e
  WHERE e.coach_id IS NULL AND e.template_key = v.template_key
);
