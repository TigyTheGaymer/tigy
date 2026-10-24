import { stopVideo } from './stop-video';

describe('stopVideo', () => {
  it('pauses the player and lets go of its file', () => {
    const calls: string[] = [];
    const video = {
      pause: () => calls.push('pause'),
      removeAttribute: (name: string) => calls.push(`remove ${name}`),
      load: () => calls.push('load'),
    } as unknown as HTMLVideoElement;
    stopVideo(video);
    expect(calls).toEqual(['pause', 'remove src', 'load']);
  });

  it('does nothing without a player', () => {
    expect(() => stopVideo(undefined)).not.toThrow();
  });
});
