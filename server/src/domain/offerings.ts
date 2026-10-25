import type { Session, OfferKind } from '@sesion/shared';
import { OFFER_POINTS, OFFER_MATCH_BONUS, OFFER_REPEAT_LIMIT, OFFER_REPEAT_PENALTY, OFFER_KINDS } from '@sesion/shared';

export function applyOffering(session: Session, userId: string, kind: OfferKind, userName: string): { points: number; text: string; newWant: OfferKind } {
  session.offerings.counts[kind] = (session.offerings.counts[kind] ?? 0) + 1;
  let pts: number = OFFER_POINTS[kind];
  let text = '';
  let newWant = session.offerings.want;
  if (kind === session.offerings.want) {
    pts += OFFER_MATCH_BONUS;
    text = 'ESO QUERIA. ' + offerLine(kind);
    // new want
    newWant = OFFER_KINDS[Math.floor(Math.random() * OFFER_KINDS.length)] as OfferKind;
    session.offerings.want = newWant;
  } else {
    text = offerLine(kind);
    if (session.offerings.counts[kind] >= OFFER_REPEAT_LIMIT) {
      pts = OFFER_REPEAT_PENALTY;
      session.offerings.offendedKinds.add(kind);
      text = 'OTRA VEZ ESO? ME OFENDES.';
    }
  }
  session.offerings.points += pts;
  return { points: pts, text, newWant };
}

function offerLine(kind: OfferKind): string {
  switch (kind) {
    case 'pizza': return 'PIZZA... ¿DE MUZZARELLA?';
    case 'wifi': return 'TU WIFI AHORA ES MIO.';
    case 'ex': return 'TU EX SABE RICO.';
    case 'battery': return 'GRACIAS. TENIAS 5%.';
  }
}

export function moodLabel(points: number, offended: boolean): string {
  let base = points < 4 ? 'pide más' : points < 9 ? 'se calma' : 'saciado';
  if (offended) base += ' · ofendido';
  return base;
}