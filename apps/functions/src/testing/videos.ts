import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runFfmpeg } from '../uploads/video/ffmpeg';

// Test helpers only; excluded from the functions build. Video fixtures made
// with ffmpeg's test sources, so no binary files live in the repository.

const dir = mkdtempSync(join(tmpdir(), 'tigy-video-fixtures-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

const made = new Map<string, Promise<string>>();

/** Makes the fixture once per test run and returns its path. */
function fixture(name: string, args: string[]): Promise<string> {
  let path = made.get(name);
  if (!path) {
    const out = join(dir, name);
    path = runFfmpeg([...args, out]).then(() => out);
    made.set(name, path);
  }
  return path;
}

const testsrc = (size: string, seconds: number, rate = 10) => [
  '-f',
  'lavfi',
  '-i',
  `testsrc=size=${size}:rate=${rate}:duration=${seconds}`,
];
const sine = (seconds: number) => [
  '-f',
  'lavfi',
  '-i',
  `sine=frequency=440:duration=${seconds}`,
];
const h264 = ['-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p'];
const aac = ['-c:a', 'aac', '-b:a', '64k'];

export const PHONE_TAGS = {
  'com.apple.quicktime.location.ISO6709': '+48.8584+002.2945+035.000/',
  'com.apple.quicktime.model': 'iPhone 17 Pro',
  'com.apple.quicktime.creationdate': '2026-05-01T12:00:00+0200',
};

/** 3 s, 320 × 180, H.264 and AAC, with a phone's location and model tags and a subtitle track. */
export function phoneMp4(): Promise<string> {
  const srt = join(dir, 'captions.srt');
  writeFileSync(srt, '1\n00:00:00,000 --> 00:00:02,000\nHello\n');
  return fixture('phone.mp4', [
    ...testsrc('320x180', 3),
    ...sine(3),
    '-i',
    srt,
    '-map',
    '0:v',
    '-map',
    '1:a',
    '-map',
    '2:s',
    ...h264,
    ...aac,
    '-c:s',
    'mov_text',
    '-movflags',
    'use_metadata_tags',
    ...Object.entries(PHONE_TAGS).flatMap(([key, value]) => [
      '-metadata',
      `${key}=${value}`,
    ]),
    '-metadata',
    'comment=Shot on a phone',
    '-metadata:s:v',
    'handler_name=Core Media Video',
  ]);
}

/** 1 s at 120 fps, H.264 in yuv420p: playable everywhere, but over the 60 fps cap. */
export function slowMotionMp4(): Promise<string> {
  return fixture('slow-motion.mp4', [...testsrc('320x180', 1, 120), ...h264]);
}

/** Stored 320 × 180 with a rotation that shows it upright as 180 × 320. */
export async function rotatedMov(): Promise<string> {
  const plain = await fixture('plain.mp4', [...testsrc('320x180', 1), ...h264]);
  return fixture('rotated.mov', [
    '-display_rotation',
    '90',
    '-i',
    plain,
    '-c',
    'copy',
  ]);
}

/** 4 s, 800 × 800, VP9 without sound. */
export function silentWebm(): Promise<string> {
  return fixture('silent.webm', [
    ...testsrc('800x800', 4),
    '-c:v',
    'libvpx-vp9',
    '-deadline',
    'realtime',
    '-cpu-used',
    '8',
    '-b:v',
    '200k',
  ]);
}

/** 12 s, 2160 × 3840, with sound. */
export function portraitWithSound(): Promise<string> {
  return fixture('portrait.mov', [
    ...testsrc('2160x3840', 12, 5),
    ...sine(12),
    ...h264,
    ...aac,
    '-shortest',
  ]);
}

/** Four minutes of 64 × 64, over the three-minute limit. */
export function longClip(): Promise<string> {
  return fixture('long.mp4', [...testsrc('64x64', 240, 1), ...h264]);
}

/** One 7680 × 4320 frame, over the 3840 × 2160 limit. */
export function eightKFrame(): Promise<string> {
  return fixture('8k.mp4', [
    '-f',
    'lavfi',
    '-i',
    'color=c=teal:size=7680x4320:rate=1:duration=1',
    ...h264,
  ]);
}

/** One 3840 × 2160 frame shown upright as 2160 × 3840: just inside the limit. */
export async function rotated4kFrame(): Promise<string> {
  const plain = await fixture('4k.mp4', [
    '-f',
    'lavfi',
    '-i',
    'color=c=teal:size=3840x2160:rate=1:duration=1',
    ...h264,
  ]);
  return fixture('4k-rotated.mp4', [
    '-display_rotation',
    '270',
    '-i',
    plain,
    '-c',
    'copy',
  ]);
}

/** 2 s, 1920 × 1080, whose first frame is black. */
export function blackFirstFrame(): Promise<string> {
  return fixture('black-first.mp4', [
    ...testsrc('1920x1080', 2),
    '-vf',
    "drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable='eq(n,0)'",
    ...h264,
  ]);
}

/** A MOV whose video codec is `zzzz`, which no decoder knows; muxers refuse to write one. */
export async function unknownCodecMov(): Promise<string> {
  const out = join(dir, 'unknown-codec.mov');
  if (!made.has('unknown-codec.mov')) {
    const plain = await fixture('plain.mov', [
      ...testsrc('320x180', 1),
      ...h264,
    ]);
    const bytes = readFileSync(plain);
    const entry = bytes.indexOf('avc1', bytes.indexOf('stsd'), 'latin1');
    bytes.write('zzzz', entry, 'latin1');
    writeFileSync(out, bytes);
    made.set('unknown-codec.mov', Promise.resolve(out));
  }
  return out;
}

/** {@link phoneMp4} cut off halfway, before its index. */
export async function truncatedMp4(): Promise<string> {
  const out = join(dir, 'truncated.mp4');
  if (!made.has('truncated.mp4')) {
    const whole = readFileSync(await phoneMp4());
    writeFileSync(out, whole.subarray(0, whole.length / 2));
    made.set('truncated.mp4', Promise.resolve(out));
  }
  return out;
}

/** `-f streamhash` of each kept stream, so a remux can be told from a re-encode. */
export async function streamHashes(path: string): Promise<string[]> {
  const { stdout } = await runFfmpeg([
    '-v',
    'error',
    '-i',
    path,
    '-map',
    '0:V',
    '-map',
    '0:a?',
    '-c',
    'copy',
    '-f',
    'streamhash',
    '-hash',
    'md5',
    '-',
  ]);
  return stdout.trim().split(/\r?\n/);
}
