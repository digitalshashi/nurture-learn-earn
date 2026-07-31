import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, Upload, Info, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  courseId: string;
  course: any;
  onUpdate: () => void;
}

export default function InformationTab({ courseId, course, onUpdate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState(course.title || "");
  const [description, setDescription] = useState(course.description || "");
  const [price, setPrice] = useState(String(course.price || 0));
  const [category, setCategory] = useState(course.category || "");
  const [coverImageUrl, setCoverImageUrl] = useState(course.cover_image_url || course.thumbnail_url || "");
  const [defaultThumbnailUrl, setDefaultThumbnailUrl] = useState(course.default_video_thumbnail_url || "");
  const [accessDays, setAccessDays] = useState(String(course.access_duration_days || ""));
  const [showAsLocked, setShowAsLocked] = useState(course.show_as_locked || false);
  const [enableDrm, setEnableDrm] = useState(course.enable_drm || false);
  const [disableQna, setDisableQna] = useState(course.disable_qna || false);
  const [disableComments, setDisableComments] = useState(course.disable_comments || false);
  const [saving, setSaving] = useState(false);
  const [accessLevel, setAccessLevel] = useState(course.access_level || "free");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (
    file: File,
    folder: string,
    dbColumns: string[],
    setUploading: (v: boolean) => void,
    onDone: (url: string) => void,
  ) => {
    if (!user) return;
    setUploading(true);
    try {
      const { uploadUserFile } = await import("@/lib/cloud-storage");
      const result = await uploadUserFile(user.id, folder, file);
      onDone(result.publicUrl);
      const patch: Record<string, string> = { updated_at: new Date().toISOString() };
      dbColumns.forEach((col) => { patch[col] = result.publicUrl; });
      const { error } = await supabase.from("courses").update(patch).eq("id", courseId);
      if (error) throw error;
      toast({ title: "Uploaded", description: "Image saved" });
      onUpdate();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("courses").update({
        title, description, price: parseFloat(price), category,
        thumbnail_url: coverImageUrl || null,
        cover_image_url: coverImageUrl || null,
        default_video_thumbnail_url: defaultThumbnailUrl || null,
        access_duration_days: accessDays ? parseInt(accessDays) : null,
        show_as_locked: showAsLocked,
        enable_drm: enableDrm,
        disable_qna: disableQna,
        disable_comments: disableComments,
        access_level: accessLevel,
        updated_at: new Date().toISOString(),
      }).eq("id", courseId);
      if (error) throw error;
      toast({ title: "Saved!", description: "Course information updated" });
      onUpdate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Set-up your course</h2>
          <div className="flex items-center gap-2 mt-2 p-3 bg-info/10 rounded-lg text-sm text-info">
            <Info className="h-4 w-4 shrink-0" />
            Set-up your course with a user-friendly title, a brief description and an appealing cover image. Let's GO!
          </div>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="font-medium">Title*</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>

        <div>
          <Label className="font-medium">Description*</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a description here..." className="mt-1 min-h-[100px]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="font-medium">Price (₹)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="font-medium">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Business, Tech" className="mt-1" />
          </div>
        </div>

        <div>
          <Label className="font-medium">Course Access Level</Label>
          <p className="text-xs text-muted-foreground mb-2">Choose which service tier can access this course.</p>
          <Select value={accessLevel} onValueChange={setAccessLevel}>
            <SelectTrigger className="w-[200px]">
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

        {/* Cover Image */}
        <div>
          <Label className="font-medium">Cover image*</Label>
          <div className="mt-2 flex gap-4 items-start">
            <div
              className="w-64 aspect-video bg-muted rounded-lg flex items-center justify-center border border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => coverRef.current?.click()}
            >
              {coverImageUrl ? (
                <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground text-sm p-4">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Upload cover image here.</p>
              <p>Recommended size: <strong>1920×1080px (16:9)</strong> (.jpg, .jpeg, .gif, or .png).</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingCover}
                onClick={() => coverRef.current?.click()}
              >
                {uploadingCover ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...</> : <><Upload className="h-3 w-3 mr-1" /> Upload Image</>}
              </Button>
              <Input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="Image URL" className="mt-1" />
            </div>
            <input
              ref={coverRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, "covers", ["thumbnail_url", "cover_image_url"], setUploadingCover, setCoverImageUrl);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Default Video Thumbnail */}
        <div>
          <Label className="font-medium">Default video thumbnail</Label>
          <div className="mt-2 flex gap-4 items-start">
            <div
              className="w-64 aspect-video bg-muted rounded-lg flex items-center justify-center border border-border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => thumbRef.current?.click()}
            >
              {defaultThumbnailUrl ? (
                <img src={defaultThumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground text-sm p-4">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Upload your default video chapter thumbnail image here.</p>
              <p>Recommended size: <strong>1920×1080px (16:9)</strong> (.jpg, .jpeg, .gif, or .png).</p>
              <p className="text-xs italic text-accent">This image will be used as the default thumbnail for all future video chapters.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingThumb}
                onClick={() => thumbRef.current?.click()}
              >
                {uploadingThumb ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...</> : <><Upload className="h-3 w-3 mr-1" /> Upload Image</>}
              </Button>
              <Input value={defaultThumbnailUrl} onChange={(e) => setDefaultThumbnailUrl(e.target.value)} placeholder="Thumbnail URL" className="mt-1" />
            </div>
            <input
              ref={thumbRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, "thumbnails", ["default_video_thumbnail_url"], setUploadingThumb, setDefaultThumbnailUrl);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <Separator />

        {/* Settings */}
        <div>
          <h3 className="font-semibold mb-4">Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium text-sm">Validity</p>
                <p className="text-xs text-muted-foreground">Select how long your customers can view your course.</p>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" value={accessDays} 
                  onChange={(e) => setAccessDays(e.target.value)} 
                  placeholder="Days" className="w-20 h-8 text-sm" 
                />
                <span className="text-xs text-muted-foreground">days</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium text-sm">Show as locked</p>
                <p className="text-xs text-muted-foreground">Show this course as locked to customers of other services.</p>
              </div>
              <Switch checked={showAsLocked} onCheckedChange={setShowAsLocked} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium text-sm">Enable DRM</p>
                <p className="text-xs text-muted-foreground">Enabling this will restrict your customers from downloading or sharing the course content.</p>
              </div>
              <Switch checked={enableDrm} onCheckedChange={setEnableDrm} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Engagement */}
        <div>
          <h3 className="font-semibold mb-4">Engagement</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium text-sm">Disable QnA</p>
                <p className="text-xs text-muted-foreground">Your customers won't be able to ask questions on your course.</p>
              </div>
              <Switch checked={disableQna} onCheckedChange={setDisableQna} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="font-medium text-sm">Disable comments</p>
                <p className="text-xs text-muted-foreground">Your customers won't be able to comment on your course.</p>
              </div>
              <Switch checked={disableComments} onCheckedChange={setDisableComments} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
