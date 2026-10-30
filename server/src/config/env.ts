import { z } from 'zod';
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
  MESA_KEY: z.string().min(1).default('clave-del-proyector'),
  DEEPSEEK_API_KEY: z.string().optional().default(''),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  AI_ENABLED: z.coerce.boolean().default(true),
  AI_HEARTBEAT_MS: z.coerce.number().default(9000),
  AI_MIN_GAP_MS: z.coerce.number().default(2500),
  AI_MAX_RPM: z.coerce.number().default(12),
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
    if (!/^postgres(?:ql)?:\/\//i.test(parsed.data.DATABASE_URL)) {
      console.error('DATABASE_URL must be a PostgreSQL connection string in production');
      process.exit(1);
    }
  }
  return parsed.data;
}

export const env = load();

// Nunca imprime la clave: solo confirma si el proceso la recibió.
console.info(`[ai] DeepSeek ${env.AI_ENABLED && env.DEEPSEEK_API_KEY.trim() ? 'configurado' : 'deshabilitado o sin API key'} (enabled=${env.AI_ENABLED}, key=${env.DEEPSEEK_API_KEY.trim() ? 'present' : 'missing'}, model=${env.DEEPSEEK_MODEL})`);
