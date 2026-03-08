import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Download, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface IssuedCert {
  id: string;
  certificate_id: string;
  student_name: string;
  course_name: string | null;
  service_name: string | null;
  issued_at: string;
  template: {
    name: string;
    template_style: string;
    certificate_text: string | null;
    accent_color: string | null;
  } | null;
}

const STYLE_COLORS: Record<string, string> = {
  classic: "from-amber-600 to-amber-800",
  modern: "from-blue-600 to-indigo-700",
  elegant: "from-emerald-600 to-teal-700",
  minimal: "from-zinc-600 to-zinc-800",
};

export function StudentCertificates() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<IssuedCert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchCerts();
  }, [user]);

  const fetchCerts = async () => {
    const { data } = await supabase
      .from("issued_certificates")
      .select("*, template:certificate_templates(name, template_style, certificate_text, accent_color)")
      .eq("user_id", user!.id)
      .order("issued_at", { ascending: false });
    if (data) setCerts(data as any);
    setLoading(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const shareCert = (cert: IssuedCert) => {
    const text = `I earned the "${cert.template?.name}" certificate! ID: ${cert.certificate_id}`;
    if (navigator.share) {
      navigator.share({ title: cert.template?.name || "Certificate", text });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading certificates...</div>;
  if (certs.length === 0) return <div className="py-8 text-center text-muted-foreground text-sm">No certificates earned yet. Keep learning!</div>;

  return (
    <div className="space-y-4">
      {certs.map((cert) => {
        const style = cert.template?.template_style || "classic";
        const gradient = STYLE_COLORS[style] || STYLE_COLORS.classic;
        const text = (cert.template?.certificate_text || "")
          .replace("{student_name}", cert.student_name)
          .replace("{course_name}", cert.course_name || cert.service_name || "")
          .replace("{date}", formatDate(cert.issued_at));

        return (
          <Card key={cert.id} className="overflow-hidden">
            <div className={`bg-gradient-to-r ${gradient} p-6 text-white text-center`}>
              <Award className="h-10 w-10 mx-auto mb-2 opacity-80" />
              <h3 className="text-lg font-bold">{cert.template?.name}</h3>
              <p className="text-sm opacity-90 mt-1 max-w-md mx-auto">{text}</p>
              <p className="text-xs opacity-70 mt-3">Certificate ID: {cert.certificate_id}</p>
              <p className="text-xs opacity-70">Issued: {formatDate(cert.issued_at)}</p>
            </div>
            <CardContent className="flex items-center justify-between py-3">
              <span className="text-xs text-muted-foreground">
                {cert.course_name || cert.service_name || ""}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => shareCert(cert)}>
                  <Share2 className="h-3.5 w-3.5 mr-1" />Share
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
