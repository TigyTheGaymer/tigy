import type { ImageFormat } from '@tigy/uploads';
import sharp from 'sharp';
import UPNG from 'upng-js';
import { animatedGif, makeApng, picture } from '../../testing/images';
import { DamagedImageError, stripMetadata } from './strip-metadata';
import { pngChunk } from './strip-png';

const exif = {
  IFD0: {
    Make: 'Canon',
    Model: 'EOS R5',
    Software: 'Photoshop',
    Artist: 'Secret Name',
  },
  IFD2: { DateTimeOriginal: '2026:01:02 03:04:05', LensModel: 'RF 50mm' },
  IFD3: {
    GPSLatitudeRef: 'N',
    GPSLatitude: '47/1 22/1 1234/100',
    GPSLongitudeRef: 'E',
    GPSLongitude: '8/1 32/1 5678/100',
  },
};
const xmp =
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
  '<rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Secret Name</dc:creator>' +
  '</rdf:Description></rdf:RDF></x:xmpmeta>';

const frame = (hue: number) => picture(96, 64, { hue });

async function photoJpeg(): Promise<Buffer> {
  const jpeg = await frame(40)
    .jpeg({ quality: 90 })
    .withIccProfile('p3')
    .withExif(exif)
    .withXmp(xmp)
    .toBuffer();
  const comment = Buffer.concat([
    Buffer.from([0xff, 0xfe, 0x00, 0x12]),
    Buffer.from('made by someone', 'latin1'),
    Buffer.from([0]),
  ]);
  return Buffer.concat([jpeg.subarray(0, 2), comment, jpeg.subarray(2)]);
}

async function exifTiff(): Promise<Buffer> {
  const { exif: block } = await sharp(await photoJpeg()).metadata();
  if (!block) throw new Error('The photo fixture has no EXIF.');
  return block.subarray(6);
}

const fixtures: Record<string, () => Promise<Buffer>> = {
  'JPEG with GPS, camera data, XMP, a P3 profile and a comment': photoJpeg,
  'JPEG stored sideways': () =>
    frame(150)
      .jpeg()
      .withExif(exif)
      .withMetadata({ orientation: 6 })
      .toBuffer(),
  'PNG with text, tIME and eXIf': async () => {
    const png = await frame(90).png().withIccProfile('p3').toBuffer();
    const afterIhdr = 8 + 25;
    return Buffer.concat([
      png.subarray(0, afterIhdr),
      pngChunk('tEXt', Buffer.from('Author\0Secret Name', 'latin1')),
      pngChunk('tIME', Buffer.from([0x07, 0xea, 1, 2, 3, 4, 5])),
      pngChunk('eXIf', await exifTiff()),
      png.subarray(afterIhdr),
    ]);
  },
  'APNG with text and eXIf': async () => {
    const pngs = await Promise.all(
      [60, 180].map((h) =>
        frame(h).png({ compressionLevel: 9 }).withIccProfile('p3').toBuffer(),
      ),
    );
    return makeApng(pngs, [
      pngChunk('tEXt', Buffer.from('Comment\0secret', 'latin1')),
      pngChunk('eXIf', await exifTiff()),
    ]);
  },
  'animated GIF with a comment and XMP': async () => {
    const gif = await animatedGif(96, 64);
    const comment = Buffer.concat([
      Buffer.from([0x21, 0xfe, 11]),
      Buffer.from('secret note', 'latin1'),
      Buffer.from([0]),
    ]);
    const xmpBody = Buffer.from(xmp, 'latin1');
    const xmpExtension = Buffer.concat([
      Buffer.from([0x21, 0xff, 11]),
      Buffer.from('XMP DataXMP', 'latin1'),
      // One sub-block holds at most 255 bytes.
      ...Array.from({ length: Math.ceil(xmpBody.length / 255) }, (_, i) => {
        const part = xmpBody.subarray(i * 255, i * 255 + 255);
        return Buffer.concat([Buffer.from([part.length]), part]);
      }),
      Buffer.from([0]),
    ]);
    const flags = gif[10];
    const afterColours = 13 + (flags & 0x80 ? 3 * (1 << ((flags & 7) + 1)) : 0);
    return Buffer.concat([
      gif.subarray(0, afterColours),
      comment,
      xmpExtension,
      gif.subarray(afterColours),
    ]);
  },
  'still WebP with a P3 profile, EXIF and XMP': () =>
    frame(200)
      .webp({ lossless: true })
      .withIccProfile('p3')
      .withExif(exif)
      .withXmp(xmp)
      .toBuffer(),
  'animated WebP with EXIF': async () => {
    const frames = await Promise.all(
      [30, 120, 210].map((h) => frame(h).png().toBuffer()),
    );
    return sharp(frames, { join: { animated: true } })
      .webp({ delay: [80, 120, 200], loop: 2 })
      .withExif(exif)
      .toBuffer();
  },
};

function formatOf(name: string): ImageFormat {
  if (name.startsWith('JPEG')) return 'jpeg';
  if (name.includes('PNG')) return 'png';
  if (name.includes('GIF')) return 'gif';
  return 'webp';
}

