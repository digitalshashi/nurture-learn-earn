#!/usr/bin/env node
/**
 * Phase 1 of the recording pipeline: prove the AI chapter-detection layer
 * works before anything else (upload, storage, ffmpeg, a review UI) gets
 * built around it.
 *
 * Takes a Zoom .vtt transcript, normalizes it into cue-level JSON, sends it
 * to the app's own AI layer (the "ai-generate" edge function — the same one
 * Settings > AI providers configures) in overlapping chunks asking for
 * topic-shift chapters, then deterministically fixes the seams (gaps,
 * overlaps, sub-90s chapters) so the output is a single clean timeline.
 *
 * This does not call any AI provider directly and needs no separate API key
 * — it goes through ai-generate, which resolves whichever provider and
 * credential the coach already connected in Settings > AI providers.
 *
 * Auth: ai-generate requires a signed-in user. Either set
 * PIPELINE_USER_ACCESS_TOKEN to a token you already have (e.g. copied out of
 * the browser's devtools while signed in), or set COACH_EMAIL / COACH_PASSWORD
 * and this script signs in for you. See scripts/.env.pipeline.example.
 *
 * Usage:
 *   node scripts/vtt-chapters.mjs transcript.vtt
 *   node scripts/vtt-chapters.mjs transcript.vtt --out chapters.json
 *   node scripts/vtt-chapters.mjs transcript.vtt --model claude-sonnet-5
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const MIN_CHAPTER_SECONDS = 90;
const DEFAULT_CHUNK_WORDS = 6000;
const DEFAULT_OVERLAP_WORDS = 400;

// ---------------------------------------------------------------------------
// .env loading — this repo has no dotenv dependency, so read root .env and
// scripts/.env.pipeline by hand (matching how the rest of the app's env is
// wired) without adding one for a single script.
// ---------------------------------------------------------------------------

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(new URL("../.env", import.meta.url).pathname);
loadEnvFile(new URL(".env.pipeline", import.meta.url).pathname);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--out") args.out = argv[++i];
    else if (arg === "--model") args.model = argv[++i];
    else if (arg === "--chunk-words") args.chunkWords = Number(argv[++i]);
    else args._.push(arg);
  }
  return args;
}

// ---------------------------------------------------------------------------
// VTT parsing — Zoom cues look like:
//   1
//   00:00:03.500 --> 00:00:07.200
//   Jane Doe: Thanks for having me.
// or with a <v Speaker> tag instead of a "Name:" prefix.
// ---------------------------------------------------------------------------

const TIMESTAMP_RE = /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/;
const V_TAG_RE = /^<v\s+([^>]+)>(.*)<\/v>$/i;
const SPEAKER_PREFIX_RE = /^([^:\n]{1,40}):\s*(.+)$/s;

function timestampToSeconds(ts) {
  const [h, m, s] = ts.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function parseVtt(raw) {
  const blocks = raw.replace(/\r\n/g, "\n").split(/\n\n+/);
  const cues = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) continue;
    if (/^WEBVTT/i.test(lines[0])) continue;
    if (/^NOTE/i.test(lines[0])) continue;

    const timestampLineIndex = lines.findIndex((l) => TIMESTAMP_RE.test(l));
    if (timestampLineIndex === -1) continue; // stray cue index or blank block

    const match = lines[timestampLineIndex].match(TIMESTAMP_RE);
    const start = timestampToSeconds(match[1]);
    const end = timestampToSeconds(match[2]);
    const textLines = lines.slice(timestampLineIndex + 1);
    if (textLines.length === 0) continue;
    const text = textLines.join(" ").trim();

    const vTagMatch = text.match(V_TAG_RE);
    if (vTagMatch) {
      cues.push({ start, end, speaker: vTagMatch[1].trim(), text: vTagMatch[2].trim() });
      continue;
    }

    const speakerMatch = text.match(SPEAKER_PREFIX_RE);
    if (speakerMatch) {
      cues.push({ start, end, speaker: speakerMatch[1].trim(), text: speakerMatch[2].trim() });
      continue;
    }

    cues.push({ start, end, speaker: null, text });
  }

  return cues;
}

// ---------------------------------------------------------------------------
// Chunking — overlap so a chapter boundary near a chunk seam still has
// context on both sides, per the pipeline doc's "chunk with overlap for
// reliability".
// ---------------------------------------------------------------------------

function chunkCues(cues, chunkWords, overlapWords) {
  const chunks = [];
  let current = [];
  let wordCount = 0;

  for (const cue of cues) {
    const cueWords = cue.text.split(/\s+/).length;
    current.push(cue);
    wordCount += cueWords;

    if (wordCount >= chunkWords) {
      chunks.push(current);
      // carry the tail of this chunk into the next one for overlap
      let overlapCount = 0;
      let overlapStart = current.length;
      while (overlapStart > 0 && overlapCount < overlapWords) {
        overlapStart--;
        overlapCount += current[overlapStart].text.split(/\s+/).length;
      }
      current = current.slice(overlapStart);
      wordCount = overlapCount;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

// ---------------------------------------------------------------------------
// Auth — sign in to Supabase to get a user token for ai-generate, or reuse
// one already provided.
// ---------------------------------------------------------------------------

async function getAccessToken({ supabaseUrl, publishableKey }) {
  // Deliberately not named SUPABASE_ACCESS_TOKEN: that name is already used
  // by the Supabase CLI/MCP for a management-API token, which is a different
  // kind of credential (not a signed-in user JWT) and would silently get
  // picked up here if the names collided, then get rejected by ai-generate as
  // Unauthorized with a confusing error.
  if (process.env.PIPELINE_USER_ACCESS_TOKEN) return process.env.PIPELINE_USER_ACCESS_TOKEN;

  const email = process.env.COACH_EMAIL;
  const password = process.env.COACH_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "No credentials to call the app's AI layer. Set PIPELINE_USER_ACCESS_TOKEN, or COACH_EMAIL + " +
        "COACH_PASSWORD, in scripts/.env.pipeline (see scripts/.env.pipeline.example).",
    );
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: publishableKey },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sign-in failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("Sign-in succeeded but returned no access token.");
  return data.access_token;
}

// ---------------------------------------------------------------------------
// ai-generate call — reuses whichever provider/credential the coach already
// configured in Settings > AI providers. No provider API key lives here.
// ---------------------------------------------------------------------------

const CHAPTER_SHAPE = `{
  "chapters": [
    {
      "title": "string",
      "start_sec": number,
      "end_sec": number,
      "summary": "string",
      "key_points": ["string"],
      "subsections": [{"title": "string", "start_sec": number, "end_sec": number}]
    }
  ]
}`;

const CHAPTER_SYSTEM_PROMPT = `You detect chapter breaks in call/session transcripts by topic shift, not by fixed time intervals.

Rules:
- Chapters must be contiguous and cover the full transcript you're given: the first chapter starts at the first cue's timestamp, each next chapter starts where the previous ended, the last ends at the last cue's timestamp.
- Break on genuine topic shifts (a new subject, a Q&A section starting, a transition between activities) — not arbitrary time blocks.
- If several speakers alternate rapidly, that's often a Q&A section — consider giving it its own chapter rather than folding it into the preceding topic.
- subsections are optional, finer-grained breakdowns within a chapter; omit the array or leave it empty if a chapter has none.
- start_sec / end_sec are seconds, matching the [start-end] markers in the transcript.`;

function cuesToTranscriptBlock(cues) {
  return cues
    .map((c) => `[${c.start.toFixed(1)}-${c.end.toFixed(1)}]${c.speaker ? ` ${c.speaker}:` : ""} ${c.text}`)
    .join("\n");
}

async function callAiGenerate({ supabaseUrl, publishableKey, accessToken, prompt, system, shape, model }) {
  const res = await fetch(`${supabaseUrl}/functions/v1/ai-generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: publishableKey,
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "text", prompt, system, shape, ...(model ? { model } : {}) }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || `ai-generate returned ${res.status}`);
  }
  return body.data;
}

async function detectChaptersForChunk({ auth, cues, chunkIndex, totalChunks, model }) {
  const transcript = cuesToTranscriptBlock(cues);
  const rangeNote =
    totalChunks > 1
      ? `This is chunk ${chunkIndex + 1} of ${totalChunks} of a longer transcript. Only chapter the range covered by this chunk (${cues[0].start.toFixed(1)}s to ${cues[cues.length - 1].end.toFixed(1)}s); some of the text at the start may already have been chaptered by the previous chunk and is included here only for context — don't duplicate chapters for it, start your first chapter no earlier than necessary.\n\n`
      : "";

  const prompt = `${rangeNote}Transcript (each line is "[start-end] Speaker: text"):\n\n${transcript}`;
  const data = await callAiGenerate({
    ...auth,
    prompt,
    system: CHAPTER_SYSTEM_PROMPT,
    shape: CHAPTER_SHAPE,
    model,
  });

  if (!data || !Array.isArray(data.chapters)) {
    throw new Error("ai-generate's reply had no 'chapters' array.");
  }
  return data.chapters;
}

// ---------------------------------------------------------------------------
// Second pass: deterministic validation — no gaps, no overlaps, no chapter
// under MIN_CHAPTER_SECONDS (merge those into a neighbour).
// ---------------------------------------------------------------------------

function mergeChapters(a, b) {
  return {
    title: a.title,
    start_sec: a.start_sec,
    end_sec: b.end_sec,
    summary: [a.summary, b.summary].filter(Boolean).join(" "),
    key_points: [...(a.key_points ?? []), ...(b.key_points ?? [])],
    subsections: [...(a.subsections ?? []), ...(b.subsections ?? [])],
  };
}

function validateAndFix(chapters, totalDuration) {
  const sorted = [...chapters].sort((x, y) => x.start_sec - y.start_sec);

  // Fix overlaps and gaps: each chapter starts exactly where the previous one
  // ended. Overlap is resolved in favour of the earlier chapter; a gap is
  // folded into the chapter before it.
  for (let i = 1; i < sorted.length; i++) {
    sorted[i].start_sec = sorted[i - 1].end_sec;
  }
  if (sorted.length > 0) {
    sorted[0].start_sec = 0;
    sorted[sorted.length - 1].end_sec = totalDuration;
  }

  // Merge anything under MIN_CHAPTER_SECONDS into its neighbour (prefer the
  // previous chapter so titles read as "topic, cont." rather than orphaning
  // a short one at the very end).
  const merged = [];
  for (const chapter of sorted) {
    const duration = chapter.end_sec - chapter.start_sec;
    if (duration < MIN_CHAPTER_SECONDS && merged.length > 0) {
      merged[merged.length - 1] = mergeChapters(merged[merged.length - 1], chapter);
    } else {
      merged.push(chapter);
    }
  }

  // A short first chapter won't have been merged backward above; fold it
  // into chapter two if it's still short after the loop.
  if (merged.length > 1 && merged[0].end_sec - merged[0].start_sec < MIN_CHAPTER_SECONDS) {
    merged[1] = mergeChapters(merged[0], merged[1]);
    merged.shift();
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const vttPath = args._[0];
  if (!vttPath) {
    console.error("Usage: node scripts/vtt-chapters.mjs <transcript.vtt> [--out chapters.json] [--model claude-sonnet-5]");
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    console.error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY (falls back to the app's .env — is it present?).");
    process.exit(1);
  }

  const accessToken = await getAccessToken({ supabaseUrl, publishableKey });
  const auth = { supabaseUrl, publishableKey, accessToken };

  const chunkWords = args.chunkWords || DEFAULT_CHUNK_WORDS;

  const raw = readFileSync(vttPath, "utf-8");
  const cues = parseVtt(raw);
  if (cues.length === 0) {
    console.error("No cues parsed from that .vtt file — is it a Zoom transcript?");
    process.exit(1);
  }

  const totalWords = cues.reduce((sum, c) => sum + c.text.split(/\s+/).length, 0);
  const totalDuration = cues[cues.length - 1].end;
  console.error(
    `Parsed ${cues.length} cues, ${totalWords} words, ${(totalDuration / 60).toFixed(1)} min from ${vttPath}`,
  );

  const chunks = chunkCues(cues, chunkWords, DEFAULT_OVERLAP_WORDS);
  console.error(`Chunked into ${chunks.length} chunk(s) of ~${chunkWords} words for the AI pass.`);

  const allChapters = [];
  for (let i = 0; i < chunks.length; i++) {
    console.error(`Chunk ${i + 1}/${chunks.length}: detecting chapters via ai-generate...`);
    const chapters = await detectChaptersForChunk({
      auth,
      cues: chunks[i],
      chunkIndex: i,
      totalChunks: chunks.length,
      model: args.model,
    });
    console.error(`  -> ${chapters.length} chapter(s)`);
    allChapters.push(...chapters);
  }

  const validated = validateAndFix(allChapters, totalDuration);
  console.error(`After validation: ${validated.length} chapter(s), 0 gaps, 0 overlaps, none under ${MIN_CHAPTER_SECONDS}s.`);

  const output = { source: vttPath, duration_sec: totalDuration, chapters: validated };
  const outputJson = JSON.stringify(output, null, 2);

  if (args.out) {
    writeFileSync(args.out, outputJson);
    console.error(`Wrote ${args.out}`);
  }
  console.log(outputJson);
}

main().catch((err) => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
