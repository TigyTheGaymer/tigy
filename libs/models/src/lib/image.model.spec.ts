import { imagePaths, isVideoFile } from './image.model';

describe('imagePaths', () => {
  it('builds the fixed Storage paths of an image', () => {
    expect(imagePaths.folder('k3x')).toBe('images/k3x/');
    expect(imagePaths.thumb('k3x')).toBe('images/k3x/thumb.webp');
    expect(imagePaths.full('k3x')).toBe('images/k3x/full.webp');
    expect(imagePaths.original('k3x', 'png')).toBe('images/k3x/original.png');
  });

  it('builds the paths of a video', () => {
    expect(imagePaths.video('k3x')).toBe('images/k3x/full.mp4');
    expect(imagePaths.preview('k3x')).toBe('images/k3x/preview.mp4');
  });
});

describe('isVideoFile', () => {
  it('tells a video from an image by its MIME type', () => {
    expect(isVideoFile({ mime: 'video/quicktime' })).toBe(true);
    expect(isVideoFile({ mime: 'image/gif' })).toBe(false);
  });
});
