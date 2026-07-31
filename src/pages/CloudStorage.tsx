import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Upload, Search, Trash2, FileText, Image, Film, Music, File, HardDrive, Filter,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { deleteFromCloud, getCloudConfig, uploadUserFile } from "@/lib/cloud-storage";

interface CloudFile {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  created_at: string;
  last_restored_at: string | null;
}

const FILE_TYPE_ICONS: Record<string, any> = {
  image: Image,
  video: Film,
  audio: Music,
  document: FileText,
  pdf: FileText,
};

const STORAGE_LIMIT_GB = 20;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  return "document";
}

export default function CloudStorage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [totalSize, setTotalSize] = useState(0);
  const [storageInfo, setStorageInfo] = useState<{
    provider: string;
    bucket: string;
    publicUrl: string;
    configured: boolean;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadFiles();
      getCloudConfig()
        .then(setStorageInfo)
        .catch(() =>
          setStorageInfo({ provider: "r2", bucket: "1corehub", publicUrl: "", configured: false }),
        );
    }
  }, [user]);

  const loadFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cloud_files")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) {
      const cloudFiles = data as CloudFile[];
      setFiles(cloudFiles);
      setTotalSize(cloudFiles.reduce((sum, f) => sum + (f.file_size || 0), 0));
    }
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);

    for (const file of Array.from(selectedFiles)) {
      try {
        const result = await uploadUserFile(user!.id, "cloud", file);

        await supabase.from("cloud_files").insert({
          user_id: user!.id,
          file_name: file.name,
          file_url: result.publicUrl,
          file_size: file.size,
          file_type: getFileCategory(file.type),
          mime_type: file.type,
        } as any);
      } catch (error: any) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      }
    }

    toast({ title: "Upload complete" });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadFiles();
  };

  const deleteFile = async (file: CloudFile) => {
    try {
      await deleteFromCloud(file.file_url);
    } catch {
      // Still remove DB row if object is already gone
    }
    const { error } = await supabase.from("cloud_files").delete().eq("id", file.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "File deleted" });
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setTotalSize((prev) => prev - (file.file_size || 0));
    }
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || f.file_type === filterType;
    return matchesSearch && matchesType;
  });

  const usedGB = totalSize / (1024 * 1024 * 1024);
  const usagePercent = Math.min((usedGB / STORAGE_LIMIT_GB) * 100, 100);

  const getFileIcon = (type: string) => {
    const Icon = FILE_TYPE_ICONS[type] || File;
    return <Icon className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold font-display">Cloud Storage</h1>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Upload Files
            </Button>
          </div>
        </div>

        {/* Bucket status */}
        {storageInfo && (
          <Card className={`card-shadow mb-4 ${storageInfo.configured ? "border-success/30" : "border-destructive/30"}`}>
            <CardContent className="pt-4 pb-3 flex flex-wrap items-center gap-3 text-sm">
              <HardDrive className={`h-4 w-4 ${storageInfo.configured ? "text-success" : "text-destructive"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {storageInfo.configured ? "Cloud bucket connected" : "Cloud bucket not configured"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {storageInfo.provider.toUpperCase()} · bucket <span className="font-mono">{storageInfo.bucket || "1corehub"}</span>
                  {storageInfo.publicUrl ? ` · ${storageInfo.publicUrl}` : " · set STORAGE_* secrets"}
                </p>
              </div>
              <Badge variant={storageInfo.configured ? "default" : "destructive"} className="text-[10px]">
                {storageInfo.configured ? "Ready" : "Setup needed"}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Storage Usage */}
        <Card className="card-shadow mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <HardDrive className="h-5 w-5 text-accent" />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">Storage Used</span>
                  <span className="text-muted-foreground">
                    {usedGB.toFixed(2)} GB of {STORAGE_LIMIT_GB} GB
                  </span>
                </div>
                <Progress value={usagePercent} className="h-2" />
              </div>
            </div>
            <div className="flex gap-4 text-[10px] text-muted-foreground">
              <span>{files.filter((f) => f.file_type === "video").length} Videos</span>
              <span>{files.filter((f) => f.file_type === "image").length} Images</span>
              <span>{files.filter((f) => f.file_type === "pdf" || f.file_type === "document").length} Documents</span>
              <span>{files.filter((f) => f.file_type === "audio").length} Audio</span>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="pdf">PDFs</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Files Table */}
        <Card className="card-shadow">
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <HardDrive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {files.length === 0 ? "No files uploaded yet." : "No files match your search."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>File Size</TableHead>
                    <TableHead>Created On</TableHead>
                    <TableHead>Last Restored</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.file_type)}
                          <span className="text-xs font-medium truncate max-w-[200px]">{file.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] capitalize">{file.file_type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatFileSize(file.file_size)}</TableCell>
                      <TableCell className="text-xs">{format(new Date(file.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {file.last_restored_at ? format(new Date(file.last_restored_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => deleteFile(file)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
