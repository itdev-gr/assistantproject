#!/usr/bin/env node
/**
 * Roomriv brand generator.
 *
 * Builds every logo variant as a lean SVG (no rasters, no web fonts) and the
 * PNG app icons, from a single geometric description of the double-R
 * monogram plus outlined text (wordmark: Outfit Medium, tagline: Plus Jakarta
 * Sans Medium — OFL, subset static instances in ./fonts). Proportions were measured from the brand board.
 *
 *   node tools/brand/generate-logo.mjs          # writes apps/web/public/brand + app icons
 *   node tools/brand/generate-logo.mjs --no-png # skip the Playwright PNG step
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const OUT = path.join(repo, 'apps/web/public/brand');
const APP = path.join(repo, 'apps/web/src/app');

// ---------------------------------------------------------------------------
// Palette (from the board)
// ---------------------------------------------------------------------------
export const COLORS = {
  navy: '#0B1324',
  blue: '#1D4ED8',
  blueLight: '#3B82F6',
  grey: '#64748B',
  offWhite: '#F5F7FA',
  white: '#FFFFFF',
};

// ---------------------------------------------------------------------------
// Monogram geometry. Units: cap height of the left R = 100.
// ---------------------------------------------------------------------------
const G = {
  H: 100, // cap height / baseline of the leg
  W: 12.4, // stroke weight
  B: 62.5, // outer bowl height (bowl is a stadium: flat top/bottom + semicircle)
  cx: 46.5, // x of the semicircle centre (from the left R's stem edge)
  k: 0.94, // leg slope, dx per dy (≈43° from horizontal)
  stemBottom: 89.7, // the stem stops a little above the leg's baseline
  navy: { jx: 23.4 }, // x where the leg's left edge meets the bowl's bottom bar (top edge)
  blue: {
    dx: 65.7, // bowl offset vs the navy bowl
    jx: 80.9, // leg junction (absolute x)
    cut: 74.5, // top bar starts here at y=0 …
    kc: 0.75, // … and its end is cut with this slope (dx per dy)
  },
};

const r2 = (n) => Math.round(n * 100) / 100;

/** Intersection of a line x = x0 + k*(y - y0) with the circle (cx,cy,R), lower solution. */
function lineCircleLower(x0, y0, k, cx, cy, R) {
  // x = x0 + k(y - y0)  →  substitute into (x-cx)^2 + (y-cy)^2 = R^2
  const a = 1 + k * k;
  const c0 = x0 - k * y0 - cx; // x - cx = c0 + k*y
  const b = 2 * (c0 * k - cy);
  const c = c0 * c0 + cy * cy - R * R;
  const disc = Math.sqrt(b * b - 4 * a * c);
  const y = (-b + disc) / (2 * a);
  return { x: x0 + k * (y - y0), y };
}

/** Left R: stem + stadium bowl + leg. Returns an SVG path (y grows downward). */
function leftR() {
  const { H, W, B, cx, k, stemBottom } = G;
  const Ro = B / 2;
  const Ri = Ro - W;
  const cy = Ro;
  const jx = G.navy.jx;
  const barTop = B - W;
  const lw = W * Math.sqrt(1 + k * k); // horizontal width of the leg
  const xl = (y) => jx + k * (y - barTop); // leg left edge
  const xr = (y) => xl(y) + lw; // leg right edge
  const p6 = lineCircleLower(jx + lw, barTop, k, cx, cy, Ro); // leg right edge meets the bowl

  return [
    `M0 0`,
    `L${r2(cx)} 0`,
    `A${r2(Ro)} ${r2(Ro)} 0 0 1 ${r2(p6.x)} ${r2(p6.y)}`,
    `L${r2(xr(H))} ${H}`,
    `L${r2(xl(H))} ${H}`,
    `L${r2(jx)} ${r2(barTop)}`,
    `L${r2(cx)} ${r2(barTop)}`,
    `A${r2(Ri)} ${r2(Ri)} 0 0 0 ${r2(cx)} ${r2(W)}`,
    `L${r2(W)} ${r2(W)}`,
    `L${r2(W)} ${r2(stemBottom)}`,
    `L0 ${r2(stemBottom)}`,
    'Z',
  ].join('');
}

