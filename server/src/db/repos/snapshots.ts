import { getDb } from '../client';
import { logger } from '../../utils/logger';

export async function saveSnapshot(sessionId: string, stateJson: string): Promise<void> {
  try {
    await getDb().execute({ sql: 'INSERT INTO snapshots (session_id, state_json, at) VALUES (?,?,?) ON CONFLICT(session_id) DO UPDATE SET state_json=excluded.state_json, at=excluded.at', args: [sessionId, stateJson, Date.now()] });
  } catch (e) { logger.warn({ err: e }, 'saveSnapshot'); }
}
export async function loadLatestSnapshot(): Promise<{ state: string; at: number } | null> {
  try {
    const r = await getDb().execute('SELECT state_json, at FROM snapshots ORDER BY at DESC LIMIT 1');
    if (r.rows.length === 0) return null;
    const row = r.rows[0] as any;
    return { state: row.state_json, at: Number(row.at) };
  } catch (e) { logger.warn({ err: e }, 'loadLatestSnapshot'); return null; }
}