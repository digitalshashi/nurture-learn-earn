import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Smile, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const QUICK_EMOJIS = ["😀", "😂", "❤️", "👍", "🔥", "🎉", "🙏", "💯", "✅", "👀", "🚀", "💪"];

interface MessageInputProps {
  channelId: string;
  userId: string;
  parentId?: string | null;
  placeholder?: string;
  onSent?: () => void;
}

export function MessageInput({ channelId, userId, parentId, placeholder, onSent }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const send = async () => {
    if ((!content.trim() && !file) || sending) return;
    setSending(true);

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;

    if (file) {
      try {
        const { uploadUserFile } = await import("@/lib/cloud-storage");
        const result = await uploadUserFile(userId, "channels", file, {
          fileName: `${channelId}-${file.name}`,
        });
        fileUrl = result.publicUrl;
        fileName = file.name;
        fileType = file.type;
      } catch (err) {
        console.error("Channel file upload failed", err);
      }
    }

    await supabase.from("channel_messages").insert({
      channel_id: channelId,
      user_id: userId,
      content: content.trim(),
      parent_id: parentId || null,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
    });

    setContent("");
    setFile(null);
    setSending(false);
    onSent?.();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t border-border bg-card p-3">
      {/* File preview */}
      {file && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-secondary/50 rounded-md text-sm">
          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate flex-1">{file.name}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileRef}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top">
            <div className="grid grid-cols-6 gap-1">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setContent((prev) => prev + e)}
                  className="text-lg hover:scale-125 transition-transform p-1"
                >
                  {e}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type a message... (Shift+Enter for new line)"}
          className="min-h-[40px] max-h-[120px] text-sm resize-none flex-1"
          rows={1}
        />

        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={send}
          disabled={sending || (!content.trim() && !file)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
