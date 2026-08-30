import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, Loader2, Paperclip, X } from "lucide-react";
import {
  describeExtract,
  extractDocumentText,
  SOURCE_ACCEPT,
  UnreadableDocument,
  type ExtractedDocument,
} from "@/lib/documentText";

interface SourceMaterialProps {
  documents: ExtractedDocument[];
  onChange: (documents: ExtractedDocument[]) => void;
  /** Softens the wording when the material is optional context rather than the source. */
  label?: string;
  hint?: string;
}

/**
 * Lets a coach hand over what they already wrote.
 *
 * Most people arriving here have material — a workbook, last year's deck, a
 * transcript — and no wish to retype it into five form fields. Reading it
 * happens in the browser, so nothing is uploaded and the page count comes back
 * instantly; the extracted text then travels with the blueprint and is passed
 * into every generation as context.
 */
export function SourceMaterial({
  documents,
  onChange,
  label = "Build it from your own material",
  hint = "PDF, Word, PowerPoint, Excel or a text file. Read in your browser — the file itself is never uploaded.",
}: SourceMaterialProps) {
  const input = useRef<HTMLInputElement | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setProblems([]);

    const added: ExtractedDocument[] = [];
    const failed: string[] = [];

    for (const file of Array.from(files)) {
      setReading(file.name);
      try {
        added.push(await extractDocumentText(file));
      } catch (error) {
        // A file this cannot read is not a reason to drop the ones it can.
        failed.push(
          error instanceof UnreadableDocument
            ? `${file.name}: ${error.message}`
            : `${file.name} could not be read.`,
        );
      }
    }

    setReading(null);
    setProblems(failed);
    if (added.length) onChange([...documents, ...added]);
    if (input.current) input.current.value = "";
  };

  const total = documents.reduce((sum, doc) => sum + doc.chars, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => input.current?.click()}
          disabled={Boolean(reading)}
        >
          {reading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Paperclip className="h-3.5 w-3.5 mr-1.5" />
          )}
          {reading ? "Reading…" : "Add files"}
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          accept={SOURCE_ACCEPT}
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>

      {reading && (
        <p className="text-xs text-muted-foreground">Reading {reading}…</p>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div
              key={`${doc.fileName}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {describeExtract(doc)}
                  {doc.truncated && " · only the first part will be used"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label={`Remove ${doc.fileName}`}
                onClick={() => onChange(documents.filter((_, i) => i !== index))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <Badge variant="secondary" className="font-normal">
            {documents.length} file{documents.length === 1 ? "" : "s"} ·{" "}
            {Math.round(total / 100) / 10}k characters of material
          </Badge>
        </div>
      )}

      {problems.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm space-y-1">
            {problems.map((problem, index) => (
              <p key={index}>{problem}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
