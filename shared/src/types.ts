import type { Phase, Mood, OfferKind } from './constants';

export type DeviceInfo = {
  model?: string;
  platform?: string;
  lang: string;
  tz: string;
  battery?: number | null;
  charging?: boolean;
  dark: boolean;
  screen: string;
  memory?: number;
  touch: boolean;
};

export type User = {
  id: string;
  token: string;
  name: string;
  socketId: string | null;
  connected: boolean;
  joinedAt: number;
  lastSeenAt: number;
  ip: string;
  ipMasked: string;
  userAgent: string;
  device: DeviceInfo;
  holding: boolean;
  holdSince?: number;
  releasedAt?: number;
  hidden: boolean;
  hiddenSince?: number;
  hiddenCount: number;
  ghost: boolean;
  ghostSince?: number;
  ghostQuestion?: string;
  consent: boolean;
  wasVictim?: boolean;
};

export type Question = {
  id: string;
  userId: string;
  name: string;
  text: string;
  at: number;
  state: 'queued' | 'answered' | 'deleted';
};

export type Pact = {
  active: boolean;
  id: string;
  victimId: string;
  clauses: string[];
  penalties: number;
  signedAt?: number;
  signaturePng?: string;
};

export type Offerings = {
  counts: Record<OfferKind, number>;
  points: number;
  want: OfferKind;
  offendedKinds: Set<OfferKind>;
};

export type Exorcism = {
  active: boolean;
  energy: number;
  shakers: Map<string, number>;
};

export type AiState = {
  busy: boolean;
  lastAt: number;
  lastEvent: string;
  breakerOpen: boolean;
  failCount: number;
  breakerUntil: number;
  fallbackForced: boolean;
};

export type SayState = {
  id: string;
  text: string;
  question?: string;
  force: boolean;
  startedAt: number;
} | null;

export type Session = {
  id: string;
  startedAt: number;
  endedAt?: number;
  phase: Phase;
  mood: Mood;
  tension: number;
  users: Map<string, User>;
  queue: Question[];
  history: Question[];
  votes: Map<string, string>;
  victimId: string | null;
  willText: string | null;
  pact: Pact | null;
  offerings: Offerings;
  exorcism: Exorcism;
  ai: AiState;
  say: SayState;
  dropsLast30: number[];
  recentDrops: number[];
  aiLastSayDoneAt: number;
  sayDonePending: boolean;
};

export type SessionSnapshot = {
  id: string;
  startedAt: number;
  phase: Phase;
  mood: Mood;
  tension: number;
  users: [string, User][];
  queue: Question[];
  history: Question[];
  votes: [string, string][];
  victimId: string | null;
  willText: string | null;
  pact: Pact | null;
  offerings: { counts: Record<OfferKind, number>; points: number; want: OfferKind; offendedKinds: OfferKind[] };
  exorcism: { active: boolean; energy: number; shakers: [string, number][] };
  ai: AiState;
};

export type AiPedido =
  | 'latido'
  | 'responder_pregunta'
  | 'usar_cola'
  | 'victima'
  | 'testamento'
  | 'pacto'
  | 'fantasma'
  | 'ofrenda'
  | 'exorcismo_inicio'
  | 'exorcismo_fin'
  | 'despedida';

export type AiResponse = {
  texto: string;
  humor: Mood;
  clausulas?: string[];
};

export type GhostInfo = { userId: string; name: string; question: string };

export type Counts = { players: number; hands: number };