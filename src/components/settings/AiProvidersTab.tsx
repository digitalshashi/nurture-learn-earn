import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plug,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ProviderLogo } from "./ProviderLogo";
import {
  AI_PROVIDERS,
  API_STYLE_LABELS,
  CAPABILITIES,
  CAPABILITY_BLURBS,
  CAPABILITY_LABELS,
  DEFAULT_COLUMNS,
  ROUTE_FIELDS,
  credentialName,
  credentialsFor,
  isCredentialReady,
  modelOptionsFor,
  modelServesCapability,
  type AiDefaultsRow,
  type AiProviderId,
  type ApiStyle,
  type Capability,
  type ConnectionTest,
  type CredentialConfig,
  type CredentialRow,
} from "@/lib/aiProviders";

/** Columns the browser is allowed to read back — never the key itself. */
const CREDENTIAL_COLUMNS =
  "id, coach_id, provider, label, base_url, api_style, config, is_enabled, has_api_key";

const DEFAULTS_COLUMNS =
  "temperature, max_tokens, text_credential_id, text_model, image_credential_id, image_model, video_credential_id, video_model";

const BUILT_IN: AiProviderId[] = ["openai", "anthropic", "gemini", "deepseek", "xiaomi"];

const EMPTY_DEFAULTS: AiDefaultsRow = {
  temperature: 0.7,
  max_tokens: 3000,
  text_credential_id: null,
  text_model: null,
  image_credential_id: null,
  image_model: null,
  video_credential_id: null,
  video_model: null,
};

/**
 * Runs a connection test and normalises everything that can go wrong into the
 * same shape, so no caller has to tell a transport failure from a rejection.
 */
async function runTest(body: Record<string, unknown>): Promise<ConnectionTest> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-generate", { body });
    if (error) throw error;
    if (data?.error) return { ok: false, message: String(data.error) };
    return data as ConnectionTest;
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "The test could not be run.",
    };
  }
}

/** The outcome of a test, kept on screen rather than flashed in a toast. */
function TestResultLine({ result }: { result: ConnectionTest }) {
  return (
    <p
      className={cn(
        "text-[11px] flex items-start gap-1.5",
        result.ok ? "text-green-600" : "text-destructive",
      )}
    >
      {result.ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 mt-px shrink-0" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
      )}
      <span>
        {result.message}
        {result.ok && result.latencyMs ? (
          <span className="text-muted-foreground"> ({result.latencyMs} ms)</span>
        ) : null}
      </span>
    </p>
  );
}

/** What the coach has typed into a provider card but not yet saved. */
interface Draft {
  apiKey: string;
  label: string;
  baseUrl: string;
  apiStyle: ApiStyle;
  config: CredentialConfig;
}

const draftFrom = (provider: AiProviderId, row?: CredentialRow): Draft => ({
  apiKey: "",
  label: row?.label ?? "",
  baseUrl: row?.base_url ?? "",
  apiStyle: row?.api_style ?? AI_PROVIDERS[provider].apiStyle,
  config: row?.config ?? {},
});

/**
 * Connect the AI providers a coach can generate with, and pick which model
 * runs for text, images and video.
 *
 * Used both by a coach on their own settings page and by an admin acting on a
 * coach's behalf, so the target coach is passed in rather than read from the
 * session.
 */
