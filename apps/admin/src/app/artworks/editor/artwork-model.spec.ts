import { artwork } from '../../testing';
import {
  changedEdits,
  dateError,
  normalise,
  toModel,
  type ArtworkModel,
} from './artwork-model';

const added = new Date('2025-11-20T10:00:00Z');

function edit(
  fields: Parameters<typeof artwork>[1],
  changes: Partial<ArtworkModel>,
) {
  const loaded = normalise(toModel(artwork('a', fields)));
  return changedEdits({ ...loaded, ...changes }, loaded, added);
}

describe('changedEdits', () => {
  it('writes only the fields that changed', () => {
    expect(
      edit(
        { title: 'Old', tags: ['chibi'] },
        { title: 'New', tags: ['chibi'] },
      ),
    ).toEqual({ title: 'New' });
    expect(edit({ title: 'Same' }, {})).toEqual({});
  });

  it('Saving: stores the title trimmed and the tags in their stored form', () => {
    expect(
      edit({}, { title: '  Pool day ', tags: [' Reference  Sheet', 'chibi'] }),
    ).toEqual({ title: 'Pool day', tags: ['reference sheet', 'chibi'] });
  });

  it('removes a cleared title or description', () => {
    expect(
      edit({ title: 'T', description: 'D' }, { title: ' ', description: '' }),
    ).toEqual({
      title: null,
      description: null,
    });
  });

  it('Year only: dates the piece 2019 and sorts it as 2019-01-01', () => {
    expect(edit({}, { year: '2019' })).toEqual({
      date: '2019',
      sortDate: '2019-01-01',
    });
  });

  it('pads a month and a day', () => {
    expect(edit({}, { year: '2021', month: '4', day: '8' })).toEqual({
      date: '2021-04-08',
      sortDate: '2021-04-08',
    });
  });

  it('Clearing the date: removes it, and the piece sorts by the day it was added again', () => {
    expect(
      edit(
        { date: '2021-04', sortDate: '2021-04-01' },
        { year: '', month: '' },
      ),
    ).toEqual({ date: null, sortDate: '2025-11-20' });
  });

  it('writes reordered credits and the switches', () => {
    expect(
      edit(
        { artistIds: ['a', 'b'] },
        { artistIds: ['b', 'a'], published: true, nsfw: true },
      ),
    ).toEqual({ artistIds: ['b', 'a'], published: true, nsfw: true });
  });
});

describe('dateError', () => {
  const date = (year: string, month = '', day = '') =>
    dateError({ ...toModel(artwork('a')), year, month, day });

  it('accepts no date, a year, a year and month, and a full date', () => {
    expect(date('')).toBeUndefined();
    expect(date('2019')).toBeUndefined();
    expect(date('2021', '04')).toBeUndefined();
    expect(date('2024', '2', '29')).toBeUndefined();
  });

  it('Day that does not exist: refuses 31 February 2024', () => {
    expect(date('2024', '2', '31')).toBe('day');
    expect(date('2023', '2', '29')).toBe('day');
  });

  it('asks for a four-digit year, a month for a day, and a real month', () => {
    expect(date('19')).toBe('year');
    expect(date('', '4')).toBe('missing-year');
    expect(date('2021', '', '3')).toBe('missing-month');
    expect(date('2021', '13')).toBe('month');
  });
});
