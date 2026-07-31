import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FeatureKey =
  | "community_feed" | "messages" | "channels" | "leaderboard" | "events"
  | "courses" | "workshops" | "services" | "dashboard" | "analytics"
  | "sales" | "page_builder" | "crm" | "customers" | "marketing"
  | "automation" | "partnerships" | "affiliate" | "gamification" | "levelup"
  | "ai_suite" | "platform_settings" | "security_settings" | "team_management"
  | "cloud_storage" | "billing" | "referral" | "certificates" | "quest"
  | "create_post" | "create_channels" | "my_settings"
  | "video_library" | "navigation_settings" | "support" | "growth";

interface PermissionRecord {
  feature_key: string;
  enabled: boolean;
}

export function usePermissions() {
  const { user, roles } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || roles.length === 0) {
      setLoading(false);
      return;
    }

    const highestRole = roles.includes("super_admin" as any)
      ? "super_admin"
      : roles.includes("admin" as any)
      ? "admin"
      : roles.includes("coach" as any)
      ? "coach"
      : "student";

    const fetchPermissions = async () => {
      const { data, error } = await supabase
        .from("role_permissions" as any)
        .select("feature_key, enabled")
        .eq("role", highestRole);

      if (data && !error) {
        const perms: Record<string, boolean> = {};
        (data as any[]).forEach((r: PermissionRecord) => {
          perms[r.feature_key] = r.enabled;
        });
        setPermissions(perms);
      }
      setLoading(false);
    };

    fetchPermissions();

    // Real-time: reflect permission changes for this role immediately in
    // every already-open session, instead of requiring a reload.
    const channel = supabase
      .channel(`role_permissions_${highestRole}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "role_permissions", filter: `role=eq.${highestRole}` },
        () => fetchPermissions(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roles]);

  const hasPermission = (featureKey: FeatureKey): boolean => {
    if (roles.includes("super_admin" as any) || roles.includes("admin" as any)) return true;
    return permissions[featureKey] ?? false;
  };

  return { permissions, hasPermission, loading };
}

// Fetch all permissions for a given role (used in admin settings)
export async function fetchRolePermissions(role: string) {
  const { data, error } = await supabase
    .from("role_permissions" as any)
    .select("*")
    .eq("role", role)
    .order("feature_key");
  if (error) throw error;
  return data as any[];
}

// Toggle a permission for a role
export async function togglePermission(
  role: string,
  featureKey: string,
  enabled: boolean,
  changedBy: string
) {
  // Get old value first
  const { data: existing } = await supabase
    .from("role_permissions" as any)
    .select("enabled")
    .eq("role", role)
    .eq("feature_key", featureKey)
    .maybeSingle();

  const oldValue = existing ? (existing as any).enabled : null;

  // Update permission
  const { error } = await supabase
    .from("role_permissions" as any)
    .update({ enabled, updated_at: new Date().toISOString() } as any)
    .eq("role", role)
    .eq("feature_key", featureKey);

  if (error) throw error;

  // Log the change
  await supabase.from("permission_audit_log" as any).insert({
    role,
    feature_key: featureKey,
    old_value: oldValue,
    new_value: enabled,
    changed_by: changedBy,
  } as any);
}