export function AiProvidersTab({ coachId }: { coachId: string }) {
  const { toast } = useToast();

  const [rows, setRows] = useState<CredentialRow[]>([]);
  const [defaults, setDefaults] = useState<AiDefaultsRow>(EMPTY_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);

  // One unsaved custom provider at a time. It renders before a row exists,
  // so it has no id to key on.
  const [newCustom, setNewCustom] = useState(false);

  // Models each key reported when it was last tested, by credential id. This
  // is the only source of model names for a custom provider, which has none in
  // the registry, and it catches models newer than the registry for the rest.
  const [discovered, setDiscovered] = useState<Record<string, string[]>>({});

  const remember = useCallback((credentialId: string, models?: string[]) => {
    if (models?.length) setDiscovered((d) => ({ ...d, [credentialId]: models }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [credentials, settings] = await Promise.all([
      supabase
        .from("ai_provider_credentials")
        .select(CREDENTIAL_COLUMNS)
        .eq("coach_id", coachId)
        .order("created_at"),
      supabase.from("ai_settings").select(DEFAULTS_COLUMNS).eq("coach_id", coachId).maybeSingle(),
    ]);

    if (credentials.error) {
      toast({
        title: "Couldn't load AI providers",
        description: credentials.error.message,
        variant: "destructive",
      });
    }

    setRows((credentials.data || []) as unknown as CredentialRow[]);
    if (settings.data) {
      const d = settings.data as unknown as AiDefaultsRow;
      setDefaults({
        ...EMPTY_DEFAULTS,
        ...d,
        temperature: Number(d.temperature ?? 0.7),
        max_tokens: Number(d.max_tokens ?? 3000),
      });
    }
    setLoading(false);
  }, [coachId, toast]);

  useEffect(() => {
    if (coachId) load();
  }, [coachId, load]);

  // Connecting one provider and never opening this section used to leave every
  // AI feature reporting "no provider connected". If exactly one connected
  // provider can serve a capability nothing is set for, use it — the coach can
  // still change it, and a single obvious choice is not worth a decision.
  useEffect(() => {
    if (loading || savingDefaults) return;

    const patch: Partial<AiDefaultsRow> = {};
    for (const capability of CAPABILITIES) {
      const columns = DEFAULT_COLUMNS[capability];
      if (defaults[columns.credential]) continue;

      const usable = credentialsFor(rows, capability).filter(
        (row) => AI_PROVIDERS[row.provider].models[capability].length > 0,
      );
      if (usable.length !== 1) continue;

      patch[columns.credential] = usable[0].id as never;
      patch[columns.model] = AI_PROVIDERS[usable[0].provider].models[capability][0].id as never;
    }

    if (Object.keys(patch).length) saveDefaults({ ...defaults, ...patch });
    // saveDefaults is stable enough here: it only writes when a capability is
    // unset, and the write sets it, so this settles after one pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, rows, defaults]);

  const customRows = useMemo(() => rows.filter((r) => r.provider === "custom"), [rows]);
  const rowFor = (provider: AiProviderId) => rows.find((r) => r.provider === provider);

  const saveDefaults = async (next: AiDefaultsRow) => {
    setDefaults(next);
    setSavingDefaults(true);
    const { error } = await supabase.from("ai_settings").upsert(
      {
        coach_id: coachId,
        temperature: next.temperature,
        max_tokens: next.max_tokens,
        text_credential_id: next.text_credential_id,
        text_model: next.text_model,
        image_credential_id: next.image_credential_id,
        image_model: next.image_model,
        video_credential_id: next.video_credential_id,
        video_model: next.video_model,
        updated_at: new Date().toISOString(),
      } satisfies TablesInsert<"ai_settings">,
      { onConflict: "coach_id" },
    );
    setSavingDefaults(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    }
  };

  /** Clearing a capability means "generate nothing with this", not an error. */
  const setCapability = (
    capability: Capability,
    credentialId: string | null,
    model: string | null,
  ) => {
    const columns = DEFAULT_COLUMNS[capability];
    saveDefaults({ ...defaults, [columns.credential]: credentialId, [columns.model]: model });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">What generates what</CardTitle>
          <p className="text-xs text-muted-foreground">
            Every AI feature calls the model you pick here. Connect a provider below first.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {CAPABILITIES.map((capability) => (
            <CapabilityRow
              key={capability}
              capability={capability}
              rows={rows}
              credentialId={defaults[DEFAULT_COLUMNS[capability].credential] as string | null}
              model={defaults[DEFAULT_COLUMNS[capability].model] as string | null}
              discovered={discovered}
              onDiscovered={remember}
              onChange={(credentialId, model) => setCapability(capability, credentialId, model)}
            />
          ))}

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Temperature: {defaults.temperature}</Label>
              <Slider
                value={[defaults.temperature]}
                onValueChange={([v]) => setDefaults((d) => ({ ...d, temperature: v }))}
                onValueCommit={([v]) => saveDefaults({ ...defaults, temperature: v })}
                min={0}
                max={1}
                step={0.1}
                className="mt-3"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Lower is more focused, higher is more creative.
              </p>
            </div>
            <div>
              <Label className="text-xs">Max tokens</Label>
              <Input
                type="number"
                min={500}
                max={32000}
                value={defaults.max_tokens}
                onChange={(e) => setDefaults((d) => ({ ...d, max_tokens: Number(e.target.value) }))}
                onBlur={() => saveDefaults(defaults)}
                className="text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                How long a single text reply may get.
              </p>
            </div>
          </div>

          {savingDefaults && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold mb-1">Providers</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Keys are stored write-only: you can replace one, but it is never sent back to your
          browser.
        </p>
      </div>

      {BUILT_IN.map((provider) => (
        <ProviderCard
          key={rowFor(provider)?.id ?? provider}
          onTested={remember}
          coachId={coachId}
          provider={provider}
          row={rowFor(provider)}
          onSaved={load}
        />
      ))}

      {customRows.map((row) => (
        <ProviderCard
          key={row.id}
          onTested={remember}
          coachId={coachId}
          provider="custom"
          row={row}
          onSaved={load}
        />
      ))}

      {newCustom ? (
        <ProviderCard
          coachId={coachId}
          provider="custom"
          onTested={remember}
          onSaved={() => {
            setNewCustom(false);
            load();
          }}
          onCancel={() => setNewCustom(false)}
        />
      ) : (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setNewCustom(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add a custom provider
        </Button>
      )}
    </div>
  );
}

/** Provider + model picker for one capability. */
function CapabilityRow({
  capability,
  rows,
  credentialId,
  model,
  discovered,
  onDiscovered,
  onChange,
}: {
  capability: Capability;
  rows: CredentialRow[];
  credentialId: string | null;
  model: string | null;
  discovered: Record<string, string[]>;
  onDiscovered: (credentialId: string, models?: string[]) => void;
  onChange: (credentialId: string | null, model: string | null) => void;
}) {
  const usable = credentialsFor(rows, capability);
  const selected = usable.find((r) => r.id === credentialId) ?? null;

  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionTest | null>(null);

  // Tests the pairing a feature will actually use, not the credential alone —
  // a working key with a model that key cannot call is the failure that
  // reaches a coach as an unexplained error mid-generation.
  const test = async () => {
    setTesting(true);
    const outcome = await runTest({ action: "test-capability", capability });
    if (selected) onDiscovered(selected.id, outcome.models);
    setResult(outcome);
    setTesting(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{CAPABILITY_LABELS[capability]}</Label>
        {selected && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={test}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Plug className="h-3 w-3 mr-1" />
            )}
            Test
          </Button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mb-1.5">{CAPABILITY_BLURBS[capability]}</p>

      {usable.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No connected provider can generate {capability} yet.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={credentialId ?? "none"}
            onValueChange={(value) => {
              setResult(null);
              if (value === "none") return onChange(null, null);
              const row = usable.find((r) => r.id === value);
              // Default to the provider's first suggested model so choosing a
              // provider is enough to make the capability work.
              const first = row ? AI_PROVIDERS[row.provider].models[capability][0]?.id : undefined;
              onChange(value, first ?? null);
            }}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Off</SelectItem>
              {usable.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  <span className="flex items-center gap-2">
                    <ProviderLogo provider={row.provider} className="h-5 w-5 rounded" />
                    {credentialName(row)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selected && (
            <ModelField
              key={selected.id}
              credentialId={selected.id}
              provider={selected.provider}
              capability={capability}
              value={model ?? ""}
              discovered={discovered[selected.id] ?? []}
              onDiscovered={onDiscovered}
              onChange={(next) => {
                setResult(null);
                onChange(selected.id, next || null);
              }}
            />
          )}
        </div>
      )}

      {result && (
        <div className="mt-1.5">
          <TestResultLine result={result} />
        </div>
      )}
    </div>
  );
}
/**
 * Pick a model from the provider's known list, or type any name. The list is
 * only a shortcut — providers ship new models faster than this app does, and
 * a self-hosted endpoint has names we cannot know at all.
 */
function ModelField({
  credentialId,
  provider,
  capability,
  value,
  discovered,
  onDiscovered,
  onChange,
}: {
  credentialId: string;
  provider: AiProviderId;
  capability: Capability;
  value: string;
  /** Model ids this key reported, merged into the list below. */
  discovered: string[];
  onDiscovered: (credentialId: string, models?: string[]) => void;
  onChange: (model: string) => void;
}) {
  const { toast } = useToast();
  const options = modelOptionsFor(provider, capability, discovered);
  const known = options.some((o) => o.id === value);

  const [typing, setTyping] = useState(options.length === 0 || (!!value && !known));
  // A typed name is only saved on blur — every change here is a write.
  const [typed, setTyped] = useState(value);
  const [loadingModels, setLoadingModels] = useState(false);

  // A custom provider has no models in the registry, so asking the endpoint is
  // the only way this ever becomes a picker rather than a blank box.
  const loadModels = async () => {
    setLoadingModels(true);
    const outcome = await runTest({ action: "test", credential_id: credentialId });
    setLoadingModels(false);

    const found = (outcome.models ?? []).filter((id) => modelServesCapability(capability, id));
    if (!found.length) {
      toast({
        title: "No models to list",
        description: outcome.ok
          ? "This provider did not return a model list. Type the model name instead."
          : outcome.message,
        variant: outcome.ok ? "default" : "destructive",
      });
      return;
    }

    onDiscovered(credentialId, outcome.models);
    setTyping(false);
    toast({ title: `Found ${found.length} models` });
  };

  const loadButton = (
    <button
      type="button"
      className="text-[10px] text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1 disabled:opacity-60"
      onClick={loadModels}
      disabled={loadingModels}
    >
      {loadingModels ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="h-3 w-3" />
      )}
      Load models from your key
    </button>
  );

  if (typing) {
    return (
      <div>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onBlur={() => typed !== value && onChange(typed)}
          placeholder="Model name, e.g. my-model-v2"
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-3">
          {options.length > 0 && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground mt-1"
              onClick={() => {
                setTyping(false);
                onChange(options[0].id);
              }}
            >
              Choose from the list instead
            </button>
          )}
          {loadButton}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next === "__custom__") {
            setTyping(true);
            setTyped("");
            return;
          }
          onChange(next);
        }}
      >
        <SelectTrigger className="text-xs">
          <SelectValue placeholder="Choose a model" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
              {option.note && <span className="text-muted-foreground"> — {option.note}</span>}
            </SelectItem>
          ))}
          <SelectItem value="__custom__">Enter a model name…</SelectItem>
        </SelectContent>
      </Select>
      {loadButton}
    </div>
  );
}
/** Credentials for one provider: key, base URL and, for custom, its routes. */
function ProviderCard({
  coachId,
  provider,
  row,
  onSaved,
  onTested,
  onCancel,
}: {
  coachId: string;
  provider: AiProviderId;
  row?: CredentialRow;
  onSaved: () => void;
  onTested?: (credentialId: string, models?: string[]) => void;
  onCancel?: () => void;
}) {
  const spec = AI_PROVIDERS[provider];
  const { toast } = useToast();

  // The card owns what is typed into it and is never reset from a reload, so
  // saving one provider cannot wipe half-entered credentials in another. The
  // parent keys each card by row id, which remounts it once — after a first
  // insert — with the saved values.
  const [draft, setDraft] = useState<Draft>(() => draftFrom(provider, row));
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  // Kept on the card rather than shown in a toast: a coach comparing providers
  // needs to see which ones answered, not the last one they happened to press.
  const [testResult, setTestResult] = useState<ConnectionTest | null>(null);
  const [removing, setRemoving] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);


  const connected = !!row && isCredentialReady(row);
  const setConfig = (key: keyof CredentialConfig, value: string) =>
    setDraft((d) => ({ ...d, config: { ...d.config, [key]: value } }));

  const save = async () => {
    const key = draft.apiKey.trim();
    // A blank key on a saved provider means "keep the stored one".
    if (!key && !row?.has_api_key) {
      toast({ title: "An API key is required", variant: "destructive" });
      return;
    }
    if (spec.requiresBaseUrl && !draft.baseUrl.trim()) {
      toast({ title: "A base URL is required", variant: "destructive" });
      return;
    }
    if (provider === "custom" && !draft.label.trim()) {
      toast({ title: "Give this endpoint a name", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: TablesInsert<"ai_provider_credentials"> = {
      coach_id: coachId,
      provider,
      label: provider === "custom" ? draft.label.trim() : "",
      // Named providers always call their registry address, so any URL
      // stored against one before is cleared rather than kept.
      base_url: spec.requiresBaseUrl ? draft.baseUrl.trim() || null : null,
      api_style: spec.apiStyleEditable ? draft.apiStyle : spec.apiStyle,
      config: draft.config as Json,
      updated_at: new Date().toISOString(),
      // Only send the key when one was typed, so saving a base URL never
      // wipes a working credential.
      ...(key ? { api_key: key } : {}),
    };

    const { error } = row
      ? await supabase.from("ai_provider_credentials").update(payload).eq("id", row.id)
      : await supabase.from("ai_provider_credentials").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    setDraft((d) => ({ ...d, apiKey: "" }));
    setTestResult(null);
    toast({ title: `${provider === "custom" ? draft.label.trim() : spec.name} saved` });
    onSaved();
  };

  const test = async () => {
    if (!row) return;
    setTesting(true);
    const outcome = await runTest({ action: "test", credential_id: row.id });
    // Even a failed test can carry a model list; keeping it costs nothing.
    onTested?.(row.id, outcome.models);
    setTestResult(outcome);
    setTesting(false);
  };

  const remove = async () => {
    if (!row) return;
    setRemoving(true);
    const { error } = await supabase.from("ai_provider_credentials").delete().eq("id", row.id);
    setRemoving(false);
    if (error) {
      toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Provider removed" });
    onSaved();
  };

  const toggleEnabled = async (enabled: boolean) => {
    if (!row) return;
    const { error } = await supabase
      .from("ai_provider_credentials")
      .update({ is_enabled: enabled })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    onSaved();
  };

  const routeFields = ROUTE_FIELDS.filter(
    (field) =>
      // Only offer routes the chosen shape actually uses.
      draft.apiStyle !== "anthropic" || field.capability === "text",
  );

  return (
    <Card className={cn("card-shadow", row && !row.is_enabled && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <ProviderLogo provider={provider} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm flex items-center gap-2">
              {provider === "custom" && row ? credentialName(row) : spec.name}
              {connected && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                </span>
              )}
              {row && !row.has_api_key && (
                <Badge variant="secondary" className="text-[10px]">
                  No key
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{spec.blurb}</p>
          </div>
          {row && (
            <Switch
              checked={row.is_enabled}
              onCheckedChange={toggleEnabled}
              aria-label={`Enable ${credentialName(row)}`}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {provider === "custom" && (
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="e.g. Groq, Mistral, Together AI, or your own server"
              className="text-xs mt-1"
            />
          </div>
        )}

        <div>
          <Label className="text-xs">API key</Label>
          <div className="relative mt-1">
            <Input
              type={revealed ? "text" : "password"}
              value={draft.apiKey}
              onChange={(e) => setDraft((d) => ({ ...d, apiKey: e.target.value }))}
              placeholder={row?.has_api_key ? "Saved — type to replace" : spec.keyPlaceholder}
              className="font-mono text-xs pr-10"
            />
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={revealed ? "Hide API key" : "Show API key"}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {spec.keysUrl && (
            <a
              href={spec.keysUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-accent underline inline-flex items-center gap-1 mt-1"
            >
              Get a key <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Only endpoints we cannot know are asked for. A named provider's
            address is in the registry, so the key is all it needs. */}
        {spec.requiresBaseUrl && (
          <div>
            <Label className="text-xs">Base URL</Label>
            <Input
              value={draft.baseUrl}
              onChange={(e) => setDraft((d) => ({ ...d, baseUrl: e.target.value }))}
              placeholder="https://your-host.example.com/v1"
              className="font-mono text-xs mt-1"
            />
          </div>
        )}

        {spec.apiStyleEditable && (
          <div>
            <Label className="text-xs">API shape</Label>
            <Select
              value={draft.apiStyle}
              onValueChange={(v) => setDraft((d) => ({ ...d, apiStyle: v as ApiStyle }))}
            >
              <SelectTrigger className="text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(API_STYLE_LABELS) as ApiStyle[]).map((style) => (
                  <SelectItem key={style} value={style}>
                    {API_STYLE_LABELS[style]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Most self-hosted servers and resellers speak the OpenAI shape.
            </p>
          </div>
        )}

        {spec.routesEditable && (
          <Collapsible open={showRoutes} onOpenChange={setShowRoutes}>
            <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showRoutes && "rotate-180")} />
              Routes and auth header
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <p className="text-[10px] text-muted-foreground">
                Leave blank to use the standard paths. Each is appended to the base URL.
              </p>
              {routeFields.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    value={draft.config[field.key] ?? ""}
                    onChange={(e) => setConfig(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="font-mono text-xs mt-1"
                  />
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Auth header</Label>
                  <Input
                    value={draft.config.auth_header ?? ""}
                    onChange={(e) => setConfig("auth_header", e.target.value)}
                    placeholder="Authorization"
                    className="font-mono text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Auth prefix</Label>
                  <Input
                    value={draft.config.auth_scheme ?? ""}
                    onChange={(e) => setConfig("auth_scheme", e.target.value)}
                    placeholder="Bearer"
                    className="font-mono text-xs mt-1"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={save}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {row ? "Update" : "Connect"}
          </Button>
          {row?.has_api_key && (
            <Button size="sm" variant="outline" onClick={test} disabled={testing}>
              {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Test connection
            </Button>
          )}
          {row && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={remove}
              disabled={removing}
            >
              {removing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove
            </Button>
          )}
          {onCancel && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {testResult && <TestResultLine result={testResult} />}
      </CardContent>
    </Card>
  );
}
