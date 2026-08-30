/**
 * /referral — the affiliates dashboard.
 *
 * This replaces two half-finished screens with one. /referral was a real
 * Refer & Earn page for the platform-wide invite bonus — that still exists, at
 * /referral/invite, and is linked from the header here. /affiliate was this
 * layout drawn over tables nothing wrote to: the filters filtered nothing, the
 * Membership column was the literal string "Course", and the click counter ran
 * one query per link on every load. Both routes now land here.
 *
 * The three tabs answer three different questions and are deliberately not
 * merged: Memberships is "what can I sell and what do I get", Sales is "who
 * bought", Payments is "have I been paid". An affiliate visits for exactly one
 * of those at a time, which is why the active one lives in the URL — a link to
 * this page can point at the section it is actually about.
 *
 * Everything on screen comes from RPCs scoped to auth.uid(). There is no user
 * id anywhere in this file, and no query that could be pointed at one.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankDetailsBanner, BankDetailsDialog } from "@/components/affiliate/BankDetailsDialog";
import { MembershipsTab } from "@/components/affiliate/MembershipsTab";
import { PaymentsTab } from "@/components/affiliate/PaymentsTab";
import { SalesTab } from "@/components/affiliate/SalesTab";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBankDetails } from "@/hooks/useBankDetails";
import { useTabParam } from "@/hooks/useTabParam";
import { fetchAffiliatePayments, fetchAffiliateProducts } from "@/lib/affiliate/api";
import { maskAccount } from "@/lib/affiliate/link";
import type {
  AffiliatePaymentsResponse,
  AffiliateProductsResponse,
} from "@/lib/affiliate/types";
import { Gift, Landmark, Loader2 } from "lucide-react";

const TAB_STYLE =
  "rounded-none border-b-2 border-transparent px-4 pb-2 data-[state=active]:border-accent " +
  "data-[state=active]:text-accent data-[state=active]:shadow-none";

const NO_PRODUCTS: AffiliateProductsResponse = { affiliate_code: null, products: [] };
const NO_PAYMENTS: AffiliatePaymentsResponse = { rows: [], totals: { paid: 0, due: 0 } };

export default function AffiliateDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useTabParam(["memberships", "sales", "payments"] as const);

  const [products, setProducts] = useState<AffiliateProductsResponse>(NO_PRODUCTS);
  const [payments, setPayments] = useState<AffiliatePaymentsResponse>(NO_PAYMENTS);
  const [loading, setLoading] = useState(true);

  const { details: bank, setDetails: setBank, loading: bankLoading } = useBankDetails();
  const [bankOpen, setBankOpen] = useState(false);
  // Per session rather than remembered: the thing this warns about — unpaid
  // commission piling up — does not go away by being acknowledged once.
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // The origin is read here rather than in each card so a test, or a future
  // server render, has one place to substitute.
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const load = useCallback(async () => {
    const [nextProducts, nextPayments] = await Promise.all([
      fetchAffiliateProducts(),
      fetchAffiliatePayments(),
    ]);
    setProducts(nextProducts);
    setPayments(nextPayments);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, load]);

  // A sale and its payout can land within a second of each other; one refetch
  // answers both.
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => void load(), 400);
  }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`affiliate:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "affiliate_sales",
          filter: `user_id=eq.${user.id}`,
        },
        scheduleRefetch,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "affiliate_payouts",
          filter: `user_id=eq.${user.id}`,
        },
        scheduleRefetch,
      )
      .subscribe();

    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [user, scheduleRefetch]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const showBanner = !bankLoading && !bank.has_details && !bannerDismissed;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6">
        {showBanner && (
          <BankDetailsBanner
            onAdd={() => setBankOpen(true)}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-bold">Affiliates dashboard</h1>

          <div className="flex flex-wrap items-center gap-2">
            {/* Once details are on file the warning goes, but the member still
                needs a way back in to change the account. */}
            {bank.has_details && (
              <Button variant="ghost" size="sm" onClick={() => setBankOpen(true)}>
                <Landmark className="mr-1.5 h-4 w-4" />
                {bank.bank_name || "Bank"} {maskAccount(bank.account_last4)}
              </Button>
            )}
            {/* Refer & Earn is a different offer — a platform-wide invite bonus
                rather than a per-product commission — and moved here when this
                dashboard took over /referral. */}
            <Button variant="outline" size="sm" asChild>
              <Link to="/referral/invite">
                <Gift className="mr-1.5 h-4 w-4" /> Refer &amp; Earn
              </Link>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-auto rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="memberships" className={TAB_STYLE}>
              Memberships
            </TabsTrigger>
            <TabsTrigger value="sales" className={TAB_STYLE}>
              Sales
            </TabsTrigger>
            <TabsTrigger value="payments" className={TAB_STYLE}>
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="memberships">
            <MembershipsTab products={products.products} origin={origin} />
          </TabsContent>

          <TabsContent value="sales">
            <SalesTab products={products.products} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTab data={payments} />
          </TabsContent>
        </Tabs>
      </div>

      <BankDetailsDialog
        open={bankOpen}
        onOpenChange={setBankOpen}
        details={bank}
        onSaved={setBank}
      />
    </AppLayout>
  );
}
