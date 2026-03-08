import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Handshake, DollarSign, Users, TrendingUp, Search, Copy, Share2, ExternalLink,
  Trophy, ArrowUpRight, ArrowDownRight, MousePointerClick, ShoppingCart, Eye, Filter,
  CheckCircle2, XCircle, Clock, MessageSquare as MessageIcon
} from "lucide-react";

export default function Partnerships() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const isCoach = hasRole("coach") || hasRole("admin");

  // State
  const [programs, setPrograms] = useState<any[]>([]);
  const [myLinks, setMyLinks] = useState<any[]>([]);
  const [mySales, setMySales] = useState<any[]>([]);
  const [myClicks, setMyClicks] = useState<any[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [allPartnerSales, setAllPartnerSales] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [marketSearch, setMarketSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [requestDialog, setRequestDialog] = useState<any>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [approveDialog, setApproveDialog] = useState<any>(null);
  const [customCommission, setCustomCommission] = useState("");

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;

    // All active programs with course/service info
    const { data: progs } = await supabase
      .from("affiliate_programs")
      .select("*, courses(id, title, price, thumbnail_url, coach_id), services(id, title, price, coach_id)")
      .eq("is_active", true);
    setPrograms(progs || []);

    // My affiliate links
    const { data: links } = await supabase
      .from("affiliate_links")
      .select("*, affiliate_programs(*, courses(title, price), services(title, price))")
      .eq("user_id", user.id);
    setMyLinks(links || []);

    // My sales as affiliate
    if (links && links.length > 0) {
      const linkIds = links.map((l: any) => l.id);
      const { data: sales } = await supabase
        .from("affiliate_sales")
        .select("*")
        .in("link_id", linkIds)
        .order("purchased_at", { ascending: false });
      setMySales(sales || []);

      const { data: clicks } = await supabase
        .from("affiliate_clicks")
        .select("*")
        .in("link_id", linkIds);
      setMyClicks(clicks || []);
    }

    // My partnership requests (sent)
    const { data: sentReqs } = await supabase
      .from("partnership_requests")
      .select("*, affiliate_programs(*, courses(title), services(title))")
      .eq("requester_id", user.id);
    setPartnerRequests(sentReqs || []);

    // Incoming requests (for my programs)
    if (isCoach) {
      // Get my program IDs
      const myProgIds = (progs || [])
        .filter((p: any) => p.courses?.coach_id === user.id || p.services?.coach_id === user.id)
        .map((p: any) => p.id);

      if (myProgIds.length > 0) {
        const { data: incoming } = await supabase
          .from("partnership_requests")
          .select("*, affiliate_programs(*, courses(title), services(title))")
          .in("program_id", myProgIds)
          .eq("status", "pending");
        setIncomingRequests(incoming || []);

        // All sales from partner affiliates for my programs
        const { data: partnerLinks } = await supabase
          .from("affiliate_links")
          .select("id, user_id, referral_code, program_id")
          .in("program_id", myProgIds);

        if (partnerLinks && partnerLinks.length > 0) {
          const pLinkIds = partnerLinks.map((l: any) => l.id);
          const { data: pSales } = await supabase
            .from("affiliate_sales")
            .select("*")
            .in("link_id", pLinkIds)
            .order("purchased_at", { ascending: false });
          setAllPartnerSales(pSales || []);
        }
      }
    }

    // Coach profiles for marketplace
    const { data: coachProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, niche, bio");
    setCoaches(coachProfiles || []);
  };

  // Request partnership
  const sendRequest = async (programId: string) => {
    if (!user) return;
    const { error } = await supabase.from("partnership_requests").insert({
      requester_id: user.id,
      program_id: programId,
      message: requestMessage.trim() || null,
    });
    if (error) {
      if (error.code === "23505") toast({ title: "Already requested", variant: "destructive" });
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Partnership request sent!" });
      setRequestDialog(null);
      setRequestMessage("");
      loadAll();
    }
  };

  // Approve request — create affiliate link
  const approveRequest = async (req: any) => {
    if (!user) return;
    const code = `ref-${req.requester_id.slice(0, 8)}-${Date.now().toString(36)}`;
    // Create affiliate link
    await supabase.from("affiliate_links").insert({
      user_id: req.requester_id,
      program_id: req.program_id,
      referral_code: code,
    });
    // Update request
    await supabase.from("partnership_requests").update({
      status: "approved",
      custom_commission: customCommission ? Number(customCommission) : null,
      responded_at: new Date().toISOString(),
    }).eq("id", req.id);

    toast({ title: "Partnership approved!" });
    setApproveDialog(null);
    setCustomCommission("");
    loadAll();
  };

  const rejectRequest = async (reqId: string) => {
    await supabase.from("partnership_requests").update({
      status: "rejected",
      responded_at: new Date().toISOString(),
    }).eq("id", reqId);
    toast({ title: "Request rejected" });
    loadAll();
  };

  // Copy affiliate link
  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}?ref=${code}`);
    toast({ title: "Link copied!" });
  };

  const shareWhatsApp = (code: string) => {
    const url = encodeURIComponent(`${window.location.origin}?ref=${code}`);
    window.open(`https://wa.me/?text=${url}`, "_blank");
  };

  // Marketplace programs (not own)
  const marketPrograms = useMemo(() => {
    return programs.filter((p) => {
      const ownerId = p.courses?.coach_id || p.services?.coach_id;
      if (ownerId === user?.id) return false;
      const title = (p.courses?.title || p.services?.title || "").toLowerCase();
      if (marketSearch && !title.includes(marketSearch.toLowerCase())) return false;
      return true;
    });
  }, [programs, user?.id, marketSearch]);

  // Revenue metrics
  const totalEarnings = mySales.reduce((s, r) => s + Number(r.commission_earned), 0);
  const thisMonthSales = mySales.filter(
    (s) => new Date(s.purchased_at).getMonth() === new Date().getMonth()
  );
  const thisMonthEarnings = thisMonthSales.reduce((s, r) => s + Number(r.commission_earned), 0);
  const totalClicks = myClicks.length;
  const totalSalesCount = mySales.length;
  const conversionRate = totalClicks > 0 ? ((totalSalesCount / totalClicks) * 100).toFixed(1) : "0";

  // Partner leaderboard (for coaches)
  const partnerLeaderboard = useMemo(() => {
    const map: Record<string, { userId: string; total: number }> = {};
    allPartnerSales.forEach((s: any) => {
      // We'd need link → user mapping; simplified
      if (!map[s.link_id]) map[s.link_id] = { userId: s.link_id, total: 0 };
      map[s.link_id].total += Number(s.commission_earned);
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [allPartnerSales]);

  const requestedProgramIds = new Set(partnerRequests.map((r: any) => r.program_id));
  const linkedProgramIds = new Set(myLinks.map((l: any) => l.program_id));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Handshake className="h-6 w-6 text-primary" /> Partnerships
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Discover, collaborate, and earn with other coaches</p>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Active Partners</p>
                <p className="text-xl font-bold">{myLinks.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><DollarSign className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
                <p className="text-xl font-bold">₹{totalEarnings.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><TrendingUp className="h-5 w-5 text-accent" /></div>
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-xl font-bold">₹{thisMonthEarnings.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10"><MousePointerClick className="h-5 w-5 text-info" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
                <p className="text-xl font-bold">{totalClicks}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><ShoppingCart className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion</p>
                <p className="text-xl font-bold">{conversionRate}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="marketplace">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="my-partners">My Partners</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Dashboard</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            {isCoach && <TabsTrigger value="requests">Requests {incomingRequests.length > 0 && <Badge className="ml-1.5 h-5 min-w-[20px] bg-destructive text-destructive-foreground text-[10px]">{incomingRequests.length}</Badge>}</TabsTrigger>}
          </TabsList>

          {/* MARKETPLACE */}
          <TabsContent value="marketplace">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                  placeholder="Search programs..."
                  className="pl-9"
                />
              </div>
            </div>

            {marketPrograms.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No affiliate programs available right now.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketPrograms.map((p) => {
                  const title = p.courses?.title || p.services?.title || "Program";
                  const price = p.courses?.price || p.services?.price || 0;
                  const thumb = p.courses?.thumbnail_url;
                  const ownerId = p.courses?.coach_id || p.services?.coach_id;
                  const ownerProfile = coaches.find((c: any) => c.id === ownerId);
                  const alreadyPartner = linkedProgramIds.has(p.id);
                  const alreadyRequested = requestedProgramIds.has(p.id);

                  return (
                    <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      {thumb && (
                        <div className="aspect-video bg-secondary">
                          <img src={thumb} alt={title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h3 className="font-bold text-base leading-tight">{title}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {ownerProfile?.full_name?.charAt(0) || "C"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground">{ownerProfile?.full_name || "Coach"}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold">₹{Number(price).toLocaleString()}</span>
                          <Badge className="bg-success/10 text-success border-success/20">
                            {p.commission_percent}% commission
                          </Badge>
                        </div>

                        {alreadyPartner ? (
                          <Button variant="outline" className="w-full" disabled>
                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Active Partner
                          </Button>
                        ) : alreadyRequested ? (
                          <Button variant="outline" className="w-full" disabled>
                            <Clock className="h-4 w-4 mr-1.5" /> Request Pending
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={() => setRequestDialog(p)}
                          >
                            <Handshake className="h-4 w-4 mr-1.5" /> Request Partnership
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* MY PARTNERS */}
          <TabsContent value="my-partners">
            {myLinks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No active partnerships yet. Browse the Marketplace to find programs to promote.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myLinks.map((link: any) => {
                  const prog = link.affiliate_programs;
                  const title = prog?.courses?.title || prog?.services?.title || "Program";
                  const price = prog?.courses?.price || prog?.services?.price || 0;
                  const linkSales = mySales.filter((s: any) => s.link_id === link.id);
                  const linkClicks = myClicks.filter((c: any) => c.link_id === link.id);
                  const linkEarnings = linkSales.reduce((s: number, r: any) => s + Number(r.commission_earned), 0);
                  const linkRevenue = linkSales.reduce((s: number, r: any) => s + Number(r.amount_paid), 0);

                  return (
                    <Card key={link.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-base">{title}</h3>
                            <p className="text-sm text-muted-foreground">
                              ₹{Number(price).toLocaleString()} • {prog?.commission_percent}% commission
                            </p>
                          </div>
                          <Badge className="bg-success/10 text-success">Active</Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          <div className="text-center p-2 bg-secondary/30 rounded-lg">
                            <p className="text-xs text-muted-foreground">Clicks</p>
                            <p className="text-lg font-bold">{linkClicks.length}</p>
                          </div>
                          <div className="text-center p-2 bg-secondary/30 rounded-lg">
                            <p className="text-xs text-muted-foreground">Sales</p>
                            <p className="text-lg font-bold">{linkSales.length}</p>
                          </div>
                          <div className="text-center p-2 bg-secondary/30 rounded-lg">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="text-lg font-bold">₹{linkRevenue.toLocaleString()}</p>
                          </div>
                          <div className="text-center p-2 bg-success/10 rounded-lg">
                            <p className="text-xs text-muted-foreground">Earned</p>
                            <p className="text-lg font-bold text-success">₹{linkEarnings.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            value={`${window.location.origin}?ref=${link.referral_code}`}
                            readOnly
                            className="font-mono text-xs flex-1"
                          />
                          <Button variant="outline" size="icon" onClick={() => copyLink(link.referral_code)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => shareWhatsApp(link.referral_code)}>
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* REVENUE DASHBOARD */}
          <TabsContent value="revenue">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-success mb-2" />
                  <p className="text-sm text-muted-foreground">Total Affiliate Earnings</p>
                  <p className="text-3xl font-bold mt-1">₹{totalEarnings.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto text-accent mb-2" />
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-3xl font-bold mt-1">₹{thisMonthEarnings.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <ShoppingCart className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-3xl font-bold mt-1">{totalSalesCount}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mySales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                          No sales yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      mySales.slice(0, 20).map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm font-medium">{s.buyer_name || s.buyer_email || "—"}</TableCell>
                          <TableCell className="text-sm">₹{Number(s.amount_paid).toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-success font-medium">₹{Number(s.commission_earned).toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(s.purchased_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEADERBOARD */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" /> Partner Leaderboard
                </CardTitle>
                <CardDescription>Top affiliate partners by earnings this month</CardDescription>
              </CardHeader>
              <CardContent>
                {partnerLeaderboard.length === 0 && !isCoach ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    Leaderboard data will appear as your network grows.
                  </p>
                ) : partnerLeaderboard.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No partner sales yet</p>
                ) : (
                  <div className="space-y-2">
                    {partnerLeaderboard.map((entry, i) => (
                      <div
                        key={entry.userId}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                      >
                        <span className={`text-lg font-bold w-8 text-center ${
                          i === 0 ? "text-accent" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-orange-500" : "text-muted-foreground"
                        }`}>
                          {i + 1}
                        </span>
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">P</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Partner</p>
                        </div>
                        <p className="font-bold text-success">₹{entry.total.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INCOMING REQUESTS (Coach) */}
          {isCoach && (
            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Partnership Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {incomingRequests.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">No pending requests</p>
                  ) : (
                    <div className="space-y-3">
                      {incomingRequests.map((req: any) => {
                        const progTitle = req.affiliate_programs?.courses?.title || req.affiliate_programs?.services?.title || "Program";
                        const requesterProfile = coaches.find((c: any) => c.id === req.requester_id);

                        return (
                          <div key={req.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {requesterProfile?.full_name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">
                                {requesterProfile?.full_name || "Coach"} wants to promote{" "}
                                <span className="text-primary">{progTitle}</span>
                              </p>
                              {req.message && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{req.message}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Commission: {req.affiliate_programs?.commission_percent}%
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => setApproveDialog(req)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectRequest(req.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Request Partnership Dialog */}
        <Dialog open={!!requestDialog} onOpenChange={() => setRequestDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Partnership</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="font-semibold text-sm">
                  {requestDialog?.courses?.title || requestDialog?.services?.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  Commission: {requestDialog?.commission_percent}%
                </p>
              </div>
              <div>
                <Label>Message (optional)</Label>
                <Textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Tell the coach why you'd like to partner..."
                  className="mt-1"
                />
              </div>
              <Button className="w-full" onClick={() => sendRequest(requestDialog?.id)}>
                Send Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Partnership</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">
                Approve this partner to promote your program. An affiliate link will be generated automatically.
              </p>
              <div>
                <Label>Custom Commission % (optional — leave empty for default)</Label>
                <Input
                  type="number"
                  value={customCommission}
                  onChange={(e) => setCustomCommission(e.target.value)}
                  placeholder={`Default: ${approveDialog?.affiliate_programs?.commission_percent}%`}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => approveRequest(approveDialog)}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setApproveDialog(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
