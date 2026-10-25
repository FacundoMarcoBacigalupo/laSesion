import { Router } from 'express';
import { env } from '../../config/env';

export function configRouter() {
  const r = Router();
  r.get('/api/config', (_req, res) => {
    res.json({ publicUrl: env.PUBLIC_URL, minPlayers: 1 });
  });
  return r;
}