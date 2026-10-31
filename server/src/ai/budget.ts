// Latido, fantasmas, ofrendas y exorcismo ya tienen texto local.
// Solo las preguntas (y el pacto/testamento del admin) gastan modelo.
export const AI_LOCAL_PEDIDOS = new Set([
  'latido',
  'fantasma',
  'ofrenda',
  'exorcismo_inicio',
  'exorcismo_fin',
  'despedida',
]);

export const AI_RPM_CEILING = 6;
export const AI_RITUAL_CEILING = 15;
export const AI_DAY_CEILING = 40;

export function aiLimits(rpm: number, ritual: number, day: number) {
  return {
    rpm: Math.min(AI_RPM_CEILING, Math.max(1, rpm)),
    ritual: Math.min(AI_RITUAL_CEILING, Math.max(1, ritual)),
    day: Math.min(AI_DAY_CEILING, Math.max(1, day)),
  };
}

export function spendsModel(pedido: string, ritualCalls: number, ritualCap: number, dayCalls = 0, dayCap = Number.POSITIVE_INFINITY): boolean {
  return !AI_LOCAL_PEDIDOS.has(pedido) && ritualCalls < ritualCap && dayCalls < dayCap;
}

export const CHAT_MODEL = 'gpt-4.1-mini';

export function safeChatModel(name: string): string {
  const model = name.trim();
  if (!model || /deepseek|gemini|reasoner|^chatgpt|^o\d|^gpt-5|^gpt-6/i.test(model)) return CHAT_MODEL;
  return model;
}

export function safeChatBase(url: string): string {
  const base = url.trim().replace(/\/$/, '');
  if (!base || /deepseek|generativelanguage|googleapis/i.test(base)) return 'https://api.openai.com/v1';
  return base;
}

export function keyMark(key: string): { present: boolean; length: number; suffix: string } {
  const trimmed = key.trim();
  return {
    present: trimmed.length > 0,
    length: trimmed.length,
    suffix: trimmed.length >= 8 ? trimmed.slice(-4) : '',
  };
}

let dayCalls = 0;
let dayKey = '';

function todayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

export function modelCallsToday(): number {
  const key = todayKey();
  if (key !== dayKey) {
    dayKey = key;
    dayCalls = 0;
  }
  return dayCalls;
}

export function noteModelCall(): number {
  dayCalls = modelCallsToday() + 1;
  return dayCalls;
}

export function isLocalPedido(pedido: string): boolean {
  return AI_LOCAL_PEDIDOS.has(pedido);
}
