/**
 * /r/:code — where a shared referral link lands.
 *
 * The click has already been recorded by useReferralCapture at the app root,
 * so this page's only job is to tell the visitor what they walked into and
 * send them onward. It renders something rather than redirecting instantly
 * because a link that flashes and bounces reads as broken, and because the
 * offer is the reason they should sign up rather than close the tab.
 *
 * Someone already signed in is not a new referral; they get sent to their own
 * Refer & Earn page instead, which is the useful thing to show them.
 */
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { BRAND } from "@/lib/brand";
import { normaliseCode } from "@/lib/referral";
import { ArrowRight, Gift, Loader2 } from "lucide-react";

interface Program {
  is_active: boolean;
  signup_reward: number;
  purchase_percent: number;
  currency: string;
  terms: string | null;
}

export default function ReferralLanding() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  const clean = normaliseCode(code);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("referral_program")
        .select("is_active, signup_reward, purchase_percent, currency, terms")
        .maybeSingle();
      if (!cancelled) {
        setProgram(data as Program | null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!authLoading && user) return <Navigate to="/referral/invite" replace />;

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-accent/5 to-background px-6 py-16">
      <div className="w-full max-w-md text-center">
        <BrandMark className="mx-auto mb-8 h-9" />

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
          <Gift className="h-7 w-7 text-accent" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          You were invited to {BRAND.name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {program?.is_active
            ? "Create your account and your friend gets credited for bringing you in — at no cost to you."
            : `Create your account to start learning on ${BRAND.name}.`}
        </p>

        {program?.terms && (
          <p className="mt-4 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
            {program.terms}
          </p>
        )}

        <Button
          size="lg"
          className="mt-8 h-12 w-full rounded-xl text-base font-bold"
          onClick={() => navigate("/login?mode=signup")}
        >
          Create my account <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>

        <button
          onClick={() => navigate("/login")}
          className="mt-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          I already have an account
        </button>

        {clean && (
          <p className="mt-8 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Invite code {clean}
          </p>
        )}
      </div>
    </div>
  );
}
