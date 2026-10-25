import { getDb } from '../client';
import { logger } from '../../utils/logger';

export async function logOffering(sessionId: string, userId: string, kind: string, points: number): Promise<void> {
  try {
    await getDb().execute({ sql: 'INSERT INTO offerings (session_id, user_id, kind, points, at) VALUES (?,?,?,?,?)', args: [sessionId, userId, kind, points, Date.now()] });
  } catch (e) { logger.warn({ err: e }, 'logOffering'); }
}