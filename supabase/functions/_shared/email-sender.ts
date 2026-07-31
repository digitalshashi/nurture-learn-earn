import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export interface EmailAccount {
  provider: string;
  sender_name: string;
  sender_email: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_encryption: string | null;
  smtp_username: string | null;
  smtp_password: string | null;
  api_key: string | null;
  api_domain: string | null;
  api_region: string | null;
  reply_to_name: string | null;
  reply_to_email: string | null;
}

export interface SendEmailArgs {
  account: EmailAccount;
  to: string;
  subject: string;
  html: string;
  fromName?: string | null;
  fromEmail?: string | null;
  replyToName?: string | null;
  replyToEmail?: string | null;
}

export async function sendEmail({
  account,
  to,
  subject,
  html,
  fromName,
  fromEmail,
  replyToName,
  replyToEmail,
}: SendEmailArgs): Promise<void> {
  const resolvedFromName = fromName || account.sender_name;
  const resolvedFromEmail = fromEmail || account.sender_email;
  const resolvedReplyToName = replyToName || account.reply_to_name || resolvedFromName;
  const resolvedReplyToEmail = replyToEmail || account.reply_to_email || resolvedFromEmail;

  switch (account.provider) {
    case "smtp":
    case "ses":
      return sendViaSmtp(account, { to, subject, html, resolvedFromName, resolvedFromEmail, resolvedReplyToEmail });
    case "resend":
      return sendViaResend(account, { to, subject, html, resolvedFromName, resolvedFromEmail, resolvedReplyToName, resolvedReplyToEmail });
    case "mailersend":
      return sendViaMailerSend(account, { to, subject, html, resolvedFromName, resolvedFromEmail, resolvedReplyToName, resolvedReplyToEmail });
    default:
      throw new Error(`Unsupported email provider: ${account.provider}`);
  }
}

async function sendViaSmtp(
  account: EmailAccount,
  args: { to: string; subject: string; html: string; resolvedFromName: string; resolvedFromEmail: string; resolvedReplyToEmail: string },
) {
  if (!account.smtp_host || !account.smtp_username || !account.smtp_password) {
    throw new Error("SMTP credentials are incomplete for this sender account");
  }
  const port = account.smtp_port || 587;
  const client = new SMTPClient({
    connection: {
      hostname: account.smtp_host,
      port,
      tls: account.smtp_encryption === "ssl",
      auth: { username: account.smtp_username, password: account.smtp_password },
    },
  });
  try {
    await client.send({
      from: `${args.resolvedFromName} <${args.resolvedFromEmail}>`,
      to: args.to,
      replyTo: args.resolvedReplyToEmail,
      subject: args.subject,
      html: args.html,
    });
  } finally {
    await client.close();
  }
}

async function sendViaResend(
  account: EmailAccount,
  args: { to: string; subject: string; html: string; resolvedFromName: string; resolvedFromEmail: string; resolvedReplyToName: string; resolvedReplyToEmail: string },
) {
  if (!account.api_key) throw new Error("Resend API key is missing for this sender account");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${args.resolvedFromName} <${args.resolvedFromEmail}>`,
      to: [args.to],
      reply_to: args.resolvedReplyToEmail,
      subject: args.subject,
      html: args.html,
    }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
}

async function sendViaMailerSend(
  account: EmailAccount,
  args: { to: string; subject: string; html: string; resolvedFromName: string; resolvedFromEmail: string; resolvedReplyToName: string; resolvedReplyToEmail: string },
) {
  if (!account.api_key) throw new Error("MailerSend API key is missing for this sender account");
  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { email: args.resolvedFromEmail, name: args.resolvedFromName },
      to: [{ email: args.to }],
      reply_to: { email: args.resolvedReplyToEmail, name: args.resolvedReplyToName },
      subject: args.subject,
      html: args.html,
    }),
  });
  if (!res.ok) throw new Error(`MailerSend send failed: ${res.status} ${await res.text()}`);
}
