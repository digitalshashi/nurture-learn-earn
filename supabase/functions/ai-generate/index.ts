// One entry point for every AI generation in the app.
//
// The caller says what it wants — text, an image, a video — and this resolves
// the coach's configured provider and model for that capability and calls it.
// Nothing here knows which provider is in use; that lives in _shared/aiClient.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/edge.ts";
import {
  AiError,
  type Capability,
  type Credential,
  generateImage,
  generateJson,
  generateText,
  resolveModel,
  startVideo,
  testCredential,
  videoStatus,
} from "../_shared/aiClient.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireUser(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const action = String(body.action || "");

    switch (action) {
      // Proves a saved key, base URL and — when one is named — model work,
      // from the settings screen.
      case "test": {
        const { data: credential } = await adminClient()
          .from("ai_provider_credentials")
          .select("*")
          .eq("id", body.credential_id)
          .eq("coach_id", userId)
          .maybeSingle();

        if (!credential?.api_key) {
          return json({ ok: false, message: "No API key saved for this provider.", latencyMs: 0 });
        }
        return json(
          await testCredential(credential as Credential, {
            model: body.model ? String(body.model) : undefined,
          }),
        );
      }

      // Tests what is actually configured to run for a capability, so a coach
      // checks the setup a feature will use rather than a credential alone.
      case "test-capability": {
        const capability = String(body.capability || "text");
        if (!["text", "image", "video"].includes(capability)) {
          throw new AiError("Unknown capability.");
        }

        // resolveModel raises the same message a real generation would, so a
        // half-configured capability reads the same here as it does in use.
        const resolved = await resolveModel(userId, capability as Capability);

        // resolveModel returns the credential without re-reading it; fetch the
        // stored row so the test uses exactly what a generation would send.
        const { data: credential } = await adminClient()
          .from("ai_provider_credentials")
          .select("*")
          .eq("id", resolved.credential.id)
          .eq("coach_id", userId)
          .maybeSingle();

        return json(
          await testCredential((credential ?? resolved.credential) as Credential, {
            model: resolved.model,
          }),
        );
      }

      case "text": {
        if (!body.prompt) throw new AiError("A prompt is required.");
        const resolved = await resolveModel(userId, "text", {
          model: body.model,
          temperature: body.temperature,
          maxTokens: body.max_tokens,
        });

        // A caller that names the fields it wants gets them parsed here,
        // where the fence-stripping and brace-recovery already live.
        if (body.shape) {
          const data = await generateJson<unknown>(resolved, {
            prompt: String(body.prompt),
            system: body.system ? String(body.system) : undefined,
            shape: typeof body.shape === "string"
              ? body.shape
              : JSON.stringify(body.shape, null, 2),
          });
          return json({ data, model: resolved.model, provider: resolved.credential.provider });
        }

        const result = await generateText(resolved, {
          prompt: String(body.prompt),
          system: body.system ? String(body.system) : undefined,
          json: !!body.json,
        });
        return json({
          text: result.text,
          tokens_used: result.tokensUsed,
          model: resolved.model,
          provider: resolved.credential.provider,
        });
      }

      case "image": {
        if (!body.prompt) throw new AiError("A prompt is required.");
        const resolved = await resolveModel(userId, "image", { model: body.model });
        const images = await generateImage(resolved, {
          prompt: String(body.prompt),
          size: body.size ? String(body.size) : undefined,
          count: Number(body.count) || 1,
        });
        return json({
          images,
          model: resolved.model,
          provider: resolved.credential.provider,
        });
      }

      // Rendering is queued everywhere, so this returns a job to poll rather
      // than a finished clip.
      case "video": {
        if (!body.prompt) throw new AiError("A prompt is required.");
        const resolved = await resolveModel(userId, "video", { model: body.model });
        const job = await startVideo(resolved, {
          prompt: String(body.prompt),
          seconds: Number(body.seconds) || undefined,
          size: body.size ? String(body.size) : undefined,
        });
        return json({ job, model: resolved.model, provider: resolved.credential.provider });
      }

      case "video-status": {
        if (!body.job_id) throw new AiError("A job id is required.");
        const resolved = await resolveModel(userId, "video", { model: body.model });
        return json({ job: await videoStatus(resolved, String(body.job_id)) });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    console.error("ai-generate error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
