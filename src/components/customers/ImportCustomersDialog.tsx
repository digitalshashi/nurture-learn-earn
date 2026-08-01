import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle, Download } from "lucide-react";

interface ImportCustomersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const CUSTOMER_FIELDS = [
  { value: "skip", label: "— Skip —" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
];

type DuplicateAction = "skip" | "update";

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

export function ImportCustomersDialog({ open, onOpenChange, onImported }: ImportCustomersDialogProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "map" | "importing" | "done">("upload");
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>("skip");
  const [services, setServices] = useState<{ id: string; title: string }[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [result, setResult] = useState({ imported: 0, skipped: 0, updated: 0, failed: 0 });

  const reset = () => {
    setStep("upload"); setRows([]); setHeaders([]); setMapping({}); setServiceId("");
    setResult({ imported: 0, skipped: 0, updated: 0, failed: 0 });
  };

  const loadServices = async () => {
    if (!user) return;
    const { data } = await supabase.from("services").select("id, title").eq("coach_id", user.id);
    if (data) setServices(data);
  };

  const downloadTemplate = () => {
    const csv = "Name,Email,Phone\nRahul Sharma,rahul@gmail.com,+91 9876543210\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast.error("File must have header + data rows"); return; }
      const h = parseCSVLine(lines[0]);
      setHeaders(h);
      const dataRows = lines.slice(1).map(parseCSVLine);
      setRows(dataRows);
      // Auto-map by header name; default to name/email/phone order if headers don't match the template
      const autoMap: Record<number, string> = {};
      h.forEach((col, i) => {
        const lc = col.toLowerCase().trim();
        if (lc.includes("name")) autoMap[i] = "name";
        else if (lc.includes("email")) autoMap[i] = "email";
        else if (lc.includes("phone") || lc.includes("mobile")) autoMap[i] = "phone";
        else autoMap[i] = "skip";
      });
      if (!Object.values(autoMap).includes("name") && !Object.values(autoMap).includes("email")) {
        // Header row didn't match any known field names — fall back to the template's column order
        if (h[0] !== undefined) autoMap[0] = "name";
        if (h[1] !== undefined) autoMap[1] = "email";
        if (h[2] !== undefined) autoMap[2] = "phone";
      }
      setMapping(autoMap);
      loadServices();
      setStep("map");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const doImport = async () => {
    const nameIdx = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
    const emailIdx = Object.entries(mapping).find(([, v]) => v === "email")?.[0];
    const phoneIdx = Object.entries(mapping).find(([, v]) => v === "phone")?.[0];

    if (emailIdx === undefined) { toast.error("Email column must be mapped"); return; }
    if (!serviceId) { toast.error("Select a service to grant access to"); return; }

    setStep("importing");
    let imported = 0, skipped = 0, updated = 0, failed = 0;

    for (const row of rows) {
      const email = row[Number(emailIdx)]?.trim().toLowerCase();
      if (!email) { skipped++; continue; }
      const name = nameIdx !== undefined ? row[Number(nameIdx)]?.trim() || "" : "";
      const phone = phoneIdx !== undefined ? row[Number(phoneIdx)]?.trim() || "" : "";

      try {
        const { data: existingProfile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
        let userId = existingProfile?.id;

        if (!userId) {
          const { data: createData, error: createError } = await supabase.functions.invoke("create-customer-user", {
            body: { email, name, phone },
          });
          if (createError || createData?.error) { failed++; continue; }
          userId = createData?.user_id;
        }
        if (!userId) { failed++; continue; }

        const { data: existingAccess } = await supabase
          .from("service_users")
          .select("id")
          .eq("user_id", userId)
          .eq("service_id", serviceId)
          .maybeSingle();

        if (existingAccess) {
          if (duplicateAction === "update") {
            await supabase.from("service_users").update({ status: "active" } as any).eq("id", existingAccess.id);
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        const { error: insertError } = await supabase.from("service_users").insert({
          user_id: userId,
          service_id: serviceId,
          access_type: "manual",
          status: "active",
          created_by: user?.id,
          purchased_at: new Date().toISOString(),
        });
        if (insertError) { failed++; continue; }
        imported++;
      } catch {
        failed++;
      }
    }
    setResult({ imported, skipped, updated, failed });
    setStep("done");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Bulk Import Customers</DialogTitle></DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="p-4 rounded-full bg-primary/10"><FileSpreadsheet className="h-8 w-8 text-primary" /></div>
            <p className="text-sm text-muted-foreground text-center">
              Upload a CSV file with customer data.<br />Columns: Name, Email, Phone (if headers don't match, we use column order: Name, Email, Phone)
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" />Download Template
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            <Button onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Select CSV File</Button>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Map CSV columns to fields. Preview: {rows.length} rows found.</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSV Column</TableHead>
                  <TableHead>Field</TableHead>
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
                        <SelectContent>{CUSTOMER_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{rows[0]?.[i] || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div>
              <p className="text-sm font-medium mb-1">Grant Access To Service *</p>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Duplicate Handling</p>
              <Select value={duplicateAction} onValueChange={v => setDuplicateAction(v as DuplicateAction)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip Duplicates</SelectItem>
                  <SelectItem value="update">Reactivate Existing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
              <Button onClick={doImport}>Import {rows.length} Customers</Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Importing customers...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="text-lg font-semibold">Import Complete</p>
            <div className="flex gap-4 flex-wrap justify-center">
              <Badge variant="default">Imported: {result.imported}</Badge>
              <Badge variant="secondary">Skipped: {result.skipped}</Badge>
              {result.updated > 0 && <Badge variant="outline">Reactivated: {result.updated}</Badge>}
              {result.failed > 0 && <Badge variant="destructive">Failed: {result.failed}</Badge>}
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); onImported(); }}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
