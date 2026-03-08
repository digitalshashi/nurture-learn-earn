import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCommunity } from "@/contexts/CommunityContext";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function CommunityRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { communities, activeCommunity, setActiveCommunity, loading: commLoading } = useCommunity();
  const { slug } = useParams<{ slug: string }>();

  // Sync active community with URL slug
  useEffect(() => {
    if (slug && communities.length > 0) {
      const match = communities.find((c) => c.slug === slug);
      if (match && match.id !== activeCommunity?.id) {
        setActiveCommunity(match);
      }
    }
  }, [slug, communities]);

  if (authLoading || commLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // If slug doesn't match any community user belongs to
  const match = communities.find((c) => c.slug === slug);
  if (!match) return <Navigate to="/communities" replace />;

  return <>{children}</>;
}
