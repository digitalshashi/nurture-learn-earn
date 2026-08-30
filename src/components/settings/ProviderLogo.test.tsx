import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProviderLogo } from "./ProviderLogo";
import { AI_PROVIDERS, AI_PROVIDER_IDS } from "@/lib/aiProviders";

describe("ProviderLogo", () => {
  it("draws a mark for every provider in the registry", () => {
    // A provider added without a mark would render an empty badge, which is
    // worse than no badge at all.
    for (const id of AI_PROVIDER_IDS) {
      const { container, unmount } = render(<ProviderLogo provider={id} />);
      expect(container.querySelector("svg"), id).not.toBeNull();
      unmount();
    }
  });

  it("tints the badge with the provider's own brand colour", () => {
    const { container } = render(<ProviderLogo provider="deepseek" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.style.color).toBeTruthy();
    // The tint is the mark's colour at low opacity, so one value drives both
    // and the badge cannot end up a different hue from the logo.
    expect(container.querySelector(".bg-current")).not.toBeNull();
  });

  it("stays neutral for the custom provider, which has no brand", () => {
    expect(AI_PROVIDERS.custom.accent).toBeUndefined();
    const { container } = render(<ProviderLogo provider="custom" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.style.color).toBe("");
    expect(badge.className).toContain("text-muted-foreground");
  });

  it("is decorative, so screen readers read the provider name instead", () => {
    const { container } = render(<ProviderLogo provider="openai" />);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });
});
