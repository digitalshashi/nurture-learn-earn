import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { waitForServiceAccess, PENDING_PAYMENT_MESSAGE } from "@/lib/paymentFulfilment";

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
  // A confirmation page designed in the page builder replaces the default one.
  const [customPage, setCustomPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  // Redirect gateways (Instamojo) land here before access exists, so the
  // payment has to be confirmed with the gateway on arrival.
  const [verifying, setVerifying] = useState(
    searchParams.get("provider") === "instamojo",
  );
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    const provider = searchParams.get("provider");
    if (provider !== "instamojo") return;

    const paymentId = searchParams.get("payment_id");
    const paymentRequestId = searchParams.get("payment_request_id");

    // Stashed before redirecting out, so a gateway that drops our query string
    // does not lose which service was being bought.
    let pending: { service_id?: string; custom_fields_data?: unknown } = {};
    try {
      pending = JSON.parse(sessionStorage.getItem("pending_payment") || "{}");
    } catch {
      // A malformed stash is not worth failing over; fall back to the URL.
    }

    const serviceId = pending.service_id || searchParams.get("service_id");

    if (!paymentId || !paymentRequestId || !serviceId) {
      setVerifying(false);
      setVerifyError("We couldn't confirm this payment automatically.");
      return;
    }

    const verify = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const userId = sessionData?.session?.user?.id;

      const settle = (ok: boolean, error?: string) => {
        if (ok) {
          sessionStorage.removeItem("pending_payment");
          toast({ title: "Payment confirmed" });
        } else {
          setVerifyError(error || PENDING_PAYMENT_MESSAGE);
        }
        setVerifying(false);
      };

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              provider: "instamojo",
              service_id: serviceId,
              payment_id: paymentId,
              payment_request_id: paymentRequestId,
              custom_fields_data: pending.custom_fields_data ?? null,
            }),
          },
        );

        const body = await res.json();

        if (res.ok && body.success) {
          settle(true);
          return;
        }

        // Instamojo's webhook confirms the same payment independently, and a
        // buyer coming back on a stale session is exactly the case it covers.
        // Wait for it before saying anything went wrong.
        if (userId && (await waitForServiceAccess(serviceId, userId))) {
          settle(true);
          return;
        }

        settle(false, body.error);
      } catch {
        if (userId && (await waitForServiceAccess(serviceId, userId))) {
          settle(true);
          return;
        }
        settle(false);
      }
    };

    verify();
  }, [searchParams, toast]);

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

      if (data?.id) {
        const { data: page } = await supabase
          .from("builder_pages")
          .select("html")
          .eq("service_id", data.id)
          .eq("page_type", "success")
          .eq("status", "published")
          .maybeSingle();
        setCustomPage((page as { html: string } | null)?.html ?? null);
      }

      setLoading(false);
    };
    load();
  }, [idOrSlug]);

  if (loading || verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        {verifying && (
          <p className="text-sm text-muted-foreground">Confirming your payment…</p>
        )}
      </div>
    );
  }

  // Never show a success screen for a payment the gateway did not confirm.
  if (verifyError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-14 w-14 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">We couldn't confirm your payment</h1>
          <p className="text-sm text-muted-foreground">{verifyError}</p>
          <p className="text-xs text-muted-foreground">
            If money left your account, do not pay again — contact support with your
            payment reference and it will be sorted out.
          </p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Sandboxed for the same reason as everywhere else: this is authored
  // markup and must not run in the app's origin.
  if (customPage) {
    return (
      <iframe
        title={service?.title ? `${service.title} — confirmed` : "Order confirmed"}
        sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox"
        srcDoc={customPage}
        className="w-screen h-screen border-0 block"
      />
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
