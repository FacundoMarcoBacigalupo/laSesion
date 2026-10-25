import { describe, it, expect } from 'vitest';
import { pickVictim } from '../src/domain/votes';
import type { User } from '@sesion/shared';

function u(id: string): User {
  return { id, token: id, name: id, socketId: null, connected: true, joinedAt: 0, lastSeenAt: 0, ip: '', ipMasked: '', userAgent: '', device: { lang: 'es', tz: 'UTC', dark: false, screen: '0x0', touch: false }, holding: false, hidden: false, hiddenCount: 0, ghost: false, consent: true };
}

describe('pickVictim', () => {
  it('single user', () => {
    expect(pickVictim([u('a')], new Map(), [])).toBe('a');
  });
  it('excludes ghosts', () => {
    const a = u('a'); const b = u('b'); b.ghost = true;
    expect(pickVictim([a, b], new Map(), [])).toBe('a');
  });
  it('weighted', () => {
    const a = u('a'); const b = u('b');
    const votes = new Map([['x', 'b'], ['y', 'b']]);
    // b weight 3 vs a 1, run many
    let bcount = 0;
    for (let i = 0; i < 1000; i++) {
      if (pickVictim([a, b], votes, [], () => Math.random()) === 'b') bcount++;
    }
    expect(bcount).toBeGreaterThan(600);
  });
});