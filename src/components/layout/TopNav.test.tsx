import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "member@example.com", user_metadata: {} },
    roles: [],
    signOut: vi.fn(),
    hasRole: () => false,
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => true, permissions: {}, loading: false }),
}));

// One chain object standing in for every query the header makes: it answers to
// the builder methods and resolves to an empty result when awaited.
interface Chain {
  select: () => Chain;
  eq: () => Chain;
  or: () => Chain;
  limit: () => Chain;
  order: () => Chain;
  then: (resolve: (value: { data: never[]; count: number; error: null }) => unknown) => Promise<unknown>;
}

function makeChain(): Chain {
  const chain: Chain = {
    select: () => chain,
    eq: () => chain,
    or: () => chain,
    limit: () => chain,
    order: () => chain,
    then: (resolve) => Promise.resolve({ data: [] as never[], count: 0, error: null }).then(resolve),
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => makeChain(),
    rpc: () => Promise.resolve({ data: false, error: null }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => {},
  },
}));

import { SidebarProvider } from "@/components/ui/sidebar";
import { SearchProvider } from "@/contexts/SearchContext";
import { TopNav } from "./TopNav";

function renderTopNav({ sidebarOpen = true }: { sidebarOpen?: boolean } = {}) {
  return render(
    <MemoryRouter initialEntries={["/feed"]}>
      <SidebarProvider defaultOpen={sidebarOpen} persistState={false}>
        <SearchProvider>
          <TopNav />
        </SearchProvider>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("TopNav sidebar control", () => {
  it("offers to collapse while the sidebar is open", () => {
    renderTopNav({ sidebarOpen: true });
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand sidebar" })).toBeNull();
  });

  it("offers to expand while the sidebar is collapsed", () => {
    renderTopNav({ sidebarOpen: false });
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collapse sidebar" })).toBeNull();
  });

  it("toggles the sidebar and flips the label when clicked", () => {
    renderTopNav({ sidebarOpen: true });

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });
});

describe("TopNav search", () => {
  it("opens the universal search palette", async () => {
    renderTopNav();

    expect(screen.queryByPlaceholderText(/search pages/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/search pages/i)).toBeInTheDocument(),
    );
  });

  it("opens the palette on Ctrl+K from anywhere in the shell", async () => {
    renderTopNav();

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/search pages/i)).toBeInTheDocument(),
    );
  });
});
