import {
  blackFirstFrame,
  eightKFrame,
  longClip,
  phoneMp4,
  PHONE_TAGS,
  portraitWithSound,
  rotated4kFrame,
  rotatedMov,
  silentWebm,
  truncatedMp4,
} from '../../testing/videos';
import { deadlineIn, FfmpegError, probe, runFfmpeg } from './ffmpeg';

const kinds = async (path: string) =>
  (await probe(path)).streams.map((s) => s.codec_type);
const video = async (path: string) =>
  (await probe(path)).streams.find((s) => s.codec_type === 'video');
const rotation = async (path: string) =>
  (await video(path))?.side_data_list?.find(
    (side) => side.side_data_type === 'Display Matrix',
  )?.rotation;

describe('probe', () => {
  it('reports the streams, size, duration and tags of a generated clip', async () => {
    const result = await probe(await phoneMp4());
    expect(result.streams.map((s) => s.codec_type)).toEqual([
      'video',
      'audio',
      'subtitle',
    ]);
    expect(result.streams[0]).toMatchObject({
      codec_name: 'h264',
      pix_fmt: 'yuv420p',
      width: 320,
      height: 180,
    });
    expect(Number(result.format.duration)).toBeCloseTo(3, 1);
    expect(result.format.tags).toMatchObject(PHONE_TAGS);
  });

  it('reports the display matrix of a rotated clip', async () => {
    expect(Math.abs((await rotation(await rotatedMov())) ?? 0)).toBe(90);
  });

  it('fails with stderr attached on a file it cannot read', async () => {
    const error = await probe(await truncatedMp4()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FfmpegError);
    expect((error as FfmpegError).stderr).toMatch(/moov atom not found/);
  });
});

describe('runFfmpeg', () => {
  it('turns a non-zero exit into an error with stderr attached', async () => {
    const error = await runFfmpeg(['-i', 'missing.mp4', 'out.mp4']).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(FfmpegError);
    expect((error as FfmpegError).message).toMatch(/ffmpeg(\.exe)? exited/);
    expect((error as FfmpegError).stderr).toMatch(/missing\.mp4/);
  });

  it('kills a run that takes longer than its timeout', async () => {
    const error = await runFfmpeg(
      ['-re', '-f', 'lavfi', '-i', 'testsrc', '-f', 'null', '-'],
      deadlineIn(300),
    ).catch((e: unknown) => e);
    expect((error as FfmpegError).message).toMatch(/killed/);
  });
});

describe('the video fixtures', () => {
  it('make each kind of clip the tests need', async () => {
    expect(await kinds(await phoneMp4())).toEqual([
      'video',
      'audio',
      'subtitle',
    ]);
    expect(await video(await silentWebm())).toMatchObject({
      codec_name: 'vp9',
      width: 800,
      height: 800,
    });
    expect(await kinds(await silentWebm())).toEqual(['video']);
    expect(await video(await portraitWithSound())).toMatchObject({
      width: 2160,
      height: 3840,
    });
    expect(Number((await probe(await longClip())).format.duration)).toBe(240);
    expect(await video(await eightKFrame())).toMatchObject({
      width: 7680,
      height: 4320,
    });
    expect(Math.abs((await rotation(await rotated4kFrame())) ?? 0)).toBe(90);
    expect(await video(await blackFirstFrame())).toMatchObject({
      width: 1920,
      height: 1080,
    });
  }, 120_000);
});
