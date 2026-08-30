/**
 * Information tab — everything about the course that is not its lessons.
 *
 * The artwork used to be one field written into two columns, so "cover image"
 * and "thumbnail" were the same picture and the landing page had no backdrop
 * of its own. They are separate here: the thumbnail is the 16:9 card art, the
 * cover is the wide background behind the course player's landing page, and
 * the preview at the top shows both doing their real jobs.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AiWriteButton } from "@/components/ai/AiWriteButton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, Info, Loader2, Play, Save, Trash2, Upload } from "lucide-react";

interface Props {
  courseId: string;
  course: any;
  onUpdate: () => void;
}

type ArtworkField = "thumbnail_url" | "cover_image_url" | "default_video_thumbnail_url";

export default function InformationTab({ courseId, course, onUpdate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState(course.title || "");
  const [description, setDescription] = useState(course.description || "");
  const [price, setPrice] = useState(String(course.price || 0));
  const [category, setCategory] = useState(course.category || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || "");
  const [coverImageUrl, setCoverImageUrl] = useState(course.cover_image_url || "");
  const [defaultThumbnailUrl, setDefaultThumbnailUrl] = useState(course.default_video_thumbnail_url || "");
  const [accessDays, setAccessDays] = useState(String(course.access_duration_days || ""));
  const [showAsLocked, setShowAsLocked] = useState(course.show_as_locked || false);
  const [enableDrm, setEnableDrm] = useState(course.enable_drm || false);
  const [disableQna, setDisableQna] = useState(course.disable_qna || false);
  const [disableComments, setDisableComments] = useState(course.disable_comments || false);
  const [accessLevel, setAccessLevel] = useState(course.access_level || "free");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<ArtworkField | null>(null);

  // A save elsewhere in the editor (or an upload here) refreshes `course`;
  // the fields the coach has not touched should follow it.
  useEffect(() => {
    setThumbnailUrl(course.thumbnail_url || "");
    setCoverImageUrl(course.cover_image_url || "");
    setDefaultThumbnailUrl(course.default_video_thumbnail_url || "");
  }, [course.thumbnail_url, course.cover_image_url, course.default_video_thumbnail_url]);

  /**
   * Artwork is written the moment it is picked rather than waiting for Save:
   * an upload has already happened by then, and leaving the row unwritten is
   * how a coach ends up with an orphaned file and an unchanged page.
   */
  const uploadArtwork = async (file: File, folder: string, column: ArtworkField, apply: (url: string) => void) => {
    if (!user) return;
    setUploading(column);
    try {
      const { uploadUserFile } = await import("@/lib/cloud-storage");
      const result = await uploadUserFile(user.id, folder, file);
      apply(result.publicUrl);
      const { error } = await supabase
        .from("courses")
        .update({ [column]: result.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", courseId);
      if (error) throw error;
      toast({ title: "Image saved", description: "It is live on the course straight away." });
      onUpdate();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const clearArtwork = async (column: ArtworkField, apply: (url: string) => void) => {
    apply("");
    const { error } = await supabase
      .from("courses")
      .update({ [column]: null, updated_at: new Date().toISOString() })
      .eq("id", courseId);
    if (error) {
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
      return;
    }
    onUpdate();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "A course needs a title", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .update({
          title: title.trim(),
          description,
          price: parseFloat(price) || 0,
          category,
          thumbnail_url: thumbnailUrl || null,
          cover_image_url: coverImageUrl || null,
          default_video_thumbnail_url: defaultThumbnailUrl || null,
          access_duration_days: accessDays ? parseInt(accessDays) : null,
          show_as_locked: showAsLocked,
          enable_drm: enableDrm,
          disable_qna: disableQna,
          disable_comments: disableComments,
          access_level: accessLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", courseId)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Nothing was written — you may not have permission to edit this course.");
      }
      toast({ title: "Saved", description: "Course information updated" });
      onUpdate();
    } catch (err: any) {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const backdrop = coverImageUrl || thumbnailUrl;

  return (
    <div className="max-w-4xl pb-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2 rounded-lg bg-info/10 p-3 text-sm text-info">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            The thumbnail is what people see in the catalogue. The cover photo is the wide background behind
            your course&rsquo;s landing page.
          </span>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>

      {/* Live preview of the landing page hero */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-border">
        <div className="relative isolate">
          <div className="absolute inset-0 -z-10">
            {backdrop ? (
              <img src={backdrop} alt="" aria-hidden className="h-full w-full scale-110 object-cover blur-2xl" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-secondary to-muted" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/50" />
          </div>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
            <div className="aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-xl sm:w-52">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Course landing page preview
              </p>
              <h3 className="mt-1 truncate text-2xl font-extrabold tracking-tight">
                {title || "Your course title"}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {description || "Your description shows here."}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background">
                <Play className="h-3.5 w-3.5 fill-current" /> Start course
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="font-medium">Title*</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <Label className="font-medium">Description*</Label>
            <AiWriteButton
              task="the description for an online course sales page"
              label="Write it"
              context={{ "Course title": title, Category: category, "Price (INR)": price }}
              fields={[
                {
                  key: "description",
                  hint:
                    "Two short paragraphs: who the course is for and what they will be able " +
                    "to do afterwards. Plain text, no headings.",
                },
              ]}
              onResult={(r) => r.description && setDescription(r.description)}
            />
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description here..."
            className="mt-1 min-h-[100px]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="font-medium">Price (₹)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="font-medium">Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Business, Tech"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="font-medium">Access level</Label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold">Artwork</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Three images, three jobs. Uploads save immediately.
          </p>

          <div className="mt-4 space-y-4">
            <ArtworkPicker
              title="Course thumbnail"
              blurb="The 16:9 card art in the catalogue and on the landing page poster."
              recommendation="1280×720px (16:9)"
              aspect="aspect-video"
              value={thumbnailUrl}
              busy={uploading === "thumbnail_url"}
              onPick={(file) => uploadArtwork(file, "covers", "thumbnail_url", setThumbnailUrl)}
              onUrlChange={setThumbnailUrl}
              onClear={() => clearArtwork("thumbnail_url", setThumbnailUrl)}
            />

            <ArtworkPicker
              title="Cover photo (landing page background)"
              blurb="The wide background behind the course player's landing page. Falls back to the thumbnail when empty."
              recommendation="2560×1440px, keep the subject centred"
              aspect="aspect-[21/9]"
              value={coverImageUrl}
              busy={uploading === "cover_image_url"}
              onPick={(file) => uploadArtwork(file, "covers", "cover_image_url", setCoverImageUrl)}
              onUrlChange={setCoverImageUrl}
              onClear={() => clearArtwork("cover_image_url", setCoverImageUrl)}
              extraAction={
                thumbnailUrl && thumbnailUrl !== coverImageUrl
                  ? { label: "Use the thumbnail", run: () => setCoverImageUrl(thumbnailUrl) }
                  : undefined
              }
            />

            <ArtworkPicker
              title="Default video thumbnail"
              blurb="Used for any lesson that has no image of its own, so the player never shows a black frame."
              recommendation="1280×720px (16:9)"
              aspect="aspect-video"
              value={defaultThumbnailUrl}
              busy={uploading === "default_video_thumbnail_url"}
              onPick={(file) =>
                uploadArtwork(file, "thumbnails", "default_video_thumbnail_url", setDefaultThumbnailUrl)
              }
              onUrlChange={setDefaultThumbnailUrl}
              onClear={() => clearArtwork("default_video_thumbnail_url", setDefaultThumbnailUrl)}
            />
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-4 font-semibold">Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Validity</p>
                <p className="text-xs text-muted-foreground">
                  How long a customer keeps access after enrolling. Leave blank for lifetime.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Input
                  type="number"
                  value={accessDays}
                  onChange={(e) => setAccessDays(e.target.value)}
                  placeholder="∞"
                  className="h-8 w-20 text-sm"
                />
                <span className="text-xs text-muted-foreground">days</span>
              </div>
            </div>

            {[
              {
                label: "Show as locked",
                hint: "Show this course as locked to customers of other services.",
                value: showAsLocked,
                set: setShowAsLocked,
              },
              {
                label: "Enable DRM",
                hint: "Restrict customers from downloading or sharing the course content.",
                value: enableDrm,
                set: setEnableDrm,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.hint}</p>
                </div>
                <Switch checked={row.value} onCheckedChange={row.set} />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="mb-4 font-semibold">Engagement</h3>
          <div className="space-y-3">
            {[
              {
                label: "Disable QnA",
                hint: "Customers won't be able to ask questions on your course.",
                value: disableQna,
                set: setDisableQna,
              },
              {
                label: "Disable comments",
                hint: "Customers won't be able to comment on your lessons.",
                value: disableComments,
                set: setDisableComments,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.hint}</p>
                </div>
                <Switch checked={row.value} onCheckedChange={row.set} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ArtworkPickerProps {
  title: string;
  blurb: string;
  recommendation: string;
  /** Tailwind aspect class, so each slot previews at the shape it will be used at. */
  aspect: string;
  value: string;
  busy: boolean;
  onPick: (file: File) => void;
  onUrlChange: (url: string) => void;
  onClear: () => void;
  extraAction?: { label: string; run: () => void };
}

function ArtworkPicker({
  title,
  blurb,
  recommendation,
  aspect,
  value,
  busy,
  onPick,
  onUrlChange,
  onClear,
  extraAction,
}: ArtworkPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    onPick(file);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            take(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "relative w-full shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-dashed bg-muted transition-colors sm:w-64",
            aspect,
            dragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50",
          )}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <Upload className="h-6 w-6 opacity-50" />
              <span className="text-[11px]">Click or drop an image</span>
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{blurb}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Recommended: <strong>{recommendation}</strong> · JPG, PNG, WEBP or GIF
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Upload className="mr-1 h-3 w-3" /> {value ? "Replace" : "Upload"}
            </Button>
            {extraAction && (
              <Button type="button" variant="ghost" size="sm" onClick={extraAction.run}>
                {extraAction.label}
              </Button>
            )}
            {value && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onClear}>
                <Trash2 className="mr-1 h-3 w-3" /> Remove
              </Button>
            )}
          </div>
          <Input
            value={value}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="…or paste an image URL"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.avif"
        className="hidden"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
