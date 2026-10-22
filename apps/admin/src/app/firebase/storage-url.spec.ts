import type { FirebaseEnvironment } from './firebase-environment';
import { storageUrl } from './storage-url';

const firebase = { projectId: 'p', storageBucket: 'p.appspot.com' };
const publicSite = 'https://tigy.example';

describe('storageUrl', () => {
  it('points at Storage in production', () => {
    const env: FirebaseEnvironment = { firebase, publicSite };
    expect(storageUrl('images/k3x/thumb.webp', env)).toBe(
      'https://firebasestorage.googleapis.com/v0/b/p.appspot.com/o/images%2Fk3x%2Fthumb.webp?alt=media',
    );
  });

  it('points at the Storage emulator in development', () => {
    const env: FirebaseEnvironment = {
      firebase,
      publicSite,
      emulatorHost: '127.0.0.1',
    };
    expect(storageUrl('people/tigy/avatar.webp', env)).toBe(
      'http://127.0.0.1:9199/v0/b/p.appspot.com/o/people%2Ftigy%2Favatar.webp?alt=media',
    );
  });

  it('encodes every character of the path', () => {
    const env: FirebaseEnvironment = { firebase, publicSite };
    expect(storageUrl('images/a b#?/original.png', env)).toContain(
      '/o/images%2Fa%20b%23%3F%2Foriginal.png?alt=media',
    );
  });
});
