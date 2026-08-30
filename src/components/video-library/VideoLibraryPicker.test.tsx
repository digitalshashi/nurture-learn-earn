import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const listLibraryVideos = vi.fn();
vi.mock("@/lib/videoLibrary", async () => {
  const actual = await vi.importActual<typeof import("@/lib/videoLibrary")>("@/lib/videoLibrary");
  return { ...actual, listLibraryVideos: (...a: unknown[]) => listLibraryVideos(...a) };
});

vi.mock("@/lib/cloud-storage", () => ({
  uploadUserFile: vi.fn().mockResolvedValue({ publicUrl: "https://cdn/x.mp4", path: "p" }),
}));

vi.mock("@/lib/videoProbe", () => ({
  probeVideo: vi.fn().mockResolvedValue({ durationSeconds: 60, width: null, height: null }),
}));

import { VideoLibraryPicker } from "./VideoLibraryPicker";

beforeEach(() => {
  listLibraryVideos.mockReset();
  listLibraryVideos.mockResolvedValue([
    {
      id: "user-1/videos/a.mp4",
      key: "user-1/videos/a.mp4",
      name: "intro.mp4",
      folder: "videos",
      publicUrl: "https://cdn/intro.mp4",
      createdAt: new Date().toISOString(),
      size: 5_000_000,
    },
  ]);
});

function renderPicker(onSelect = vi.fn()) {
  render(<VideoLibraryPicker open onOpenChange={() => {}} onSelect={onSelect} />);
  return onSelect;
}

describe("VideoLibraryPicker", () => {
  it("lists the videos already in the library", async () => {
    renderPicker();
    expect(await screen.findByText("intro.mp4")).toBeInTheDocument();
  });

  it("opens the file dialog when Upload new is clicked", async () => {
    // The regression this guards: the button was a <span> rendered through
    // Slot inside a <label>, carrying a `disabled` attribute — clicking it
    // never reached the input, so no file dialog ever opened.
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");
    renderPicker();

    fireEvent.click(await screen.findByRole("button", { name: /upload new/i }));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("hands the chosen video back to the caller", async () => {
    const onSelect = renderPicker();

    fireEvent.click(await screen.findByText("intro.mp4"));
    fireEvent.click(screen.getByRole("button", { name: /use this video/i }));

    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(onSelect.mock.calls[0][0]).toMatchObject({
      name: "intro.mp4",
      publicUrl: "https://cdn/intro.mp4",
    });
  });

  it("cannot confirm before a video is picked", async () => {
    renderPicker();
    await screen.findByText("intro.mp4");
    expect(screen.getByRole("button", { name: /use this video/i })).toBeDisabled();
  });
});
