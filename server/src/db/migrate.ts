import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './client';
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
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    let sql = fs.readFileSync(path.join(dir, f), 'utf8');
    if (process.env.DATABASE_URL?.startsWith('postgres')) {
      sql = sql
        .replace(/\bINTEGER PRIMARY KEY AUTOINCREMENT\b/g, 'BIGSERIAL PRIMARY KEY')
        .replace(/\bINTEGER\b/g, 'BIGINT');
    }
    // split statements by semicolon (naive but ok for our migrations)
    const stmts = sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
    for (const s of stmts) {
      try { await db.execute(s); } catch (e: any) {
        if (!/already exists|duplicate/i.test(String(e?.message))) logger.warn({ err: e?.message, stmt: s.slice(0, 80) }, 'migration stmt');
      }
    }
    logger.info({ file: f }, 'migrated');
  }
  process.exit(0);
}
main().catch((e) => { logger.error(e); process.exit(1); });
