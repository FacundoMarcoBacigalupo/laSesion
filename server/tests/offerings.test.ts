import { describe, it, expect } from 'vitest';
import { applyOffering } from '../src/domain/offerings';
import type { Session } from '@sesion/shared';

function session(): Session {
  return { id: 's', startedAt: 0, phase: 'SESSION', mood: 'calmo', tension: 0, users: new Map(), queue: [], history: [], votes: new Map(), victimId: null, willText: null, pact: null, offerings: { counts: { pizza: 0, wifi: 0, ex: 0, battery: 0 }, points: 0, want: 'pizza', offendedKinds: new Set() }, exorcism: { active: false, energy: 0, shakers: new Map() }, ai: { busy: false, lastAt: 0, lastEvent: '', breakerOpen: false, failCount: 0, breakerUntil: 0, fallbackForced: false }, say: null, dropsLast30: [], recentDrops: [], aiLastSayDoneAt: 0, sayDonePending: false } as any;
}

describe('offerings', () => {
  it('match bonus', () => {
    const s = session();
    const r = applyOffering(s, 'u', 'pizza', 'Lucia');
    expect(r.points).toBe(5); // 2 + 3
    expect(s.offerings.want).not.toBe('pizza');
  });
  it('repeat penalty', () => {
    const s = session();
    s.offerings.want = 'wifi';
    applyOffering(s, 'u', 'pizza', 'Lucia');
    applyOffering(s, 'u', 'pizza', 'Lucia');
    const r3 = applyOffering(s, 'u', 'pizza', 'Lucia');
    expect(r3.points).toBe(-1);
  });
});