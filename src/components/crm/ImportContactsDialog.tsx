import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, CheckCircle } from "lucide-react";

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const CRM_FIELDS = [
  { value: "skip", label: "— Skip —" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "city", label: "City" },
  { value: "source", label: "Source" },
  { value: "tags", label: "Tags" },
];

type DuplicateAction = "skip" | "update";

export function ImportContactsDialog({ open, onOpenChange, onImported }: ImportContactsDialogProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "map" | "importing" | "done">("upload");
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>("skip");
  const [result, setResult] = useState({ imported: 0, skipped: 0, updated: 0 });

  const reset = () => { setStep("upload"); setRows([]); setHeaders([]); setMapping({}); setResult({ imported: 0, skipped: 0, updated: 0 }); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast({ title: "File must have header + data rows", variant: "destructive" }); return; }
      const h = parseCSVLine(lines[0]);
      setHeaders(h);
      const dataRows = lines.slice(1).map(parseCSVLine);
      setRows(dataRows);
      // Auto-map
      const autoMap: Record<number, string> = {};
      h.forEach((col, i) => {
        const lc = col.toLowerCase().trim();
        if (lc.includes("name") && !lc.includes("user")) autoMap[i] = "name";
        else if (lc.includes("email")) autoMap[i] = "email";
        else if (lc.includes("phone") || lc.includes("mobile")) autoMap[i] = "phone";
        else if (lc.includes("city") || lc.includes("location")) autoMap[i] = "city";
        else if (lc.includes("source")) autoMap[i] = "source";
        else if (lc.includes("tag")) autoMap[i] = "tags";
        else autoMap[i] = "skip";
      });
      setMapping(autoMap);
      setStep("map");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  };

  const doImport = async () => {
    setStep("importing");
    let imported = 0, skipped = 0, updated = 0;
    const nameIdx = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
    const emailIdx = Object.entries(mapping).find(([, v]) => v === "email")?.[0];
    const phoneIdx = Object.entries(mapping).find(([, v]) => v === "phone")?.[0];
    const cityIdx = Object.entries(mapping).find(([, v]) => v === "city")?.[0];
    const sourceIdx = Object.entries(mapping).find(([, v]) => v === "source")?.[0];
    const tagsIdx = Object.entries(mapping).find(([, v]) => v === "tags")?.[0];

    if (nameIdx === undefined) { toast({ title: "Name column must be mapped", variant: "destructive" }); setStep("map"); return; }

    for (const row of rows) {
      const name = row[Number(nameIdx)]?.trim();
      if (!name) { skipped++; continue; }
      const email = emailIdx !== undefined ? row[Number(emailIdx)]?.trim() || null : null;
      const phone = phoneIdx !== undefined ? row[Number(phoneIdx)]?.trim() || null : null;
      const city = cityIdx !== undefined ? row[Number(cityIdx)]?.trim() || null : null;
      const source = sourceIdx !== undefined ? row[Number(sourceIdx)]?.trim() || "import" : "import";
      const tags = tagsIdx !== undefined ? row[Number(tagsIdx)]?.split(",").map(t => t.trim()).filter(Boolean) : [];

      // Check duplicate by email or phone
      let isDuplicate = false;
      if (email) {
        const { data } = await supabase.from("crm_leads").select("id").eq("coach_id", user!.id).eq("email", email).limit(1);
        if (data && data.length > 0) {
          isDuplicate = true;
          if (duplicateAction === "update") {
            await supabase.from("crm_leads").update({ name, phone, city, source, tags, updated_at: new Date().toISOString() }).eq("id", data[0].id);
            updated++;
          } else { skipped++; }
        }
      }
      if (!isDuplicate && phone) {
        const { data } = await supabase.from("crm_leads").select("id").eq("coach_id", user!.id).eq("phone", phone).limit(1);
        if (data && data.length > 0) {
          isDuplicate = true;
          if (duplicateAction === "update") {
            await supabase.from("crm_leads").update({ name, email, city, source, tags, updated_at: new Date().toISOString() }).eq("id", data[0].id);
            updated++;
          } else { skipped++; }
        }
      }
      if (!isDuplicate) {
        await supabase.from("crm_leads").insert({ name, email, phone, city, source, tags, coach_id: user!.id });
        imported++;
      }
    }
    setResult({ imported, skipped, updated });
    setStep("done");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Import Contacts</DialogTitle></DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="p-4 rounded-full bg-primary/10"><FileSpreadsheet className="h-8 w-8 text-primary" /></div>
            <p className="text-sm text-muted-foreground text-center">Upload a CSV file with contact data.<br/>Columns: Name, Email, Phone, City, Source, Tags</p>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Select CSV File</Button>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Map CSV columns to CRM fields. Preview: {rows.length} rows found.</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSV Column</TableHead>
                  <TableHead>CRM Field</TableHead>
                  <TableHead>Sample</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headers.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{h}</TableCell>
                    <TableCell>
                      <Select value={mapping[i] || "skip"} onValueChange={v => setMapping({ ...mapping, [i]: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{CRM_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{rows[0]?.[i] || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div>
              <p className="text-sm font-medium mb-1">Duplicate Handling</p>
              <Select value={duplicateAction} onValueChange={v => setDuplicateAction(v as DuplicateAction)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip Duplicates</SelectItem>
                  <SelectItem value="update">Update Existing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
              <Button onClick={doImport}>Import {rows.length} Contacts</Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Importing contacts...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="text-lg font-semibold">Import Complete</p>
            <div className="flex gap-4">
              <Badge variant="default">Imported: {result.imported}</Badge>
              <Badge variant="secondary">Skipped: {result.skipped}</Badge>
              {result.updated > 0 && <Badge variant="outline">Updated: {result.updated}</Badge>}
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); onImported(); }}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
