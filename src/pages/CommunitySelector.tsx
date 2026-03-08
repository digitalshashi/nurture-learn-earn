import { useNavigate } from "react-router-dom";
import { useCommunity } from "@/contexts/CommunityContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CommunitySelector() {
  const navigate = useNavigate();
  const { communities, setActiveCommunity, loading } = useCommunity();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelect = (community: any) => {
    setActiveCommunity(community);
    navigate(`/c/${community.slug}/feed`);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    setCreating(true);
    try {
      const slug = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
      const { data, error } = await supabase
        .from("communities")
        .insert({ name: newName, slug, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;

      // Add creator as owner member
      await supabase
        .from("community_members")
        .insert({ community_id: data.id, user_id: user!.id, role: "owner" });

      toast({ title: "Community created!" });
      setDialogOpen(false);
      setActiveCommunity(data as any);
      navigate(`/c/${slug}/feed`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display">Choose Community</h1>
          <p className="text-muted-foreground text-sm mt-1">Select a workspace to continue</p>
        </div>

        <div className="space-y-3">
          {communities.map((community) => (
            <Card
              key={community.id}
              className="card-shadow border-border cursor-pointer hover:border-accent/50 transition-colors"
              onClick={() => handleSelect(community)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0"
                  style={{ backgroundColor: community.brand_color || "hsl(var(--accent))" }}
                >
                  {community.logo_url ? (
                    <img src={community.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    community.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{community.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{community.slug}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {communities.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm mb-4">You haven't joined any community yet.</p>
            </div>
          )}
        </div>

        {(hasRole("coach") || hasRole("admin")) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mt-6 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-2" /> Create Community
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Community</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Community Name</Label>
                  <Input
                    placeholder="Freedom Business"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                    }}
                  />
                </div>
                <div>
                  <Label>URL Slug</Label>
                  <Input
                    placeholder="freedom-business"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">platform.com/c/{newSlug || "your-slug"}</p>
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {creating ? "Creating..." : "Create Community"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
