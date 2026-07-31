import { useState } from "react";
import { Hash, Megaphone, Lock, Plus, Search, ChevronDown, ChevronRight, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Channel {
  id: string;
  name: string;
  channel_type: string;
  is_global: boolean;
  description: string | null;
  unread?: number;
}

interface ChannelSidebarProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (ch: Channel) => void;
  onCreateChannel: (name: string, type: string, description: string) => void;
  isCoachOrAdmin: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function ChannelSidebar({
  channels,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
  isCoachOrAdmin,
  searchQuery,
  onSearchChange,
}: ChannelSidebarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("public");
  const [newDesc, setNewDesc] = useState("");
  const [publicOpen, setPublicOpen] = useState(true);
  const [privateOpen, setPrivateOpen] = useState(true);

  const publicChannels = channels.filter((c) => c.channel_type !== "private");
  const privateChannels = channels.filter((c) => c.channel_type === "private");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateChannel(newName.trim(), newType, newDesc.trim());
    setNewName("");
    setNewType("public");
    setNewDesc("");
    setDialogOpen(false);
  };

  const getIcon = (type: string) => {
    if (type === "announcement") return <Megaphone className="h-4 w-4 shrink-0 text-muted-foreground" />;
    if (type === "private") return <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />;
    return <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />;
  };

  const renderChannelList = (list: Channel[]) =>
    list.map((ch) => (
      <button
        key={ch.id}
        onClick={() => onSelectChannel(ch)}
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors group ${
          selectedChannelId === ch.id
            ? "bg-primary/10 text-foreground font-medium"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        }`}
      >
        {getIcon(ch.channel_type)}
        <span className="truncate flex-1 text-left">{ch.name}</span>
        {ch.unread && ch.unread > 0 ? (
          <span className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold px-1">
            {ch.unread}
          </span>
        ) : null}
      </button>
    ));

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Channels
          </h2>
          {isCoachOrAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Channel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Channel name</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. ai-video-creation"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="What is this channel about?"
                      className="mt-1 min-h-[60px]"
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <span className="flex items-center gap-2"><Hash className="h-3.5 w-3.5" /> Public</span>
                        </SelectItem>
                        <SelectItem value="private">
                          <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Private</span>
                        </SelectItem>
                        <SelectItem value="announcement">
                          <span className="flex items-center gap-2"><Megaphone className="h-3.5 w-3.5" /> Announcement</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleCreate}>
                    Create Channel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search channels..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {/* Public Channels */}
        {publicChannels.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setPublicOpen(!publicOpen)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full hover:text-foreground"
            >
              {publicOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Channels
            </button>
            {publicOpen && <div className="mt-0.5 space-y-0.5">{renderChannelList(publicChannels)}</div>}
          </div>
        )}

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setPrivateOpen(!privateOpen)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full hover:text-foreground"
            >
              {privateOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Private
            </button>
            {privateOpen && <div className="mt-0.5 space-y-0.5">{renderChannelList(privateChannels)}</div>}
          </div>
        )}

        {channels.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No channels yet</p>
        )}
      </ScrollArea>
    </div>
  );
}
