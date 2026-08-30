import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, FeatureKey } from "@/hooks/usePermissions";
import { NoAccess } from "@/components/NoAccess";

// Every candidate is paired with the featureKey its route is gated on in
// App.tsx. Only landing somewhere the permission check will pass is what keeps
// "/" from bouncing straight back here.
const LANDINGS: { path: string; feature: FeatureKey }[] = [
  { path: "/feed", feature: "community_feed" },
  { path: "/courses", feature: "courses" },
  { path: "/messages", feature: "messages" },
  { path: "/leaderboard", feature: "leaderboard" },
  { path: "/settings", feature: "my_settings" },
  { path: "/support", feature: "support" },
];

const DASHBOARD: { path: string; feature: FeatureKey } = {
  path: "/dashboard",
  feature: "dashboard",
};

export function HomeRedirect() {
  const { hasRole, loading } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();

  if (loading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  // Coaches and admins prefer the dashboard; students prefer the feed. Either
  // way, fall through to whatever they can actually open.
  const isCoachOrAdmin = hasRole("coach") || hasRole("admin") || hasRole("super_admin");
  const candidates = isCoachOrAdmin ? [DASHBOARD, ...LANDINGS] : [...LANDINGS, DASHBOARD];

  const target = candidates.find((c) => hasPermission(c.feature));
  if (!target) return <NoAccess />;

  return <Navigate to={target.path} replace />;
}
