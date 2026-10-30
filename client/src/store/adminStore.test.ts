import { beforeEach, describe, expect, it } from 'vitest';
import { useAdminStore } from './adminStore';

describe('admin conversation feed', () => {
  beforeEach(() => {
    useAdminStore.setState({ conversations: [], prompts: [], state: { ai: {} } });
  });

  it('joins a participant question with its AI response', () => {
    useAdminStore.getState().addQuestion({ id: 'q-1', name: 'Ana', text: '¿Qué ves?', at: 1 });
    useAdminStore.getState().addAiReply({
      questionId: 'q-1',
      response: { texto: 'Veo una sombra.' },
      fallback: false,
      latencyMs: 120,
      providerStatus: 'connected',
    });

    expect(useAdminStore.getState().conversations).toEqual([{
      id: 'q-1',
      name: 'Ana',
      text: '¿Qué ves?',
      at: 1,
      answer: 'Veo una sombra.',
      fallback: false,
      latencyMs: 120,
    }]);
    expect(useAdminStore.getState().state.ai.providerStatus).toBe('connected');
  });

  it('merges persisted history without replacing a newer live answer', () => {
    useAdminStore.getState().addQuestion({ id: 'q-2', name: 'Leo', text: '¿Quién está?', at: 2 });
    useAdminStore.getState().addAiReply({
      questionId: 'q-2',
      question: '¿Quién está?',
      questionName: 'Leo',
      response: { texto: 'Alguien detrás de vos.' },
      fallback: false,
      latencyMs: 90,
    });
    useAdminStore.getState().mergeConversations([{
      id: 'q-2',
      name: 'Leo',
      text: '¿Quién está?',
      at: 2,
      answer: null,
      fallback: null,
      latencyMs: null,
    }]);

    expect(useAdminStore.getState().conversations[0].answer).toBe('Alguien detrás de vos.');
  });
});
