export const NAME_MAX = 24;
export const QUESTION_MAX = 80;
export const QUEUE_PER_USER = 3;
export const MAX_PARTICIPANTS = 10;
export const RITUAL_MIN_ROOM = 2;
export const RITUAL_AFTER_QUESTIONS = 2;
export const RITUAL_HOLD_MS = 20_000;
export const RITUAL_QUESTIONS_MIN_MS = 20_000;
export const RITUAL_QUIET_MS = 8_000;
export const RITUAL_QUESTIONS_MAX_MS = 90_000;
export const RITUAL_CAULDRON_MS = 15_000;
export const RITUAL_LINES = {
  hold: 'No eres puro. El círculo te niega y te entrega a la muerte.',
  questions: 'Tu maldad es tibia. El abismo te escupe.',
  cauldron: 'Tu ofrenda fue una burla. El caldero se bebe tu alma.',
} as const;
export const HOLD_RELEASE_GHOST_MS = 4000;
export const HIDDEN_GHOST_MS = 3000;
export const DISCONNECT_GHOST_MS = 5000;
export const AI_HEARTBEAT_MS = 9000;
export const AI_MIN_GAP_MS = 2500;
export const AI_MAX_RPM = 12;
export const AI_TIMEOUT_MS = 7000;
export const BREAKER_FAILS = 3;
export const BREAKER_OPEN_MS = 60000;
export const TYPE_ON_MS = 55;
export const TYPE_GAP_MS = 20;
export const TYPE_NONLETTER_MS = 45;
export const WILL_DELAY_MS = 900;
export const PACT_PENALTY_MS = 4500;
export const PACT_CLAUSE_REVEAL_MS = 1300;
export const SIGN_BATCH_MS = 50;
export const SIGN_CANVAS = [240, 80] as const;
export const SIGN_PNG_MAX_BYTES = 200000;
export const EXORCISM_DECAY = 2;
export const EXORCISM_TICK_MS = 300;
export const EXORCISM_TAP = 12;
export const EXORCISM_SHAKE_DELTA = 6;
export const EXORCISM_SHAKE_MAX = 15;
export const EXORCISM_ACTIVE_WINDOW_MS = 800;
export const OFFER_POINTS = { pizza: 2, wifi: 1, ex: 3, battery: 2 } as const;
export const OFFER_MATCH_BONUS = 3;
export const OFFER_REPEAT_LIMIT = 3;
export const OFFER_REPEAT_PENALTY = -1;
export const CAULDRON_MAX_BODIES = 40;
export const CAULDRON_BODY_RADIUS = 13;
export const SNAPSHOT_MS = 15000;
export const RESTORE_MAX_AGE_MS = 10800000;
export const GHOST_HIDDEN_MS = HIDDEN_GHOST_MS;
export const GHOST_RELEASE_MS = HOLD_RELEASE_GHOST_MS;

export const MOOD_THRESHOLDS = { low: 4, mid: 9 } as const;

export const OFFER_KINDS = ['pizza', 'wifi', 'ex', 'battery'] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

export const OFFER_EMOJI: Record<OfferKind, string> = {
  pizza: '🍕',
  wifi: '📶',
  ex: '💔',
  battery: '🔋',
};

export const PHASES = ['LOBBY', 'SESSION', 'VOTING', 'VICTIM', 'PACT', 'EXORCISM', 'END'] as const;
export type Phase = (typeof PHASES)[number];

export const MOODS = ['calmo', 'furioso', 'hambriento', 'burlon'] as const;
export type Mood = (typeof MOODS)[number];

export const QUICK_QUESTIONS = [
  '¿Quién se va primero?',
  '¿Hay alguien más acá?',
  '¿Cómo muero?',
  '¿Qué hora es?',
  '¿Cuánto me queda?',
] as const;

export const QUICK_FALLBACKS = [
  'NICO. El elegido ya está en la sala.',
  'MIRA DETRAS. Siempre hay alguien más.',
  'SORPRESA. Te va a gustar. A mí sí.',
  'TARDE. Son las HH:MM. Ya es tarde.',
  'POCO. Batería: XX%. Y de lo otro, menos.',
] as const;