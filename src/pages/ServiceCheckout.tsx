import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, Tag, ShieldCheck, ChevronDown, CreditCard, Smartphone, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ServiceData {
  id: string;
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

export default function ServiceCheckout() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [service, setService] = useState<ServiceData | null>(null);
  const [courses, setCourses] = useState<LinkedCourse[]>([]);
  const [coachName, setCoachName] = useState("");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingPhone, setBillingPhone] = useState("");

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

    const [{ data: sc }, { data: profile }] = await Promise.all([
      supabase.from("service_courses").select("course_id, courses(title, thumbnail_url)").eq("service_id", data.id),
      supabase.from("profiles").select("full_name").eq("id", data.coach_id).single(),
    ]);
    setCourses((sc as any) || []);
    setCoachName(profile?.full_name || "Coach");
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

  const handlePurchase = async () => {
    if (!service) return;

    if (!user) {
      const returnUrl = window.location.pathname;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

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
          await supabase.from("enrollments").insert(enrollments as any);
        }

        toast({ title: "Welcome!", description: `You now have access to ${service.title}` });
        setAlreadyPurchased(true);
        navigate("/dashboard");
      } else {
        // Razorpay paid flow
        await initiateRazorpayPayment();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  const initiateRazorpayPayment = async () => {
    if (!service || !user || !razorpayLoaded) {
      toast({ title: "Error", description: "Payment system loading, please try again", variant: "destructive" });
      return;
    }

    const effectiveAmt = service.discounted_price ?? service.price;

    // Create Razorpay order via edge function
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-razorpay-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ service_id: service.id, amount: effectiveAmt }),
      }
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

    // Open Razorpay checkout
    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: "INR",
      name: service.title,
      description: `Payment for ${service.title}`,
      order_id: orderData.order_id,
      prefill: {
        email: billingEmail || user.email,
        name: billingName || user.user_metadata?.full_name || "",
        contact: billingPhone || "",
      },
      theme: { color: "#f97316" },
      handler: async (response: any) => {
        // Verify payment via edge function
        setPurchasing(true);
        try {
          const verifyRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-razorpay-payment`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                service_id: service.id,
                amount: effectiveAmt,
                custom_fields_data:
                  Object.keys(customFieldValues).length > 0 ? customFieldValues : null,
              }),
            }
          );

          const verifyData = await verifyRes.json();

          if (verifyRes.ok && verifyData.success) {
            toast({ title: "Payment Successful!", description: `Welcome to ${service.title}` });
            setAlreadyPurchased(true);
            navigate("/dashboard");
          } else {
            toast({
              title: "Verification Failed",
              description: verifyData.error || "Payment could not be verified",
              variant: "destructive",
            });
          }
        } catch {
          toast({ title: "Error", description: "Payment verification failed", variant: "destructive" });
        } finally {
          setPurchasing(false);
        }
      },
      modal: {
        ondismiss: () => setPurchasing(false),
      },
    };

    const rzp = new window.Razorpay(options);
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
      <div className="grid lg:grid-cols-2 min-h-screen">
        {/* LEFT: product */}
        <div className="px-6 sm:px-10 lg:px-16 py-10 max-w-xl mx-auto w-full">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center font-extrabold text-white text-sm mb-8">
            L
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-zinc-900">{service.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">By <span className="font-semibold text-foreground">{coachName}</span></p>

          <div className="flex items-baseline gap-2 mt-3">
            {service.discounted_price != null && (
              <span className="text-lg text-muted-foreground line-through">
                {service.currency === "USD" ? "$" : "₹"}{service.price}
              </span>
            )}
            <span className="font-display text-3xl font-semibold text-zinc-900">
              {service.is_free ? "Free" : `${service.currency === "USD" ? "$" : "₹"}${effectivePrice}`}
            </span>
            {service.enable_subscription && (
              <span className="text-sm font-medium text-muted-foreground">/{service.subscription_interval}</span>
            )}
          </div>

          {service.cover_image_url && (
            <img src={service.cover_image_url} alt={service.title} className="w-full rounded-xl object-cover mt-6 aspect-video" />
          )}

          {service.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-6">{service.description}</p>
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

          <p className="text-[11px] text-muted-foreground">
            You agree to share information entered on this page with <span className="font-semibold">1corehub</span> (owner of this page) and Razorpay, adhering to applicable laws.
          </p>
          <p className="text-[11px] text-muted-foreground mt-4">
            1corehub {new Date().getFullYear()}. <a href="/privacy" className="underline">Privacy</a> · <a href="/terms" className="underline">Terms</a>
          </p>
        </div>

        {/* RIGHT: payment */}
        <div className="bg-[#F8F9FB] px-6 sm:px-10 lg:px-16 py-10 flex items-start justify-center">
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
                  </div>
                  <div className="divide-y divide-border">
                    <Input
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      placeholder="Full name"
                      className="border-0 rounded-none h-12 focus-visible:ring-0 shadow-none"
                    />
                    <Input
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      placeholder="Email address"
                      type="email"
                      className="border-0 rounded-none h-12 focus-visible:ring-0 shadow-none"
                    />
                    <div className="flex items-center">
                      <span className="pl-4 pr-2 text-sm text-muted-foreground shrink-0">+91</span>
                      <Input
                        value={billingPhone}
                        onChange={(e) => setBillingPhone(e.target.value)}
                        placeholder="Phone number"
                        className="border-0 rounded-none h-12 focus-visible:ring-0 shadow-none pl-0"
                      />
                    </div>
                  </div>

                  {service.custom_fields && (service.custom_fields as any[]).length > 0 && (
                    <div className="divide-y divide-border border-t border-border">
                      {(service.custom_fields as any[])
                        .filter((f: any) => !f.hidden)
                        .map((f: any, i: number) => (
                          <div key={i} className="px-4 py-3">
                            <Label className="text-xs">{f.label} {f.required !== false && "*"}</Label>
                            {f.type === "dropdown" && f.options ? (
                              <select
                                className="w-full h-9 mt-1 text-sm bg-transparent border border-border rounded-md px-2"
                                value={customFieldValues[f.label] || ""}
                                onChange={(e) => setCustomFieldValues({ ...customFieldValues, [f.label]: e.target.value })}
                              >
                                <option value="">Select...</option>
                                {String(f.options).split(",").map((opt: string) => (
                                  <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                placeholder={f.helpText || f.label}
                                value={customFieldValues[f.label] || ""}
                                onChange={(e) => setCustomFieldValues({ ...customFieldValues, [f.label]: e.target.value })}
                                className="mt-1"
                              />
                            )}
                          </div>
                        ))}
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
                            {service.currency === "USD" ? "$" : "₹"}{Number(service.price).toFixed(2)}
                          </span>
                        )}
                        <span className="font-semibold">
                          {service.is_free ? "Free" : `${service.currency === "USD" ? "$" : "₹"}${Number(effectivePrice).toFixed(2)}`}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-bold">Amount to be paid :</span>
                    <span className="text-sm font-bold">
                      {service.is_free ? "Free" : `${service.currency === "USD" ? "$" : "₹"}${Number(effectivePrice).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {service.enable_terms && service.terms_conditions && (
                  <p className="text-[11px] text-muted-foreground">
                    By proceeding, you agree to the Terms & Conditions.
                  </p>
                )}

                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-sm font-bold"
                  onClick={handlePurchase}
                  disabled={purchasing}
                >
                  {purchasing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {service.is_free ? "Join Free" : `Proceed to pay ${service.currency === "USD" ? "$" : "₹"}${Number(effectivePrice).toFixed(2)}`}
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
    </div>
  );
}
