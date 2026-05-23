#!/usr/bin/env bun
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const files = ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm'];
const candidates = [
  resolve(root, 'client', 'node_modules', 'stockfish', 'bin'),
  resolve(root, 'node_modules', 'stockfish', 'bin'),
];
const outDir = resolve(root, 'client', 'public', 'stockfish');

const srcDir = candidates.find((dir) => files.every((f) => existsSync(resolve(dir, f))));
if (!srcDir) {
  console.warn(
    '[copy-stockfish] stockfish 패키지를 찾을 수 없습니다. ' +
      '`bun install` 후 다시 실행하세요. 후보 경로:\n' +
      candidates.map((c) => `  - ${c}`).join('\n'),
  );
  process.exit(0); // 빌드는 통과시키되 사용자에게 알림
}

mkdirSync(outDir, { recursive: true });
for (const file of files) {
  copyFileSync(resolve(srcDir, file), resolve(outDir, file));
}
console.log(`✓ Copied ${files.length} stockfish files from ${srcDir} → ${outDir}`);
