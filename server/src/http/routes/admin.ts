import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import type { SessionStore } from '../../domain/session';
import { purgeSessionData } from '../../services/purge';

export function adminRouter(store: SessionStore) {
  const r = Router();
  r.get('/api/admin/export', requireAdmin, (_req, res) => {
    const s = store.session;
    res.json({
      session: { id: s.id, startedAt: s.startedAt, phase: s.phase },
      users: [...s.users.values()],
      queue: s.queue,
      history: s.history,
      votes: [...s.votes.entries()],
      pact: s.pact,
      offerings: s.offerings,
      exorcism: { active: s.exorcism.active, energy: s.exorcism.energy },
    });
  });
  r.post('/api/admin/purge', requireAdmin, async (_req, res) => {
    await purgeSessionData(store.session.id);
    res.json({ ok: true });
  });
  return r;
}