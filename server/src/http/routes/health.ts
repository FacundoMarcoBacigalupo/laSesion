import { Router } from 'express';
import type { SessionStore } from '../../domain/session';

export function healthRouter(store: SessionStore) {
  const r = Router();
  r.get('/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime(), phase: store.session.phase, users: store.totalCount() });
  });
  return r;
}