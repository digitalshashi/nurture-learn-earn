import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Plus, Download, Search, Filter, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { AddCustomerDialog } from "@/components/customers/AddCustomerDialog";
import { CustomerActionsMenu } from "@/components/customers/CustomerActionsMenu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface CustomerRow {
  id: string;
  user_id: string;
  service_id: string;
  status: string;
  access_type: string;
  purchased_at: string;
  expires_at: string | null;
  amount_paid: number | null;
  payment_method: string | null;
  notes: string | null;
  profiles: { full_name: string; email: string } | null;
  services: { title: string; enable_subscription: boolean; subscription_interval: string | null } | null;
}

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);

  const fetchCustomers = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("service_users")
      .select("id, user_id, service_id, status, access_type, purchased_at, expires_at, amount_paid, payment_method, notes, profiles!service_users_user_id_fkey(full_name, email), services!service_users_service_id_fkey(title, enable_subscription, subscription_interval)")
      .order("purchased_at", { ascending: false });

    if (error) {
      // Fallback without foreign key hints
      const { data: fallbackData } = await supabase
        .from("service_users")
        .select("id, user_id, service_id, status, access_type, purchased_at, expires_at, amount_paid, payment_method, notes")
        .order("purchased_at", { ascending: false });
      
      if (fallbackData) {
        // Fetch profiles and services separately
        const userIds = [...new Set(fallbackData.map(d => d.user_id))];
        const serviceIds = [...new Set(fallbackData.map(d => d.service_id))];
        
        const [profilesRes, servicesRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name, email").in("id", userIds),
          supabase.from("services").select("id, title, enable_subscription, subscription_interval").in("id", serviceIds),
        ]);

        const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
        const servicesMap = new Map(servicesRes.data?.map(s => [s.id, s]) || []);

        setCustomers(fallbackData.map(d => ({
          ...d,
          profiles: profilesMap.get(d.user_id) ? { full_name: profilesMap.get(d.user_id)!.full_name, email: profilesMap.get(d.user_id)!.email } : null,
          services: servicesMap.get(d.service_id) ? { title: servicesMap.get(d.service_id)!.title, enable_subscription: servicesMap.get(d.service_id)!.enable_subscription, subscription_interval: servicesMap.get(d.service_id)!.subscription_interval } : null,
        })) as CustomerRow[]);
      }
    } else {
      setCustomers((data || []) as unknown as CustomerRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, [user]);

  const filtered = useMemo(() => {
    let result = customers;
    if (statusFilter !== "all") {
      result = result.filter(c => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.profiles?.full_name?.toLowerCase().includes(q) ||
        c.profiles?.email?.toLowerCase().includes(q) ||
        c.services?.title?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [customers, search, statusFilter]);

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter(c => c.status === "active").length,
    inactive: customers.filter(c => c.status !== "active").length,
  }), [customers]);

  const handleRevoke = async (customer: CustomerRow) => {
    const { error } = await supabase
      .from("service_users")
      .update({ status: "revoked" } as any)
      .eq("id", customer.id);
    if (error) toast.error("Failed to revoke access");
    else { toast.success("Access revoked"); fetchCustomers(); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("service_users").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Failed to delete customer");
    else { toast.success("Customer deleted"); fetchCustomers(); }
    setDeleteTarget(null);
  };

  const handleExport = () => {
    const headers = ["Name", "Email", "Service", "Status", "Access Type", "Purchased", "Expiry"];
    const rows = filtered.map(c => [
      c.profiles?.full_name || "",
      c.profiles?.email || "",
      c.services?.title || "",
      c.status,
      c.access_type || "",
      c.purchased_at ? format(new Date(c.purchased_at), "MMM d, yyyy") : "",
      c.expires_at ? format(new Date(c.expires_at), "MMM d, yyyy") : "Lifetime",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  const getCycle = (c: CustomerRow) => {
    if (c.access_type === "manual") return "Manual";
    if (c.services?.enable_subscription && c.services?.subscription_interval) return c.services.subscription_interval;
    return "One-time";
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-success/15 text-success border-success/30",
      inactive: "bg-secondary text-secondary-foreground",
      revoked: "bg-destructive/15 text-destructive border-destructive/30",
      expired: "bg-muted text-muted-foreground",
    };
    return map[status] || map.inactive;
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold font-display">Customers</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />Export
            </Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />Add Customer
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card className="card-shadow">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10"><Users className="h-5 w-5 text-info" /></div>
              <div><p className="text-xs text-muted-foreground">Total Customers</p><p className="text-xl font-bold">{stats.total}</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><UserCheck className="h-5 w-5 text-success" /></div>
              <div><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold">{stats.active}</p></div>
            </CardContent>
          </Card>
          <Card className="card-shadow">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><UserX className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-xs text-muted-foreground">Inactive / Revoked</p><p className="text-xl font-bold">{stats.inactive}</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="card-shadow">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email or service..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-center">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchCustomers}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading customers...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {customers.length === 0 ? "No customers yet. Add your first customer!" : "No customers match your filters."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Payment Cycle</TableHead>
                      <TableHead>Last Transaction</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">
                          {c.profiles?.full_name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.profiles?.email || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{c.services?.title || "—"}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline" className="text-xs capitalize">{getCycle(c)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.purchased_at ? format(new Date(c.purchased_at), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.expires_at ? format(new Date(c.expires_at), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs capitalize ${getStatusBadge(c.status)}`}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <CustomerActionsMenu
                            status={c.status}
                            onRevoke={() => handleRevoke(c)}
                            onEdit={() => toast.info("Edit coming soon")}
                            onViewRemarks={() => toast.info("Remarks coming soon")}
                            onDelete={() => setDeleteTarget(c)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddCustomerDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchCustomers} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This will remove their access and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
