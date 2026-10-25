import { create } from 'zustand';

type SessionState = {
  phase: string;
  hands: number;
  total: number;
  mood: string;
  tension: number;
  queueSize: number;
  ghosts: any[];
  pact: any;
  offerings: any;
  exorcism: { active: boolean; energy: number };
  say: any;
  want: string;
  set: (p: Partial<SessionState>) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  phase: 'LOBBY',
  hands: 0,
  total: 0,
  mood: 'calmo',
  tension: 0,
  queueSize: 0,
  ghosts: [],
  pact: null,
  offerings: null,
  exorcism: { active: false, energy: 0 },
  say: null,
  want: 'pizza',
  set,
}));