/** A piece's width over its height, square when its size isn't known. */
export function shapeOf({ w, h }: { w: number; h: number }): number {
  return w > 0 && h > 0 ? w / h : 1;
}
