import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { fetchMessageablePeople, initials, type MessageablePerson } from "@/lib/messaging";

/**
 * Picks someone to start a conversation with.
 *
 * The list comes from messageable_people, which is the same relationship the
 * send policy enforces — so anyone offered here can actually be written to,
 * and nobody is offered who would be refused on send.
 */
export function NewChatDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (person: MessageablePerson) => void;
}) {
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<MessageablePerson[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    // Debounced: this hits the database on every keystroke otherwise.
    const timer = setTimeout(async () => {
      const result = await fetchMessageablePeople(search);
      if (!cancelled) {
        setPeople(result);
        setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, open]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">New message</DialogTitle>
          <DialogDescription className="text-xs">
            Anyone who has enrolled with you or bought from you.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-[50vh] min-h-[12rem] overflow-y-auto border-t border-border">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : people.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              {search
                ? "Nobody matches that."
                : "Nobody to message yet. People appear here once they enrol or buy."}
            </p>
          ) : (
            <ul>
              {people.map((person) => (
                <li key={person.user_id}>
                  <button
                    type="button"
                    onClick={() => onPick(person)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted touch-manipulation"
                  >
                    <Avatar className="h-9 w-9">
                      {person.avatar_url && <AvatarImage src={person.avatar_url} />}
                      <AvatarFallback className="bg-accent/15 text-xs font-semibold text-accent">
                        {initials(person.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {person.full_name || "Member"}
                    </span>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {person.relationship}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewChatDialog;
