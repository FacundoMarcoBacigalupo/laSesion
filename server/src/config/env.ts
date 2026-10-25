import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  PUBLIC_URL: z.string().url().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().default(1),
  ADMIN_PASSWORD: z.string().min(1).default('cambiame'),
  JWT_SECRET: z.string().min(8).default('dev-secret-change-me-please-long'),
  MESA_KEY: z.string().min(1).default('clave-del-proyector'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  AI_ENABLED: z.coerce.boolean().default(true),
  AI_HEARTBEAT_MS: z.coerce.number().default(9000),
  AI_MIN_GAP_MS: z.coerce.number().default(2500),
  AI_MAX_RPM: z.coerce.number().default(12),
  AI_TIMEOUT_MS: z.coerce.number().default(7000),
  BREAKER_FAILS: z.coerce.number().default(3),
  BREAKER_OPEN_MS: z.coerce.number().default(60000),
  DATABASE_URL: z.string().default('file:./dev.db'),
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
    if (!parsed.data.GEMINI_API_KEY) console.warn('GEMINI_API_KEY missing');
    if (parsed.data.ADMIN_PASSWORD === 'cambiame') console.warn('ADMIN_PASSWORD default in prod');
  }
  return parsed.data;
}

export const env = load();