#!/usr/bin/env bun
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

type Pixel = readonly [number, number, number, number];

const SIZE = 32;
const PIECES = ['K', 'Q', 'R', 'B', 'N', 'P'] as const;
const SIDES = ['w', 'b'] as const;

const PIECE_COLORS = {
  wFill: [0xf5, 0xe9, 0xd3, 0xff] as const,    // 옅은 아이보리 우드
  wOutline: [0x2a, 0x20, 0x17, 0xff] as const, // 다크 브라운
  bFill: [0x2f, 0x23, 0x1a, 0xff] as const,    // 짙은 우드
  bOutline: [0x7a, 0x5a, 0x40, 0xff] as const, // mid 브라운
} as const;

// NOTE: 각 행 끝의 trailing space는 의미 있는 픽셀(투명)이다. 에디터의 trim-trailing-whitespace 옵션이 켜져 있으면 글리프가 손상될 수 있으므로, 본 블록을 편집할 때는 해당 옵션을 끄거나 .editorconfig로 보호할 것. 위 GLYPH_ROW 어설션이 잘못된 길이/문자를 빌드 시점에 차단한다.
const PIECE_GLYPH: Record<(typeof PIECES)[number], readonly string[]> = {
  K: [
    '                                ',
    '                                ',
    '              ....              ',
    '              .XX.              ',
    '           ..........           ',
    '           .XXXXXXXX.           ',
    '           ..........           ',
    '              .XX.              ',
    '        .     ....     .        ',
    '       .X.   .XXXX.   .X.       ',
    '      .XXX. .XXXXXX. .XXX.      ',
    '      .XXXXXXXXXXXXXXXXXX.      ',
    '       ..................       ',
    '       .XXXXXXXXXXXXXXXX.       ',
    '      .XXXXXXXXXXXXXXXXXX.      ',
    '      .XXXXXXXXXXXXXXXXXX.      ',
    '       .XXXXXXXXXXXXXXXX.       ',
    '        .XXXXXXXXXXXXXX.        ',
    '         .XXXXXXXXXXXX.         ',
    '          .XXXXXXXXXX.          ',
    '          .XXXXXXXXXX.          ',
    '         .XXXXXXXXXXXX.         ',
    '        .XXXXXXXXXXXXXX.        ',
    '       .XXXXXXXXXXXXXXXX.       ',
    '      .XXXXXXXXXXXXXXXXXX.      ',
    '      ....................      ',
    '       .XXXXXXXXXXXXXXXX.       ',
    '      .XXXXXXXXXXXXXXXXXX.      ',
    '      .XXXXXXXXXXXXXXXXXX.      ',
    '     .XXXXXXXXXXXXXXXXXXXX.     ',
    '     ......................     ',
    '                                ',
  ],
  Q: [
    '                                ',
    '                                ',
    '                                ',
    '                .               ',
    '        .   .   X   .   .       ',
    '       .X. .X. .X. .X. .X.      ',
    '      .XXX.XXX.XXX.XXX.XXX.     ',
    '      .XXXXXXXXXXXXXXXXXXX.     ',
    '       ...................      ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '       .XXXXXXXXXXXXXXXXXX.     ',
    '       .XXXXXXXXXXXXXXXXXX.     ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '         .XXXXXXXXXXXXXX.       ',
    '          .XXXXXXXXXXXX.        ',
    '           .XXXXXXXXXX.         ',
    '           .XXXXXXXXXX.         ',
    '          .XXXXXXXXXXXX.        ',
    '         .XXXXXXXXXXXXXX.       ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '       .XXXXXXXXXXXXXXXXXX.     ',
    '      .XXXXXXXXXXXXXXXXXXXX.    ',
    '      .XXXXXXXXXXXXXXXXXXXX.    ',
    '       ....................     ',
    '       .XXXXXXXXXXXXXXXXXX.     ',
    '      .XXXXXXXXXXXXXXXXXXXX.    ',
    '      .XXXXXXXXXXXXXXXXXXXX.    ',
    '      ......................    ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
  ],
  R: [
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '       ...  ....  ....  ...     ',
    '      .XXX..XXXX..XXXX..XXX.    ',
    '      .XXX..XXXX..XXXX..XXX.    ',
    '      .XXX..XXXX..XXXX..XXX.    ',
    '      .XXXXXXXXXXXXXXXXXXXX.    ',
    '      .XXXXXXXXXXXXXXXXXXXX.    ',
    '       ....................     ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '        .XXXXXXXXXXXXXXXX.      ',
    '       .XXXXXXXXXXXXXXXXXX.     ',
    '      .XXXXXXXXXXXXXXXXXXXX.    ',
    '      .XXXXXXXXXXXXXXXXXXXX.    ',
    '      ....................      ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
  ],
  B: [
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '              ..                ',
    '             .XX.               ',
    '              ..                ',
    '             .XX.               ',
    '            .XXXX.              ',
    '           .XXXXXX.             ',
    '          .XXX..XX.             ',
    '          .X..XXXX.             ',
    '          .XXXXXXX.             ',
    '           .XXXXX.              ',
    '            .XXX.               ',
    '            .XXX.               ',
    '           .XXXXX.              ',
    '          .XXXXXXX.             ',
    '         .XXXXXXXXX.            ',
    '        .XXXXXXXXXXX.           ',
    '         .XXXXXXXXX.            ',
    '          .........             ',
    '        .XXXXXXXXXXX.           ',
    '       .XXXXXXXXXXXXX.          ',
    '      .XXXXXXXXXXXXXXX.         ',
    '      ...............           ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
  ],
  N: [
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '            ......              ',
    '           .XXXXXX.             ',
    '          .XXXXXXXX.            ',
    '         .XXXXXXXXX.            ',
    '        .XXXXX..XXXX.           ',
    '       .XXXX..XXXXX.            ',
    '       .XXX.X..XX.XX.           ',
    '      .XXXX. .XXXXXX.           ',
    '      .XX.. .XXXXXXX.           ',
    '       ..   .XXXXXXX.           ',
    '            .XXXXXX.            ',
    '           .XXXXXXX.            ',
    '          .XXXXXXXX.            ',
    '         .XXXXXXXXX.            ',
    '        .XXXXXXXXXX.            ',
    '       .XXXXXXXXXXX.            ',
    '       .XXXXXXXXXXX.            ',
    '       .XXXXXXXXXXX.            ',
    '       .XXXXXXXXXXX.            ',
    '       .XXXXXXXXXXX.            ',
    '      .XXXXXXXXXXXXX.           ',
    '      .XXXXXXXXXXXXX.           ',
    '      ...............           ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
  ],
  P: [
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '              ....              ',
    '             .XXXX.             ',
    '            .XXXXXX.            ',
    '            .XXXXXX.            ',
    '             .XXXX.             ',
    '              ....              ',
    '              .XX.              ',
    '            .XXXXXX.            ',
    '           .XXXXXXXX.           ',
    '          .XXXXXXXXXX.          ',
    '           .XXXXXXXX.           ',
    '             .XXXX.             ',
    '           .XXXXXXXX.           ',
    '          .XXXXXXXXXX.          ',
    '         .XXXXXXXXXXXX.         ',
    '        .XXXXXXXXXXXXXX.        ',
    '        .XXXXXXXXXXXXXX.        ',
    '       .XXXXXXXXXXXXXXXX.       ',
    '      .XXXXXXXXXXXXXXXXXX.      ',
    '      .XXXXXXXXXXXXXXXXXX.      ',
    '      ....................      ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
    '                                ',
  ],
};

