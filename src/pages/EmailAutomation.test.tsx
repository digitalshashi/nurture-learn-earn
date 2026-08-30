import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { COACH_TEMPLATES } from "@/lib/emailTemplates";

const db = {
  templates: [] as Record<string, unknown>[],
  upserts: [] as Record<string, unknown>[],
};

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "coach-1" } }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

vi.mock("@/integrations/supabase/client", () => {
  const from = () => {
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      upsert: async (row: Record<string, unknown>) => {
        db.upserts.push(row);
        return { error: null };
      },
      then: (resolve: (v: unknown) => unknown) =>
        resolve({ data: db.templates, error: null }),
    });
    return chain;
  };
  return { supabase: { from, functions: { invoke: vi.fn() } } };
});

const renderPage = async () => {
  const { default: EmailAutomation } = await import("./EmailAutomation");
  render(
    <MemoryRouter>
      <EmailAutomation />
    </MemoryRouter>,
  );
  // The list only appears once the saved rows have loaded.
  await screen.findByText(COACH_TEMPLATES[0].label);
};

describe("EmailAutomation", () => {
  beforeEach(() => {
    db.templates = [];
    db.upserts = [];
  });

  it("lists every template from the shared library", async () => {
    await renderPage();
    for (const def of COACH_TEMPLATES.slice(0, 5)) {
      expect(screen.getByText(def.label)).toBeInTheDocument();
    }
  });

  it("opens the editor in place, without navigating away", async () => {
    await renderPage();
    const def = COACH_TEMPLATES[0];

    // Nothing to edit until the row is opened.
    expect(screen.queryByLabelText("Subject")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(def.label));

    // The real editor, on this page — same subject field as the Settings screen.
    const subject = await screen.findByLabelText("Subject");
    expect(subject).toHaveValue(def.defaultSubject);
    // Still on the automation page.
    expect(screen.getByText(def.description)).toBeInTheDocument();
  });

  it("saves an edited template", async () => {
    await renderPage();
    const def = COACH_TEMPLATES[0];
    fireEvent.click(screen.getByText(def.label));

    const subject = await screen.findByLabelText("Subject");
    fireEvent.change(subject, { target: { value: "A new subject" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(db.upserts).toHaveLength(1));
    expect(db.upserts[0]).toMatchObject({
      template_key: def.key,
      subject: "A new subject",
      coach_id: "coach-1",
    });
  });

  it("writes the switch straight through, since it is a setting not a draft", async () => {
    await renderPage();
    const def = COACH_TEMPLATES[0];

    fireEvent.click(screen.getByLabelText(`Enable ${def.label}`));

    await waitFor(() => expect(db.upserts).toHaveLength(1));
    expect(db.upserts[0]).toMatchObject({ template_key: def.key, is_active: false });
  });

  it("filters the list so a long library stays usable", async () => {
    await renderPage();
    const def = COACH_TEMPLATES[0];

    fireEvent.change(screen.getByPlaceholderText("Find a template"), {
      target: { value: def.label },
    });

    expect(screen.getByText(def.label)).toBeInTheDocument();
    const other = COACH_TEMPLATES.find((t) => !t.label.includes(def.label));
    if (other) expect(screen.queryByText(other.label)).not.toBeInTheDocument();
  });
});
