import { getDb } from '../client';
import { logger } from '../../utils/logger';

export interface AdminConversation {
  id: string;
  sessionId: string;
  name: string;
  text: string;
  answer: string | null;
  fallback: boolean | null;
  latencyMs: number | null;
  at: number;
}

export async function saveAdminConversation(
  sessionId: string,
  conversation: Pick<AdminConversation, 'id' | 'name' | 'text' | 'at'> &
    Partial<Pick<AdminConversation, 'answer' | 'fallback' | 'latencyMs'>>,
): Promise<void> {
  try {
    await getDb().execute({
      sql: `INSERT INTO admin_conversations
        (id, session_id, user_name, question_text, answer_text, fallback, latency_ms, at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          user_name = excluded.user_name,
          question_text = excluded.question_text,
          answer_text = COALESCE(excluded.answer_text, admin_conversations.answer_text),
          fallback = COALESCE(excluded.fallback, admin_conversations.fallback),
          latency_ms = COALESCE(excluded.latency_ms, admin_conversations.latency_ms)`,
      args: [
        conversation.id,
        sessionId,
        conversation.name,
        conversation.text,
        conversation.answer ?? null,
        conversation.fallback == null ? null : conversation.fallback ? 1 : 0,
        conversation.latencyMs ?? null,
        conversation.at,
      ],
    });
  } catch (e) {
    logger.warn({ err: e, conversationId: conversation.id }, 'save admin conversation');
  }
}

export async function listAdminConversations(options: {
  limit: number;
  beforeAt?: number;
  beforeId?: string;
}): Promise<{ items: AdminConversation[]; hasMore: boolean }> {
  const where = options.beforeAt === undefined || options.beforeId === undefined
    ? ''
    : 'WHERE at < ? OR (at = ? AND id < ?)';
  const args = where
    ? [options.beforeAt, options.beforeAt, options.beforeId, options.limit + 1]
    : [options.limit + 1];
  const result = await getDb().execute({
    sql: `SELECT id, session_id, user_name, question_text, answer_text, fallback, latency_ms, at
      FROM admin_conversations ${where}
      ORDER BY at DESC, id DESC
      LIMIT ?`,
    args,
  });
  const rows = result.rows;
  const hasMore = rows.length > options.limit;
  return {
    items: rows.slice(0, options.limit).map((row: any) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      name: String(row.user_name),
      text: String(row.question_text),
      answer: row.answer_text == null ? null : String(row.answer_text),
      fallback: row.fallback == null ? null : Number(row.fallback) !== 0,
      latencyMs: row.latency_ms == null ? null : Number(row.latency_ms),
      at: Number(row.at),
    })),
    hasMore,
  };
}
