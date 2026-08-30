import { BRAND } from "@/lib/brand";

/**
 * A certificate, drawn as SVG so it can be both previewed and downloaded from
 * the same source.
 *
 * Deliberately no web fonts: an SVG rasterised through an <img> cannot load
 * external resources, so anything but a system stack silently falls back and
 * the download comes out looking nothing like the preview.
 */
export interface CertificateInput {
  /** The award or course being recognised. */
  title: string;
  recipient: string;
  /** One line under the name, e.g. what the award was for. */
  citation: string;
  issuedOn: Date;
  /** Shown small in the corner. Stable per certificate. */
  reference: string;
  /** HSL triplet for the accent rule and seal. */
  hue?: string;
}

const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );

export const CERTIFICATE_WIDTH = 1000;
export const CERTIFICATE_HEIGHT = 700;

export function certificateSvg(input: CertificateInput): string {
  const hue = input.hue ?? "7 95% 60%";
  const accent = `hsl(${hue})`;
  const date = input.issuedOn.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CERTIFICATE_WIDTH}" height="${CERTIFICATE_HEIGHT}" viewBox="0 0 ${CERTIFICATE_WIDTH} ${CERTIFICATE_HEIGHT}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect x="24" y="24" width="${CERTIFICATE_WIDTH - 48}" height="${CERTIFICATE_HEIGHT - 48}" fill="none" stroke="#e8e8ea" stroke-width="2"/>
  <rect x="24" y="24" width="${CERTIFICATE_WIDTH - 48}" height="6" fill="${accent}"/>

  <text x="50%" y="150" text-anchor="middle" font-family="${FONT}" font-size="15" letter-spacing="6" fill="#8a8a92">CERTIFICATE OF ACHIEVEMENT</text>

  <text x="50%" y="235" text-anchor="middle" font-family="${FONT}" font-size="17" fill="#8a8a92">This is presented to</text>
  <text x="50%" y="300" text-anchor="middle" font-family="${FONT}" font-size="46" font-weight="700" fill="#111116">${escapeXml(input.recipient)}</text>

  <line x1="330" y1="330" x2="670" y2="330" stroke="${accent}" stroke-width="2"/>

  <text x="50%" y="380" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="600" fill="${accent}">${escapeXml(input.title)}</text>
  <text x="50%" y="418" text-anchor="middle" font-family="${FONT}" font-size="15" fill="#5a5a62">${escapeXml(input.citation)}</text>

  <circle cx="500" cy="500" r="34" fill="none" stroke="${accent}" stroke-width="2"/>
  <circle cx="500" cy="500" r="27" fill="${accent}" opacity="0.1"/>
  <text x="500" y="507" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="700" fill="${accent}">★</text>

  <text x="80" y="${CERTIFICATE_HEIGHT - 70}" font-family="${FONT}" font-size="13" fill="#8a8a92">Issued ${escapeXml(date)}</text>
  <text x="80" y="${CERTIFICATE_HEIGHT - 50}" font-family="${FONT}" font-size="11" fill="#b0b0b8">Ref ${escapeXml(input.reference)}</text>
  <text x="${CERTIFICATE_WIDTH - 80}" y="${CERTIFICATE_HEIGHT - 60}" text-anchor="end" font-family="${FONT}" font-size="16" font-weight="600" fill="#111116">${escapeXml(BRAND.displayName)}</text>
</svg>`;
}

/**
 * Rasterises the certificate and hands it to the browser as a PNG.
 *
 * Drawn at twice the nominal size: these get shared on social, where a 1000px
 * wide image is upscaled and looks soft.
 */
export async function downloadCertificatePng(input: CertificateInput, fileName: string) {
  const svg = certificateSvg(input);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not render the certificate"));
      image.src = url;
    });

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = CERTIFICATE_WIDTH * scale;
    canvas.height = CERTIFICATE_HEIGHT * scale;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not render the certificate");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not render the certificate");

    const pngUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `${fileName}.png`;
    link.click();
    URL.revokeObjectURL(pngUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A short, stable reference for an award certificate. */
export const certificateReference = (userId: string, awardKey: string) =>
  `${awardKey.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${userId.slice(0, 8).toUpperCase()}`;
