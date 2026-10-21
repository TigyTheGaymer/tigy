import sharp from 'sharp';
import { animatedGif, makeApng, picture } from '../testing/images';
import { makeWebVersions } from './web-versions';

const size = async (webp: Buffer) => {
  const meta = await sharp(webp, { animated: true }).metadata();
  return {
    width: meta.width,
    height: meta.pageHeight ?? meta.height,
    pages: meta.pages ?? 1,
    hasAlpha: meta.hasAlpha,
    format: meta.format,
  };
};

describe('makeWebVersions', () => {
  it('Tall comic: fits the full image in 2048 and the thumbnail in 720, keeping the shape', async () => {
    const comic = await picture(1200, 4800).png().toBuffer();
    const { full, thumb, file } = await makeWebVersions(comic, 'png');
    expect(await size(full)).toMatchObject({
      width: 512,
      height: 2048,
      format: 'webp',
    });
    expect(await size(thumb)).toMatchObject({
      width: 180,
      height: 720,
      format: 'webp',
    });
    expect(file).toEqual({
      w: 1200,
      h: 4800,
      bytes: comic.length,
      mime: 'image/png',
      animated: false,
      transparent: false,
    });
  });

  it('Small sticker: never enlarges, and keeps the transparent background', async () => {
    const sticker = await picture(500, 500, { alpha: 0 }).png().toBuffer();
    const { full, thumb, file } = await makeWebVersions(sticker, 'png');
    expect(await size(full)).toMatchObject({
      width: 500,
      height: 500,
      hasAlpha: true,
    });
    expect(await size(thumb)).toMatchObject({
      width: 500,
      height: 500,
      hasAlpha: true,
    });
    expect(file).toMatchObject({ w: 500, h: 500, transparent: true });
  });

  it('Animated portrait: animates both web versions of an animated GIF', async () => {
    const gif = await animatedGif(1000, 1000);
    const { full, thumb, file } = await makeWebVersions(gif, 'gif');
    expect(await size(full)).toMatchObject({
      width: 1000,
      height: 1000,
      pages: 3,
    });
    expect(await size(thumb)).toMatchObject({
      width: 720,
      height: 720,
      pages: 3,
    });
    expect((await sharp(full, { animated: true }).metadata()).delay).toEqual([
      80, 120, 200,
    ]);
    expect(file).toMatchObject({
      w: 1000,
      h: 1000,
      mime: 'image/gif',
      animated: true,
    });
  });

  it('Animated PNG: makes still web versions of the first frame, and records it as animated', async () => {
    const pngs = await Promise.all(
      [40, 200].map((hue) => picture(300, 200, { hue }).png().toBuffer()),
    );
    const { full, file } = await makeWebVersions(makeApng(pngs), 'png');
    expect(await size(full)).toMatchObject({
      width: 300,
      height: 200,
      pages: 1,
    });
    // The average colour, since WebP is lossy: close to the first frame, far from the second.
    const colour = async (buf: Buffer) => [
      ...(await sharp(buf).removeAlpha().resize(1, 1).raw().toBuffer()),
    ];
    const [shown, first, second] = await Promise.all(
      [full, ...pngs].map(colour),
    );
    shown.forEach((value, i) => {
      expect(Math.abs(value - first[i])).toBeLessThan(8);
    });
    expect(Math.abs(shown[0] - second[0])).toBeGreaterThan(100);
    expect(file).toMatchObject({ w: 300, h: 200, animated: true });
  });

  it('Opaque PNG with an alpha channel: records it as not transparent', async () => {
    const opaque = await picture(400, 300).png().toBuffer();
    expect((await sharp(opaque).metadata()).hasAlpha).toBe(true);
    const { file } = await makeWebVersions(opaque, 'png');
    expect(file.transparent).toBe(false);
  });

  it('Sideways photo: records and shows the upright size', async () => {
    const sideways = await picture(4000, 3000)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const { full, thumb, file } = await makeWebVersions(sideways, 'jpeg');
    expect(file).toMatchObject({ w: 3000, h: 4000, mime: 'image/jpeg' });
    expect(await size(full)).toMatchObject({ width: 1536, height: 2048 });
    expect(await size(thumb)).toMatchObject({ width: 540, height: 720 });
    expect((await sharp(full).metadata()).orientation).toBeUndefined();
  });
});
