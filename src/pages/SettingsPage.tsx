import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { PaymentGatewaysCard } from "@/components/payments/PaymentGatewaysCard";
import { CurrencyCard } from "@/components/payments/CurrencyCard";
import { AiProvidersTab } from "@/components/settings/AiProvidersTab";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, CheckCircle2, Video } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();


  // The section lives in the URL so Settings can link straight to Payments,
  // AI or Zoom instead of always dropping people on the first tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const TABS = ["payments", "ai", "zoom"] as const;
  const requested = searchParams.get("tab");
  const tab = TABS.includes(requested as (typeof TABS)[number]) ? requested! : "payments";

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
      loadZoomSettings();
    }
  }, [user]);


  const loadZoomSettings = async () => {
    const { data } = await supabase
      .from("zoom_settings" as any)
      .select("*")
      .eq("coach_id", user!.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setZoomAccountId(d.zoom_account_id || "");
      setZoomClientId(d.zoom_client_id || "");
      setZoomClientSecret(d.zoom_client_secret || "");
      setZoomConnected(!!d.zoom_account_id && !!d.zoom_client_id && !!d.zoom_client_secret);
    }
    setLoadingZoom(false);
  };

  const saveZoomSettings = async () => {
    if (!user) return;
    if (!zoomAccountId.trim() || !zoomClientId.trim() || !zoomClientSecret.trim()) {
      toast({ title: "Error", description: "All Zoom fields are required", variant: "destructive" });
      return;
    }
    setSavingZoom(true);
    const { error } = await supabase
      .from("zoom_settings" as any)
      .upsert({
        coach_id: user.id,
        zoom_account_id: zoomAccountId.trim(),
        zoom_client_id: zoomClientId.trim(),
        zoom_client_secret: zoomClientSecret.trim(),
        is_connected: true,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "coach_id" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Zoom settings saved!" }); setZoomConnected(true); }
    setSavingZoom(false);
  };

  const disconnectZoom = async () => {
    if (!user) return;
    setSavingZoom(true);
    await supabase.from("zoom_settings" as any).upsert({
      coach_id: user.id, zoom_account_id: null, zoom_client_id: null, zoom_client_secret: null, is_connected: false, updated_at: new Date().toISOString()
    } as any, { onConflict: "coach_id" });
    setZoomAccountId(""); setZoomClientId(""); setZoomClientSecret(""); setZoomConnected(false); setSavingZoom(false);
    toast({ title: "Zoom disconnected" });
  };  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Settings</h1>

        <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="ai">AI providers</TabsTrigger>
            <TabsTrigger value="zoom">Zoom</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            {/* Currency is set per gateway below: that is the value the
                charge actually uses. A separate "default currency" here wrote a
                column nothing read, so two controls disagreed and only one
                mattered. */}
            <div className="mb-4">
              <CurrencyCard />
            </div>

            <PaymentGatewaysCard coachId={user!.id} />
          </TabsContent>

          <TabsContent value="ai">
            <AiProvidersTab coachId={user!.id} />
          </TabsContent>

          <TabsContent value="zoom">
            <Card className="card-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Video className="h-4 w-4 text-blue-500" /> Zoom Integration</CardTitle>
                  {zoomConnected && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Connected</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingZoom ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Connect your Zoom account for auto-generated meeting links when creating events. Get credentials from{" "}
                      <a href="https://marketplace.zoom.us/develop/create" target="_blank" className="text-accent underline">Zoom App Marketplace</a> → Create a Server-to-Server OAuth app.
                    </p>
                    <div>
                      <Label className="text-xs">Zoom Account ID</Label>
                      <Input placeholder="Enter your Zoom Account ID" value={zoomAccountId} onChange={(e) => setZoomAccountId(e.target.value)} className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Zoom Client ID</Label>
                      <Input placeholder="Enter your Zoom Client ID" value={zoomClientId} onChange={(e) => setZoomClientId(e.target.value)} className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Zoom Client Secret</Label>
                      <div className="relative">
                        <Input type={showZoomSecret ? "text" : "password"} placeholder="Enter your Zoom Client Secret" value={zoomClientSecret} onChange={(e) => setZoomClientSecret(e.target.value)} className="font-mono text-xs pr-10" />
                        <button type="button" onClick={() => setShowZoomSecret(!showZoomSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showZoomSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={saveZoomSettings} disabled={savingZoom}>
                        {savingZoom && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{zoomConnected ? "Update Credentials" : "Connect Zoom"}
                      </Button>
                      {zoomConnected && <Button variant="outline" onClick={disconnectZoom} disabled={savingZoom}>Disconnect</Button>}
                    </div>
                    {zoomConnected && (
                      <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">✅ Zoom is connected</p>
                        <p>Meeting links will be auto-generated when you create events. Students will receive the Zoom link automatically.</p>
                      </div>
                    )}
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