const decode = (buf: Buffer) =>
  sharp(buf, { animated: true }).raw().toBuffer({ resolveWithObject: true });

function apngFrames(buf: Buffer) {
  const image = UPNG.decode(
    buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.length,
    ) as ArrayBuffer,
  );
  return {
    frames: UPNG.toRGBA8(image).map((f) => Buffer.from(f)),
    delays: image.frames.map((f) => f.delay),
  };
}

describe.each(Object.keys(fixtures))('stripMetadata: %s', (name) => {
  const format = formatOf(name);
  let original: Buffer;
  let stripped: Buffer;
  let orientation: number;

  beforeAll(async () => {
    original = await fixtures[name]();
    ({ data: stripped, orientation } = stripMetadata(original, format));
  });

  it('keeps every pixel of every frame', async () => {
    const before = await decode(original);
    const after = await decode(stripped);
    expect(after.info).toMatchObject({
      width: before.info.width,
      height: before.info.height,
    });
    expect(after.data.equals(before.data)).toBe(true);
  });

  it('keeps the frame count, delays and loop', async () => {
    const before = await sharp(original, { animated: true }).metadata();
    const after = await sharp(stripped, { animated: true }).metadata();
    expect(after.pages).toBe(before.pages);
    expect(after.delay).toEqual(before.delay);
    expect(after.loop).toBe(before.loop);
  });

  it('keeps the colour profile byte for byte', async () => {
    const before = await sharp(original).metadata();
    const after = await sharp(stripped).metadata();
    expect(after.icc ?? null).toEqual(before.icc ?? null);
  });

  it('removes EXIF, XMP, IPTC and text, keeping only the orientation', async () => {
    const after = await sharp(stripped).metadata();
    // sharp sees no GIF metadata, so the fixture's own bytes prove it had some.
    expect(original.includes('Secret Name')).toBe(true);
    expect(after.xmp).toBeUndefined();
    expect(after.iptc).toBeUndefined();
    expect(after.comments ?? []).toEqual([]);
    if (orientation === 1) {
      expect(after.exif).toBeUndefined();
    } else {
      // An orientation-only EXIF block is 36 bytes: no GPS or camera data fits.
      expect(after.exif?.length).toBeLessThanOrEqual(40);
      expect(after.orientation).toBe(orientation);
    }
    expect(stripped.includes('Secret Name')).toBe(false);
    expect(stripped.includes('Canon')).toBe(false);
  });

  it('finds nothing more to remove the second time', () => {
    expect(stripMetadata(stripped, format).data.equals(stripped)).toBe(true);
  });

  it('fails as damaged when the file is cut off', () => {
    const cut = original.subarray(0, Math.floor(original.length / 2));
    expect(() => stripMetadata(cut, format)).toThrow(DamagedImageError);
  });
});

describe('stripMetadata, format details', () => {
  it('Rotated photo: keeps the orientation of a sideways JPEG', async () => {
    const original = await fixtures['JPEG stored sideways']();
    const { data, orientation } = stripMetadata(original, 'jpeg');
    expect(orientation).toBe(6);
    expect((await sharp(data).metadata()).orientation).toBe(6);
  });

  it('Animated GIF: keeps all frames with their delays and loop count', async () => {
    const original = await fixtures['animated GIF with a comment and XMP']();
    const { data } = stripMetadata(original, 'gif');
    const after = await sharp(data, { animated: true }).metadata();
    expect(after.pages).toBe(3);
    expect(after.delay).toEqual([80, 120, 200]);
    expect(after.loop).toBe(0);
  });

  it('keeps the frames and delays of an APNG, checked with a second decoder', async () => {
    const original = await fixtures['APNG with text and eXIf']();
    const { data } = stripMetadata(original, 'png');
    const before = apngFrames(original);
    const after = apngFrames(data);
    expect(after.frames).toHaveLength(2);
    expect(after.delays).toEqual(before.delays);
    after.frames.forEach((f, i) =>
      expect(f.equals(before.frames[i])).toBe(true),
    );
  });

  it('fails as damaged on an unknown critical PNG chunk', async () => {
    const png = await frame(10).png().toBuffer();
    const afterIhdr = 8 + 25;
    const odd = Buffer.concat([
      png.subarray(0, afterIhdr),
      pngChunk('ZZZZ', Buffer.from('x')),
      png.subarray(afterIhdr),
    ]);
    expect(() => stripMetadata(odd, 'png')).toThrow(DamagedImageError);
  });

  it('fails as damaged when a length points past the end', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 0x00]);
    expect(() => stripMetadata(jpeg, 'jpeg')).toThrow(DamagedImageError);
    const gif = Buffer.concat([
      Buffer.from('GIF89a', 'latin1'),
      Buffer.alloc(7),
      Buffer.from([0x21, 0xfe, 200, 1, 2]),
    ]);
    expect(() => stripMetadata(gif, 'gif')).toThrow(DamagedImageError);
  });
});
