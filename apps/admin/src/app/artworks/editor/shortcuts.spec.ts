import { isTextBox, shortcutOf } from './shortcuts';

const key = (key: string, init: KeyboardEventInit = {}) =>
  shortcutOf(new KeyboardEvent('keydown', { key, ...init }));

describe('shortcutOf', () => {
  it('reads Ctrl and ⌘ the same', () => {
    expect(key('s', { ctrlKey: true })).toBe('save');
    expect(key('S', { metaKey: true })).toBe('save');
    expect(key('Enter', { ctrlKey: true })).toBe('save-and-next');
    expect(key('Enter', { metaKey: true })).toBe('save-and-next');
  });

  it('reads Alt and the arrows', () => {
    expect(key('ArrowLeft', { altKey: true })).toBe('previous');
    expect(key('ArrowRight', { altKey: true })).toBe('next');
  });

  it('ignores plain keys', () => {
    expect(key('s')).toBeUndefined();
    expect(key('ArrowLeft')).toBeUndefined();
    expect(key('Enter')).toBeUndefined();
  });
});

describe('isTextBox', () => {
  it('counts text inputs and text areas, not switches or buttons', () => {
    expect(isTextBox(document.createElement('textarea'))).toBe(true);
    expect(isTextBox(document.createElement('input'))).toBe(true);
    const box = document.createElement('input');
    box.type = 'checkbox';
    expect(isTextBox(box)).toBe(false);
    expect(isTextBox(document.createElement('button'))).toBe(false);
  });
});
