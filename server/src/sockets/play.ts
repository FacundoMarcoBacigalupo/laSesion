import { EV, MAX_PARTICIPANTS } from '@sesion/shared';
import { JoinSchema, HoldSchema, VisibilitySchema, AskSchema, VoteSchema, StrokeSchema, SignDoneSchema, OfferSchema, ShakeSchema } from '@sesion/shared';
import { validate } from '@sesion/shared';
import { getBucket, ipOfSocket, rateBuckets } from './middleware';
import { createUser, disconnectUser, resumeUser } from '../domain/users';
import { applyHold } from '../domain/hold';
import { enqueueQuestion } from '../domain/questions';
import { castVote } from '../domain/votes';
import { validatePng } from '../domain/pact';
import { isBanned } from '../services/bans';
import { applyOffering } from '../domain/offerings';
import { applyShake } from '../domain/exorcism';
import { distortQuestion } from '../domain/ghosts';
import { moderateText } from '../services/moderation';
import { newId } from '../utils/ids';
import { logEvent } from '../db/repos/events';
import { upsertUser } from '../db/repos/users';
import { upsertQuestion } from '../db/repos/questions';
import { upsertPact } from '../db/repos/pacts';
import { logOffering } from '../db/repos/offerings';
import type { SessionStore } from '../domain/session';
import type { AiScheduler } from '../ai/scheduler';

