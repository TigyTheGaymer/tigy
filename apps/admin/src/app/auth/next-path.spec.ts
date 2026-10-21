import { nextPath } from './next-path';

describe('nextPath', () => {
  it('accepts an admin path', () => {
    expect(nextPath('/uploads')).toBe('/uploads');
    expect(nextPath('/uploads/abc')).toBe('/uploads/abc');
  });

  it('falls back to the Uploads page for anything else', () => {
    for (const next of [
      undefined,
      null,
      '',
      'uploads',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/javascript:alert(1)',
      '/sign-in',
    ]) {
      expect(nextPath(next)).toBe('/uploads');
    }
  });
});
