import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Edit2, Shield, Lock, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TeamMember {
  id: string;
  coach_id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  role: string;
  permissions: string[];
  status: string;
  invited_at: string;
}

const PERMISSION_OPTIONS = [
  { key: "courses", label: "Courses" },
  { key: "customers", label: "Customers" },
  { key: "analytics", label: "Analytics" },
  { key: "automation", label: "Automation" },
  { key: "payments", label: "Payments" },
  { key: "marketing", label: "Marketing" },
  { key: "settings", label: "Settings" },
];

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [role, setRole] = useState("restricted");
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (user) loadMembers();
  }, [user]);

  const loadMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("coach_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) setMembers(data as TeamMember[]);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setCountry("");
    setRole("restricted"); setPermissions([]); setEditingId(null);
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (m: TeamMember) => {
    setEditingId(m.id); setName(m.name); setEmail(m.email);
    setPhone(m.phone); setCountry(m.country); setRole(m.role);
    setPermissions(m.permissions || []); setDialogOpen(true);
  };

  const saveMember = async () => {
    if (!name.trim() || !email.trim()) {
      toast({ title: "Error", description: "Name and email are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      coach_id: user!.id,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      country: country.trim(),
      role,
      permissions: role === "admin" ? PERMISSION_OPTIONS.map((p) => p.key) : permissions,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from("team_members").update(payload as any).eq("id", editingId);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Member updated" });
    } else {
      const { error } = await supabase.from("team_members").insert(payload as any);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Member added" });
    }
    setSaving(false);
    setDialogOpen(false);
    resetForm();
    loadMembers();
  };

  const deleteMember = async (id: string) => {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Member removed" });
      setMembers((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const togglePermission = (key: string) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Team Management</h1>
          <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-1" /> Add New Member
          </Button>
        </div>

        <Card className="card-shadow">
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No team members yet. Add your first team member.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-accent/10 text-accent">
                              {m.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium">{m.name}</p>
                            <p className="text-[10px] text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.role === "admin" ? "default" : "secondary"} className="text-[10px] capitalize">
                          {m.role === "admin" ? <Shield className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                          {m.role === "admin" ? "Admin" : "Restricted"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {m.role === "admin" ? (
                            <span className="text-[10px] text-muted-foreground">Full Access</span>
                          ) : (
                            (m.permissions || []).slice(0, 3).map((p) => (
                              <Badge key={p} variant="outline" className="text-[10px] capitalize">{p}</Badge>
                            ))
                          )}
                          {m.role !== "admin" && (m.permissions || []).length > 3 && (
                            <Badge variant="outline" className="text-[10px]">+{m.permissions.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize text-green-600 border-green-300">{m.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteMember(m.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">{editingId ? "Edit Team Member" : "Add New Team Member"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">Full Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="text-xs mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" className="text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Country</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" className="text-xs mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Access Type</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin Access (Full Control)</SelectItem>
                    <SelectItem value="restricted">Restricted Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === "restricted" && (
                <div>
                  <Label className="text-xs mb-2 block">Module Access</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PERMISSION_OPTIONS.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={permissions.includes(perm.key)}
                          onCheckedChange={() => togglePermission(perm.key)}
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={saveMember} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90 w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? "Update Member" : "Add Member"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
