import { describe, it, expect } from 'vitest';
import { startExorcism, applyShake, decayExorcism } from '../src/domain/exorcism';
import type { Session } from '@sesion/shared';

function session(): Session {
  return { id: 's', startedAt: 0, phase: 'EXORCISM', mood: 'calmo', tension: 0, users: new Map(), queue: [], history: [], votes: new Map(), victimId: null, willText: null, pact: null, offerings: { counts: { pizza: 0, wifi: 0, ex: 0, battery: 0 }, points: 0, want: 'pizza', offendedKinds: new Set() }, exorcism: { active: false, energy: 0, shakers: new Map() }, ai: { busy: false, lastAt: 0, lastEvent: '', breakerOpen: false, failCount: 0, breakerUntil: 0, fallbackForced: false }, say: null, dropsLast30: [], recentDrops: [], aiLastSayDoneAt: 0, sayDonePending: false } as any;
}

describe('exorcism', () => {
  it('decay and cap', () => {
    const s = session();
    startExorcism(s);
    applyShake(s, 'u1', 15, 1);
    expect(s.exorcism.energy).toBeLessThanOrEqual(100);
    // decay
    decayExorcism(s);
    expect(s.exorcism.energy).toBeLessThanOrEqual(100);
  });
  it('victory at 100', () => {
    const s = session();
    startExorcism(s);
    applyShake(s, 'u1', 15, 1);
    // force energy to 100
    s.exorcism.energy = 100;
    expect(s.exorcism.energy).toBe(100);
  });
});