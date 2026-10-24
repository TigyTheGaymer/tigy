import {
  eightKFrame,
  longClip,
  phoneMp4,
  rotated4kFrame,
  rotatedMov,
  silentWebm,
  truncatedMp4,
  unknownCodecMov,
} from '../../testing/videos';
import { probeVideo } from './probe-video';

vi.mock('firebase-functions/logger', async (original) => ({
  ...(await original<typeof import('firebase-functions/logger')>()),
  warn: vi.fn(),
}));

const codeOf = (work: Promise<unknown>) =>
  work.then(
    () => 'accepted',
    (error: { code?: string }) => error.code ?? error,
  );

describe('probeVideo', () => {
  it('reads the size, duration and streams of a clip with sound', async () => {
    const info = await probeVideo(await phoneMp4());
    expect(info).toMatchObject({ w: 320, h: 180 });
    expect(info.durationMs).toBeGreaterThanOrEqual(2900);
    expect(info.durationMs).toBeLessThanOrEqual(3100);
    expect(info.video.codec_name).toBe('h264');
    expect(info.audio?.codec_name).toBe('aac');
  });

  it('finds no audio in a silent WebM', async () => {
    const info = await probeVideo(await silentWebm());
    expect(info).toMatchObject({ w: 800, h: 800 });
    expect(info.audio).toBeUndefined();
  });

  it('Rotated video: swaps the displayed width and height', async () => {
    expect(await probeVideo(await rotatedMov())).toMatchObject({
      w: 180,
      h: 320,
    });
  });

  it('accepts a portrait clip just inside 3840 × 2160', async () => {
    expect(await probeVideo(await rotated4kFrame())).toMatchObject({
      w: 2160,
      h: 3840,
    });
  });

  it('Video too long: refuses four minutes', async () => {
    expect(await codeOf(probeVideo(await longClip()))).toBe('video-too-long');
  });

  it('Video too large: refuses 8K', async () => {
    expect(await codeOf(probeVideo(await eightKFrame()))).toBe(
      'video-too-large',
    );
  });

  it('Damaged file: a truncated MP4 is unreadable', async () => {
    expect(await codeOf(probeVideo(await truncatedMp4()))).toBe('unreadable');
  });

  it('Video in a codec that cannot be read: is unreadable', async () => {
    expect(await codeOf(probeVideo(await unknownCodecMov()))).toBe(
      'unreadable',
    );
  });
});
