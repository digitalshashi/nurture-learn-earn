import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CrmContactGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignLeadId, setAssignLeadId] = useState("");

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [{ data: g }, { data: m }, { data: l }] = await Promise.all([
      supabase.from("crm_contact_groups").select("*").eq("coach_id", user!.id).order("created_at"),
      supabase.from("crm_contact_group_members").select("*, crm_leads(name, email), crm_contact_groups!inner(coach_id)").eq("crm_contact_groups.coach_id", user!.id),
      supabase.from("crm_leads").select("id, name, email").eq("coach_id", user!.id).order("name"),
    ]);
    setGroups(g || []);
    setMembers(m || []);
    setLeads(l || []);
    setLoading(false);
  };

  const createGroup = async () => {
    if (!newGroup.name) return;
    const { error } = await supabase.from("crm_contact_groups").insert({ ...newGroup, coach_id: user!.id });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Group created" });
    setNewGroup({ name: "", description: "" });
    setAddOpen(false);
    loadData();
  };

  const deleteGroup = async (id: string) => {
    await supabase.from("crm_contact_groups").delete().eq("id", id);
    toast({ title: "Group deleted" });
    loadData();
  };

  const addMember = async () => {
    if (!assignGroupId || !assignLeadId) return;
    const { error } = await supabase.from("crm_contact_group_members").insert({ group_id: assignGroupId, lead_id: assignLeadId });
    if (error) { toast({ title: "Error", description: error.message.includes("duplicate") ? "Already in group" : error.message, variant: "destructive" }); return; }
    toast({ title: "Contact added to group" });
    setAssignOpen(false);
    loadData();
  };

  const removeMember = async (id: string) => {
    await supabase.from("crm_contact_group_members").delete().eq("id", id);
    loadData();
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold font-display">Contact Groups</h1>
          <div className="flex gap-2">
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm"><UserPlus className="h-4 w-4 mr-1" />Assign Contact</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Assign Contact to Group</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={assignGroupId} onValueChange={setAssignGroupId}>
                    <SelectTrigger><SelectValue placeholder="Select Group" /></SelectTrigger>
                    <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={assignLeadId} onValueChange={setAssignLeadId}>
                    <SelectTrigger><SelectValue placeholder="Select Contact" /></SelectTrigger>
                    <SelectContent>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.name} {l.email ? `(${l.email})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={addMember} className="w-full">Add to Group</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Group</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Contact Group</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Group Name" value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} />
                  <Textarea placeholder="Description (optional)" value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} />
                  <Button onClick={createGroup} className="w-full">Create Group</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : groups.length === 0 ? (
          <Card className="card-shadow"><CardContent className="py-12 text-center text-muted-foreground">No contact groups yet. Create one to organize your leads!</CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(g => {
              const groupMembers = members.filter(m => m.group_id === g.id);
              return (
                <Card key={g.id} className="card-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{g.name}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteGroup(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{groupMembers.length} contacts</span>
                    </div>
                    <div className="space-y-1.5">
                      {groupMembers.slice(0, 5).map(m => (
                        <div key={m.id} className="flex items-center justify-between text-sm">
                          <span>{m.crm_leads?.name || "Unknown"}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMember(m.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      {groupMembers.length > 5 && <p className="text-xs text-muted-foreground">+{groupMembers.length - 5} more</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
