import { env } from '../config/env';
import { callDeepSeek } from './gemini.client';
import { SYS } from './system.prompt';
import { buildPrompt } from './prompt.builder';
import { schemaForPedido, geminiResponseSchema } from './schemas';
import { fallbackFor } from './fallbacks';
import { CircuitBreaker } from './circuitBreaker';
import type { SessionStore } from '../domain/session';
import { newId } from '../utils/ids';
import { logger } from '../utils/logger';
import { logAi } from '../db/repos/aiLogs';
import { now, sleep } from '../utils/time';
import { moderateText } from '../services/moderation';
import { isLocalPedido, spendsModel, aiLimits, modelCallsToday, noteModelCall, keyMark } from './budget';

type EmitSay = (text: string, question: string | undefined, mood: string, force: boolean, id: string) => void;
type EmitAdminPrompt = (
  pedido: string,
  prompt: any,
  response: any,
  latencyMs: number,
  fallback: boolean,
  question?: string,
  questionId?: string,
) => void;

interface Job { pedido: string; priority: number; extra?: any; force?: boolean; question?: string; }

export class AiScheduler {
  private store: SessionStore;
  private breaker: CircuitBreaker;
  private queue: Job[] = [];
  private running = false;
  private lastCallAt = 0;
  private callTimestamps: number[] = [];
  private generation = 0;
  private emitSay: EmitSay;
  private emitAdminPrompt: EmitAdminPrompt;
  private exorcismTimer: NodeJS.Timeout | null = null;

  constructor(store: SessionStore, emitSay: EmitSay, emitAdminPrompt: EmitAdminPrompt) {
    this.store = store;
    this.emitSay = emitSay;
    this.emitAdminPrompt = emitAdminPrompt;
    this.breaker = new CircuitBreaker(env.BREAKER_FAILS ?? 3, env.BREAKER_OPEN_MS ?? 60000);
    this.store.session.ai.providerStatus = !env.AI_ENABLED
      ? 'disabled'
      : env.DEEPSEEK_API_KEY
        ? 'untested'
        : 'unconfigured';
  }

  start() {
    this.exorcismTimer = setInterval(() => this.exorcismTick(), 300);
  }

  stop() {
    if (this.exorcismTimer) clearInterval(this.exorcismTimer);
  }

  enqueue(pedido: string, priority = 5, extra?: any, force = false, question?: string) {
    this.queue.push({ pedido, priority, extra, force, question });
    this.queue.sort((a, b) => a.priority - b.priority);
    this.pump();
  }

  reset() {
    this.generation += 1;
    this.queue = [];
    this.callTimestamps = [];
    this.lastCallAt = 0;
    this.store.session.ai.calls = 0;
    this.breaker.reset();
  }

  forceFallback(on: boolean) {
    this.store.session.ai.fallbackForced = on;
  }

