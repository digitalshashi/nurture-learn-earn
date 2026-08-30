import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Award, Download, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuest } from "@/contexts/QuestContext";
import { toast } from "@/hooks/use-toast";
import { LockedPanel } from "@/components/quest/QuestPrimitives";
import {
  certificateReference,
  certificateSvg,
  downloadCertificatePng,
  type CertificateInput,
} from "@/lib/quest/certificate";

interface IssuedCertificate {
  id: string;
  certificate_id: string;
  student_name: string;
  course_name: string | null;
  service_name: string | null;
  issued_at: string;
}

/**
 * One certificate per rung held, plus whatever courses have issued.
 *
 * The award certificates are generated rather than stored: the ladder already
 * knows what somebody holds, and a second copy of that in a table is one more
 * thing that can disagree with the first.
 */
export default function QuestCertificates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const quest = useQuest();
  const [issued, setIssued] = useState<IssuedCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Keyed on the id, not the user object: an effect that depends on object
  // identity re-runs on every render that produces a new one.
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let live = true;
    void supabase
      .from("issued_certificates")
      .select("id, certificate_id, student_name, course_name, service_name, issued_at")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false })
      .then(({ data }) => {
        if (!live) return;
        setIssued((data as IssuedCertificate[]) ?? []);
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [userId]);

  if (!quest.gate.unlocked) {
    return (
      <LockedPanel
        title="Certificates open after setup"
        description="They carry your name, which means your profile has to have one on it first."
        action={<Button size="sm" onClick={() => navigate("/quest")}>Back to the gate</Button>}
      />
    );
  }

  const earned = quest.awards.filter((row) => row.status === "achieved");

  const download = async (input: CertificateInput, fileName: string) => {
    setBusy(fileName);
    try {
      await downloadCertificatePng(input, fileName);
      toast({ title: "Certificate downloaded" });
    } catch (error) {
      toast({
        title: "Couldn't render that",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/quest")}
        className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Quest
      </button>

      <header className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
          <Award className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">My certificates</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            One for every rung you hold. Earn a level, get the certificate.
          </p>
        </div>
      </header>

      {earned.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <Award className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-semibold">Nothing earned yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            The first rung is Ground Zero — finish your profile and the handbook, and its
            certificate appears here.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/quest/awards")}>
            See the ladder
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {earned.map((row) => {
            const input: CertificateInput = {
              title: row.award.title,
              recipient: quest.displayName,
              citation: row.award.requirement,
              issuedOn: new Date(),
              reference: certificateReference(user?.id ?? "00000000", row.award.key),
              hue: row.award.hue,
            };
            const fileName = `certificate-${row.award.key}`;

            return (
              <figure key={row.award.key} className="rounded-2xl border border-border bg-card p-3">
                <div
                  className="overflow-hidden rounded-xl border border-border [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
                  // The preview is the exact markup the download rasterises,
                  // so what somebody sees is what they get.
                  dangerouslySetInnerHTML={{ __html: certificateSvg(input) }}
                />
                <figcaption className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 pt-3">
                  <div>
                    <p className="text-sm font-semibold">{row.award.title}</p>
                    <p className="text-[11px] text-muted-foreground">{input.reference}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void download(input, fileName)}
                    disabled={busy === fileName}
                  >
                    {busy === fileName ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-1.5 h-4 w-4" />
                    )}
                    Download PNG
                  </Button>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          From your courses
        </h2>

        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : issued.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            Course certificates are issued automatically when you finish one. None yet.
          </p>
        ) : (
          <div className="space-y-2">
            {issued.map((certificate) => (
              <div
                key={certificate.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-info/12 text-info">
                  <GraduationCap className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {certificate.course_name || certificate.service_name || "Certificate"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {certificate.certificate_id} ·{" "}
                    {new Date(certificate.issued_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void download(
                      {
                        title: certificate.course_name || certificate.service_name || "Completion",
                        recipient: certificate.student_name,
                        citation: "Awarded for completing the programme in full",
                        issuedOn: new Date(certificate.issued_at),
                        reference: certificate.certificate_id,
                      },
                      `certificate-${certificate.certificate_id}`,
                    )
                  }
                  disabled={busy === `certificate-${certificate.certificate_id}`}
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
