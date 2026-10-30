import { describe, expect, it } from 'vitest';
import { SessionStore } from '../src/domain/session';
import { buildPrompt } from '../src/ai/prompt.builder';

describe('AI prompt builder', () => {
  it('handles connected participants without device metadata', () => {
    const store = new SessionStore();
    store.session.users.set('legacy-user', {
      id: 'legacy-user',
      name: 'Alma',
      connected: true,
      holding: true,
    } as any);

    const prompt = buildPrompt(store.session, 'responder_pregunta', '¿Quién está ahí?');

    expect(prompt.presentes[0]).toMatchObject({ n: 'Alma', sosteniendo: true });
  });
});
