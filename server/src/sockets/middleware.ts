import { env } from '../config/env';
import { logger } from '../utils/logger';
import { extractIp } from '../services/ip';
import jwt from 'jsonwebtoken';
import { TokenBucket } from '../utils/tokenBucket';

export function authHandshakeMesa(socket: any, next: (err?: Error) => void) {
  const key = socket.handshake.auth?.key ?? socket.handshake.query?.key;
  if (key !== env.MESA_KEY) return next(new Error('unauthorized'));
  next();
}

export function authHandshakeAdmin(socket: any, next: (err?: Error) => void) {
  try {
    const cookieHeader = socket.handshake.headers?.cookie ?? '';
    const token = parseCookie(cookieHeader, 'admin_token');
    if (!token) return next(new Error('unauthorized'));
    const payload = jwt.verify(token, env.JWT_SECRET) as any;
    if (!payload?.admin) return next(new Error('unauthorized'));
    socket.data.admin = true;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
}

function parseCookie(header: string, name: string): string | undefined {
  if (!header) return;
  for (const part of header.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name && v) return decodeURIComponent(v);
  }
  return;
}

export const rateBuckets = new Map<string, TokenBucket>();

export function getBucket(socketId: string, event: string): TokenBucket {
  const key = socketId + ':' + event;
  if (!rateBuckets.has(key)) {
    const limits: Record<string, [number, number]> = {
      hold: [20, 20],
      visibility: [5, 5],
      ask: [1, 0.2],
      vote: [1, 1],
      offer: [3, 3],
      shake: [10, 10],
      'sign:stroke': [25, 25],
      'sign:done': [1, 1],
      join: [3, 0.05],
    };
    const [cap, refill] = limits[event] ?? [10, 10];
    rateBuckets.set(key, new TokenBucket(cap, refill));
  }
  return rateBuckets.get(key)!;
}

export function ipOfSocket(socket: any): string {
  return extractIp({ headers: socket.handshake.headers, ip: socket.handshake.address });
}