import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Phone, Plus, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppAccount {
  id: string;
  provider: string;
  phone_number: string | null;
  is_connected: boolean;
  credits_available: number;
  created_at: string;
}

// Mock credit transactions
const mockTransactions = [
  { id: "1", type: "Credits Added", trxn_id: "673a5e390b0f89eb2c3bad47", debit: null, credit: 500, date: "18 Nov 2024, 2:50 AM", status: "Initiated" },
  { id: "2", type: "Credits Added", trxn_id: "6704c287266d7e3dc021d0b4", debit: null, credit: 1000, date: "8 Oct 2024, 10:56 AM", status: "Initiated" },
];

export default function WhatsAppAccountManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [account, setAccount] = useState<WhatsAppAccount | null>(null);
  const [open, setOpen] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState(0);
  const [form, setForm] = useState({ provider: "meta", phone_number: "", api_key: "", business_account_id: "" });

  const loadAccount = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("whatsapp_accounts")
      .select("*")
      .eq("coach_id", user.id)
      .limit(1)
      .maybeSingle();
    setAccount(data as WhatsAppAccount | null);
  };

  useEffect(() => { loadAccount(); }, [user]);

  const handleConnect = async () => {
    if (!user) return;
    const { error } = await supabase.from("whatsapp_accounts").upsert({
      coach_id: user.id,
      provider: form.provider,
      phone_number: form.phone_number || null,
      api_key: form.api_key || null,
      business_account_id: form.business_account_id || null,
      is_connected: true,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "WhatsApp Business Account connected!" });
      setOpen(false);
      loadAccount();
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <h1 className="text-xl font-bold font-display mb-6">WhatsApp Account Management</h1>

        {/* Warning banner */}
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm">All remaining credits will lapse and all Autopays for custom WhatsApp users will be cancelled on 31st October.</p>
            <p className="text-sm text-muted-foreground">To continue using WhatsApp solution.</p>
          </div>
        </div>

        {/* Connect button */}
        {!account?.is_connected && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="mb-6 bg-foreground text-background hover:bg-foreground/90">
                <Phone className="h-4 w-4 mr-1" /> Connect WhatsApp Business Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Connect WhatsApp Business</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Provider</Label>
                  <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta">Meta Cloud API</SelectItem>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="360dialog">360Dialog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Phone Number</Label><Input placeholder="+91 98765 43210" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></div>
                <div><Label>API Key</Label><Input type="password" placeholder="Enter API key" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} /></div>
                <div><Label>Business Account ID</Label><Input placeholder="Enter business account ID" value={form.business_account_id} onChange={(e) => setForm({ ...form, business_account_id: e.target.value })} /></div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleConnect}>Connect Account</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Credits section */}
        <div className="flex items-start gap-6 mb-6">
          <Card className="card-shadow w-48">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Credits Available</p>
              <p className="text-3xl font-bold">{account?.credits_available || 0}</p>
            </CardContent>
          </Card>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Add credits (1 Credit = 0.85 Rupees*)</p>
            <div className="flex items-center gap-2">
              <Input type="number" className="w-28" value={creditsToAdd} onChange={(e) => setCreditsToAdd(parseInt(e.target.value) || 0)} />
              <Button variant="outline" disabled>Proceed to Pay</Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">* Exclusive of GST and convenience fee</p>
          </div>
        </div>

        {/* Transactions */}
        <Card className="card-shadow">
          <CardHeader><CardTitle className="text-base">Credit Transactions</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{t.type}</p>
                      <p className="text-xs text-muted-foreground">(Trxn ID: {t.trxn_id})</p>
                    </TableCell>
                    <TableCell className="text-sm">{t.debit || "–"}</TableCell>
                    <TableCell className="text-sm font-medium text-accent">+{t.credit}</TableCell>
                    <TableCell className="text-sm">{t.date}</TableCell>
                    <TableCell><Badge className="bg-warning/20 text-warning text-xs">{t.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
