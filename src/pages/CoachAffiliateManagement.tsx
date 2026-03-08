import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, DollarSign, TrendingUp, Wallet, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CoachAffiliateManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [allSales, setAllSales] = useState<any[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
  const [newProgram, setNewProgram] = useState({ course_id: "", service_id: "", commission_percent: 10, commission_type: "percentage", product_type: "service" });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const { data: myCourses } = await supabase.from("courses").select("id, title, price, service_id").eq("coach_id", user.id);
    setCourses(myCourses || []);

    const { data: myServices } = await supabase.from("services").select("id, title, price").eq("coach_id", user.id);
    setServices(myServices || []);

    const { data: progs } = await supabase.from("affiliate_programs").select("*, courses(title, price), services(title, price)");
    setPrograms(progs || []);

    // Load all sales for coach's programs
    if (progs && progs.length > 0) {
      const progIds = progs.map(p => p.id);
      const { data: links } = await supabase.from("affiliate_links").select("id, user_id, referral_code, program_id").in("program_id", progIds);
      if (links && links.length > 0) {
        const linkIds = links.map(l => l.id);
        const { data: sales } = await supabase.from("affiliate_sales").select("*").in("link_id", linkIds).order("purchased_at", { ascending: false });
        setAllSales(sales || []);
      }
    }

    const { data: payouts } = await supabase.from("affiliate_payouts").select("*").eq("status", "pending");
    setPendingPayouts(payouts || []);
  };

  const createProgram = async () => {
    const selectedProductId = newProgram.product_type === "service" ? newProgram.service_id : newProgram.course_id;

    if (!selectedProductId) {
      toast({ title: "Please select a product", variant: "destructive" });
      return;
    }

    const payload = {
      course_id: newProgram.product_type === "course" ? selectedProductId : null,
      service_id: newProgram.product_type === "service" ? selectedProductId : null,
      commission_percent: newProgram.commission_percent,
      commission_type: newProgram.commission_type,
    };

    const { error } = await supabase.from("affiliate_programs").insert(payload as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Affiliate program created!" });
      loadData();
      setNewProgram({ course_id: "", service_id: "", commission_percent: 10, commission_type: "percentage", product_type: "service" });
    }
  };

  const toggleProgram = async (id: string, active: boolean) => {
    await supabase.from("affiliate_programs").update({ is_active: !active }).eq("id", id);
    loadData();
  };

  const totalAffiliateSales = allSales.reduce((s, r) => s + Number(r.amount_paid), 0);
  const totalCommissions = allSales.reduce((s, r) => s + Number(r.commission_earned), 0);
  const pendingAmount = pendingPayouts.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Affiliate Management</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1" />Create Program</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create Affiliate Program</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Product Type</Label>
                  <Select value={newProgram.product_type} onValueChange={(v) => setNewProgram(p => ({ ...p, product_type: v, course_id: "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select {newProgram.product_type === "service" ? "Service" : "Course"} {newProgram.product_type === "course" && <span className="text-muted-foreground text-xs">(optional)</span>}</Label>
                  <Select value={newProgram.course_id} onValueChange={(v) => setNewProgram(p => ({ ...p, course_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={`Choose a ${newProgram.product_type}`} /></SelectTrigger>
                    <SelectContent>
                      {newProgram.product_type === "service" ? (
                        services.length === 0 ? (
                          <SelectItem value="_none" disabled>No services found</SelectItem>
                        ) : (
                          services.map(s => <SelectItem key={s.id} value={s.id}>{s.title} {s.price ? `— ₹${s.price}` : ""}</SelectItem>)
                        )
                      ) : (
                        courses.length === 0 ? (
                          <SelectItem value="_none" disabled>No courses found</SelectItem>
                        ) : (
                          courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title} {c.price ? `— ₹${c.price}` : ""}</SelectItem>)
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Commission Type</Label>
                  <Select defaultValue="percentage" onValueChange={(v) => setNewProgram(p => ({ ...p, commission_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Commission {newProgram.commission_type === "percentage" ? "%" : "Amount"}</Label><Input type="number" value={newProgram.commission_percent} onChange={(e) => setNewProgram(p => ({ ...p, commission_percent: Number(e.target.value) }))} /></div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={createProgram}>Create Program</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-info/10"><Users className="h-5 w-5 text-info" /></div><div><p className="text-xs text-muted-foreground">Active Programs</p><p className="text-xl font-bold">{programs.filter(p => p.is_active).length}</p></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div><div><p className="text-xs text-muted-foreground">Affiliate Sales</p><p className="text-xl font-bold">${totalAffiliateSales.toFixed(2)}</p></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-accent/10"><TrendingUp className="h-5 w-5 text-accent" /></div><div><p className="text-xs text-muted-foreground">Total Commissions</p><p className="text-xl font-bold">${totalCommissions.toFixed(2)}</p></div></CardContent></Card>
          <Card className="card-shadow"><CardContent className="pt-4 pb-3 flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><Wallet className="h-5 w-5 text-destructive" /></div><div><p className="text-xs text-muted-foreground">Pending Payouts</p><p className="text-xl font-bold">${pendingAmount.toFixed(2)}</p></div></CardContent></Card>
        </div>

        <Tabs defaultValue="programs">
          <TabsList className="mb-4">
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="programs">
            <Card className="card-shadow">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No affiliate programs yet. Create one to get started.</TableCell></TableRow>
                    ) : (
                      programs.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-sm">{p.courses?.title || "—"}</TableCell>
                          <TableCell className="text-sm">{p.commission_percent}{p.commission_type === "percentage" ? "%" : " fixed"}</TableCell>
                          <TableCell className="text-sm capitalize">{p.commission_type}</TableCell>
                          <TableCell>
                            <Badge className={p.is_active ? "bg-success text-success-foreground" : "bg-secondary text-secondary-foreground"}>
                              {p.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch checked={p.is_active} onCheckedChange={() => toggleProgram(p.id, p.is_active)} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales">
            <Card className="card-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Affiliate Sales</CardTitle>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allSales.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No affiliate sales yet</TableCell></TableRow>
                    ) : (
                      allSales.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{s.buyer_name || "—"}</TableCell>
                          <TableCell className="text-sm text-info">{s.buyer_email || "—"}</TableCell>
                          <TableCell className="text-sm font-medium">${Number(s.amount_paid).toFixed(2)}</TableCell>
                          <TableCell className="text-sm">${Number(s.commission_earned).toFixed(2)}</TableCell>
                          <TableCell className="text-sm">{new Date(s.purchased_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card className="card-shadow">
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayouts.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">No pending payouts</TableCell></TableRow>
                    ) : (
                      pendingPayouts.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{p.user_id.slice(0, 8)}...</TableCell>
                          <TableCell className="text-sm font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                          <TableCell><Badge className="bg-accent text-accent-foreground">{p.status}</Badge></TableCell>
                          <TableCell><Button size="sm" variant="outline">Approve</Button></TableCell>
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
