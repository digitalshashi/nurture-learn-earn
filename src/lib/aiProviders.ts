/**
 * Single source of truth for the AI providers a coach can connect.
 *
 * Adding a provider means adding an entry here plus, if it speaks a shape we
 * do not already handle, a branch in supabase/functions/_shared/aiClient.ts —
 * no schema change, because credentials live in the generic
 * api_key / base_url / config columns on ai_provider_credentials.
 *
 * The model lists are suggestions, not a whitelist: every capability accepts a
 * typed-in model name so a coach can use something newer than this file.
 */

export type AiProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "deepseek"
  | "xiaomi"
  | "custom";

/** Which request/response shape an endpoint speaks. */
export type ApiStyle = "openai" | "anthropic" | "gemini";

/** What a model is asked to produce. */
export type Capability = "text" | "image" | "video";

export const CAPABILITIES: Capability[] = ["text", "image", "video"];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  text: "Text & content",
  image: "Images",
  video: "Video",
};

export const CAPABILITY_BLURBS: Record<Capability, string> = {
  text: "Course outlines, landing page copy, emails, lead scoring and the sales assistant.",
  image: "Thumbnails, banners and post artwork generated from a prompt.",
  video: "Short generated clips. Rendering is queued, so results arrive after a wait.",
};

export interface ModelOption {
  id: string;
  label: string;
  note?: string;
}

export interface AiProviderSpec {
  id: AiProviderId;
  name: string;
  blurb: string;
  /** Where the coach goes to mint an API key. */
  keysUrl?: string;
  /**
   * Brand colour for the provider mark, as any CSS colour. Tinted for the
   * badge behind the logo, so it has to stay legible on both themes — a
   * near-black or near-white brand colour needs its lighter variant here.
   * Omitted for the custom provider, which is not a brand.
   */
  accent?: string;
  apiStyle: ApiStyle;
  /**
   * Where this provider lives. Recorded here for reference only: a named
   * provider is saved with a null base_url and the edge function supplies the
   * address, so the two copies cannot drift apart at call time.
   */
  defaultBaseUrl: string;
  /**
   * True only for endpoints we cannot know — a self-hosted model or a custom
   * provider. Those, and only those, ask the coach for a base URL; a named
   * provider needs nothing but a key.
   */
  requiresBaseUrl: boolean;
  /** A custom provider says which shape its server speaks. */
  apiStyleEditable: boolean;
  /** A custom provider can override the request paths. */
  routesEditable: boolean;
  keyPlaceholder: string;
  models: Record<Capability, ModelOption[]>;
}

