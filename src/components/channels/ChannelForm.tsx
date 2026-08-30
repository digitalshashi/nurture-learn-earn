import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Image as ImageIcon, Loader2, Megaphone, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { convertImageToWebp } from "@/lib/imageEncoding";
import { cn } from "@/lib/utils";

/**
 * Creating and editing a channel: what it is called, what it looks like, who
 * may speak in it, and who is let in without being invited.
 *
 * The two shapes people already know:
 *   everyone posts  — a group, like a WhatsApp group
 *   admins post     — a broadcast, like a Telegram channel
 */

export interface ChannelRecord {
  id: string;
  name: string;
  description: string | null;
  topic: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  visibility: "open" | "members";
  post_policy: "everyone" | "admins";
  channel_type: string;
}

interface AccessRule {
  id?: string;
  rule_type: "role" | "service";
  role?: string | null;
  service_id?: string | null;
  label: string;
}

const ROLES = ["student", "coach", "admin"] as const;

const BUCKET = "channel-files";

export function ChannelForm({
  open,
  onOpenChange,
  channel,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Absent when creating. */
  channel?: ChannelRecord | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"open" | "members">("members");
  const [postPolicy, setPostPolicy] = useState<"everyone" | "admins">("everyone");

  const [rules, setRules] = useState<AccessRule[]>([]);
  const [services, setServices] = useState<{ id: string; title: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);

  const avatarInput = useRef<HTMLInputElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    const { data: serviceRows } = await supabase
      .from("services")
      .select("id, title")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });
    setServices((serviceRows ?? []) as { id: string; title: string }[]);

    if (!channel) {
      setName("");
      setTopic("");
      setDescription("");
      setAvatarUrl(null);
      setCoverUrl(null);
      setVisibility("members");
      setPostPolicy("everyone");
      setRules([]);
      return;
    }

    setName(channel.name);
    setTopic(channel.topic ?? "");
    setDescription(channel.description ?? "");
    setAvatarUrl(channel.avatar_url);
    setCoverUrl(channel.cover_url);
    setVisibility(channel.visibility);
    setPostPolicy(channel.post_policy);

    const { data: ruleRows } = await supabase
      .from("channel_access_rules")
      .select("id, rule_type, role, service_id")
      .eq("channel_id", channel.id);

    setRules(
      ((ruleRows ?? []) as AccessRule[]).map((rule) => ({
        ...rule,
        label:
          rule.rule_type === "role"
            ? `Everyone with the ${rule.role} role`
            : (serviceRows ?? []).find((s) => s.id === rule.service_id)?.title ?? "A service",
      })),
    );
  }, [channel, user]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  /** Uploads a picture and returns its public URL. */
  const upload = async (file: File, kind: "avatar" | "cover") => {
    if (!user) return;
    setUploading(kind);

    // Channel art goes to a Supabase bucket rather than through
    // uploadToCloud, so it has to ask for the WebP conversion itself. An
    // avatar is shown on every message in the channel, which is exactly the
    // kind of image worth having in the smaller format.
    const encoded = await convertImageToWebp(file);
    const name = (encoded.file as File).name || file.name;

    const path = `channel-art/${user.id}/${kind}-${Date.now()}-${name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, encoded.file, { upsert: true, contentType: encoded.file.type });

    if (error) {
      setUploading(null);
      toast({ title: "Couldn't upload", description: error.message, variant: "destructive" });
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (kind === "avatar") setAvatarUrl(data.publicUrl);
    else setCoverUrl(data.publicUrl);
    setUploading(null);
  };

  const addRule = (rule: AccessRule) => {
    // Adding the same rule twice would let someone in twice, which is not a
    // thing — and it clutters the list.
    const already = rules.some(
      (existing) =>
        existing.rule_type === rule.rule_type &&
        existing.role === rule.role &&
        existing.service_id === rule.service_id,
    );
    if (!already) setRules((current) => [...current, rule]);
  };

  const save = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({ title: "Give the channel a name", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      name: name.trim(),
      topic: topic.trim() || null,
      description: description.trim() || null,
      avatar_url: avatarUrl,
      cover_url: coverUrl,
      visibility,
      post_policy: postPolicy,
      // Kept in step with post_policy so the existing icons stay meaningful.
      channel_type: postPolicy === "admins" ? "announcement" : "public",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = channel
      ? await supabase.from("channels").update(payload).eq("id", channel.id).select("id").single()
      : await supabase
          .from("channels")
          .insert({ ...payload, created_by: user.id, coach_id: user.id, is_global: false })
          .select("id")
          .single();

    if (error || !data) {
      setSaving(false);
      toast({ title: "Couldn't save", description: error?.message, variant: "destructive" });
      return;
    }

    const channelId = (data as { id: string }).id;

    // Rules are replaced wholesale: the list in front of the owner is the list
    // that ends up stored, with no orphan left behind from a previous edit.
    await supabase.from("channel_access_rules").delete().eq("channel_id", channelId);

    if (rules.length) {
      await supabase.from("channel_access_rules").insert(
        rules.map((rule) => ({
          channel_id: channelId,
          rule_type: rule.rule_type,
          role: rule.rule_type === "role" ? rule.role : null,
          service_id: rule.rule_type === "service" ? rule.service_id : null,
        })) as never,
      );
    }

    // The creator is a member of their own channel, and its admin.
    if (!channel) {
      await supabase
        .from("channel_members")
        .insert({ channel_id: channelId, user_id: user.id, role: "admin" } as never);
    }

    setSaving(false);
    toast({ title: channel ? "Channel updated" : "Channel created" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{channel ? "Channel settings" : "New channel"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Cover and picture, laid out as they will appear. */}
          <div>
            <div
              className={cn(
                "relative h-28 rounded-xl overflow-hidden border bg-muted",
                !coverUrl && "bg-gradient-to-br from-accent-deep via-accent-strong to-accent",
              )}
            >
              {coverUrl && (
                <img src={coverUrl} alt="" className="h-full w-full object-cover" />
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2 h-7 text-xs"
                onClick={() => coverInput.current?.click()}
                disabled={uploading !== null}
              >
                {uploading === "cover" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 mr-1" />
                )}
                Cover
              </Button>
            </div>

            <div className="-mt-8 ml-4 relative w-fit">
              <div className="h-16 w-16 rounded-2xl border-4 border-background bg-secondary overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                onClick={() => avatarInput.current?.click()}
                disabled={uploading !== null}
              >
                {uploading === "avatar" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "avatar")}
            />
            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover")}
            />
          </div>

          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Founding members"
              maxLength={80}
            />
          </div>

          <div>
            <Label className="text-xs">Topic</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Shown under the name, like a status"
              maxLength={120}
            />
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this channel is for"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Who can post</Label>
              <Select value={postPolicy} onValueChange={(v: "everyone" | "admins") => setPostPolicy(v)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone — a group</SelectItem>
                  <SelectItem value="admins">Admins only — a broadcast</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                {postPolicy === "admins" ? (
                  <>
                    <Megaphone className="h-3 w-3" /> Members read only
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3" /> Everyone joins in
                  </>
                )}
              </p>
            </div>

            <div>
              <Label className="text-xs">Who can find it</Label>
              <Select value={visibility} onValueChange={(v: "open" | "members") => setVisibility(v)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="members">Members only</SelectItem>
                  <SelectItem value="open">Anyone in the academy</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {visibility === "open"
                  ? "Listed to everyone, who can join themselves."
                  : "Invisible unless you are a member or a rule lets you in."}
              </p>
            </div>
          </div>

          {/* Automatic membership. */}
          <div>
            <Label className="text-xs">Let people in automatically</Label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Anyone matching a rule is a member without being added, so a new buyer lands here on
              their own.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {rules.map((rule, index) => (
                <Badge key={index} variant="secondary" className="gap-1 pr-1">
                  {rule.label}
                  <button
                    type="button"
                    onClick={() => setRules((current) => current.filter((_, i) => i !== index))}
                    className="rounded p-0.5 hover:text-destructive"
                    aria-label={`Remove ${rule.label}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {rules.length === 0 && (
                <span className="text-[11px] text-muted-foreground italic">
                  No rules — members are added by hand.
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                value=""
                onValueChange={(role) =>
                  addRule({ rule_type: "role", role, label: `Everyone with the ${role} role` })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Add a role…" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value=""
                onValueChange={(serviceId) =>
                  addRule({
                    rule_type: "service",
                    service_id: serviceId,
                    label: services.find((s) => s.id === serviceId)?.title ?? "A service",
                  })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Add a service…" />
                </SelectTrigger>
                <SelectContent>
                  {services.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No services yet
                    </SelectItem>
                  ) : (
                    services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={save}
            disabled={saving || uploading !== null}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            {channel ? "Save changes" : "Create channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ChannelForm;
