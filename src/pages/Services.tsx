import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, RefreshCw, Pencil, Trash2, Share2, MoreHorizontal, Eye, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ServiceShareDialog } from "@/components/services/ServiceShareDialog";

interface Service {
  id: string;
  title: string;
  slug: string | null;
  price: number;
  currency: string;
  status: string;
  is_free: boolean;
  enable_subscription: boolean;
  created_at: string;
  service_users?: { count: number }[];
}

export default function Services() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [showFree, setShowFree] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shareService, setShareService] = useState<Service | null>(null);

  const loadServices = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*, service_users(count)")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });
    setServices((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { loadServices(); }, [user]);

  const filtered = services.filter((s) => {
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (!showFree && s.is_free) return false;
    return true;
  });

  const deleteService = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    toast({ title: "Service deleted" });
    loadServices();
  };

  const cloneService = async (s: Service) => {
    const { id: _id, service_users: _su, created_at: _ca, ...rest } = s as any;
    const { data: full } = await supabase.from("services").select("*").eq("id", s.id).single();
    if (!full) return;
    const { id: _fid, created_at: _fca, updated_at: _fua, ...payload } = full as any;
    const { error } = await supabase.from("services").insert({
      ...payload,
      title: `${s.title} (Copy)`,
      slug: `${s.slug || s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-copy-${Date.now()}`,
      status: "draft",
    } as any);
    if (error) { toast({ title: "Clone failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Service cloned" });
    loadServices();
  };

  const toggleHide = async (s: Service) => {
    const nextStatus = s.status === "paused" ? "active" : "paused";
    await supabase.from("services").update({ status: nextStatus }).eq("id", s.id);
    toast({ title: nextStatus === "paused" ? "Service hidden" : "Service unhidden" });
    loadServices();
  };

  const statusBadge = (status: string) => {
    const cls = status === "active" ? "bg-green-500/10 text-green-600" :
                status === "paused" ? "bg-yellow-500/10 text-yellow-600" :
                status === "archived" ? "bg-muted text-muted-foreground" :
                "bg-secondary text-secondary-foreground";
    return <Badge className={`${cls} text-xs uppercase`}>{status}</Badge>;
  };

  const formatPrice = (s: Service) => {
    if (s.is_free) return "Free";
    const symbol = s.currency === "INR" ? "₹" : "$";
    return `${symbol}${s.price}${s.enable_subscription ? "/mo" : ""}`;
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-display">Services</h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Show free services</span>
              <Switch checked={showFree} onCheckedChange={setShowFree} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/service-builder")}>
              <Plus className="h-4 w-4 mr-1" /> Create new service
            </Button>
            <Button variant="outline" onClick={loadServices}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Last updated {loading ? "..." : "1 second ago."}</p>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by service title" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Card className="card-shadow">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Active Users</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No services found</TableCell></TableRow>
                ) : filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground">service id: {s.id.slice(0, 24)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{formatPrice(s)}</p>
                      <p className="text-[10px] text-muted-foreground">{s.enable_subscription ? "subscription" : "onetime"}</p>
                    </TableCell>
                    <TableCell className="text-sm">{(s.service_users as any)?.[0]?.count || 0}</TableCell>
                    <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/service-builder/${s.id}`)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/checkout/${s.slug || s.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShareService(s)}>
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/service-builder/${s.id}`)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => cloneService(s)}>
                              <Copy className="h-3.5 w-3.5 mr-2" /> Clone
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleHide(s)}>
                              {s.status === "paused" ? "Unhide" : "Hide"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/checkout/${s.slug || s.id}`);
                              toast({ title: "Checkout link copied!" });
                            }}>
                              <Copy className="h-3.5 w-3.5 mr-2" /> Copy checkout link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/checkout/${s.slug || s.id}/success`);
                              toast({ title: "Payment success page link copied!" });
                            }}>
                              <Copy className="h-3.5 w-3.5 mr-2" /> Copy payment success page link
                            </DropdownMenuItem>
                            <DropdownMenuItem>Analytics</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteService(s.id)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {shareService && (
        <ServiceShareDialog
          open={!!shareService}
          onOpenChange={(open) => !open && setShareService(null)}
          serviceTitle={shareService.title}
          serviceId={shareService.id}
          slug={shareService.slug}
        />
      )}
    </AppLayout>
  );
}
