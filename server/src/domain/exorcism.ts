import type { Session } from '@sesion/shared';
import { EXORCISM_DECAY, EXORCISM_TICK_MS, EXORCISM_ACTIVE_WINDOW_MS } from '@sesion/shared';
import { now } from '../utils/time';

export function startExorcism(session: Session): void {
  session.exorcism.active = true;
  session.exorcism.energy = 0;
  session.exorcism.shakers.clear();
}

export function stopExorcism(session: Session): void {
  session.exorcism.active = false;
  session.exorcism.energy = 0;
}

export function applyShake(session: Session, userId: string, force: number, connectedCount: number): number {
  if (!session.exorcism.active) return session.exorcism.energy;
  session.exorcism.shakers.set(userId, now());
  // active shakers within window
  const cutoff = now() - EXORCISM_ACTIVE_WINDOW_MS;
  let active = 0;
  for (const [u, ts] of session.exorcism.shakers.entries()) {
    if (ts >= cutoff) active++;
    else session.exorcism.shakers.delete(u);
  }
  const total = Math.max(1, connectedCount);
  const gain = force * (0.5 + 0.5 * (active / total));
  session.exorcism.energy = Math.min(100, session.exorcism.energy + gain);
  return session.exorcism.energy;
}

export function decayExorcism(session: Session): number {
  if (!session.exorcism.active) return session.exorcism.energy;
  session.exorcism.energy = Math.max(0, session.exorcism.energy - EXORCISM_DECAY);
  return session.exorcism.energy;
}