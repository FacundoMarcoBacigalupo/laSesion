import { describe, expect, it } from 'vitest';
import { SessionStore } from '../src/domain/session';
import { createUser, isIdleParticipant, PARTICIPANT_IDLE_TIMEOUT_MS, removeParticipant } from '../src/domain/users';

function addUser(store: SessionStore, socketId: string) {
  const user = createUser({
    name: 'Participante',
    consent: true,
    device: { lang: 'es', tz: 'UTC', dark: false, screen: '1920x1080', touch: false },
    ip: '127.0.0.1',
    userAgent: 'test',
  });
  user.socketId = socketId;
  store.addUser(user);
  return user;
}

describe('removeParticipant', () => {
  it('removes the participant and their queued actions immediately', () => {
    const store = new SessionStore();
    const user = addUser(store, 'current-socket');
    user.holding = true;
    store.session.votes.set(user.id, 'other');
    store.session.votes.set('other', user.id);
    store.session.victimId = user.id;
    store.session.willText = 'testamento';
    store.session.queue.push(
      { id: 'queued', userId: user.id, name: user.name, text: 'pregunta', at: Date.now(), state: 'queued' },
      { id: 'answered', userId: user.id, name: user.name, text: 'anterior', at: Date.now(), state: 'answered' },
    );

    expect(removeParticipant(store.session, user.id, 'current-socket')).toBe(true);
    expect(store.session.users.has(user.id)).toBe(false);
    expect(store.session.votes.has(user.id)).toBe(false);
    expect(store.session.votes.has('other')).toBe(false);
    expect(store.session.queue.map((question) => question.id)).toEqual(['answered']);
    expect(store.session.victimId).toBeNull();
    expect(store.session.willText).toBeNull();
    expect(store.totalCount()).toBe(0);
  });

  it('does not remove a participant after a different socket has reconnected', () => {
    const store = new SessionStore();
    const user = addUser(store, 'new-socket');

    expect(removeParticipant(store.session, user.id, 'old-socket')).toBe(false);
    expect(store.session.users.has(user.id)).toBe(true);
    expect(store.totalCount()).toBe(1);
  });
});

describe('SessionStore.restore', () => {
  it('does not restore participants or their live state from a saved snapshot', () => {
    const source = new SessionStore();
    const user = addUser(source, 'old-socket');
    source.session.votes.set(user.id, user.id);
    source.session.queue.push({
      id: 'old-question',
      userId: user.id,
      name: user.name,
      text: 'pregunta',
      at: Date.now(),
      state: 'queued',
    });
    source.session.victimId = user.id;
    source.session.willText = 'testamento';

    const restored = new SessionStore();
    restored.restore(source.snapshot());

    expect(restored.totalCount()).toBe(0);
    expect(restored.session.users.size).toBe(0);
    expect(restored.session.votes.size).toBe(0);
    expect(restored.session.queue).toEqual([]);
    expect(restored.session.victimId).toBeNull();
    expect(restored.session.willText).toBeNull();
  });
});

describe('isIdleParticipant', () => {
  it('expires a participant one minute after joining without touching the cup', () => {
    const store = new SessionStore();
    const user = addUser(store, 'socket');
    const joinedAt = user.joinedAt;

    expect(isIdleParticipant(user, joinedAt + PARTICIPANT_IDLE_TIMEOUT_MS - 1)).toBe(false);
    expect(isIdleParticipant(user, joinedAt + PARTICIPANT_IDLE_TIMEOUT_MS)).toBe(true);
  });

  it('does not expire a participant while they are holding the cup', () => {
    const store = new SessionStore();
    const user = addUser(store, 'socket');
    user.holding = true;

    expect(isIdleParticipant(user, user.joinedAt + PARTICIPANT_IDLE_TIMEOUT_MS * 2)).toBe(false);
  });
});
