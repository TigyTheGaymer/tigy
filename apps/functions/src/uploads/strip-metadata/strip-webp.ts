import { need, type StrippedImage } from './stripped-image';
import { minimalTiff, readTiffOrientation } from './orientation';

const WEBP_KEEP = new Set([
  'VP8X',
  'ICCP',
  'ANIM',
  'ANMF',
  'ALPH',
  'VP8 ',
  'VP8L',
]);
const VP8X_EXIF = 0x08;
const VP8X_XMP = 0x04;

export function stripWebp(buf: Buffer): StrippedImage {
  const chunks: Buffer[] = [];
  const removed: string[] = [];
  let orientation = 1;
  let vp8x: Buffer | undefined;
  const riffEnd = 8 + buf.readUInt32LE(4);
  need(riffEnd <= buf.length, 'webp: cut off before the end of the RIFF data');

  let pos = 12;
  while (pos + 8 <= riffEnd) {
    const type = buf.toString('latin1', pos, pos + 4);
    const len = buf.readUInt32LE(pos + 4);
    const next = pos + 8 + len + (len & 1); // chunks are padded to an even length
    need(pos + 8 + len <= riffEnd, `webp: chunk ${type} runs past the end`);
    const chunk = buf.subarray(pos, Math.min(next, riffEnd));
    if (type === 'VP8X') {
      vp8x = Buffer.from(chunk); // a copy: its flags are rewritten below
      chunks.push(vp8x);
    } else if (WEBP_KEEP.has(type)) {
      chunks.push(chunk);
    } else {
      if (type === 'EXIF') {
        const data = buf.subarray(pos + 8, pos + 8 + len);
        const tiff =
          data.toString('latin1', 0, 6) === 'Exif\0\0'
            ? data.subarray(6)
            : data;
        orientation = readTiffOrientation(tiff) ?? 1;
      }
      removed.push(`${type.trim()} (${len} bytes)`);
    }
    pos = next;
  }
  if (riffEnd < buf.length) {
    removed.push(`trailer after RIFF (${buf.length - riffEnd} bytes)`);
  }

  if (vp8x) {
    vp8x[8] &= ~(VP8X_EXIF | VP8X_XMP);
    if (orientation !== 1) {
      vp8x[8] |= VP8X_EXIF;
      chunks.push(webpChunk('EXIF', minimalTiff(orientation))); // EXIF goes after the image data
    }
  }
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(12);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(4 + body.length, 4);
  head.write('WEBP', 8, 'latin1');
  return { data: Buffer.concat([head, body]), orientation, removed };
}

function webpChunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.write(type, 0, 'latin1');
  head.writeUInt32LE(data.length, 4);
  return Buffer.concat([head, data, Buffer.alloc(data.length & 1)]);
}
