import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookmarkPlus, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createTemplate,
  loadTemplatesForChannel,
  type AutomationTemplate,
  type TemplateChannel,
} from "@/lib/automationTemplates";

/**
 * Load a saved template into whatever is being composed, or save what is
 * composed as a new one.
 *
 * This is what makes /automation/templates worth having: templates saved there
 * are picked up here, and anything written here can go back into the library.
 */
export function TemplatePicker({
  coachId,
  channel,
  subject,
  content,
  onApply,
  className,
}: {
  coachId: string;
  channel: TemplateChannel;
  /** Current draft, offered when saving a new template. */
  subject?: string;
  content?: string;
  onApply: (template: { subject: string | null; content: string | null }) => void;
  className?: string;
}) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);
    setTemplates(await loadTemplatesForChannel(coachId, channel));
    setLoading(false);
  }, [coachId, channel]);

  // Reloads when the channel changes, so switching from email to WhatsApp
  // never offers a template that cannot be sent on it.
  useEffect(() => {
    load();
  }, [load]);

  const apply = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    onApply({ subject: template.subject, content: template.content });
    toast({ title: `Loaded “${template.name}”` });
  };

  const save = async () => {
    if (!name.trim()) {
      toast({ title: "Give the template a name", variant: "destructive" });
      return;
    }
    if (!content?.trim()) {
      toast({ title: "Nothing to save yet", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await createTemplate(coachId, {
      name: name.trim(),
      channel,
      subject,
      content,
    });
    setSaving(false);

    if (error) {
      toast({ title: "Couldn't save", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Saved to your templates" });
    setName("");
    setSaveOpen(false);
    load();
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {loading ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading templates…
          </span>
        ) : templates.length > 0 ? (
          <Select onValueChange={apply}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-64">
              <SelectValue placeholder="Start from a saved template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                  <span className="text-muted-foreground"> — {t.category}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            No saved templates for this channel yet.
          </span>
        )}

        <Popover open={saveOpen} onOpenChange={setSaveOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <BookmarkPlus className="h-3.5 w-3.5" />
              Save as template
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <div>
              <Label className="text-xs">Template name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Webinar invite"
                className="text-xs mt-1"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Saves what you have written so far. You can reuse it on any {channel} message.
            </p>
            <Button
              size="sm"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={save}
              disabled={saving}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Save
            </Button>
          </PopoverContent>
        </Popover>

        <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
          <Link to="/automation/templates">Manage</Link>
        </Button>
      </div>
    </div>
  );
}
