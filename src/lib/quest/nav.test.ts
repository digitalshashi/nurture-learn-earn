import { describe, it, expect } from "vitest";
import { QUEST_NAV, QUEST_NAV_ITEMS, isGroup, matchQuestNav } from "./nav";

describe("Quest navigation", () => {
  it("flattens groups into the destination list", () => {
    const groupItems = QUEST_NAV.filter(isGroup).flatMap((g) => g.items).length;
    const flatItems = QUEST_NAV.filter((e) => !isGroup(e)).length;
    expect(QUEST_NAV_ITEMS).toHaveLength(groupItems + flatItems);
  });

  it("gives every destination a route under /quest", () => {
    for (const item of QUEST_NAV_ITEMS) {
      expect(item.to.startsWith("/quest")).toBe(true);
    }
  });

  it("has no duplicate routes", () => {
    const routes = QUEST_NAV_ITEMS.map((i) => i.to);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("leaves the ways through the gate unlocked", () => {
    // Locking the handbook or support would strand somebody with no route out
    // of the gate and nobody to ask about it.
    const open = QUEST_NAV_ITEMS.filter((i) => !i.gated).map((i) => i.to);
    expect(open).toEqual(
      expect.arrayContaining(["/quest", "/quest/handbook", "/quest/support"]),
    );
  });
});

describe("matchQuestNav", () => {
  it("matches the most specific route, not the shortest", () => {
    // Every Quest path starts with /quest, so a naive prefix match would
    // resolve all of them to Home.
    expect(matchQuestNav("/quest/power-tools")?.label).toBe("Power Tools");
    expect(matchQuestNav("/quest")?.label).toBe("Home");
  });

  it("matches a nested path to its section", () => {
    expect(matchQuestNav("/quest/handbook/welcome")?.label).toBe("Handbook");
  });

  it("returns nothing for a path outside the section", () => {
    expect(matchQuestNav("/dashboard")).toBeUndefined();
    // ...including one that merely starts with the same letters.
    expect(matchQuestNav("/questionnaire")).toBeUndefined();
  });
});
