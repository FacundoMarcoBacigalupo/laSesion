import type { Session, Mood } from '@sesion/shared';

export function setMood(session: Session, m: Mood): void {
  session.mood = m;
}