export function registerPlay(io: any, store: SessionStore, scheduler: AiScheduler) {
  const nsp = io.of('/play');

  nsp.on('connection', (socket: any) => {
    socket.data.userId = null;

    socket.on(EV.JOIN, (payload: any, ack?: (r: any) => void) => {
      if (!getBucket(socket.id, 'join').tryConsume()) { ack?.({ ok: false, error: 'rate' }); return; }
      const v = validate(JoinSchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      const data = v.data as any;
      const ip = ipOfSocket(socket);
      const ua = socket.handshake.headers['user-agent'] ?? '';
      // resume?
      let user = null;
      if (data.resumeToken) {
        for (const u of store.session.users.values()) {
          if (u.token === data.resumeToken) { user = u; break; }
        }
      }
      if (user) {
        resumeUser(user);
        user.socketId = socket.id;
        user.connected = true;
        user.device = data.device;
        user.consent = data.consent;
        socket.data.userId = user.id;
        socket.join(user.id);
      } else {
        if (store.totalCount() >= MAX_PARTICIPANTS) { ack?.({ ok: false, error: 'session_full' }); return; }
        user = createUser({ name: data.name, consent: data.consent, device: data.device, ip, userAgent: ua, resumeToken: data.resumeToken });
        // keep token from createUser (new)
        store.session.users.set(user.id, user);
        user.socketId = socket.id;
        socket.data.userId = user.id;
        socket.join(user.id);
        upsertUser(store.session.id, user).catch(() => {});
        logEvent(store.session.id, user.id, 'join', { name: user.name }).catch(() => {});
      }
      // emit sync
      const me = sanitizeUserForClient(user);
      ack?.({ ok: true, userId: user.id, token: user.token, phase: store.session.phase, me });
      // notify mesa
      broadcastPlayers(io, store);
    });

    socket.on('debug:hands:subscribe', () => {
      socket.join('hands-debug');
      socket.emit('debug:hands:state', handsDebugState(store));
    });

    socket.on(EV.HOLD, (payload: any) => {
      if (!getBucket(socket.id, 'hold').tryConsume()) return;
      const v = validate(HoldSchema, payload);
      if (!v.ok) return;
      const uid = socket.data.userId;
      if (!uid) return;
      const activeUser = store.session.users.get(uid);
      if (!activeUser?.connected || activeUser.socketId !== socket.id) return;
      const { dropped } = applyHold(store, uid, (v.data as any).on);
      const u = store.session.users.get(uid);
      if (u) u.lastSeenAt = Date.now();
      store.recomputeTension();
      // emit hands
      const n = store.handsCount();
      const total = store.totalCount();
      io.of('/play').emit(EV.HANDS, { n, total });
      io.of('/mesa').emit(EV.MESA_HANDS, { n, total });
      io.of('/mesa').emit(EV.MESA_TENSION, { value: Math.round(store.session.tension) });
      if (dropped) {
        // mood furious 6s handled by domain? set mood
        // spec: mood -> furioso temporal 6s. We'll set mood furious; revert not strictly. Keep simple.
        store.session.mood = 'furioso';
        io.of('/play').emit(EV.PHASE, { phase: store.session.phase });
        io.of('/mesa').emit(EV.MESA_MOOD, { mood: store.session.mood });
      }
      broadcastPlayers(io, store);
    });

    socket.on(EV.VISIBILITY, (payload: any) => {
      if (!getBucket(socket.id, 'visibility').tryConsume()) return;
      const v = validate(VisibilitySchema, payload);
      if (!v.ok) return;
      const uid = socket.data.userId;
      if (!uid) return;
      const u = store.session.users.get(uid);
      if (!u) return;
      const hidden = (v.data as any).hidden;
      u.hidden = hidden;
      if (hidden) {
        if (!u.hiddenSince) u.hiddenSince = Date.now();
        // ghost check after 3s handled by interval
      } else {
        u.hiddenSince = undefined;
        if (u.ghost) {
          u.ghost = false;
          io.of('/play').to(socket.id).emit(EV.YOU_GHOST, { on: false });
          io.of('/mesa').emit(EV.MESA_UNGHOST, { userId: u.id });
          scheduler.enqueue('fantasma', 2, { name: u.name, return: true }, false);
        }
      }
      u.lastSeenAt = Date.now();
      u.hiddenCount = u.hiddenCount ?? 0;
      if (hidden) u.hiddenCount++;
      upsertUser(store.session.id, u).catch(() => {});
    });

    socket.on(EV.ASK, (payload: any, ack?: (r: any) => void) => {
      if (!getBucket(socket.id, 'ask').tryConsume()) { ack?.({ ok: false, error: 'rate' }); return; }
      const v = validate(AskSchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      const uid = socket.data.userId;
      if (!uid) { ack?.({ ok: false, error: 'no user' }); return; }
      const u = store.session.users.get(uid);
      if (!u) { ack?.({ ok: false, error: 'no user' }); return; }
      if (store.session.phase === 'VOTING') { ack?.({ ok: false, error: 'voting' }); return; }
      const mod = moderateText((v.data as any).text);
      if (!mod.ok) { ack?.({ ok: false, error: mod.reason }); return; }
      const res = enqueueQuestion(store.session, uid, u.name, mod.text);
      if (!res.ok) { ack?.({ ok: false, error: res.reason }); return; }
       if (res.question) {
         // Las preguntas del jugador se responden inmediatamente: no pasan
         // por la cola pública ni requieren que el director las lea.
         res.question.state = 'answered';
         store.session.queue = store.session.queue.filter((q) => q.id !== res.question!.id);
         store.session.history.push(res.question);
         upsertQuestion(store.session.id, res.question).catch(() => {});
         logEvent(store.session.id, uid, 'ask', { text: res.question.text }).catch(() => {});
         scheduler.enqueue('responder_pregunta', 1, { nombre: u.name }, true, res.question.text);
       }
      io.of('/admin').emit(EV.ADMIN_STATE, adminState(store));
      ack?.({ ok: true, queued: true });
    });

    socket.on(EV.VOTE, (payload: any, ack?: (r: any) => void) => {
      if (!getBucket(socket.id, 'vote').tryConsume()) { ack?.({ ok: false, error: 'rate' }); return; }
      const v = validate(VoteSchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      const uid = socket.data.userId;
      if (!uid) { ack?.({ ok: false, error: 'no user' }); return; }
      const res = castVote(store.session, uid, (v.data as any).targetUserId);
      if (!res.ok) { ack?.({ ok: false, error: res.reason }); return; }
      // emit votes counts to mesa
      const counts: Record<string, number> = {};
      for (const t of store.session.votes.values()) counts[t] = (counts[t] ?? 0) + 1;
      const topUserId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      io.of('/mesa').emit(EV.MESA_VOTES, { counts, topUserId });
      io.of('/admin').emit(EV.ADMIN_STATE, adminState(store));
      ack?.({ ok: true });
    });

    socket.on(EV.SIGN_STROKE, (payload: any) => {
      if (!getBucket(socket.id, 'sign:stroke').tryConsume()) return;
      const v = validate(StrokeSchema, payload);
      if (!v.ok) return;
      const uid = socket.data.userId;
      const pact = store.session.pact;
      if (!pact || !pact.active) return;
      if (pact.victimId !== uid) return;
      // forward strokes to mesa
      io.of('/mesa').emit(EV.MESA_PACT_STROKE, { points: (v.data as any).points });
    });

    socket.on(EV.SIGN_CLEAR, (payload: any) => {
      const uid = socket.data.userId;
      const pact = store.session.pact;
      if (!pact || pact.victimId !== uid) return;
      io.of('/mesa').emit(EV.MESA_PACT_CLEAR, {});
    });

    socket.on(EV.SIGN_DONE, (payload: any, ack?: (r: any) => void) => {
      if (!getBucket(socket.id, 'sign:done').tryConsume()) { ack?.({ ok: false, error: 'rate' }); return; }
      const v = validate(SignDoneSchema, payload);
      if (!v.ok) { ack?.({ ok: false, error: v.error }); return; }
      const uid = socket.data.userId;
      const pact = store.session.pact;
      if (!pact || pact.victimId !== uid) { ack?.({ ok: false, error: 'nopact' }); return; }
      const png = (v.data as any).png;
      if (!validatePng(png)) { ack?.({ ok: false, error: 'badpng' }); return; }
      pact.signaturePng = png;
      pact.signedAt = Date.now();
      pact.active = false;
      // stop penalties handled by timer check pact.signedAt
      io.of('/play').to(uid).emit(EV.PACT_SEALED, { pactId: pact.id, png });
      io.of('/mesa').emit(EV.MESA_PACT_SEALED, { png });
      io.of('/admin').emit(EV.ADMIN_STATE, adminState(store));
      upsertPact(store.session.id, pact).catch(() => {});
      logEvent(store.session.id, uid, 'pact:signed', { pactId: pact.id }).catch(() => {});
      // emit say
      scheduler.enqueue('latido', 5); // not needed; say directly
      io.of('/mesa').emit(EV.MESA_SAY, { id: newId(8), text: 'FIRMADO. YA NO HAY VUELTA ATRAS.', question: undefined, mood: store.session.mood, force: true });
      io.of('/play').emit(EV.SAY, { id: newId(8), text: 'FIRMADO. YA NO HAY VUELTA ATRAS.', question: undefined, mood: store.session.mood, force: true });
      ack?.({ ok: true });
    });

    socket.on(EV.PACT_STANDALONE, (payload: any) => {
      const png = payload?.png;
      if (!validatePng(png)) return;
      const uid = socket.data.userId;
      const u = uid ? store.session.users.get(uid) : null;
      const name = u?.name ?? payload?.name ?? 'Anónimo';
      io.of('/mesa').emit(EV.MESA_PACT_SIGNED, { name, time: Date.now(), png });
    });

    socket.on(EV.OFFER, (payload: any) => {
      if (!getBucket(socket.id, 'offer').tryConsume()) return;
      const v = validate(OfferSchema, payload);
      if (!v.ok) return;
      const uid = socket.data.userId;
      if (!uid) return;
      const u = store.session.users.get(uid);
      if (!u) return;
      const kind = (v.data as any).kind as 'pizza' | 'wifi' | 'ex' | 'battery';
      const matched = kind === store.session.offerings.want;
      const repeat = (store.session.offerings.counts[kind] ?? 0) + 1 >= 3;
      const res = applyOffering(store.session, uid, kind, u.name);
      // emit cauldron
      io.of('/mesa').emit(EV.MESA_CAULDRON, { kind, byName: u.name });
      // emit offering state
      const off = store.session.offerings;
      io.of('/mesa').emit(EV.MESA_OFFERING, { want: off.want, points: off.points, moodLabel: moodLabel(off.points, off.offendedKinds.size > 0), counts: off.counts });
      io.of('/play').emit(EV.OFFERING_WANT, { kind: off.want });
      // haptic? no
      logOffering(store.session.id, uid, kind, res.points).catch(() => {});
      logEvent(store.session.id, uid, 'offer', { kind }).catch(() => {});
      // call AI ofrenda
      scheduler.enqueue('ofrenda', 3, { kind, matched, repeat, byName: u.name, matchedText: res.text }, true);
      // also update mood color? mood already maybe; set mood based on points? spec mood thresholds. We'll set mood via AI response or keep. Simple: if points>=9 mood calmo? Not exact. Leave AI.
      io.of('/admin').emit(EV.ADMIN_STATE, adminState(store));
    });

    socket.on(EV.SHAKE, (payload: any) => {
      if (!getBucket(socket.id, 'shake').tryConsume()) return;
      const v = validate(ShakeSchema, payload);
      if (!v.ok) return;
      const uid = socket.data.userId;
      if (!uid) return;
      const force = (v.data as any).force;
      const connected = store.totalCount();
      const energy = applyShake(store.session, uid, force, connected);
      // emit exorcism energy (max 10hz handled by interval? emit here but throttle not critical)
      io.of('/play').emit(EV.EXORCISM, { active: store.session.exorcism.active, energy: Math.round(energy) });
      io.of('/mesa').emit(EV.MESA_EXORCISM, { active: store.session.exorcism.active, energy: Math.round(energy) });
      if (energy >= 100 && !store.session.exorcism.active) {
        // won
        io.of('/play').emit(EV.EXORCISM, { active: false, energy: 0 });
        io.of('/mesa').emit(EV.MESA_EXORCISM_WON, {});
        io.of('/mesa').emit(EV.MESA_SAY, { id: newId(8), text: 'NO... ME VOY... PERO VUELVO.', question: undefined, mood: 'calmo', force: true });
        io.of('/play').emit(EV.SAY, { id: newId(8), text: 'NO... ME VOY... PERO VUELVO.', question: undefined, mood: 'calmo', force: true });
        scheduler.enqueue('exorcismo_fin', 2, {}, true);
        // vibrate clients
        io.of('/play').emit(EV.HAPTIC, { pattern: [300, 100, 300, 100, 300] });
      }
    });

    socket.on(EV.PING, () => {
      socket.emit('pong');
    });

    socket.on('disconnect', () => {
      const uid = socket.data.userId;
      if (!uid) return;
      const u = store.session.users.get(uid);
      if (u && disconnectUser(u, socket.id)) {
        // ghost after grace 5s handled by interval
        broadcastPlayers(io, store);
      }
      rateBuckets.delete(socket.id); // cleanup maybe
    });

    // send initial sync
    const syncPayload = {
      phase: store.session.phase,
      me: null,
      counts: { players: store.totalCount(), hands: store.handsCount() },
      want: store.session.offerings.want,
      exorcism: { active: store.session.exorcism.active, energy: store.session.exorcism.energy },
      pact: store.session.pact ? { active: store.session.pact.active, id: store.session.pact.id, clauses: store.session.pact.clauses, penalties: store.session.pact.penalties } : null,
    };
    socket.emit(EV.SYNC, syncPayload);
  });

  // ghost check interval
  setInterval(() => {
    const nowTs = Date.now();
    for (const u of store.session.users.values()) {
      if (u.ghost) continue;
      if (!u.connected && u.lastSeenAt && nowTs - u.lastSeenAt > 5000) {
        ghostUser(io, store, scheduler, u);
      }
      if (u.hidden && u.hiddenSince && nowTs - u.hiddenSince > 3000) {
        ghostUser(io, store, scheduler, u);
      }
      if (!u.holding && u.releasedAt && (store.session.phase === 'SESSION' || store.session.phase === 'VOTING' || store.session.phase === 'VICTIM') && nowTs - u.releasedAt > 4000) {
        ghostUser(io, store, scheduler, u);
      }
    }
    // recompute tension
    store.recomputeTension();
    io.of('/mesa').emit(EV.MESA_TENSION, { value: Math.round(store.session.tension) });
  }, 1000);

  // say done ack from mesa handled in mesa.ts; but play doesn't need.

  // pact penalties timer
  setInterval(() => {
    const pact = store.session.pact;
    if (pact && pact.active && !pact.signedAt) {
      pact.penalties++;
      const text = pact.penalties <= 5 ? ['+1 año de mala suerte', 'tu Wi-Fi se vuelve lento', 'el espíritu lee tus chats', 'perdés el último bondi', 'la cláusula 7 pasa a ser la 1'][(pact.penalties - 1) % 5] : 'penalidad';
      io.of('/play').emit(EV.PACT_PENALTY, { n: pact.penalties, text });
      io.of('/mesa').emit(EV.MESA_PACT_PENALTY, { n: pact.penalties, text });
      store.recomputeTension();
    }
  }, 4500);

  // exorcism decay emit
  setInterval(() => {
    if (store.session.exorcism.active) {
      const e = store.session.exorcism.energy;
      // decay applied by domain tick? apply here
      store.session.exorcism.energy = Math.max(0, e - 2);
      io.of('/play').emit(EV.EXORCISM, { active: true, energy: Math.round(store.session.exorcism.energy) });
      io.of('/mesa').emit(EV.MESA_EXORCISM, { active: true, energy: Math.round(store.session.exorcism.energy) });
    }
  }, 300);
}

function ghostUser(io: any, store: SessionStore, scheduler: AiScheduler, u: any) {
  if (u.ghost) return;
  u.ghost = true;
  u.ghostSince = Date.now();
  const lastQ = store.session.history.filter((q) => q.userId === u.id).slice(-1)[0]?.text ?? store.session.queue.find((q) => q.userId === u.id)?.text;
  const baseQ = lastQ ?? '¿Hay alguien ahí?';
  const distorted = distortQuestion(baseQ);
  u.ghostQuestion = distorted;
  io.of('/play').to(u.socketId ?? '').emit(EV.YOU_GHOST, { on: true });
  io.of('/mesa').emit(EV.MESA_GHOST, { userId: u.id, name: u.name, question: distorted });
  io.of('/play').emit(EV.SAY, { id: newId(8), text: `${u.name} ya no está... pero sigue acá. ${distorted}`, question: undefined, mood: store.session.mood, force: false });
  io.of('/mesa').emit(EV.MESA_SAY, { id: newId(8), text: `${u.name} ya no está... pero sigue acá. ${distorted}`, question: undefined, mood: store.session.mood, force: false });
  scheduler.enqueue('fantasma', 2, { nombre: u.name, pregunta: distorted }, true);
  broadcastPlayers(io, store);
}

function broadcastPlayers(io: any, store: SessionStore) {
  const users = [...store.session.users.values()].map((u) => ({ id: u.id, name: u.name, holding: u.holding, ghost: u.ghost }));
  io.of('/mesa').emit(EV.MESA_PLAYERS, { users });
  io.of('/mesa').emit(EV.MESA_HANDS, { n: store.handsCount(), total: store.totalCount() });
  io.of('/play').to('hands-debug').emit('debug:hands:state', handsDebugState(store));
  io.of('/admin').emit(EV.ADMIN_STATE, adminState(store));
}

function handsDebugState(store: SessionStore) {
  const users = [...store.session.users.values()].filter((u) => u.connected);
  return {
    hands: store.handsCount(),
    total: users.length,
    holding: users.filter((u) => u.holding).map((u) => ({
      name: u.name,
      device: u.device?.model || u.device?.platform || 'desconocido',
      platform: u.device?.platform ?? 'desconocida',
      screen: u.device?.screen ?? 'desconocida',
    })),
  };
}

function sanitizeUserForClient(u: any) {
  return { id: u.id, name: u.name, ghost: u.ghost, holding: u.holding };
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
    votes: Object.fromEntries([...new Map([...s.votes.values()].map((t) => [t, 0]))]) ,
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

function moodLabel(points: number, offended: boolean): string {
  let base = points < 4 ? 'pide más' : points < 9 ? 'se calma' : 'saciado';
  if (offended) base += ' · ofendido';
  return base;
}
