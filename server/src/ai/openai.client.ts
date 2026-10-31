import { safeChatBase, safeChatModel } from './budget';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const HUMOR = ['calmo', 'furioso', 'hambriento', 'burlon'];

export type ChatUsage = {
  prompt?: number;
  cacheHit?: number;
  cacheMiss?: number;
  output?: number;
  reasoning?: number;
};

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

export async function callChatGpt(model: string, system: string, userPayload: any, _responseSchema: any, timeoutMs: number): Promise<{ ok: boolean; raw: string; latencyMs: number; error?: string; usage?: ChatUsage }> {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const resolved = safeChatModel(model);
  const url = `${safeChatBase(env.OPENAI_BASE_URL)}/chat/completions`;
  const key = env.OPENAI_API_KEY.trim();
  const redact = (text: string) => (key ? text.split(key).join('[redacted]') : text);
  const body = {
    model: resolved,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `${JSON.stringify(userPayload)}\nRespondé solo JSON: {"texto":"máx 160","humor":"calmo|furioso|hambriento|burlon"}` },
    ],
    response_format: { type: 'json_object' },
    max_completion_tokens: 220,
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
      logger.error({ status: res.status, model: resolved }, 'ChatGPT API error');
      return { ok: false, raw: '', latencyMs, error: String(res.status) };
    }
    const json: any = await res.json();
    const usage = json?.usage;
    const raw = coerceAiJson(json?.choices?.[0]?.message?.content ?? '');
    if (!raw) logger.error({ model: resolved }, 'ChatGPT returned no content');
    const cached = usage?.prompt_tokens_details?.cached_tokens;
    const prompt = usage?.prompt_tokens;
    return {
      ok: true,
      raw,
      latencyMs,
      usage: usage ? {
        prompt,
        cacheHit: cached,
        cacheMiss: typeof prompt === 'number' && typeof cached === 'number' ? Math.max(0, prompt - cached) : undefined,
        output: usage.completion_tokens,
        reasoning: usage.completion_tokens_details?.reasoning_tokens,
      } : undefined,
    };
  } catch (e: any) {
    clearTimeout(timer);
    logger.error({ err: redact(String(e?.message ?? e)), model: resolved }, 'ChatGPT request failed');
    return { ok: false, raw: '', latencyMs: Date.now() - t0, error: 'network' };
  }
}