/** Right R: no stem, top bar cut diagonally, otherwise the same bowl + leg. */
function rightR() {
  const { H, W, B, cx, k } = G;
  const { dx, jx, cut, kc } = G.blue;
  const Ro = B / 2;
  const Ri = Ro - W;
  const cy = Ro;
  const cxb = cx + dx;
  const barTop = B - W;
  const lw = W * Math.sqrt(1 + k * k);
  const xl = (y) => jx + k * (y - barTop);
  const xr = (y) => xl(y) + lw;
  const p6 = lineCircleLower(jx + lw, barTop, k, cxb, cy, Ro);

  return [
    `M${r2(cut)} 0`,
    `L${r2(cxb)} 0`,
    `A${r2(Ro)} ${r2(Ro)} 0 0 1 ${r2(p6.x)} ${r2(p6.y)}`,
    `L${r2(xr(H))} ${H}`,
    `L${r2(xl(H))} ${H}`,
    `L${r2(jx)} ${r2(barTop)}`,
    `L${r2(cxb)} ${r2(barTop)}`,
    `A${r2(Ri)} ${r2(Ri)} 0 0 0 ${r2(cxb)} ${r2(W)}`,
    `L${r2(cut + kc * W)} ${r2(W)}`,
    'Z',
  ].join('');
}

export const SYMBOL = {
  navy: leftR(),
  blue: rightR(),
  width: r2(G.cx + G.blue.dx + G.B / 2), // right edge of the blue bowl
  height: G.H,
};

// ---------------------------------------------------------------------------
// Text → outlines
// ---------------------------------------------------------------------------
const fonts = {
  wordmark: opentype.parse(toArrayBuffer(fs.readFileSync(path.join(here, 'fonts/Outfit-500.ttf')))),
  tagline: opentype.parse(toArrayBuffer(fs.readFileSync(path.join(here, 'fonts/PlusJakartaSans-500.ttf')))),
};
function toArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
const capRatio = (font) => font.tables.os2.sCapHeight / font.unitsPerEm;

/**
 * Lay out `runs` ([{text, fill}]) on one baseline at the given cap height,
 * returning path elements and the ink bbox. `tracking` in em.
 */
function setText(font, runs, { cap, tracking = 0, x = 0, y = 0 }) {
  const size = cap / capRatio(font);
  const opts = { kerning: true, letterSpacing: tracking };
  let cursor = x;
  const parts = [];
  let minX = Infinity;
  let maxX = -Infinity;
  for (const run of runs) {
    const p = font.getPath(run.text, cursor, y, size, opts);
    const bb = p.getBoundingBox();
    minX = Math.min(minX, bb.x1);
    maxX = Math.max(maxX, bb.x2);
    parts.push({ d: p.toPathData(2), fill: run.fill });
    cursor += font.getAdvanceWidth(run.text, size, opts);
  }
  return { parts, x1: minX, x2: maxX, width: maxX - minX };
}

