// Calls whichever AI provider the coach configured in Settings.
//
// Everything a coach can connect lands in one of three request shapes —
// OpenAI-compatible, Anthropic or Gemini — so a new provider usually needs
// nothing here at all: it just stores a base URL and an api_style. Route
// overrides in the credential's config cover self-hosted servers that put
// their endpoints somewhere unusual.
//
// Keys are read with the service role, which bypasses the column privileges
// that keep them out of the browser.

import { adminClient } from "./edge.ts";

export type ApiStyle = "openai" | "anthropic" | "gemini";
export type Capability = "text" | "image" | "video";

export interface CredentialConfig {
  /** Where the endpoint lists its models. Used only by the connection test. */
  models_path?: string;
  chat_path?: string;
  image_path?: string;
  video_path?: string;
  video_status_path?: string;
  auth_header?: string;
  auth_scheme?: string;
}

export interface Credential {
  id: string;
  provider: string;
  label: string;
  api_key: string;
  base_url: string | null;
  api_style: ApiStyle;
  config: CredentialConfig | null;
  is_enabled: boolean;
}

/** A credential plus the model and sampling settings to call it with. */
export interface ResolvedModel {
  credential: Credential;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Where each named provider lives.
 *
 * The settings screen only asks for a base URL when we cannot know it, so a
 * named provider is stored with base_url null and resolved here. This is the
 * address that is actually called; src/lib/aiProviders.ts carries the same
 * values for display only.
 */
const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  deepseek: "https://api.deepseek.com/v1",
  xiaomi: "https://api.xiaomimimo.com/v1",
};

/**
 * What each provider runs when the coach has not chosen a model.
 *
 * Only used to make a single connected provider work on its own; once the
 * coach picks something in Settings, that wins.
 */
const DEFAULT_MODELS: Record<string, Partial<Record<Capability, string>>> = {
  openai: { text: "gpt-4o-mini", image: "gpt-image-1", video: "sora-2" },
  anthropic: { text: "claude-sonnet-5" },
  gemini: {
    text: "gemini-2.5-flash",
    image: "imagen-4.0-generate-001",
    video: "veo-3.0-generate-001",
  },
  deepseek: { text: "deepseek-chat" },
  xiaomi: { text: "mimo-v2.5" },
};

/** Raised with a message that is safe to show the coach. */
export class AiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const CAPABILITY_COLUMNS: Record<Capability, { credential: string; model: string }> = {
  text: { credential: "text_credential_id", model: "text_model" },
  image: { credential: "image_credential_id", model: "image_model" },
  video: { credential: "video_credential_id", model: "video_model" },
};

const CAPABILITY_NAMES: Record<Capability, string> = {
  text: "text",
  image: "image",
  video: "video",
};

/**
 * Which provider and model should serve this capability for this coach.
 *
 * Falls back to the pre-multi-provider ai_settings.openai_api_key for text so
 * a coach who has not touched the new settings screen keeps working.
 */
