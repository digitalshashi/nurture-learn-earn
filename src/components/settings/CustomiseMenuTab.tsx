import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, GripVertical } from "lucide-react";

interface MenuItem {
  label: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_ITEMS: MenuItem[] = [
  { label: "Feed", enabled: true, order: 0 },
  { label: "Courses", enabled: true, order: 1 },
  { label: "Workshops", enabled: true, order: 2 },
  { label: "Events", enabled: true, order: 3 },
  { label: "Messages", enabled: true, order: 4 },
];

export function CustomiseMenuTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<MenuItem[]>(DEFAULT_ITEMS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) loadMenu();
  }, [user]);

  const loadMenu = async () => {
    const { data } = await supabase
      .from("navigation_menu" as any)
      .select("*")
      .eq("created_by", user!.id)
      .order("sort_order");
    if (data && (data as any[]).length > 0) {
      setItems((data as any[]).map((d: any) => ({
        label: d.label,
        enabled: d.is_enabled,
        order: d.sort_order,
      })));
    }
    setLoading(false);
  };

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, enabled: !item.enabled } : item));
  };

  const renameItem = (idx: number, label: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, label } : item));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    // Delete existing and re-insert
    await supabase.from("navigation_menu" as any).delete().eq("created_by", user.id);
    const rows = items.map((item, i) => ({
      created_by: user.id,
      label: item.label,
      is_enabled: item.enabled,
      sort_order: i,
      icon_name: "Menu",
      link: `/${item.label.toLowerCase()}`,
    }));
    const { error } = await supabase.from("navigation_menu" as any).insert(rows as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Menu saved successfully" });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <p className="text-sm text-muted-foreground">Enable, disable, and rename menu items your students see.</p>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <Switch checked={item.enabled} onCheckedChange={() => toggleItem(idx)} />
              <Input
                value={item.label}
                onChange={(e) => renameItem(idx, e.target.value)}
                className="max-w-[200px] text-sm"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Menu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
