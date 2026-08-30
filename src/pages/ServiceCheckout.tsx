import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, Tag, ShieldCheck, ChevronDown, CreditCard, Smartphone, Wallet, Share2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSeo } from "@/hooks/useSeo";
import { serviceMeta } from "@/lib/seo";
import { BRAND } from "@/lib/brand";
import { pendingAffiliate } from "@/lib/affiliate/link";
import { ShareDialog } from "@/components/share/ShareDialog";
import {
  PAYMENT_PROVIDERS,
  pickDefaultGateway,
  type GatewayRow,
  type PaymentProvider,
} from "@/lib/paymentProviders";
import { symbolFor } from "@/lib/currency";
import { RichText } from "@/components/ui/rich-text";
import { track } from "@/lib/track";
import { waitForServiceAccess, PENDING_PAYMENT_MESSAGE } from "@/lib/paymentFulfilment";
// Aliased: this page already has a `toast` from useToast, and these two are
// different surfaces. Field problems go to Sonner, bottom right.
import { toast as sonnerToast } from "@/components/ui/sonner";
import { playAttentionChime } from "@/lib/notifySound";
import { shakeElement } from "@/lib/shake";
import { cn } from "@/lib/utils";

interface ServiceData {
  id: string;
  /** Preferred over the id in every public link. */
  slug: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  price: number;
  discounted_price: number | null;
  currency: string;
  is_free: boolean;
  enable_subscription: boolean;
  subscription_interval: string | null;
  subscription_price: number | null;
  enable_terms: boolean;
  terms_conditions: string | null;
  custom_fields: any[] | null;
  collect_address: boolean;
  collect_gst: boolean;
  coach_id: string;
  status: string;
  advanced_settings: { payment_methods?: Record<string, boolean> } | null;
}

/** Shape returned by create-payment-order for the Razorpay modal flow. */
interface RazorpayOrder {
  key_id: string;
  order_id: string;
  amount: number;
  currency?: string;
}

interface LinkedCourse {
  course_id: string;
  courses: { title: string; thumbnail_url: string | null } | null;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * How a field looks once it is the thing standing between the buyer and paying.
 *
 * ring-inset because these inputs are borderless and flush against their
 * container: an outset ring would be clipped by the rounded panel.
 */
const INVALID_FIELD = "ring-1 ring-inset ring-destructive/70 bg-destructive/5";

/**
 * The message under a field.
 *
 * This is the part that actually answers "which one?" — a toast can say
 * something is missing, but only this says where. role="alert" so it is also
 * announced rather than merely coloured.
 */
function FieldError({
  id,
  message,
  className,
}: {
  id: string;
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "flex items-center gap-1.5 px-4 pb-2 pt-1 text-[11px] font-medium text-destructive",
        className,
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  );
}

export default function ServiceCheckout() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [service, setService] = useState<ServiceData | null>(null);
  // A product panel designed in the page builder replaces the default one.
  // The payment column beside it is never generated, so a design can not
  // break a payment.
  const [customPanel, setCustomPanel] = useState<string | null>(null);
  const [courses, setCourses] = useState<LinkedCourse[]>([]);
  const [coachName, setCoachName] = useState("");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  // Gateways this coach has connected, and the one the buyer will pay with.
  const [gateways, setGateways] = useState<GatewayRow[]>([]);
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  // Which fields are wrong, keyed the same way validateFields reports them.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // So the first offending field can be scrolled to and focused.
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  // The whole row shakes, not just the input — otherwise the phone field's
  // "+91" would sit still while the box beside it moves.
  const fieldRowRefs = useRef<Record<string, HTMLElement | null>>({});

  // The edge Worker has already written these tags for the crawler; this keeps
  // the tab title and the in-app history entry saying the same thing.
  const seo = service
    ? serviceMeta(service, window.location.origin, { coachName })
    : null;
  useSeo(seo);

  useEffect(() => {
    loadService();
    loadRazorpayScript();
  }, [idOrSlug]);

  useEffect(() => {
    if (service && user) checkExistingPurchase();
    if (user) {
      setBillingName(user.user_metadata?.full_name || "");
      setBillingEmail(user.email || "");
      setBillingPhone(user.phone || "");
    }
  }, [service, user]);