  private async pump() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift()!;
        try {
          await this.processJob(job);
        } catch (error) {
          logger.error({ err: error, pedido: job.pedido }, 'AI queue job could not be processed');
          this.store.session.ai.busy = false;
          this.store.session.ai.providerStatus = 'error';
        }
      }
    } finally {
      this.running = false;
      if (this.queue.length > 0) void this.pump();
    }
  }

  private async processJob(job: Job) {
    const generation = this.generation;
    const s = this.store.session;
    // wait if busy or say pending
    const startWait = Date.now();
    while (generation === this.generation && (s.ai.busy || s.sayDonePending === true)) {
      if (Date.now() - startWait > 45000) break;
      await sleep(100);
    }
    if (generation !== this.generation) return;
    // min gap
    const gap = env.AI_MIN_GAP_MS - (Date.now() - this.lastCallAt);
    if (gap > 0) await sleep(gap);
    if (generation !== this.generation) return;
    // RPM check
    const windowStart = Date.now() - 60000;
    this.callTimestamps = this.callTimestamps.filter((t) => t > windowStart);
    const limits = aiLimits(env.AI_MAX_RPM, env.AI_MAX_CALLS, env.AI_MAX_CALLS_DAY);
    const capped = !spendsModel(job.pedido, s.ai.calls ?? 0, limits.ritual, modelCallsToday(), limits.day);
    const useFallback = capped || s.ai.fallbackForced || this.breaker.isOpen() || this.callTimestamps.length >= limits.rpm;
    try {
      await this.execute(job, useFallback, generation);
    } catch (error) {
      if (generation !== this.generation) return;
      logger.error({ err: error, pedido: job.pedido }, 'AI job failed unexpectedly');
      s.ai.busy = false;
      s.ai.providerStatus = 'error';
      if (!job.question) return;

      const fallback = fallbackFor(job.pedido, s, job.extra);
      const id = newId(8);
      s.say = { id, text: fallback.texto, question: job.question, force: job.force ?? false, startedAt: Date.now(), askerId: job.extra?.userId };
      s.sayDonePending = true;
      s.ai.lastAt = Date.now();
      this.emitSay(fallback.texto, job.question, fallback.humor, job.force ?? false, id);
      this.emitAdminPrompt(job.pedido, { ...job.extra, pregunta: job.question }, fallback, 0, true, job.question, job.extra?.questionId);
    }
  }

  private async execute(job: Job, useFallback: boolean, generation: number) {
    const s = this.store.session;
    const pedido = job.pedido;
    s.ai.busy = true;
    s.ai.lastEvent = pedido;
    const prompt = buildPrompt(s, pedido, job.question, job.extra);
    const t0 = Date.now();
    let result: { texto: string; humor: string; clausulas?: string[] } | null = null;
    let fallback = useFallback;
    let ok = false;
    let latencyMs = 0;
    let usage: { prompt?: number; cacheHit?: number; cacheMiss?: number; output?: number } | undefined;
    let status = '';
    const local = isLocalPedido(pedido);
    s.ai.providerStatus = local
      ? s.ai.providerStatus
      : !env.AI_ENABLED
        ? 'disabled'
        : !env.DEEPSEEK_API_KEY
          ? 'unconfigured'
          : useFallback
            ? 'fallback'
            : 'checking';

    if (!useFallback && env.AI_ENABLED && env.DEEPSEEK_API_KEY) {
      s.ai.calls = (s.ai.calls ?? 0) + 1;
      noteModelCall();
      this.callTimestamps.push(Date.now());
      try {
        const r = await callDeepSeek(env.DEEPSEEK_MODEL, SYS, prompt, geminiResponseSchema(pedido), env.AI_TIMEOUT_MS);
        latencyMs = r.latencyMs;
        usage = r.usage;
        status = r.error ?? (r.ok ? '200' : '');
        if (r.ok) {
          try {
            const parsed = JSON.parse(r.raw);
            const schema = schemaForPedido(pedido);
            const v = schema.safeParse(parsed);
            if (v.success) {
              const mod = moderateText(v.data.texto ?? v.data.text ?? '');
              const texto = mod.ok ? mod.text : (v.data.texto ?? v.data.text ?? '');
              result = { texto, humor: v.data.humor ?? s.mood, clausulas: v.data.clausulas };
              ok = true;
              s.ai.providerStatus = 'connected';
              s.ai.providerError = undefined;
              this.breaker.recordSuccess();
            } else {
              fallback = true;
              s.ai.providerStatus = 'error';
              s.ai.providerError = describeValidationError(v.error.issues[0]);
              logger.warn({ pedido, issues: v.error.issues }, 'DeepSeek response did not match the expected schema');
            }
          } catch (error) {
            fallback = true;
            s.ai.providerStatus = 'error';
            s.ai.providerError = 'DeepSeek respondió con un JSON inválido.';
            logger.warn({ err: error, pedido }, 'Could not parse DeepSeek response');
          }
        } else {
          fallback = true;
          s.ai.providerStatus = 'error';
          s.ai.providerError = describeProviderError(r.error);
          this.breaker.recordFail();
        }

        if (generation !== this.generation) return;
      } catch (e) {
        fallback = true;
        s.ai.providerStatus = 'error';
        s.ai.providerError = 'Falló la comunicación con DeepSeek. Revisá los logs del servidor.';
        this.breaker.recordFail();
        logger.warn({ err: e }, 'DeepSeek call error');
      }
    } else {
      fallback = true;
      const limits = aiLimits(env.AI_MAX_RPM, env.AI_MAX_CALLS, env.AI_MAX_CALLS_DAY);
      if (modelCallsToday() >= limits.day && !isLocalPedido(pedido)) {
        s.ai.providerStatus = 'fallback';
        s.ai.providerError = `Cupo del día: ${limits.day} respuestas. Mañana vuelve a empezar.`;
      } else if ((s.ai.calls ?? 0) >= limits.ritual && !isLocalPedido(pedido)) {
        s.ai.providerStatus = 'fallback';
        s.ai.providerError = `Cupo del rito: ${limits.ritual} respuestas. Reiniciá el rito para otras ${limits.ritual}.`;
      } else if (s.ai.fallbackForced || this.breaker.isOpen() || this.callTimestamps.length >= limits.rpm) {
        s.ai.providerStatus = env.AI_ENABLED && env.DEEPSEEK_API_KEY ? 'fallback' : s.ai.providerStatus;
      }
    }

    if (!ok) {
      const fb = fallbackFor(pedido, s, job.extra);
      result = { texto: fb.texto, humor: fb.humor, clausulas: fb.clausulas };
      fallback = true;
      if (!useFallback && !s.ai.providerError) {
        s.ai.providerError = 'DeepSeek no devolvió una respuesta utilizable.';
      }
      if (!useFallback) this.breaker.recordFail();
    }

    latencyMs = latencyMs || (Date.now() - t0);
    this.lastCallAt = Date.now();

    // update mood
    if (result?.humor) {
      try { s.mood = result.humor as any; } catch {}
    }

    // emit say
    const text = result?.texto ?? '';
    const id = newId(8);
    s.say = { id, text, question: job.question, force: job.force ?? false, startedAt: Date.now(), askerId: job.extra?.userId };
    s.sayDonePending = true;
    s.ai.busy = false;
    s.ai.lastAt = Date.now();
    if (this.breaker.fails >= (env.BREAKER_FAILS ?? 3)) {
      if (this.breaker.isOpen()) s.ai.breakerOpen = true;
    } else s.ai.breakerOpen = this.breaker.isOpen();

    this.emitSay(text, job.question, s.mood, job.force ?? false, id);
    this.emitAdminPrompt(pedido, prompt, result, latencyMs, fallback, job.question, job.extra?.questionId);

    logAi(s.id, pedido, prompt, result, ok, latencyMs, fallback).catch(() => {});
    if (!isLocalPedido(pedido)) {
      const limits = aiLimits(env.AI_MAX_RPM, env.AI_MAX_CALLS, env.AI_MAX_CALLS_DAY);
      const mark = keyMark(env.DEEPSEEK_API_KEY);
      const called = !useFallback && env.AI_ENABLED && mark.present;
      logger.info({
        event: 'deepseek',
        pedido,
        called,
        ok,
        fallback,
        status: status || undefined,
        reason: called ? (ok ? 'ok' : (s.ai.providerError ?? 'error')) : deepseekSkipReason(pedido, s, limits, this.breaker.isOpen(), this.callTimestamps.length),
        latencyMs,
        ritualCalls: s.ai.calls ?? 0,
        dayCalls: modelCallsToday(),
        keyPresent: mark.present,
        keyLength: mark.length,
        keySuffix: mark.suffix,
        model: env.DEEPSEEK_MODEL,
        usage,
      }, 'deepseek');
    }
  }

  private exorcismTick() {
    const s = this.store.session;
    if (!s.exorcism.active) return;
    const e = decayExorcism(s, );
    // emit handled by socket layer polling? We'll emit via a callback not here. Instead store energy; sockets read via state.
  }

  get breakerInstance() { return this.breaker; }
}

