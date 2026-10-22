/** Orders strings by UTF-16 code units, unlike `localeCompare`, so the server and the browser agree. */
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
