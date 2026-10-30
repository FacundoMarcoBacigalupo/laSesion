import { z } from 'zod';
import { MAX_PARTICIPANTS, OFFER_KINDS, PHASES, MOODS, RITUAL_MIN_ROOM } from './constants';

export const DeviceInfoSchema = z.object({
  model: z.string().optional(),
  platform: z.string().optional(),
  lang: z.string(),
  tz: z.string(),
  battery: z.number().nullable().optional(),
  charging: z.boolean().optional(),
  dark: z.boolean(),
  screen: z.string(),
  memory: z.number().optional(),
  touch: z.boolean(),
});

export const JoinSchema = z.object({
  name: z.string().min(1).max(24),
  consent: z.literal(true),
  device: DeviceInfoSchema,
  resumeToken: z.string().optional(),
});

export const HoldSchema = z.object({ on: z.boolean() });

export const VisibilitySchema = z.object({ hidden: z.boolean() });

export const AskSchema = z.object({ text: z.string().min(1).max(80) });

export const VoteSchema = z.object({ targetUserId: z.string().min(1) });

export const StrokeSchema = z.object({
  pactId: z.string(),
  points: z.array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])).max(200),
});

export const SignDoneSchema = z.object({
  pactId: z.string(),
  png: z.string().startsWith('data:image/png;base64,').max(200000 + 40),
});

export const OfferSchema = z.object({ kind: z.enum(OFFER_KINDS as unknown as [string, ...string[]]) });

export const ShakeSchema = z.object({ force: z.number().min(0).max(15) });

export const MesaAuthSchema = z.object({ key: z.string() });

export const AdminLoginSchema = z.object({ password: z.string() });

export const DirAskSchema = z.object({
  quickId: z.number().int().min(0).max(4).optional(),
  text: z.string().min(1).max(80).optional(),
}).refine((v) => v.quickId !== undefined || v.text !== undefined, { message: 'quickId or text' });

export const DirQueueDeleteSchema = z.object({ questionId: z.string() });

export const DirPickVictimSchema = z.object({ userId: z.string().optional() });

export const DirExorcismSchema = z.object({ action: z.enum(['start', 'stop']) });

export const DirPhaseSchema = z.object({ phase: z.enum(PHASES as unknown as [string, ...string[]]) });

export const DirRoomSizeSchema = z.object({
  size: z.number().int().min(RITUAL_MIN_ROOM).max(MAX_PARTICIPANTS),
});

export const DirMoodSchema = z.object({ mood: z.enum(MOODS as unknown as [string, ...string[]]) });

export const DirSaySchema = z.object({ text: z.string().min(1).max(200) });

export const DirAiToggleSchema = z.object({ on: z.boolean() });

export const DirGhostSchema = z.object({ userId: z.string().optional() });

export const PingSchema = z.object({}).optional();

export const SyncPayloadSchema = z.object({
  phase: z.enum(PHASES as unknown as [string, ...string[]]),
  me: z.any().optional(),
  counts: z.object({ players: z.number(), hands: z.number() }),
  want: z.enum(OFFER_KINDS as unknown as [string, ...string[]]).optional(),
  exorcism: z.object({ active: z.boolean(), energy: z.number() }).optional(),
  pact: z.any().optional(),
});

export function validate<T>(schema: z.ZodType<T>, data: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const r = schema.safeParse(data);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error.message };
}