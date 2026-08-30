import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  AI_PROVIDERS,
  AI_PROVIDER_IDS,
  CAPABILITIES,
  DEFAULT_COLUMNS,
  ROUTE_FIELDS,
  credentialName,
  credentialsFor,
  isAiProvider,
  isCredentialReady,
  modelOptionsFor,
  modelServesCapability,
  type CredentialRow,
} from "./aiProviders";

const row = (over: Partial<CredentialRow> = {}): CredentialRow => ({
  id: "cred-1",
  provider: "openai",
  label: "",
  base_url: "https://api.openai.com/v1",
  api_style: "openai",
  config: {},
  is_enabled: true,
  has_api_key: true,
  ...over,
});

describe("provider registry", () => {
  it("describes every provider it lists", () => {
    for (const id of AI_PROVIDER_IDS) {
      const spec = AI_PROVIDERS[id];
      expect(spec.id).toBe(id);
      expect(spec.name).toBeTruthy();
      expect(spec.blurb).toBeTruthy();
      expect(spec.keyPlaceholder).toBeTruthy();
      for (const capability of CAPABILITIES) {
        expect(Array.isArray(spec.models[capability])).toBe(true);
      }
    }
  });

  it("asks for a base URL only where there is none to default to", () => {
    // A named provider takes a key and nothing else; the edge function knows
    // its address. Asking would be busywork, and a typo would break it.
    for (const id of AI_PROVIDER_IDS) {
      const spec = AI_PROVIDERS[id];
      expect(spec.requiresBaseUrl, id).toBe(spec.defaultBaseUrl === "");
      if (!spec.requiresBaseUrl) expect(spec.defaultBaseUrl).toMatch(/^https:\/\//);
    }
  });

  it("agrees with the addresses the edge function calls", async () => {
    // Deno and the browser cannot share a module, so the two lists are kept in
    // step here rather than by an import.
    const client = await readFile(
      "supabase/functions/_shared/aiClient.ts",
      "utf8",
    );
    const block = client.slice(
      client.indexOf("const DEFAULT_BASE_URLS"),
      client.indexOf("/** Raised with a message"),
    );
    for (const id of AI_PROVIDER_IDS) {
      const spec = AI_PROVIDERS[id];
      if (spec.requiresBaseUrl) continue;
      expect(block, `${id} base URL`).toContain(`${id}: "${spec.defaultBaseUrl}"`);
    }
  });

  it("recognises only the providers it knows", () => {
    expect(isAiProvider("anthropic")).toBe(true);
    expect(isAiProvider("cohere")).toBe(false);
    expect(isAiProvider(null)).toBe(false);
  });

  it("keeps a distinct pair of default columns per capability", () => {
    const columns = CAPABILITIES.flatMap((c) => [
      DEFAULT_COLUMNS[c].credential,
      DEFAULT_COLUMNS[c].model,
    ]);
    expect(new Set(columns).size).toBe(columns.length);
  });
});

describe("credentialName", () => {
  it("falls back to the provider name when there is no label", () => {
    expect(credentialName(row())).toBe("OpenAI");
  });

  it("prefers the label, which is how custom providers are told apart", () => {
    expect(credentialName(row({ provider: "custom", label: "My GPU box" }))).toBe("My GPU box");
  });
});

describe("isCredentialReady", () => {
  it("needs a key", () => {
    expect(isCredentialReady(row({ has_api_key: false }))).toBe(false);
  });

  it("does not need a base URL when the provider has a default", () => {
    expect(isCredentialReady(row({ base_url: null }))).toBe(true);
  });

  it("needs a base URL when the provider has no default", () => {
    expect(isCredentialReady(row({ provider: "custom", base_url: null }))).toBe(false);
    expect(isCredentialReady(row({ provider: "custom", base_url: "https://x.dev/v1" }))).toBe(true);
  });
});

describe("credentialsFor", () => {
  it("offers a provider only for capabilities it can serve", () => {
    const anthropic = row({ id: "a", provider: "anthropic" });
    expect(credentialsFor([anthropic], "text")).toHaveLength(1);
    expect(credentialsFor([anthropic], "image")).toHaveLength(0);
    expect(credentialsFor([anthropic], "video")).toHaveLength(0);
  });

  it("offers a custom provider for every capability, since we cannot know its models", () => {
    const custom = row({ id: "c", provider: "custom", label: "Mine", base_url: "https://x.dev" });
    for (const capability of CAPABILITIES) {
      expect(credentialsFor([custom], capability)).toHaveLength(1);
    }
  });

  it("skips disabled and half-configured credentials", () => {
    expect(credentialsFor([row({ is_enabled: false })], "text")).toHaveLength(0);
    expect(credentialsFor([row({ has_api_key: false })], "text")).toHaveLength(0);
  });
});

describe("which listed models suit a capability", () => {
  it("keeps chat models and drops the rest of an account's catalogue", () => {
    // An OpenAI key lists embeddings, transcription and moderation too;
    // offering those as a text model fails only at generation time.
    expect(modelServesCapability("text", "gpt-4o-mini")).toBe(true);
    expect(modelServesCapability("text", "deepseek-chat")).toBe(true);
    expect(modelServesCapability("text", "my-own-llm-v3")).toBe(true);

    expect(modelServesCapability("text", "text-embedding-3-small")).toBe(false);
    expect(modelServesCapability("text", "whisper-1")).toBe(false);
    expect(modelServesCapability("text", "omni-moderation-latest")).toBe(false);
    expect(modelServesCapability("text", "dall-e-3")).toBe(false);
    expect(modelServesCapability("text", "tts-1")).toBe(false);
  });

  it("only offers image and video models where they belong", () => {
    expect(modelServesCapability("image", "gpt-image-1")).toBe(true);
    expect(modelServesCapability("image", "imagen-4.0-generate-001")).toBe(true);
    expect(modelServesCapability("image", "gpt-4o")).toBe(false);

    expect(modelServesCapability("video", "sora-2")).toBe(true);
    expect(modelServesCapability("video", "veo-3.0-generate-001")).toBe(true);
    expect(modelServesCapability("video", "gpt-4o")).toBe(false);
  });
});

describe("model options", () => {
  it("gives a custom provider a picker, which it has no registry entry for", () => {
    // Without discovery this is a blank text box and nothing else — the whole
    // reason a coach on a self-hosted endpoint had no model to select.
    expect(modelOptionsFor("custom", "text")).toEqual([]);

    const options = modelOptionsFor("custom", "text", ["llama-3.1-70b", "mixtral-8x7b"]);
    expect(options.map((o) => o.id)).toEqual(["llama-3.1-70b", "mixtral-8x7b"]);
  });

  it("adds models a key reports that the registry does not list", () => {
    const options = modelOptionsFor("openai", "text", ["gpt-4o-mini", "gpt-5-preview"]);
    const ids = options.map((o) => o.id);

    expect(ids).toContain("gpt-5-preview");
    // Already suggested, so it must not appear twice.
    expect(ids.filter((id) => id === "gpt-4o-mini")).toHaveLength(1);
  });

  it("does not let a listing turn embeddings into text models", () => {
    const ids = modelOptionsFor("openai", "text", ["text-embedding-3-large"]).map((o) => o.id);
    expect(ids).not.toContain("text-embedding-3-large");
  });

  it("keeps the registry's own suggestions first", () => {
    const options = modelOptionsFor("openai", "text", ["aaa-model"]);
    expect(options[0].id).toBe(AI_PROVIDERS.openai.models.text[0].id);
  });
});

describe("connection tests reach every provider", () => {
  const client = readFileSync("supabase/functions/_shared/aiClient.ts", "utf8");
  const fn = readFileSync("supabase/functions/ai-generate/index.ts", "utf8");

  it("tests a named model, not just the key", () => {
    expect(client).toContain("options: { model?: string } = {}");
    expect(client).toMatch(/cannot call/);
  });

  it("falls back to a real call for an endpoint with no model list", () => {
    // A self-hosted server may not implement /models at all, and a coach there
    // otherwise has no way to check anything.
    expect(client).toContain("maxTokens: 1");
    expect(client).toContain("does not list its models");
  });

  it("never spends money rendering an image or a video to run a test", () => {
    const test = client.slice(client.indexOf("export async function testCredential"));
    expect(test).not.toContain("generateImage");
    expect(test).not.toContain("startVideo");
  });

  it("can test what a capability is actually configured to run", () => {
    expect(fn).toContain('case "test-capability"');
  });

  it("lets a custom endpoint say where it lists models", () => {
    expect(client).toContain("models_path");
    expect(ROUTE_FIELDS.some((field) => field.key === "models_path")).toBe(true);
  });
});

describe("a connected provider is enough to generate", () => {
  const client = readFileSync("supabase/functions/_shared/aiClient.ts", "utf8");

  it("uses the only connected provider when nothing was chosen", () => {
    // Connecting a key and never opening the defaults screen used to make
    // every AI feature report "no provider connected".
    expect(client).toContain("if (usable.length === 1)");
    expect(client).toContain("DEFAULT_MODELS");
  });

  it("asks which to use only when the choice is genuinely ambiguous", () => {
    expect(client).toMatch(/several providers connected/i);
  });

  it("says so when nothing connected can serve the capability", () => {
    expect(client).toMatch(/None of your connected providers can generate/);
  });
});