  const loadRazorpayScript = () => {
    if (window.Razorpay) { setRazorpayLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  };

  const loadService = async () => {
    if (!idOrSlug) return;
    let { data } = await supabase
      .from("services")
      .select("*")
      .eq("slug", idOrSlug)
      .eq("status", "active")
      .maybeSingle();

    if (!data) {
      ({ data } = await supabase
        .from("services")
        .select("*")
        .eq("id", idOrSlug)
        .eq("status", "active")
        .maybeSingle());
    }

    if (!data) { setLoading(false); return; }
    setService(data as any);

    const [{ data: sc }, { data: profile }, { data: gw }, { data: designed }] = await Promise.all([
      supabase.from("service_courses").select("course_id, courses(title, thumbnail_url)").eq("service_id", data.id),
      supabase.from("profiles").select("full_name").eq("id", data.coach_id).single(),
      // A curated view, not the gateways table. The table's only public
      // policy is TO anon, so a buyer who signs in to pay stops matching it
      // and the page decides the coach has no gateway at all. The view also
      // exposes no key of any kind.
      supabase
        .from("coach_payment_methods")
        .select("provider, environment, currency, is_default")
        .eq("coach_id", data.coach_id),
      supabase
        .from("builder_pages")
        .select("html")
        .eq("service_id", data.id)
        .eq("page_type", "checkout")
        .eq("status", "published")
        .maybeSingle(),
    ]);
    setCustomPanel((designed as { html: string } | null)?.html?.trim() || null);

    // Recorded once the owner is known. Without this there is no denominator
    // for a conversion rate, which is why that number used to be invented.
    void track({
      coachId: data.coach_id,
      event: "checkout_view",
      subjectType: "service",
      subjectId: data.id,
      userId: user?.id ?? null,
    });
    setCourses((sc as any) || []);
    setCoachName(profile?.full_name || "Coach");

    // The view already filters to gateways that are enabled *and* fully
    // configured, so every row it returns is payable. The credential fields
    // exist only to satisfy the shared readiness check, which is written
    // against the coach's own settings row; the real check is server-side in
    // create-payment-order, where the credentials actually live.
    const rows = ((gw || []) as unknown as GatewayRow[]).map((g) => ({
      ...g,
      is_enabled: true,
      key_id: "configured",
      has_secret: true,
    }));
    setGateways(rows);
    setProvider(pickDefaultGateway(rows)?.provider ?? null);
    setLoading(false);
  };

  const checkExistingPurchase = async () => {
    if (!service || !user) return;
    const { data } = await supabase
      .from("service_users")
      .select("id")
      .eq("service_id", service.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setAlreadyPurchased(true);
  };

  /**
   * Fields the coach marked required were rendered with an asterisk but never
   * enforced, so a purchase could complete without the details the coach needs
   * to deliver the service.
   */
  /** Key for a coach-defined field, namespaced so it cannot clash with a billing one. */
  const customFieldKey = (label: string) => `custom:${label}`;

  /**
   * Every problem with the form, in the order the fields appear.
   *
   * All of them rather than just the first: telling someone their name is
   * missing, then their phone, then a custom field, one reload at a time, is
   * three round trips for information they could have fixed in one pass.
   */
  const validateFields = (): { key: string; message: string }[] => {
    const problems: { key: string; message: string }[] = [];

    // Contact details are not optional: for a buyer with no account they are
    // the only way to reach them afterwards, and the account is created from
    // them once the payment clears.
    if (!billingName.trim()) {
      problems.push({ key: "name", message: "Enter your full name" });
    }

    const email = billingEmail.trim();
    if (!email) {
      problems.push({ key: "email", message: "Enter your email address" });
    } else if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
      problems.push({ key: "email", message: "That email address doesn't look right" });
    }

    if (billingPhone.replace(/\D/g, "").length < 6) {
      problems.push({ key: "phone", message: "Enter a valid phone number" });
    }

    for (const f of (service?.custom_fields as any[] | null) || []) {
      if (f.hidden || f.required === false) continue;
      if (!customFieldValues[f.label]?.trim()) {
        problems.push({
          key: customFieldKey(f.label),
          message: `${f.label} is required`,
        });
      }
    }

    return problems;
  };

  /** Drops a field's error the moment the buyer starts fixing it. */
  const clearFieldError = (key: string) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  /**
   * Marks the offending fields, says so once, and puts the cursor on the first
   * one. The toast alone left people hunting down a form for the field it meant.
   */
  const reportProblems = (problems: { key: string; message: string }[]) => {
    setFieldErrors(Object.fromEntries(problems.map((p) => [p.key, p.message])));
    playAttentionChime();
    // Every offending row, not only the focused one, so the count in the toast
    // matches what the eye can find on the form.
    for (const problem of problems) shakeElement(fieldRowRefs.current[problem.key]);

    const [first] = problems;
    sonnerToast.error(
      problems.length === 1 ? first.message : `${problems.length} fields need your attention`,
      {
        description:
          problems.length === 1
            ? "It's highlighted below."
            : problems.map((p) => p.message).join(" · "),
      },
    );

    const el = fieldRefs.current[first.key];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    // preventScroll: scrollIntoView is already animating; focusing would jump.
    (el as HTMLInputElement | null)?.focus?.({ preventScroll: true });
  };

  const handlePurchase = async () => {
    void track({
      coachId: service?.coach_id,
      event: "checkout_start",
      subjectType: "service",
      subjectId: service?.id,
      userId: user?.id ?? null,
    });

    if (!service) return;

    // A free service still needs an account, because the row that grants
    // access is written by the browser and RLS quite rightly wants to know
    // whose it is. A paid one does not: the payment is what proves the buyer
    // is real, so the account is created for them on the way out.
    if (!user && (service.is_free || service.price === 0)) {
      const returnUrl = window.location.pathname;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    const problems = validateFields();
    if (problems.length > 0) {
      reportProblems(problems);
      return;
    }
    setFieldErrors({});

    setPurchasing(true);

    try {
      if (service.is_free || service.price === 0) {
        const { error: suError } = await supabase.from("service_users").insert({
          service_id: service.id,
          user_id: user.id,
          status: "active",
          amount_paid: 0,
          payment_method: "free",
          custom_fields_data: Object.keys(customFieldValues).length > 0 ? customFieldValues : null,
        } as any);

        if (suError) throw suError;

        if (courses.length > 0) {
          const enrollments = courses.map((c) => ({
            course_id: c.course_id,
            user_id: user.id,
          }));
          const { error: enrollError } = await supabase
            .from("enrollments")
            .insert(enrollments as any);

          // Self-enrolment is only permitted into free courses, so a free
          // service bundling a paid one lands here. Say so rather than
          // leaving the buyer to discover the missing course themselves.
          if (enrollError) {
            console.error("free enrolment failed:", enrollError);
            toast({
              title: "Partly enrolled",
              description:
                "You have access to this service, but one of its courses could not be " +
                "unlocked automatically. Please contact the coach.",
              variant: "destructive",
            });
          }
        }

        toast({ title: "Welcome!", description: `You now have access to ${service.title}` });
        setAlreadyPurchased(true);
        navigate(`/checkout/${idOrSlug}/success`);
      } else {
        await initiatePayment();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  /** Creates the order server-side, then runs whichever flow the gateway needs. */
  const initiatePayment = async () => {
    if (!service) return;

    const chosen = provider ?? pickDefaultGateway(gateways)?.provider ?? null;
    if (!chosen) {
      toast({
        title: "Payments unavailable",
        description: "This coach has not connected a payment gateway yet.",
        variant: "destructive",
      });
      setPurchasing(false);
      return;
    }

    if (chosen === "razorpay" && !razorpayLoaded) {
      toast({ title: "Please wait", description: "Payment system is still loading." });
      setPurchasing(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    // Instamojo sends the buyer back here. These params are only a pointer —
    // the success page re-checks the payment with the gateway before anything
    // is granted, because the buyer controls this URL.
    const redirectUrl = `${window.location.origin}/checkout/${idOrSlug}/success?provider=instamojo&service_id=${service.id}`;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        // No amount is sent: the price is resolved from the service row
        // server-side, so it cannot be tampered with from here.
        //
        // The custom fields go up front rather than at verification, because
        // the webhook may be what completes this purchase and it has no
        // browser to collect them from.
        body: JSON.stringify({
          service_id: service.id,
          provider: chosen,
          redirect_url: redirectUrl,
          // Who to reach, and where to point them back to. A buyer with no
          // account has nothing else identifying them, and the account made
          // for them afterwards is built from exactly these details.
          buyer: {
            name: billingName.trim(),
            email: billingEmail.trim(),
            phone: billingPhone.trim(),
          },
          origin: window.location.origin,
          // A paid purchase does not require an account — one is created once
          // the money arrives — so there is no session to record an affiliate
          // attribution against. The code rides on the order instead, and the
          // commission trigger falls back to it.
          affiliate_code: pendingAffiliate()?.code ?? null,
          custom_fields_data:
            Object.keys(customFieldValues).length > 0 ? customFieldValues : null,
        }),
      },
    );

    const orderData = await res.json();

    if (!res.ok) {
      toast({
        title: "Payment Error",
        description: orderData.error || "Could not initiate payment",
        variant: "destructive",
      });
      setPurchasing(false);
      return;
    }

    if (orderData.flow === "redirect") {
      // Remember what was being bought so the return trip can still verify it
      // if the gateway drops our query string.
      sessionStorage.setItem(
        "pending_payment",
        JSON.stringify({
          service_id: service.id,
          provider: chosen,
          custom_fields_data:
            Object.keys(customFieldValues).length > 0 ? customFieldValues : null,
        }),
      );
      window.location.href = orderData.redirect_to;
      return;
    }

    openRazorpayModal(orderData, token);
  };

  const openRazorpayModal = (orderData: RazorpayOrder, token: string | undefined) => {
    if (!service) return;

    const pm = service.advanced_settings?.payment_methods;
    const method = pm
      ? {
          upi: pm.upi !== false,
          card: pm.card !== false,
          netbanking: pm.netbanking !== false,
          wallet: pm.wallet !== false,
          paylater: pm.paylater !== false,
        }
      : undefined;

    const options: any = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: service.title,
      description: `Payment for ${service.title}`,
      order_id: orderData.order_id,
      ...(method ? { method } : {}),
      prefill: {
        email: billingEmail,
        name: billingName,
        contact: billingPhone,
      },
      theme: { color: "#f97316" },
      handler: async (response: any) => {
        setPurchasing(true);

        const succeed = () => {
          toast({ title: "Payment Successful!", description: `Welcome to ${service.title}` });
          setAlreadyPurchased(true);
          navigate(`/checkout/${idOrSlug}/success`);
        };

        try {
          const verifyRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                provider: "razorpay",
                origin: window.location.origin,
                service_id: service.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                custom_fields_data:
                  Object.keys(customFieldValues).length > 0 ? customFieldValues : null,
              }),
            },
          );

          const verifyData = await verifyRes.json();

          if (verifyRes.ok && verifyData.success) {
            succeed();
            return;
          }

          // Razorpay says it took the money, so something on our side failed,
          // not the payment. The webhook is the backstop for exactly this:
          // give it a moment before telling the buyer anything went wrong.
          if (user && (await waitForServiceAccess(service.id, user.id))) {
            succeed();
            return;
          }

          toast({
            title: "We couldn't confirm your payment",
            description: verifyData.error || PENDING_PAYMENT_MESSAGE,
            variant: "destructive",
          });
        } catch {
          if (user && (await waitForServiceAccess(service.id, user.id))) {
            succeed();
            return;
          }
          toast({
            title: "We couldn't confirm your payment",
            description: PENDING_PAYMENT_MESSAGE,
            variant: "destructive",
          });
        } finally {
          setPurchasing(false);
        }
      },
      modal: { ondismiss: () => setPurchasing(false) },
    };

    const rzp = new window.Razorpay(options);

    // A declined card used to do nothing at all: the modal closed and the page
    // sat there as if the buyer had never tried.
    rzp.on("payment.failed", (resp: { error?: { description?: string } }) => {
      setPurchasing(false);
      toast({
        title: "Payment failed",
        description:
          resp?.error?.description ||
          "Your payment was not completed. No money has been taken — please try again.",
        variant: "destructive",
      });
    });

    rzp.open();
    setPurchasing(false);
  };

