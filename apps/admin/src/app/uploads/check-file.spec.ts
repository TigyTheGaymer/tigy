import { checkFile, REFUSAL_MESSAGES } from './check-file';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MP4 = [0, 0, 0, 24, ...new TextEncoder().encode('ftypisom')];
const MOV = [0, 0, 0, 20, ...new TextEncoder().encode('ftypqt  ')];

const withHead = (head: number[], name: string, size: number, type: string) =>
  new File([new Uint8Array(head), new Uint8Array(size - head.length)], name, {
    type,
  });
const png = (name: string, size = 64, type = 'image/png') =>
  withHead(PNG, name, size, type);

describe('checkFile', () => {
  it('Unsupported format: refuses a HEIC photo', async () => {
    const heic = new File(
      [new Uint8Array([0, 0, 0, 24]), new TextEncoder().encode('ftypheic')],
      'photo.heic',
      { type: 'image/heic' },
    );
    expect(await checkFile(heic)).toEqual({ refusal: 'unsupported' });
    expect(REFUSAL_MESSAGES.unsupported).toBe(
      'Only JPEG, PNG, GIF, WebP, MP4, MOV and WebM are supported.',
    );
  });

  it('Too large: refuses a 60 MB PNG', async () => {
    expect(await checkFile(png('big.png', 60 * 1024 * 1024))).toEqual({
      refusal: 'image-too-large',
    });
    expect(REFUSAL_MESSAGES['image-too-large']).toBe(
      'The limit for images is 50 MB.',
    );
  });

  it('accepts a file of exactly 50 MB', async () => {
    expect(await checkFile(png('limit.png', 50 * 1024 * 1024))).toEqual({
      format: 'png',
    });
  });

  it('Large video: accepts a 120 MB MP4', async () => {
    const mp4 = withHead(MP4, 'clip.mp4', 120 * 1024 * 1024, 'video/mp4');
    expect(await checkFile(mp4)).toEqual({ format: 'mp4' });
  });

  it('Video too large: refuses a 250 MB MOV', async () => {
    const mov = withHead(MOV, 'clip.mov', 250 * 1024 * 1024, 'video/quicktime');
    expect(await checkFile(mov)).toEqual({ refusal: 'video-too-large' });
    expect(REFUSAL_MESSAGES['video-too-large']).toBe(
      'The limit for videos is 200 MB.',
    );
  });

  it('refuses a video where only images may go', async () => {
    const mp4 = withHead(MP4, 'clip.mp4', 64, 'video/mp4');
    expect(await checkFile(mp4, { includeVideo: false })).toEqual({
      refusal: 'not-an-image',
    });
    expect(await checkFile(png('a.png'), { includeVideo: false })).toEqual({
      format: 'png',
    });
  });

  it('Wrong extension: judges a PNG named .jpg by its content', async () => {
    expect(await checkFile(png('piece.jpg', 64, 'image/jpeg'))).toEqual({
      format: 'png',
    });
  });

  it('accepts a PNG without an extension or type', async () => {
    expect(await checkFile(png('piece', 64, ''))).toEqual({ format: 'png' });
  });
});
