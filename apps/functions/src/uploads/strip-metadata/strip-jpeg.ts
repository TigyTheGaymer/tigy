import { need, type StrippedImage } from './stripped-image';
import { minimalTiff, readTiffOrientation } from './orientation';

export function stripJpeg(buf: Buffer): StrippedImage {
  const out: Buffer[] = [buf.subarray(0, 2)]; // SOI
  const removed: string[] = [];
  let orientation = 1;
  let insertAt = 1; // after SOI, or after the JFIF APP0 when there is one
  let pos = 2;
  let ended = false;

  while (pos < buf.length) {
    need(buf[pos] === 0xff, `jpeg: expected a marker at ${pos}`);
    while (buf[pos + 1] === 0xff) pos++; // fill bytes
    const marker = buf[pos + 1];
    need(marker !== undefined, 'jpeg: cut off in a marker');

    if (marker === 0xd9) {
      // EOI. Anything after it (MPF secondary images, vendor trailers) is dropped.
      out.push(buf.subarray(pos, pos + 2));
      if (pos + 2 < buf.length) {
        removed.push(`trailer after EOI (${buf.length - pos - 2} bytes)`);
      }
      ended = true;
      break;
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(buf.subarray(pos, pos + 2));
      pos += 2;
      continue;
    }

    const len = buf.readUInt16BE(pos + 2);
    let end = pos + 2 + len;
    need(
      len >= 2 && end <= buf.length,
      `jpeg: segment at ${pos} runs past the end`,
    );
    const body = buf.subarray(pos + 4, end);

    if (marker === 0xda) {
      // SOS: the header plus entropy-coded data up to the next real marker.
      while (end < buf.length) {
        if (buf[end] === 0xff) {
          const next = buf[end + 1];
          if (
            next !== 0x00 &&
            !(next >= 0xd0 && next <= 0xd7) &&
            next !== 0xff
          ) {
            break;
          }
        }
        end++;
      }
      out.push(buf.subarray(pos, end));
      pos = end;
      continue;
    }

    const isApp = marker >= 0xe0 && marker <= 0xef;
    const id = body.subarray(0, 14).toString('latin1');
    let keep: boolean;
    if (marker === 0xe0) keep = id.startsWith('JFIF\0');
    else if (marker === 0xe2) keep = id.startsWith('ICC_PROFILE\0');
    else if (marker === 0xee)
      keep = id.startsWith('Adobe'); // colour transform flag
    else keep = !isApp && marker !== 0xfe; // drop other APPn and COM

    if (marker === 0xe1 && id.startsWith('Exif\0\0')) {
      orientation = readTiffOrientation(body.subarray(6)) ?? orientation;
    }
    if (keep) {
      out.push(buf.subarray(pos, end));
      if (marker === 0xe0) insertAt = out.length;
    } else {
      removed.push(
        `${markerName(marker)} ${id.replace(/\0.*$/s, '')} (${len} bytes)`.trim(),
      );
    }
    pos = end;
  }
  need(ended, 'jpeg: cut off before EOI');

  if (orientation !== 1) {
    // Keep only the orientation tag so the image still displays upright.
    const tiff = minimalTiff(orientation);
    const segment = Buffer.alloc(4 + 6 + tiff.length);
    segment.writeUInt16BE(0xffe1, 0);
    segment.writeUInt16BE(2 + 6 + tiff.length, 2);
    segment.write('Exif\0\0', 4, 'latin1');
    tiff.copy(segment, 10);
    out.splice(insertAt, 0, segment);
  }
  return { data: Buffer.concat(out), orientation, removed };
}

function markerName(marker: number): string {
  if (marker >= 0xe0 && marker <= 0xef) return `APP${marker - 0xe0}`;
  if (marker === 0xfe) return 'COM';
  return `0xFF${marker.toString(16).toUpperCase()}`;
}
