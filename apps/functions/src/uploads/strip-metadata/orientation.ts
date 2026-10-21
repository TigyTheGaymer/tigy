// The EXIF orientation: read from the dropped metadata, and written back alone.

/** A broken EXIF block is dropped like any other, so it never fails the upload. */
export function readTiffOrientation(tiff: Buffer): number | undefined {
  try {
    return readOrientationTag(tiff);
  } catch {
    return undefined;
  }
}

function readOrientationTag(tiff: Buffer): number | undefined {
  if (tiff.length < 8) return undefined;
  const isLittleEndian = tiff.toString('latin1', 0, 2) === 'II';
  const u16 = (o: number) =>
    isLittleEndian ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o);
  const u32 = (o: number) =>
    isLittleEndian ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o);
  const ifd = u32(4);
  if (ifd + 2 > tiff.length) return undefined;
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > tiff.length) break;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : undefined;
    }
  }
  return undefined;
}

/** A big-endian TIFF header and IFD0 with one entry: Orientation (SHORT). */
export function minimalTiff(orientation: number): Buffer {
  const tiff = Buffer.alloc(8 + 2 + 12 + 4);
  tiff.write('MM', 0, 'latin1');
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4);
  tiff.writeUInt16BE(1, 8);
  tiff.writeUInt16BE(0x0112, 10);
  tiff.writeUInt16BE(3, 12);
  tiff.writeUInt32BE(1, 14);
  tiff.writeUInt16BE(orientation, 18);
  tiff.writeUInt32BE(0, 22);
  return tiff;
}
