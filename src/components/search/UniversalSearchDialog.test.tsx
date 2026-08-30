import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { FeatureKey } from "@/hooks/usePermissions";

const authState = { roles: [] as string[] };
const permissionState = { allowed: new Set<string>() };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ roles: authState.roles, hasRole: (r: string) => authState.roles.includes(r) }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: (k: FeatureKey) => permissionState.allowed.has(k),
    permissions: {},
    loading: false,
  }),
}));

// The palette runs one query per permitted table; none of these tests depend on
// rows coming back, so every query resolves empty.
const limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ or: () => ({ limit }) }) }),
  },
}));

import { UniversalSearchDialog } from "./UniversalSearchDialog";

function open() {
  return render(
    <MemoryRouter>
      <UniversalSearchDialog open onOpenChange={() => {}} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.roles = [];
  permissionState.allowed = new Set();
  limit.mockClear();
});

describe("UniversalSearchDialog destinations", () => {
  it("lists a destination the user has permission for", () => {
    permissionState.allowed = new Set(["community_feed", "messages"]);
    open();

    expect(screen.getByText("Feed")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
  });

  it("hides destinations the user has no permission for", () => {
    permissionState.allowed = new Set(["community_feed"]);
    open();

    // CRM is permission-gated and not granted here.
    expect(screen.queryByText("Pipelines")).toBeNull();
    expect(screen.queryByText("Meta Leads")).toBeNull();
  });

  it("keeps the admin screens out of reach for a member", () => {
    permissionState.allowed = new Set(["community_feed"]);
    open();

    expect(screen.queryByText("Admin panel")).toBeNull();
    expect(screen.queryByText("Super admin")).toBeNull();
  });

  it("offers the admin screens to the roles that own them", () => {
    authState.roles = ["admin"];
    permissionState.allowed = new Set(["community_feed"]);
    open();

    expect(screen.getByText("Admin panel")).toBeInTheDocument();
    expect(screen.getByText("Super admin")).toBeInTheDocument();
  });

  it("still gives a user with no feature permissions something to search", () => {
    // Every signed-in user reaches their own account, so the palette is never
    // an empty box even for the most restricted role.
    open();
    expect(screen.getByText("My account")).toBeInTheDocument();
  });

  it("indexes settings screens, not just top-level pages", () => {
    permissionState.allowed = new Set(["my_settings"]);
    open();
    expect(screen.getByText("Payment gateways")).toBeInTheDocument();
  });
});

describe("UniversalSearchDialog content search", () => {
  it("runs no query until the term is long enough to be worth one", async () => {
    permissionState.allowed = new Set(["courses"]);
    open();

    await waitFor(() => expect(limit).not.toHaveBeenCalled());
  });
});
