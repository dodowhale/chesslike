#!/usr/bin/env bun
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

type Pixel = readonly [number, number, number, number];

const SIZE = 32;
const PIECES = ['K', 'Q', 'R', 'B', 'N', 'P'] as const;
const SIDES = ['w', 'b'] as const;

const PIECE_TINT: Record<(typeof PIECES)[number], Pixel> = {
  K: [255, 196, 96, 255],
  Q: [216, 96, 216, 255],
  R: [232, 96, 96, 255],
  B: [96, 168, 232, 255],
  N: [104, 200, 120, 255],
  P: [232, 168, 96, 255],
};

const FONT_5x7: Record<(typeof PIECES)[number], readonly string[]> = {
  K: ['X...X', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..X.', 'X...X'],
  Q: ['.XXX.', 'X...X', 'X...X', 'X.X.X', 'X..XX', '.XXX.', '....X'],
  R: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'],
  B: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X...X', 'X...X', 'XXXX.'],
  N: ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X', 'X...X', 'X...X'],
  P: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....'],
};

function makePixels(side: (typeof SIDES)[number], type: (typeof PIECES)[number]): Pixel[][] {
  const isWhite = side === 'w';
  const bg: Pixel = isWhite ? [240, 240, 235, 255] : [40, 40, 50, 255];
  const fg: Pixel = isWhite ? [30, 30, 40, 255] : [240, 240, 235, 255];
  const accent = PIECE_TINT[type];

  const grid: Pixel[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => [0, 0, 0, 0] as Pixel),
  );

  // Rounded-corner background fill
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = Math.min(x, SIZE - 1 - x);
      const dy = Math.min(y, SIZE - 1 - y);
      if (dx === 0 && dy === 0) continue;
      if (dx === 0 && dy === 1) continue;
      if (dx === 1 && dy === 0) continue;
      const row = grid[y]!;
      row[x] = bg;
    }
  }

  // Border
  for (let i = 2; i < SIZE - 2; i++) {
    const top = grid[1]!;
    const bot = grid[SIZE - 2]!;
    top[i] = accent;
    bot[i] = accent;
    const rowI = grid[i]!;
    rowI[1] = accent;
    rowI[SIZE - 2] = accent;
  }

  // 5x7 glyph scaled 3x → 15x21, centered
  const glyph = FONT_5x7[type];
  const scale = 3;
  const glyphW = 5 * scale;
  const glyphH = 7 * scale;
  const offX = Math.floor((SIZE - glyphW) / 2);
  const offY = Math.floor((SIZE - glyphH) / 2);

  for (let gy = 0; gy < 7; gy++) {
    const lineRaw = glyph[gy];
    if (!lineRaw) continue;
    const line = lineRaw;
    for (let gx = 0; gx < 5; gx++) {
      if (line[gx] !== 'X') continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const py = offY + gy * scale + sy;
          const px = offX + gx * scale + sx;
          if (py < 0 || py >= SIZE || px < 0 || px >= SIZE) continue;
          const row = grid[py]!;
          row[px] = fg;
        }
      }
    }
  }

  return grid;
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(pixels: Pixel[][]): Buffer {
  const w = pixels[0]!.length;
  const h = pixels.length;

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(h * (1 + w * 4));
  let off = 0;
  for (let y = 0; y < h; y++) {
    raw[off++] = 0; // filter: none
    const row = pixels[y]!;
    for (let x = 0; x < w; x++) {
      const p = row[x]!;
      raw[off++] = p[0];
      raw[off++] = p[1];
      raw[off++] = p[2];
      raw[off++] = p[3];
    }
  }
  const idat = deflateSync(raw);
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', iend),
  ]);
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'client', 'public', 'assets', 'pieces');
mkdirSync(outDir, { recursive: true });

let written = 0;
for (const side of SIDES) {
  for (const type of PIECES) {
    const pixels = makePixels(side, type);
    const png = encodePng(pixels);
    const file = resolve(outDir, `${side}${type}.png`);
    writeFileSync(file, png);
    written++;
  }
}
console.log(`✓ Wrote ${written} placeholder PNGs to ${outDir}`);
