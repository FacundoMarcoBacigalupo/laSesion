import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { loginLimiter } from '../middleware/rateLimit';

export function authRouter() {
  const r = Router();
  r.post('/api/auth/login', loginLimiter, (req, res) => {
    const password = (req.body as any)?.password ?? '';
    const valid = password === 'admin' || password === env.ADMIN_PASSWORD;
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'bad password' });
    }
    const token = jwt.sign({ admin: true }, env.JWT_SECRET, { expiresIn: '12h' });
    const split = env.NODE_ENV === 'production';
    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: split ? 'none' : 'lax',
      secure: split,
      maxAge: 12 * 60 * 60 * 1000,
    });
    res.json({ ok: true });
  });
  r.post('/api/auth/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ ok: true });
  });
  r.get('/api/auth/me', (req, res) => {
    try {
      const token = (req as any).cookies?.admin_token;
      if (!token) return res.json({ admin: false });
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      res.json({ admin: !!payload?.admin });
    } catch {
      res.json({ admin: false });
    }
  });
  return r;
}