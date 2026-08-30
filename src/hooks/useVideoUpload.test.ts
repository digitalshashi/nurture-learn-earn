import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const uploadUserFile = vi.fn();
const probeVideo = vi.fn();

vi.mock("@/lib/cloud-storage", () => ({
  uploadUserFile: (...args: unknown[]) => uploadUserFile(...args),
}));

vi.mock("@/lib/videoProbe", () => ({
  probeVideo: (...args: unknown[]) => probeVideo(...args),
}));

import { useVideoUpload } from "./useVideoUpload";

function file(name = "lesson.mp4", size = 10_000_000) {
  return new File(["x"], name, { type: "video/mp4" });
  // size is asserted through the mock rather than the File, which jsdom
  // reports as the byte length of its parts.
}

beforeEach(() => {
  uploadUserFile.mockReset();
  probeVideo.mockReset();
  probeVideo.mockResolvedValue({ durationSeconds: 754, width: 1920, height: 1080 });
  uploadUserFile.mockResolvedValue({ publicUrl: "https://cdn/x.mp4", path: "u/videos/x.mp4" });
});

describe("useVideoUpload", () => {
  it("walks through reading, uploading and processing to done", async () => {
    const stages: string[] = [];
    uploadUserFile.mockImplementation(async (_u, _f, _file, opts: { onProgress?: (n: number) => void }) => {
      opts.onProgress?.(50);
      return { publicUrl: "https://cdn/x.mp4", path: "u/videos/x.mp4" };
    });

    const { result } = renderHook(() => useVideoUpload());

    let done!: Promise<unknown>;
    act(() => {
      done = result.current.upload("user-1", "videos", [file()]);
    });

    // The stage is observable as it advances, not only at the end.
    await waitFor(() => expect(result.current.job.stage).not.toBe("idle"));
    stages.push(result.current.job.stage);

    await act(async () => {
      await done;
    });

    expect(result.current.job.stage).toBe("done");
    expect(result.current.job.percent).toBe(100);
  });

  it("hands back the probed duration so a chapter can store it", async () => {
    const { result } = renderHook(() => useVideoUpload());

    let outcome: Awaited<ReturnType<typeof result.current.upload>> = [];
    await act(async () => {
      outcome = await result.current.upload("user-1", "videos", [file()]);
    });

    expect(outcome).toHaveLength(1);
    expect(outcome[0].probe.durationSeconds).toBe(754);
    expect(outcome[0].publicUrl).toBe("https://cdn/x.mp4");
  });

  it("reports a failure instead of pretending the file uploaded", async () => {
    uploadUserFile.mockRejectedValue(new Error("bucket not configured"));
    const { result } = renderHook(() => useVideoUpload());

    let outcome: Awaited<ReturnType<typeof result.current.upload>> = [];
    await act(async () => {
      outcome = await result.current.upload("user-1", "videos", [file()]);
    });

    expect(outcome).toHaveLength(0);
    expect(result.current.job.stage).toBe("error");
    expect(result.current.job.error).toMatch(/bucket not configured/);
  });

  it("keeps going after one file in a batch fails", async () => {
    uploadUserFile
      .mockRejectedValueOnce(new Error("nope"))
      .mockResolvedValue({ publicUrl: "https://cdn/b.mp4", path: "u/videos/b.mp4" });

    const { result } = renderHook(() => useVideoUpload());

    let outcome: Awaited<ReturnType<typeof result.current.upload>> = [];
    await act(async () => {
      outcome = await result.current.upload("user-1", "videos", [file("a.mp4"), file("b.mp4")]);
    });

    expect(outcome).toHaveLength(1);
    expect(outcome[0].fileName).toBe("b.mp4");
  });

  it("uploads one file at a time rather than all at once", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    uploadUserFile.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return { publicUrl: "https://cdn/x.mp4", path: "p" };
    });

    const { result } = renderHook(() => useVideoUpload());
    await act(async () => {
      await result.current.upload("user-1", "videos", [file("a.mp4"), file("b.mp4"), file("c.mp4")]);
    });

    expect(maxInFlight).toBe(1);
  });
});
