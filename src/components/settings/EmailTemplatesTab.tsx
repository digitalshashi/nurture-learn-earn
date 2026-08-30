import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TemplateFields } from "@/components/email/TemplateFields";
import { Loader2, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { COACH_TEMPLATES, SYSTEM_TEMPLATE, type TemplateDef } from "@/lib/emailTemplates";
import {
  loadTemplateRows,
  makeEmptyRow,
  saveTemplateRow,
  type TemplateRow,
} from "@/lib/emailTemplateRows";

function TemplateEditor({
  def,
  row,
  onChange,
  onSave,
  saving,
}: {
  def: TemplateDef;
  row: TemplateRow;
  onChange: (row: TemplateRow) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <AccordionItem value={def.key}>
      <AccordionTrigger className="text-sm">
        <span className="flex flex-col items-start text-left">
          <span>{def.label}</span>
          {/* Says when this email actually fires, so the list is readable
              without opening every row. */}
          <span className="text-xs font-normal text-muted-foreground">{def.description}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <TemplateFields
          def={def}
          row={row}
          onChange={onChange}
          onSave={onSave}
          saving={saving}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

export function EmailTemplatesTab({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, TemplateRow>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Email Automation links straight to one template, so the accordion opens
  // on it rather than making the coach hunt down the list.
  const [searchParams] = useSearchParams();
  const [openKey, setOpenKey] = useState(searchParams.get("template") ?? "");

  // Keyed on the id, not the user object: useAuth hands back a fresh object
  // every render, so depending on it refetches in a loop.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setRows(await loadTemplateRows(userId, { includeSystem: isAdmin }));
      setLoaded(true);
    })();
  }, [userId, isAdmin]);

  const handleSave = async (key: string) => {
    if (!user) return;
    setSavingKey(key);
    const { error } = await saveTemplateRow(rows[key]);
    if (error) toast({ title: "Error", description: error, variant: "destructive" });
    else toast({ title: "Template saved" });
    setSavingKey(null);
  };

  if (!loaded) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="card-shadow">
        <CardHeader><CardTitle className="text-base">Your Email Templates</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {COACH_TEMPLATES.map((def) => (
              <TemplateEditor
                key={def.key}
                def={def}
                row={rows[def.key]}
                onChange={(r) => setRows((prev) => ({ ...prev, [def.key]: r }))}
                onSave={() => handleSave(def.key)}
                saving={savingKey === def.key}
              />
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="card-shadow border-accent/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-accent" /> System Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <TemplateEditor
                def={SYSTEM_TEMPLATE}
                row={rows[SYSTEM_TEMPLATE.key]}
                onChange={(r) => setRows((prev) => ({ ...prev, [SYSTEM_TEMPLATE.key]: r }))}
                onSave={() => handleSave(SYSTEM_TEMPLATE.key)}
                saving={savingKey === SYSTEM_TEMPLATE.key}
              />
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
