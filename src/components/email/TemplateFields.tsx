import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { EmailTemplateEditor } from "@/components/email/EmailTemplateEditor";
import type { TemplateDef } from "@/lib/emailTemplates";
import type { TemplateRow } from "@/lib/emailTemplateRows";

/**
 * Everything you can change about one email template.
 *
 * Shared by Settings -> Email -> Templates and by Email Automation, so a
 * template is edited the same way wherever you found it — and a change to the
 * editor lands in both places at once.
 */
export function TemplateFields({
  def,
  row,
  onChange,
  onSave,
  saving,
  /** Off where the surrounding list already has an enable switch per row. */
  showActive = true,
}: {
  def: TemplateDef;
  row: TemplateRow;
  onChange: (row: TemplateRow) => void;
  onSave: () => void;
  saving: boolean;
  showActive?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Available variables: {def.variables.map((v) => `{{${v}}}`).join(", ")}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">From Name (optional override)</Label>
          <Input
            value={row.from_name || ""}
            onChange={(e) => onChange({ ...row, from_name: e.target.value || null })}
          />
        </div>
        <div>
          <Label className="text-xs">Reply-To Email (optional override)</Label>
          <Input
            value={row.reply_to_email || ""}
            onChange={(e) => onChange({ ...row, reply_to_email: e.target.value || null })}
          />
        </div>
      </div>

      <EmailTemplateEditor
        subject={row.subject}
        html={row.body_html}
        onSubjectChange={(v) => onChange({ ...row, subject: v })}
        onHtmlChange={(v) => onChange({ ...row, body_html: v })}
        variables={def.variables}
        purpose="transactional"
        describes={`${def.label} — ${def.description}`}
      />

      <div className="flex items-center justify-between">
        {showActive ? (
          <div className="flex items-center gap-2">
            <Label className="text-xs">Active</Label>
            <Switch
              checked={row.is_active}
              onCheckedChange={(v) => onChange({ ...row, is_active: v })}
            />
          </div>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={onSave}
          disabled={saving}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
