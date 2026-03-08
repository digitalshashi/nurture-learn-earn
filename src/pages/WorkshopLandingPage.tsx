import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function WorkshopLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) loadPage();
  }, [slug]);

  const loadPage = async () => {
    const { data, error } = await supabase
      .from("landing_pages" as any)
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!data || error) setNotFound(true);
    else setPage(data as any);
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <h1 className="text-2xl font-bold">Page Not Found</h1>
      <p className="text-muted-foreground">This workshop page doesn't exist or has been unpublished.</p>
    </div>
  );

  const g = page.generated_content || {};
  const formattedDate = page.workshop_date ? new Date(page.workshop_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "TBD";

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-accent/10 via-background to-primary/5 px-6 py-12 md:py-20 text-center">
        <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">FREE LIVE WORKSHOP</p>
        <h1 className="text-3xl md:text-4xl font-bold font-display mb-4 max-w-3xl mx-auto">{g.title}</h1>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto text-lg">{g.subtitle}</p>
        <p className="text-sm font-medium mb-6">📅 {formattedDate} · ⏰ {page.workshop_time || "TBD"}</p>
        <a href={page.cta_form_link || "#"} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-10 h-14">
            {g.ctaText || "Save My FREE Spot"}
          </Button>
        </a>
      </section>

      {/* Mentor */}
      <section className="px-6 py-10 max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-6">
        {page.mentor_image_url ? (
          <img src={page.mentor_image_url} alt={page.coach_name} className="h-24 w-24 rounded-full object-cover border-4 border-accent shrink-0" />
        ) : (
          <div className="h-24 w-24 rounded-full bg-accent/20 flex items-center justify-center text-3xl font-bold text-accent shrink-0">
            {page.coach_name?.charAt(0)}
          </div>
        )}
        <div className="text-center md:text-left">
          <h3 className="font-bold text-xl">{page.coach_name}</h3>
          <p className="text-muted-foreground mt-1">{g.mentorBio}</p>
        </div>
      </section>

      {/* Problems */}
      <section className="px-6 py-10 bg-destructive/5">
        <h2 className="text-2xl font-bold text-center mb-6">Are you facing these problems?</h2>
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {g.problems?.map((p: string, i: number) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-background rounded-xl shadow-sm">
              <span className="text-destructive text-lg">✗</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 py-10">
        <h2 className="text-2xl font-bold text-center mb-6">What you will achieve</h2>
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {g.benefits?.map((b: string, i: number) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-accent/5 rounded-xl">
              <span className="text-accent text-lg">✓</span>
              <span>{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section className="px-6 py-10 bg-muted/30">
        <h2 className="text-2xl font-bold text-center mb-6">What You Will Learn</h2>
        <div className="space-y-4 max-w-2xl mx-auto">
          {g.modules?.map((m: any, i: number) => (
            <div key={i} className="flex items-start gap-4 p-5 bg-background rounded-xl border shadow-sm">
              <span className="bg-accent text-accent-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold shrink-0">{i + 1}</span>
              <div>
                <h4 className="font-semibold">{m.title}</h4>
                <p className="text-sm text-muted-foreground">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bonuses */}
      {(page.bonuses?.length > 0 || g.defaultBonuses?.length > 0) && (
        <section className="px-6 py-10">
          <h2 className="text-2xl font-bold text-center mb-6">🎁 Exclusive Bonuses</h2>
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {(page.bonuses?.length > 0 ? page.bonuses : g.defaultBonuses)?.map((b: any, i: number) => (
              <div key={i} className="p-5 border rounded-xl text-center bg-accent/5">
                <h4 className="font-semibold mb-1">{b.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">{b.description}</p>
                <span className="text-sm font-bold text-accent">Worth {b.value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certificate */}
      <section className="px-6 py-10 bg-muted/30 text-center">
        <h2 className="text-2xl font-bold mb-3">🏅 Certificate of Completion</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">{g.certificateText}</p>
      </section>

      {/* FAQ */}
      {g.faqs?.length > 0 && (
        <section className="px-6 py-10">
          <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4 max-w-2xl mx-auto">
            {g.faqs?.map((f: any, i: number) => (
              <div key={i} className="p-5 border rounded-xl">
                <h4 className="font-semibold mb-2">{f.question}</h4>
                <p className="text-sm text-muted-foreground">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="px-6 py-12 bg-accent/10 text-center">
        <p className="text-lg font-medium mb-2">📅 {formattedDate} · ⏰ {page.workshop_time || "TBD"}</p>
        <p className="text-muted-foreground mb-6">{g.urgencyText}</p>
        <a href={page.cta_form_link || "#"} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg px-10 h-14">
            Reserve My Seat Now
          </Button>
        </a>
      </section>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 flex items-center justify-between z-50 shadow-lg">
        <span className="text-sm font-medium">🔥 Almost Full – Limited Seats Left</span>
        <a href={page.cta_form_link || "#"} target="_blank" rel="noopener noreferrer">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Register Now</Button>
        </a>
      </div>
      <div className="h-16" /> {/* spacer for sticky footer */}
    </div>
  );
}
