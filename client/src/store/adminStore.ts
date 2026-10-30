import { create } from 'zustand';

export const useAdminStore = create<any>((set) => ({
  state: null,
  prompts: [] as any[],
  logs: [] as any[],
  conversations: [] as any[],
  setState: (s: any) => set({ state: s }),
  addPrompt: (p: any) => set((st: any) => ({ prompts: [p, ...st.prompts].slice(0, 20) })),
  addLog: (l: any) => set((st: any) => ({ logs: [l, ...st.logs].slice(0, 50) })),
  addQuestion: (question: any) => set((st: any) => ({
    conversations: [{ ...question, answer: null, fallback: null, latencyMs: null }, ...st.conversations].slice(0, 30),
  })),
  addAiReply: (reply: any) => set((st: any) => {
    const index = st.conversations.findIndex((item: any) => item.id === reply.questionId);
    if (index < 0) return { prompts: [reply, ...st.prompts].slice(0, 20) };
    const conversations = [...st.conversations];
    conversations[index] = {
      ...conversations[index],
      answer: reply.response?.texto ?? reply.response?.text ?? 'La IA no devolvió texto.',
      fallback: reply.fallback,
      latencyMs: reply.latencyMs,
    };
    return {
      conversations,
      prompts: [reply, ...st.prompts].slice(0, 20),
      state: reply.providerStatus && st.state
        ? { ...st.state, ai: { ...st.state.ai, providerStatus: reply.providerStatus } }
        : st.state,
    };
  }),
}));