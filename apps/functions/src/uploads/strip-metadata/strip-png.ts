import { crc32 } from 'node:zlib';
import { DamagedImageError, need, type StrippedImage } from './stripped-image';
import { minimalTiff, readTiffOrientation } from './orientation';

// PNG and APNG.

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const PNG_KEEP = new Set([
  ...['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS'],
  ...['cHRM', 'gAMA', 'iCCP', 'sBIT', 'sRGB', 'cICP', 'mDCV', 'cLLI'],
  ...['bKGD', 'pHYs'],
  ...['acTL', 'fcTL', 'fdAT'],
]);

export function stripPng(buf: Buffer): StrippedImage {
  const out: Buffer[] = [PNG_SIGNATURE];
  const removed: string[] = [];
  let orientation = 1;
  let pos = 8;
  let ended = false;

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const end = pos + 12 + len;
    need(end <= buf.length, `png: chunk ${type} runs past the end`);
    if (PNG_KEEP.has(type)) {
      out.push(buf.subarray(pos, end));
    } else if (type === 'eXIf') {
      orientation =
        readTiffOrientation(buf.subarray(pos + 8, pos + 8 + len)) ?? 1;
      removed.push(`eXIf (${len} bytes)`);
      if (orientation !== 1)
        out.push(pngChunk('eXIf', minimalTiff(orientation)));
    } else if (type[0] === type[0].toUpperCase()) {
      throw new DamagedImageError(`png: unknown critical chunk ${type}`);
    } else {
      removed.push(`${type} (${len} bytes)`);
    }
    pos = end;
    if (type === 'IEND') {
      if (pos < buf.length) {
        removed.push(`trailer after IEND (${buf.length - pos} bytes)`);
      }
      ended = true;
      break;
    }
  }
  need(ended, 'png: cut off before IEND');
  return { data: Buffer.concat(out), orientation, removed };
}

export function pngChunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0);
  return Buffer.concat([head, data, crc]);
}
