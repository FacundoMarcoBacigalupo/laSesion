import { getDb } from '../client';
import { logger } from '../../utils/logger';

export async function upsertPact(sessionId: string, p: any): Promise<void> {
  try {
    await getDb().execute({ sql: 'INSERT INTO pacts (id, session_id, user_id, clauses_json, penalties, signed_at, signature_png) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET penalties=excluded.penalties, signed_at=excluded.signed_at, signature_png=excluded.signature_png', args: [p.id, sessionId, p.victimId, JSON.stringify(p.clauses), p.penalties, p.signedAt ?? null, p.signaturePng ?? null] });
  } catch (e) { logger.warn({ err: e }, 'upsertPact'); }
}