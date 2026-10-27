import { RESTORE_MAX_AGE_MS, SNAPSHOT_MS } from '@sesion/shared';
import { saveSnapshot, loadLatestSnapshot } from '../db/repos/snapshots';
import type { SessionStore } from '../domain/session';
import { logger } from '../utils/logger';

let timer: NodeJS.Timeout | null = null;

export function startPersistence(store: SessionStore): void {
  timer = setInterval(() => {
    void (async () => {
    try {
      const snap = store.snapshot();
      await saveSnapshot(store.session.id, JSON.stringify(snap));
    } catch (e) { logger.warn({ err: e }, 'snapshot'); }
    })();
  }, SNAPSHOT_MS);
}

export function stopPersistence(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

export async function restoreSession(store: SessionStore): Promise<boolean> {
  try {
    const snap = await loadLatestSnapshot();
    if (!snap) return false;
    if (Date.now() - snap.at > RESTORE_MAX_AGE_MS) return false;
    store.restore(JSON.parse(snap.state));
    logger.info('session restored from snapshot');
    return true;
  } catch (e) { logger.warn({ err: e }, 'restore'); return false; }
}
