import { fileSize, formatName } from './file-details';

describe('file details', () => {
  it('names the format and the size', () => {
    expect(formatName('image/png')).toBe('PNG');
    expect(fileSize(820)).toBe('820 B');
    expect(fileSize(340_000)).toBe('340 KB');
    expect(fileSize(1_234_567)).toBe('1.2 MB');
  });
});
