/**
 * Generates the PWA icon set for Valenzuela CRS using only Node built-ins
 * (zlib + a tiny PNG encoder) — no image dependencies needed.
 *
 * Renders the brand pin logo (rounded blue→green tile, white map pin, green dot)
 * with 3x supersampling for smooth edges.
 *
 * Run:  node scripts/generate-pwa-icons.mjs
 * Out:  public/icons/icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon-180.png
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

/* ----------------------------------------------------------- PNG encoder */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const encodePng = (rgba, width, height) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/* --------------------------------------------------------------- drawing */
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

const BLUE = [0x1d, 0x4e, 0xd8];
const GREEN = [0x16, 0xa3, 0x4a];
const WHITE = [255, 255, 255];
const DOT_GREEN = [0x22, 0xc5, 0x5e];

const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Samples one pixel in unit space (0..1).
 * mode: 'rounded' (app icon) | 'maskable' (full-bleed, content in safe zone)
 */
const sample = (u, v, mode) => {
  const inset = mode === 'maskable' ? 0.82 : 1; // shrink content for maskable safe zone
  const cu = (u - 0.5) / inset + 0.5;
  const cv = (v - 0.5) / inset + 0.5;

  // Background: diagonal blue → green gradient (same as .brand-mark)
  let [r, g, b] = mix(BLUE, GREEN, Math.min(1, Math.max(0, (u + v) / 2)));
  let a = 255;

  if (mode === 'rounded') {
    // Rounded-rect alpha (radius 24% of size)
    const rad = 0.24;
    const dx = Math.max(Math.abs(u - 0.5) - (0.5 - rad), 0);
    const dy = Math.max(Math.abs(v - 0.5) - (0.5 - rad), 0);
    const dist = Math.hypot(dx, dy) - rad;
    a = Math.round(255 * (1 - smooth(-0.004, 0.004, dist)));
    if (a === 0) return [0, 0, 0, 0];
  }

  // White map pin: circle head + tapered tail to a point
  const px = cu - 0.5;
  const py = cv - 0.47;
  const headR = 0.175;
  const tipY = 0.42;       // tip offset below head centre (unit space)
  let inside = false;
  const distHead = Math.hypot(px, py);
  if (distHead <= headR) inside = true;
  else if (py > 0 && py < tipY) {
    const half = headR * (tipY - py) / tipY; // cone from head to tip
    if (Math.abs(px) <= half) inside = true;
  }
  // Anti-aliased pin edge (~1.2px at 512)
  const edge = Math.min(
    inside ? 1 : 0,
    Math.max(
      inside ? 1 : 0,
      smooth(0.0035, -0.0035, distHead - headR)
    )
  );
  if (inside) {
    // green hole dot in the head
    const dotR = 0.062;
    const dotMix = 1 - smooth(dotR - 0.003, dotR + 0.003, distHead);
    r = lerp(WHITE[0], DOT_GREEN[0], dotMix);
    g = lerp(WHITE[1], DOT_GREEN[1], dotMix);
    b = lerp(WHITE[2], DOT_GREEN[2], dotMix);
    void edge;
  }

  return [r, g, b, a];
};

const render = (size, mode) => {
  const SS = 3; // supersample factor
  const big = size * SS;
  const acc = new Float64Array(size * size * 4);
  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const [r, g, b, a] = sample((x + 0.5) / big, (y + 0.5) / big, mode);
      const idx = ((y / SS | 0) * size + (x / SS | 0)) * 4;
      acc[idx] += r; acc[idx + 1] += g; acc[idx + 2] += b; acc[idx + 3] += a;
    }
  }
  const pixels = Buffer.alloc(size * size * 4);
  const n = SS * SS;
  for (let i = 0; i < acc.length; i++) pixels[i] = Math.round(acc[i] / n);
  return encodePng(pixels, size, size);
};

mkdirSync(OUT, { recursive: true });
const targets = [
  ['icon-192.png', 192, 'rounded'],
  ['icon-512.png', 512, 'rounded'],
  ['maskable-512.png', 512, 'maskable'],
  ['apple-touch-icon-180.png', 180, 'rounded'],
];
for (const [name, size, mode] of targets) {
  writeFileSync(join(OUT, name), render(size, mode));
  console.log('✓', name, `(${size}x${size}, ${mode})`);
}
