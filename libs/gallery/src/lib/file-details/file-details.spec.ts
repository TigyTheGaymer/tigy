import {
  fileDuration,
  fileSize,
  formatDuration,
  formatName,
} from './file-details';

describe('file details', () => {
  it('names the format and the size', () => {
    expect(formatName('image/png')).toBe('PNG');
    expect(fileSize(820)).toBe('820 B');
    expect(fileSize(340_000)).toBe('340 KB');
    expect(fileSize(1_234_567)).toBe('1.2 MB');
  });

  it('names each video format', () => {
    expect(formatName('video/mp4')).toBe('MP4 video');
    expect(formatName('video/quicktime')).toBe('MOV video');
    expect(formatName('video/webm')).toBe('WebM video');
  });

  it('writes a duration in minutes and seconds', () => {
    expect(formatDuration(42_000)).toBe('0:42');
    expect(formatDuration(125_000)).toBe('2:05');
    expect(formatDuration(4_400)).toBe('0:04');
    expect(formatDuration(180_000)).toBe('3:00');
  });

  it("gives a video's duration and none for an image", () => {
    expect(fileDuration({ durationMs: 42_000 })).toBe('0:42');
    expect(fileDuration({})).toBeUndefined();
  });
});