function makePixels(side: (typeof SIDES)[number], type: (typeof PIECES)[number]): Pixel[][] {
  const fill: Pixel = side === 'w'
    ? ([...PIECE_COLORS.wFill] as unknown as Pixel)
    : ([...PIECE_COLORS.bFill] as unknown as Pixel);
  const outline: Pixel = side === 'w'
    ? ([...PIECE_COLORS.wOutline] as unknown as Pixel)
    : ([...PIECE_COLORS.bOutline] as unknown as Pixel);
  const transparent: Pixel = [0, 0, 0, 0];

  const grid: Pixel[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => transparent),
  );

  const glyph = PIECE_GLYPH[type];
  for (let y = 0; y < SIZE; y++) {
    const row = glyph[y];
    if (!row) continue;
    for (let x = 0; x < SIZE; x++) {
      const ch = row[x];
      if (ch === 'X') grid[y]![x] = fill;
      else if (ch === '.') grid[y]![x] = outline;
      // space stays transparent
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

// Glyph integrity assertion — 32 rows × 32 chars per piece
const GLYPH_ROW = /^[ .X]{32}$/;
for (const type of PIECES) {
  const glyph = PIECE_GLYPH[type];
  if (glyph.length !== SIZE) {
    throw new Error(`PIECE_GLYPH[${type}]: expected ${SIZE} rows, got ${glyph.length}`);
  }
  glyph.forEach((row, i) => {
    if (row.length !== SIZE) {
      throw new Error(`PIECE_GLYPH[${type}][${i}]: expected ${SIZE} chars, got ${row.length}`);
    }
    if (!GLYPH_ROW.test(row)) {
      throw new Error(`PIECE_GLYPH[${type}][${i}]: non-canonical character (only ' ', '.', 'X' allowed)`);
    }
  });
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
