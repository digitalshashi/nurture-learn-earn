import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, CheckCircle2, Loader2, Tag, ShieldCheck } from "lucide-react";
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
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);

  useEffect(() => {
    loadService();
  }, [idOrSlug]);

  useEffect(() => {
    if (service && user) checkExistingPurchase();
  }, [service, user]);

  const loadService = async () => {
    if (!idOrSlug) return;
    // Try slug first, then id
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

    // Load linked courses & coach name in parallel
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
      // Redirect to login with return URL
      const returnUrl = window.location.pathname;
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setPurchasing(true);

    try {
      // For free services or zero-price, directly grant access
      if (service.is_free || service.price === 0) {
        // Insert service_user record
        const { error: suError } = await supabase.from("service_users").insert({
          service_id: service.id,
          user_id: user.id,
          status: "active",
          amount_paid: 0,
          payment_method: "free",
          custom_fields_data: Object.keys(customFieldValues).length > 0 ? customFieldValues : null,
        } as any);

        if (suError) throw suError;

        // Auto-enroll in all linked courses
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
        // For paid services, show a placeholder (payment gateway integration needed)
        toast({
          title: "Payment Gateway",
          description: "Payment gateway integration coming soon. Contact the coach directly.",
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  const currencySymbol = service?.currency === "INR" ? "₹" : service?.currency === "EUR" ? "€" : "$";
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
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-3 flex items-center justify-between">
        <span className="font-display font-bold text-lg">Checkout</span>
        {!user && (
          <Button variant="outline" size="sm" onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}>
            Login
          </Button>
        )}
      </header>

      <div className="max-w-5xl mx-auto py-8 px-4 grid md:grid-cols-[1fr_380px] gap-8">
        {/* LEFT: Service Info */}
        <div className="space-y-6">
          {service.cover_image_url && (
            <img src={service.cover_image_url} alt={service.title} className="w-full rounded-xl object-cover max-h-[320px]" />
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-1">by {coachName}</p>
            <h1 className="text-2xl font-bold font-display">{service.title}</h1>
          </div>

          {service.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.description}</p>
          )}

          {/* Course Modules */}
          {courses.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-accent" /> What's Included ({courses.length} courses)
                </h2>
                <div className="space-y-2">
                  {courses.map((c, i) => (
                    <div key={c.course_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                        {i + 1}
                      </div>
                      <span className="text-sm font-medium">{(c.courses as any)?.title || "Course"}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Checkout Panel */}
        <div className="space-y-4">
          <Card className="sticky top-6 shadow-lg border-accent/20">
            <CardContent className="p-5 space-y-4">
              {alreadyPurchased ? (
                <div className="text-center py-6 space-y-3">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                  <h3 className="font-bold text-lg">You already have access!</h3>
                  <p className="text-sm text-muted-foreground">You've already enrolled in this service.</p>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/dashboard")}>
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-base">Billing Summary</h3>

                  {/* Custom fields */}
                  {service.custom_fields && (service.custom_fields as any[]).length > 0 && (
                    <div className="space-y-2">
                      {(service.custom_fields as any[]).map((f: any, i: number) => (
                        <div key={i}>
                          <Label className="text-xs">{f.label} {f.required && "*"}</Label>
                          <Input
                            placeholder={f.label}
                            value={customFieldValues[f.label] || ""}
                            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [f.label]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Coupon */}
                  <div>
                    <Label className="text-xs">Coupon Code</Label>
                    <div className="flex gap-2">
                      <Input placeholder="Enter coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                      <Button variant="outline" size="sm" disabled={!couponCode}>
                        <Tag className="h-3.5 w-3.5 mr-1" /> Apply
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Price summary */}
                  <div className="space-y-2">
                    {service.discounted_price && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Original Price</span>
                        <span className="line-through text-muted-foreground">{currencySymbol}{service.price}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Amount to Pay</span>
                      <span className="text-accent">
                        {service.is_free ? "Free" : `${currencySymbol}${effectivePrice}`}
                        {service.enable_subscription && <span className="text-xs font-normal text-muted-foreground">/{service.subscription_interval}</span>}
                      </span>
                    </div>
                  </div>

                  {service.enable_terms && service.terms_conditions && (
                    <p className="text-[10px] text-muted-foreground">
                      By proceeding, you agree to the Terms & Conditions.
                    </p>
                  )}

                  <Button
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11 text-sm font-semibold"
                    onClick={handlePurchase}
                    disabled={purchasing}
                  >
                    {purchasing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {service.is_free ? "Join Free" : `Proceed to Pay ${currencySymbol}${effectivePrice}`}
                  </Button>

                  <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3" /> Secure checkout
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
