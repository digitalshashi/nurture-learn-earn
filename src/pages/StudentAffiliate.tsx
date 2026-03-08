import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Copy, AlertTriangle, Search, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AffiliateProgram {
  id: string;
  course_id: string;
  commission_percent: number;
  commission_type: string;
  courses?: { title: string; price: number };
}

interface AffiliateLink {
  id: string;
  referral_code: string;
  program_id: string;
}

export default function StudentAffiliate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<AffiliateProgram[]>([]);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [salesData, setSalesData] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Load active affiliate programs with course info
    const { data: progs } = await supabase
      .from("affiliate_programs")
      .select("*, courses(title, price)")
      .eq("is_active", true);
    setPrograms((progs as any) || []);

    // Load user's affiliate links
    const { data: lnks } = await supabase
      .from("affiliate_links")
      .select("*")
      .eq("user_id", user.id);
    setLinks(lnks || []);

    // Load bank details
    const { data: bank } = await supabase
      .from("affiliate_bank_details")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setBankDetails(bank);

    // Load sales
    if (lnks && lnks.length > 0) {
      const linkIds = lnks.map(l => l.id);
      const { data: sales } = await supabase
        .from("affiliate_sales")
        .select("*")
        .in("link_id", linkIds)
        .order("purchased_at", { ascending: false });
      setSalesData(sales || []);

      // Load click counts per link
      const counts: Record<string, number> = {};
      for (const link of lnks) {
        const { count } = await supabase
          .from("affiliate_clicks")
          .select("*", { count: "exact", head: true })
          .eq("link_id", link.id);
        counts[link.id] = count || 0;
      }
      setClickCounts(counts);
    }

    // Load payouts
    const { data: pays } = await supabase
      .from("affiliate_payouts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPayouts(pays || []);
  };

  const generateLink = async (programId: string) => {
    if (!user) return;
    const code = `${user.id.slice(0, 8)}-${programId.slice(0, 6)}-${Date.now().toString(36)}`;
    const { error } = await supabase.from("affiliate_links").insert({
      program_id: programId,
      user_id: user.id,
      referral_code: code,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Link generated!" });
      loadData();
    }
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/checkout?ref=${code}`);
    toast({ title: "Link copied!" });
  };

  const getLinkForProgram = (programId: string) => links.find(l => l.program_id === programId);

  const totalSales = salesData.length;
  const totalRevenue = salesData.reduce((s, r) => s + Number(r.amount_paid), 0);
  const totalCommission = salesData.reduce((s, r) => s + Number(r.commission_earned), 0);
  const commissionPaid = payouts.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const commissionDue = totalCommission - commissionPaid;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Bank details warning */}
        {!bankDetails && (
          <div className="bg-accent/10 border border-accent rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-accent" />
              <div>
                <p className="font-semibold text-sm"><span className="text-accent">Warning!</span> your bank details are missing.</p>
                <p className="text-xs text-muted-foreground">Please add your details to start receiving commissions.</p>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="font-semibold">Add bank details</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Add Bank Details</DialogTitle></DialogHeader>
                <BankDetailsForm userId={user?.id || ""} onSaved={loadData} />
              </DialogContent>
            </Dialog>
          </div>
        )}

        <h1 className="text-xl font-bold font-display mb-6">Affiliates dashboard</h1>

        <Tabs defaultValue="memberships">
          <TabsList className="mb-6 bg-transparent border-b border-border rounded-none p-0 h-auto">
            <TabsTrigger value="memberships" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:text-accent data-[state=active]:shadow-none px-4 pb-2">Memberships</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:text-accent data-[state=active]:shadow-none px-4 pb-2">Sales</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:text-accent data-[state=active]:shadow-none px-4 pb-2">Payments</TabsTrigger>
          </TabsList>

          {/* MEMBERSHIPS TAB */}
          <TabsContent value="memberships">
            <Input placeholder="Search by membership" className="max-w-md mb-6" />
            <div className="space-y-6">
              {programs.length === 0 ? (
                <Card className="card-shadow"><CardContent className="py-12 text-center text-muted-foreground text-sm">No affiliate programs available yet.</CardContent></Card>
              ) : (
                programs.map((prog) => {
                  const link = getLinkForProgram(prog.id);
                  const clicks = link ? (clickCounts[link.id] || 0) : 0;
                  const progSales = link ? salesData.filter(s => s.link_id === link.id) : [];
                  const progRevenue = progSales.reduce((s, r) => s + Number(r.amount_paid), 0);
                  const progCommission = progSales.reduce((s, r) => s + Number(r.commission_earned), 0);

                  return (
                    <Card key={prog.id} className="card-shadow">
                      <CardContent className="pt-5">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-base">{(prog as any).courses?.title || "Course"}</h3>
                            <p className="text-sm text-muted-foreground">Commission Rate: <span className="font-semibold text-foreground">{prog.commission_percent}%</span> of Actual Earning</p>
                          </div>
                          <div className="flex-1">
                            {link ? (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Affiliate Link:</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-info truncate max-w-xs">{`${window.location.origin}/checkout?ref=${link.referral_code}`}</span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyLink(link.referral_code)}>
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => generateLink(prog.id)}>
                                Generate Affiliate Link
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">Link Clicks</p>
                            <p className="text-lg font-bold">{clicks}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">No. of Sales</p>
                            <p className="text-lg font-bold">{progSales.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Amount of Sales</p>
                            <p className="text-lg font-bold">${progRevenue.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Commission Amount</p>
                            <p className="text-lg font-bold">${progCommission.toFixed(2)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* SALES TAB */}
          <TabsContent value="sales">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Input placeholder="Search by name, phone or email" className="max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All memberships" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All memberships</SelectItem></SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-2">
                <Input type="date" className="h-9 w-[130px] text-sm" />
                <span className="text-muted-foreground text-xs">→</span>
                <Input type="date" className="h-9 w-[130px] text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <Card className="card-shadow"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total no of Sales</p><p className="text-2xl font-bold">{totalSales}</p></CardContent></Card>
              <Card className="card-shadow"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Amount of Sales</p><p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p></CardContent></Card>
              <Card className="card-shadow"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Commission Earned</p><p className="text-2xl font-bold">${totalCommission.toFixed(2)}</p></CardContent></Card>
            </div>

            <Card className="card-shadow">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Membership</TableHead>
                      <TableHead>Coupon</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Commission Earned</TableHead>
                      <TableHead>Purchase Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No sales yet</TableCell></TableRow>
                    ) : (
                      salesData.map((sale, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{sale.buyer_name || "—"}</TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              {sale.buyer_phone && <p className="text-sm text-info">{sale.buyer_phone}</p>}
                              {sale.buyer_email && <p className="text-sm text-info">{sale.buyer_email}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">Course</TableCell>
                          <TableCell>
                            {sale.coupon_code ? <Badge className="bg-info text-info-foreground text-[10px]">{sale.coupon_code}</Badge> : <span className="text-sm text-muted-foreground">N/A</span>}
                          </TableCell>
                          <TableCell className="text-sm font-medium">${Number(sale.amount_paid).toFixed(2)}</TableCell>
                          <TableCell className="text-sm font-medium">${Number(sale.commission_earned).toFixed(2)}</TableCell>
                          <TableCell className="text-sm">{new Date(sale.purchased_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PAYMENTS TAB */}
          <TabsContent value="payments">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <Card className="card-shadow"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Commission Paid</p><p className="text-2xl font-bold">${commissionPaid.toFixed(2)}</p></CardContent></Card>
              <Card className="card-shadow"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Commission Due</p><p className="text-2xl font-bold">${commissionDue.toFixed(2)}</p></CardContent></Card>
            </div>

            <Card className="card-shadow">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Membership Name</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No payment history</TableCell></TableRow>
                    ) : (
                      payouts.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{new Date(p.created_at).toLocaleString()}</TableCell>
                          <TableCell className="text-sm font-medium">—</TableCell>
                          <TableCell className="text-sm">${Number(p.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={
                              p.status === "paid" ? "bg-success text-success-foreground" :
                              p.status === "pending" ? "bg-destructive text-destructive-foreground" :
                              "bg-secondary text-secondary-foreground"
                            }>
                              {p.status === "pending" ? "NOT PAID YET" : p.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.remark || "–"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function BankDetailsForm({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ bank_name: "", account_number: "", ifsc_code: "", account_holder: "" });

  const handleSave = async () => {
    if (!form.bank_name || !form.account_number || !form.account_holder) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("affiliate_bank_details").insert({ ...form, user_id: userId });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Bank details saved!" }); onSaved(); }
  };

  return (
    <div className="space-y-3 mt-2">
      <div><Label>Account Holder Name *</Label><Input value={form.account_holder} onChange={(e) => setForm(f => ({ ...f, account_holder: e.target.value }))} /></div>
      <div><Label>Bank Name *</Label><Input value={form.bank_name} onChange={(e) => setForm(f => ({ ...f, bank_name: e.target.value }))} /></div>
      <div><Label>Account Number *</Label><Input value={form.account_number} onChange={(e) => setForm(f => ({ ...f, account_number: e.target.value }))} /></div>
      <div><Label>IFSC Code</Label><Input value={form.ifsc_code} onChange={(e) => setForm(f => ({ ...f, ifsc_code: e.target.value }))} /></div>
      <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave}>Save Bank Details</Button>
    </div>
  );
}
