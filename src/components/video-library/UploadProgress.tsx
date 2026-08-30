import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadJob } from "@/hooks/useVideoUpload";
import { formatFileSize } from "@/lib/videoLibrary";

/** "about 2 minutes left" — vague on purpose; a false precision reads worse. */
function formatEta(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return null;
  if (seconds < 10) return "a few seconds left";
  if (seconds < 60) return `about ${Math.round(seconds / 5) * 5} seconds left`;
  const minutes = Math.round(seconds / 60);
  return minutes <= 1 ? "about a minute left" : `about ${minutes} minutes left`;
}

function formatSpeed(bytesPerSecond: number | null): string | null {
  if (!bytesPerSecond || bytesPerSecond <= 0) return null;
  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * The stages of an upload, reported the way a video host reports them, so the
 * wait is legible: what is happening now, how far in, and how much longer.
 */
export function UploadProgress({ job, className }: { job: UploadJob; className?: string }) {
  if (job.stage === "idle") return null;

  const isError = job.stage === "error";
  const isDone = job.stage === "done";

  const headline = {
    uploading: `Uploading ${job.percent}%`,
    processing: "Processing…",
    done: "Ready",
    error: "Upload failed",
    idle: "",
  }[job.stage];

  const detail = isError
    ? job.error
    : job.stage === "uploading"
      ? [
          `${formatFileSize(job.bytesSent)} of ${formatFileSize(job.bytesTotal)}`,
          formatSpeed(job.speed),
          formatEta(job.etaSeconds),
        ]
          .filter(Boolean)
          .join(" · ")
      : job.stage === "processing"
        ? "Reading length and resolution"
        : "Added to your video library";

  // Processing has no measurable progress, so the bar animates rather than
  // claiming a percentage it does not have.
  const indeterminate = job.stage === "processing";

  return (
    <div className={cn("rounded-xl border border-border bg-card p-3", className)}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isError ? "bg-destructive/10 text-destructive" : isDone ? "bg-success/10 text-success" : "bg-accent-tint text-accent",
          )}
        >
          {isError ? (
            <AlertCircle className="h-4 w-4" />
          ) : isDone ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : job.stage === "processing" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-xs font-semibold">{job.fileName}</p>
            <p
              className={cn(
                "shrink-0 text-xs font-semibold tabular-nums",
                isError ? "text-destructive" : isDone ? "text-success" : "text-accent",
              )}
            >
              {headline}
            </p>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {job.total > 1 && `File ${job.index} of ${job.total} · `}
            {detail}
          </p>
        </div>
      </div>

      {!isError && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full",
              isDone ? "bg-success" : "bg-accent",
              indeterminate ? "w-1/3 animate-[pulse_1.2s_ease-in-out_infinite]" : "transition-[width] duration-200",
            )}
            style={indeterminate ? undefined : { width: `${job.percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
