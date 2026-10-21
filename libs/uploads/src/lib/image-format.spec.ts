import {
  detectImageFormat,
  FORMAT_SIGNATURE_BYTES,
  IMAGE_FORMATS,
} from './image-format';

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

function file(...parts: number[][]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(32);
  bytes.set(parts.flat());
  return bytes;
}

describe('detectImageFormat', () => {
  it('recognises each supported signature', () => {
    expect(detectImageFormat(file([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(
      detectImageFormat(file([0x89, ...ascii('PNG\r\n'), 0x1a, 0x0a])),
    ).toBe('png');
    expect(detectImageFormat(file(ascii('GIF87a')))).toBe('gif');
    expect(detectImageFormat(file(ascii('GIF89a')))).toBe('gif');
    expect(
      detectImageFormat(file(ascii('RIFF'), [1, 2, 3, 4], ascii('WEBP'))),
    ).toBe('webp');
  });

  it('needs no more than the signature bytes', () => {
    const webp = file(ascii('RIFF'), [1, 2, 3, 4], ascii('WEBP'));
    expect(detectImageFormat(webp.slice(0, FORMAT_SIGNATURE_BYTES))).toBe(
      'webp',
    );
  });

  it('refuses unknown and too short files', () => {
    expect(detectImageFormat(new Uint8Array())).toBeUndefined();
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8]))).toBeUndefined();
    expect(
      detectImageFormat(file(ascii('RIFF'), [1, 2, 3, 4], ascii('WAVE'))),
    ).toBeUndefined();
    // HEIC: an ISO box starting with `ftyp`.
    expect(
      detectImageFormat(file([0, 0, 0, 24], ascii('ftypheic'))),
    ).toBeUndefined();
  });

  it('ignores the name: a PNG renamed .jpg is still a PNG', () => {
    const renamed = new File(
      [file([0x89, ...ascii('PNG\r\n'), 0x1a, 0x0a])],
      'piece.jpg',
      {
        type: 'image/jpeg',
      },
    );
    return renamed.arrayBuffer().then((buffer) => {
      const format = detectImageFormat(new Uint8Array(buffer));
      expect(format).toBe('png');
      expect(format && IMAGE_FORMATS[format]).toEqual({
        ext: 'png',
        mime: 'image/png',
      });
    });
  });
});