/** Find the tracking that makes the text exactly `targetWidth` wide. */
function fitTracking(font, runs, cap, targetWidth) {
  let lo = -0.1;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const w = setText(font, runs, { cap, tracking: mid }).width;
    if (w < targetWidth) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Board proportions (relative to the symbol height S = 100):
const P = {
  wordCap: 31, // wordmark cap height
  wordWidthPerCap: 8.1, // wordmark ink width / cap height
  stackGap: 16.5, // symbol baseline → wordmark cap top
  tagCapPerWordCap: 0.3, // tagline cap height vs wordmark cap
  tagGapPerWordCap: 0.42, // wordmark baseline → tagline cap top
  horizGap: 34, // symbol right edge → wordmark left edge
};

function wordmarkRuns(c) {
  return [
    { text: 'ROOM', fill: c.dark },
    { text: 'RIV', fill: c.blue },
  ];
}

const WORD_WIDTH = P.wordCap * P.wordWidthPerCap;
const WORD_TRACKING = fitTracking(fonts.wordmark, wordmarkRuns(COLORS), P.wordCap, WORD_WIDTH);

// Tagline is justified to the wordmark width on the board.
const TAG_CAP = P.wordCap * P.tagCapPerWordCap;
const TAGLINE_LONG = 'Smart hospitality. Seamless connections.';
const TAGLINE_SHORT = 'Smart hospitality.';
const TAG_TRACKING = fitTracking(fonts.tagline, [{ text: TAGLINE_LONG }], TAG_CAP, WORD_WIDTH);

// ---------------------------------------------------------------------------
// SVG assembly
// ---------------------------------------------------------------------------
function svg({ width, height, body, title = 'Roomriv', defs = '' }) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(width)} ${r2(height)}" ` +
    `width="${r2(width)}" height="${r2(height)}" role="img" aria-label="${title}">` +
    `<title>${title}</title>${defs}${body}</svg>\n`
  );
}

function symbolPaths(c, { x = 0, y = 0, scale = 1 } = {}) {
  const t = x || y || scale !== 1 ? ` transform="translate(${r2(x)} ${r2(y)}) scale(${r2(scale)})"` : '';
  return (
    `<g${t}>` +
    `<path fill="${c.blue}" d="${SYMBOL.blue}"/>` +
    `<path fill="${c.dark}" d="${SYMBOL.navy}"/>` +
    `</g>`
  );
}

function textPaths(layout, { x = 0, y = 0 } = {}) {
  const t = x || y ? ` transform="translate(${r2(x)} ${r2(y)})"` : '';
  return `<g${t}>${layout.parts.map((p) => `<path fill="${p.fill}" d="${p.d}"/>`).join('')}</g>`;
}

const PAD = 4; // breathing room so nothing touches the viewBox edge

function symbolSvg(c) {
  const w = SYMBOL.width + PAD * 2;
  const h = SYMBOL.height + PAD * 2;
  return svg({ width: w, height: h, body: symbolPaths(c, { x: PAD, y: PAD }) });
}

function wordmarkSvg(c) {
  const word = setText(fonts.wordmark, wordmarkRuns(c), { cap: P.wordCap, tracking: WORD_TRACKING });
  const w = word.width + PAD * 2;
  const h = P.wordCap + PAD * 2;
  return svg({
    width: w,
    height: h,
    body: textPaths(word, { x: PAD - word.x1, y: PAD + P.wordCap }),
  });
}

function horizontalSvg(c) {
  const word = setText(fonts.wordmark, wordmarkRuns(c), { cap: P.wordCap, tracking: WORD_TRACKING });
  const w = SYMBOL.width + P.horizGap + word.width + PAD * 2;
  const h = SYMBOL.height + PAD * 2;
  // wordmark optically centred on the symbol's height
  const baseline = PAD + SYMBOL.height / 2 + P.wordCap / 2;
  return svg({
    width: w,
    height: h,
    body:
      symbolPaths(c, { x: PAD, y: PAD }) +
      textPaths(word, { x: PAD + SYMBOL.width + P.horizGap - word.x1, y: baseline }),
  });
}

