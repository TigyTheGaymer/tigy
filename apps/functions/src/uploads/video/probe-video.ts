import * as logger from 'firebase-functions/logger';
import { UploadFailure } from '../upload-failure';
import {
  deadlineIn,
  FfmpegError,
  probe,
  runFfmpeg,
  type ProbeResult,
  type ProbeStream,
} from './ffmpeg';

export const MAX_DURATION_MS = 180_000;
export const MAX_LONG_SIDE = 3840;
export const MAX_SHORT_SIDE = 2160;

export interface VideoInfo {
  /** As displayed, after the rotation. */
  w: number;
  h: number;
  durationMs: number;
  video: ProbeStream;
  audio?: ProbeStream;
}

/** Throws `unreadable`, `video-too-long` or `video-too-large` for a video processing must refuse. */
export async function probeVideo(
  path: string,
  deadline = deadlineIn(),
): Promise<VideoInfo> {
  const result = await unreadableOnFailure(probe(path, deadline));
  const info = videoInfo(result);
  if (info.durationMs > MAX_DURATION_MS) {
    throw new UploadFailure('video-too-long');
  }
  const [long, short] = [Math.max(info.w, info.h), Math.min(info.w, info.h)];
  if (long > MAX_LONG_SIDE || short > MAX_SHORT_SIDE) {
    throw new UploadFailure('video-too-large');
  }
  // ffprobe names codecs it can't decode too, so decode the first frame.
  await unreadableOnFailure(
    runFfmpeg(
      [
        '-v',
        'error',
        '-i',
        path,
        '-map',
        '0:V:0',
        '-frames:v',
        '1',
        '-f',
        'null',
        '-',
      ],
      deadline,
    ),
  );
  return info;
}

function videoInfo({ format, streams }: ProbeResult): VideoInfo {
  // Cover art is a video stream too.
  const video = streams.find(
    (s) => s.codec_type === 'video' && !s.disposition?.attached_pic,
  );
  const audio = streams.find((s) => s.codec_type === 'audio');
  const seconds = Number(format.duration ?? video?.duration);
  if (!video?.width || !video.height || !(seconds > 0)) {
    throw new UploadFailure('unreadable');
  }
  const isSideways = Math.abs(rotationOf(video)) % 180 === 90;
  return {
    w: isSideways ? video.height : video.width,
    h: isSideways ? video.width : video.height,
    durationMs: Math.round(seconds * 1000),
    video,
    audio,
  };
}

function rotationOf(stream: ProbeStream): number {
  const matrix = stream.side_data_list?.find(
    (side) => side.side_data_type === 'Display Matrix',
  );
  return matrix?.rotation ?? Number(stream.tags?.['rotate'] ?? 0);
}

async function unreadableOnFailure<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (!(error instanceof FfmpegError)) throw error;
    logger.warn('ffmpeg could not read an upload', {
      error: error.message,
      stderr: error.stderr,
    });
    throw new UploadFailure('unreadable');
  }
}
