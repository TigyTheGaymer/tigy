// Renders the favicon set from apps/public/public/favicon.svg into both apps: `node tools/favicons.mjs`.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = 'apps/public/public/favicon.svg';
const targets = ['apps/public/public', 'apps/admin/public'];
const icoSizes = [16, 32, 48];

const svg = await readFile(source);

/** The SVG's viewBox is 32 units wide, so the density is chosen to rasterise straight at `size`. */
function png(size) {
  return sharp(svg, { density: (72 * size) / 32 })
    .resize(size, size)
    .png()
    .toBuffer();
}

// sharp can't write ICO, but an ICO may hold PNG frames: a 6-byte header, a 16-byte entry per frame, then the PNGs.
function ico(frames) {
  const header = Buffer.alloc(6 + 16 * frames.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...frames.map((frame) => frame.data)]);
}

const frames = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await png(size) })),
);
const files = {
  'favicon.svg': svg,
  'favicon.ico': ico(frames),
  'apple-touch-icon.png': await png(180),
};

for (const target of targets) {
  for (const [name, data] of Object.entries(files)) {
    await writeFile(`${target}/${name}`, data);
  }
}
