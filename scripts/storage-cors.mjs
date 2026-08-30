#!/usr/bin/env node
/**
 * Applies (or lists) the R2 bucket's CORS rules.
 *
 * A wrapper rather than a bare wrangler line in package.json because npm runs
 * scripts through cmd.exe on Windows, where `${STORAGE_BUCKET:-1corehub}` is
 * not expansion — it is passed through as the literal bucket name.
 *
 *   node scripts/storage-cors.mjs          # set from scripts/storage-cors.json
 *   node scripts/storage-cors.mjs list     # show what the bucket has now
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const rulesFile = join(here, "storage-cors.json");
const bucket = process.env.STORAGE_BUCKET || "1corehub";
const mode = process.argv[2] === "list" ? "list" : "set";

if (mode === "set" && !existsSync(rulesFile)) {
  console.error(`Missing ${rulesFile}`);
  process.exit(1);
}

const args =
  mode === "list"
    ? ["wrangler", "r2", "bucket", "cors", "list", bucket]
    : // --force because this runs non-interactively; without it wrangler waits
      // on a confirmation nobody is there to answer.
      ["wrangler", "r2", "bucket", "cors", "set", bucket, "--file", rulesFile, "--force"];

// Run wrangler's entry point with this same node binary rather than going
// through npx. A shell would re-split the rules path at the space in the
// project folder's name, and Node on Windows refuses to spawn npx.cmd without
// one — calling the .js directly sidesteps both.
const wranglerJs = join(here, "..", "node_modules", "wrangler", "bin", "wrangler.js");
if (!existsSync(wranglerJs)) {
  console.error("wrangler is not installed. Run `npm install` first.");
  process.exit(1);
}

console.log(`> wrangler ${args.slice(1).join(" ")}\n`);

const result = spawnSync(process.execPath, [wranglerJs, ...args.slice(1)], { stdio: "inherit" });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(
    "\nwrangler failed. This needs `wrangler login` (or CLOUDFLARE_API_TOKEN) with a token\n" +
      "holding Workers R2 Storage: Edit. See scripts/apply-storage-cors.md.",
  );
}

process.exit(result.status ?? 1);
