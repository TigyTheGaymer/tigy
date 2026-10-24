import { spawn } from 'node:child_process';

// Like loadSharp, nothing here loads until a video arrives.

export const FFMPEG_TIMEOUT_MS = 480_000;

export class FfmpegError extends Error {
  constructor(
    message: string,
    readonly stderr: string,
  ) {
    super(message);
  }
}

export interface ProbeStream {
  index: number;
  codec_type: 'video' | 'audio' | 'subtitle' | 'data' | 'attachment';
  codec_name?: string;
  pix_fmt?: string;
  /** "30000/1001", "120/1". */
  avg_frame_rate?: string;
  width?: number;
  height?: number;
  duration?: string;
  disposition?: { attached_pic?: number };
  tags?: Record<string, string>;
  side_data_list?: { side_data_type?: string; rotation?: number }[];
}

export interface ProbeResult {
  format: {
    format_name?: string;
    duration?: string;
    tags?: Record<string, string>;
  };
  streams: ProbeStream[];
}

export interface RunOutput {
  stdout: string;
  stderr: string;
}

let binaries: Promise<{ ffmpeg: string; ffprobe: string }> | undefined;

function loadBinaries() {
  binaries ??= Promise.all([
    import('ffmpeg-static'),
    import('@ffprobe-installer/ffprobe'),
  ]).then(([ffmpeg, ffprobe]) => {
    // CommonJS modules: they arrive with or without a `default` wrapper.
    const ffmpegPath = (ffmpeg.default ?? ffmpeg) as unknown as string | null;
    const ffprobePath = (ffprobe.default ?? ffprobe).path;
    if (!ffmpegPath) throw new Error('ffmpeg-static has no binary here');
    return { ffmpeg: ffmpegPath, ffprobe: ffprobePath };
  });
  // Not cached when it fails, so the next video tries again.
  binaries.catch(() => (binaries = undefined));
  return binaries;
}

/** The default deadline, for a run on its own. */
export function deadlineIn(ms = FFMPEG_TIMEOUT_MS): number {
  return Date.now() + ms;
}

/** `deadline` is a time from Date.now(): the run is killed when it passes. */
export async function runFfmpeg(
  args: readonly string[],
  deadline = deadlineIn(),
): Promise<RunOutput> {
  const { ffmpeg } = await loadBinaries();
  return run(ffmpeg, ['-hide_banner', '-nostdin', '-y', ...args], deadline);
}

export async function probe(
  path: string,
  deadline = deadlineIn(),
): Promise<ProbeResult> {
  const { ffprobe } = await loadBinaries();
  const { stdout } = await run(
    ffprobe,
    ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path],
    deadline,
  );
  return JSON.parse(stdout) as ProbeResult;
}

function run(
  binary: string,
  args: readonly string[],
  deadline: number,
): Promise<RunOutput> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: Math.max(1, deadline - Date.now()),
      killSignal: 'SIGKILL',
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code, signal) => {
      const output = {
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      };
      if (code === 0) return resolve(output);
      const reason = signal ? `was killed (${signal})` : `exited with ${code}`;
      // The end of stderr says what went wrong; the rest is the banner.
      reject(
        new FfmpegError(
          `${binary.split(/[\\/]/).pop()} ${reason}`,
          output.stderr.slice(-4000),
        ),
      );
    });
  });
}
