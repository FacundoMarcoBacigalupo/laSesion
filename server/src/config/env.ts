import { z } from 'zod';
import { AI_DAY_CEILING, AI_RITUAL_CEILING, AI_RPM_CEILING, keyMark } from '../ai/budget';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// El proceso puede arrancar desde la raíz o desde server/. Cargamos ambos
// lugares para que la configuración no dependa del directorio de ejecución.
const serverDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDir, '../../../.env'), override: true });
dotenv.config({ path: path.resolve(serverDir, '../../.env'), override: false });
dotenv.config({ override: false });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  PUBLIC_URL: z.string().url().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().default(1),
  ADMIN_PASSWORD: z.string().min(1).default('cambiame'),
  JWT_SECRET: z.string().min(8).default('dev-secret-change-me-please-long'),
  DEEPSEEK_API_KEY: z.string().optional().default(''),
  DEEPSEEK_MODEL: z.string().default('deepseek-flash'),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  AI_ENABLED: z.coerce.boolean().default(true),
  AI_HEARTBEAT_MS: z.coerce.number().default(9000),
  AI_MIN_GAP_MS: z.coerce.number().default(2500),
  AI_MAX_RPM: z.coerce.number().default(6),
  AI_MAX_CALLS: z.coerce.number().default(15),
  AI_MAX_CALLS_DAY: z.coerce.number().default(40),
  AI_TIMEOUT_MS: z.coerce.number().default(7000),
  BREAKER_FAILS: z.coerce.number().default(3),
  BREAKER_OPEN_MS: z.coerce.number().default(60000),
  DATABASE_URL: z.string().trim().min(1).default('file:./dev.db'),
  DATABASE_AUTH_TOKEN: z.string().optional().default(''),
  RETENTION_HOURS: z.coerce.number().default(24),
  LOG_LEVEL: z.string().default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

function load(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid env:', parsed.error.flatten());
    process.exit(1);
  }
  if (parsed.data.NODE_ENV === 'production') {
    if (!parsed.data.DEEPSEEK_API_KEY) console.warn('DEEPSEEK_API_KEY missing');
    if (parsed.data.ADMIN_PASSWORD === 'cambiame') console.warn('ADMIN_PASSWORD default in prod');
    let databaseUrl: URL;
    try {
      databaseUrl = new URL(parsed.data.DATABASE_URL);
    } catch {
      console.error('DATABASE_URL must be a valid PostgreSQL connection string in production');
      process.exit(1);
    }
    if (
      !['postgres:', 'postgresql:'].includes(databaseUrl!.protocol) ||
      !databaseUrl!.hostname ||
      !databaseUrl!.username ||
      databaseUrl!.pathname === '/'
    ) {
      console.error('DATABASE_URL must include a PostgreSQL host, username, and database in production');
      process.exit(1);
    }
  }
  return parsed.data;
}

export const env = load();

const mark = keyMark(env.DEEPSEEK_API_KEY);
console.info(JSON.stringify({
  event: 'deepseek.boot',
  enabled: env.AI_ENABLED,
  keyPresent: mark.present,
  keyLength: mark.length,
  keySuffix: mark.suffix,
  model: env.DEEPSEEK_MODEL,
  rpm: Math.min(AI_RPM_CEILING, env.AI_MAX_RPM),
  ritual: Math.min(AI_RITUAL_CEILING, env.AI_MAX_CALLS),
  day: Math.min(AI_DAY_CEILING, env.AI_MAX_CALLS_DAY),
}));
