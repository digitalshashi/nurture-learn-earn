import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  Loader2,
  RefreshCw,
  ImageUp,
  Trash2,
  Check,
  ArrowLeft,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuest } from "@/contexts/QuestContext";
import { toast } from "@/hooks/use-toast";
import { convertImageToWebp } from "@/lib/imageEncoding";
import { SOCIAL_PLATFORMS, SOCIALS_REQUIRED_TO_PUBLISH, filledSocials } from "@/lib/quest/socials";
import { profileState } from "@/lib/quest/progress";
import { StatusPill } from "@/components/quest/QuestPrimitives";
import { cn } from "@/lib/utils";

const BUCKET = "quest-media";

/**
 * Step one of the gate: a full page, not a modal.
 *
 * It is long, and a modal that scrolls is a modal that gets abandoned. The
 * save bar sticks to the top instead, so the button is reachable from any
 * point in the form and the live percentage next to it says what saving will
 * be worth.
 */
export default function QuestProfileSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const quest = useQuest();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [designation, setDesignation] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Seeded once from the loaded context. Re-seeding on every context change
  // would wipe whatever the member is halfway through typing.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || quest.loading) return;
    seeded.current = true;

    const parts = quest.displayName.trim().split(/\s+/);
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" "));
    setAvatarUrl(quest.avatarUrl);
    setPhone(quest.questProfile?.phone ?? "");
    setCity(quest.questProfile?.city ?? "");
    setJoinDate(quest.questProfile?.join_date ?? "");
    setDesignation(quest.questProfile?.designation ?? "");
    setCommunityName(quest.questProfile?.community_name ?? "");
    setSocials(
      Object.fromEntries(
        Object.entries(quest.questProfile?.socials ?? {}).map(([k, v]) => [k, String(v ?? "")]),
      ),
    );
  }, [quest.loading, quest.displayName, quest.avatarUrl, quest.questProfile]);

  // The percentage in the save bar reflects the form, not the last save — so
  // it moves while you type rather than only after you commit.
  const live = profileState({
    fullName: `${firstName} ${lastName}`.trim(),
    avatarUrl,
    city,
    designation,
    communityName,
    socials,
  });

  const save = async () => {
    if (!user) return;
    if (!firstName.trim()) {
      toast({ title: "First name is required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const [base, quest_] = await Promise.all([
      supabase.from("profiles").update({ full_name: fullName, avatar_url: avatarUrl }).eq("id", user.id),
      supabase.from("quest_profiles").upsert(
        {
          user_id: user.id,
          phone: phone.trim() || null,
          city: city.trim() || null,
          join_date: joinDate || null,
          designation: designation.trim() || null,
          community_name: communityName.trim() || null,
          // Blank handles are dropped rather than stored as "", so the
          // three-link requirement counts real links only.
          socials: Object.fromEntries(
            Object.entries(socials).filter(([, v]) => v.trim().length > 0).map(([k, v]) => [k, v.trim()]),
          ),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      ),
    ]);

    setSaving(false);

    const error = base.error || quest_.error;
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }

    await quest.refresh();
    toast({ title: "Profile saved" });
    if (live.complete) navigate("/quest");
  };

  /**
   * Membership is read from the billing record, never typed.
   *
   * The earliest paid transaction is the join date, and the total spend
   * decides the tier. Both are facts about what happened rather than claims,
   * which is the whole reason these two fields are read-only on the form.
   */
  const syncMembership = async () => {
    if (!user) return;
    setSyncing(true);

    const { data, error } = await supabase
      .from("transactions")
      .select("amount, occurred_at")
      .eq("user_id", user.id)
      .eq("status", "success")
      .order("occurred_at", { ascending: true });

    if (error) {
      setSyncing(false);
      toast({ title: "Couldn't reach billing", description: error.message, variant: "destructive" });
      return;
    }

    const rows = data ?? [];
    const spend = rows.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const first = rows[0]?.occurred_at?.slice(0, 10) ?? null;
    const level =
      spend >= 200000 ? "Diamond" : spend >= 50000 ? "Gold" : spend >= 10000 ? "Silver" : "Member";

    const { error: writeError } = await supabase.from("quest_profiles").upsert(
      {
        user_id: user.id,
        membership_level: level,
        join_date: first,
        membership_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    setSyncing(false);
    if (writeError) {
      toast({ title: "Couldn't save the sync", description: writeError.message, variant: "destructive" });
      return;
    }

    if (first) setJoinDate(first);
    await quest.refresh();
    toast({
      title: `Synced — ${level}`,
      description: rows.length
        ? `${rows.length} purchase${rows.length === 1 ? "" : "s"} on record.`
        : "No purchases found on this account yet.",
    });
  };

  const uploadPhoto = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "That file is over 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);

    const encoded = await convertImageToWebp(file);
    const name = (encoded.file as File).name || file.name;
    // The first path segment is the uploader's id — the storage policy checks
    // exactly that, so a photo can only ever land in its owner's folder.
    const path = `${user.id}/avatar-${Date.now()}-${name.replace(/[^\w.-]+/g, "_")}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, encoded.file, { upsert: true, contentType: encoded.file.type });

    setUploading(false);
    if (error) {
      toast({ title: "Couldn't upload", description: error.message, variant: "destructive" });
      return;
    }

    setAvatarUrl(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    toast({ title: "Photo ready", description: "Save changes to keep it." });
  };

  const socialCount = filledSocials(socials).length;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Sticky save bar. Sits under the app header, so it never covers it. */}
      <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/quest")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Quest
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden w-32 sm:block">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Profile</span>
                <span className="font-semibold tabular-nums text-accent">{live.percent}%</span>
              </div>
              <Progress value={live.percent} className="mt-1 h-1.5" />
            </div>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </div>
      </div>

      <header className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
          <UserRound className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Make yourself known</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {live.complete
              ? "Everything is filled in — this is what the community sees."
              : `Still missing: ${live.missing.join(", ")}.`}
          </p>
        </div>
      </header>

      <Tabs defaultValue="details">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Profile details</TabsTrigger>
          <TabsTrigger value="media">Media assets</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Section title="Basic information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" required>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Asha" />
              </Field>
              <Field label="Last name">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Rao" />
              </Field>
              <Field label="Email" hint="Email cannot be changed.">
                <Input value={user?.email ?? ""} readOnly disabled />
              </Field>
              <Field label="Phone number">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </Field>
              <Field
                label="City"
                required
                hint="Used to match you with members nearby for in-person meets."
                className="sm:col-span-2"
              >
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Hyderabad" />
              </Field>
            </div>
          </Section>

          <Section
            title="Membership"
            description="Read from your billing record rather than typed — a tier you could type in yourself would mean nothing to anyone reading it."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Join date">
                <Input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
              </Field>
              <Field label="Membership level" hint="Set by your purchase history.">
                <Input value={quest.questProfile?.membership_level ?? "Member"} readOnly disabled />
              </Field>
              <Field label="Achievement level" hint="Assigned by admins.">
                <Input value={quest.questProfile?.achievement_level ?? "Starter"} readOnly disabled />
              </Field>
              <div className="flex flex-col justify-end">
                <Button variant="outline" size="sm" onClick={syncMembership} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                  )}
                  Sync membership
                </Button>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {quest.questProfile?.membership_synced_at
                    ? `Last synced ${new Date(quest.questProfile.membership_synced_at).toLocaleDateString()}.`
                    : "Never synced. Pulls your tier and join date from your purchase history."}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3">
              <StatusPill
                status="achieved"
                label={`${quest.questProfile?.membership_level ?? "Member"} · ${quest.questProfile?.achievement_level ?? "Starter"}`}
              />
              <p className="text-xs text-muted-foreground">
                Your tier comes from what you have bought; your achievement level from what you have done.
              </p>
            </div>
          </Section>

          <Section
            title="Story identity"
            description="This is the byline on everything you publish inside the community."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your designation / title" required hint="How you introduce yourself in one line.">
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Digital coach, business mentor"
                />
              </Field>
              <Field label="Your community name" required hint="What you call the people you serve.">
                <Input
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  placeholder="e.g. Growth Tribe, Freedom Seekers"
                />
              </Field>
            </div>
          </Section>

          <Section title="Social profiles">
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2.5">
              <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Add at least {SOCIALS_REQUIRED_TO_PUBLISH} to publish stories
              </p>
              <span
                className={cn(
                  "ml-auto text-xs font-semibold tabular-nums",
                  socialCount >= SOCIALS_REQUIRED_TO_PUBLISH ? "text-success" : "text-accent",
                )}
              >
                {socialCount}/{SOCIALS_REQUIRED_TO_PUBLISH} required
              </span>
            </div>

            <div className="space-y-2">
              {SOCIAL_PLATFORMS.map((platform) => (
                <div key={platform.key} className="flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                    <platform.icon className="h-4 w-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                    <span className="shrink-0 border-r border-input bg-secondary/60 px-2.5 py-2 text-xs text-muted-foreground">
                      {platform.prefix}
                    </span>
                    <input
                      value={socials[platform.key] ?? ""}
                      onChange={(e) =>
                        setSocials((prev) => ({ ...prev, [platform.key]: e.target.value }))
                      }
                      placeholder={platform.placeholder}
                      aria-label={platform.label}
                      className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-sm outline-none"
                    />
                  </div>
                  {(socials[platform.key] ?? "").trim() && (
                    <Check className="h-4 w-4 shrink-0 text-success" />
                  )}
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <Section
            title="Profile photo"
            description="Used on every story you publish, in the leaderboard and in the member directory. Upload it once."
          >
            <div className="flex flex-wrap items-center gap-5">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="text-lg">
                  {(firstName || quest.displayName).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPhoto(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <ImageUp className="mr-1.5 h-4 w-4" />
                  )}
                  Upload photo
                </Button>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Square works best — around 500×500. Max 5MB.
                </p>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="mt-2 flex items-center gap-1 text-xs text-destructive hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </Section>

          <p className="rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
            Uploading replaces the preview immediately, but nothing is committed to your profile
            until you hit <span className="font-medium text-foreground">Save changes</span>.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-display text-sm font-semibold">{title}</h2>
      {description && <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <div className={description ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
