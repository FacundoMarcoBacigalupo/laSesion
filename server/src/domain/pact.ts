import { newId } from '../utils/ids';
import type { Session, Pact } from '@sesion/shared';
import { PACT_PENALTY_MS } from '@sesion/shared';

export function startPact(session: Session, victimId: string, clauses: string[]): Pact {
  const p: Pact = { active: true, id: newId(10), victimId, clauses, penalties: 0 };
  session.pact = p;
  return p;
}

export function validatePng(png: string): boolean {
  if (!png.startsWith('data:image/png;base64,')) return false;
  const b64 = png.split(',')[1] ?? '';
  // approximate byte size
  const bytes = Math.floor((b64.length * 3) / 4);
  return bytes <= 200000;
}

export const PACT_PENALTY_CYCLE = [
  '+1 año de mala suerte',
  'tu Wi-Fi se vuelve lento',
  'el espíritu lee tus chats',
  'perdés el último bondi',
  'la cláusula 7 pasa a ser la 1',
];