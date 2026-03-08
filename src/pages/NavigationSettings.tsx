import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, Save, Eye, EyeOff } from "lucide-react";
import { LucideIcon } from "@/components/layout/TopNav";
import { Checkbox } from "@/components/ui/checkbox";

interface NavItem {
  id?: string;
  label: string;
  icon_name: string;
  link: string;
  sort_order: number;
  is_enabled: boolean;
  visible_roles: string[];
}

const POPULAR_ICONS = [
  "users", "book-open", "trophy", "calendar", "wrench", "flag",
  "sparkles", "bar-chart-3", "message-square", "brain", "gamepad-2",
  "video", "star", "heart", "zap", "target", "globe", "rocket",
  "layout-dashboard", "graduation-cap", "mic", "headphones",
];

const ROLES = ["student", "coach", "admin"];

export default function NavigationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<NavItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingIcon, setEditingIcon] = useState<number | null>(null);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    const { data } = await supabase
      .from("navigation_menu")
      .select("*")
      .order("sort_order");
    if (data) setItems(data as NavItem[]);
  };

  const addItem = () => {
    setItems([...items, {
      label: "",
      icon_name: "circle",
      link: "/",
      sort_order: items.length,
      is_enabled: true,
      visible_roles: ["student", "coach", "admin"],
    }]);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const updated = [...items];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setItems(updated);
  };

  const toggleRole = (idx: number, role: string) => {
    const updated = [...items];
    const roles = updated[idx].visible_roles;
    if (roles.includes(role)) {
      updated[idx].visible_roles = roles.filter((r) => r !== role);
    } else {
      updated[idx].visible_roles = [...roles, role];
    }
    setItems(updated);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Delete removed items
      const existingIds = items.filter((i) => i.id).map((i) => i.id!);
      const { data: allExisting } = await supabase.from("navigation_menu").select("id");
      const toDelete = (allExisting || []).filter((e: any) => !existingIds.includes(e.id));
      for (const d of toDelete) {
        await supabase.from("navigation_menu").delete().eq("id", d.id);
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const payload = {
          label: item.label,
          icon_name: item.icon_name,
          link: item.link,
          sort_order: i,
          is_enabled: item.is_enabled,
          visible_roles: item.visible_roles,
          created_by: user.id,
        };
        if (item.id) {
          await supabase.from("navigation_menu").update(payload).eq("id", item.id);
        } else {
          await supabase.from("navigation_menu").insert(payload);
        }
      }
      toast({ title: "Saved!", description: "Navigation menu updated" });
      loadItems();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Navigation Settings</h1>
            <p className="text-sm text-muted-foreground">Configure the top menu bar visible to students</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 border border-border rounded-lg p-3 bg-card overflow-x-auto">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-sm font-bold">L</span>
              </div>
              {items.filter((i) => i.is_enabled).map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5 text-muted-foreground text-xs shrink-0 px-2">
                  <LucideIcon name={item.icon_name} className="h-5 w-5" />
                  <span className="font-medium uppercase whitespace-nowrap">{item.label || "Label"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <Card key={idx} className={!item.is_enabled ? "opacity-60" : ""}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveItem(idx, -1)} className="text-muted-foreground hover:text-foreground text-xs">▲</button>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <button onClick={() => moveItem(idx, 1)} className="text-muted-foreground hover:text-foreground text-xs">▼</button>
                  </div>

                  {/* Icon picker */}
                  <div className="relative">
                    <button
                      onClick={() => setEditingIcon(editingIcon === idx ? null : idx)}
                      className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                    >
                      <LucideIcon name={item.icon_name} className="h-5 w-5" />
                    </button>
                    {editingIcon === idx && (
                      <div className="absolute top-12 left-0 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 w-64 grid grid-cols-6 gap-2">
                        {POPULAR_ICONS.map((icon) => (
                          <button
                            key={icon}
                            onClick={() => { updateItem(idx, "icon_name", icon); setEditingIcon(null); }}
                            className={`h-9 w-9 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors ${item.icon_name === icon ? "bg-accent/20 text-accent" : ""}`}
                          >
                            <LucideIcon name={icon} className="h-4 w-4" />
                          </button>
                        ))}
                        <div className="col-span-6 mt-1">
                          <Input
                            placeholder="Custom icon name..."
                            className="h-7 text-xs"
                            defaultValue={item.icon_name}
                            onBlur={(e) => updateItem(idx, "icon_name", e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Input
                    value={item.label}
                    onChange={(e) => updateItem(idx, "label", e.target.value)}
                    placeholder="Menu label"
                    className="h-9 text-sm max-w-[150px]"
                  />
                  <Input
                    value={item.link}
                    onChange={(e) => updateItem(idx, "link", e.target.value)}
                    placeholder="/path"
                    className="h-9 text-sm max-w-[200px] font-mono"
                  />

                  <div className="flex items-center gap-2 ml-auto">
                    <Switch
                      checked={item.is_enabled}
                      onCheckedChange={(v) => updateItem(idx, "is_enabled", v)}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Role visibility */}
                <div className="flex items-center gap-3 ml-14">
                  <span className="text-xs text-muted-foreground">Visible to:</span>
                  {ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox
                        checked={item.visible_roles.includes(role)}
                        onCheckedChange={() => toggleRole(idx, role)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
              No menu items configured. Default navigation will be used. Click "Add Item" to customize.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
