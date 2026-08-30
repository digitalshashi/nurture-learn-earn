/**
 * Turning a table into a file the person asking for it can actually open.
 *
 * Two rules earn their place here. Every cell is quoted, because the columns
 * people export most often — an assignment answer, a course title — contain
 * commas and line breaks far more often than not. And the file starts with a
 * byte-order mark, without which Excel reads UTF-8 as its own local codepage
 * and turns every accent into mojibake.
 */

/** U+FEFF, written as a code point so it cannot be mistaken for stray whitespace. */
const BOM = String.fromCharCode(0xfeff);

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
}

/** Builds the CSV and hands it to the browser as a download. */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
  const url = URL.createObjectURL(new Blob([BOM + toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** `prefix-2026-08-29.csv` — dated, so repeated exports do not overwrite each other. */
export function datedFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}
