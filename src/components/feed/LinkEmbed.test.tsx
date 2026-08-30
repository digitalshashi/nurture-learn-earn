import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LinkEmbed } from "./LinkEmbed";
import { PostVideo } from "./PostVideo";
import { parseEmbed } from "@/lib/link-embed";

const R2_MP4 = "https://cdn.1corehub.com/user-1/feed/clip.mp4";
const R2_IMAGE = "https://cdn.1corehub.com/user-1/feed/photo.webp";

describe("feed media", () => {
  it("plays an uploaded video instead of showing its R2 link", () => {
    const { container } = render(<LinkEmbed embed={parseEmbed(R2_MP4)!} />);

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("src", R2_MP4);
    expect(video).toHaveAttribute("controls");
    // The old behaviour: a card whose only content was the raw link.
    expect(screen.queryByText(R2_MP4)).toBeNull();
  });

  it("falls back to a link when the browser cannot play the file", () => {
    const { container } = render(<PostVideo url={R2_MP4} />);
    fireEvent.error(container.querySelector("video")!);

    expect(screen.getByRole("link")).toHaveAttribute("href", R2_MP4);
  });

  it("opens an image full size in the app rather than a new tab", () => {
    render(<LinkEmbed embed={parseEmbed(R2_IMAGE)!} />);

    fireEvent.click(screen.getByRole("button", { name: /open image full size/i }));

    const full = screen.getByRole("dialog").querySelector("img");
    expect(full).toHaveAttribute("src", R2_IMAGE);
  });

  it("still embeds a YouTube link in an iframe", () => {
    const { container } = render(<LinkEmbed embed={parseEmbed("https://youtu.be/dQw4w9WgXcQ")!} lazy={false} />);
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain("youtube.com/embed/dQw4w9WgXcQ");
  });
});
