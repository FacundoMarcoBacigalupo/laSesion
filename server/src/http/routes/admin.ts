import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import type { SessionStore } from '../../domain/session';
import { purgeSessionData } from '../../services/purge';
import { listAdminConversations } from '../../db/repos/adminConversations';

export function adminRouter(store: SessionStore) {
  const r = Router();
  r.get('/api/admin/conversations', requireAdmin, async (req, res, next) => {
    const rawLimit = Number(req.query.limit ?? 50);
    const beforeAt = req.query.beforeAt === undefined ? undefined : Number(req.query.beforeAt);
    const beforeId = req.query.beforeId === undefined ? undefined : String(req.query.beforeId);
    if (
      !Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100 ||
      (beforeAt !== undefined && (!Number.isSafeInteger(beforeAt) || !beforeId)) ||
      (beforeId !== undefined && beforeAt === undefined)
    ) {
      return res.status(400).json({ error: 'invalid_pagination' });
    }
    try {
      res.json(await listAdminConversations({ limit: rawLimit, beforeAt, beforeId }));
    } catch (error) {
      next(error);
    }
  });
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