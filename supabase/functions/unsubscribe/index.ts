// The other end of every unsubscribe link and List-Unsubscribe header.
//
// Two callers, which behave differently and must not be conflated:
//
//   POST  — the mailbox provider. Gmail and Yahoo POST here directly when
//           someone hits "Unsubscribe" next to the sender name, per RFC 8058.
//           No session, no confirmation, no HTML: it has to just work.
//
//   GET   — a person who clicked the footer link. This only ever *shows* a
//           confirmation. It deliberately does not unsubscribe, because
//           Outlook, proofpoint and most corporate mail scanners fetch every
//           link in a message to check it; if a GET unsubscribed, a scanner
//           would opt people out of mail they never even opened.
//
// The address is carried in a signed token rather than trusted from the query
// string, so nobody can unsubscribe anyone else by editing a URL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyUnsubscribeToken } from "../_shared/email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const page = (title: string, message: string, action?: string) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         background:#f4f5f7; color:#111827;
         font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
  .card { background:#fff; border:1px solid #e5e7eb; border-radius:14px;
          padding:40px; max-width:440px; margin:24px; text-align:center; }
  h1 { font-size:20px; margin:0 0 12px; }
  p { margin:0 0 24px; color:#4b5563; }
  button { font:inherit; font-weight:600; cursor:pointer; border:0; border-radius:8px;
           padding:12px 24px; background:#111827; color:#fff; }
  @media (prefers-color-scheme: dark) {
    body { background:#0b0d12; color:#f9fafb; }
    .card { background:#151922; border-color:#252c3a; }
    p { color:#9ca3af; }
    button { background:#f9fafb; color:#111827; }
  }
</style></head><body><div class="card"><h1>${title}</h1><p>${message}</p>${
      action
        ? `<form method="POST" action="${action}"><button type="submit">Confirm unsubscribe</button></form>`
        : ""
    }</div></body></html>`,
    { status: 200, headers: { ...cors, "Content-Type": "text/html; charset=utf-8" } },
  );

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const url = new URL(req.url);
  const email = (url.searchParams.get("e") || "").trim().toLowerCase();
  const coachParam = url.searchParams.get("c") || "";
  const coachId = coachParam === "" ? null : coachParam;
  const token = url.searchParams.get("t") || "";

  if (!email || !token || !(await verifyUnsubscribeToken(email, coachId, token))) {
    return page(
      "This link isn't valid",
      "It may have been altered or truncated by your email client. Reply to the message and we'll take you off the list.",
    );
  }

  if (req.method === "GET") {
    return page(
      "Unsubscribe?",
      `Stop sending marketing and reminder emails to <strong>${escapeHtml(email)}</strong>. ` +
        `You'll still get essential messages like payment receipts and sign-in codes.`,
      url.pathname + url.search,
    );
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Best effort: the row links back to a profile where there is one, so the
  // coach's list shows a name rather than a bare address.
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const { error } = await admin.from("email_unsubscribed").insert({
    email,
    coach_id: coachId,
    user_id: profile?.id ?? null,
    reason: "one-click unsubscribe",
  });

  // 23505 means they were already on the list. That is a success, not an
  // error — the provider retries anything it reads as a failure.
  if (error && error.code !== "23505") {
    console.error("unsubscribe insert failed:", error.message);
    return new Response("Could not process unsubscribe", { status: 500, headers: cors });
  }

  return page(
    "You're unsubscribed",
    `We won't send marketing or reminder emails to <strong>${escapeHtml(email)}</strong> any more.`,
  );
});
