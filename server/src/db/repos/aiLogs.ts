import { getDb } from '../client';
import { logger } from '../../utils/logger';

export async function logAi(sessionId: string, pedido: string, prompt: any, response: any, ok: boolean, latencyMs: number, fallback: boolean): Promise<void> {
  try {
    await getDb().execute({ sql: 'INSERT INTO ai_logs (session_id, pedido, prompt_json, response_json, ok, latency_ms, fallback, at) VALUES (?,?,?,?,?,?,?,?)', args: [sessionId, pedido, JSON.stringify(prompt), response ? JSON.stringify(response) : null, ok ? 1 : 0, latencyMs, fallback ? 1 : 0, Date.now()] });
  } catch (e) { logger.warn({ err: e }, 'logAi'); }
}