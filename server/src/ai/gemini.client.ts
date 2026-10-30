import { env } from '../config/env';
import { logger } from '../utils/logger';

export type GeminiResult = { ok: boolean; text: string; latencyMs: number; fallback: boolean; data?: any };

const HUMOR = ['calmo', 'furioso', 'hambriento', 'burlon'];

// DeepSeek inventa claves (respuesta/tono). El schema pide texto/humor.
function coerceAiJson(content: string): string {
  if (!content) return '';
  try {
    const raw = JSON.parse(content);
    const texto = raw?.texto ?? raw?.text ?? raw?.respuesta;
    if (typeof texto !== 'string' || !texto.trim()) return content;
    const humorIn = String(raw?.humor ?? raw?.tono ?? raw?.mood ?? '').toLowerCase();
    return JSON.stringify({ ...raw, texto: texto.slice(0, 220), humor: HUMOR.includes(humorIn) ? humorIn : 'burlon' });
  } catch {
    return content;
  }
}

export async function callDeepSeek(model: string, system: string, userPayload: any, _responseSchema: any, timeoutMs: number): Promise<{ ok: boolean; raw: string; latencyMs: number; error?: string; usage?: { prompt?: number; cacheHit?: number; cacheMiss?: number; output?: number } }> {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${env.DEEPSEEK_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  // deepseek-chat / deepseek-reasoner se dieron de baja. Sin este apagado, el modelo piensa y cobra el razonamiento como salida.
  const resolved = model === 'deepseek-chat' || model === 'deepseek-reasoner' ? 'deepseek-flash' : model;
  const key = env.DEEPSEEK_API_KEY.trim();
  const redact = (text: string) => (key ? text.split(key).join('[redacted]') : text);
  const body = {
    model: resolved,
    messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(userPayload) + '\n{"texto":"máx 160","humor":"calmo|furioso|hambriento|burlon"}' }],
    response_format: { type: 'json_object' },
    thinking: { type: 'disabled' },
    max_tokens: 220,
    temperature: 0.7,
    stream: false,
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      await res.text();
      logger.error({ status: res.status, model: resolved }, 'DeepSeek API error');
      return { ok: false, raw: '', latencyMs, error: String(res.status) };
    }
    const json: any = await res.json();
    const usage = json?.usage;
    const raw = coerceAiJson(json?.choices?.[0]?.message?.content ?? '');
    if (!raw) logger.error({ model: resolved }, 'DeepSeek returned no content');
    return {
      ok: true,
      raw,
      latencyMs,
      usage: usage ? {
        prompt: usage.prompt_tokens,
        cacheHit: usage.prompt_cache_hit_tokens,
        cacheMiss: usage.prompt_cache_miss_tokens,
        output: usage.completion_tokens,
      } : undefined,
    };
  } catch (e: any) {
    clearTimeout(timer);
    logger.error({ err: redact(String(e?.message ?? e)), model: resolved }, 'DeepSeek request failed');
    return { ok: false, raw: '', latencyMs: Date.now() - t0, error: 'network' };
  }
}
