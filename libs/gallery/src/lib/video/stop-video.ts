/** Stops a player and lets go of its file: a video taken out of the page keeps playing its sound. */
export function stopVideo(video: HTMLVideoElement | undefined): void {
  if (!video) return;
  video.pause();
  video.removeAttribute('src');
  video.load();
}
