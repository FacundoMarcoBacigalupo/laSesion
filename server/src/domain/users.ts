import type { User, DeviceInfo } from '@sesion/shared';
import { newId, newToken } from '../utils/ids';
import { now } from '../utils/time';
import { maskIp } from '../services/ip';

export function createUser(params: {
  name: string;
  consent: boolean;
  device: DeviceInfo;
  ip: string;
  userAgent: string;
  resumeToken?: string;
}): User {
  return {
    id: newId(12),
    token: params.resumeToken ? params.resumeToken : newToken(),
    name: params.name.trim().slice(0, 24),
    socketId: null,
    connected: true,
    joinedAt: now(),
    lastSeenAt: now(),
    ip: params.ip,
    ipMasked: maskIp(params.ip),
    userAgent: params.userAgent,
    device: params.device,
    holding: false,
    hidden: false,
    hiddenCount: 0,
    ghost: false,
    consent: params.consent,
  };
}

export function resumeUser(u: User): User {
  u.connected = true;
  u.lastSeenAt = now();
  return u;
}

export function disconnectUser(u: User, socketId: string): boolean {
  if (u.socketId !== socketId) return false;
  u.connected = false;
  u.socketId = null;
  u.holding = false;
  u.lastSeenAt = now();
  return true;
}