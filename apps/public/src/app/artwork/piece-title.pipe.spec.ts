import { PieceTitlePipe } from './piece-title.pipe';

describe('PieceTitlePipe', () => {
  it('names an untitled piece "Untitled"', () => {
    expect(new PieceTitlePipe().transform('Hey Pookie!')).toBe('Hey Pookie!');
    expect(new PieceTitlePipe().transform(undefined)).toBe('Untitled');
  });
});
