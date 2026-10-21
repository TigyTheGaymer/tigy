import { need, type StrippedImage } from './stripped-image';

const GIF_APP_KEEP = ['NETSCAPE2.0', 'ANIMEXTS1.0', 'ICCRGBG1012'];

export function stripGif(buf: Buffer): StrippedImage {
  const out: Buffer[] = [];
  const removed: string[] = [];
  need(buf.length >= 13, 'gif: cut off in the header');
  let pos = 13;
  const screenFlags = buf[10];
  if (screenFlags & 0x80) pos += 3 * (1 << ((screenFlags & 0x07) + 1));
  need(pos <= buf.length, 'gif: cut off in the colour table');
  out.push(buf.subarray(0, pos));

  const skipSubBlocks = (p: number): number => {
    while (true) {
      need(p < buf.length, 'gif: cut off in a data block');
      if (buf[p] === 0) return p + 1;
      p += buf[p] + 1;
    }
  };

  let ended = false;
  while (pos < buf.length) {
    const intro = buf[pos];
    if (intro === 0x3b) {
      out.push(buf.subarray(pos, pos + 1));
      if (pos + 1 < buf.length) {
        removed.push(`trailer after 0x3B (${buf.length - pos - 1} bytes)`);
      }
      ended = true;
      break;
    }
    if (intro === 0x2c) {
      let p = pos + 10;
      const flags = buf[pos + 9];
      need(flags !== undefined, 'gif: cut off in an image descriptor');
      if (flags & 0x80) p += 3 * (1 << ((flags & 0x07) + 1));
      p = skipSubBlocks(p + 1); // LZW minimum code size, then the image data
      out.push(buf.subarray(pos, p));
      pos = p;
      continue;
    }
    need(
      intro === 0x21,
      `gif: unexpected block 0x${intro.toString(16)} at ${pos}`,
    );
    const label = buf[pos + 1];
    const end = skipSubBlocks(pos + 2);
    let keep: boolean;
    let name = '';
    if (label === 0xf9)
      keep = true; // graphic control: delay, disposal, transparency
    else if (label === 0x01)
      keep = true; // plain text is rendered content
    else if (label === 0xff) {
      name = buf.toString('latin1', pos + 3, pos + 14);
      keep = GIF_APP_KEEP.includes(name);
    } else {
      name = label === 0xfe ? 'comment' : `extension 0x${label.toString(16)}`;
      keep = false;
    }
    if (keep) out.push(buf.subarray(pos, end));
    else {
      removed.push(
        `${label === 0xff ? 'application ' : ''}${name} (${end - pos} bytes)`,
      );
    }
    pos = end;
  }
  need(ended, 'gif: cut off before the trailer');
  return { data: Buffer.concat(out), orientation: 1, removed };
}
