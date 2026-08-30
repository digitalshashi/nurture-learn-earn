import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const HOUR = 60 * 60 * 1000;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const db = {
  events: [] as any[],
  eventRegistrations: [] as any[],
  inserts: [] as { table: string; row: any }[],
  deletes: [] as { table: string; filters: Record<string, unknown> }[],
};

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// The user object is intentionally a fresh literal on every call: the page must
// key its data effect on user.id, not on object identity, or it refetches in a
// loop. An earlier revision did exactly that and hung the test run.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const rowsFor = (table: string) => {
    if (table === "events") return db.events;
    if (table === "event_registrations") return db.eventRegistrations;
    return [];
  };

  const from = (table: string) => {
    const filters: Record<string, unknown> = {};
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        filters[col] = val;
        return chain;
      },
      gte: () => chain,
      lte: () => chain,
      order: () => chain,
      insert: (row: any) => {
        db.inserts.push({ table, row });
        return Promise.resolve({ error: null });
      },
      delete: () => {
        const del: any = {
          eq: (col: string, val: unknown) => {
            filters[col] = val;
            return del;
          },
          then: (cb: (r: unknown) => unknown) => {
            db.deletes.push({ table, filters: { ...filters } });
            return Promise.resolve({ error: null }).then(cb);
          },
        };
        return del;
      },
      then: (cb: (r: unknown) => unknown) =>
        Promise.resolve({ data: rowsFor(table), error: null }).then(cb),
    };
    return chain;
  };

  return { supabase: { from } };
});

import StudentEvents from "./StudentEvents";

beforeEach(() => {
  db.events = [];
  db.eventRegistrations = [];
  db.inserts = [];
  db.deletes = [];
});

const anEvent = (over: Record<string, unknown> = {}) => ({
  id: "e1",
  title: "Weekly Q&A",
  description: null,
  meeting_link: "https://meet.example.com/abc",
  meeting_type: "zoom",
  start_time: iso(24 * HOUR),
  end_time: iso(25 * HOUR),
  recurring: false,
  occurrence_number: null,
  total_occurrences: null,
  course_id: null,
  ...over,
});

const tab = (name: RegExp) => screen.getByRole("tab", { name });

describe("StudentEvents", () => {
  it("lists an upcoming event", async () => {
    db.events = [anEvent()];
    render(
      <MemoryRouter>
        <StudentEvents />
      </MemoryRouter>,
    );

    // Appears twice by design: once in the "Next up" banner, once as a card.
    await waitFor(() => expect(screen.getAllByText("Weekly Q&A").length).toBeGreaterThan(0));
    expect(tab(/Upcoming \(1\)/)).toBeInTheDocument();
  });

  it("starts with an empty My Events tab", async () => {
    db.events = [anEvent()];
    render(
      <MemoryRouter>
        <StudentEvents />
      </MemoryRouter>,
    );

    await waitFor(() => expect(tab(/My Events \(0\)/)).toBeInTheDocument());
  });

  it("counts an already-registered event in My Events", async () => {
    db.events = [anEvent()];
    db.eventRegistrations = [{ event_id: "e1", user_id: "u1" }];

    render(
      <MemoryRouter>
        <StudentEvents />
      </MemoryRouter>,
    );

    await waitFor(() => expect(tab(/My Events \(1\)/)).toBeInTheDocument());
    expect(screen.getByText("Registered")).toBeInTheDocument();
  });

  it("registers on click and records the row", async () => {
    db.events = [anEvent()];
    render(
      <MemoryRouter>
        <StudentEvents />
      </MemoryRouter>,
    );

    const button = await screen.findByRole("button", { name: /Register/ });
    fireEvent.click(button);

    await waitFor(() =>
      expect(db.inserts).toContainEqual({
        table: "event_registrations",
        row: { event_id: "e1", user_id: "u1" },
      }),
    );
    await waitFor(() => expect(tab(/My Events \(1\)/)).toBeInTheDocument());
  });

  it("cancels an existing registration", async () => {
    db.events = [anEvent()];
    db.eventRegistrations = [{ event_id: "e1", user_id: "u1" }];

    render(
      <MemoryRouter>
        <StudentEvents />
      </MemoryRouter>,
    );

    const button = await screen.findByRole("button", { name: /Cancel/ });
    fireEvent.click(button);

    await waitFor(() => expect(db.deletes.length).toBe(1));
    expect(db.deletes[0].filters).toMatchObject({ event_id: "e1", user_id: "u1" });
    await waitFor(() => expect(tab(/My Events \(0\)/)).toBeInTheDocument());
  });

  it("counts a finished event as completed, not upcoming", async () => {
    db.events = [anEvent({ start_time: iso(-3 * HOUR), end_time: iso(-2 * HOUR) })];
    render(
      <MemoryRouter>
        <StudentEvents />
      </MemoryRouter>,
    );

    await waitFor(() => expect(tab(/Completed \(1\)/)).toBeInTheDocument());
    expect(tab(/Upcoming \(0\)/)).toBeInTheDocument();
  });

  it("marks an in-progress event as live", async () => {
    db.events = [anEvent({ start_time: iso(-10 * 60 * 1000), end_time: iso(HOUR) })];
    render(
      <MemoryRouter>
        <StudentEvents />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Live now")).toBeInTheDocument();
  });

  it("does not refetch in a loop when the auth object identity changes", async () => {
    db.events = [anEvent()];
    render(
      <MemoryRouter>
        <StudentEvents />
      </MemoryRouter>,
    );

    await waitFor(() => expect(tab(/Upcoming \(1\)/)).toBeInTheDocument());

    const settled = db.inserts.length;
    await new Promise((r) => setTimeout(r, 150));
    expect(db.inserts.length).toBe(settled);
    expect(tab(/Upcoming \(1\)/)).toBeInTheDocument();
  });
});
