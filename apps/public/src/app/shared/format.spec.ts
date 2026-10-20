import {
  fileSize,
  formatName,
  monthRange,
  pieceCount,
  pieceTitle,
} from './format';
import { PieceTitlePipe } from './piece-title.pipe';
import { originalUrl } from './urls';

describe('format', () => {
  it('names an untitled piece "Untitled", in code and in templates', () => {
    expect(pieceTitle('Hey Pookie!')).toBe('Hey Pookie!');
    expect(pieceTitle(undefined)).toBe('Untitled');
    expect(new PieceTitlePipe().transform(undefined)).toBe('Untitled');
  });

  it('counts pieces', () => {
    expect(pieceCount(1)).toBe('1 piece');
    expect(pieceCount(35)).toBe('35 pieces');
  });

  it('spans months, or names one month when both share it', () => {
    expect(monthRange('2025-11-03', '2026-04-20')).toBe('Nov 2025 – Apr 2026');
    expect(monthRange('2026-04-01', '2026-04-20')).toBe('Apr 2026');
  });

  it('names a file format and size', () => {
    expect(formatName('image/png')).toBe('PNG');
    expect(fileSize(820)).toBe('820 B');
    expect(fileSize(340_000)).toBe('340 KB');
    expect(fileSize(1_234_567)).toBe('1.2 MB');
  });

  it('links the original under its own file name', () => {
    expect(
      originalUrl({
        id: 'hey pookie',
        file: { original: 'images/k3x/original.png' },
      }),
    ).toBe('/img/hey%20pookie/original.png');
  });
});
