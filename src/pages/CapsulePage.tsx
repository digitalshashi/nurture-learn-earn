import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { safeUrl } from "@/lib/safeUrl";
import { AppLayout } from "@/components/layout/AppLayout";

// Browsers give no reliable "this iframe was blocked" event for
// X-Frame-Options / frame-ancestors — a blocked frame still fires `load`,
// it just renders blank. We treat "no load within a short window" as a
// failure and redirect straight to the site instead of showing a blank page.
const IFRAME_LOAD_TIMEOUT_MS = 4000;

/**
 * A custom nav item (configured in Member Navigation) that points to an
 * external URL lands here: we try to show that site inside the platform via
 * an iframe, and if it can't be framed, redirect the browser to it directly.
 */
export default function CapsulePage() {
  const [searchParams] = useSearchParams();
  const rawUrl = searchParams.get("url") || "";
  const label = searchParams.get("label") || "Link";
  const url = safeUrl(rawUrl);

  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    redirected.current = false;
  }, [url]);

  useEffect(() => {
    if (!url || loaded) return;
    const timer = setTimeout(() => setFailed(true), IFRAME_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [url, loaded]);

  useEffect(() => {
    if ((failed || !url) && !redirected.current) {
      redirected.current = true;
      if (url) window.location.replace(url);
    }
  }, [failed, url]);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-60px)] flex-col">
        {url && !failed ? (
          <iframe
            key={url}
            src={url}
            title={label}
            className="h-full w-full border-0"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <ExternalLink className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {url ? `Opening ${label}…` : "This link is not valid."}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
