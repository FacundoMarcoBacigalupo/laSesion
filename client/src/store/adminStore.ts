import { create } from 'zustand';

export const useAdminStore = create<any>((set) => ({
  state: null,
  prompts: [] as any[],
  logs: [] as any[],
  conversations: [] as any[],
  setState: (s: any) => set({ state: s }),
  addPrompt: (p: any) => set((st: any) => ({ prompts: [p, ...st.prompts].slice(0, 20) })),
  addLog: (l: any) => set((st: any) => ({ logs: [l, ...st.logs].slice(0, 50) })),
  mergeConversations: (items: any[]) => set((st: any) => {
    const conversations = new Map<string, any>(st.conversations.map((item: any) => [item.id, item]));
    for (const item of items) {
      const current = conversations.get(item.id);
      conversations.set(item.id, {
        ...current,
        ...item,
        answer: item.answer ?? current?.answer ?? null,
        fallback: item.fallback ?? current?.fallback ?? null,
        latencyMs: item.latencyMs ?? current?.latencyMs ?? null,
      });
    }
    return {
      conversations: [...conversations.values()].sort((a: any, b: any) => b.at - a.at || b.id.localeCompare(a.id)),
    };
  }),
  addQuestion: (question: any) => set((st: any) => {
    const item = { ...question, answer: null, fallback: null, latencyMs: null };
    const current = st.conversations.find((conversation: any) => conversation.id === item.id);
    const conversations = [
      {
        ...current,
        ...item,
        answer: current?.answer ?? null,
        fallback: current?.fallback ?? null,
        latencyMs: current?.latencyMs ?? null,
      },
      ...st.conversations.filter((conversation: any) => conversation.id !== item.id),
    ];
    return { conversations: conversations.sort((a: any, b: any) => b.at - a.at || b.id.localeCompare(a.id)) };
  }),
  addAiReply: (reply: any) => set((st: any) => {
    const index = st.conversations.findIndex((item: any) => item.id === reply.questionId);
    const answer = reply.response?.texto ?? reply.response?.text ?? 'La IA no devolvió texto.';
    const existing = index < 0 ? null : st.conversations[index];
    const conversations = existing
      ? [...st.conversations]
      : reply.questionId && reply.question
        ? [{
            id: reply.questionId,
            name: reply.questionName ?? 'Participante',
            text: reply.question,
            at: Date.now(),
            answer: null,
            fallback: null,
            latencyMs: null,
          }, ...st.conversations]
        : st.conversations;
    const targetIndex = conversations.findIndex((item: any) => item.id === reply.questionId);
    if (targetIndex >= 0) {
      conversations[targetIndex] = {
        ...conversations[targetIndex],
        answer,
        fallback: reply.fallback,
        latencyMs: reply.latencyMs,
      };
    }
    return {
      conversations: conversations.sort((a: any, b: any) => b.at - a.at || b.id.localeCompare(a.id)),
      prompts: [reply, ...st.prompts].slice(0, 20),
      state: reply.providerStatus && st.state
        ? { ...st.state, ai: { ...st.state.ai, providerStatus: reply.providerStatus } }
        : st.state,
    };
  }),
}));