function deepseekSkipReason(pedido: string, s: { ai: { fallbackForced: boolean; calls?: number } }, limits: { rpm: number; ritual: number; day: number }, breakerOpen: boolean, rpmCount: number): string {
  if (!env.AI_ENABLED) return 'disabled';
  if (!env.DEEPSEEK_API_KEY.trim()) return 'no-key';
  if (modelCallsToday() >= limits.day) return 'day-cap';
  if ((s.ai.calls ?? 0) >= limits.ritual) return 'ritual-cap';
  if (s.ai.fallbackForced) return 'forced-fallback';
  if (breakerOpen) return 'breaker';
  if (rpmCount >= limits.rpm) return 'rpm';
  if (isLocalPedido(pedido)) return 'local';
  return 'fallback';
}

function describeProviderError(error?: string): string {
  const status = error?.match(/^(\d{3})/)?.[1];
  if (status) {
    const explanations: Record<string, string> = {
      '400': 'DeepSeek rechazó el formato de la solicitud (HTTP 400).',
      '401': 'DeepSeek rechazó la autenticación (HTTP 401); verificá la clave configurada en Render.',
      '402': 'DeepSeek indicó un problema de saldo o facturación (HTTP 402).',
      '403': 'DeepSeek denegó el acceso al modelo o servicio (HTTP 403).',
      '404': 'DeepSeek no encontró el modelo o endpoint (HTTP 404).',
      '429': 'DeepSeek limitó las solicitudes (HTTP 429); esperá y volvé a probar.',
    };
    return explanations[status] ?? `DeepSeek devolvió HTTP ${status}. Revisá los logs del servidor.`;
  }
  if (/abort|timeout/i.test(error ?? '')) return 'La solicitud a DeepSeek agotó el tiempo de espera.';
  return 'No se pudo conectar con DeepSeek. Revisá los logs del servidor.';
}

function describeValidationError(issue?: { path: PropertyKey[]; message: string }): string {
  if (!issue) return 'DeepSeek respondió con un formato inesperado.';
  const field = issue.path.map(String).join('.');
  return `DeepSeek respondió con formato inválido${field ? ` en ${field}` : ''}: ${issue.message}`.slice(0, 180);
}

function decayExorcism(s: any) {
  if (!s.exorcism.active) return s.exorcism.energy;
  s.exorcism.energy = Math.max(0, s.exorcism.energy - 2);
  return s.exorcism.energy;
}
