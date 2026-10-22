import { neighboursOf } from './neighbours';

const list = (...ids: string[]) => ids.map((id) => ({ id }));

describe('neighboursOf', () => {
  it('takes the neighbours in a filtered list', () => {
    expect(neighboursOf('c', list('a', 'c', 'e'))).toEqual({
      previous: 'a',
      next: 'e',
    });
  });

  it('has nothing past the ends of the list', () => {
    expect(neighboursOf('a', list('a', 'b'))).toEqual({
      previous: undefined,
      next: 'b',
    });
    expect(neighboursOf('b', list('a', 'b'))).toEqual({
      previous: 'a',
      next: undefined,
    });
  });

  it('takes a piece that left the view from where it sat before', () => {
    expect(neighboursOf('b', list('a', 'c'), list('a', 'b', 'c'))).toEqual({
      previous: 'a',
      next: 'c',
    });
  });

  it('skips neighbours that left the view too', () => {
    expect(neighboursOf('b', list('a', 'd'), list('a', 'b', 'c', 'd'))).toEqual(
      { previous: 'a', next: 'd' },
    );
  });

  it('has no neighbours for a piece it never saw', () => {
    expect(neighboursOf('z', list('a'), list('a'))).toEqual({});
  });
});
