import { Navigate } from "react-router-dom";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { usePermissions, FeatureKey } from "@/hooks/usePermissions";
import { NoAccess } from "@/components/NoAccess";

export function ProtectedRoute({
  children,
  featureKey,
  blockRoles,
}: {
  children: React.ReactNode;
  featureKey?: FeatureKey;
  /**
   * Roles that can never open this route, regardless of `role_permissions`.
   * Some destinations (payment gateway keys, AI provider keys, Zoom
   * secrets, full event CRUD) are sensitive enough that they shouldn't be
   * reachable just because an admin misconfigures a shared feature flag —
   * this is a hard floor under the permission system, not a replacement
   * for it.
   */
  blockRoles?: AppRole[];
}) {
  const { user, loading, roles } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();

  if (loading || (!!featureKey && !!user && permLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (blockRoles && roles.some((r) => blockRoles.includes(r))) return <NoAccess />;
  if (featureKey && !hasPermission(featureKey)) return <NoAccess feature={featureKey} />;
  return <>{children}</>;
}
