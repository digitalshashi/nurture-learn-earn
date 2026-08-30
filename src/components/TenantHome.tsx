import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantDomain } from "@/hooks/useTenantDomain";
import { supabase } from "@/integrations/supabase/client";
import { HomeRedirect } from "@/components/HomeRedirect";
import { ProtectedRoute } from "@/components/ProtectedRoute";

/**
 * What the root of a white-label domain serves.
 *
 * A visitor who arrives on a tenant's own domain without an account should
 * meet that tenant's academy, not the platform's sign-in form — so when the
 * tenant has published a home page, that is what they get. Everyone who is
 * signed in, and every visitor on the platform's own address, follows the
 * ordinary routing.
 */
export function TenantHome() {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading } = useTenantDomain();
  const [html, setHtml] = useState<string | null>(null);
  const [looking, setLooking] = useState(true);

  useEffect(() => {
    let active = true;

    // Only an anonymous visitor on a tenant domain sees the home page; a
    // signed-in user came here to use the product.
    if (authLoading || tenantLoading || user || !tenant) {
      if (!authLoading && !tenantLoading) setLooking(false);
      return;
    }

    void (async () => {
      const { data } = await supabase
        .from("builder_pages")
        .select("html")
        .eq("coach_id", tenant.ownerId)
        .eq("is_tenant_home", true)
        .eq("status", "published")
        .maybeSingle();

      if (!active) return;
      setHtml((data as { html: string } | null)?.html?.trim() || null);
      setLooking(false);
    })();

    return () => {
      active = false;
    };
  }, [authLoading, tenantLoading, user, tenant]);

  if (authLoading || tenantLoading || looking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (html) {
    return (
      // Links out of the page have to work — that is how a visitor reaches
      // sign-in or a checkout — but scripts do not run and the frame has no
      // access to the app's origin.
      <iframe
        title={tenant?.domain ?? "Home"}
        sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        srcDoc={html}
        className="w-screen h-screen border-0 block"
      />
    );
  }

  return (
    <ProtectedRoute>
      <HomeRedirect />
    </ProtectedRoute>
  );
}

export default TenantHome;
