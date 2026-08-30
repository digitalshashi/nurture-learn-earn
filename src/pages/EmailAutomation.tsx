import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ExternalLink, Loader2, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { COACH_TEMPLATES, type TemplateDef } from "@/lib/emailTemplates";
import { loadTemplateRows, saveTemplateRow, type TemplateRow } from "@/lib/emailTemplateRows";
import { TemplateFields } from "@/components/email/TemplateFields";

/**
 * Which automated emails go out, and what they say.
 *
 * The same templates as Settings -> Email -> Templates, from the same
 * definitions and the same table — switching one off here switches it off
 * there. Editing happens in place: the row expands into the full editor rather
 * than sending you to another screen to make the change.
 */
export default function EmailAutomation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, TemplateRow>>({});
  const [loaded, setLoaded] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Deep links from elsewhere open straight onto one template.
  const [searchParams] = useSearchParams();
  const [openKey, setOpenKey] = useState<string | null>(searchParams.get("template"));

  // Keyed on the id, not the user object: useAuth hands back a fresh object
  // every render, so depending on it refetches in a loop.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setRows(await loadTemplateRows(userId));
      setLoaded(true);
    })();
  }, [userId]);

  const save = async (key: string, row: TemplateRow) => {
    setSavingKey(key);
    const { error } = await saveTemplateRow(row);
    setSavingKey(null);
    if (error) {
      toast({ title: "Couldn't save", description: error, variant: "destructive" });
      return false;
    }
    return true;
  };

  /**
   * The switch writes immediately — it is a setting, not a draft. Any unsaved
   * edits in the open editor ride along, which is what you would expect from
   * flipping a switch on a row you are editing.
   */
  const toggle = async (key: string, enabled: boolean) => {
    const previous = rows[key];
    if (!previous) return;

    const next = { ...previous, is_active: enabled };
    setRows((r) => ({ ...r, [key]: next }));
    if (!(await save(key, next))) setRows((r) => ({ ...r, [key]: previous }));
  };

  const saveEdits = async (key: string) => {
    if (await save(key, rows[key])) toast({ title: "Template saved" });
  };

  const term = query.trim().toLowerCase();
  const visible = term
    ? COACH_TEMPLATES.filter(
        (def) =>
          def.label.toLowerCase().includes(term) ||
          def.description.toLowerCase().includes(term),
      )
    : COACH_TEMPLATES;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-1">Email Automation</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Every automated email your academy sends. Switch one off to stop it going out, or open
          it to change the wording.
        </p>

        <Card className="card-shadow mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sender details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              The name and reply-to address on these emails come from your sender accounts, so
              every email uses the same verified sender. Any template can override them.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/settings/email?tab=accounts">
                Manage sender accounts <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-sm">
                Templates
                <span className="ml-2 font-normal text-muted-foreground">
                  {COACH_TEMPLATES.length}
                </span>
              </CardTitle>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a template"
                  className="pl-7 h-8 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {!loaded ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">
                No template matches “{query}”.
              </p>
            ) : (
              visible.map((def) => (
                <TemplateListRow
                  key={def.key}
                  def={def}
                  row={rows[def.key]}
                  open={openKey === def.key}
                  onOpenChange={(open) => setOpenKey(open ? def.key : null)}
                  onChange={(r) => setRows((prev) => ({ ...prev, [def.key]: r }))}
                  onToggle={(v) => toggle(def.key, v)}
                  onSave={() => saveEdits(def.key)}
                  saving={savingKey === def.key}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

/** One template: enable switch always visible, editor on demand. */
function TemplateListRow({
  def,
  row,
  open,
  onOpenChange,
  onChange,
  onToggle,
  onSave,
  saving,
}: {
  def: TemplateDef;
  row?: TemplateRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (row: TemplateRow) => void;
  onToggle: (enabled: boolean) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* The whole label is the disclosure, so opening the editor does not
            depend on hitting a small icon. */}
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
          <span className="min-w-0">
            <span className="block text-sm truncate">{def.label}</span>
            <span className="block text-xs text-muted-foreground truncate">
              {def.description}
            </span>
          </span>
        </button>

        <Switch
          checked={row?.is_active ?? true}
          disabled={!row || saving}
          onCheckedChange={onToggle}
          aria-label={`Enable ${def.label}`}
        />
      </div>

      {open && row && (
        <div className="px-4 pb-4 pt-1 bg-muted/30 border-t border-border">
          <TemplateFields
            def={def}
            row={row}
            onChange={onChange}
            onSave={onSave}
            saving={saving}
            // The row above already owns the enable switch.
            showActive={false}
          />
        </div>
      )}
    </div>
  );
}
