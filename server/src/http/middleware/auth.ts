import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req as any).cookies?.admin_token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    const payload = jwt.verify(token, env.JWT_SECRET) as any;
    if (!payload?.admin) return res.status(401).json({ error: 'unauthorized' });
    (req as any).admin = true;
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}