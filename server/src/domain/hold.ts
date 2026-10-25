import type { Session, User } from '@sesion/shared';
import { now } from '../utils/time';

export function applyHold(store: { session: Session }, userId: string, on: boolean): { dropped: boolean } {
  const u = store.session.users.get(userId);
  if (!u) return { dropped: false };
  const wasHolding = u.holding;
  if (on) {
    u.holding = true;
    u.holdSince = now();
    u.releasedAt = undefined;
    if (u.ghost) {
      u.ghost = false;
      u.ghostSince = undefined;
    }
  } else {
    u.holding = false;
    u.releasedAt = now();
    if (wasHolding && (store.session.phase === 'SESSION' || store.session.phase === 'VOTING' || store.session.phase === 'VICTIM')) {
      store.session.recentDrops.push(now());
      (store as any).session.dropsLast30 = store.session.recentDrops;
      return { dropped: true };
    }
  }
  return { dropped: false };
}