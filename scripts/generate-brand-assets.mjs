#!/usr/bin/env node
/**
 * Renders every 1corehub brand asset from the SVG sources in this file, so the
 * favicon, the PWA icons and the social share card can never drift apart.
 *
 * Run after changing the mark or the palette:
 *   node scripts/generate-brand-assets.mjs
 *
 * Outputs (all committed — none of them are build artifacts):
 *   public/icon-source.svg          the mark, as authored
 *   public/logo.svg                 mark + wordmark, for in-app use
 *   public/placeholder.svg          16:9 stand-in for missing course artwork
 *   public/favicon.ico              16/32/48 px, PNG-compressed ICO
 *   public/apple-touch-icon.png     180 px
 *   public/pwa-192x192.png          192 px
 *   public/pwa-512x512.png          512 px
 *   public/pwa-maskable-512x512.png 512 px, mark inside the 80% safe circle
 *   public/og-default.png           1200x630 fallback social card
 *
 * sharp renders the SVG text with locally installed fonts, so regenerating on a
 * machine without a Poppins/Segoe-class face will shift the wordmark. The PNGs
 * are committed precisely so a normal build never has to re-render them.
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const INK = "#111116"; // near-black field
const INK_2 = "#1d1d26";
const CORAL = "#fa4f38"; // hsl(7 95% 60%) — the app's --accent
const CORAL_2 = "#ff7a45";
const PAPER = "#ffffff";
const FONT = "Poppins, Segoe UI Semibold, Segoe UI, Inter, Arial, sans-serif";

/**
 * The mark: a coral ring (the "hub") around a white numeral one (the "core").
 * `inset` shrinks the artwork without shrinking the field, which is what makes
 * the maskable variant survive Android's circle crop.
 */
