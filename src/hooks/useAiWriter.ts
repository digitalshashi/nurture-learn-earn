import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/** One field the model should fill, and what it means. */
export interface AiField {
  key: string;
  /** Describes the field to the model — this is what steers the output. */
  hint: string;
}

export interface AiWriteRequest {
  /** What is being written, e.g. "a broadcast email to a coach's audience". */
  task: string;
  /**
   * Facts already on screen. Labelled values, so the model writes about this
   * course or this certificate rather than asking the coach to restate it.
   * Empty values are dropped.
   */
  context?: Record<string, string | number | null | undefined>;
  fields: AiField[];
  /** Anything the coach typed into the "make it..." box. */
  instructions?: string;
}

/**
 * Builds the prompt so a caller only has to say what it is writing and hand
 * over the fields already on screen.
 */
export function buildPrompt(request: AiWriteRequest): string {
  const facts = Object.entries(request.context ?? {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .map(([label, value]) => `- ${label}: ${value}`);

  return [
    `Write ${request.task}.`,
    facts.length ? `\nWhat you know:\n${facts.join("\n")}` : "",
    request.instructions?.trim() ? `\nAlso: ${request.instructions.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM =
  "You write for an online coach's audience: clear, warm and specific, never padded " +
  "or generic. Match the language of the details you are given. Fill in every field " +
  "asked for, and write finished copy — no placeholders like [name] unless the field " +
  "hint says to use one.";

/** Turns the requested fields into the JSON shape the edge function asks for. */
const shapeOf = (fields: AiField[]) =>
  Object.fromEntries(fields.map((f) => [f.key, f.hint]));

/**
 * Generates copy with the coach's configured text provider and hands back the
 * requested fields.
 *
 * Every AI writing surface in the app goes through this, so switching provider
 * in Settings changes all of them at once and none of them has to know which
 * provider is in use.
 */
export function useAiWriter() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(
    async <T extends Record<string, string>>(request: AiWriteRequest): Promise<T | null> => {
      setGenerating(true);
      try {
        const { data, error } = await supabase.functions.invoke("ai-generate", {
          body: {
            action: "text",
            system: SYSTEM,
            prompt: buildPrompt(request),
            shape: shapeOf(request.fields),
          },
        });
        if (error) throw error;
        if (!data?.data) throw new Error("The model returned nothing. Try again.");
        return data.data as T;
      } catch (e) {
        toast({
          title: "Couldn't generate",
          description: await readAiError(e),
          variant: "destructive",
        });
        return null;
      } finally {
        setGenerating(false);
      }
    },
    [toast],
  );

  return { generate, generating };
}

/**
 * supabase-js turns a non-2xx into a FunctionsHttpError whose message is only
 * "Edge Function returned a non-2xx status code" — the useful part ("no
 * provider connected", "key rejected") is in the response body.
 */
async function readAiError(e: unknown): Promise<string> {
  const context = (e as { context?: Response })?.context;
  if (context && typeof context.json === "function") {
    try {
      const body = await context.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      // Not JSON — fall through to the generic message.
    }
  }
  return e instanceof Error ? e.message : "Unknown error";
}
