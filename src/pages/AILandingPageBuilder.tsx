import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Eye, Upload } from "lucide-react";

export default function AILandingPageBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"form" | "preview">("form");

  // Form state
  const [coachName, setCoachName] = useState("");
  const [skill, setSkill] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [coreOutcome, setCoreOutcome] = useState("");
  const [workshopDate, setWorkshopDate] = useState("");
  const [workshopTime, setWorkshopTime] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [ctaFormLink, setCtaFormLink] = useState("");
  const [mentorImageUrl, setMentorImageUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  // Generated content
  const [generated, setGenerated] = useState<any>(null);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/landing-pages/${Date.now()}.${ext}`;
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

  const handleGenerate = async () => {
    if (!coachName.trim() || !skill.trim() || !targetAudience.trim() || !coreOutcome.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-landing-page", {
        body: { coachName, skill, targetAudience, coreOutcome, workshopDate, workshopTime },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGenerated(data.content);
      setStep("preview");
      toast({ title: "Landing page generated!" });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handlePublish = async () => {
    if (!user || !generated) return;
    setSaving(true);
    const slug = skill.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
    const { error } = await supabase
      .from("landing_pages" as any)
      .insert({
        coach_id: user.id,
        slug,
        status: "published",
        coach_name: coachName,
        skill,
        target_audience: targetAudience,
        core_outcome: coreOutcome,
        workshop_date: workshopDate || null,
        workshop_time: workshopTime,
        whatsapp_link: whatsappLink,
        cta_form_link: ctaFormLink,
        mentor_image_url: mentorImageUrl,
        thumbnail_url: thumbnailUrl,
        generated_content: generated,
        bonuses: generated.defaultBonuses || [],
        published_at: new Date().toISOString(),
      } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Published!", description: `Your page is live at /workshop/${slug}` });
      navigate("/page-builder");
    }
    setSaving(false);
  };

  if (step === "preview" && generated) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto py-6 px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold font-display">Preview Landing Page</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("form")}>← Edit Details</Button>
              <Button onClick={handlePublish} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Publish Page
              </Button>
            </div>
          </div>
          <LandingPagePreview
            generated={generated}
            coachName={coachName}
            mentorImageUrl={mentorImageUrl}
            workshopDate={workshopDate}
            workshopTime={workshopTime}
            ctaFormLink={ctaFormLink}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">Create AI Workshop Landing Page</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Workshop Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Coach Name *</Label>
                <Input value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder="Shashikanth" />
              </div>
              <div>
                <Label className="text-xs">Skill / Niche *</Label>
                <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="AI Video Creation" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Target Audience *</Label>
              <Input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Students & Freelancers" />
            </div>
            <div>
              <Label className="text-xs">Core Outcome / Promise *</Label>
              <Textarea value={coreOutcome} onChange={(e) => setCoreOutcome(e.target.value)} placeholder="Learn AI Video Creation in 2 Hours" rows={2} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Workshop Date</Label>
                <Input type="date" value={workshopDate} onChange={(e) => setWorkshopDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Workshop Time</Label>
                <Input value={workshopTime} onChange={(e) => setWorkshopTime(e.target.value)} placeholder="7:00 PM IST" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">WhatsApp Group Link</Label>
                <Input value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} placeholder="https://chat.whatsapp.com/xxx" />
              </div>
              <div>
                <Label className="text-xs">CTA Form Link</Label>
                <Input value={ctaFormLink} onChange={(e) => setCtaFormLink(e.target.value)} placeholder="Google Form URL" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImageUploadField label="Mentor Image" url={mentorImageUrl} onUpload={(e) => handleImageUpload(e, setMentorImageUrl)} />
              <ImageUploadField label="Workshop Thumbnail" url={thumbnailUrl} onUpload={(e) => handleImageUpload(e, setThumbnailUrl)} />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base"
            >
              {generating ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Generating with AI...</>
              ) : (
                <><Sparkles className="h-5 w-5 mr-2" /> Generate Landing Page with AI</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function ImageUploadField({ label, url, onUpload }: { label: string; url: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="border rounded-lg p-3 flex items-center gap-3 bg-muted/30">
        {url ? (
          <img src={url} alt={label} className="h-12 w-12 rounded object-cover" />
        ) : (
          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <label className="text-xs text-primary cursor-pointer hover:underline">
          {url ? "Change" : "Upload"}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      </div>
    </div>
  );
}

// ── Preview component ──
function LandingPagePreview({
  generated,
  coachName,
  mentorImageUrl,
  workshopDate,
  workshopTime,
  ctaFormLink,
}: {
  generated: any;
  coachName: string;
  mentorImageUrl: string;
  workshopDate: string;
  workshopTime: string;
  ctaFormLink: string;
}) {
  const formattedDate = workshopDate ? new Date(workshopDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "TBD";

  return (
    <div className="space-y-6 bg-background border rounded-xl overflow-hidden">
      {/* Hero */}
      <section className="bg-gradient-to-br from-accent/10 via-background to-primary/5 p-8 md:p-12 text-center">
        <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">FREE LIVE WORKSHOP</p>
        <h1 className="text-2xl md:text-3xl font-bold font-display mb-3">{generated.title}</h1>
        <p className="text-muted-foreground mb-4 max-w-xl mx-auto">{generated.subtitle}</p>
        <p className="text-sm font-medium mb-4">📅 {formattedDate} · ⏰ {workshopTime || "TBD"}</p>
        <a href={ctaFormLink || "#"} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8">
            {generated.ctaText || "Save My FREE Spot"}
          </Button>
        </a>
      </section>

      {/* Mentor */}
      <section className="px-8 py-6 flex items-center gap-6">
        {mentorImageUrl ? (
          <img src={mentorImageUrl} alt={coachName} className="h-20 w-20 rounded-full object-cover border-2 border-accent" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-accent/20 flex items-center justify-center text-2xl font-bold text-accent">
            {coachName.charAt(0)}
          </div>
        )}
        <div>
          <h3 className="font-bold text-lg">{coachName}</h3>
          <p className="text-sm text-muted-foreground">{generated.mentorBio}</p>
        </div>
      </section>

      {/* Problems */}
      <section className="px-8 py-6 bg-destructive/5">
        <h2 className="text-lg font-bold text-center mb-4">Are you facing these problems?</h2>
        <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {generated.problems?.map((p: string, i: number) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-background rounded-lg">
              <span className="text-destructive">✗</span>
              <span className="text-sm">{p}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="px-8 py-6">
        <h2 className="text-lg font-bold text-center mb-4">What you will achieve</h2>
        <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {generated.benefits?.map((b: string, i: number) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-accent/5 rounded-lg">
              <span className="text-accent">✓</span>
              <span className="text-sm">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section className="px-8 py-6 bg-muted/30">
        <h2 className="text-lg font-bold text-center mb-4">What You Will Learn</h2>
        <div className="space-y-3 max-w-2xl mx-auto">
          {generated.modules?.map((m: any, i: number) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-background rounded-lg border">
              <span className="bg-accent text-accent-foreground rounded-full h-7 w-7 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
              <div>
                <h4 className="font-semibold text-sm">{m.title}</h4>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bonuses */}
      <section className="px-8 py-6">
        <h2 className="text-lg font-bold text-center mb-4">🎁 Exclusive Bonuses</h2>
        <div className="grid md:grid-cols-3 gap-3 max-w-3xl mx-auto">
          {generated.defaultBonuses?.map((b: any, i: number) => (
            <div key={i} className="p-4 border rounded-lg text-center bg-accent/5">
              <h4 className="font-semibold text-sm mb-1">{b.title}</h4>
              <p className="text-xs text-muted-foreground mb-2">{b.description}</p>
              <span className="text-xs font-bold text-accent">Worth {b.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Certificate */}
      <section className="px-8 py-6 bg-muted/30 text-center">
        <h2 className="text-lg font-bold mb-2">🏅 Certificate of Completion</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">{generated.certificateText}</p>
      </section>

      {/* FAQ */}
      <section className="px-8 py-6">
        <h2 className="text-lg font-bold text-center mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3 max-w-2xl mx-auto">
          {generated.faqs?.map((f: any, i: number) => (
            <div key={i} className="p-4 border rounded-lg">
              <h4 className="font-semibold text-sm mb-1">{f.question}</h4>
              <p className="text-xs text-muted-foreground">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-8 py-8 bg-accent/10 text-center">
        <p className="text-sm font-medium mb-2">📅 {formattedDate} · ⏰ {workshopTime || "TBD"}</p>
        <p className="text-xs text-muted-foreground mb-4">{generated.urgencyText}</p>
        <a href={ctaFormLink || "#"} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8">
            Reserve My Seat Now
          </Button>
        </a>
      </section>
    </div>
  );
}
