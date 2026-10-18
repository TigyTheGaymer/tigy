import { imagePaths } from './image.model';

describe('imagePaths', () => {
  it('builds the fixed Storage paths of an image', () => {
    expect(imagePaths.folder('k3x')).toBe('images/k3x/');
    expect(imagePaths.thumb('k3x')).toBe('images/k3x/thumb.webp');
    expect(imagePaths.full('k3x')).toBe('images/k3x/full.webp');
    expect(imagePaths.original('k3x', 'png')).toBe('images/k3x/original.png');
  });
});