export async function resolveModel(
  coachId: string,
  capability: Capability,
  overrides: { model?: string; temperature?: number; maxTokens?: number } = {},
): Promise<ResolvedModel> {
  const admin = adminClient();
  const columns = CAPABILITY_COLUMNS[capability];

  const { data: settings } = await admin
    .from("ai_settings")
    .select("*")
    .eq("coach_id", coachId)
    .maybeSingle();

  const temperature = overrides.temperature ?? Number(settings?.temperature ?? 0.7);
  const maxTokens = overrides.maxTokens ?? Number(settings?.max_tokens ?? 3000);

  const credentialId = settings?.[columns.credential] as string | null | undefined;
  const model = overrides.model || (settings?.[columns.model] as string | null) || "";

  if (credentialId) {
    const { data: credential } = await admin
      .from("ai_provider_credentials")
      .select("*")
      .eq("id", credentialId)
      .eq("coach_id", coachId)
      .maybeSingle();

    if (credential?.is_enabled && credential.api_key) {
      const chosen = model || DEFAULT_MODELS[credential.provider]?.[capability] || "";
      if (!chosen) {
        throw new AiError(
          `No ${CAPABILITY_NAMES[capability]} model chosen. Pick one in Settings > AI providers.`,
        );
      }
      return { credential: credential as Credential, model: chosen, temperature, maxTokens };
    }
  }

  // Legacy single-key setup: only ever served text.
  if (capability === "text" && settings?.openai_api_key) {
    return {
      credential: {
        id: "legacy",
        provider: "openai",
        label: "",
        api_key: settings.openai_api_key,
        base_url: DEFAULT_BASE_URLS.openai,
        api_style: "openai",
        config: null,
        is_enabled: true,
      },
      model: model || settings.model || "gpt-4o-mini",
      temperature,
      maxTokens,
    };
  }

  // Nothing is chosen for this capability. Connecting a provider and never
  // opening the defaults screen is the normal way to arrive here, and telling
  // that coach "no provider connected" — when they just tested one
  // successfully — is both wrong and unactionable. So fall back to what they
  // have, and only complain when there is genuinely nothing to fall back to.
  const { data: connected } = await admin
    .from("ai_provider_credentials")
    .select("*")
    .eq("coach_id", coachId)
    .eq("is_enabled", true);

  const usable = ((connected || []) as Credential[]).filter(
    (row) => !!row.api_key && !!DEFAULT_MODELS[row.provider]?.[capability],
  );

  if (usable.length === 1) {
    return {
      credential: usable[0],
      model: model || DEFAULT_MODELS[usable[0].provider]![capability]!,
      temperature,
      maxTokens,
    };
  }

  if (usable.length > 1) {
    throw new AiError(
      `You have several providers connected. Choose which one generates ${CAPABILITY_NAMES[capability]} in Settings > AI providers.`,
    );
  }

  // A key is connected, but nothing that can serve this capability — a
  // text-only provider asked for an image, most often.
  const anyConnected = ((connected || []) as Credential[]).some((row) => !!row.api_key);
  if (anyConnected) {
    throw new AiError(
      `None of your connected providers can generate ${CAPABILITY_NAMES[capability]}. Connect one that can, or set it up under Settings > AI providers.`,
    );
  }

  throw new AiError(
    `No ${CAPABILITY_NAMES[capability]} provider connected. Add one in Settings > AI providers.`,
  );
}

function baseUrlFor(credential: Credential): string {
  const base =
    credential.base_url?.trim() ||
    DEFAULT_BASE_URLS[credential.provider] ||
    DEFAULT_BASE_URLS[credential.api_style] ||
    "";
  if (!base) {
    throw new AiError(
      "This provider has no base URL. Add one in Settings > AI providers.",
    );
  }
  return base.replace(/\/+$/, "");
}

function url(credential: Credential, path: string): string {
  return `${baseUrlFor(credential)}/${path.replace(/^\/+/, "")}`;
}

export function authHeaders(credential: Credential): Record<string, string> {
  const config = credential.config || {};
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (config.auth_header?.trim()) {
    const scheme = config.auth_scheme?.trim();
    headers[config.auth_header.trim()] = scheme
      ? `${scheme} ${credential.api_key}`
      : credential.api_key;
    return headers;
  }

  switch (credential.api_style) {
    case "anthropic":
      headers["x-api-key"] = credential.api_key;
      headers["anthropic-version"] = "2023-06-01";
      break;
    case "gemini":
      headers["x-goog-api-key"] = credential.api_key;
      break;
    default:
      headers.Authorization = `Bearer ${credential.api_key}`;
  }
  return headers;
}

/**
 * Turns a provider's error body into something a coach can act on. The raw
 * body is logged, never returned, because it can echo the request.
 */
