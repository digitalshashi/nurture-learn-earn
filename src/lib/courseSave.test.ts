import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * A stand-in for the PostgREST builder, recording every call so a test can
 * assert what reached the database — including the deletes that the old
 * hand-rolled save never issued.
 */
interface Call {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  payload?: unknown;
  ids?: string[];
}

const calls: Call[] = [];

// Per-table canned answers, keyed "table.op".
const responses = new Map<string, { data: unknown; error: { message: string } | null }>();

function answer(key: string) {
  return responses.get(key) ?? { data: [], error: null };
}

function builder(table: string) {
  const call: Call = { table, op: "select" };

  const chain = {
    select: (_cols?: string) => {
      const result = answer(`${table}.${call.op}`);
      const thenable = {
        eq: () => thenable,
        in: () => thenable,
        single: () =>
          Promise.resolve({
            data: Array.isArray(result.data) ? result.data[0] : result.data,
            error: result.error,
          }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
      };
      return thenable;
    },
    insert: (payload: unknown) => {
      call.op = "insert";
      call.payload = payload;
      calls.push({ ...call });
      return chain;
    },
    update: (payload: unknown) => {
      call.op = "update";
      call.payload = payload;
      calls.push({ ...call });
      return chain;
    },
    delete: () => {
      call.op = "delete";
      return {
        in: (_col: string, ids: string[]) => {
          calls.push({ table, op: "delete", ids });
          return Promise.resolve(answer(`${table}.delete`));
        },
      };
    },
    eq: () => chain,
    order: () => chain,
    in: () => chain,
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(answer(`${table}.${call.op}`)).then(resolve),
  };

  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => builder(table) },
}));

import { saveCurriculum } from "./courseSave";

beforeEach(() => {
  calls.length = 0;
  responses.clear();
  // The curriculum currently on disk, unless a test says otherwise.
  responses.set("sections.select", { data: [], error: null });
});

describe("saveCurriculum", () => {
  it("creates new sections and chapters and returns their ids", async () => {
    responses.set("sections.insert", { data: [{ id: "sec-1" }], error: null });
    responses.set("chapters.insert", { data: [{ id: "ch-1" }], error: null });

    const saved = await saveCurriculum("course-1", [
      { title: "Day 1", chapters: [{ title: "Welcome", video_url: "https://v/1.mp4" }] },
    ]);

    expect(saved[0].id).toBe("sec-1");
    expect(saved[0].chapters[0].id).toBe("ch-1");
  });

  it("surfaces a refused insert instead of reporting success", async () => {
    responses.set("sections.insert", {
      data: null,
      error: { message: "new row violates row-level security policy" },
    });

    await expect(
      saveCurriculum("course-1", [{ title: "Day 1", chapters: [] }]),
    ).rejects.toThrow(/row-level security/);
  });

  it("treats an update that changed nothing as a failure", async () => {
    // An update RLS refuses is not an error — the row is simply invisible, so
    // PostgREST returns success with no rows. That used to read as "saved".
    responses.set("sections.select", { data: [{ id: "sec-1", chapters: [] }], error: null });
    responses.set("sections.update", { data: [], error: null });

    await expect(
      saveCurriculum("course-1", [{ id: "sec-1", title: "Day 1", chapters: [] }]),
    ).rejects.toThrow(/permission/i);
  });

  it("deletes chapters the editor dropped", async () => {
    responses.set("sections.select", {
      data: [{ id: "sec-1", chapters: [{ id: "ch-1" }, { id: "ch-2" }] }],
      error: null,
    });
    responses.set("sections.update", { data: [{ id: "sec-1" }], error: null });
    responses.set("chapters.update", { data: [{ id: "ch-1" }], error: null });

    await saveCurriculum("course-1", [
      { id: "sec-1", title: "Day 1", chapters: [{ id: "ch-1", title: "Kept" }] },
    ]);

    const deletes = calls.filter((c) => c.table === "chapters" && c.op === "delete");
    expect(deletes).toHaveLength(1);
    expect(deletes[0].ids).toEqual(["ch-2"]);
  });

  it("deletes sections the editor dropped", async () => {
    responses.set("sections.select", {
      data: [
        { id: "sec-1", chapters: [] },
        { id: "sec-2", chapters: [] },
      ],
      error: null,
    });
    responses.set("sections.update", { data: [{ id: "sec-1" }], error: null });

    await saveCurriculum("course-1", [{ id: "sec-1", title: "Day 1", chapters: [] }]);

    const deletes = calls.filter((c) => c.table === "sections" && c.op === "delete");
    expect(deletes[0].ids).toEqual(["sec-2"]);
  });

  it("renumbers rows by their position in the editor", async () => {
    responses.set("sections.select", { data: [], error: null });
    responses.set("sections.insert", { data: [{ id: "sec-1" }], error: null });
    responses.set("chapters.insert", { data: [{ id: "ch" }], error: null });

    await saveCurriculum("course-1", [
      { title: "Day 1", chapters: [{ title: "First" }, { title: "Second" }] },
    ]);

    const chapterWrites = calls.filter((c) => c.table === "chapters" && c.op === "insert");
    expect((chapterWrites[0].payload as { sort_order: number }).sort_order).toBe(0);
    expect((chapterWrites[1].payload as { sort_order: number }).sort_order).toBe(1);
  });

  it("leaves fields the editor does not track alone", async () => {
    // The builder knows nothing about content_type; writing undefined for it
    // would blank what the Curriculum tab set.
    responses.set("sections.insert", { data: [{ id: "sec-1" }], error: null });
    responses.set("chapters.insert", { data: [{ id: "ch-1" }], error: null });

    await saveCurriculum("course-1", [
      { title: "Day 1", chapters: [{ title: "Welcome" }] },
    ]);

    const payload = calls.find((c) => c.table === "chapters" && c.op === "insert")?.payload;
    expect(payload).not.toHaveProperty("content_type");
  });
});
