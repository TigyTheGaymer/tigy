import { normaliseTag, normaliseTags } from './tags';

describe('normaliseTag', () => {
  it('Case and spacing: saves " Reference  Sheet" as "reference sheet"', () => {
    expect(normaliseTag(' Reference  Sheet')).toBe('reference sheet');
  });

  it('collapses tabs and newlines too', () => {
    expect(normaliseTag('chibi\t\nstyle ')).toBe('chibi style');
  });

  it('makes one tag of an accented letter typed composed or decomposed', () => {
    const composed = 'Café';
    const decomposed = 'Café';
    expect(normaliseTag(decomposed)).toBe(normaliseTag(composed));
    expect(normaliseTag(decomposed)).toBe('café');
  });

  it('refuses names Firestore reserves as keys', () => {
    expect(normaliseTag(' __Proto__ ')).toBe('');
    expect(normaliseTag('__name__')).toBe('');
    expect(normaliseTag('__init')).toBe('__init');
  });
});

describe('normaliseTags', () => {
  it('drops empty tags and spellings that become duplicates', () => {
    expect(
      normaliseTags([
        'Chibi',
        ' ',
        'reference sheet',
        'Reference  Sheet',
        'chibi',
      ]),
    ).toEqual(['chibi', 'reference sheet']);
  });
});
