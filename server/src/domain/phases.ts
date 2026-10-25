import type { Session, Phase } from '@sesion/shared';

export function canTransition(_from: Phase, _to: Phase): boolean {
  return true;
}

export function transition(session: Session, to: Phase): void {
  session.phase = to;
}