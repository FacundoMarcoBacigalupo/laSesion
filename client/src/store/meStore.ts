import { create } from 'zustand';

type MeState = {
  id: string | null;
  token: string | null;
  name: string | null;
  ghost: boolean;
  chosen: boolean;
  holding: boolean;
  setMe: (m: Partial<MeState>) => void;
  clear: () => void;
};

export const useMeStore = create<MeState>()((set) => ({
  id: null, token: null, name: null, ghost: false, chosen: false, holding: false,
  setMe: (m) => set((s) => ({ ...s, ...m })),
  clear: () => set({ id: null, token: null, name: null, ghost: false, chosen: false, holding: false }),
}));