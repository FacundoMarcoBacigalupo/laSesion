import { getDb } from '../client';
import { logger } from '../../utils/logger';

export async function upsertQuestion(sessionId: string, q: any): Promise<void> {
  try {
    await getDb().execute({ sql: 'INSERT INTO questions (id, session_id, user_id, text, state, at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state', args: [q.id, sessionId, q.userId, q.text, q.state, q.at] });
  } catch (e) { logger.warn({ err: e }, 'upsertQuestion'); }
}