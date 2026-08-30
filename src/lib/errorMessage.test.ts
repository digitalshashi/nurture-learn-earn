import { describe, it, expect } from "vitest";

import { edgeErrorMessage, errorMessage } from "./errorMessage";

describe("errorMessage", () => {
  it("never renders an object as [object Object]", () => {
    // The bug this exists to stop: supabase-js assigns the parsed response
    // body straight through, so a PostgREST failure is a plain object and
    // String() on it is what a coach was shown in a toast.
    const postgrest = {
      code: "42501",
      details: null,
      hint: null,
      message: "new row violates row-level security policy",
    };

    expect(errorMessage(postgrest)).toBe("new row violates row-level security policy");
    expect(errorMessage(postgrest)).not.toContain("[object Object]");
  });

  it("explains a missing table instead of quoting the schema cache", () => {
    expect(
      errorMessage({
        code: "PGRST205",
        message: "Could not find the table 'public.course_blueprints' in the schema cache",
      }),
    ).toMatch(/migrations/i);

    expect(errorMessage({ code: "42P01", message: 'relation "public.x" does not exist' })).toMatch(
      /migrations/i,
    );
  });

  it("appends details and hint when they say something new", () => {
    expect(
      errorMessage({
        message: "insert violates foreign key constraint",
        details: "Key (coach_id) is not present in table users.",
        hint: null,
      }),
    ).toBe("insert violates foreign key constraint — Key (coach_id) is not present in table users.");
  });

  it("does not repeat a detail already inside the message", () => {
    expect(errorMessage({ message: "column x does not exist", details: "column x does not exist" })).toBe(
      "column x does not exist",
    );
  });

  it("handles Errors, strings and nothing at all", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain string")).toBe("plain string");
    expect(errorMessage(null, "fallback")).toBe("fallback");
    expect(errorMessage({}, "fallback")).toBe("fallback");
    expect(errorMessage({ message: "   " }, "fallback")).toBe("fallback");
  });
});

describe("edgeErrorMessage", () => {
  /** Stands in for the Response hanging off a FunctionsHttpError. */
  const httpError = (body: unknown) => {
    const response = {
      clone: () => ({ json: async () => body }),
    } as unknown as Response;
    return Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context: response,
    });
  };

  it("shows what the function actually said, not the generic status line", async () => {
    await expect(edgeErrorMessage(httpError({ error: "Approve six valid steps first." }))).resolves.toBe(
      "Approve six valid steps first.",
    );
  });

  it("falls back to the error itself when the body is not JSON", async () => {
    const broken = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context: {
        clone: () => ({
          json: async () => {
            throw new Error("not json");
          },
        }),
      } as unknown as Response,
    });

    await expect(edgeErrorMessage(broken)).resolves.toBe(
      "Edge Function returned a non-2xx status code",
    );
  });

  it("works on errors that never came from an edge function", async () => {
    await expect(edgeErrorMessage({ message: "offline" })).resolves.toBe("offline");
  });
});