async function readError(res: Response, credential: Credential): Promise<never> {
  const body = await res.text();
  console.error(`${credential.provider} ${res.status}:`, body.slice(0, 800));

  if (res.status === 401 || res.status === 403) {
    throw new AiError(
      "The API key for this provider was rejected. Check it in Settings > AI providers.",
    );
  }
  if (res.status === 404) {
    throw new AiError(
      "The provider does not know that model or route. Check the model name and base URL in Settings > AI providers.",
    );
  }
  if (res.status === 429) {
    const outOfCredit = /quota|billing|credit|insufficient/i.test(body);
    throw new AiError(
      outOfCredit
        ? "This provider account is out of credit. Top it up and try again."
        : "The provider is rate limiting us. Wait a moment and try again.",
    );
  }
  throw new AiError(`The provider returned an error (${res.status}). Please try again.`);
}

async function post(credential: Credential, path: string, body: unknown): Promise<any> {
  const res = await fetch(url(credential, path), {
    method: "POST",
    headers: authHeaders(credential),
    body: JSON.stringify(body),
  });
  if (!res.ok) await readError(res, credential);
  return await res.json();
}

// ------------------------------------------------------------------ text ---

export interface TextRequest {
  prompt: string;
  system?: string;
  /** Ask for JSON back, and enable the provider's JSON mode where it has one. */
  json?: boolean;
  /**
   * Text the model already produced, to be continued rather than restarted.
   *
   * Every provider caps a single reply, and a long document — a whole HTML
   * page, most of all — routinely runs past that cap. The reply comes back
   * cut mid-tag, which is worse than useless. Handing the partial text back
   * lets the caller stitch a complete answer out of several replies.
   */
  continueFrom?: string;
}

export interface TextResult {
  text: string;
  tokensUsed: number;
  /** True when the provider stopped because it ran out of room, not because
   * it was finished. The caller decides whether to ask for the rest. */
  truncated: boolean;
}

/** Told to the model when resuming, so it does not restart or apologise. */
const CONTINUE_INSTRUCTION =
  "Continue from exactly where you stopped. Do not repeat anything you have " +
  "already written, do not start over, and do not add any commentary — " +
  "resume mid-line if that is where you stopped, and finish the response.";

/** Providers whose OpenAI compatibility extends to response_format. */
const SUPPORTS_JSON_MODE = new Set(["openai", "deepseek"]);

export async function generateText(
  resolved: ResolvedModel,
  request: TextRequest,
): Promise<TextResult> {
  const { credential, model, temperature, maxTokens } = resolved;
  const config = credential.config || {};

  if (credential.api_style === "anthropic") {
    const data = await post(credential, config.chat_path || "/messages", {
      model,
      max_tokens: maxTokens,
      temperature,
      ...(request.system ? { system: request.system } : {}),
      messages: [
        { role: "user", content: request.prompt },
        // A trailing assistant turn is a prefill: the reply picks up from it.
        // Anthropic rejects a prefill that ends in whitespace. Trimming it
        // only moves where the model resumes; the caller still holds the
        // untrimmed text it will be appended to.
        ...(request.continueFrom
          ? [{ role: "assistant", content: request.continueFrom.trimEnd() }]
          : []),
      ],
    });
    const text = (data.content || [])
      .filter((part: any) => part?.type === "text")
      .map((part: any) => part.text)
      .join("");
    const usage = data.usage || {};
    return {
      text,
      tokensUsed: (usage.input_tokens || 0) + (usage.output_tokens || 0),
      truncated: data.stop_reason === "max_tokens",
    };
  }

  if (credential.api_style === "gemini") {
    const path = config.chat_path || `/models/${model}:generateContent`;
    const data = await post(credential, path, {
      ...(request.system
        ? { systemInstruction: { parts: [{ text: request.system }] } }
        : {}),
      contents: [
        { role: "user", parts: [{ text: request.prompt }] },
        ...(request.continueFrom
          ? [
              { role: "model", parts: [{ text: request.continueFrom }] },
              { role: "user", parts: [{ text: CONTINUE_INSTRUCTION }] },
            ]
          : []),
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(request.json ? { responseMimeType: "application/json" } : {}),
      },
    });
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((part: any) => part?.text || "")
      .join("");
    return {
      text,
      tokensUsed: data.usageMetadata?.totalTokenCount || 0,
      truncated: data.candidates?.[0]?.finishReason === "MAX_TOKENS",
    };
  }

  const messages = [
    ...(request.system ? [{ role: "system", content: request.system }] : []),
    { role: "user", content: request.prompt },
    ...(request.continueFrom
      ? [
          { role: "assistant", content: request.continueFrom },
          { role: "user", content: CONTINUE_INSTRUCTION },
        ]
      : []),
  ];
  const data = await post(credential, config.chat_path || "/chat/completions", {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(request.json && SUPPORTS_JSON_MODE.has(credential.provider)
      ? { response_format: { type: "json_object" } }
      : {}),
  });
  return {
    text: data.choices?.[0]?.message?.content || "",
    tokensUsed: data.usage?.total_tokens || 0,
    truncated: data.choices?.[0]?.finish_reason === "length",
  };
}

