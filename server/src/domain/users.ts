import type { DeviceInfo, Session, User } from '@sesion/shared';
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

export function removeParticipant(
  session: Pick<Session, 'users' | 'votes' | 'queue' | 'victimId' | 'willText'>,
  userId: string,
  socketId: string,
): boolean {
  const user = session.users.get(userId);
  if (!user || user.socketId !== socketId) return false;

  session.users.delete(userId);
  session.votes.delete(userId);
  for (const [voterId, targetId] of session.votes) {
    if (targetId === userId) session.votes.delete(voterId);
  }
  session.queue = session.queue.filter((question) => question.userId !== userId || question.state !== 'queued');
  if (session.victimId === userId) {
    session.victimId = null;
    session.willText = null;
  }
  return true;
}