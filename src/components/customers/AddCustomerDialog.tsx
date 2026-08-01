import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddCustomerDialog({ open, onOpenChange, onSuccess }: AddCustomerDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<{ id: string; title: string }[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    serviceId: "",
    accessType: "manual",
    expiryDate: "",
    notes: "",
  });

  useEffect(() => {
    if (open && user) {
      supabase.from("services").select("id, title").eq("coach_id", user.id).then(({ data }) => {
        if (data) setServices(data);
      });
    }
  }, [open, user]);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.serviceId) {
      toast.error("Name, email, and service are required");
      return;
    }
    setLoading(true);
    try {
      // Check if user exists by email in profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.email)
        .maybeSingle();

      let userId = existingProfile?.id;

      if (!userId) {
        const { data: createData, error: createError } = await supabase.functions.invoke("create-customer-user", {
          body: { email: form.email, name: form.name, phone: form.phone },
        });

        if (createError || createData?.error) {
          toast.error(createData?.error || createError?.message || "Failed to create user account");
          setLoading(false);
          return;
        }
        userId = createData?.user_id;
      }

      if (!userId) {
        toast.error("Failed to create or find user account");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("service_users").insert({
        user_id: userId,
        service_id: form.serviceId,
        access_type: form.accessType as any,
        status: "active",
        expires_at: form.expiryDate || null,
        notes: form.notes || null,
        created_by: user?.id,
        purchased_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Customer access granted successfully");
      setForm({ name: "", email: "", phone: "", country: "", serviceId: "", accessType: "manual", expiryDate: "", notes: "" });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to grant access");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Customer Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rahul Sharma" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="rahul@gmail.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="India" />
            </div>
          </div>
          <div>
            <Label>Service Access *</Label>
            <Select value={form.serviceId} onValueChange={(v) => setForm({ ...form, serviceId: v })}>
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Access Type</Label>
              <Select value={form.accessType} onValueChange={(v) => setForm({ ...form, accessType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Access</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="affiliate">Affiliate</SelectItem>
                  <SelectItem value="admin">Admin Grant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="VIP customer, manual upgrade..." rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {loading ? "Granting Access..." : "Grant Access"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
