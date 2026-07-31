import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, FeatureKey } from "@/hooks/usePermissions";

export function ProtectedRoute({
  children,
  featureKey,
}: {
  children: React.ReactNode;
  featureKey?: FeatureKey;
}) {
  const { user, loading } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();

  if (loading || (!!featureKey && !!user && permLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (featureKey && !hasPermission(featureKey)) return <Navigate to="/feed" replace />;
  return <>{children}</>;
}
