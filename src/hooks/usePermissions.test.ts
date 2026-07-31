import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockAuth = vi.hoisted(() => ({ current: { user: null as any, roles: [] as string[] } }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth.current,
}));

const mockEq = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: mockEq,
      }),
    }),
  },
}));

import { usePermissions } from "./usePermissions";

describe("usePermissions", () => {
  beforeEach(() => {
    mockEq.mockReset();
    mockEq.mockResolvedValue({ data: [{ feature_key: "courses", enabled: true }], error: null });
  });

  it("grants every feature to super_admin without querying enabled flags", async () => {
    mockAuth.current = { user: { id: "u1" }, roles: ["super_admin"] };
    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPermission("crm")).toBe(true);
    expect(result.current.hasPermission("courses")).toBe(true);
  });

  it("grants every feature to admin", async () => {
    mockAuth.current = { user: { id: "u1" }, roles: ["admin"] };
    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPermission("automation")).toBe(true);
  });

  it("only grants features explicitly enabled for a student", async () => {
    mockAuth.current = { user: { id: "u1" }, roles: ["student"] };
    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPermission("courses")).toBe(true);
    expect(result.current.hasPermission("crm")).toBe(false);
  });

  it("stops loading immediately when there is no user", async () => {
    mockAuth.current = { user: null, roles: [] };
    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPermission("courses")).toBe(false);
  });
});
