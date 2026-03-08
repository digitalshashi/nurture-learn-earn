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
import { Loader2, Eye, EyeOff, CheckCircle2, Zap, Video } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Razorpay state
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // AI Settings state
  const [aiKey, setAiKey] = useState("");
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiModel, setAiModel] = useState("gpt-4o-mini");
  const [aiTemp, setAiTemp] = useState(0.7);
  const [aiMaxTokens, setAiMaxTokens] = useState(3000);
  const [savingAi, setSavingAi] = useState(false);
  const [loadingAi, setLoadingAi] = useState(true);
  const [aiConnected, setAiConnected] = useState(false);
  const [testingAi, setTestingAi] = useState(false);

  // Zoom Settings state
  const [zoomAccountId, setZoomAccountId] = useState("");
  const [zoomClientId, setZoomClientId] = useState("");
  const [zoomClientSecret, setZoomClientSecret] = useState("");
  const [showZoomSecret, setShowZoomSecret] = useState(false);
  const [savingZoom, setSavingZoom] = useState(false);
  const [loadingZoom, setLoadingZoom] = useState(true);
  const [zoomConnected, setZoomConnected] = useState(false);

  useEffect(() => {
    if (user) {
      loadPaymentSettings();
      loadAiSettings();
      loadZoomSettings();
    }
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
      .upsert({ coach_id: user.id, razorpay_key_id: razorpayKeyId.trim(), razorpay_key_secret: razorpayKeySecret.trim(), updated_at: new Date().toISOString() } as any, { onConflict: "coach_id" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved!" }); setIsConnected(true); }
    setSavingPayment(false);
  };

  const disconnectRazorpay = async () => {
    if (!user) return;
    setSavingPayment(true);
    await supabase.from("coach_payment_settings" as any).upsert({ coach_id: user.id, razorpay_key_id: null, razorpay_key_secret: null, updated_at: new Date().toISOString() } as any, { onConflict: "coach_id" });
    setRazorpayKeyId(""); setRazorpayKeySecret(""); setIsConnected(false); setSavingPayment(false);
    toast({ title: "Disconnected" });
  };

  const loadAiSettings = async () => {
    const { data } = await supabase
      .from("ai_settings" as any)
      .select("*")
      .eq("coach_id", user!.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setAiKey(d.openai_api_key || "");
      setAiModel(d.model || "gpt-4o-mini");
      setAiTemp(Number(d.temperature) || 0.7);
      setAiMaxTokens(d.max_tokens || 3000);
      setAiConnected(!!d.openai_api_key);
    }
    setLoadingAi(false);
  };

  const saveAiSettings = async () => {
    if (!user || !aiKey.trim()) {
      toast({ title: "Error", description: "API key is required", variant: "destructive" });
      return;
    }
    setSavingAi(true);
    const { error } = await supabase
      .from("ai_settings" as any)
      .upsert({
        coach_id: user.id,
        openai_api_key: aiKey.trim(),
        model: aiModel,
        temperature: aiTemp,
        max_tokens: aiMaxTokens,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "coach_id" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "AI Settings saved!" }); setAiConnected(true); }
    setSavingAi(false);
  };

  const testAiConnection = async () => {
    setTestingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-course", {
        body: { action: "test" },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ Connection successful!", description: "Your OpenAI API key is working." });
      } else {
        toast({ title: "❌ Connection failed", description: data?.message || "Invalid API key", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setTestingAi(false);
  };

  const maskedKey = aiKey ? "sk-" + "•".repeat(20) + aiKey.slice(-4) : "";

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Settings</h1>

        <Tabs defaultValue="profile">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="ai">AI Settings</TabsTrigger>
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

          <TabsContent value="payments">
            <Card className="card-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Razorpay Payment Gateway</CardTitle>
                  {isConnected && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Connected</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingPayment ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Connect your Razorpay account. Get keys from <a href="https://dashboard.razorpay.com/app/keys" target="_blank" className="text-accent underline">Razorpay Dashboard</a></p>
                    <div><Label className="text-xs">Razorpay Key ID</Label><Input placeholder="rzp_live_xxxxxxxxxxxx" value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} className="font-mono text-xs" /></div>
                    <div>
                      <Label className="text-xs">Razorpay Key Secret</Label>
                      <div className="relative">
                        <Input type={showSecret ? "text" : "password"} placeholder="Enter your key secret" value={razorpayKeySecret} onChange={(e) => setRazorpayKeySecret(e.target.value)} className="font-mono text-xs pr-10" />
                        <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={savePaymentSettings} disabled={savingPayment}>
                        {savingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isConnected ? "Update Keys" : "Connect Razorpay"}
                      </Button>
                      {isConnected && <Button variant="outline" onClick={disconnectRazorpay} disabled={savingPayment}>Disconnect</Button>}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card className="card-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /> OpenAI Integration</CardTitle>
                  {aiConnected && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Connected</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {loadingAi ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Connect your OpenAI account to use AI Course Generator. Get your API key from{" "}
                      <a href="https://platform.openai.com/api-keys" target="_blank" className="text-accent underline">OpenAI Dashboard</a>
                    </p>
                    <div>
                      <Label className="text-xs">OpenAI API Key</Label>
                      <div className="relative">
                        <Input type={showAiKey ? "text" : "password"} placeholder="sk-xxxxxxxxxxxxxxxxxxxx" value={aiKey} onChange={(e) => setAiKey(e.target.value)} className="font-mono text-xs pr-10" />
                        <button type="button" onClick={() => setShowAiKey(!showAiKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {aiConnected && !showAiKey && <p className="text-[10px] text-muted-foreground mt-1">{maskedKey}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">Model</Label>
                      <Select value={aiModel} onValueChange={setAiModel}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast & Affordable)</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o (Best Quality)</SelectItem>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Temperature: {aiTemp}</Label>
                      <Slider value={[aiTemp]} onValueChange={([v]) => setAiTemp(v)} min={0} max={1} step={0.1} className="mt-2" />
                      <p className="text-[10px] text-muted-foreground mt-1">Lower = more focused, Higher = more creative</p>
                    </div>
                    <div>
                      <Label className="text-xs">Max Tokens</Label>
                      <Input type="number" value={aiMaxTokens} onChange={(e) => setAiMaxTokens(Number(e.target.value))} min={500} max={8000} className="text-xs" />
                    </div>
                    <div className="flex gap-2">
                      <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={saveAiSettings} disabled={savingAi}>
                        {savingAi && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {aiConnected ? "Update Configuration" : "Save Configuration"}
                      </Button>
                      {aiConnected && (
                        <Button variant="outline" onClick={testAiConnection} disabled={testingAi}>
                          {testingAi && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Test Connection
                        </Button>
                      )}
                    </div>
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
