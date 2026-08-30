// Reading a Blob's bytes on browsers that cannot do it the short way.
//
// Blob.arrayBuffer() and Blob.text() only arrived in Safari 14. Everything
// that inspects an upload before sending it — the WebP converter checking a
// GIF for animation, the document reader unzipping a .docx — needs the bytes,
// and on an older Safari the short way throws rather than returning nothing.
// The FileReader fallback is what those browsers have always had.

/** The bytes of a blob, whichever API this browser provides. */
export async function readFileBytes(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") {
    return new Uint8Array(await file.arrayBuffer());
  }

  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("The file could not be read."));
    reader.readAsArrayBuffer(file);
  });

  return new Uint8Array(buffer);
}

/** The text of a blob, decoded as UTF-8. */
export async function readFileText(file: Blob): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new TextDecoder().decode(await readFileBytes(file));
}
