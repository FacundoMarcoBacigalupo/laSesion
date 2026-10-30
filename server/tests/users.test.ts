import { describe, expect, it } from 'vitest';
import { createUser, disconnectUser } from '../src/domain/users';

function makeUser() {
  const user = createUser({
    name: 'Participante',
    consent: true,
    device: { lang: 'es', tz: 'UTC', dark: false, screen: '1920x1080', touch: false },
    ip: '127.0.0.1',
    userAgent: 'test',
  });
  user.socketId = 'current-socket';
  return user;
}

describe('disconnectUser', () => {
  it('immediately marks the active socket offline and releases its hand', () => {
    const user = makeUser();
    user.holding = true;

    expect(disconnectUser(user, 'current-socket')).toBe(true);
    expect(user.connected).toBe(false);
    expect(user.socketId).toBeNull();
    expect(user.holding).toBe(false);
  });

  it('ignores a stale socket disconnect after the user has reconnected', () => {
    const user = makeUser();
    user.socketId = 'new-socket';

    expect(disconnectUser(user, 'old-socket')).toBe(false);
    expect(user.connected).toBe(true);
    expect(user.socketId).toBe('new-socket');
  });
});