// ---------------------------------------------------------------- stream ---

/**
 * Reads an SSE body line by line.
 *
 * All three API shapes stream as server-sent events; only the JSON inside each
 * "data:" line differs, so the transport is parsed once here.
 */
async function* sseLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Events are separated by a blank line, but a lone \n between data
      // lines is common enough that splitting on newlines is safer.
      let index: number;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (line.startsWith("data:")) yield line.slice(5).trim();
      }
    }
    const rest = buffer.trim();
    if (rest.startsWith("data:")) yield rest.slice(5).trim();
  } finally {
    reader.releaseLock();
  }
}

/** What one streamed chunk contributed. */
interface Chunk {
  text: string;
  truncated?: boolean;
}

/** Pulls the text out of one streamed event, whatever shape it arrived in. */
function chunkFrom(style: ApiStyle, payload: any): Chunk {
  if (style === "anthropic") {
    if (payload?.type === "content_block_delta") {
      return { text: payload.delta?.text || "" };
    }
    if (payload?.type === "message_delta") {
      return { text: "", truncated: payload.delta?.stop_reason === "max_tokens" };
    }
    return { text: "" };
  }

  if (style === "gemini") {
    const parts = payload?.candidates?.[0]?.content?.parts || [];
    return {
      text: parts.map((part: any) => part?.text || "").join(""),
      truncated: payload?.candidates?.[0]?.finishReason === "MAX_TOKENS",
    };
  }

  const choice = payload?.choices?.[0];
  return {
    text: choice?.delta?.content || "",
    truncated: choice?.finish_reason === "length",
  };
}

/**
 * The same request as generateText, delivered a piece at a time.
 *
 * A whole page takes tens of seconds to write. Without this the coach watches
 * a spinner over an empty panel and cannot tell a slow model from a hung one —
 * so the text is handed over as it arrives and the wait becomes visible work.
 *
 * Falls back to the non-streaming call when a provider will not stream, so no
 * endpoint loses the feature entirely.
 */
