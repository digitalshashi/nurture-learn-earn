import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  brand_color: string;
  custom_domain: string | null;
  owner_id: string;
  is_active: boolean;
}

interface CommunityContextType {
  communities: Community[];
  activeCommunity: Community | null;
  setActiveCommunity: (community: Community) => void;
  loading: boolean;
  memberRole: string | null;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunityState] = useState<Community | null>(null);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCommunities([]);
      setActiveCommunityState(null);
      setMemberRole(null);
      setLoading(false);
      return;
    }
    loadCommunities();
  }, [user]);

  useEffect(() => {
    if (activeCommunity && user) {
      loadMemberRole();
    }
  }, [activeCommunity, user]);

  const loadCommunities = async () => {
    setLoading(true);
    // Get communities user is a member of
    const { data: memberships } = await supabase
      .from("community_members")
      .select("community_id, role")
      .eq("user_id", user!.id);

    if (memberships && memberships.length > 0) {
      const communityIds = memberships.map((m: any) => m.community_id);
      const { data: comms } = await supabase
        .from("communities")
        .select("*")
        .in("id", communityIds)
        .eq("is_active", true);

      if (comms) {
        setCommunities(comms as Community[]);
        // Restore last active community from localStorage
        const lastSlug = localStorage.getItem("active_community_slug");
        const last = comms.find((c: any) => c.slug === lastSlug);
        if (last) {
          setActiveCommunityState(last as Community);
        } else if (comms.length === 1) {
          setActiveCommunityState(comms[0] as Community);
        }
      }
    }
    setLoading(false);
  };

  const loadMemberRole = async () => {
    if (!activeCommunity || !user) return;
    const { data } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", activeCommunity.id)
      .eq("user_id", user.id)
      .single();
    setMemberRole(data?.role ?? null);
  };

  const setActiveCommunity = (community: Community) => {
    setActiveCommunityState(community);
    localStorage.setItem("active_community_slug", community.slug);
  };

  return (
    <CommunityContext.Provider value={{ communities, activeCommunity, setActiveCommunity, loading, memberRole }}>
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity must be used within CommunityProvider");
  return ctx;
}