function stackedSvg(c, { tagline = TAGLINE_SHORT } = {}) {
  const word = setText(fonts.wordmark, wordmarkRuns(c), { cap: P.wordCap, tracking: WORD_TRACKING });
  const tag = tagline
    ? setText(fonts.tagline, [{ text: tagline, fill: c.dark }], { cap: TAG_CAP, tracking: TAG_TRACKING })
    : null;
  const w = word.width + PAD * 2;
  const wordBaseline = PAD + SYMBOL.height + P.stackGap + P.wordCap;
  const tagBaseline = wordBaseline + P.wordCap * P.tagGapPerWordCap + TAG_CAP;
  const tagDescent = TAG_CAP * 0.3;
  const h = (tag ? tagBaseline + tagDescent : wordBaseline) + PAD;
  const cxAll = w / 2;
  let body = symbolPaths(c, { x: cxAll - SYMBOL.width / 2, y: PAD });
  body += textPaths(word, { x: cxAll - word.width / 2 - word.x1, y: wordBaseline });
  if (tag) body += textPaths(tag, { x: cxAll - tag.width / 2 - tag.x1, y: tagBaseline });
  return svg({ width: w, height: h, body });
}

function appIconSvg() {
  const side = 1024;
  const radius = side * 0.22;
  const markWidth = side * 0.64;
  const scale = markWidth / SYMBOL.width;
  const markHeight = SYMBOL.height * scale;
  const x = (side - markWidth) / 2;
  const y = (side - markHeight) / 2;
  const defs =
    '<defs>' +
    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#16244A"/><stop offset="1" stop-color="#0B1324"/></linearGradient>' +
    '<linearGradient id="rr" x1="0" y1="0" x2="1" y2="1">' +
    `<stop offset="0" stop-color="${COLORS.blueLight}"/><stop offset="1" stop-color="${COLORS.blue}"/></linearGradient>` +
    '</defs>';
  const body =
    `<rect width="${side}" height="${side}" rx="${r2(radius)}" fill="url(#bg)"/>` +
    symbolPaths({ dark: COLORS.white, blue: 'url(#rr)' }, { x, y, scale });
  return svg({ width: side, height: side, body, defs, title: 'Roomriv app icon' });
}

// ---------------------------------------------------------------------------
// Write everything
// ---------------------------------------------------------------------------
const colour = { dark: COLORS.navy, blue: COLORS.blue };
const onDark = { dark: COLORS.white, blue: COLORS.blueLight };
const mono = { dark: 'currentColor', blue: 'currentColor' };

const files = {
  'roomriv-symbol.svg': symbolSvg(colour),
  'roomriv-symbol-white.svg': symbolSvg(onDark),
  'roomriv-symbol-mono.svg': symbolSvg(mono),
  'roomriv-wordmark.svg': wordmarkSvg(colour),
  'roomriv-wordmark-white.svg': wordmarkSvg(onDark),
  'roomriv-horizontal.svg': horizontalSvg(colour),
  'roomriv-horizontal-white.svg': horizontalSvg(onDark),
  'roomriv-stacked.svg': stackedSvg(colour),
  'roomriv-stacked-white.svg': stackedSvg(onDark),
  'roomriv-stacked-full.svg': stackedSvg(colour, { tagline: TAGLINE_LONG }),
  'roomriv-stacked-plain.svg': stackedSvg(colour, { tagline: null }),
  'roomriv-stacked-plain-white.svg': stackedSvg(onDark, { tagline: null }),
  'roomriv-app-icon.svg': appIconSvg(),
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), content);
}
fs.writeFileSync(path.join(APP, 'icon.svg'), files['roomriv-app-icon.svg']);

console.log(
  `wrote ${Object.keys(files).length} SVGs to ${path.relative(repo, OUT)} ` +
  `(tracking: wordmark ${WORD_TRACKING.toFixed(3)}em, tagline ${TAG_TRACKING.toFixed(3)}em)`,
);

if (!process.argv.includes('--no-png')) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const data = 'data:image/svg+xml;base64,' + Buffer.from(files['roomriv-app-icon.svg']).toString('base64');
  for (const [file, size] of [
    ['icon.png', 256],
    ['apple-icon.png', 180],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<body style="margin:0;background:transparent"><img src="${data}" width="${size}" height="${size}" style="display:block"></body>`,
    );
    await page.screenshot({ path: path.join(APP, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  }
  await browser.close();
  console.log('wrote icon.png (256) and apple-icon.png (180) to apps/web/src/app');
}
