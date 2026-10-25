import { TYPE_ON_MS, TYPE_GAP_MS, TYPE_NONLETTER_MS } from '@sesion/shared';

export function nrm(c: string): string {
  return c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

export async function typeOnBoard(text: string, opts: { force?: boolean; hands?: () => number; onChar?: (ch: string) => void; onLetter?: (letter: string, on: boolean) => void; signal?: { stop: boolean } }): Promise<void> {
  const signal = opts.signal ?? { stop: false };
  for (const ch of text) {
    if (signal.stop) break;
    if (!opts.force && (opts.hands?.() ?? 0) === 0) {
      signal.stop = true;
      break;
    }
    opts.onChar?.(ch);
    const L = nrm(ch);
    if (/[A-Z]/.test(L) && L.length === 1) {
      opts.onLetter?.(L, true);
      await new Promise((r) => setTimeout(r, TYPE_ON_MS));
      opts.onLetter?.(L, false);
      await new Promise((r) => setTimeout(r, TYPE_GAP_MS));
    } else {
      await new Promise((r) => setTimeout(r, TYPE_NONLETTER_MS));
    }
  }
}