import { previewUrl, videoUrl } from './urls';

describe('video URLs', () => {
  it("points at a video's web copy and preview on the site", () => {
    expect(videoUrl('k3x')).toBe('/img/k3x/full.mp4');
    expect(previewUrl('k3x')).toBe('/img/k3x/preview.mp4');
  });
});
