import { describe, it, expect } from "vitest";
import {
  htmlToText,
  isTransactionalTemplate,
  signUnsubscribeToken,
  TRANSACTIONAL_TEMPLATE_KEYS,
  verifyUnsubscribeToken,
} from "../../supabase/functions/_shared/emailHygiene";
import { ALL_TEMPLATES } from "./emailTemplates";

const SECRET = "test-secret";

describe("transactional classification", () => {
  it("only names templates that exist", () => {
    // A typo here is silent and expensive: the key never matches, the receipt
    // is classified as marketing, and it stops being delivered to anyone who
    // ever unsubscribed. "subscription_cancelled" was exactly this mistake.
    const real = new Set(ALL_TEMPLATES.map((t) => t.key));
    const bogus = [...TRANSACTIONAL_TEMPLATE_KEYS].filter((k) => !real.has(k));
    expect(bogus).toEqual([]);
  });

  it("never suppresses money, security or access", () => {
    for (const key of [
      "login_otp",
      "password_reset",
      "payment_receipt",
      "refund_processed",
      "subscription_renewal_reminder",
      "consultation_cancelled",
    ]) {
      expect(isTransactionalTemplate(key)).toBe(true);
    }
  });

  it("treats nudges and digests as suppressible", () => {
    // These are the ones that generate volume, and the ones a person means
    // when they say they want the emails to stop.
    for (const key of [
      "course_reminder",
      "course_progress_digest",
      "abandoned_checkout",
      "badge_earned",
      "streak_milestone",
      "comment_like",
    ]) {
      expect(isTransactionalTemplate(key)).toBe(false);
    }
  });

  it("defaults an unknown template to suppressible", () => {
    expect(isTransactionalTemplate("some_template_added_next_year")).toBe(false);
  });
});

describe("htmlToText", () => {
  it("drops markup the recipient was never meant to read", () => {
    const text = htmlToText(
      `<head><title>x</title></head><style>.a{color:red}</style>` +
        `<!-- hidden --><p>Hello there</p>`,
    );
    expect(text).toBe("Hello there");
    expect(text).not.toContain("color:red");
  });

  it("keeps where a link goes", () => {
    // A text-only reader still has to be able to act on the mail; a bare
    // "Resume course" with no URL is useless to them.
    const text = htmlToText('<a href="https://x.test/go">Resume course</a>');
    expect(text).toBe("Resume course (https://x.test/go)");
  });

  it("keeps a bare url when the link has no label", () => {
    expect(htmlToText('<a href="https://x.test/go"><img src="b.png"></a>')).toBe(
      "https://x.test/go",
    );
  });

  it("does not append a mailto to its own label", () => {
    expect(htmlToText('<a href="mailto:a@b.test">Email us</a>')).toBe("Email us");
  });

  it("collapses the whitespace nested tables leave behind", () => {
    const text = htmlToText(
      `<table><tr><td>   One   </td></tr><tr><td>Two</td></tr></table>`,
    );
    expect(text).toBe("One\nTwo");
  });

  it("decodes entities without re-reading them as markup", () => {
    expect(htmlToText("<p>Tom &amp; Jerry &mdash; &copy; 2026</p>")).toBe(
      "Tom & Jerry — (c) 2026",
    );
    // &amp;lt; must survive as the literal text "&lt;", not become a "<".
    expect(htmlToText("<p>&amp;lt;</p>")).toBe("&lt;");
  });

  it("reduces every real template to something readable", () => {
    // The whole point is that no send is ever HTML-only, so each of the 44
    // stored templates has to survive this with prose a person could act on —
    // not an empty string, and not the CSS from the <style> block.
    for (const template of ALL_TEMPLATES) {
      const text = htmlToText(template.defaultBody);
      expect(text.length, `${template.key} produced no text`).toBeGreaterThan(40);
      expect(text, `${template.key} leaked stylesheet`).not.toContain("!important");
      expect(text, `${template.key} leaked markup`).not.toMatch(/<[a-z]/i);
      // The preheader is a hidden div and legitimately survives, but the
      // layout scaffolding around it must not.
      expect(text, `${template.key} leaked an attribute`).not.toContain("cellpadding");
    }
  });
});

describe("unsubscribe tokens", () => {
  it("round-trips", async () => {
    const token = await signUnsubscribeToken(SECRET, "a@b.test", "coach-1");
    expect(await verifyUnsubscribeToken(SECRET, "a@b.test", "coach-1", token)).toBe(true);
  });

  it("is case- and whitespace-insensitive on the address", async () => {
    // The link is built from a stored address and clicked back with whatever
    // the mail client did to it.
    const token = await signUnsubscribeToken(SECRET, "a@b.test", null);
    expect(await verifyUnsubscribeToken(SECRET, "  A@B.TEST ", null, token)).toBe(true);
  });

  it("rejects a token minted for someone else", async () => {
    const token = await signUnsubscribeToken(SECRET, "a@b.test", "coach-1");
    expect(await verifyUnsubscribeToken(SECRET, "victim@b.test", "coach-1", token)).toBe(false);
  });

  it("rejects a token from another workspace", async () => {
    // Otherwise one tenant's link would unsubscribe a shared learner from
    // every other tenant on the platform.
    const token = await signUnsubscribeToken(SECRET, "a@b.test", "coach-1");
    expect(await verifyUnsubscribeToken(SECRET, "a@b.test", "coach-2", token)).toBe(false);
    expect(await verifyUnsubscribeToken(SECRET, "a@b.test", null, token)).toBe(false);
  });

  it("cannot be forged without the secret", async () => {
    const token = await signUnsubscribeToken("other-secret", "a@b.test", null);
    expect(await verifyUnsubscribeToken(SECRET, "a@b.test", null, token)).toBe(false);
  });

  it("refuses to verify anything when no secret is configured", async () => {
    // A missing env var must fail closed, not accept every empty token.
    expect(await signUnsubscribeToken("", "a@b.test", null)).toBe("");
    expect(await verifyUnsubscribeToken("", "a@b.test", null, "")).toBe(false);
  });

  it("does not collide across the email/coach boundary", async () => {
    const a = await signUnsubscribeToken(SECRET, "a@b.test", "c");
    const b = await signUnsubscribeToken(SECRET, "a@b.tes", "tc");
    expect(a).not.toBe(b);
  });
});
