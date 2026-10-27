import { env } from '../config/env';
import { logger } from '../utils/logger';

export type GeminiResult = { ok: boolean; text: string; latencyMs: number; fallback: boolean; data?: any };

export async function callDeepSeek(model: string, system: string, userPayload: any, _responseSchema: any, timeoutMs: number): Promise<{ ok: boolean; raw: string; latencyMs: number; error?: string }> {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${env.DEEPSEEK_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(userPayload) }], response_format: { type: 'json_object' }, max_tokens: 220, temperature: 0.7, stream: false };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      const txt = await res.text();
      logger.error({ status: res.status, body: txt.slice(0, 300), model }, 'DeepSeek API error');
      return { ok: false, raw: '', latencyMs, error: `${res.status} ${txt.slice(0, 200)}` };
    }
    const json: any = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? '';
    if (!raw) logger.error({ response: JSON.stringify(json).slice(0, 500), model }, 'DeepSeek returned no content');
    return { ok: true, raw, latencyMs };
  } catch (e: any) {
    clearTimeout(timer);
    logger.error({ err: e?.message ?? e, model, url }, 'DeepSeek request failed');
    return { ok: false, raw: '', latencyMs: Date.now() - t0, error: String(e?.message ?? e) };
  }
}