  const effectivePrice = service?.discounted_price ?? service?.price ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <h1 className="text-2xl font-bold">Service Not Found</h1>
        <p className="text-muted-foreground">This service may have been removed or is no longer available.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-body">
      {/* Mobile app bar. Desktop keeps the header inside the product column. */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-100 bg-white/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2">
          <img src={BRAND.assets.icon} alt={BRAND.name} className="h-7 w-7 shrink-0 rounded-lg" />
          <span className="truncate text-sm font-semibold text-zinc-900">{service.title}</span>
        </div>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label="Share this page"
          className="-mr-1 shrink-0 rounded-full p-2 text-zinc-600 transition-colors active:bg-zinc-100 touch-manipulation"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid lg:grid-cols-2 min-h-screen">
        {/* LEFT: product */}
        <div className="px-4 sm:px-10 lg:px-16 py-6 lg:py-10 max-w-xl mx-auto w-full flex flex-col">
          <div className="mb-8 hidden lg:flex items-center justify-between gap-3">
            <img src={BRAND.assets.icon} alt={BRAND.name} className="h-8 w-8 rounded-lg" />
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>

          {customPanel ? (
            /* Sandboxed for the same reason as every other authored page: this
               markup must not run in the app's origin, where it would reach
               the buyer's session. */
            <iframe
              title={service.title}
              sandbox=""
              srcDoc={customPanel}
              className="w-full flex-1 min-h-[70vh] border-0 block my-6"
            />
          ) : (
            <>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-zinc-900">{service.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">By <span className="font-semibold text-foreground">{coachName}</span></p>

            <div className="flex items-baseline gap-2 mt-3">
              {service.discounted_price != null && (
                <span className="text-lg text-muted-foreground line-through">
                  {symbolFor(service.currency)}{service.price}
                </span>
              )}
              <span className="font-display text-3xl font-semibold text-zinc-900">
                {service.is_free ? "Free" : `${symbolFor(service.currency)}${effectivePrice}`}
              </span>
              {service.enable_subscription && (
                <span className="text-sm font-medium text-muted-foreground">/{service.subscription_interval}</span>
              )}
            </div>

            {service.cover_image_url && (
              <img src={service.cover_image_url} alt={service.title} className="w-full rounded-xl object-cover mt-6 aspect-video" />
            )}

            {service.description && (
              <RichText value={service.description} className="mt-6 text-sm text-muted-foreground" />
            )}

            {courses.length > 0 && (
              <div className="mt-6 space-y-3">
                {courses.map((c, i) => (
                  <div key={c.course_id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium text-zinc-800">{(c.courses as any)?.title || "Course"}</span>
                  </div>
                ))}
              </div>
            )}

            <Separator className="my-8" />
            </>
          )}

          <Separator className="my-8" />

          <p className="text-[11px] text-muted-foreground">
            You agree to share information entered on this page with <span className="font-semibold">1corehub</span> (owner of this page) and Razorpay, adhering to applicable laws.
          </p>
          <p className="text-[11px] text-muted-foreground mt-4">
            1corehub {new Date().getFullYear()}. <a href="/privacy" className="underline">Privacy</a> · <a href="/terms" className="underline">Terms</a>
          </p>
        </div>

        {/* RIGHT: payment */}
        <div className="bg-[#F8F9FB] px-4 sm:px-10 lg:px-16 py-6 lg:py-10 pb-32 lg:pb-10 flex items-start justify-center">
          <div className="w-full max-w-xl mx-auto">
            {!user && (
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}>
                  Login
                </Button>
              </div>
            )}

            {alreadyPurchased ? (
              <Card className="shadow-sm">
                <CardContent className="p-6 text-center space-y-3">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                  <h3 className="font-bold text-lg">You already have access!</h3>
                  <p className="text-sm text-muted-foreground">You've already enrolled in this service.</p>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/dashboard")}>
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold text-zinc-900">Payment details</h2>
                  <p className="text-sm text-muted-foreground mt-1">Complete your purchase by providing your payment details.</p>
                </div>

                {/* Billing information */}
                <div className="bg-background rounded-xl border border-border overflow-hidden">
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Billing information</span>
                    {!user && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        No account needed. We'll create one for you and email your
                        sign-in details as soon as your payment goes through.
                      </p>
                    )}
                  </div>
                  <div className="divide-y divide-border">
                    <div ref={(el) => { fieldRowRefs.current.name = el; }}>
                      <Input
                        ref={(el) => { fieldRefs.current.name = el; }}
                        value={billingName}
                        onChange={(e) => { setBillingName(e.target.value); clearFieldError("name"); }}
                        placeholder="Full name"
                        autoComplete="name"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        aria-invalid={!!fieldErrors.name}
                        aria-describedby={fieldErrors.name ? "err-name" : undefined}
                        className={cn(
                          "border-0 rounded-none h-12 focus-visible:ring-0 shadow-none",
                          fieldErrors.name && INVALID_FIELD,
                        )}
                      />
                      <FieldError id="err-name" message={fieldErrors.name} />
                    </div>

                    <div ref={(el) => { fieldRowRefs.current.email = el; }}>
                      <Input
                        ref={(el) => { fieldRefs.current.email = el; }}
                        value={billingEmail}
                        onChange={(e) => { setBillingEmail(e.target.value); clearFieldError("email"); }}
                        placeholder="Email address"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        aria-invalid={!!fieldErrors.email}
                        aria-describedby={fieldErrors.email ? "err-email" : undefined}
                        className={cn(
                          "border-0 rounded-none h-12 focus-visible:ring-0 shadow-none",
                          fieldErrors.email && INVALID_FIELD,
                        )}
                      />
                      <FieldError id="err-email" message={fieldErrors.email} />
                    </div>

                    <div ref={(el) => { fieldRowRefs.current.phone = el; }}>
                      <div className={cn("flex items-center", fieldErrors.phone && INVALID_FIELD)}>
                        <span className="pl-4 pr-2 text-sm text-muted-foreground shrink-0">+91</span>
                        <Input
                          ref={(el) => { fieldRefs.current.phone = el; }}
                          value={billingPhone}
                          onChange={(e) => { setBillingPhone(e.target.value); clearFieldError("phone"); }}
                          placeholder="Phone number"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          enterKeyHint="done"
                          aria-invalid={!!fieldErrors.phone}
                          aria-describedby={fieldErrors.phone ? "err-phone" : undefined}
                          className="border-0 rounded-none h-12 focus-visible:ring-0 shadow-none pl-0 bg-transparent"
                        />
                      </div>
                      <FieldError id="err-phone" message={fieldErrors.phone} />
                    </div>
                  </div>

                  {service.custom_fields && (service.custom_fields as any[]).length > 0 && (
                    <div className="divide-y divide-border border-t border-border">
                      {(service.custom_fields as any[])
                        .filter((f: any) => !f.hidden)
                        .map((f: any, i: number) => {
                          const key = customFieldKey(f.label);
                          const error = fieldErrors[key];
                          const onChange = (value: string) => {
                            setCustomFieldValues({ ...customFieldValues, [f.label]: value });
                            clearFieldError(key);
                          };

                          return (
                            <div
                              key={i}
                              ref={(el) => { fieldRowRefs.current[key] = el; }}
                              className="px-4 py-3"
                            >
                              <Label className={cn("text-xs", error && "text-destructive")}>
                                {f.label} {f.required !== false && "*"}
                              </Label>
                              {f.type === "dropdown" && f.options ? (
                                <select
                                  ref={(el) => { fieldRefs.current[key] = el; }}
                                  className={cn(
                                    "w-full h-11 lg:h-9 mt-1 text-base lg:text-sm bg-transparent border border-border rounded-md px-2",
                                    error && INVALID_FIELD,
                                  )}
                                  value={customFieldValues[f.label] || ""}
                                  aria-invalid={!!error}
                                  aria-describedby={error ? `err-${key}` : undefined}
                                  onChange={(e) => onChange(e.target.value)}
                                >
                                  <option value="">Select...</option>
                                  {String(f.options).split(",").map((opt: string) => (
                                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                  ))}
                                </select>
                              ) : (
                                <Input
                                  ref={(el) => { fieldRefs.current[key] = el; }}
                                  placeholder={f.helpText || f.label}
                                  value={customFieldValues[f.label] || ""}
                                  aria-invalid={!!error}
                                  aria-describedby={error ? `err-${key}` : undefined}
                                  onChange={(e) => onChange(e.target.value)}
                                  className={cn("mt-1", error && INVALID_FIELD)}
                                />
                              )}
                              <FieldError
                                id={`err-${key}`}
                                message={error}
                                className="px-0 pt-1.5 pb-0"
                              />
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Coupon */}
                <button
                  onClick={() => setShowCoupon(!showCoupon)}
                  className="w-full bg-background rounded-xl border border-border px-4 py-3.5 flex items-center justify-between text-sm font-semibold"
                >
                  <span className="flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" /> Have a coupon?</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCoupon ? "rotate-180" : ""}`} />
                </button>
                {showCoupon && (
                  <div className="flex gap-2 -mt-2">
                    <Input placeholder="Enter coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                    <Button variant="outline" disabled={!couponCode}>Apply</Button>
                  </div>
                )}

                {/* Order summary */}
                <div className="bg-background rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">Service</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{service.title}</span>
                      <span className="flex items-center gap-1.5">
                        {service.discounted_price != null && (
                          <span className="line-through text-muted-foreground text-xs">
                            {symbolFor(service.currency)}{Number(service.price).toFixed(2)}
                          </span>
                        )}
                        <span className="font-semibold">
                          {service.is_free ? "Free" : `${symbolFor(service.currency)}${Number(effectivePrice).toFixed(2)}`}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-bold">Amount to be paid :</span>
                    <span className="text-sm font-bold">
                      {service.is_free ? "Free" : `${symbolFor(service.currency)}${Number(effectivePrice).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {service.enable_terms && service.terms_conditions && (
                  <p className="text-[11px] text-muted-foreground">
                    By proceeding, you agree to the Terms & Conditions.
                  </p>
                )}

                {!service.is_free && gateways.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">Pay using</p>
                    <div className="grid grid-cols-2 gap-2">
                      {gateways.map((g) => {
                        const spec = PAYMENT_PROVIDERS[g.provider];
                        if (!spec) return null;
                        const active = provider === g.provider;
                        return (
                          <button
                            key={g.provider}
                            type="button"
                            onClick={() => setProvider(g.provider)}
                            aria-pressed={active}
                            className={
                              "rounded-lg border p-3 text-left transition-colors " +
                              (active
                                ? "border-accent bg-accent/5 ring-1 ring-accent"
                                : "border-border hover:bg-muted/50")
                            }
                          >
                            <span className="block text-sm font-semibold">{spec.name}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {spec.flow === "modal" ? "Pay here" : "Opens Instamojo"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!service.is_free && gateways.length === 0 && (
                  <p className="text-xs text-destructive">
                    This coach has not connected a payment gateway yet.
                  </p>
                )}

                {/* Desktop's pay button. On mobile the action lives in the
                    fixed bar below. lg:inline-flex rather than lg:flex: the
                    Button base is inline-flex, and swapping it would change
                    desktop layout — the one thing this pass must not do. */}
                <Button
                  className="hidden lg:inline-flex w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-sm font-bold"
                  onClick={handlePurchase}
                  disabled={purchasing || (!service.is_free && gateways.length === 0)}
                >
                  {purchasing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {service.is_free ? "Join Free" : `Proceed to pay ${symbolFor(service.currency)}${Number(effectivePrice).toFixed(2)}`}
                </Button>

                {!service.is_free && service.price > 0 && (
                  <div className="flex items-center justify-center gap-3 text-muted-foreground">
                    <Smartphone className="h-4 w-4" />
                    <Wallet className="h-4 w-4" />
                    <CreditCard className="h-4 w-4" />
                    <span className="text-[10px] font-semibold">UPI · Cards · Netbanking · Wallets</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" /> Secure checkout powered by Razorpay
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile pay bar: the amount and the action stay in reach of a thumb
          however far down the page the buyer has scrolled. The safe-area
          padding keeps it clear of the iPhone home indicator. */}
      {!alreadyPurchased && (
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 pt-3 backdrop-blur-md"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {service.is_free ? "Price" : "Total"}
              </p>
              <p className="text-lg font-bold leading-tight text-zinc-900">
                {service.is_free
                  ? "Free"
                  : `${symbolFor(service.currency)}${Number(effectivePrice).toFixed(2)}`}
              </p>
            </div>
            <Button
              className="h-12 flex-1 bg-accent text-sm font-bold text-accent-foreground transition-transform hover:bg-accent/90 active:scale-[0.98] touch-manipulation"
              onClick={handlePurchase}
              disabled={purchasing || (!service.is_free && gateways.length === 0)}
            >
              {purchasing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {service.is_free ? "Join Free" : "Proceed to pay"}
            </Button>
          </div>
        </div>
      )}

      {seo && (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          heading="Share this offering"
          url={seo.canonical}
          title={service.title}
          description={seo.description}
          imageUrl={service.cover_image_url}
        />
      )}
    </div>
  );
}
