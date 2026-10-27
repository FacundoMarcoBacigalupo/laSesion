import { EV } from '@sesion/shared';
import { DirAskSchema, DirQueueDeleteSchema, DirPickVictimSchema, DirExorcismSchema, DirPhaseSchema, DirMoodSchema, DirSaySchema, DirAiToggleSchema, DirGhostSchema } from '@sesion/shared';
import { validate } from '@sesion/shared';
import { authHandshakeAdmin } from './middleware';
import type { SessionStore } from '../domain/session';
import type { AiScheduler } from '../ai/scheduler';
import { pickVictim } from '../domain/votes';
import { transition } from '../domain/phases';
import { startPact } from '../domain/pact';
import { buildTestament } from '../domain/testament';
import { startExorcism, stopExorcism } from '../domain/exorcism';
import { setMood } from '../domain/mood';
import { moderateText } from '../services/moderation';
import { newId } from '../utils/ids';
import { purgeSessionData } from '../services/purge';
import { logEvent } from '../db/repos/events';

export function registerAdmin(io: any, store: SessionStore, scheduler: AiScheduler) {
  const nsp = io.of('/admin');
  nsp.use((socket: any, next: any) => authHandshakeAdmin(socket, next));

  nsp.on('connection', (socket: any) => {
    socket.emit(EV.ADMIN_STATE, adminState(store));
    // periodic
    const iv = setInterval(() => {
      socket.emit(EV.ADMIN_STATE, adminState(store));
    }, 1000);
    socket.on('disconnect', () => clearInterval(iv));
  });

  // command handlers are on /admin namespace too
  nsp.on('connection', (socket: any) => {
    socket.on(EV.DIR_ASK, (payload: any, ack?: (r: any) => void) => {
      const v = validate(DirAskSchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      const data = v.data as any;
      let text: string = data.text ?? '';
      const quickId = data.quickId;
      if (quickId !== undefined) {
        const qs = ['¿Quién se va primero?', '¿Hay alguien más acá?', '¿Cómo muero?', '¿Qué hora es?', '¿Cuánto me queda?'];
        text = qs[quickId] ?? '';
      }
      // handle quick fixed answers with fallback; call AI responder_pregunta
      const hh = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      // if no hands, spirit refuses
      if (store.handsCount() === 0) {
        const t = 'Sin manos en la mesa no respondo. Sostené el vaso en el celular.';
        emitSayAll(io, store, t, text, store.session.mood, false);
        ack?.({ ok: true }); return;
      }
      scheduler.enqueue('responder_pregunta', 1, { pregunta: text }, true, text);
      // also immediate fallback-style? scheduler will call AI. But for quick questions spec has fixed answers. We'll let AI handle; fallbackFor doesn't map quickId. To honor spec, if quickId provided, use fallback fixed answer immediately? Spec says quick questions fixed text -> fallback answer. Hmm.
      // We'll instead emit a fixed answer for quick ones immediately (no AI) to match spec, using fallback-like fixed strings.
      if (quickId !== undefined) {
        const victimName = store.session.victimId ? store.session.users.get(store.session.victimId)?.name ?? 'NICO' : 'NICO';
        const bat = '??';
        const fixed = [
          `${victimName}. El elegido ya está en la sala.`,
          'MIRA DETRAS. Siempre hay alguien más.',
          'SORPRESA. Te va a gustar. A mí sí.',
          `TARDE. Son las ${hh}. Ya es tarde.`,
          `POCO. Batería: ${bat}%. Y de lo otro, menos.`,
        ];
        const fixedText = fixed[quickId] ?? '';
        emitSayAll(io, store, fixedText, String(text ?? ''), 'burlon', false);
      }
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_READ_QUEUE, (_p: any, ack?: (r: any) => void) => {
      const q = readRandomQuestionSafe(store);
      if (!q) { ack?.({ ok: false, error: 'empty' }); return; }
      // Toda pregunta pública se responde mediante la IA; el fallback solo
      // actúa si el proveedor no está disponible.
      scheduler.enqueue('responder_pregunta', 1, { nombre: q.name }, true, q.text);
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_QUEUE_DELETE, (payload: any, ack?: (r: any) => void) => {
      const v = validate(DirQueueDeleteSchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      const qid = (v.data as any).questionId;
      const q = store.session.queue.find((x) => x.id === qid);
      if (q) { q.state = 'deleted'; store.session.queue = store.session.queue.filter((x) => x.id !== qid); }
      io.of('/mesa').emit(EV.MESA_QUEUE, { size: store.session.queue.filter((x) => x.state === 'queued').length });
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_PICK_VICTIM, (payload: any, ack?: (r: any) => void) => {
      const v = validate(DirPickVictimSchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      const forcedId = (v.data as any).userId;
      let victimId: string | null = null;
      if (forcedId) victimId = forcedId;
      else {
        const users = [...store.session.users.values()];
        victimId = pickVictim(users, store.session.votes, store.session.victimId ? [store.session.victimId] : []);
      }
      if (!victimId) { ack?.({ ok: false, error: 'novictim' }); return; }
      chooseVictim(io, store, scheduler, victimId);
      ack?.({ ok: true, userId: victimId });
    });

    socket.on(EV.DIR_WILL, (_p: any, ack?: (r: any) => void) => {
      // trigger testamento
      triggerWill(io, store, scheduler);
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_PACT, (_p: any, ack?: (r: any) => void) => {
      const victimId = store.session.victimId;
      if (!victimId) { ack?.({ ok: false, error: 'novictim' }); return; }
      const clauses = fallbackClauses(store, victimId);
      // try AI
      scheduler.enqueue('pacto', 1, { victimId }, true);
      // start pact with fallback clauses immediately; AI may replace? We'll start with fallback then if AI returns, update? Simpler: start pact now with fallback clauses.
      const p = startPact(store.session, victimId, clauses);
      io.of('/mesa').emit(EV.MESA_PACT_START, { pactId: p.id, clauses: p.clauses, victimName: store.session.users.get(victimId)?.name });
      io.of('/play').emit(EV.PACT_OFFER, { pactId: p.id, clauses: p.clauses });
      // victim's phone
      const victimSocket = store.session.users.get(victimId)?.socketId;
      if (victimSocket) io.of('/play').to(victimSocket).emit(EV.PACT_OFFER, { pactId: p.id, clauses: p.clauses });
      ack?.({ ok: true, pactId: p.id });
    });

    socket.on(EV.DIR_GHOST, (payload: any, ack?: (r: any) => void) => {
      const v = validate(DirGhostSchema, payload);
      const uid = (v.ok ? (v.data as any).userId : undefined) ?? undefined;
      let target = uid;
      if (!target) {
        // pick random connected non-ghost
        const cands = [...store.session.users.values()].filter((u) => u.connected && !u.ghost);
        if (cands.length) target = cands[Math.floor(Math.random() * cands.length)]!.id;
      }
      if (target) {
        const u = store.session.users.get(target);
        if (u) {
          u.ghost = true;
          u.ghostSince = Date.now();
          const distorted = '¿Hay alguien ahí?'.split(' ').map((w) => w.split('').reverse().join('')).join(' ') + '…';
          u.ghostQuestion = distorted;
          io.of('/mesa').emit(EV.MESA_GHOST, { userId: u.id, name: u.name, question: distorted });
          io.of('/play').to(u.socketId ?? '').emit(EV.YOU_GHOST, { on: true });
          io.of('/play').emit(EV.SAY, { id: newId(8), text: `${u.name} ya no está... pero sigue acá. ${distorted}`, question: undefined, mood: store.session.mood, force: false });
          io.of('/mesa').emit(EV.MESA_SAY, { id: newId(8), text: `${u.name} ya no está... pero sigue acá. ${distorted}`, question: undefined, mood: store.session.mood, force: false });
        }
      }
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_WANT_OFFERING, (_p: any, ack?: (r: any) => void) => {
      const kinds = ['pizza', 'wifi', 'ex', 'battery'];
      store.session.offerings.want = kinds[Math.floor(Math.random() * kinds.length)] as any;
      io.of('/play').emit(EV.OFFERING_WANT, { kind: store.session.offerings.want });
      io.of('/mesa').emit(EV.MESA_OFFERING, { want: store.session.offerings.want, points: store.session.offerings.points, moodLabel: '', counts: store.session.offerings.counts });
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_EXORCISM, (payload: any, ack?: (r: any) => void) => {
      const v = validate(DirExorcismSchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      const action = (v.data as any).action;
      if (action === 'start') {
        startExorcism(store.session);
        io.of('/mesa').emit(EV.MESA_SAY, { id: newId(8), text: '¿Creen que pueden echarme?', question: undefined, mood: 'furioso', force: true });
        io.of('/play').emit(EV.SAY, { id: newId(8), text: '¿Creen que pueden echarme?', question: undefined, mood: 'furioso', force: true });
        scheduler.enqueue('exorcismo_inicio', 1, {}, true);
      } else {
        stopExorcism(store.session);
      }
      io.of('/play').emit(EV.EXORCISM, { active: store.session.exorcism.active, energy: store.session.exorcism.energy });
      io.of('/mesa').emit(EV.MESA_EXORCISM, { active: store.session.exorcism.active, energy: store.session.exorcism.energy });
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_PHASE, (payload: any, ack?: (r: any) => void) => {
      const v = validate(DirPhaseSchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      const phase = (v.data as any).phase;
      transition(store.session, phase);
      io.of('/play').emit(EV.PHASE, { phase });
      io.of('/mesa').emit(EV.MESA_PHASE, { phase });
      // if VICTIM, auto pick? spec says on entering VICTIM run pickVictim. We'll trigger if no victim.
      if (phase === 'VICTIM' && !store.session.victimId) {
        const users = [...store.session.users.values()];
        const vid = pickVictim(users, store.session.votes, []);
        if (vid) chooseVictim(io, store, scheduler, vid);
      }
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_MOOD, (payload: any, ack?: (r: any) => void) => {
      const v = validate(DirMoodSchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      setMood(store.session, (v.data as any).mood);
      io.of('/play').emit('mood', { mood: store.session.mood });
      io.of('/mesa').emit(EV.MESA_MOOD, { mood: store.session.mood });
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_SAY, (payload: any, ack?: (r: any) => void) => {
      const v = validate(DirSaySchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      const text = (v.data as any).text;
      emitSayAll(io, store, text, undefined, store.session.mood, true);
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_AI_TOGGLE, (payload: any, ack?: (r: any) => void) => {
      const v = validate(DirAiToggleSchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      const on = (v.data as any).on;
      scheduler.forceFallback(!on);
      store.session.ai.fallbackForced = !on;
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_PURGE, async (_p: any, ack?: (r: any) => void) => {
      await purgeSessionData(store.session.id);
      ack?.({ ok: true });
    });

    socket.on(EV.DIR_KICK, (payload: any, ack?: (r: any) => void) => {
      const uid = payload?.userId;
      const u = store.session.users.get(uid);
      if (u) {
        if (u.socketId) io.of('/play').sockets.get(u.socketId)?.disconnect(true);
        store.session.users.delete(uid);
        broadcastPlayersAdmin(io, store);
      }
      ack?.({ ok: true });
    });
  });
}

function chooseVictim(io: any, store: SessionStore, scheduler: AiScheduler, victimId: string) {
  store.session.victimId = victimId;
  const v = store.session.users.get(victimId);
  if (!v) return;
  v.wasVictim = true;
  const voteCount = [...store.session.votes.values()].filter((t) => t === victimId).length;
  // emit you:chosen to victim
  if (v.socketId) {
    io.of('/play').to(v.socketId).emit(EV.YOU_CHOSEN, { name: v.name, willText: null });
    io.of('/play').to(v.socketId).emit(EV.HAPTIC, { pattern: [200, 100, 300] });
  }
  io.of('/mesa').emit(EV.MESA_VICTIM, { userId: victimId, name: v.name });
  io.of('/mesa').emit(EV.MESA_SAY, { id: newId(8), text: `${v.name}. La sala habló (${voteCount} votos).`, question: undefined, mood: 'furioso', force: true });
  io.of('/play').emit(EV.SAY, { id: newId(8), text: `${v.name}. La sala habló (${voteCount} votos).`, question: undefined, mood: 'furioso', force: true });
  // 900ms later testamento
  setTimeout(() => triggerWill(io, store, scheduler, victimId), 900);
  scheduler.enqueue('victima', 1, { nombre: v.name, votos: voteCount }, true);
  store.recomputeTension();
  io.of('/admin').emit(EV.ADMIN_STATE, adminState(store));
}

function triggerWill(io: any, store: SessionStore, scheduler: AiScheduler, victimId?: string) {
  const vid = victimId ?? store.session.victimId;
  if (!vid) return;
  const v = store.session.users.get(vid);
  if (!v) return;
  const text = buildTestament(store.session, v);
  store.session.willText = text;
  // emit will to mesa and victim
  io.of('/mesa').emit(EV.MESA_WILL, { text });
  if (v.socketId) io.of('/play').to(v.socketId).emit(EV.SAY, { id: newId(8), text, question: undefined, mood: store.session.mood, force: true }); // hmm spec: testamento appears on victim phone too
  io.of('/mesa').emit(EV.MESA_SAY, { id: newId(8), text, question: undefined, mood: store.session.mood, force: true });
  scheduler.enqueue('testamento', 1, { nombre: v.name, herederoA: 'alguien', herederoB: 'otro' }, true);
  logEvent(store.session.id, vid, 'will', { text }).catch(() => {});
}

function emitSayAll(io: any, store: SessionStore, text: string, question: string | undefined, mood: string, force: boolean) {
  const id = newId(8);
  store.session.say = { id, text, question, force, startedAt: Date.now() };
  store.session.sayDonePending = true;
  setTimeout(() => { if (store.session.say?.id === id) { store.session.sayDonePending = false; store.session.say = null; } }, 6000);
  io.of('/mesa').emit(EV.MESA_SAY, { id, text, question, mood, force });
  io.of('/play').emit(EV.SAY, { id, text, question, mood, force });
}

function fallbackClauses(store: SessionStore, victimId: string): string[] {
  const v = store.session.users.get(victimId);
  const bat = v?.device?.battery;
  const modelo = v?.device?.model ?? 'celular';
  const nombre = v?.name ?? 'elegido';
  return [
    `Yo, el Espíritu, le concedo a ${nombre} 3 años de buena suerte.`,
    `A cambio, ${nombre} cede ${bat != null ? 'su ' + bat + '% de batería' : 'su cargador'} y su lugar en la fila del baño.`,
    'Cláusula 7: si responde "ya vuelvo", no vuelve.',
    `Letra chica: el Espíritu puede usar su ${modelo} para posesiones menores.`,
  ];
}

function readRandomQuestionSafe(store: SessionStore) {
  const queued = store.session.queue.filter((q) => q.state === 'queued');
  if (queued.length === 0) return null;
  const idx = Math.floor(Math.random() * queued.length);
  const q = queued[idx];
  if (!q) return null;
  q.state = 'answered';
  store.session.queue = store.session.queue.filter((x) => x.id !== q.id);
  store.session.history.push(q);
  return q;
}

function adminState(store: SessionStore) {
  const s = store.session;
  return {
    phase: s.phase,
    mood: s.mood,
    tension: Math.round(s.tension),
    users: [...s.users.values()].map((u) => ({
      id: u.id, name: u.name, ip: u.ip, ipMasked: u.ipMasked, device: u.device,
      holding: u.holding, hidden: u.hidden, hiddenCount: u.hiddenCount, ghost: u.ghost,
      connected: u.connected, joinedAt: u.joinedAt, lastSeenAt: u.lastSeenAt,
      wasVictim: u.id === s.victimId,
    })),
    queue: s.queue.filter((q) => q.state === 'queued'),
    voteCounts: countVotes(s),
    pact: s.pact,
    offerings: { counts: s.offerings.counts, points: s.offerings.points, want: s.offerings.want, offendedKinds: [...s.offerings.offendedKinds] },
    exorcism: { active: s.exorcism.active, energy: s.exorcism.energy },
    ai: { busy: s.ai.busy, lastAt: s.ai.lastAt, breakerOpen: s.ai.breakerOpen, fallbackForced: s.ai.fallbackForced },
    hands: store.handsCount(),
    total: store.totalCount(),
  };
}

function countVotes(s: any) {
  const m = new Map<string, number>();
  for (const t of s.votes.values()) m.set(t, (m.get(t) ?? 0) + 1);
  return Object.fromEntries([...m.entries()]);
}

function broadcastPlayersAdmin(io: any, store: SessionStore) {
  io.of('/admin').emit(EV.ADMIN_STATE, adminState(store));
}
