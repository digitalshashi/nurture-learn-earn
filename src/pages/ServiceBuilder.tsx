import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, FileText, CreditCard, Settings, Plus, Image, Video, Type, Trash2, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Course { id: string; title: string; }
interface Workshop { id: string; title: string; }

interface CustomSection {
  type: "image" | "video" | "content";
  title: string;
  content: string;
}

export default function ServiceBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = !!id;

  // Service details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [serviceType, setServiceType] = useState("bundle");
  const [isFree, setIsFree] = useState(false);
  const [enableSubscription, setEnableSubscription] = useState(false);

  // Advanced Features
  const [serviceTier, setServiceTier] = useState("basic");
  const [enableLevelup, setEnableLevelup] = useState(false);
  const [enableGamification, setEnableGamification] = useState(false);
  const [enableCommunity, setEnableCommunity] = useState(false);
  const [enableLeaderboard, setEnableLeaderboard] = useState(false);
  const [enableQuests, setEnableQuests] = useState(false);
  const [subscriptionInterval, setSubscriptionInterval] = useState("monthly");
  const [subscriptionPrice, setSubscriptionPrice] = useState("0");
  const [allowPayWhatYouWant, setAllowPayWhatYouWant] = useState(false);
  const [minPayAmount, setMinPayAmount] = useState("0");

  // Pricing
  const [currency, setCurrency] = useState("INR");
  const [price, setPrice] = useState("0");
  const [discountedPrice, setDiscountedPrice] = useState("");
  const [internationalPrice, setInternationalPrice] = useState("");
  const [internationalCurrency, setInternationalCurrency] = useState("USD");
  const [showInternational, setShowInternational] = useState(false);

  // Payment details
  const [enableTerms, setEnableTerms] = useState(false);
  const [termsConditions, setTermsConditions] = useState("");
  const [collectAddress, setCollectAddress] = useState(false);
  const [collectGst, setCollectGst] = useState(false);
  const [customFields, setCustomFields] = useState<{ label: string; type: "short_text" | "dropdown"; options: string; helpText: string; hidden: boolean; required: boolean }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState({ upi: true, card: true, netbanking: true, wallet: true, paylater: true });

  // Advance settings (persisted in services.advanced_settings jsonb)
  const [showAdvanceSettings, setShowAdvanceSettings] = useState(false);
  const [otpLessCheckout, setOtpLessCheckout] = useState(false);
  const [enableSeatsLimit, setEnableSeatsLimit] = useState(false);
  const [seatsCount, setSeatsCount] = useState("50");
  const [seatsText, setSeatsText] = useState("{n} seats left");
  const [enableStartDate, setEnableStartDate] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [notifyOnPurchase, setNotifyOnPurchase] = useState(true);
  const [hideCoupon, setHideCoupon] = useState(false);
  const [allowReregistration, setAllowReregistration] = useState(false);
  const [enableValidity, setEnableValidity] = useState(false);
  const [validityDays, setValidityDays] = useState("365");
  const [enableChatRoom, setEnableChatRoom] = useState(false);
  const [fbPixelId, setFbPixelId] = useState("");
  const [freebieServiceId, setFreebieServiceId] = useState("");
  const [allowMultipleQuantity, setAllowMultipleQuantity] = useState(false);
  const [notifyOnPaymentFailure, setNotifyOnPaymentFailure] = useState(false);

  // Subscription renewal card
  const [enableRenewalCard, setEnableRenewalCard] = useState(false);
  const [customizeRenewalCard, setCustomizeRenewalCard] = useState(false);
  const [renewalMessage, setRenewalMessage] = useState("Your subscription is renewing soon.");
  const [renewalButtonText, setRenewalButtonText] = useState("Renew now");

  // Payment success
  const [successHeading, setSuccessHeading] = useState("Payment Successful");
  const [successMessage, setSuccessMessage] = useState("Congratulations! You now have access.");
  const [successButtonText, setSuccessButtonText] = useState("Login Now");
  const [successButtonUrl, setSuccessButtonUrl] = useState("");
  const [successSections, setSuccessSections] = useState<CustomSection[]>([]);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionType, setNewSectionType] = useState<"image" | "video" | "content">("content");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionContent, setNewSectionContent] = useState("");

  // Linked items
  const [courses, setCourses] = useState<Course[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [otherServices, setOtherServices] = useState<{ id: string; title: string }[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>([]);

  // Status
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleCoverUpload = async (file: File) => {
    if (!user) return;
    setUploadingCover(true);
    try {
      const { uploadUserFile } = await import("@/lib/cloud-storage");
      const result = await uploadUserFile(user.id, "covers", file);
      setCoverImageUrl(result.publicUrl);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingCover(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCoachProducts();
      if (isEditing) loadService();
    }
  }, [user, id]);

  const loadCoachProducts = async () => {
    if (!user) return;
    const [{ data: c }, { data: w }, { data: svc }] = await Promise.all([
      supabase.from("courses").select("id, title").eq("coach_id", user.id),
      supabase.from("workshops").select("id, title").eq("created_by", user.id),
      supabase.from("services").select("id, title").eq("coach_id", user.id),
    ]);
    setCourses((c as Course[]) || []);
    setWorkshops((w as Workshop[]) || []);
    setOtherServices(((svc as any[]) || []).filter((s) => s.id !== id));
  };

  const loadService = async () => {
    const { data: s } = await supabase.from("services").select("*").eq("id", id).single();
    if (!s) return;
    setTitle(s.title);
    setDescription(s.description || "");
    setCoverImageUrl(s.cover_image_url || "");
    setServiceType(s.service_type);
    setIsFree(s.is_free);
    setEnableSubscription(s.enable_subscription);
    setSubscriptionInterval(s.subscription_interval || "monthly");
    setSubscriptionPrice(String(s.subscription_price || 0));
    setAllowPayWhatYouWant(s.allow_pay_what_you_want);
    setMinPayAmount(String(s.min_pay_amount || 0));
    setCurrency(s.currency);
    setPrice(String(s.price));
    setDiscountedPrice(s.discounted_price ? String(s.discounted_price) : "");
    setInternationalPrice(s.international_price ? String(s.international_price) : "");
    setInternationalCurrency((s as any).international_currency || "USD");
    setShowInternational(!!s.international_price);
    setEnableTerms(s.enable_terms);
    setTermsConditions(s.terms_conditions || "");
    setCollectAddress(s.collect_address);
    setCollectGst(s.collect_gst);
    setCustomFields(
      ((s.custom_fields as any) || []).map((f: any) => ({
        label: f.label || "",
        type: f.type || "short_text",
        options: f.options || "",
        helpText: f.helpText || "",
        hidden: !!f.hidden,
        required: !!f.required,
      })),
    );

    const adv = (s.advanced_settings as any) || {};
    setOtpLessCheckout(!!adv.otp_less_checkout);
    setPaymentMethods({
      upi: adv.payment_methods?.upi !== false,
      card: adv.payment_methods?.card !== false,
      netbanking: adv.payment_methods?.netbanking !== false,
      wallet: adv.payment_methods?.wallet !== false,
      paylater: adv.payment_methods?.paylater !== false,
    });
    setEnableSeatsLimit(!!s.max_seats);
    setSeatsCount(String(s.max_seats || 50));
    setSeatsText(adv.seats_text || "{n} seats left");
    setEnableStartDate(!!adv.start_date);
    setStartDate(adv.start_date || "");
    setNotifyOnPurchase(adv.notify_on_purchase !== false);
    setHideCoupon(!!adv.hide_coupon);
    setAllowReregistration(!!adv.allow_reregistration);
    setEnableValidity(!!s.access_duration_days);
    setValidityDays(String(s.access_duration_days || 365));
    setEnableChatRoom(!!adv.enable_chat_room);
    setFbPixelId(adv.fb_pixel_id || "");
    setFreebieServiceId(adv.freebie_service_id || "");
    setAllowMultipleQuantity(!!adv.allow_multiple_quantity);
    setNotifyOnPaymentFailure(!!adv.notify_on_payment_failure);
    setEnableRenewalCard(!!adv.enable_renewal_card);
    setCustomizeRenewalCard(!!adv.customize_renewal_card);
    setRenewalMessage(adv.renewal_message || "Your subscription is renewing soon.");
    setRenewalButtonText(adv.renewal_button_text || "Renew now");
    setSuccessHeading(s.payment_success_heading || "Payment Successful");
    setSuccessMessage(s.payment_success_message || "");
    setSuccessButtonText(s.payment_success_button_text || "Login Now");
    setSuccessButtonUrl(s.payment_success_button_url || "");
    setSuccessSections((s.payment_success_sections as any) || []);
    setStatus(s.status);
    setServiceTier((s as any).service_tier || "basic");
    setEnableLevelup((s as any).enable_levelup || false);
    setEnableGamification((s as any).enable_gamification || false);
    setEnableCommunity((s as any).enable_community || false);
    setEnableLeaderboard((s as any).enable_leaderboard || false);
    setEnableQuests((s as any).enable_quests || false);

    // Load linked courses/workshops
    const [{ data: sc }, { data: sw }] = await Promise.all([
      supabase.from("service_courses").select("course_id").eq("service_id", id),
      supabase.from("service_workshops").select("workshop_id").eq("service_id", id),
    ]);
    setSelectedCourses(sc?.map((x: any) => x.course_id) || []);
    setSelectedWorkshops(sw?.map((x: any) => x.workshop_id) || []);
  };

  const handleSave = async () => {
    if (!user || !title.trim()) {
      toast({ title: "Please enter a service title", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      coach_id: user.id,
      title: title.trim(),
      slug: title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description,
      cover_image_url: coverImageUrl || null,
      service_type: serviceType,
      currency,
      price: parseFloat(price) || 0,
      discounted_price: discountedPrice ? parseFloat(discountedPrice) : null,
      international_price: internationalPrice ? parseFloat(internationalPrice) : null,
      international_currency: internationalCurrency,
      is_free: isFree,
      enable_subscription: enableSubscription,
      subscription_interval: subscriptionInterval,
      subscription_price: parseFloat(subscriptionPrice) || 0,
      allow_pay_what_you_want: allowPayWhatYouWant,
      min_pay_amount: parseFloat(minPayAmount) || 0,
      payment_success_heading: successHeading,
      payment_success_message: successMessage,
      payment_success_button_text: successButtonText,
      payment_success_button_url: successButtonUrl || null,
      payment_success_sections: successSections,
      custom_fields: customFields,
      terms_conditions: termsConditions || null,
      enable_terms: enableTerms,
      collect_address: collectAddress,
      collect_gst: collectGst,
      max_seats: enableSeatsLimit ? parseInt(seatsCount) || null : null,
      access_duration_days: enableValidity ? parseInt(validityDays) || null : null,
      advanced_settings: {
        otp_less_checkout: otpLessCheckout,
        payment_methods: paymentMethods,
        seats_text: seatsText,
        start_date: enableStartDate ? startDate : null,
        notify_on_purchase: notifyOnPurchase,
        hide_coupon: hideCoupon,
        allow_reregistration: allowReregistration,
        enable_chat_room: enableChatRoom,
        fb_pixel_id: fbPixelId || null,
        freebie_service_id: freebieServiceId || null,
        allow_multiple_quantity: allowMultipleQuantity,
        notify_on_payment_failure: notifyOnPaymentFailure,
        enable_renewal_card: enableRenewalCard,
        customize_renewal_card: customizeRenewalCard,
        renewal_message: renewalMessage,
        renewal_button_text: renewalButtonText,
      },
      status,
      service_tier: serviceTier,
      enable_levelup: enableLevelup,
      enable_gamification: enableGamification,
      enable_community: enableCommunity,
      enable_leaderboard: enableLeaderboard,
      enable_quests: enableQuests,
    };

    let serviceId = id;

    if (isEditing) {
      const { error } = await supabase.from("services").update(payload as any).eq("id", id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("services").insert(payload as any).select().single();
      if (error || !data) { toast({ title: "Error", description: error?.message, variant: "destructive" }); setSaving(false); return; }
      serviceId = data.id;
    }

    // Sync linked courses
    await supabase.from("service_courses").delete().eq("service_id", serviceId!);
    if (selectedCourses.length > 0) {
      await supabase.from("service_courses").insert(
        selectedCourses.map((cid, i) => ({ service_id: serviceId!, course_id: cid, sort_order: i })) as any
      );
    }

    // Sync linked workshops
    await supabase.from("service_workshops").delete().eq("service_id", serviceId!);
    if (selectedWorkshops.length > 0) {
      await supabase.from("service_workshops").insert(
        selectedWorkshops.map((wid) => ({ service_id: serviceId!, workshop_id: wid })) as any
      );
    }

    toast({ title: isEditing ? "Service updated!" : "Service created!" });
    setSaving(false);
    if (!isEditing) navigate(`/service-builder/${serviceId}`);
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { label: "", type: "short_text", options: "", helpText: "", hidden: false, required: false }]);
  };

  const addSuccessSection = () => {
    setSuccessSections([...successSections, { type: newSectionType, title: newSectionTitle, content: newSectionContent }]);
    setNewSectionTitle("");
    setNewSectionContent("");
    setAddSectionOpen(false);
  };

  const toggleCourse = (cid: string) => {
    setSelectedCourses(prev => prev.includes(cid) ? prev.filter(x => x !== cid) : [...prev, cid]);
  };

  const toggleWorkshop = (wid: string) => {
    setSelectedWorkshops(prev => prev.includes(wid) ? prev.filter(x => x !== wid) : [...prev, wid]);
  };

  const currencySymbol = currency === "USD" ? "$" : "₹";

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/services")} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs text-muted-foreground">Create service</p>
              <h1 className="text-lg font-bold font-display">{title || "New Service"}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Left: form tabs */}
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details" className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Service details</TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Payment details</TabsTrigger>
              <TabsTrigger value="success" className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" /> {isFree ? "Registration success page" : "Payment success page"}</TabsTrigger>
            </TabsList>

            {/* TAB 1: Service Details */}
            <TabsContent value="details" className="space-y-4">
              <div>
                <Label>Service title</Label>
                <div className="relative">
                  <Input placeholder="Service title" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))} maxLength={100} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{title.length} / 100</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">Service cover</Label>
                  <label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp"
                      className="hidden"
                      disabled={uploadingCover}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCoverUpload(file);
                        e.target.value = "";
                      }}
                    />
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 cursor-pointer">
                      {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploadingCover ? "Uploading..." : "Upload images or videos"}
                    </span>
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground mb-1">Images should be horizontal, at least 1280×720px.</p>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  {coverImageUrl ? (
                    <div className="relative">
                      <img src={coverImageUrl} alt="cover" className="max-h-40 mx-auto rounded" />
                      <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6" onClick={() => setCoverImageUrl("")}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No cover images or videos uploaded.</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Service description *</Label>
                <Textarea placeholder="Add Service description here..." value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <Label>Free service for Workshops / 1-1 Consultations</Label>
                  <Switch checked={isFree} onCheckedChange={setIsFree} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <Label>Enable subscription / recurring payment</Label>
                  <Switch checked={enableSubscription} onCheckedChange={setEnableSubscription} />
                </div>
                {enableSubscription && (
                  <div className="grid grid-cols-2 gap-3 pl-4">
                    <div>
                      <Label className="text-xs">Interval</Label>
                      <Select value={subscriptionInterval} onValueChange={setSubscriptionInterval}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Subscription Price</Label>
                      <Input type="number" value={subscriptionPrice} onChange={(e) => setSubscriptionPrice(e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-2 pt-1">
                      <label className="flex items-center gap-2 text-sm"><Checkbox checked={enableRenewalCard} onCheckedChange={(v) => setEnableRenewalCard(!!v)} /> Show renewal card to subscribers</label>
                      {enableRenewalCard && (
                        <label className="flex items-center gap-2 text-sm pl-6"><Checkbox checked={customizeRenewalCard} onCheckedChange={(v) => setCustomizeRenewalCard(!!v)} /> Customise Renewal Card</label>
                      )}
                      {enableRenewalCard && customizeRenewalCard && (
                        <div className="pl-6 space-y-2">
                          <div><Label className="text-xs">Renewal message</Label><Textarea rows={2} value={renewalMessage} onChange={(e) => setRenewalMessage(e.target.value)} /></div>
                          <div><Label className="text-xs">Button text</Label><Input value={renewalButtonText} onChange={(e) => setRenewalButtonText(e.target.value)} className="w-48" /></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Pricing</h3>
                <div className="flex items-center justify-between py-2">
                  <Label>Allow user to pay what they want</Label>
                  <Switch checked={allowPayWhatYouWant} onCheckedChange={setAllowPayWhatYouWant} />
                </div>
                {allowPayWhatYouWant && (
                  <div className="pl-4">
                    <Label className="text-xs">Minimum amount</Label>
                    <Input type="number" value={minPayAmount} onChange={(e) => setMinPayAmount(e.target.value)} className="w-40" />
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">₹ INR</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Selling price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencySymbol}</span>
                      <Input type="number" className="pl-7" placeholder="Enter amount" value={price} onChange={(e) => setPrice(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      <Checkbox checked={!!discountedPrice} onCheckedChange={(v) => setDiscountedPrice(v ? "0" : "")} />
                      Discounted price
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currencySymbol}</span>
                      <Input type="number" className="pl-7" placeholder="Enter amount" disabled={!discountedPrice && discountedPrice !== "0"} value={discountedPrice} onChange={(e) => setDiscountedPrice(e.target.value)} />
                    </div>
                  </div>
                </div>
                {!showInternational ? (
                  <Button variant="outline" className="w-full" onClick={() => setShowInternational(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add different price for international customers
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">International Currency</Label>
                      <Select value={internationalCurrency} onValueChange={setInternationalCurrency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">International Price</Label>
                      <Input type="number" value={internationalPrice} onChange={(e) => setInternationalPrice(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Features */}
              <Card className="border border-border">
                <CardHeader className="py-3"><CardTitle className="text-sm">Advanced Features</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Service Tier</Label>
                    <Select value={serviceTier} onValueChange={setServiceTier}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="diamond">Diamond</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Community Feed</Label>
                      <Switch checked={enableCommunity} onCheckedChange={setEnableCommunity} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Leaderboard</Label>
                      <Switch checked={enableLeaderboard} onCheckedChange={setEnableLeaderboard} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Quests</Label>
                      <Switch checked={enableQuests} onCheckedChange={setEnableQuests} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Gamification</Label>
                      <Switch checked={enableGamification} onCheckedChange={setEnableGamification} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">LevelUp Platform</Label>
                      <Switch checked={enableLevelup} onCheckedChange={setEnableLevelup} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Link courses & workshops */}
              <Card className="border border-border">
                <CardHeader className="py-3"><CardTitle className="text-sm">Linked Courses</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {courses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No courses created yet</p>
                  ) : courses.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selectedCourses.includes(c.id)} onCheckedChange={() => toggleCourse(c.id)} />
                      {c.title}
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader className="py-3"><CardTitle className="text-sm">Linked Workshops</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {workshops.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No workshops created yet</p>
                  ) : workshops.map((w) => (
                    <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selectedWorkshops.includes(w.id)} onCheckedChange={() => toggleWorkshop(w.id)} />
                      {w.title}
                    </label>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: Payment Details */}
            <TabsContent value="payment" className="space-y-4">
              <Card className="border border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Custom field</Label>
                  </div>
                  {customFields.map((cf, i) => {
                    const update = (patch: Partial<typeof cf>) => {
                      const updated = [...customFields];
                      updated[i] = { ...updated[i], ...patch };
                      setCustomFields(updated);
                    };
                    return (
                      <div key={i} className="p-3 border border-border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Input placeholder="Field title" value={cf.label} onChange={(e) => update({ label: e.target.value })} className="flex-1" />
                          <Select value={cf.type} onValueChange={(v: "short_text" | "dropdown") => update({ type: v })}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short_text">Short Text</SelectItem>
                              <SelectItem value="dropdown">Drop Down</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => setCustomFields(customFields.filter((_, idx) => idx !== i))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Input placeholder="Help text (optional)" value={cf.helpText} onChange={(e) => update({ helpText: e.target.value })} className="text-xs" />
                        {cf.type === "dropdown" && (
                          <Input placeholder="Options, comma separated" value={cf.options} onChange={(e) => update({ options: e.target.value })} className="text-xs" />
                        )}
                        <div className="flex items-center gap-4 pt-1">
                          <label className="flex items-center gap-1.5 text-xs">
                            <Checkbox checked={cf.hidden} onCheckedChange={(v) => update({ hidden: !!v })} /> Hidden
                          </label>
                          <label className="flex items-center gap-1.5 text-xs">
                            <Checkbox checked={!cf.required} onCheckedChange={(v) => update({ required: !v })} /> Optional
                          </label>
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={addCustomField}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add field
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardContent className="p-4 space-y-3">
                  <Label className="font-semibold">Payment Options</Label>
                  <p className="text-xs text-muted-foreground">Choose which payment methods buyers can use at checkout.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={paymentMethods.upi} onCheckedChange={(v) => setPaymentMethods({ ...paymentMethods, upi: !!v })} /> UPI</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={paymentMethods.card} onCheckedChange={(v) => setPaymentMethods({ ...paymentMethods, card: !!v })} /> Cards</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={paymentMethods.netbanking} onCheckedChange={(v) => setPaymentMethods({ ...paymentMethods, netbanking: !!v })} /> Netbanking</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={paymentMethods.wallet} onCheckedChange={(v) => setPaymentMethods({ ...paymentMethods, wallet: !!v })} /> Wallet</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={paymentMethods.paylater} onCheckedChange={(v) => setPaymentMethods({ ...paymentMethods, paylater: !!v })} /> Pay Later</label>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="font-semibold">Terms & Conditions</Label>
                      <Badge className="bg-accent/20 text-accent text-[10px]">NEW</Badge>
                    </div>
                    <Switch checked={enableTerms} onCheckedChange={setEnableTerms} />
                  </div>
                  {enableTerms && (
                    <Textarea placeholder="Enter your terms and conditions..." value={termsConditions} onChange={(e) => setTermsConditions(e.target.value)} rows={4} />
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardContent className="p-4 space-y-3">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full"
                    onClick={() => setShowAdvanceSettings(!showAdvanceSettings)}
                  >
                    <Label className="font-semibold cursor-pointer">Advance settings</Label>
                    <span className="text-xs text-muted-foreground">{showAdvanceSettings ? "Hide" : "Show"}</span>
                  </button>

                  {showAdvanceSettings && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm"><Checkbox checked={collectAddress} onCheckedChange={(v) => setCollectAddress(!!v)} /> Collect address</label>
                        <label className="flex items-center gap-2 text-sm"><Checkbox checked={collectGst} onCheckedChange={(v) => setCollectGst(!!v)} /> Collect GST details</label>
                      </div>

                      <div className="flex items-center justify-between py-1.5">
                        <Label className="text-sm">OTP-less checkout</Label>
                        <Switch checked={otpLessCheckout} onCheckedChange={setOtpLessCheckout} />
                      </div>

                      <div className="flex items-center justify-between py-1.5">
                        <Label className="text-sm">Limit seats available for sale</Label>
                        <Switch checked={enableSeatsLimit} onCheckedChange={setEnableSeatsLimit} />
                      </div>
                      {enableSeatsLimit && (
                        <div className="grid grid-cols-2 gap-3 pl-4">
                          <div><Label className="text-xs">Seat count</Label><Input type="number" value={seatsCount} onChange={(e) => setSeatsCount(e.target.value)} /></div>
                          <div><Label className="text-xs">"Seats left" text</Label><Input value={seatsText} onChange={(e) => setSeatsText(e.target.value)} placeholder="{n} seats left" /></div>
                        </div>
                      )}

                      <div className="flex items-center justify-between py-1.5">
                        <Label className="text-sm">Add start date</Label>
                        <Switch checked={enableStartDate} onCheckedChange={setEnableStartDate} />
                      </div>
                      {enableStartDate && (
                        <div className="pl-4"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-48" /></div>
                      )}

                      <div className="flex items-center justify-between py-1.5">
                        <Label className="text-sm">Email notification on every purchase</Label>
                        <Switch checked={notifyOnPurchase} onCheckedChange={setNotifyOnPurchase} />
                      </div>

                      <div className="flex items-center justify-between py-1.5">
                        <Label className="text-sm">Hide the coupon code field</Label>
                        <Switch checked={hideCoupon} onCheckedChange={setHideCoupon} />
                      </div>

                      <div className="flex items-center justify-between py-1.5">
                        <Label className="text-sm">Enable re-registration / re-purchase</Label>
                        <Switch checked={allowReregistration} onCheckedChange={setAllowReregistration} />
                      </div>

                      <div className="flex items-center justify-between py-1.5">
                        <Label className="text-sm">Set service validity</Label>
                        <Switch checked={enableValidity} onCheckedChange={setEnableValidity} />
                      </div>
                      {enableValidity && (
                        <div className="pl-4 space-y-3">
                          <div><Label className="text-xs">Validity (days)</Label><Input type="number" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} className="w-32" /></div>
                          <label className="flex items-center gap-2 text-sm"><Checkbox checked={enableRenewalCard} onCheckedChange={(v) => setEnableRenewalCard(!!v)} /> Show renewal card</label>
                          {enableRenewalCard && (
                            <label className="flex items-center gap-2 text-sm pl-6"><Checkbox checked={customizeRenewalCard} onCheckedChange={(v) => setCustomizeRenewalCard(!!v)} /> Customise renewal card</label>
                          )}
                          {enableRenewalCard && customizeRenewalCard && (
                            <div className="pl-6 space-y-2">
                              <div><Label className="text-xs">Renewal message</Label><Textarea rows={2} value={renewalMessage} onChange={(e) => setRenewalMessage(e.target.value)} /></div>
                              <div><Label className="text-xs">Button text</Label><Input value={renewalButtonText} onChange={(e) => setRenewalButtonText(e.target.value)} className="w-48" /></div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between py-1.5">
                        <Label className="text-sm">Create a chat room for buyers</Label>
                        <Switch checked={enableChatRoom} onCheckedChange={setEnableChatRoom} />
                      </div>

                      <div className="flex items-center justify-between py-1.5">
                        <Label className="text-sm">Facebook Pixel ID</Label>
                        <Input value={fbPixelId} onChange={(e) => setFbPixelId(e.target.value)} placeholder="123456789012345" className="w-48" />
                      </div>

                      <div>
                        <Label className="text-sm">Attach a freebie service</Label>
                        <Select value={freebieServiceId || "none"} onValueChange={(v) => setFreebieServiceId(v === "none" ? "" : v)}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {otherServices.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between py-1.5">
                        <Label className="text-sm">Enable multiple-quantity purchases</Label>
                        <Switch checked={allowMultipleQuantity} onCheckedChange={setAllowMultipleQuantity} />
                      </div>

                      <div className="flex items-center justify-between py-1.5">
                        <Label className="text-sm">Notify me when a payment fails</Label>
                        <Switch checked={notifyOnPaymentFailure} onCheckedChange={setNotifyOnPaymentFailure} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Payment Success Page */}
            <TabsContent value="success" className="space-y-4">
              <Card className="border border-border">
                <CardContent className="p-4 space-y-3">
                  <Label className="font-semibold">Custom section</Label>
                  {successSections.map((sec, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border border-border rounded">
                      <div className="flex items-center gap-2">
                        {sec.type === "image" ? <Image className="h-4 w-4" /> : sec.type === "video" ? <Video className="h-4 w-4" /> : <Type className="h-4 w-4" />}
                        <span className="text-sm">{sec.title || sec.type}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setSuccessSections(successSections.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full"><Plus className="h-3.5 w-3.5 mr-1" /> Add custom section</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add custom section</DialogTitle></DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div className="grid grid-cols-3 gap-3">
                          {(["image", "video", "content"] as const).map((t) => (
                            <button key={t} onClick={() => setNewSectionType(t)} className={`p-4 border-2 rounded-lg text-center transition-colors ${newSectionType === t ? "border-accent bg-accent/5" : "border-border"}`}>
                              {t === "image" ? <Image className="h-8 w-8 mx-auto mb-1" /> : t === "video" ? <Video className="h-8 w-8 mx-auto mb-1" /> : <Type className="h-8 w-8 mx-auto mb-1" />}
                              <span className="text-sm capitalize">{t}</span>
                            </button>
                          ))}
                        </div>
                        <div><Label>Section title</Label><Input placeholder="Section title" value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} /></div>
                        <div><Label>Description</Label><Textarea placeholder="Write a description for the section" value={newSectionContent} onChange={(e) => setNewSectionContent(e.target.value)} rows={3} /></div>
                        <Button className="w-full bg-foreground text-background hover:bg-foreground/90" onClick={addSuccessSection}>Add</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <Label>Add custom script</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between py-2">
                  <Label>Customise button</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between py-2">
                  <Label>Redirect URL</Label>
                  <Switch />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Right: Mobile Preview */}
          <div className="sticky top-20">
            <div className="bg-zinc-900 rounded-[2.5rem] p-2.5 shadow-xl max-w-[280px] mx-auto border-[6px] border-zinc-900">
              <div className="bg-background rounded-[2rem] overflow-hidden min-h-[520px] flex flex-col relative">
                <div className="h-6 flex items-center justify-center shrink-0">
                  <div className="w-20 h-4 bg-zinc-900 rounded-full" />
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="p-4 text-center">
                    <div className="w-10 h-10 bg-accent/20 rounded-full mx-auto mb-3 flex items-center justify-center text-accent font-bold text-sm">
                      {(title || "S").charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs text-muted-foreground">by <span className="font-semibold text-foreground">1corehub</span></p>
                    {title && <p className="font-semibold text-sm mt-1">{title}</p>}
                    {description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-3">{description}</p>}
                    {!title && !description && (
                      <p className="text-[10px] text-muted-foreground mt-6">
                        You agree to share information entered on this page with 1corehub (owner of this page), adhering to applicable laws.
                      </p>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-5 border-t border-border pt-3 flex items-center justify-between">
                  <span className="text-lg font-bold">{isFree ? "Free" : `${currencySymbol}${price || 0}`}</span>
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs px-5 font-bold">
                    Buy Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
