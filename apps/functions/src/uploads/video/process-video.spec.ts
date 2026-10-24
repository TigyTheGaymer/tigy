import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  blackFirstFrame,
  phoneMp4,
  PHONE_TAGS,
  portraitWithSound,
  rotatedMov,
  silentWebm,
  slowMotionMp4,
  streamHashes,
} from '../../testing/videos';
import { probe, type ProbeStream } from './ffmpeg';
import { cleanOriginal, fitInside, processVideo } from './process-video';

vi.mock('firebase-functions/logger', async (original) => ({
  ...(await original<typeof import('firebase-functions/logger')>()),
  warn: vi.fn(),
}));

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tigy-process-video-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const streams = async (path: string) => (await probe(path)).streams;
const videoOf = async (path: string) =>
  (await streams(path)).find((s) => s.codec_type === 'video') as ProbeStream;
const seconds = async (path: string) =>
  Number((await probe(path)).format.duration);
const rotation = (stream: ProbeStream) =>
  stream.side_data_list?.find((s) => s.side_data_type === 'Display Matrix')
    ?.rotation;
/** `moov` before `mdat`, so playback can start before the end arrives. */
const isFastStart = (path: string) => {
  const bytes = readFileSync(path);
  return bytes.indexOf('moov') < bytes.indexOf('mdat');
};

describe('cleanOriginal', () => {
  it('Phone video with location data: drops the location, model, encoder and other tags, and the subtitle track', async () => {
    const out = join(dir, 'original.mp4');
    await cleanOriginal(await phoneMp4(), 'mp4', out);
    const result = await probe(out);
    const tags = JSON.stringify([
      result.format.tags,
      ...result.streams.map((s) => s.tags),
    ]);
    for (const [key, value] of Object.entries(PHONE_TAGS)) {
      expect(tags).not.toContain(key);
      expect(tags).not.toContain(value);
    }
    expect(tags).not.toMatch(/Lavf|Lavc|Shot on a phone|Core Media/);
    expect(result.streams.map((s) => s.codec_type)).toEqual(['video', 'audio']);
  });

  it('keeps the video and audio streams exactly', async () => {
    const source = await phoneMp4();
    const out = join(dir, 'original.mp4');
    await cleanOriginal(source, 'mp4', out);
    expect(await streamHashes(out)).toEqual(await streamHashes(source));
  });

  it('Rotated video: keeps the rotation', async () => {
    const out = join(dir, 'original.mov');
    await cleanOriginal(await rotatedMov(), 'mov', out);
    expect(Math.abs(rotation(await videoOf(out)) ?? 0)).toBe(90);
  });
});

describe('processVideo', () => {
  it('Portrait animation with sound: makes a 1080 × 1920 web copy with sound and a silent 10-second preview', async () => {
    const result = await processVideo(await portraitWithSound(), 'mov', dir);

    expect(await videoOf(result.video)).toMatchObject({
      codec_name: 'h264',
      pix_fmt: 'yuv420p',
      width: 1080,
      height: 1920,
    });
    expect(await seconds(result.video)).toBeCloseTo(12, 0);
    expect((await streams(result.video)).map((s) => s.codec_type)).toEqual([
      'video',
      'audio',
    ]);

    // 405 would be odd, which H.264 in yuv420p can't encode.
    expect(await videoOf(result.preview)).toMatchObject({
      width: 406,
      height: 720,
    });
    expect(await seconds(result.preview)).toBeCloseTo(10, 0);
    expect((await streams(result.preview)).map((s) => s.codec_type)).toEqual([
      'video',
    ]);
  }, 60_000);

  it('Short loop and Plays in Safari: turns a VP9 WebM into H.264 with faststart, never upscaled', async () => {
    const result = await processVideo(await silentWebm(), 'webm', dir);
    expect(result.original).toMatch(/original\.webm$/);
    expect(await videoOf(result.video)).toMatchObject({
      codec_name: 'h264',
      pix_fmt: 'yuv420p',
      width: 800,
      height: 800,
    });
    expect(await seconds(result.video)).toBeCloseTo(4, 0);
    expect(isFastStart(result.video)).toBe(true);
    expect(await videoOf(result.preview)).toMatchObject({
      codec_name: 'h264',
      width: 720,
      height: 720,
    });
    expect(await seconds(result.preview)).toBeCloseTo(4, 0);
    expect(isFastStart(result.preview)).toBe(true);
  }, 60_000);

  it('copies the streams of an original that already plays everywhere', async () => {
    const result = await processVideo(await phoneMp4(), 'mp4', dir);
    expect(await streamHashes(result.video)).toEqual(
      await streamHashes(result.original),
    );
    expect(isFastStart(result.video)).toBe(true);
    expect((await streams(result.preview)).map((s) => s.codec_type)).toEqual([
      'video',
    ]);
  });

  it('re-encodes a playable original over 60 fps, so the web copy keeps the cap', async () => {
    const result = await processVideo(await slowMotionMp4(), 'mp4', dir);
    const [num, den] = (await videoOf(result.video))
      .avg_frame_rate!.split('/')
      .map(Number);
    expect(num / den).toBeLessThanOrEqual(60);
    expect(await streamHashes(result.video)).not.toEqual(
      await streamHashes(result.original),
    );
  });

  it('Video stills: makes still web versions from a frame of the first second, skipping a black opening', async () => {
    const result = await processVideo(await blackFirstFrame(), 'mp4', dir);
    const full = await sharp(result.full).metadata();
    const thumb = await sharp(result.thumb).metadata();
    expect([full.width, full.height, full.pages ?? 1]).toEqual([1920, 1080, 1]);
    expect([thumb.width, thumb.height, thumb.pages ?? 1]).toEqual([
      720, 405, 1,
    ]);
    const { channels } = await sharp(result.thumb).stats();
    expect(
      channels[0].mean + channels[1].mean + channels[2].mean,
    ).toBeGreaterThan(60);
  }, 60_000);

  it('Video with sound: records the size, duration and sound, as animated and not transparent', async () => {
    const result = await processVideo(await phoneMp4(), 'mp4', dir);
    expect(result.file).toEqual({
      w: 320,
      h: 180,
      bytes: readFileSync(result.original).length,
      mime: 'video/mp4',
      animated: true,
      transparent: false,
      durationMs: expect.any(Number),
      hasAudio: true,
    });
    expect(result.file.durationMs).toBeGreaterThanOrEqual(2900);
    expect(result.file.durationMs).toBeLessThanOrEqual(3100);
  });

  it('Silent video: records no sound', async () => {
    const result = await processVideo(await silentWebm(), 'webm', dir);
    expect(result.file).toMatchObject({
      mime: 'video/webm',
      hasAudio: false,
      w: 800,
      h: 800,
    });
  }, 60_000);

  it('records a rotated video upright, and plays it upright', async () => {
    const result = await processVideo(await rotatedMov(), 'mov', dir);
    expect(result.file).toMatchObject({ w: 180, h: 320 });
    const still = await sharp(result.full).metadata();
    expect([still.width, still.height]).toEqual([180, 320]);
    const preview = await videoOf(result.preview);
    expect([preview.width, preview.height]).toEqual([180, 320]);
  });
});

describe('fitInside', () => {
  it('fits the longer side, keeps the shape with even sides, and never upscales', () => {
    expect(fitInside(2160, 3840, 1920)).toEqual([1080, 1920]);
    expect(fitInside(1920, 1080, 720)).toEqual([720, 406]);
    expect(fitInside(800, 800, 1920)).toEqual([800, 800]);
    expect(fitInside(321, 181, 1920)).toEqual([322, 182]);
  });
});
