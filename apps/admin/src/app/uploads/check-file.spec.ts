import { checkFile } from './check-file';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const png = (name: string, size = 64, type = 'image/png') =>
  new File([new Uint8Array(PNG), new Uint8Array(size - PNG.length)], name, {
    type,
  });

describe('checkFile', () => {
  it('Unsupported format: refuses a HEIC photo', async () => {
    const heic = new File(
      [new Uint8Array([0, 0, 0, 24]), new TextEncoder().encode('ftypheic')],
      'photo.heic',
      { type: 'image/heic' },
    );
    expect(await checkFile(heic)).toEqual({ refusal: 'unsupported' });
  });

  it('Too large: refuses a 60 MB PNG', async () => {
    expect(await checkFile(png('big.png', 60 * 1024 * 1024))).toEqual({
      refusal: 'too-large',
    });
  });

  it('accepts a file of exactly 50 MB', async () => {
    expect(await checkFile(png('limit.png', 50 * 1024 * 1024))).toEqual({
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
