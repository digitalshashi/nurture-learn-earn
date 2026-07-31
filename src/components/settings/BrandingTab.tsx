import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

export function BrandingTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [productName, setProductName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [invoiceLogoUrl, setInvoiceLogoUrl] = useState("");
  const [emailLogoUrl, setEmailLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [themeColor, setThemeColor] = useState("#f97316");

  useEffect(() => {
    if (user) loadSettings();
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("platform_settings" as any)
      .select("*")
      .eq("coach_id", user!.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setBrandName(d.brand_name || "");
      setProductName(d.product_name || "");
      setLogoUrl(d.logo_url || "");
      setInvoiceLogoUrl(d.invoice_logo_url || "");
      setEmailLogoUrl(d.email_logo_url || "");
      setFaviconUrl(d.favicon_url || "");
      setThemeColor(d.theme_color || "#f97316");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as any)
      .upsert({
        coach_id: user.id,
        brand_name: brandName,
        product_name: productName,
        logo_url: logoUrl,
        invoice_logo_url: invoiceLogoUrl,
        email_logo_url: emailLogoUrl,
        favicon_url: faviconUrl,
        theme_color: themeColor,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "coach_id" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Settings updated successfully" });
    setSaving(false);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/branding/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("course-resources")
      .upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("course-resources").getPublicUrl(path);
    setter(urlData.publicUrl);
    toast({ title: "Uploaded!" });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <section className="space-y-4">
          <h3 className="font-semibold text-sm">Naming Conventions</h3>
          <div>
            <Label className="text-xs">Brand Name</Label>
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Your brand name" />
          </div>
          <div>
            <Label className="text-xs">Product Name</Label>
            <div className="relative">
              <Input value={productName} onChange={(e) => setProductName(e.target.value.slice(0, 20))} placeholder="service" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{productName.length} / 20</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Every product on your platform will be called as <strong>{productName || "Service"}/Services</strong></p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-sm">Logo & Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LogoUpload label="Platform Logo" url={logoUrl} onUpload={(e) => handleFileUpload(e, setLogoUrl)} />
            <LogoUpload label="Invoice Header Logo" url={invoiceLogoUrl} onUpload={(e) => handleFileUpload(e, setInvoiceLogoUrl)} />
            <LogoUpload label="Email Header Logo" url={emailLogoUrl} onUpload={(e) => handleFileUpload(e, setEmailLogoUrl)} />
          </div>
          <LogoUpload label="Favicon logo" url={faviconUrl} onUpload={(e) => handleFileUpload(e, setFaviconUrl)} />
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-sm">Colors</h3>
          <div>
            <Label className="text-xs">Primary/Theme Color</Label>
            <Input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="h-10 w-16 p-1 cursor-pointer" />
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LogoUpload({ label, url, onUpload }: { label: string; url: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="border rounded-lg p-4 flex flex-col items-center justify-center min-h-[120px] bg-muted/30 relative">
        {url ? (
          <img src={url} alt={label} className="max-h-16 object-contain" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <label className="text-xs text-primary cursor-pointer mt-2 hover:underline">
          {url ? "Replace" : "Upload"}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      </div>
    </div>
  );
}
