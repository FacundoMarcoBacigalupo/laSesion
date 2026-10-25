import { getDb } from '../client';
import { logger } from '../../utils/logger';

export async function upsertUser(sessionId: string, u: any): Promise<void> {
  try {
    await getDb().execute({
      sql: `INSERT INTO users (id, session_id, name, ip, user_agent, device_json, joined_at, last_seen_at, hidden_count, was_ghost, was_victim, consent)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET last_seen_at=excluded.last_seen_at, hidden_count=excluded.hidden_count, was_ghost=excluded.was_ghost, was_victim=excluded.was_victim`,
      args: [u.id, sessionId, u.name, u.ip, u.userAgent, JSON.stringify(u.device), u.joinedAt, u.lastSeenAt, u.hiddenCount ?? 0, u.ghost ? 1 : 0, u.wasVictim ? 1 : 0, u.consent ? 1 : 0],
    });
  } catch (e) { logger.warn({ err: e }, 'upsertUser'); }
}