export const AI_PROVIDERS: Record<AiProviderId, AiProviderSpec> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    accent: "#10A37F",
    blurb: "GPT models for text, GPT Image for artwork and Sora for video.",
    keysUrl: "https://platform.openai.com/api-keys",
    apiStyle: "openai",
    defaultBaseUrl: "https://api.openai.com/v1",
    requiresBaseUrl: false,
    apiStyleEditable: false,
    routesEditable: false,
    keyPlaceholder: "sk-...",
    models: {
      text: [
        { id: "gpt-4o-mini", label: "GPT-4o mini", note: "Fast and cheap" },
        { id: "gpt-4o", label: "GPT-4o" },
        { id: "gpt-4.1", label: "GPT-4.1", note: "Best quality" },
        { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
        { id: "o4-mini", label: "o4-mini", note: "Reasoning" },
      ],
      image: [
        { id: "gpt-image-1", label: "GPT Image 1" },
        { id: "dall-e-3", label: "DALL-E 3" },
      ],
      video: [{ id: "sora-2", label: "Sora 2" }],
    },
  },

  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    accent: "#D97757",
    blurb: "Claude models. Strong at long-form writing and following a brief.",
    keysUrl: "https://console.anthropic.com/settings/keys",
    apiStyle: "anthropic",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    requiresBaseUrl: false,
    apiStyleEditable: false,
    routesEditable: false,
    keyPlaceholder: "sk-ant-...",
    models: {
      text: [
        { id: "claude-sonnet-5", label: "Claude Sonnet 5", note: "Balanced" },
        { id: "claude-opus-5", label: "Claude Opus 5", note: "Best quality" },
        { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", note: "Fastest" },
      ],
      image: [],
      video: [],
    },
  },

  gemini: {
    id: "gemini",
    name: "Google Gemini",
    accent: "#8E75B2",
    blurb: "Gemini for text, Imagen for images and Veo for video.",
    keysUrl: "https://aistudio.google.com/apikey",
    apiStyle: "gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    requiresBaseUrl: false,
    apiStyleEditable: false,
    routesEditable: false,
    keyPlaceholder: "AIza...",
    models: {
      text: [
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Fast and cheap" },
        { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Best quality" },
        { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      ],
      image: [
        { id: "imagen-4.0-generate-001", label: "Imagen 4" },
        { id: "imagen-3.0-generate-002", label: "Imagen 3" },
      ],
      video: [
        { id: "veo-3.0-generate-001", label: "Veo 3" },
        { id: "veo-2.0-generate-001", label: "Veo 2" },
      ],
    },
  },

  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    accent: "#4D6BFE",
    blurb: "Low-cost text models that speak the OpenAI API.",
    keysUrl: "https://platform.deepseek.com/api_keys",
    apiStyle: "openai",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    requiresBaseUrl: false,
    apiStyleEditable: false,
    routesEditable: false,
    keyPlaceholder: "sk-...",
    models: {
      text: [
        { id: "deepseek-chat", label: "DeepSeek Chat" },
        { id: "deepseek-reasoner", label: "DeepSeek Reasoner", note: "Reasoning" },
      ],
      image: [],
      video: [],
    },
  },

  xiaomi: {
    id: "xiaomi",
    name: "Xiaomi MiMo",
    accent: "#FF6900",
    blurb: "MiMo models from Xiaomi's hosted platform.",
    keysUrl: "https://platform.xiaomimimo.com/#/console/api-keys",
    apiStyle: "openai",
    defaultBaseUrl: "https://api.xiaomimimo.com/v1",
    requiresBaseUrl: false,
    apiStyleEditable: false,
    routesEditable: false,
    keyPlaceholder: "Your MiMo API key",
    models: {
      text: [
        { id: "mimo-v2.5-pro", label: "MiMo V2.5 Pro", note: "Best quality" },
        { id: "mimo-v2.5", label: "MiMo V2.5" },
      ],
      image: [],
      video: [],
    },
  },

  custom: {
    id: "custom",
    name: "Custom provider",
    blurb:
      "Any provider not listed above, or your own server. Give it a name, its base URL and a key, then type the model names you want to use.",
    apiStyle: "openai",
    defaultBaseUrl: "",
    requiresBaseUrl: true,
    apiStyleEditable: true,
    routesEditable: true,
    keyPlaceholder: "The provider's API key",
    models: { text: [], image: [], video: [] },
  },
};

export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as AiProviderId[];

export const isAiProvider = (v: unknown): v is AiProviderId =>
  typeof v === "string" && v in AI_PROVIDERS;

export const API_STYLE_LABELS: Record<ApiStyle, string> = {
  openai: "OpenAI-compatible (/chat/completions)",
  anthropic: "Anthropic (/messages)",
  gemini: "Google Gemini (:generateContent)",
};

/** Request paths a custom provider may override, per capability. */
export const ROUTE_FIELDS: {
  key: keyof CredentialConfig;
  label: string;
  capability: Capability;
  placeholder: string;
}[] = [
  { key: "models_path", label: "Model list route", capability: "text", placeholder: "/models" },
  { key: "chat_path", label: "Text route", capability: "text", placeholder: "/chat/completions" },
  { key: "image_path", label: "Image route", capability: "image", placeholder: "/images/generations" },
  { key: "video_path", label: "Video route", capability: "video", placeholder: "/videos" },
  {
    key: "video_status_path",
    label: "Video status route",
    capability: "video",
    placeholder: "/videos/{id}",
  },
];

/** Free-form endpoint settings stored in ai_provider_credentials.config. */
export interface CredentialConfig {
  /** Where the endpoint lists its models. Used by the connection test. */
  models_path?: string;
  chat_path?: string;
  image_path?: string;
  video_path?: string;
  /** Polled while a clip renders. "{id}" is replaced with the job id. */
  video_status_path?: string;
  /** Header the key goes in, when it is not Authorization. */
  auth_header?: string;
  /** Prefix before the key, e.g. "Bearer". Blank sends the raw key. */
  auth_scheme?: string;
}

