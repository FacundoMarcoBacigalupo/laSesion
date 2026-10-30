import { describe, expect, it } from 'vitest';
import { SessionStore } from '../src/domain/session';
import { applyHold } from '../src/domain/hold';
import { createUser } from '../src/domain/users';

function addParticipant(store: SessionStore, name: string, socketId: string) {
  const user = createUser({
    name,
    consent: true,
    device: { lang: 'es', tz: 'UTC', dark: false, screen: '1920x1080', touch: true },
    ip: '127.0.0.1',
    userAgent: 'test',
  });
  user.socketId = socketId;
  store.addUser(user);
  return user;
}

describe('participant hands', () => {
  it('counts simultaneous holds from separate connected participants', () => {
    const store = new SessionStore();
    const first = addParticipant(store, 'Uno', 'socket-1');
    const second = addParticipant(store, 'Dos', 'socket-2');

    applyHold(store, first.id, true);
    applyHold(store, second.id, true);

    expect(store.handsCount()).toBe(2);
    expect(store.totalCount()).toBe(2);
  });
});
