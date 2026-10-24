import type { ImageFile } from '@tigy/models';
import { FORMATS, type VideoFormat } from '@tigy/uploads';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { makeWebVersions } from '../web-versions';
import { deadlineIn, runFfmpeg, type ProbeStream } from './ffmpeg';
import { probeVideo, type VideoInfo } from './probe-video';

export const WEB_COPY_SIZE = 1920;
export const PREVIEW_SIZE = 720;
export const PREVIEW_SECONDS = 10;
export const MAX_FRAME_RATE = 60;

export interface ProcessedVideo {
  /** Local paths in the work directory. */
  original: string;
  video: string;
  preview: string;
  full: Buffer;
  thumb: Buffer;
  file: Omit<ImageFile, 'original'>;
}

const MP4_FLAGS = ['-movflags', '+faststart'];
const H264 = [
  '-c:v',
  'libx264',
  '-profile:v',
  'high',
  '-preset',
  'veryfast',
  '-pix_fmt',
  'yuv420p',
];
// Without these ffmpeg writes its own encoder tag and per-stream tags back.
const NO_METADATA = [
  '-map_metadata',
  '-1',
  '-map_metadata:s:v',
  '-1',
  '-map_metadata:s:a',
  '-1',
  '-map_chapters',
  '-1',
  '-fflags',
  '+bitexact',
  '-flags:v',
  '+bitexact',
  '-flags:a',
  '+bitexact',
];
// `V` skips cover art; leaving out every other stream drops subtitle and
// timed metadata tracks, such as a phone's location track.
const PICTURE_AND_SOUND = ['-map', '0:V:0', '-map', '0:a:0?'];

export async function processVideo(
  source: string,
  format: VideoFormat,
  dir: string,
  deadline = deadlineIn(),
): Promise<ProcessedVideo> {
  const info = await probeVideo(source, deadline);
  const { ext, mime } = FORMATS[format];
  const original = join(dir, `original.${ext}`);
  await cleanOriginal(source, format, original, deadline);

  const video = join(dir, 'full.mp4');
  const preview = join(dir, 'preview.mp4');
  const frame = join(dir, 'frame.png');
  await makeWebCopy(original, format, info, video, deadline);
  await makePreview(original, info, preview, deadline);
  await makeStill(original, frame, deadline);
  const { full, thumb } = await makeWebVersions(await readFile(frame), 'png');

  return {
    original,
    video,
    preview,
    full,
    thumb,
    file: {
      w: info.w,
      h: info.h,
      bytes: (await stat(original)).size,
      mime,
      animated: true,
      transparent: false,
      durationMs: info.durationMs,
      hasAudio: info.audio !== undefined,
    },
  };
}

/** Rewrites the container only. The rotation is stream side data, not a tag, so it stays. */
export async function cleanOriginal(
  source: string,
  format: VideoFormat,
  out: string,
  deadline = deadlineIn(),
): Promise<void> {
  await runFfmpeg(
    [
      '-i',
      source,
      ...PICTURE_AND_SOUND,
      '-c',
      'copy',
      ...NO_METADATA,
      ...(format === 'webm' ? [] : MP4_FLAGS),
      out,
    ],
    deadline,
  );
}

/** H.264 and AAC play everywhere, Safari on iOS included. */
export async function makeWebCopy(
  original: string,
  format: VideoFormat,
  info: VideoInfo,
  out: string,
  deadline = deadlineIn(),
): Promise<void> {
  if (canCopyStreams(format, info)) {
    await runFfmpeg(
      [
        '-i',
        original,
        ...PICTURE_AND_SOUND,
        '-c',
        'copy',
        ...NO_METADATA,
        ...MP4_FLAGS,
        out,
      ],
      deadline,
    );
    return;
  }
  const [w, h] = fitInside(info.w, info.h, WEB_COPY_SIZE);
  await runFfmpeg(
    [
      '-i',
      original,
      ...PICTURE_AND_SOUND,
      // ffmpeg applies the rotation before the filters.
      '-vf',
      `scale=${w}:${h}`,
      ...H264,
      '-crf',
      '23',
      '-fpsmax',
      String(MAX_FRAME_RATE),
      ...(info.audio ? ['-c:a', 'aac', '-b:a', '128k', '-ac', '2'] : []),
      ...NO_METADATA,
      ...MP4_FLAGS,
      out,
    ],
    deadline,
  );
}

export async function makePreview(
  original: string,
  info: VideoInfo,
  out: string,
  deadline = deadlineIn(),
): Promise<void> {
  const [w, h] = fitInside(info.w, info.h, PREVIEW_SIZE);
  await runFfmpeg(
    [
      '-t',
      String(PREVIEW_SECONDS),
      '-i',
      original,
      '-map',
      '0:V:0',
      '-an',
      '-vf',
      `scale=${w}:${h}`,
      ...H264,
      '-crf',
      '30',
      '-fpsmax',
      String(MAX_FRAME_RATE),
      ...NO_METADATA,
      ...MP4_FLAGS,
      out,
    ],
    deadline,
  );
}

/** `thumbnail` picks the most representative frame of the first second, which skips a black opening. */
export async function makeStill(
  original: string,
  out: string,
  deadline = deadlineIn(),
): Promise<void> {
  await runFfmpeg(
    [
      '-t',
      '1',
      '-i',
      original,
      '-map',
      '0:V:0',
      '-vf',
      'thumbnail',
      '-frames:v',
      '1',
      out,
    ],
    deadline,
  );
}

function canCopyStreams(format: VideoFormat, info: VideoInfo): boolean {
  return (
    format !== 'webm' &&
    info.video.codec_name === 'h264' &&
    info.video.pix_fmt === 'yuv420p' &&
    (!info.audio || info.audio.codec_name === 'aac') &&
    Math.max(info.w, info.h) <= WEB_COPY_SIZE &&
    frameRate(info.video) <= MAX_FRAME_RATE
  );
}

/** 0 when ffprobe gives none, so a clip without one is treated as within the cap. */
function frameRate(stream: ProbeStream): number {
  const [num, den] = (stream.avg_frame_rate ?? '0/1').split('/').map(Number);
  return den ? num / den : 0;
}

/** Never upscaled, and even, as H.264 in `yuv420p` needs. */
export function fitInside(w: number, h: number, max: number): [number, number] {
  const scale = Math.min(1, max / Math.max(w, h));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return [even(w), even(h)];
}
