import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { UserCheck } from "lucide-react";

interface ConvertToCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
  onConverted: () => void;
}

export function ConvertToCustomerDialog({ open, onOpenChange, contact, onConverted }: ConvertToCustomerDialogProps) {
  const { user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState("");
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (user && open) {
      supabase.from("services").select("id, title, price").eq("coach_id", user.id).then(({ data }) => {
        setServices(data || []);
      });
    }
  }, [user, open]);

  const convert = async () => {
    setConverting(true);
    const tags = [...(contact.tags || [])];
    if (!tags.includes("Customer")) tags.push("Customer");
    
    const selectedSvc = services.find(s => s.id === selectedService);
    if (selectedSvc && !tags.includes(`Service: ${selectedSvc.title}`)) {
      tags.push(`Service: ${selectedSvc.title}`);
    }

    await supabase.from("crm_leads").update({
      status: "converted",
      converted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags,
    }).eq("id", contact.id);

    // Add note
    await supabase.from("crm_lead_notes").insert({
      lead_id: contact.id,
      content: `Converted to customer${selectedSvc ? ` — Service: ${selectedSvc.title}` : ""}`,
      created_by: user!.id,
    });

    toast({ title: "Lead converted to customer" });
    setConverting(false);
    setSelectedService("");
    onOpenChange(false);
    onConverted();
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Convert to Customer</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="font-medium text-sm">{contact.name}</p>
            <p className="text-xs text-muted-foreground">{contact.email || contact.phone || "No contact info"}</p>
          </div>
          <div>
            <Label>Select Service Purchased (optional)</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Service</SelectItem>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.title} — ₹{s.price}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            This will:
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              <li>Mark lead as <Badge variant="default" className="text-[10px] px-1 py-0">Customer</Badge></li>
              <li>Add "Customer" tag</li>
              {selectedService && selectedService !== "none" && <li>Tag with purchased service</li>}
              <li>Log conversion in activity</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={convert} disabled={converting}>
            <UserCheck className="h-4 w-4 mr-1" />{converting ? "Converting..." : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