export async function streamText(
  resolved: ResolvedModel,
  request: TextRequest,
  onDelta: (text: string) => void,
): Promise<TextResult> {
  const { credential, model, temperature, maxTokens } = resolved;
  const config = credential.config || {};

  let path: string;
  let payload: Record<string, unknown>;

  if (credential.api_style === "anthropic") {
    path = config.chat_path || "/messages";
    payload = {
      model,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      ...(request.system ? { system: request.system } : {}),
      messages: [
        { role: "user", content: request.prompt },
        ...(request.continueFrom
          ? [{ role: "assistant", content: request.continueFrom.trimEnd() }]
          : []),
      ],
    };
  } else if (credential.api_style === "gemini") {
    path = config.chat_path || `/models/${model}:streamGenerateContent?alt=sse`;
    payload = {
      ...(request.system
        ? { systemInstruction: { parts: [{ text: request.system }] } }
        : {}),
      contents: [
        { role: "user", parts: [{ text: request.prompt }] },
        ...(request.continueFrom
          ? [
              { role: "model", parts: [{ text: request.continueFrom }] },
              { role: "user", parts: [{ text: CONTINUE_INSTRUCTION }] },
            ]
          : []),
      ],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
  } else {
    path = config.chat_path || "/chat/completions";
    payload = {
      model,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        ...(request.system ? [{ role: "system", content: request.system }] : []),
        { role: "user", content: request.prompt },
        ...(request.continueFrom
          ? [
              { role: "assistant", content: request.continueFrom },
              { role: "user", content: CONTINUE_INSTRUCTION },
            ]
          : []),
      ],
    };
  }

  let res: Response;
  try {
    res = await fetch(url(credential, path), {
      method: "POST",
      headers: authHeaders(credential),
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("stream request failed, falling back:", e);
    return await generateText(resolved, request);
  }

  if (!res.ok || !res.body) {
    // A provider that rejects streaming still answers normally. Read the error
    // first so a genuine failure (a bad key, a bad model) surfaces as itself
    // rather than as a mysterious second attempt.
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      await readError(res, credential);
    }
    console.error(`${credential.provider} declined to stream (${res.status}); falling back`);
    return await generateText(resolved, request);
  }

  let text = "";
  let truncated = false;

  for await (const data of sseLines(res.body)) {
    if (!data || data === "[DONE]") continue;

    let payloadJson: unknown;
    try {
      payloadJson = JSON.parse(data);
    } catch {
      continue; // Keep-alive comments and partial frames are not fatal.
    }

    const chunk = chunkFrom(credential.api_style, payloadJson);
    if (chunk.truncated) truncated = true;
    if (chunk.text) {
      text += chunk.text;
      onDelta(chunk.text);
    }
  }

  // Some endpoints advertise streaming and then send one whole message. If
  // nothing arrived, the request has not actually been answered.
  if (!text) return await generateText(resolved, request);

  return { text, tokensUsed: 0, truncated };
}

/**
 * A long answer, streamed, continued across replies when it runs out of room.
 *
 * The counterpart to generateLongText: same completion rule, same round cap,
 * but every character reaches the caller as it is written.
 */
export async function streamLongText(
  resolved: ResolvedModel,
  request: TextRequest & {
    isComplete?: (text: string) => boolean;
    maxRounds?: number;
    /** Told when a reply ran out of room and another is starting. */
    onRound?: (round: number) => void;
  },
  onDelta: (text: string) => void,
): Promise<TextResult & { rounds: number }> {
  const maxRounds = request.maxRounds ?? 3;
  let text = request.continueFrom ?? "";
  let truncated = false;
  let rounds = 0;

  for (let round = 0; round < maxRounds; round++) {
    if (round > 0) request.onRound?.(round + 1);

    const before = text;
    const result = await streamText(
      resolved,
      { ...request, ...(text ? { continueFrom: text } : {}) },
      onDelta,
    );

    rounds++;
    text += result.text;
    truncated = result.truncated;

    if (request.isComplete?.(text)) return { text, tokensUsed: 0, truncated: false, rounds };
    if (!truncated) break;
    if (text === before) break;
  }

  return { text, tokensUsed: 0, truncated, rounds };
}

/**
 * Text that is complete, however many replies it takes.
 *
 * Asks for the rest whenever the provider stopped for room, up to a few
 * rounds, and stops early once `isComplete` is satisfied — so a document that
 * finished inside the first reply costs exactly one call.
 */
export async function generateLongText(
  resolved: ResolvedModel,
  request: TextRequest & { isComplete?: (text: string) => boolean; maxRounds?: number },
): Promise<TextResult & { rounds: number }> {
  const maxRounds = request.maxRounds ?? 3;
  let text = request.continueFrom ?? "";
  let tokensUsed = 0;
  let truncated = false;
  let rounds = 0;

  for (let round = 0; round < maxRounds; round++) {
    const result = await generateText(resolved, {
      ...request,
      ...(text ? { continueFrom: text } : {}),
    });

    rounds++;
    text += result.text;
    tokensUsed += result.tokensUsed;
    truncated = result.truncated;

    if (request.isComplete?.(text)) return { text, tokensUsed, truncated: false, rounds };
    if (!truncated) break;
    // A reply that added nothing will not add anything next time either.
    if (!result.text.trim()) break;
  }

  return { text, tokensUsed, truncated, rounds };
}

/**
 * Ask for a specific JSON shape back.
 *
 * The app used to force its shapes with OpenAI tool calling, which no other
 * provider accepts. Describing the shape in the prompt works everywhere, so
 * switching provider does not change what a feature returns.
 */
export async function generateJson<T>(
  resolved: ResolvedModel,
  request: { system?: string; prompt: string; shape: string },
): Promise<T> {
  const system = [
    request.system,
    "Return ONLY a JSON object in exactly this shape. No markdown fences, no commentary:",
    request.shape,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await generateText(resolved, { system, prompt: request.prompt, json: true });
  return parseJsonReply<T>(result.text);
}

/**
 * Parses a model's JSON reply. Models that have no JSON mode — and some that
 * do — wrap the object in a markdown fence or add a sentence around it, so the
 * fence is stripped and the outermost braces are used as a fallback.
 */
export function parseJsonReply<T>(text: string): T {
  const unfenced = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    const first = unfenced.indexOf("{");
    const last = unfenced.lastIndexOf("}");
    if (first !== -1 && last > first) {
      return JSON.parse(unfenced.slice(first, last + 1)) as T;
    }
    throw new AiError("The model did not return usable JSON. Try again.");
  }
}

// ----------------------------------------------------------------- image ---

export interface ImageRequest {
  prompt: string;
  /** "1024x1024" and friends. Ignored by providers that size differently. */
  size?: string;
  count?: number;
}

/** Generated images come back as a hosted URL or inline base64, never both. */
export interface GeneratedImage {
  url?: string;
  b64?: string;
  mimeType?: string;
}

export async function generateImage(
  resolved: ResolvedModel,
  request: ImageRequest,
): Promise<GeneratedImage[]> {
  const { credential, model } = resolved;
  const config = credential.config || {};
  const count = Math.min(Math.max(request.count || 1, 1), 4);

  if (credential.api_style === "anthropic") {
    throw new AiError(
      "Anthropic does not generate images. Pick another provider for images in Settings > AI providers.",
    );
  }

  if (credential.api_style === "gemini") {
    const path = config.image_path || `/models/${model}:predict`;
    const data = await post(credential, path, {
      instances: [{ prompt: request.prompt }],
      parameters: { sampleCount: count },
    });
    return (data.predictions || []).map((prediction: any) => ({
      b64: prediction.bytesBase64Encoded,
      mimeType: prediction.mimeType || "image/png",
    }));
  }

  const data = await post(credential, config.image_path || "/images/generations", {
    model,
    prompt: request.prompt,
    n: count,
    ...(request.size ? { size: request.size } : {}),
  });
  return (data.data || []).map((image: any) => ({
    url: image.url,
    b64: image.b64_json,
    mimeType: "image/png",
  }));
}

// ----------------------------------------------------------------- video ---

export interface VideoRequest {
  prompt: string;
  seconds?: number;
  size?: string;
}

/**
 * Video rendering is queued everywhere, so a request returns a job to poll
 * rather than a finished clip.
 */
export interface VideoJob {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  url?: string;
  error?: string;
}

const OPENAI_VIDEO_STATUS: Record<string, VideoJob["status"]> = {
  queued: "queued",
  in_progress: "running",
  processing: "running",
  completed: "succeeded",
  succeeded: "succeeded",
  failed: "failed",
  cancelled: "failed",
};

export async function startVideo(
  resolved: ResolvedModel,
  request: VideoRequest,
): Promise<VideoJob> {
  const { credential, model } = resolved;
  const config = credential.config || {};

  if (credential.api_style === "anthropic") {
    throw new AiError(
      "Anthropic does not generate video. Pick another provider for video in Settings > AI providers.",
    );
  }

  if (credential.api_style === "gemini") {
    const path = config.video_path || `/models/${model}:predictLongRunning`;
    const data = await post(credential, path, {
      instances: [{ prompt: request.prompt }],
      parameters: {
        ...(request.seconds ? { durationSeconds: request.seconds } : {}),
        sampleCount: 1,
      },
    });
    if (!data.name) throw new AiError("The provider did not return a video job id.");
    return { id: data.name, status: "queued" };
  }

  const data = await post(credential, config.video_path || "/videos", {
    model,
    prompt: request.prompt,
    ...(request.seconds ? { seconds: String(request.seconds) } : {}),
    ...(request.size ? { size: request.size } : {}),
  });
  if (!data.id) throw new AiError("The provider did not return a video job id.");
  return { id: data.id, status: OPENAI_VIDEO_STATUS[data.status] || "queued" };
}

export async function videoStatus(
  resolved: ResolvedModel,
  jobId: string,
): Promise<VideoJob> {
  const { credential } = resolved;
  const config = credential.config || {};

  // Gemini hands back a full operation path; everything else takes an id.
  const path = config.video_status_path
    ? config.video_status_path.replace("{id}", encodeURIComponent(jobId))
    : credential.api_style === "gemini"
      ? `/${jobId}`
      : `/videos/${encodeURIComponent(jobId)}`;

  const res = await fetch(url(credential, path), { headers: authHeaders(credential) });
  if (!res.ok) await readError(res, credential);
  const data = await res.json();

  if (credential.api_style === "gemini") {
    if (!data.done) return { id: jobId, status: "running" };
    if (data.error) {
      return { id: jobId, status: "failed", error: data.error.message || "Rendering failed" };
    }
    const sample =
      data.response?.generateVideoResponse?.generatedSamples?.[0] ||
      data.response?.generatedSamples?.[0];
    return { id: jobId, status: "succeeded", url: sample?.video?.uri };
  }

  const status = OPENAI_VIDEO_STATUS[data.status] || "running";
  return {
    id: jobId,
    status,
    // Sora serves the finished file from a sub-route rather than a field.
    url:
      status === "succeeded"
        ? data.url || url(credential, `/videos/${encodeURIComponent(jobId)}/content`)
        : undefined,
    error: data.error?.message,
  };
}

// ------------------------------------------------------------------ test ---

export interface TestResult {
  ok: boolean;
  message: string;
  /** Model ids the provider listed, when the response could be read. */
  models?: string[];
  /** Whether the model asked about was among them; absent when unknown. */
  modelFound?: boolean;
  /** True when the check had to run a real generation to prove anything. */
  generated?: boolean;
  /** How long the round trip took, so a slow endpoint is visible. */
  latencyMs: number;
}

/** Where this credential lists its models. */
function modelsPath(credential: Credential): string {
  return credential.config?.models_path?.trim() || "/models";
}

/**
 * Model ids out of a listing response.
 *
 * OpenAI, Anthropic and every OpenAI-compatible reseller answer with
 * { data: [{ id }] }; Gemini answers with { models: [{ name: "models/x" }] }.
 * An unrecognised shape yields nothing, which the caller reads as "cannot
 * tell" rather than "not there".
 */
export function parseModelIds(style: ApiStyle, data: unknown): string[] {
  const body = data as Record<string, unknown> | null;
  const list = (style === "gemini" ? body?.models : (body?.data ?? body?.models)) ?? data;
  if (!Array.isArray(list)) return [];

  return list
    .map((entry) => {
      if (typeof entry === "string") return entry;
      const item = entry as Record<string, unknown>;
      const id = item?.id ?? item?.name ?? item?.model;
      return typeof id === "string" ? id.replace(/^models\//, "") : "";
    })
    .filter(Boolean);
}

/**
 * Proves a credential works, and — when a model is named — that the model is
 * one this key can actually call.
 *
 * Listing models is free everywhere, so that is tried first. Only an endpoint
 * with no listing route falls back to a real generation, capped at a single
 * token: a coach running their own server has no other way to find out, and
 * one token is not a cost worth protecting them from. Image and video models
 * are never called — a test that quietly spends real money on a render is not
 * a test anyone would press twice.
 */
export async function testCredential(
  credential: Credential,
  options: { model?: string } = {},
): Promise<TestResult> {
  const started = Date.now();
  const elapsed = () => Date.now() - started;
  const model = options.model?.trim() || "";

  let listing: Response;
  try {
    listing = await fetch(url(credential, modelsPath(credential)), {
      headers: authHeaders(credential),
    });
  } catch (e) {
    console.error("credential test could not connect:", e);
    return {
      ok: false,
      message: "Could not reach that address. Check the base URL and try again.",
      latencyMs: elapsed(),
    };
  }

  if (listing.ok) {
    let models: string[] = [];
    try {
      models = parseModelIds(credential.api_style, await listing.json());
    } catch {
      // A listing we cannot parse still proved the key and the address.
    }

    if (!model) {
      return {
        ok: true,
        message: models.length
          ? `Connected. ${models.length} models available to this key.`
          : "Connected. The key was accepted.",
        models,
        latencyMs: elapsed(),
      };
    }

    // An empty or unreadable list means we cannot tell, which is not a failure.
    const modelFound = models.length ? models.includes(model) : undefined;
    if (modelFound === false) {
      return {
        ok: false,
        message: `Connected, but this key cannot call "${model}". Pick one of the ${models.length} models it does have.`,
        models,
        modelFound,
        latencyMs: elapsed(),
      };
    }
    return {
      ok: true,
      message: modelFound
        ? `Connected. "${model}" is available to this key.`
        : "Connected. The key was accepted.",
      models,
      modelFound,
      latencyMs: elapsed(),
    };
  }

  const body = await listing.text();
  console.error(`${credential.provider} test ${listing.status}:`, body.slice(0, 400));

  if (listing.status === 401 || listing.status === 403) {
    return { ok: false, message: "The API key was rejected.", latencyMs: elapsed() };
  }

  if (listing.status === 404) {
    // No listing route. A one-token generation is the only remaining proof.
    if (!model) {
      return {
        ok: false,
        message:
          "Reached the host, but it does not list its models. Choose a model above and test again — that is the only way to check this endpoint.",
        latencyMs: elapsed(),
      };
    }
    try {
      await generateText(
        { credential, model, temperature: 0, maxTokens: 1 },
        { prompt: "Reply with the single word: ok" },
      );
      return {
        ok: true,
        message: `Connected. "${model}" answered.`,
        modelFound: true,
        generated: true,
        latencyMs: elapsed(),
      };
    } catch (e) {
      return {
        ok: false,
        message:
          e instanceof AiError
            ? e.message
            : "The endpoint has no model list and did not answer a test message.",
        generated: true,
        latencyMs: elapsed(),
      };
    }
  }

  if (listing.status === 429) {
    return {
      ok: false,
      message: /quota|billing|credit|insufficient/i.test(body)
        ? "The key works, but this account is out of credit."
        : "The key works, but the provider is rate limiting us. Try again shortly.",
      latencyMs: elapsed(),
    };
  }

  return {
    ok: false,
    message: `The provider returned ${listing.status}.`,
    latencyMs: elapsed(),
  };
}
