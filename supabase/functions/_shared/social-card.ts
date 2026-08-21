// The share-card composer: one square canvas, built up, never cut down.
//
// WHY THIS EXISTS
// Instagram rejected every post with error 36003, unsupported aspect
// ratio, and deactivated the automation. The cause was not a bad
// resize -- it was that nothing was ever resized at all.
// social-image-fetch asked Commons for a thumbnail at iiurlwidth=1600
// and handed that URL straight to Make. A Commons thumbnail keeps its
// source photograph's aspect ratio, so "Tokyo skyline" came back as
// something like 1600x450 (3.6:1). Instagram accepts 4:5 through
// 1.91:1. Nothing in the path had an opinion about shape.
//
// COMPOSED, NOT CROPPED
// The photograph is placed into the square with
// preserveAspectRatio="xMidYMid meet" -- contain, not cover. A 3.6:1
// panorama becomes a full-width band sitting in the middle of the
// card with brand ground above and below it. No pixel of the original
// is cut off to make it fit. That is the deliberate reading of the
// brief: the card is a square that content is composed onto, not a
// square cut out of a wider picture.
//
// SIZE IS A CONSTANT, NOT A SETTING
// CARD_PX is used for the SVG's width, its height, its viewBox, and
// the rasteriser's output size, and is the same number the guard in
// assertSquare() checks the finished bytes against. There is no code
// path that can produce a card of another size and no argument that
// can ask for one.
//
// NO FONT, NO TEXT
// resvg needs a font buffer to draw a <text> node, and an edge
// function has no system fonts. Rather than fetch a webfont on every
// cold start and have the card silently lose its wordmark whenever
// that fetch fails, the mark here is drawn as geometry -- rules and a
// rectangle, which need no font and cannot fail to render. The words
// of the post are the caption, which Instagram renders itself and
// which never depended on this image.

export const CARD_PX = 1080;

// The site's own tokens, from styles.css. Kept as literals because an
// edge function cannot read the stylesheet.
const INK = "#14100B";
const BRASS = "#B08D57";
const HAIRLINE = "rgba(176,141,87,0.32)";

export interface CardOptions {
  /** Data URI (or absolute URL) of the photograph to compose. */
  photo: string | null;
  /** Mood-band accent, if the caller has one. Falls back to brass. */
  accent?: string | null;
}

function escAttr(s: string): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A complete 1080x1080 card as an SVG string.
 *
 * Renders with or without a photograph: a card with no photo is still
 * a valid, correctly-shaped card, so a Commons miss degrades to plain
 * brand ground rather than to a broken or wrongly-shaped image.
 */
export function buildCardSVG(opts: CardOptions): string {
  const S = CARD_PX;
  const accent = opts.accent && /^#[0-9a-fA-F]{6}$/.test(opts.accent) ? opts.accent : BRASS;

  // The photo window. Inset on all four sides so the frame reads as a
  // frame, and square itself, so a portrait original letterboxes left
  // and right exactly as a landscape one letterboxes top and bottom.
  const pad = 64;
  const markH = 76;
  const winX = pad;
  const winY = pad;
  const winW = S - pad * 2;
  const winH = S - pad * 2 - markH;

  const photo = opts.photo
    ? `<image x="${winX}" y="${winY}" width="${winW}" height="${winH}" ` +
      `href="${escAttr(opts.photo)}" preserveAspectRatio="xMidYMid meet"/>`
    : "";

  // The mark: a brass rule, a solid block, and a longer rule. Geometry
  // only -- see the header note about fonts.
  const markY = S - pad - markH / 2;
  const mark =
    `<rect x="${winX}" y="${markY - 3}" width="132" height="6" fill="${accent}"/>` +
    `<rect x="${winX + 156}" y="${markY - 13}" width="26" height="26" fill="${accent}"/>` +
    `<rect x="${winX + 206}" y="${markY - 1}" width="${winW - 206}" height="2" fill="${HAIRLINE}"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">` +
    `<rect width="${S}" height="${S}" fill="${INK}"/>` +
    photo +
    `<rect x="${winX + 0.5}" y="${winY + 0.5}" width="${winW - 1}" height="${winH - 1}" ` +
    `fill="none" stroke="${HAIRLINE}" stroke-width="1"/>` +
    mark +
    `</svg>`
  );
}

/**
 * Reads the pixel dimensions out of encoded image bytes.
 *
 * PNG carries them in the IHDR chunk, which is always the first chunk
 * and always at a fixed offset, so this is a header read rather than a
 * decode. Returns null for anything that is not a PNG, which the guard
 * treats as a failure -- an unreadable image is not a passing one.
 */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < sig.length; i++) {
    if (bytes[i] !== sig[i]) return null;
  }
  // Bytes 12-15 must spell "IHDR"; width and height are the two
  // big-endian uint32s that follow.
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export class CardSizeError extends Error {
  readonly got: string;
  constructor(got: string) {
    super(`share card is ${got}, expected ${CARD_PX}x${CARD_PX}`);
    this.name = "CardSizeError";
    this.got = got;
  }
}

/**
 * The guard. Throws rather than returning a flag, so there is no way to
 * call it and carry on with bytes that failed -- the only way past this
 * function is for the image to actually be 1080x1080.
 *
 * This runs on the finished encoded bytes, not on the numbers that were
 * asked for, because those are two different claims: the rasteriser
 * could be handed 1080 and emit something else, and it is what is
 * served that Instagram measures.
 */
export function assertSquare(bytes: Uint8Array): { width: number; height: number } {
  const size = pngSize(bytes);
  if (!size) {
    throw new CardSizeError("unreadable (not a PNG)");
  }
  if (size.width !== CARD_PX || size.height !== CARD_PX) {
    throw new CardSizeError(`${size.width}x${size.height}`);
  }
  return size;
}
