import { z } from 'zod';

export const AiBaseSchema = z.object({
  texto: z.string().max(160),
  humor: z.enum(['calmo', 'furioso', 'hambriento', 'burlon']),
});

export const AiPactSchema = AiBaseSchema.extend({
  clausulas: z.array(z.string().max(140)).length(4),
});

export const AiTestamentoSchema = z.object({
  texto: z.string().max(220),
  humor: z.enum(['calmo', 'furioso', 'hambriento', 'burlon']).optional(),
});

export function schemaForPedido(pedido: string): z.ZodTypeAny {
  if (pedido === 'pacto') return AiPactSchema;
  if (pedido === 'testamento') return AiTestamentoSchema;
  return AiBaseSchema;
}

export function geminiResponseSchema(pedido: string): any {
  const base = {
    type: 'object',
    properties: {
      texto: { type: 'string' },
      humor: { type: 'string', enum: ['calmo', 'furioso', 'hambriento', 'burlon'] },
    },
    required: ['texto', 'humor'],
  };
  if (pedido === 'pacto') {
    return {
      type: 'object',
      properties: {
        texto: { type: 'string' },
        humor: { type: 'string', enum: ['calmo', 'furioso', 'hambriento', 'burlon'] },
        clausulas: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
      },
      required: ['texto', 'humor', 'clausulas'],
    };
  }
  if (pedido === 'testamento') {
    return {
      type: 'object',
      properties: { texto: { type: 'string' }, humor: { type: 'string', enum: ['calmo', 'furioso', 'hambriento', 'burlon'] } },
      required: ['texto'],
    };
  }
  return base;
}