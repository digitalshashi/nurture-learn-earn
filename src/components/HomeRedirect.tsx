import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function HomeRedirect() {
  const { hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  // Coaches and admins go to dashboard; students go to feed
  const isCoachOrAdmin = hasRole("coach") || hasRole("admin") || hasRole("super_admin");
  return <Navigate to={isCoachOrAdmin ? "/dashboard" : "/feed"} replace />;
}
