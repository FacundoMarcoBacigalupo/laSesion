import { createClient, type Client } from '@libsql/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;
  client = createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN || undefined,
  });
  return client;
}

export async function initDb(): Promise<void> {
  const db = getDb();
  try {
    await db.execute('SELECT 1');
    logger.info('DB connected');
  } catch (e) {
    logger.error({ err: e }, 'DB connection failed; running in-memory only');
  }
}