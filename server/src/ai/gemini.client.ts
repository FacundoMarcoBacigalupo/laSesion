import { env } from '../config/env';
import { logger } from '../utils/logger';

export type GeminiResult = { ok: boolean; text: string; latencyMs: number; fallback: boolean; data?: any };

export async function callGemini(model: string, system: string, userPayload: any, responseSchema: any, timeoutMs: number): Promise<{ ok: boolean; raw: string; latencyMs: number; error?: string }> {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body: any = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(userPayload) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 200,
      temperature: 1.0,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (responseSchema) body.generationConfig.responseSchema = responseSchema;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, raw: '', latencyMs, error: `${res.status} ${txt.slice(0, 200)}` };
    }
    const json: any = await res.json();
    const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return { ok: true, raw, latencyMs };
  } catch (e: any) {
    clearTimeout(timer);
    return { ok: false, raw: '', latencyMs: Date.now() - t0, error: String(e?.message ?? e) };
  }
}