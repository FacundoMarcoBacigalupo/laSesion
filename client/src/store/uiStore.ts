import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUiStore = create<any>()(persist((set: any) => ({
  tier: 'high',
  audioActive: false,
  lite: false,
  setTier: (t: string) => set({ tier: t }),
  setAudioActive: (v: boolean) => set({ audioActive: v }),
  setLite: (v: boolean) => set({ lite: v }),
}), { name: 'ui-store' }));