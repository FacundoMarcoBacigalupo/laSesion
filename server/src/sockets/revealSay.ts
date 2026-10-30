import { EV } from '@sesion/shared';
import type { SessionStore } from '../domain/session';

export function revealPendingSay(io: any, store: SessionStore, id?: string): boolean {
  const say = store.session.say;
  if (!say) return false;
  if (id && say.id !== id) return false;
  const asker = say.askerId ? store.session.users.get(say.askerId) : undefined;
  if (asker?.socketId && say.question) {
    io.of('/play').to(asker.socketId).emit(EV.SAY_REVEAL, {
      id: say.id,
      question: say.question,
      text: say.text,
    });
  }
  store.session.sayDonePending = false;
  store.session.say = null;
  store.session.aiLastSayDoneAt = Date.now();
  return true;
}