/** A saved credential, as the browser is allowed to see it (no key). */
export interface CredentialRow {
  id: string;
  coach_id?: string;
  provider: AiProviderId;
  label: string;
  base_url: string | null;
  api_style: ApiStyle;
  config: CredentialConfig | null;
  is_enabled: boolean;
  has_api_key: boolean;
}

/** The coach's single row of "what should run by default". */
export interface AiDefaultsRow {
  temperature: number;
  max_tokens: number;
  text_credential_id: string | null;
  text_model: string | null;
  image_credential_id: string | null;
  image_model: string | null;
  video_credential_id: string | null;
  video_model: string | null;
}

/** Column names on ai_settings holding the default for each capability. */
export const DEFAULT_COLUMNS: Record<
  Capability,
  { credential: keyof AiDefaultsRow; model: keyof AiDefaultsRow }
> = {
  text: { credential: "text_credential_id", model: "text_model" },
  image: { credential: "image_credential_id", model: "image_model" },
  video: { credential: "video_credential_id", model: "video_model" },
};

/** How a credential is named in a picker: its label, else the provider. */
export function credentialName(row: Pick<CredentialRow, "provider" | "label">): string {
  return row.label?.trim() || AI_PROVIDERS[row.provider]?.name || row.provider;
}

/** A credential is callable only once it has a key and somewhere to send it. */
export function isCredentialReady(
  row: Pick<CredentialRow, "provider" | "base_url" | "has_api_key">,
): boolean {
  const spec = AI_PROVIDERS[row.provider];
  if (!spec) return false;
  if (!row.has_api_key) return false;
  if (spec.requiresBaseUrl && !row.base_url?.trim()) return false;
  return true;
}

/**
 * Which credentials can serve a capability. A provider with no listed models
 * for it is still offered when its routes are editable — that is how a custom
 * or self-hosted endpoint gets used for images or video.
 */
export function credentialsFor(rows: CredentialRow[], capability: Capability): CredentialRow[] {
  return rows.filter((row) => {
    if (!row.is_enabled || !isCredentialReady(row)) return false;
    const spec = AI_PROVIDERS[row.provider];
    return !!spec && (spec.models[capability].length > 0 || spec.routesEditable);
  });
}

/** What a connection test reports back. Mirrors aiClient.ts TestResult. */
export interface ConnectionTest {
  ok: boolean;
  message: string;
  /** Every model id the key reported, when the provider lists them. */
  models?: string[];
  /** Whether the model tested was among them; absent when unknown. */
  modelFound?: boolean;
  /** True when the check ran a real generation rather than a listing. */
  generated?: boolean;
  latencyMs?: number;
}

/**
 * Which listed models plausibly serve a capability.
 *
 * A key's model list is everything the account can call — embeddings,
 * transcription and moderation included — and offering those as a text model
 * produces a confusing failure at generation time. This is a heuristic, not a
 * guarantee, which is why typing a model name by hand always stays available.
 */
const CAPABILITY_HINTS: Record<Capability, { include?: RegExp; exclude?: RegExp }> = {
  text: {
    exclude:
      /embed|whisper|tts|moderation|audio|speech|transcrib|rerank|image|dall-?e|imagen|sora|veo|guard|vision-only/i,
  },
  image: { include: /image|dall-?e|imagen|flux|stable-?diffusion|sd3|photo|paint/i },
  video: { include: /video|sora|veo|kling|runway|luma|pika/i },
};

export function modelServesCapability(capability: Capability, modelId: string): boolean {
  const hint = CAPABILITY_HINTS[capability];
  if (hint.include) return hint.include.test(modelId);
  return !hint.exclude?.test(modelId);
}

/**
 * The options a model picker should show: our suggestions for the provider,
 * plus whatever this particular key reported that we did not already list.
 *
 * A custom provider has no suggestions at all, so discovery is the only way it
 * ever gets a picker instead of a blank text box.
 */
export function modelOptionsFor(
  provider: AiProviderId,
  capability: Capability,
  discovered: string[] = [],
): ModelOption[] {
  const suggested = AI_PROVIDERS[provider]?.models[capability] ?? [];
  const seen = new Set(suggested.map((option) => option.id));

  const extra = discovered
    .filter((id) => !seen.has(id) && modelServesCapability(capability, id))
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ({ id, label: id, note: "From your key" }));

  return [...suggested, ...extra];
}
