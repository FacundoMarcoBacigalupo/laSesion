import type { RitualState, RitualView, Session, User } from '@sesion/shared';
import {
  MAX_PARTICIPANTS,
  RITUAL_MIN_ROOM,
  RITUAL_AFTER_QUESTIONS,
  RITUAL_CAULDRON_MS,
  RITUAL_HOLD_MS,
  RITUAL_LINES,
  RITUAL_QUESTIONS_MAX_MS,
  RITUAL_QUESTIONS_MIN_MS,
  RITUAL_QUIET_MS,
} from '@sesion/shared';

export type RitualHit = { user: User; line: string };

export type RitualEffect = {
  eliminated: RitualHit[];
  announcement: string | null;
};

export function createRitual(): RitualState {
  return {
    stage: 'hold',
    roomSize: MAX_PARTICIPANTS,
    holdEndsAt: null,
    questionsStartedAt: null,
    lastAnswerAt: null,
    awaiting: 0,
    answers: 0,
    cauldronEndsAt: null,
    offeringScores: {},
    pureName: null,
    whispers: [],
    verdict: null,
  };
}

export function aliveUsers(session: Session): User[] {
  return [...session.users.values()].filter((user) => user.connected && !user.eliminated);
}

export function ritualView(session: Session): RitualView {
  const alive = aliveUsers(session);
  return {
    stage: session.ritual.stage,
    roomSize: session.ritual.roomSize,
    waiting: Math.max(0, session.ritual.roomSize - alive.length),
    alive: alive.length,
    holdEndsAt: session.ritual.holdEndsAt,
    cauldronEndsAt: session.ritual.cauldronEndsAt,
    holders: alive.map((user) => ({ id: user.id, name: user.name, holding: user.holding })),
    scores: alive
      .map((user) => ({ id: user.id, name: user.name, score: session.ritual.offeringScores[user.id] ?? 0 }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
    pureName: session.ritual.pureName,
    whispers: session.ritual.whispers.slice(-12),
    verdict: session.ritual.verdict,
    judged: [...session.users.values()]
      .filter((user) => user.eliminated)
      .map((user) => ({ id: user.id, line: user.eliminationLine ?? RITUAL_LINES.hold })),
  };
}

export function noteRitualAsk(session: Session, name: string, text: string, at = Date.now()): void {
  const ritual = session.ritual;
  ritual.awaiting += 1;
  ritual.whispers.push({ name, text, at });
  if (ritual.whispers.length > 20) ritual.whispers.splice(0, ritual.whispers.length - 20);
}

export function noteRitualAnswer(session: Session, at = Date.now()): void {
  const ritual = session.ritual;
  if (ritual.stage !== 'questions') return;
  ritual.answers += 1;
  ritual.awaiting = Math.max(0, ritual.awaiting - 1);
  if (ritual.awaiting === 0) ritual.lastAnswerAt = at;
}

export function scoreRitualOffering(session: Session, userId: string): number {
  const next = (session.ritual.offeringScores[userId] ?? 0) + 1;
  session.ritual.offeringScores[userId] = next;
  return next;
}

export function resetRitual(session: Session): void {
  const roomSize = session.ritual.roomSize;
  session.ritual = createRitual();
  session.ritual.roomSize = roomSize;
  session.say = null;
  session.sayDonePending = false;
  for (const user of session.users.values()) {
    user.eliminated = false;
    user.eliminationLine = undefined;
    user.holding = false;
  }
}

export function setRitualRoomSize(session: Session, size: number): boolean {
  if (session.ritual.stage !== 'hold') return false;
  const next = Math.round(size);
  if (next < RITUAL_MIN_ROOM || next > MAX_PARTICIPANTS) return false;
  session.ritual.roomSize = next;
  return true;
}

export function armRitualNow(session: Session, at = Date.now()): boolean {
  const ritual = session.ritual;
  if (ritual.stage === 'hold') {
    if (aliveUsers(session).length < ritual.roomSize) return false;
    ritual.holdEndsAt = at;
    return true;
  }
  if (ritual.stage === 'questions') {
    ritual.questionsStartedAt = at - RITUAL_QUESTIONS_MAX_MS;
    return true;
  }
  if (ritual.stage === 'cauldron') {
    if (ritual.cauldronEndsAt == null) return false;
    ritual.cauldronEndsAt = at;
    return true;
  }
  return false;
}

export function tickRitual(session: Session, at = Date.now(), rng: () => number = Math.random): RitualEffect | null {
  const ritual = session.ritual;
  if (ritual.stage === 'hold') return tickHold(session, at, rng);
  if (ritual.stage === 'questions') return tickQuestions(session, at, rng);
  if (ritual.stage === 'cauldron') return tickCauldron(session, at, rng);
  return null;
}

function tickHold(session: Session, at: number, rng: () => number): RitualEffect | null {
  const ritual = session.ritual;
  const alive = aliveUsers(session);
  if (alive.length < ritual.roomSize) {
    if (ritual.holdEndsAt == null) return null;
    ritual.holdEndsAt = null;
    return { eliminated: [], announcement: null };
  }
  if (ritual.holdEndsAt == null) {
    ritual.holdEndsAt = at + RITUAL_HOLD_MS;
    return { eliminated: [], announcement: null };
  }
  if (at < ritual.holdEndsAt) return null;

  const holders = alive.filter((user) => user.holding);
  const loose = alive.filter((user) => !user.holding);
  const ranked = [...shuffle(holders, rng), ...shuffle(loose, rng)];
  const keep = Math.max(RITUAL_AFTER_QUESTIONS, Math.ceil(ritual.roomSize / 2));
  const doomed = ranked.slice(keep);
  const eliminated = condemn(doomed, RITUAL_LINES.hold);
  ritual.stage = 'questions';
  ritual.holdEndsAt = null;
  ritual.questionsStartedAt = at;
  ritual.lastAnswerAt = null;
  ritual.awaiting = 0;
  ritual.answers = 0;
  ritual.verdict = {
    names: eliminated.map((hit) => hit.user.name),
    line: 'Impuros. El círculo los entrega a la oscuridad.',
  };
  return {
    eliminated,
    announcement: eliminated.length ? `${eliminated.length} ALMAS FUERON RECHAZADAS. EL CÍRCULO LAS ENTREGA.` : null,
  };
}

function tickQuestions(session: Session, at: number, rng: () => number): RitualEffect | null {
  const ritual = session.ritual;
  const startedAt = ritual.questionsStartedAt ?? at;
  const quietReady = ritual.answers >= 1
    && ritual.awaiting === 0
    && !session.ai.busy
    && ritual.lastAnswerAt != null
    && at - startedAt >= RITUAL_QUESTIONS_MIN_MS
    && at - ritual.lastAnswerAt >= RITUAL_QUIET_MS;
  const timedOut = at - startedAt >= RITUAL_QUESTIONS_MAX_MS;
  if (!quietReady && !timedOut) return null;

  const alive = aliveUsers(session);
  if (alive.length <= 1) return enterPact(session, alive[0] ?? null, []);
  if (alive.length === RITUAL_AFTER_QUESTIONS) return enterCauldron(session, at, []);

  const doomed = shuffle(alive, rng).slice(RITUAL_AFTER_QUESTIONS);
  const eliminated = condemn(doomed, RITUAL_LINES.questions);
  return enterCauldron(session, at, eliminated);
}

function tickCauldron(session: Session, at: number, rng: () => number): RitualEffect | null {
  const ritual = session.ritual;
  const alive = aliveUsers(session);
  if (alive.length <= 1) return enterPact(session, alive[0] ?? null, []);
  if (ritual.cauldronEndsAt == null || at < ritual.cauldronEndsAt) return null;

  const min = Math.min(...alive.map((user) => ritual.offeringScores[user.id] ?? 0));
  const tied = alive.filter((user) => (ritual.offeringScores[user.id] ?? 0) === min);
  const loser = shuffle(tied, rng)[0];
  if (!loser) return null;
  const eliminated = condemn([loser], RITUAL_LINES.cauldron);
  const winner = alive.find((user) => user.id !== loser.id) ?? null;
  return enterPact(session, winner, eliminated);
}

function enterCauldron(session: Session, at: number, eliminated: RitualHit[]): RitualEffect {
  const ritual = session.ritual;
  ritual.stage = 'cauldron';
  ritual.offeringScores = {};
  ritual.cauldronEndsAt = at + RITUAL_CAULDRON_MS;
  ritual.verdict = eliminated.length
    ? { names: eliminated.map((hit) => hit.user.name), line: 'Su maldad no alcanzó. El abismo los rechaza.' }
    : ritual.verdict;
  return {
    eliminated,
    announcement: eliminated.length ? `${eliminated.length} ALMAS NO TENÍAN MALDAD. EL ABISMO LAS RECHAZA.` : null,
  };
}

function enterPact(session: Session, winner: User | null, eliminated: RitualHit[]): RitualEffect {
  const ritual = session.ritual;
  ritual.stage = 'pact';
  ritual.cauldronEndsAt = null;
  ritual.pureName = winner?.name ?? null;
  if (eliminated.length) {
    ritual.verdict = {
      names: eliminated.map((hit) => hit.user.name),
      line: 'El caldero se tragó a quien ofrendó menos.',
    };
  }
  const fallen = eliminated[0];
  const announcement = fallen
    ? `${fallen.user.name.toUpperCase()} OFRENDÓ MENOS. EL CALDERO SE LO TRAGA.`
    : null;
  return { eliminated, announcement };
}

function condemn(users: User[], line: string): RitualHit[] {
  for (const user of users) {
    user.eliminated = true;
    user.eliminationLine = line;
    user.holding = false;
  }
  return users.map((user) => ({ user, line }));
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const left = next[i];
    const right = next[j];
    if (left === undefined || right === undefined) continue;
    next[i] = right;
    next[j] = left;
  }
  return next;
}
