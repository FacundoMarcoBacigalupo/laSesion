import { newId } from '../utils/ids';
import { now } from '../utils/time';
import { QUEUE_PER_USER, QUESTION_MAX } from '@sesion/shared';
import type { Session, Question } from '@sesion/shared';
import { moderateText } from '../services/moderation';

export function enqueueQuestion(session: Session, userId: string, name: string, raw: string): { ok: boolean; queued: boolean; reason?: string; question?: Question } {
  const mod = moderateText(raw);
  if (!mod.ok) return { ok: false, queued: false, reason: mod.reason };
  const text = mod.text.slice(0, QUESTION_MAX);
  const mine = session.queue.filter((q) => q.userId === userId && q.state === 'queued').length;
  if (mine >= QUEUE_PER_USER) return { ok: false, queued: false, reason: 'limit' };
  const q: Question = { id: newId(10), userId, name, text, at: now(), state: 'queued' };
  session.queue.push(q);
  return { ok: true, queued: true, question: q };
}

export function deleteQuestion(session: Session, qid: string): boolean {
  const q = session.queue.find((x) => x.id === qid);
  if (!q) return false;
  q.state = 'deleted';
  session.queue = session.queue.filter((x) => x.id !== qid);
  session.history.push(q);
  return true;
}

export function readRandomQuestion(session: Session): Question | null {
  const queued = session.queue.filter((q) => q.state === 'queued');
  if (queued.length === 0) return null;
  const idx = Math.floor(Math.random() * queued.length);
  const q = queued[idx];
  if (!q) return null;
  q.state = 'answered';
  session.queue = session.queue.filter((x) => x.id !== q.id);
  session.history.push(q);
  return q;
}