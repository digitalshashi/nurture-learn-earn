import { useCallback, useRef, useState } from "react";
import { uploadUserFile } from "@/lib/cloud-storage";
import { probeVideo, type VideoProbe } from "@/lib/videoProbe";
import { unplayableVideoReason } from "@/lib/videoFormats";

export type UploadStage = "idle" | "uploading" | "processing" | "done" | "error";

export interface UploadJob {
  stage: UploadStage;
  fileName: string;
  /** 0–100 for the upload itself. */
  percent: number;
  bytesTotal: number;
  bytesSent: number;
  /** Bytes per second, averaged over the transfer so far. Null early on. */
  speed: number | null;
  /** Seconds remaining at the current rate. Null when not yet estimable. */
  etaSeconds: number | null;
  /** Position in a multi-file batch, 1-based. */
  index: number;
  total: number;
  error?: string;
}

export interface UploadOutcome {
  publicUrl: string;
  path: string;
  fileName: string;
  size: number;
  probe: VideoProbe;
}

const IDLE: UploadJob = {
  stage: "idle",
  fileName: "",
  percent: 0,
  bytesTotal: 0,
  bytesSent: 0,
  speed: null,
  etaSeconds: null,
  index: 0,
  total: 0,
};

/**
 * Uploads with the stages a creator actually waits through, the way a video
 * host reports them: reading the file, transferring it, then processing —
 * where processing is real work, not a spinner. We read the video's duration
 * and dimensions so the chapter can store them.
 *
 * Files go up one at a time: a progress bar that averages four concurrent
 * transfers tells you nothing, and a 2GB file should not be sharing the pipe.
 */
export function useVideoUpload() {
  const [job, setJob] = useState<UploadJob>(IDLE);
  const startedAt = useRef(0);

  const reset = useCallback(() => setJob(IDLE), []);

  const upload = useCallback(
    async (
      userId: string,
      folder: string,
      files: File[],
      onEach?: (result: UploadOutcome) => void,
    ): Promise<UploadOutcome[]> => {
      const results: UploadOutcome[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base = {
          fileName: file.name,
          bytesTotal: file.size,
          index: i + 1,
          total: files.length,
        };

        // Refuse a format that could never play, before spending the upload
        // on it. Without a transcoding step this is the last chance to catch
        // it: afterwards the file is stored, attached to a lesson, and simply
        // shows a black frame.
        const unplayable = unplayableVideoReason(file.name);
        if (unplayable) {
          setJob({ ...IDLE, ...base, stage: "error", error: unplayable });
          continue;
        }

        try {
          // The probe runs *alongside* the upload, never in front of it. It
          // decodes the file header in a hidden <video>, which browsers cannot
          // do at all for .avi/.mkv — waiting on it first meant the upload sat
          // idle behind a format the browser was never going to read.
          const probePromise = probeVideo(file);

          // 1. Uploading — real byte progress, with rate and ETA derived from it.
          startedAt.current = Date.now();
          setJob({ ...IDLE, ...base, stage: "uploading" });

          const result = await uploadUserFile(userId, folder, file, {
            onProgress: (percent) => {
              const elapsed = (Date.now() - startedAt.current) / 1000;
              const bytesSent = Math.round((percent / 100) * file.size);
              const speed = elapsed > 0.5 ? bytesSent / elapsed : null;
              const remaining = file.size - bytesSent;
              setJob({
                ...IDLE,
                ...base,
                stage: "uploading",
                percent,
                bytesSent,
                speed,
                etaSeconds: speed && speed > 0 ? Math.round(remaining / speed) : null,
              });
            },
          });

          // 2. Processing — the store finalises the object and the probe is
          //    collected here, by which point it has usually long since
          //    resolved. The stage is held until the outcome is handed over so
          //    the UI never jumps from 99% straight to gone.
          setJob({ ...IDLE, ...base, stage: "processing", percent: 100, bytesSent: file.size });
          const probe = await probePromise;

          const outcome: UploadOutcome = {
            publicUrl: result.publicUrl,
            path: result.path,
            fileName: file.name,
            size: file.size,
            probe,
          };
          results.push(outcome);
          onEach?.(outcome);

          setJob({ ...IDLE, ...base, stage: "done", percent: 100, bytesSent: file.size });
        } catch (err) {
          setJob({
            ...IDLE,
            ...base,
            stage: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          });
          // Keep going: one bad file should not abandon the rest of a batch.
        }
      }

      return results;
    },
    [],
  );

  return { job, upload, reset, isBusy: job.stage === "uploading" || job.stage === "processing" };
}
