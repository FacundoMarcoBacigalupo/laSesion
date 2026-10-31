import { describe, expect, it } from 'vitest';
import { aiLimits, keyMark, safeChatBase, safeChatModel, spendsModel } from '../src/ai/budget';

describe('AI call budget', () => {
  it('spends the model only on lines that are not already written', () => {
    expect(spendsModel('responder_pregunta', 0, 15)).toBe(true);
    expect(spendsModel('pacto', 14, 15)).toBe(true);
    expect(spendsModel('latido', 0, 15)).toBe(false);
    expect(spendsModel('fantasma', 0, 15)).toBe(false);
    expect(spendsModel('ofrenda', 0, 15)).toBe(false);
    expect(spendsModel('exorcismo_fin', 0, 15)).toBe(false);
  });

  it('stops at the demo cap and frees again when the count resets', () => {
    expect(spendsModel('responder_pregunta', 15, 15)).toBe(false);
    expect(spendsModel('responder_pregunta', 0, 15)).toBe(true);
  });

  it('stops when the day cap is spent even if the rite was reset', () => {
    expect(spendsModel('responder_pregunta', 0, 15, 40, 40)).toBe(false);
    expect(spendsModel('responder_pregunta', 0, 15, 39, 40)).toBe(true);
  });

  it('marks the key without revealing it', () => {
    const secret = 'sk-abcdefghijklmnopqrstuvwxyz12';
    const mark = keyMark(secret);
    expect(mark.present).toBe(true);
    expect(mark.length).toBe(secret.length);
    expect(mark.suffix).toBe(secret.slice(-4));
    expect(JSON.stringify(mark)).not.toContain(secret.slice(0, 8));
    expect(keyMark('')).toEqual({ present: false, length: 0, suffix: '' });
  });

  it('clamps a loose env so it cannot raise the ceilings', () => {
    expect(aiLimits(999, 999, 999)).toEqual({ rpm: 6, ritual: 15, day: 40 });
  });

  it('refuses reasoning and leftover providers', () => {
    expect(safeChatModel('gpt-5-mini')).toBe('gpt-4.1-mini');
    expect(safeChatModel('deepseek-flash')).toBe('gpt-4.1-mini');
    expect(safeChatModel('o3')).toBe('gpt-4.1-mini');
    expect(safeChatModel('gpt-4o')).toBe('gpt-4o');
    expect(safeChatBase('https://api.deepseek.com')).toBe('https://api.openai.com/v1');
  });
});
