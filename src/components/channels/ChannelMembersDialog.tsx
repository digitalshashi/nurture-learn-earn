import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Member extends Person {
  memberId: string;
  role: string;
}

const initials = (name: string | null) =>
  (name ?? "Member")
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

/**
 * Who is in this channel, and adding people who are not.
 *
 * Only members added by hand appear here. People who are in because a rule let
 * them in are not listed as rows — there is no row to list, and materialising
 * one would drift the moment their service lapsed.
 */
export function ChannelMembersDialog({
  open,
  onOpenChange,
  channelId,
  canManage,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  channelId: string;
  canManage: boolean;
}) {
  const { toast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: rows } = await supabase
      .from("channel_members")
      .select("id, user_id, role")
      .eq("channel_id", channelId);

    const memberRows = (rows ?? []) as { id: string; user_id: string; role: string }[];

    if (!memberRows.length) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in(
        "id",
        memberRows.map((row) => row.user_id),
      );

    const byId = new Map(((people ?? []) as Person[]).map((person) => [person.id, person]));

    setMembers(
      memberRows.map((row) => ({
        memberId: row.id,
        role: row.role,
        id: row.user_id,
        full_name: byId.get(row.user_id)?.full_name ?? null,
        avatar_url: byId.get(row.user_id)?.avatar_url ?? null,
      })),
    );
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Searching only starts at two characters: one character matches most of the
  // academy and tells nobody anything.
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .ilike("full_name", `%${query.trim()}%`)
        .limit(8);

      if (active) setResults((data ?? []) as Person[]);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const add = async (person: Person) => {
    setBusy(person.id);
    const { error } = await supabase
      .from("channel_members")
      .insert({ channel_id: channelId, user_id: person.id, role: "member" } as never);
    setBusy(null);

    if (error) {
      toast({ title: "Couldn't add", description: error.message, variant: "destructive" });
      return;
    }
    setQuery("");
    setResults([]);
    void load();
  };

  const remove = async (member: Member) => {
    setBusy(member.id);
    const { error } = await supabase.from("channel_members").delete().eq("id", member.memberId);
    setBusy(null);

    if (error) {
      toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
      return;
    }
    void load();
  };

  const toggleAdmin = async (member: Member) => {
    setBusy(member.id);
    const { error } = await supabase
      .from("channel_members")
      .update({ role: member.role === "admin" ? "member" : "admin" } as never)
      .eq("id", member.memberId);
    setBusy(null);

    if (error) {
      toast({ title: "Couldn't change", description: error.message, variant: "destructive" });
      return;
    }
    void load();
  };

  const memberIds = new Set(members.map((member) => member.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Members</DialogTitle>
        </DialogHeader>

        {canManage && (
          <div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find someone to add…"
                className="pl-8"
              />
            </div>

            {results.length > 0 && (
              <div className="mt-2 rounded-lg border divide-y">
                {results.map((person) => (
                  <div key={person.id} className="flex items-center gap-2 p-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={person.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {initials(person.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1 truncate">{person.full_name || "Member"}</span>
                    {memberIds.has(person.id) ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Already in
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => add(person)}
                        disabled={busy === person.id}
                      >
                        {busy === person.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {members.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                Nobody has been added by hand. Anyone matching a rule is still a member.
              </p>
            ) : (
              members.map((member) => (
                <div key={member.memberId} className="flex items-center gap-2 p-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {initials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{member.full_name || "Member"}</p>
                    {member.role === "admin" && (
                      <p className="text-[11px] text-accent flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px]"
                        onClick={() => toggleAdmin(member)}
                        disabled={busy === member.id}
                      >
                        {member.role === "admin" ? "Make member" : "Make admin"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => remove(member)}
                        disabled={busy === member.id}
                        aria-label={`Remove ${member.full_name ?? "member"}`}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ChannelMembersDialog;
