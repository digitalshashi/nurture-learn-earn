import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CustomSection {
  type: "image" | "video" | "content";
  title: string;
  content: string;
}

interface ServiceSuccessData {
  id: string;
  title: string;
  payment_success_heading: string | null;
  payment_success_message: string | null;
  payment_success_button_text: string | null;
  payment_success_button_url: string | null;
  payment_success_sections: CustomSection[] | null;
}

export default function ServiceCheckoutSuccess() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState<ServiceSuccessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!idOrSlug) return;
      let { data } = await supabase
        .from("services")
        .select("id, title, payment_success_heading, payment_success_message, payment_success_button_text, payment_success_button_url, payment_success_sections")
        .eq("slug", idOrSlug)
        .maybeSingle();
      if (!data) {
        ({ data } = await supabase
          .from("services")
          .select("id, title, payment_success_heading, payment_success_message, payment_success_button_text, payment_success_button_url, payment_success_sections")
          .eq("id", idOrSlug)
          .maybeSingle());
      }
      setService(data as any);
      setLoading(false);
    };
    load();
  }, [idOrSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const heading = service?.payment_success_heading || "Payment Successful";
  const message = service?.payment_success_message || `Congratulations! You now have access to ${service?.title || "this service"}.`;
  const buttonText = service?.payment_success_button_text || "Login Now";
  const buttonUrl = service?.payment_success_button_url;
  const sections = service?.payment_success_sections || [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full text-center space-y-6">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{heading}</h1>
          <p className="text-muted-foreground">{message}</p>
        </div>

        {sections.length > 0 && (
          <div className="space-y-4 text-left">
            {sections.map((sec, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                {sec.title && <p className="font-semibold text-sm mb-1">{sec.title}</p>}
                {sec.type === "image" && sec.content && (
                  <img src={sec.content} alt={sec.title} className="w-full rounded-md" />
                )}
                {sec.type === "video" && sec.content && (
                  <video src={sec.content} controls className="w-full rounded-md" />
                )}
                {sec.type === "content" && <p className="text-sm text-muted-foreground">{sec.content}</p>}
              </div>
            ))}
          </div>
        )}

        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => (buttonUrl ? (window.location.href = buttonUrl) : navigate("/dashboard"))}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
