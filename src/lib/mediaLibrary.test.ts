import { describe, it, expect } from "vitest";
import {
  breadcrumbsFor,
  folderLabel,
  folderNameError,
  joinLibraryPath,
  mediaKindOf,
  parseListing,
  pathOfKey,
  storagePrefix,
} from "./mediaLibrary";

const USER = "user-123";

describe("mediaKindOf", () => {
  it("sorts the formats the app actually stores", () => {
    expect(mediaKindOf("lesson.mp4")).toBe("video");
    expect(mediaKindOf("cover.webp")).toBe("image");
    expect(mediaKindOf("intro.mp3")).toBe("audio");
    expect(mediaKindOf("workbook.pdf")).toBe("document");
  });

  it("is case-insensitive, since phones produce .MP4 and .MOV", () => {
    expect(mediaKindOf("CLIP.MOV")).toBe("video");
    expect(mediaKindOf("PHOTO.JPEG")).toBe("image");
  });

  it("classifies an unknown extension rather than guessing", () => {
    expect(mediaKindOf("archive.psd")).toBe("other");
    expect(mediaKindOf("noextension")).toBe("other");
  });

  it("treats a dotfile as having no extension", () => {
    // ".keep" must not read as a file of type "keep".
    expect(mediaKindOf(".keep")).toBe("other");
  });
});

describe("folderNameError", () => {
  it("accepts the names a creator would actually type", () => {
    for (const name of ["Module 1", "Week 2 — recordings", "Onboarding"]) {
      expect(folderNameError(name)).toBeNull();
    }
  });

  it("rejects a slash, which would silently nest a folder", () => {
    expect(folderNameError("Module 1/Week 2")).toMatch(/slash/i);
    expect(folderNameError("Module 1\\Week 2")).toMatch(/slash/i);
  });

  it("rejects a leading dot so a folder cannot masquerade as the marker", () => {
    expect(folderNameError(".keep")).toBeTruthy();
  });

  it("rejects the empty name and traversal", () => {
    expect(folderNameError("   ")).toBeTruthy();
    expect(folderNameError("..")).toBeTruthy();
  });
});

describe("joinLibraryPath and storagePrefix", () => {
  it("drops the empty segments the root produces", () => {
    expect(joinLibraryPath("", "videos")).toBe("videos");
    expect(joinLibraryPath("videos", "")).toBe("videos");
    expect(joinLibraryPath("Module 1", "Week 2")).toBe("Module 1/Week 2");
  });

  it("always ends a prefix with a slash, root included", () => {
    expect(storagePrefix(USER, "")).toBe("user-123/");
    expect(storagePrefix(USER, "videos")).toBe("user-123/videos/");
  });
});

describe("breadcrumbsFor", () => {
  it("starts at the library root", () => {
    expect(breadcrumbsFor("")).toEqual([{ label: "All media", path: "" }]);
  });

  it("names the app's own top-level folders", () => {
    expect(breadcrumbsFor("recordings")).toEqual([
      { label: "All media", path: "" },
      { label: "Recordings", path: "recordings" },
    ]);
  });

  it("leaves a creator's own folder names alone at every depth", () => {
    expect(breadcrumbsFor("recordings/Module 1")).toEqual([
      { label: "All media", path: "" },
      { label: "Recordings", path: "recordings" },
      { label: "Module 1", path: "recordings/Module 1" },
    ]);
  });
});

describe("folderLabel", () => {
  it("renames only the folders the app writes to itself", () => {
    expect(folderLabel("videos")).toBe("Video uploads");
    expect(folderLabel("Module 1")).toBe("Module 1");
  });
});

describe("pathOfKey", () => {
  it("strips the user namespace", () => {
    expect(pathOfKey(USER, "user-123/videos/clip.mp4")).toBe("videos");
    expect(pathOfKey(USER, "user-123/clip.mp4")).toBe("");
  });
});

const item = (key: string, over: Partial<{ size: number; lastModified: string }> = {}) => ({
  key,
  size: over.size ?? 1024,
  lastModified: over.lastModified ?? "2026-01-01T00:00:00.000Z",
  publicUrl: `https://cdn.example.com/${key}`,
});

describe("parseListing", () => {
  it("presents shared prefixes as folders, relative to where you are", () => {
    const { folders } = parseListing(
      {
        items: [],
        folders: ["user-123/videos/Module 1/", "user-123/videos/Module 2/"],
      },
      USER,
      "videos",
    );

    expect(folders.map((f) => f.path)).toEqual(["videos/Module 1", "videos/Module 2"]);
    expect(folders.map((f) => f.name)).toEqual(["Module 1", "Module 2"]);
  });

  it("hides the marker object that keeps an empty folder alive", () => {
    // Without this the creator sees a mysterious ".keep" file in every folder
    // they make, and deleting it would delete the folder.
    const { files } = parseListing(
      { items: [item("user-123/videos/.keep"), item("user-123/videos/clip.mp4")], folders: [] },
      USER,
      "videos",
    );

    expect(files.map((f) => f.name)).toEqual(["clip.mp4"]);
  });

  it("skips a key that is only the prefix itself", () => {
    const { files } = parseListing({ items: [item("user-123/videos/")], folders: [] }, USER, "videos");
    expect(files).toEqual([]);
  });

  it("puts the newest file first — it is the one you just added", () => {
    const { files } = parseListing(
      {
        items: [
          item("user-123/videos/old.mp4", { lastModified: "2026-01-01T00:00:00.000Z" }),
          item("user-123/videos/new.mp4", { lastModified: "2026-06-01T00:00:00.000Z" }),
        ],
        folders: [],
      },
      USER,
      "videos",
    );

    expect(files.map((f) => f.name)).toEqual(["new.mp4", "old.mp4"]);
  });

  it("carries the kind and public URL through to the card", () => {
    const { files } = parseListing(
      { items: [item("user-123/thumbnails/cover.webp")], folders: [] },
      USER,
      "thumbnails",
    );

    expect(files[0]).toMatchObject({
      kind: "image",
      path: "thumbnails",
      publicUrl: "https://cdn.example.com/user-123/thumbnails/cover.webp",
    });
  });
});
