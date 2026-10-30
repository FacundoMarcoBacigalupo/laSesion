import type { User } from '@sesion/shared';

export function distortQuestion(text: string): string {
  const question = text.trim() || '¿Hay alguien ahí?';
  return question.endsWith('…') ? question : `${question}…`;
}

export function isGhostCandidate(u: User, hiddenMs: number, releasedMs: number, disconnectedMs: number, phase: string): boolean {
  if (u.ghost) return false;
  if (u.hidden && u.hiddenSince && Date.now() - u.hiddenSince > 3000) return true;
  if (!u.holding && u.releasedAt && (phase === 'SESSION' || phase === 'VOTING' || phase === 'VICTIM') && Date.now() - u.releasedAt > 4000) return true;
  if (!u.connected && u.lastSeenAt && Date.now() - u.lastSeenAt > 5000) return true;
  return false;
}