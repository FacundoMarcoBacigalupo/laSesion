export function nrm(c: string): string {
  return c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}