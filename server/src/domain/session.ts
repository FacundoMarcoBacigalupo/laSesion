import { newId } from '../utils/ids';
import type {
  Session, User, Question, Phase, Mood, OfferKind, SessionSnapshot, AiState, Exorcism, Offerings, Pact, SayState,
} from '@sesion/shared';
import { now } from '../utils/time';
import { OFFER_POINTS, OFFER_KINDS } from '@sesion/shared';
import { createRitual } from './ritual';

export class SessionStore {
  session: Session;

  constructor(id?: string) {
    const startedAt = now();
    this.session = {
      id: id ?? newId(10),
      startedAt,
      phase: 'LOBBY',
      mood: 'calmo',
      tension: 0,
      users: new Map(),
      queue: [],
      history: [],
      votes: new Map(),
      victimId: null,
      willText: null,
      pact: null,
      offerings: {
        counts: Object.fromEntries(OFFER_KINDS.map((k) => [k, 0])) as Record<OfferKind, number>,
        points: 0,
        want: OFFER_KINDS[Math.floor(Math.random() * OFFER_KINDS.length)] as OfferKind,
        offendedKinds: new Set(),
      },
      exorcism: { active: false, energy: 0, shakers: new Map() },
      ai: { busy: false, lastAt: 0, lastEvent: '', breakerOpen: false, failCount: 0, breakerUntil: 0, fallbackForced: false },
      say: null,
      dropsLast30: [],
      recentDrops: [],
      aiLastSayDoneAt: 0,
      sayDonePending: false,
      ritual: createRitual(),
    };
  }

  get id() { return this.session.id; }

  addUser(u: User) { this.session.users.set(u.id, u); }
  getUser(id: string) { return this.session.users.get(id); }
  removeUser(id: string) { this.session.users.delete(id); }
  allUsers() { return [...this.session.users.values()]; }
  connectedUsers() { return this.allUsers().filter((u) => u.connected); }

  setPhase(p: Phase) { this.session.phase = p; }
  setMood(m: Mood) { this.session.mood = m; }
  setTension(v: number) { this.session.tension = Math.max(0, Math.min(100, v)); }

  recomputeTension() {
    const total = Math.max(1, this.connectedUsers().length);
    const hands = this.connectedUsers().filter((u) => u.holding).length;
    const drops = this.session.recentDrops.filter((t: number) => Date.now() - t < 30000).length;
    this.session.recentDrops = this.session.recentDrops.filter((t: number) => Date.now() - t < 30000);
    const ghosts = this.allUsers().filter((u) => u.ghost).length;
    const penalties = this.session.pact?.active && !this.session.pact.signedAt ? this.session.pact.penalties : 0;
    const t = 40 * (hands / total) + 8 * drops + 10 * ghosts + 5 * penalties;
    this.session.tension = Math.max(0, Math.min(100, t));
  }

  handsCount() { return this.connectedUsers().filter((u) => u.holding).length; }
  totalCount() { return this.connectedUsers().length; }

  snapshot(): SessionSnapshot {
    const s = this.session;
    return {
      id: s.id,
      startedAt: s.startedAt,
      phase: s.phase,
      mood: s.mood,
      tension: s.tension,
      users: [...s.users.entries()],
      queue: s.queue,
      history: s.history,
      votes: [...s.votes.entries()],
      victimId: s.victimId,
      willText: s.willText,
      pact: s.pact,
      offerings: {
        counts: { ...s.offerings.counts },
        points: s.offerings.points,
        want: s.offerings.want,
        offendedKinds: [...s.offerings.offendedKinds],
      },
      exorcism: {
        active: s.exorcism.active,
        energy: s.exorcism.energy,
        shakers: [...s.exorcism.shakers.entries()],
      },
      ai: { ...s.ai },
    };
  }

  restore(snap: any): void {
    const s = snap as SessionSnapshot;
    this.session.id = s.id;
    this.session.startedAt = s.startedAt;
    this.session.phase = s.phase;
    this.session.mood = s.mood;
    this.session.tension = s.tension;
    this.session.users = new Map();
    this.session.queue = [];
    this.session.history = s.history ?? [];
    this.session.votes = new Map();
    this.session.victimId = null;
    this.session.willText = null;
    this.session.pact = s.pact;
    if (s.offerings) {
      this.session.offerings = {
        counts: s.offerings.counts,
        points: s.offerings.points,
        want: s.offerings.want,
        offendedKinds: new Set(s.offerings.offendedKinds),
      };
    }
    if (s.exorcism) {
      this.session.exorcism = {
        active: s.exorcism.active,
        energy: s.exorcism.energy,
        shakers: new Map(s.exorcism.shakers),
      };
    }
    if (s.ai) this.session.ai = s.ai;
  }
}