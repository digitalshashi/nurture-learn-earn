import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Channels are where a coach's members talk to each other.
 *
 * Three policies were USING (true): the channel list, the membership list, and
 * every message in every channel. Any account could read all of it, across
 * every academy. That had to close before group features went on top.
 */

const MIGRATIONS = "supabase/migrations";
const fix = readFileSync(join(MIGRATIONS, "20260831040000_channels_as_groups.sql"), "utf8");

describe("a channel is closed by default", () => {
  it("replaces every open read policy", () => {
    expect(fix).toContain('DROP POLICY IF EXISTS "Authenticated can view channels"');
    expect(fix).toContain('DROP POLICY IF EXISTS "Members can view channel members"');
    expect(fix).toContain('DROP POLICY IF EXISTS "Members can view channel messages"');
    expect(fix).toContain("USING (public.can_access_channel(channel_id, auth.uid()))");
  });

  it("stops anyone signed in posting anywhere", () => {
    // The old INSERT policy checked only that you were writing as yourself.
    expect(fix).toContain('DROP POLICY IF EXISTS "Authenticated can send messages"');
    expect(fix).toContain("public.can_post_in_channel(channel_id, auth.uid())");
  });

  it("only lets someone join a channel that is actually open", () => {
    const join = fix.slice(fix.indexOf('CREATE POLICY "Users can join an open channel"'));
    expect(join).toContain("c.visibility = 'open' OR c.is_global");
  });

  it("avoids the recursion that would come from checking membership under RLS", () => {
    // A policy on channel_members calling a function that reads channel_members
    // recurses forever unless the function is SECURITY DEFINER.
    const helper = fix.slice(fix.indexOf("FUNCTION public.can_access_channel"));
    expect(helper).toContain("SECURITY DEFINER");
    expect(helper).toContain("SET search_path = public");
  });
});

describe("membership can be earned, not only granted", () => {
  it("supports a role, a service and a plan", () => {
    expect(fix).toContain("rule_type IN ('role', 'service', 'plan')");
    expect(fix).toContain("public.has_role(viewer, r.role)");
    expect(fix).toContain("FROM public.service_users su");
    expect(fix).toContain("FROM public.coach_subscriptions cs");
  });

  it("stops honouring an entitlement once it lapses", () => {
    const rules = fix.slice(fix.indexOf("r.rule_type = 'service'"));
    expect(rules).toContain("su.status = 'active'");
    expect(rules).toContain("su.expires_at IS NULL OR su.expires_at > now()");
  });

  it("makes a malformed rule impossible to store", () => {
    // One rule, one subject: a row naming both a role and a service would be
    // ambiguous about what it grants.
    expect(fix).toContain("channel_access_rules_shape");
  });
});

describe("a channel has an identity and a shape", () => {
  it("carries a picture, a cover and a topic", () => {
    for (const column of ["avatar_url", "cover_url", "topic"]) {
      expect(fix, column).toContain(column);
    }
  });

  it("is either a group or a broadcast", () => {
    expect(fix).toContain("post_policy IN ('everyone', 'admins')");
  });

  it("leaves existing channels behaving as they did", () => {
    // A migration that silently hid every channel someone already had would
    // be a worse bug than the one it fixed.
    expect(fix).toContain("UPDATE public.channels SET coach_id = created_by WHERE coach_id IS NULL");
    expect(fix).toMatch(/SET visibility = 'open' WHERE is_global/);
  });

  it("is not reopened by a later migration", () => {
    const later = readdirSync(MIGRATIONS)
      .filter((name) => name.endsWith(".sql") && name > "20260831040000")
      .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS, name), "utf8") }));

    for (const { name, sql } of later) {
      const reopened =
        /CREATE POLICY[\s\S]{0,400}?ON public\.(channels|channel_members|channel_messages)[\s\S]{0,300}?USING \(\s*true\s*\)/i;
      expect(sql, `${name} reopens channels`).not.toMatch(reopened);
    }
  });
});

describe("the editor collects what a group needs", () => {
  const form = readFileSync("src/components/channels/ChannelForm.tsx", "utf8");
  const members = readFileSync("src/components/channels/ChannelMembersDialog.tsx", "utf8");

  it("takes a name, a picture and a cover", () => {
    expect(form).toContain("avatar_url");
    expect(form).toContain("cover_url");
    expect(form).toContain("channel-files");
  });

  it("replaces the rules rather than appending to them", () => {
    // Editing twice would otherwise leave the first edit's rules behind,
    // still letting people in.
    expect(form).toContain('.from("channel_access_rules").delete().eq("channel_id", channelId)');
  });

  it("makes the creator an admin of their own channel", () => {
    expect(form).toContain('role: "admin"');
  });

  it("does not search the whole academy on one keystroke", () => {
    expect(members).toContain("query.trim().length < 2");
  });
});
