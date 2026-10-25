import { getDb } from '../client';
import { logger } from '../../utils/logger';

export async function upsertSession(id: string, startedAt: number): Promise<void> {
  try {
    await getDb().execute({ sql: 'INSERT INTO sessions (id, started_at) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET started_at=started_at', args: [id, startedAt] });
  } catch (e) { logger.warn({ err: e }, 'upsertSession'); }
}
export async function endSession(id: string, summary?: string): Promise<void> {
  try { await getDb().execute({ sql: 'UPDATE sessions SET ended_at=?, summary=? WHERE id=?', args: [Date.now(), summary ?? null, id] }); }
  catch (e) { logger.warn({ err: e }, 'endSession'); }
}