import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Razorpay
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user) loadPaymentSettings();
  }, [user]);

  const loadPaymentSettings = async () => {
    const { data } = await supabase
      .from("coach_payment_settings" as any)
      .select("*")
      .eq("coach_id", user!.id)
      .maybeSingle();
    if (data) {
      setRazorpayKeyId((data as any).razorpay_key_id || "");
      setRazorpayKeySecret((data as any).razorpay_key_secret || "");
      setIsConnected(!!(data as any).razorpay_key_id && !!(data as any).razorpay_key_secret);
    }
    setLoadingPayment(false);
  };

  const savePaymentSettings = async () => {
    if (!user) return;
    if (!razorpayKeyId.trim() || !razorpayKeySecret.trim()) {
      toast({ title: "Error", description: "Both Key ID and Secret are required", variant: "destructive" });
      return;
    }
    setSavingPayment(true);
    const { error } = await supabase
      .from("coach_payment_settings" as any)
      .upsert({
        coach_id: user.id,
        razorpay_key_id: razorpayKeyId.trim(),
        razorpay_key_secret: razorpayKeySecret.trim(),
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "coach_id" });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved!", description: "Razorpay keys saved successfully" });
      setIsConnected(true);
    }
    setSavingPayment(false);
  };

  const disconnectRazorpay = async () => {
    if (!user) return;
    setSavingPayment(true);
    await supabase
      .from("coach_payment_settings" as any)
      .upsert({
        coach_id: user.id,
        razorpay_key_id: null,
        razorpay_key_secret: null,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "coach_id" });
    setRazorpayKeyId("");
    setRazorpayKeySecret("");
    setIsConnected(false);
    setSavingPayment(false);
    toast({ title: "Disconnected", description: "Razorpay has been disconnected" });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Settings</h1>

        <Tabs defaultValue="profile">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="domain">Custom Domain</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-sm">Profile Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Full Name</Label><Input defaultValue={user?.user_metadata?.full_name || ""} /></div>
                <div><Label>Email</Label><Input defaultValue={user?.email || ""} readOnly /></div>
                <div><Label>Bio</Label><Textarea placeholder="Tell us about yourself..." rows={3} /></div>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Save Profile</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-sm">Branding</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Brand Name</Label><Input placeholder="Your brand name" /></div>
                <div><Label>Brand Color</Label><Input type="color" defaultValue="#f97316" className="h-10 w-20" /></div>
                <div><Label>Logo URL</Label><Input placeholder="https://..." /></div>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Save Branding</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domain">
            <Card className="card-shadow">
              <CardHeader><CardTitle className="text-sm">Custom Domain</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Custom Domain</Label><Input placeholder="yourdomain.com" /></div>
                <p className="text-xs text-muted-foreground">Point your domain's CNAME to our servers to enable custom domain.</p>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Verify Domain</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="card-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Razorpay Payment Gateway</CardTitle>
                  {isConnected && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingPayment ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Connect your Razorpay account to accept payments in ₹ INR. Get your keys from{" "}
                      <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer" className="text-accent underline">
                        Razorpay Dashboard → Settings → API Keys
                      </a>
                    </p>

                    <div>
                      <Label className="text-xs">Razorpay Key ID</Label>
                      <Input
                        placeholder="rzp_live_xxxxxxxxxxxx"
                        value={razorpayKeyId}
                        onChange={(e) => setRazorpayKeyId(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Razorpay Key Secret</Label>
                      <div className="relative">
                        <Input
                          type={showSecret ? "text" : "password"}
                          placeholder="Enter your key secret"
                          value={razorpayKeySecret}
                          onChange={(e) => setRazorpayKeySecret(e.target.value)}
                          className="font-mono text-xs pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={savePaymentSettings}
                        disabled={savingPayment}
                      >
                        {savingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isConnected ? "Update Keys" : "Connect Razorpay"}
                      </Button>
                      {isConnected && (
                        <Button variant="outline" onClick={disconnectRazorpay} disabled={savingPayment}>
                          Disconnect
                        </Button>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      All transactions are processed in Indian Rupees (₹ INR) via Razorpay. Supports UPI, Cards, Netbanking, Wallets.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
