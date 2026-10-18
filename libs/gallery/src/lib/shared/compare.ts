/**
 * Orders strings by UTF-16 code units, the same everywhere, unlike `localeCompare`,
 * so the server and the browser agree on every order. Internal to the library.
 */
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
