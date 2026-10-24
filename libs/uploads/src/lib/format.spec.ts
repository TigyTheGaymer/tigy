import {
  detectFormat,
  FORMAT_SIGNATURE_BYTES,
  FORMATS,
  isVideoFormat,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  maxBytesFor,
} from './format';

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

function file(...parts: number[][]): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(FORMAT_SIGNATURE_BYTES);
  bytes.set(parts.flat());
  return bytes;
}

const ftyp = (brand: string) => file([0, 0, 0, 24], ascii('ftyp' + brand));

// The start of a real WebM header, as ffmpeg writes it.
const ebml = (docType: string) =>
  file(
    [0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81],
    [0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82],
    [0x80 | docType.length, ...ascii(docType)],
  );

describe('detectFormat', () => {
  it('recognises each supported image signature', () => {
    expect(detectFormat(file([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(detectFormat(file([0x89, ...ascii('PNG\r\n'), 0x1a, 0x0a]))).toBe(
      'png',
    );
    expect(detectFormat(file(ascii('GIF87a')))).toBe('gif');
    expect(detectFormat(file(ascii('GIF89a')))).toBe('gif');
    expect(detectFormat(file(ascii('RIFF'), [1, 2, 3, 4], ascii('WEBP')))).toBe(
      'webp',
    );
  });

  it('recognises MP4 by its major brands', () => {
    for (const brand of ['isom', 'iso2', 'iso6', 'mp41', 'mp42', 'avc1']) {
      expect(detectFormat(ftyp(brand))).toBe('mp4');
    }
    expect(detectFormat(ftyp('M4V '))).toBe('mp4');
    expect(detectFormat(ftyp('dash'))).toBe('mp4');
    expect(detectFormat(ftyp('mmp4'))).toBe('mp4');
  });

  it('recognises MOV and WebM', () => {
    expect(detectFormat(ftyp('qt  '))).toBe('mov');
    expect(detectFormat(ebml('webm'))).toBe('webm');
  });

  it('refuses HEIC, AVIF and 3GP, which share the ftyp box', () => {
    expect(detectFormat(ftyp('heic'))).toBeUndefined();
    expect(detectFormat(ftyp('mif1'))).toBeUndefined();
    expect(detectFormat(ftyp('avif'))).toBeUndefined();
    expect(detectFormat(ftyp('3gp4'))).toBeUndefined();
  });

  it('refuses Matroska that is not WebM', () => {
    expect(detectFormat(ebml('matroska'))).toBeUndefined();
    expect(detectFormat(file([0x1a, 0x45, 0xdf, 0xa3]))).toBeUndefined();
  });

  it('needs no more than the signature bytes', () => {
    const webm = ebml('webm');
    expect(detectFormat(webm.slice(0, FORMAT_SIGNATURE_BYTES))).toBe('webm');
    expect(FORMAT_SIGNATURE_BYTES).toBe(64);
  });

  it('reads files shorter than the signature bytes', () => {
    expect(detectFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe(
      'jpeg',
    );
    expect(detectFormat(ebml('webm').slice(0, 20))).toBeUndefined();
    expect(detectFormat(ftyp('isom').slice(0, 10))).toBeUndefined();
  });

  it('refuses unknown and too short files', () => {
    expect(detectFormat(new Uint8Array())).toBeUndefined();
    expect(detectFormat(new Uint8Array([0xff, 0xd8]))).toBeUndefined();
    expect(
      detectFormat(file(ascii('RIFF'), [1, 2, 3, 4], ascii('WAVE'))),
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
      const format = detectFormat(new Uint8Array(buffer));
      expect(format).toBe('png');
      expect(format && FORMATS[format]).toEqual({
        ext: 'png',
        mime: 'image/png',
      });
    });
  });

  it('gives each video its MIME type and limit', () => {
    expect(FORMATS.mp4.mime).toBe('video/mp4');
    expect(FORMATS.mov).toEqual({ ext: 'mov', mime: 'video/quicktime' });
    expect(FORMATS.webm.mime).toBe('video/webm');
    expect(isVideoFormat('mov')).toBe(true);
    expect(isVideoFormat('gif')).toBe(false);
    expect(maxBytesFor('webm')).toBe(MAX_VIDEO_BYTES);
    expect(maxBytesFor('png')).toBe(MAX_IMAGE_BYTES);
  });
});
