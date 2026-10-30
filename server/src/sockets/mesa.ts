import { EV } from '@sesion/shared';
import type { SessionStore } from '../domain/session';
import { ritualView } from '../domain/ritual';
import { revealPendingSay } from './revealSay';

export function registerMesa(io: any, store: SessionStore) {
  const nsp = io.of('/mesa');

  nsp.on('connection', (socket: any) => {
    // send full state
    socket.emit(EV.MESA_STATE, buildState(store));
    // players
    socket.emit(EV.MESA_PLAYERS, { users: [...store.session.users.values()].map((u) => ({ id: u.id, name: u.name, holding: u.holding, ghost: u.ghost })) });
    // hands
    socket.emit(EV.MESA_HANDS, { n: store.handsCount(), total: store.totalCount() });
    socket.emit(EV.MESA_TENSION, { value: Math.round(store.session.tension) });
    socket.emit(EV.MESA_QUEUE, { size: store.session.queue.filter((q) => q.state === 'queued').length });
    // votes
    const counts: Record<string, number> = {};
    for (const t of store.session.votes.values()) counts[t] = (counts[t] ?? 0) + 1;
    socket.emit(EV.MESA_VOTES, { counts, topUserId: Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null });
    socket.emit(EV.MESA_PHASE, { phase: store.session.phase });
    socket.emit(EV.MESA_MOOD, { mood: store.session.mood });

    socket.on(EV.MESA_SAY_DONE, (payload: any) => {
      revealPendingSay(io, store, payload?.id);
    });

    socket.on('disconnect', () => {});
  });

  // periodic state emit every 5s
  setInterval(() => {
    nsp.emit(EV.MESA_STATE, buildState(store));
  }, 5000);
}

function buildState(store: SessionStore): any {
  const s = store.session;
  return {
    phase: s.phase,
    mood: s.mood,
    tension: Math.round(s.tension),
    users: [...s.users.values()].map((u) => ({ id: u.id, name: u.name, holding: u.holding, ghost: u.ghost })),
    hands: store.handsCount(),
    total: store.totalCount(),
    queueSize: s.queue.filter((q) => q.state === 'queued').length,
    votes: countVotes(s),
    victimId: s.victimId,
    victimName: s.victimId ? s.users.get(s.victimId)?.name : null,
    willText: s.willText,
    pact: s.pact ? { id: s.pact.id, clauses: s.pact.clauses, penalties: s.pact.penalties, signedAt: s.pact.signedAt, signaturePng: s.pact.signaturePng, victimId: s.pact.victimId } : null,
    offerings: { counts: s.offerings.counts, points: s.offerings.points, want: s.offerings.want, offendedKinds: [...s.offerings.offendedKinds] },
    exorcism: { active: s.exorcism.active, energy: s.exorcism.energy },
    say: s.say,
    ritual: ritualView(store.session),
  };
}

function countVotes(s: any) {
  const m = new Map<string, number>();
  for (const t of s.votes.values()) m.set(t, (m.get(t) ?? 0) + 1);
  return Object.fromEntries([...m.entries()]);
}
