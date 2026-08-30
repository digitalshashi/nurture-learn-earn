// Emits the SQL that seeds an email template, straight from the definition in
// src/lib/emailTemplates.ts.
//
// The original seed migration was produced by hand, which makes the database
// copy and the source copy free to drift — and the drift is invisible, because
// the seed only ever runs once. This keeps one source of truth.
//
//   node scripts/generate-template-seed.mjs account_created >> migration.sql
//   node scripts/generate-template-seed.mjs --refresh >> migration.sql
//
// --refresh emits UPDATEs for every stock row instead of INSERTs. That is how a
// change to the shared shell reaches an inbox: the seed only ever runs once, so
// editing emailTemplates.ts alone changes nothing that is actually sent. Only
// coach_id IS NULL rows are touched — a coach who customises a template gets a
// row of their own, so no edited copy is overwritten.
//
// Bodies are large HTML documents full of quotes, so the output uses dollar
// quoting rather than trying to escape them.

import { build } from "esbuild";
import { readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const refresh = args.includes("--refresh");
const keys = args.filter((arg) => arg !== "--refresh");

if (keys.length === 0 && !refresh) {
  console.error("usage: node scripts/generate-template-seed.mjs <template_key> [...]");
  process.exit(1);
}

// emailTemplates.ts is TypeScript with path aliases, so it cannot simply be
// imported. Bundling it to a temp file is cheaper than maintaining a parallel
// copy of the template bodies here.
const out = join(tmpdir(), `template-seed-${process.pid}.mjs`);
await build({
  entryPoints: ["src/lib/emailTemplates.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: out,
  logLevel: "silent",
});

const { COACH_TEMPLATES, SYSTEM_TEMPLATE } = await import(pathToFileURL(out).href);
unlinkSync(out);

const all = [...COACH_TEMPLATES, SYSTEM_TEMPLATE];

const rows = [];
for (const key of keys) {
  const template = all.find((t) => t.key === key);
  if (!template) {
    console.error(`no template named "${key}" in src/lib/emailTemplates.ts`);
    process.exit(1);
  }
  rows.push(template);
}

const quote = (value) => {
  // Pick a dollar-quote tag the content cannot possibly contain.
  let tag = "$tpl$";
  let n = 0;
  while (value.includes(tag)) tag = `$tpl${++n}$`;
  return `${tag}${value}${tag}`;
};

if (refresh) {
  // login_otp is the one stock row an admin edits in place, so it is refreshed
  // by its own guarded migration rather than swept up here.
  const statements = COACH_TEMPLATES.map(
    (t) =>
      "UPDATE public.email_templates\n" +
      "SET body_html = " + quote(t.defaultBody) + ",\n" +
      "    updated_at = now()\n" +
      "WHERE coach_id IS NULL AND template_key = " + quote(t.key) + ";\n",
  );

  process.stdout.write(statements.join("\n"));
  process.exit(0);
}

const values = rows
  .map((t) => `  (${quote(t.key)}, ${quote(t.defaultSubject)}, ${quote(t.defaultBody)})`)
  .join(",\n");

process.stdout.write(
  `INSERT INTO public.email_templates (coach_id, template_key, subject, body_html, is_active)
SELECT NULL, v.template_key, v.subject, v.body_html, true
FROM (VALUES
${values}
) AS v(template_key, subject, body_html)
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates e
  WHERE e.coach_id IS NULL AND e.template_key = v.template_key
);
`,
);
