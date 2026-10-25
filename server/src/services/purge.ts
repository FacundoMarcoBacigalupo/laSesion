import { getDb } from '../db/client';
import { logger } from '../utils/logger';

export async function purgeSessionData(sessionId: string): Promise<void> {
  const db = getDb();
  const tables = ['events', 'questions', 'votes', 'pacts', 'offerings', 'ai_logs', 'snapshots', 'users'];
  for (const t of tables) {
    try { await db.execute({ sql: `DELETE FROM ${t} WHERE session_id=?`, args: [sessionId] }); } catch (e) { logger.warn({ err: e }, 'purge ' + t); }
  }
  try { await db.execute({ sql: 'DELETE FROM sessions WHERE id=?', args: [sessionId] }); } catch (e) { logger.warn({ err: e }, 'purge sessions'); }
}