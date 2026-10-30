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
  private latidoTimer: NodeJS.Timeout | null = null;
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
    this.latidoTimer = setInterval(() => this.maybeLatido(), env.AI_HEARTBEAT_MS);
    this.exorcismTimer = setInterval(() => this.exorcismTick(), 300);
  }

  stop() {
    if (this.latidoTimer) clearInterval(this.latidoTimer);
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
      if (Date.now() - startWait > 6000) break;
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
    const useFallback = s.ai.fallbackForced || this.breaker.isOpen() || this.callTimestamps.length >= env.AI_MAX_RPM;
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
      s.say = { id, text: fallback.texto, question: job.question, force: job.force ?? false, startedAt: Date.now() };
      s.sayDonePending = true;
      s.ai.lastAt = Date.now();
      this.emitSay(fallback.texto, job.question, fallback.humor, job.force ?? false, id);
      this.emitAdminPrompt(job.pedido, { ...job.extra, pregunta: job.question }, fallback, 0, true, job.question, job.extra?.questionId);
      setTimeout(() => { if (s.say?.id === id) { s.sayDonePending = false; s.say = null; } }, 6000);
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
    s.ai.providerStatus = !env.AI_ENABLED
      ? 'disabled'
      : !env.DEEPSEEK_API_KEY
        ? 'unconfigured'
        : useFallback
          ? 'fallback'
          : 'checking';

    if (!useFallback && env.AI_ENABLED && env.DEEPSEEK_API_KEY) {
      try {
        const r = await callDeepSeek(env.DEEPSEEK_MODEL, SYS, prompt, geminiResponseSchema(pedido), env.AI_TIMEOUT_MS);
        latencyMs = r.latencyMs;
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
              this.breaker.recordSuccess();
            } else {
              fallback = true;
              s.ai.providerStatus = 'error';
            }
          } catch {
            fallback = true;
            s.ai.providerStatus = 'error';
          }
        } else {
          // retry once on network error
          if (/network|fetch|abort/i.test(r.error ?? '')) {
            const r2 = await callDeepSeek(env.DEEPSEEK_MODEL, SYS, prompt, geminiResponseSchema(pedido), env.AI_TIMEOUT_MS);
            latencyMs = r2.latencyMs;
            if (r2.ok) {
              try {
                const parsed = JSON.parse(r2.raw);
                const schema = schemaForPedido(pedido);
                const v = schema.safeParse(parsed);
                if (v.success) {
                  const mod = moderateText(v.data.texto ?? v.data.text ?? '');
                  const texto = mod.ok ? mod.text : (v.data.texto ?? v.data.text ?? '');
                  result = { texto, humor: v.data.humor ?? s.mood, clausulas: v.data.clausulas };
                  ok = true;
                  s.ai.providerStatus = 'connected';
                  this.breaker.recordSuccess();
                } else {
                  fallback = true;
                  s.ai.providerStatus = 'error';
                }
              } catch {
                fallback = true;
                s.ai.providerStatus = 'error';
              }
            } else {
              fallback = true;
              s.ai.providerStatus = 'error';
              this.breaker.recordFail();
            }
          } else {
            fallback = true;
            s.ai.providerStatus = 'error';
            // 4xx/429 no retry
            if (!/^4/.test(r.error ?? '')) this.breaker.recordFail();
            else this.breaker.recordFail();
          }
        }

        if (generation !== this.generation) return;
      } catch (e) {
        fallback = true;
        s.ai.providerStatus = 'error';
        this.breaker.recordFail();
        logger.warn({ err: e }, 'DeepSeek call error');
      }
    } else {
      fallback = true;
      if (s.ai.fallbackForced || this.breaker.isOpen() || this.callTimestamps.length >= env.AI_MAX_RPM) {
        s.ai.providerStatus = env.AI_ENABLED && env.DEEPSEEK_API_KEY ? 'fallback' : s.ai.providerStatus;
      }
      logger.warn({ aiEnabled: env.AI_ENABLED, hasApiKey: !!env.DEEPSEEK_API_KEY, forced: s.ai.fallbackForced, breaker: this.breaker.isOpen(), rpm: this.callTimestamps.length }, 'AI fallback selected before API call');
    }

    if (!ok) {
      const fb = fallbackFor(pedido, s, job.extra);
      result = { texto: fb.texto, humor: fb.humor, clausulas: fb.clausulas };
      fallback = true;
      if (!useFallback) this.breaker.recordFail();
    }

    latencyMs = latencyMs || (Date.now() - t0);
    this.lastCallAt = Date.now();
    this.callTimestamps.push(this.lastCallAt);

    // update mood
    if (result?.humor) {
      try { s.mood = result.humor as any; } catch {}
    }

    // emit say
    const text = result?.texto ?? '';
    const id = newId(8);
    s.say = { id, text, question: job.question, force: job.force ?? false, startedAt: Date.now() };
    s.sayDonePending = true;
    s.ai.busy = false;
    s.ai.lastAt = Date.now();
    if (this.breaker.fails >= (env.BREAKER_FAILS ?? 3)) {
      if (this.breaker.isOpen()) s.ai.breakerOpen = true;
    } else s.ai.breakerOpen = this.breaker.isOpen();

    this.emitSay(text, job.question, s.mood, job.force ?? false, id);
    this.emitAdminPrompt(pedido, prompt, result, latencyMs, fallback, job.question, job.extra?.questionId);

    // log
    logAi(s.id, pedido, prompt, result, ok, latencyMs, fallback).catch(() => {});

    // clear sayDonePending after max 6s
    setTimeout(() => { if (s.say?.id === id) { s.sayDonePending = false; s.say = null; } }, 6000);
  }

  private maybeLatido() {
    const s = this.store.session;
    if (s.phase === 'LOBBY' || s.phase === 'END') return;
    if (s.ai.busy || s.sayDonePending) return;
    const hands = this.store.session.users ? [...this.store.session.users.values()].filter((u) => u.connected && u.holding).length : 0;
    if (hands === 0) return;
    this.enqueue('latido', 10);
  }

  private exorcismTick() {
    const s = this.store.session;
    if (!s.exorcism.active) return;
    const e = decayExorcism(s, );
    // emit handled by socket layer polling? We'll emit via a callback not here. Instead store energy; sockets read via state.
  }

  get breakerInstance() { return this.breaker; }
}

function decayExorcism(s: any) {
  if (!s.exorcism.active) return s.exorcism.energy;
  s.exorcism.energy = Math.max(0, s.exorcism.energy - 2);
  return s.exorcism.energy;
}