function markSvg({ size = 512, inset = 0, radius = 0.1875, field = true } = {}) {
  const s = size;
  const c = s / 2;
  const scale = 1 - inset;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="field" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${INK_2}"/>
      <stop offset="1" stop-color="${INK}"/>
    </linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${CORAL_2}"/>
      <stop offset="1" stop-color="${CORAL}"/>
    </linearGradient>
  </defs>
  ${field ? `<rect width="${s}" height="${s}" rx="${s * radius}" fill="url(#field)"/>` : ""}
  <g transform="translate(${c} ${c}) scale(${scale}) translate(${-c} ${-c})">
    <circle cx="${c}" cy="${c}" r="${s * 0.34}" fill="none" stroke="url(#ring)" stroke-width="${s * 0.072}"/>
    <circle cx="${c}" cy="${c - s * 0.34}" r="${s * 0.066}" fill="${CORAL_2}" stroke="${INK}" stroke-width="${s * 0.03}"/>
    <text x="${c}" y="${s * 0.655}" font-family="${FONT}" font-weight="700"
          font-size="${s * 0.42}" fill="${PAPER}" text-anchor="middle">1</text>
  </g>
</svg>`;
}

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="160" viewBox="0 0 720 160">
  <defs>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${CORAL_2}"/>
      <stop offset="1" stop-color="${CORAL}"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="144" height="144" rx="34" fill="${INK}"/>
  <circle cx="80" cy="80" r="49" fill="none" stroke="url(#ring)" stroke-width="10"/>
  <circle cx="80" cy="31" r="9.5" fill="${CORAL_2}" stroke="${INK}" stroke-width="4"/>
  <text x="80" y="103" font-family="${FONT}" font-weight="700" font-size="60" fill="${PAPER}" text-anchor="middle">1</text>
  <text x="180" y="103" font-family="${FONT}" font-weight="700" font-size="72" fill="${INK}">1corehub</text>
</svg>`;

/**
 * Stands in for a course or post with no artwork of its own.
 *
 * 16:9, because every surface that uses it — the course card, the course detail
 * hero — is `aspect-video` with `object-cover`. The scaffold placeholder this
 * replaced was a 1200x1200 grey square, so those frames centre-cropped it and
 * showed half a broken-image glyph.
 */
const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1b23"/>
      <stop offset="1" stop-color="#101015"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6">
      <stop offset="0" stop-color="${CORAL}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${CORAL}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect width="1200" height="675" fill="url(#glow)"/>
  <g opacity="0.55" transform="translate(600 338)">
    <circle cx="0" cy="0" r="86" fill="none" stroke="${CORAL}" stroke-width="16"/>
    <circle cx="0" cy="-86" r="17" fill="${CORAL_2}" stroke="#15151c" stroke-width="8"/>
    <text x="0" y="38" font-family="${FONT}" font-weight="700" font-size="106" fill="#ffffff" text-anchor="middle">1</text>
  </g>
</svg>`;

/** 1.91:1 — the ratio WhatsApp, Facebook, LinkedIn and X all crop toward. */
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#17171f"/>
      <stop offset="1" stop-color="#0c0c11"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.16" cy="0.12" r="0.72">
      <stop offset="0" stop-color="${CORAL}" stop-opacity="0.34"/>
      <stop offset="1" stop-color="${CORAL}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${CORAL_2}"/>
      <stop offset="1" stop-color="${CORAL}"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${CORAL}"/>
      <stop offset="1" stop-color="${CORAL}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <circle cx="1075" cy="545" r="230" fill="none" stroke="${CORAL}" stroke-opacity="0.12" stroke-width="2"/>
  <circle cx="1075" cy="545" r="330" fill="none" stroke="${CORAL}" stroke-opacity="0.08" stroke-width="2"/>

  <g transform="translate(96 168)">
    <rect width="132" height="132" rx="32" fill="#ffffff" fill-opacity="0.06"/>
    <circle cx="66" cy="66" r="45" fill="none" stroke="url(#ring)" stroke-width="9.5"/>
    <circle cx="66" cy="21" r="8.7" fill="${CORAL_2}" stroke="#1a1a22" stroke-width="3.8"/>
    <text x="66" y="88" font-family="${FONT}" font-weight="700" font-size="55" fill="${PAPER}" text-anchor="middle">1</text>
  </g>

  <text x="264" y="256" font-family="${FONT}" font-weight="700" font-size="88" fill="${PAPER}">1corehub</text>
  <text x="264" y="312" font-family="${FONT}" font-weight="600" font-size="26" fill="${CORAL_2}" letter-spacing="3.4">ONE HUB FOR YOUR WHOLE BUSINESS</text>

  <rect x="96" y="392" width="240" height="5" rx="2.5" fill="url(#rule)"/>
  <text x="96" y="466" font-family="${FONT}" font-weight="500" font-size="34" fill="#c9c9d4">Courses, community, events, CRM and payments —</text>
  <text x="96" y="514" font-family="${FONT}" font-weight="500" font-size="34" fill="#c9c9d4">everything you sell, in one place.</text>
</svg>`;

/** ICO is a 6-byte header, one 16-byte directory entry per size, then the PNGs. */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach(({ size, data }, i) => {
    const e = i * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, e + 0); // width (0 means 256)
    directory.writeUInt8(size >= 256 ? 0 : size, e + 1); // height
    directory.writeUInt8(0, e + 2); // palette size — 0 for PNG-compressed
    directory.writeUInt8(0, e + 3); // reserved
    directory.writeUInt16LE(1, e + 4); // colour planes
    directory.writeUInt16LE(32, e + 6); // bits per pixel
    directory.writeUInt32LE(data.length, e + 8);
    directory.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });

  return Buffer.concat([header, directory, ...images.map((i) => i.data)]);
}

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

const out = (name, buf) => {
  writeFileSync(join(publicDir, name), buf);
  console.log(`  ${name.padEnd(28)} ${(buf.length / 1024).toFixed(1)} KB`);
};

console.log("Rendering 1corehub brand assets:");

writeFileSync(join(publicDir, "icon-source.svg"), markSvg());
console.log("  icon-source.svg");
writeFileSync(join(publicDir, "logo.svg"), logoSvg);
console.log("  logo.svg");
writeFileSync(join(publicDir, "placeholder.svg"), placeholderSvg);
console.log("  placeholder.svg");

// The small sizes render from a heavier-cornered mark; the 512 px source's
// hairline ring turns to mush at 16 px.
const iconSizes = [];
for (const size of [16, 32, 48]) {
  iconSizes.push({ size, data: await png(markSvg({ size: 256, radius: 0.22 }), size) });
}
out("favicon.ico", buildIco(iconSizes));

out("apple-touch-icon.png", await png(markSvg({ size: 512, radius: 0.22 }), 180));
out("pwa-192x192.png", await png(markSvg(), 192));
out("pwa-512x512.png", await png(markSvg(), 512));
out("pwa-maskable-512x512.png", await png(markSvg({ inset: 0.22, radius: 0.5 }), 512));

out("og-default.png", await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toBuffer());

console.log("Done.");
