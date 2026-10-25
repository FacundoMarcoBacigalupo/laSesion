import { create } from 'zustand';

export const useAdminStore = create<any>((set) => ({
  state: null,
  prompts: [] as any[],
  logs: [] as any[],
  setState: (s: any) => set({ state: s }),
  addPrompt: (p: any) => set((st: any) => ({ prompts: [p, ...st.prompts].slice(0, 20) })),
  addLog: (l: any) => set((st: any) => ({ logs: [l, ...st.logs].slice(0, 50) })),
}));