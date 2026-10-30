import { describe, expect, it } from 'vitest';
import { SessionStore } from '../src/domain/session';

describe('session reset', () => {
  it('clears game state while preserving the session identity and AI configuration', () => {
    const store = new SessionStore();
    const sessionId = store.session.id;
    store.session.users.set('player', { id: 'player', name: 'Alma' } as any);
    store.session.queue.push({ id: 'question', userId: 'player', name: 'Alma', text: '¿Quién?', at: 1, state: 'queued' });
    store.session.ai.providerStatus = 'connected';
    store.session.ai.fallbackForced = true;
    store.session.ritual.stage = 'pact';

    store.reset();

    expect(store.session.id).toBe(sessionId);
    expect(store.session.users.size).toBe(0);
    expect(store.session.queue).toHaveLength(0);
    expect(store.session.ritual.stage).toBe('hold');
    expect(store.session.ai.providerStatus).toBe('connected');
    expect(store.session.ai.fallbackForced).toBe(true);
  });
});
