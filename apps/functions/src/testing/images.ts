import sharp from 'sharp';
import { pngChunk } from '../uploads/strip-metadata/strip-png';

// Test helpers only; excluded from the functions build. Image fixtures made
// with sharp, so no binary files live in the repository.

/** A picture with a dark circle on a coloured background, so resizing has something to keep. */
export function picture(
  width: number,
  height: number,
  { hue = 90, alpha = 1 }: { hue?: number; alpha?: number } = {},
) {
  const r = Math.min(width, height) / 4;
  const circle = `<svg width="${width}" height="${height}"><circle cx="${width / 2}" cy="${height / 2}" r="${r}" fill="#123"/></svg>`;
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: hue, g: 255 - hue, b: 120, alpha },
    },
  }).composite([{ input: Buffer.from(circle) }]);
}

/** A three-frame animated GIF. */
export async function animatedGif(
  width: number,
  height: number,
): Promise<Buffer> {
  const frames = await Promise.all(
    [30, 120, 210].map((hue) =>
      picture(width, height, { hue }).png().toBuffer(),
    ),
  );
  return sharp(frames, { join: { animated: true } })
    .gif({ delay: [80, 120, 200], loop: 0 })
    .toBuffer();
}

export function chunksOf(png: Buffer) {
  const chunks: { type: string; data: Buffer; raw: Buffer }[] = [];
  for (let p = 8; p < png.length;) {
    const len = png.readUInt32BE(p);
    chunks.push({
      type: png.toString('latin1', p + 4, p + 8),
      data: png.subarray(p + 8, p + 8 + len),
      raw: png.subarray(p, p + 12 + len),
    });
    p += 12 + len;
  }
  return chunks;
}

/**
 * An APNG made from PNG frames of the same size, with delays of 25 and 75
 * hundredths. `extra` chunks go before the first frame; the first PNG's
 * `IHDR` and `iCCP` are kept.
 */
export function makeApng(pngs: Buffer[], extra: Buffer[] = []): Buffer {
  const first = chunksOf(pngs[0]);
  // IHDR is always a PNG's first chunk.
  const ihdr = first[0].data;
  const [width, height] = [ihdr.readUInt32BE(0), ihdr.readUInt32BE(4)];
  const idat = (png: Buffer) =>
    Buffer.concat(
      chunksOf(png)
        .filter((c) => c.type === 'IDAT')
        .map((c) => c.data),
    );
  let sequence = 0;
  const fctl = (delay: number) =>
    pngChunk(
      'fcTL',
      Buffer.concat([
        ...[sequence++, width, height, 0, 0].map(u32),
        u16(delay),
        u16(100),
        Buffer.from([0, 0]),
      ]),
    );
  const frames = pngs.flatMap((png, i) => {
    const control = fctl(i % 2 ? 75 : 25);
    if (i === 0) return [control, pngChunk('IDAT', idat(png))];
    return [
      control,
      pngChunk('fdAT', Buffer.concat([u32(sequence++), idat(png)])),
    ];
  });
  return Buffer.concat([
    pngs[0].subarray(0, 8),
    ...first
      .filter((c) => c.type === 'IHDR' || c.type === 'iCCP')
      .map((c) => c.raw),
    pngChunk('acTL', Buffer.concat([u32(pngs.length), u32(0)])),
    ...extra,
    ...frames,
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n);
  return b;
}
