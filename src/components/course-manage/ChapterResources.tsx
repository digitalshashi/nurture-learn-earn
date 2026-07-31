import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, FileText, Link, File, Image, FileSpreadsheet, Loader2 } from "lucide-react";

export interface Resource {
  name: string;
  url: string;
  type: string; // pdf, doc, excel, image, link, other
  size?: string;
}

const typeIcons: Record<string, any> = {
  pdf: File,
  doc: FileText,
  excel: FileSpreadsheet,
  image: Image,
  link: Link,
  other: File,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function ChapterResources({
  resources,
  onChange,
}: {
  resources: Resource[];
  onChange: (resources: Resource[]) => void;
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    try {
      const newResources = [...resources];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("course-resources").upload(filePath, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("course-resources").getPublicUrl(filePath);
        
        let type = "other";
        if (ext === "pdf") type = "pdf";
        else if (["doc", "docx"].includes(ext)) type = "doc";
        else if (["xls", "xlsx", "csv"].includes(ext)) type = "excel";
        else if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) type = "image";

        newResources.push({
          name: file.name,
          url: urlData.publicUrl,
          type,
          size: formatFileSize(file.size),
        });
      }
      onChange(newResources);
    } catch (err: any) {
      console.error("Upload error:", err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const addLink = () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    onChange([...resources, { name: linkName.trim(), url, type: "link" }]);
    setLinkName("");
    setLinkUrl("");
    setShowLinkForm(false);
  };

  const removeResource = (idx: number) => {
    onChange(resources.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
        <FileText className="h-3.5 w-3.5" /> Resources ({resources.length})
      </div>

      {resources.map((res, idx) => {
        const Icon = typeIcons[res.type] || File;
        return (
          <div key={idx} className="flex items-center gap-2 p-2 rounded border border-border bg-secondary/20">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{res.name}</p>
              <p className="text-[10px] text-muted-foreground">{res.type.toUpperCase()} {res.size ? `• ${res.size}` : ""}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeResource(idx)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      })}

      {showLinkForm && (
        <div className="flex items-end gap-2 p-2 rounded border border-border bg-secondary/20">
          <div className="flex-1 space-y-1">
            <Input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Link name" className="h-7 text-xs" />
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="h-7 text-xs" />
          </div>
          <Button size="sm" className="h-7 text-xs bg-accent text-accent-foreground" onClick={addLink}>Add</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowLinkForm(false)}>Cancel</Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs relative" disabled={uploading}>
          {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
          {uploading ? "Uploading..." : "Upload File"}
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip,.rar,.pptx,.ppt,.txt,.mp3,.mp4"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowLinkForm(true)}>
          <Link className="h-3 w-3 mr-1" /> Add Link
        </Button>
      </div>
    </div>
  );
}
