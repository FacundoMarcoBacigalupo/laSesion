import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './client';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findMigrationsDir(): string {
  const candidates = [
    path.join(__dirname, 'migrations'),
    path.join(process.cwd(), 'src', 'db', 'migrations'),
    path.join(process.cwd(), 'db', 'migrations'),
    path.join(process.cwd(), 'migrations'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return candidates[0]!;
}

async function main() {
  const db = getDb();
  const dir = findMigrationsDir();
  const isPostgres = env.DATABASE_URL.startsWith('postgres');
  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && (!f.endsWith('.postgres.sql') || isPostgres))
    .sort();
  const migrationTable = isPostgres
    ? await db.execute("SELECT to_regclass('public.schema_migrations') AS name")
    : await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'");

  if (!migrationTable.rows[0]?.name) {
    await db.execute('CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at BIGINT NOT NULL)');
  }

  const appliedMigrations = await db.execute('SELECT name FROM schema_migrations');
  const applied = new Set(appliedMigrations.rows.map((row) => String(row.name)));

  for (const f of files) {
    if (applied.has(f)) {
      logger.info({ file: f }, 'migration already applied');
      continue;
    }

    let sql = fs.readFileSync(path.join(dir, f), 'utf8');
    if (isPostgres) {
      sql = sql
        .replace(/\bINTEGER PRIMARY KEY AUTOINCREMENT\b/g, 'BIGSERIAL PRIMARY KEY')
        .replace(/\bINTEGER\b/g, 'BIGINT');
    }
    const stmts = sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
    for (const statement of stmts) await db.execute(statement);
    await db.execute({
      sql: 'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)',
      args: [f, Date.now()],
    });
    logger.info({ file: f }, 'migration applied');
  }
  process.exit(0);
}
main().catch((e) => { logger.error(e); process.exit(1); });
