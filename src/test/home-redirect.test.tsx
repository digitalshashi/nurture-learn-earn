import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Landing on "/" used to bounce forever: HomeRedirect sent students to /feed,
// and /feed's community_feed gate sent them back to "/". React killed the tree
// with "Maximum update depth exceeded", which showed up as a blank white page
// right after login. These tests pin the routing down so it can't regress.

const state = {
  roles: [] as string[],
  perms: [] as { feature_key: string; enabled: boolean }[],
};

vi.mock("@/integrations/supabase/client", () => {
  const query = (table: string): any => {
    const rows =
      table === "user_roles"
        ? state.roles.map((role) => ({ role }))
        : table === "role_permissions"
        ? state.perms
        : [];
    const result = { data: rows, error: null };
    const chain: any = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") return (cb: any) => Promise.resolve(result).then(cb);
          return () => chain;
        },
      },
    );
    return chain;
  };

  return {
    supabase: {
      from: query,
      auth: {
        getSession: () =>
          Promise.resolve({ data: { session: { user: { id: "u1" } } } }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signOut: () => Promise.resolve({ error: null }),
      },
      channel: () => ({ on() { return this; }, subscribe() { return this; } }),
      removeChannel: () => {},
    },
  };
});

import { AuthProvider } from "@/contexts/AuthContext";
import { HomeRedirect } from "@/components/HomeRedirect";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// A miniature of the real route table: "/" plus the gated routes HomeRedirect
// can send someone to.
function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ProtectedRoute><HomeRedirect /></ProtectedRoute>} />
          <Route
            path="/feed"
            element={<ProtectedRoute featureKey="community_feed"><div>FEED</div></ProtectedRoute>}
          />
          <Route
            path="/courses"
            element={<ProtectedRoute featureKey="courses"><div>COURSES</div></ProtectedRoute>}
          />
          <Route
            path="/dashboard"
            element={<ProtectedRoute featureKey="dashboard"><div>DASHBOARD</div></ProtectedRoute>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// The loop manifests as React's "Maximum update depth exceeded", logged via
// console.error rather than thrown, so it has to be captured to be asserted on.
async function renderAndCaptureErrors() {
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: any[]) => errors.push(String(args[0]));

  const utils = renderApp();
  await waitFor(() =>
    expect(utils.container.innerHTML).not.toContain("animate-spin"),
  );

  console.error = original;
  return { ...utils, loopDetected: errors.some((e) => e.includes("Maximum update depth")) };
}

beforeEach(() => {
  state.roles = [];
  state.perms = [];
});

describe("HomeRedirect", () => {
  it("sends a student with community_feed to /feed", async () => {
    state.roles = ["student"];
    state.perms = [{ feature_key: "community_feed", enabled: true }];

    const { loopDetected } = await renderAndCaptureErrors();

    expect(await screen.findByText("FEED")).toBeInTheDocument();
    expect(loopDetected).toBe(false);
  });

  it("skips denied features and lands on the first one permitted", async () => {
    state.roles = ["student"];
    state.perms = [
      { feature_key: "community_feed", enabled: false },
      { feature_key: "courses", enabled: true },
    ];

    const { loopDetected } = await renderAndCaptureErrors();

    expect(await screen.findByText("COURSES")).toBeInTheDocument();
    expect(loopDetected).toBe(false);
  });

  it("sends an admin to /dashboard", async () => {
    state.roles = ["admin"];

    const { loopDetected } = await renderAndCaptureErrors();

    expect(await screen.findByText("DASHBOARD")).toBeInTheDocument();
    expect(loopDetected).toBe(false);
  });

  it("shows No access instead of looping when every feature is denied", async () => {
    state.roles = ["student"];
    state.perms = [{ feature_key: "community_feed", enabled: false }];

    const { loopDetected } = await renderAndCaptureErrors();

    expect(await screen.findByText("No access")).toBeInTheDocument();
    expect(loopDetected).toBe(false);
  });

  it("does not treat a user whose roles are still loading as unpermitted", async () => {
    // The old AuthContext cleared `loading` before fetchRoles() resolved, so a
    // permission check ran against roles=[] and denied an admin mid-load.
    state.roles = ["admin"];

    const { loopDetected } = await renderAndCaptureErrors();

    expect(screen.queryByText("No access")).not.toBeInTheDocument();
    expect(loopDetected).toBe(false);
  });
});
