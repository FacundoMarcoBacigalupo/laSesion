import { createClient, type Client } from '@libsql/client';
import pg from 'pg';
import type { Pool as PgPool } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let client: Client | null = null;
let pool: PgPool | null = null;
const { Pool } = pg;
type Db = { execute: (query: string | { sql: string; args: unknown[] }) => Promise<{ rows: any[] }> };

export function getDb(): Db {
  if (env.DATABASE_URL.startsWith('postgres')) {
    if (!pool) pool = new Pool({ connectionString: env.DATABASE_URL, max: 5, ssl: { rejectUnauthorized: false } });
    return { execute: async (input) => {
      const sql = typeof input === 'string' ? input : input.sql.replace(/\?/g, () => `$${++placeholder}`);
      const args = typeof input === 'string' ? [] : input.args;
      placeholder = 0;
      const result = await pool!.query(sql, args);
      return { rows: result.rows };
    } };
  }
  if (client) return client as unknown as Db;
  client = createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN || undefined,
  });
  return client as unknown as Db;
}

let placeholder = 0;

export async function initDb(): Promise<void> {
  const db = getDb();
  try {
    await db.execute('SELECT 1');
    logger.info('DB connected');
  } catch (e) {
    logger.error({ err: e }, 'DB connection failed; running in-memory only');
  }
}
