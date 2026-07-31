// Copies every object in every known storage bucket from the OLD Supabase
// project to the NEW one. Run with: node scripts/migrate-storage.mjs
// Requires scripts/.env.migration to be filled in (see .env.migration.example).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    out[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return out;
}

const env = loadEnv(join(__dirname, ".env.migration"));

const BUCKETS = ["badge-icons", "channel-files", "course-resources", "course-videos"];

const oldClient = createClient(env.OLD_SUPABASE_URL, env.OLD_SERVICE_ROLE_KEY);
const newClient = createClient(env.NEW_SUPABASE_URL, env.NEW_SERVICE_ROLE_KEY);

async function listAllFiles(client, bucket, prefix = "") {
  const files = [];
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`List failed for ${bucket}/${prefix}: ${error.message}`);
  for (const entry of data || []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      // It's a "folder" (no id) — recurse.
      files.push(...(await listAllFiles(client, bucket, path)));
    } else {
      files.push(path);
    }
  }
  return files;
}

async function migrateBucket(bucket) {
  console.log(`\n--- Bucket: ${bucket} ---`);
  const files = await listAllFiles(oldClient, bucket);
  console.log(`Found ${files.length} file(s) to copy`);

  let copied = 0;
  let failed = 0;
  for (const path of files) {
    try {
      const { data: blob, error: downloadError } = await oldClient.storage.from(bucket).download(path);
      if (downloadError) throw downloadError;

      const { error: uploadError } = await newClient.storage
        .from(bucket)
        .upload(path, blob, { upsert: true, contentType: blob.type || undefined });
      if (uploadError) throw uploadError;

      copied++;
      if (copied % 25 === 0) console.log(`  ...${copied}/${files.length}`);
    } catch (err) {
      failed++;
      console.error(`  FAILED: ${path} — ${err.message || err}`);
    }
  }
  console.log(`Bucket ${bucket}: ${copied} copied, ${failed} failed`);
  return { bucket, total: files.length, copied, failed };
}

async function main() {
  if (!env.OLD_SUPABASE_URL || !env.OLD_SERVICE_ROLE_KEY || !env.NEW_SUPABASE_URL || !env.NEW_SERVICE_ROLE_KEY) {
    console.error("Missing required values in scripts/.env.migration — see .env.migration.example");
    process.exit(1);
  }

  const results = [];
  for (const bucket of BUCKETS) {
    results.push(await migrateBucket(bucket));
  }

  console.log("\n=== Storage migration summary ===");
  for (const r of results) {
    console.log(`${r.bucket}: ${r.copied}/${r.total} copied${r.failed ? `, ${r.failed} FAILED` : ""}`);
  }
  const anyFailed = results.some((r) => r.failed > 0);
  if (anyFailed) {
    console.error("\nSome files failed to copy — re-run this script (it's safe: upsert:true) to retry, or investigate the errors above.");
    process.exit(1);
  }
}

main();
