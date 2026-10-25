import { getDb } from '../client';
import { logger } from '../../utils/logger';

export async function logEvent(sessionId: string, userId: string | null, type: string, payload?: any): Promise<void> {
  try {
    await getDb().execute({ sql: 'INSERT INTO events (session_id, user_id, type, payload_json, at) VALUES (?,?,?,?,?)', args: [sessionId, userId, type, payload ? JSON.stringify(payload) : null, Date.now()] });
  } catch (e) { logger.warn({ err: e }, 'logEvent'); }
}