import { describe, expect, it } from 'vitest';
import { SessionStore } from '../src/domain/session';
import { createUser } from '../src/domain/users';
import { armRitualNow, noteRitualAnswer, noteRitualAsk, resetRitual, scoreRitualOffering, setRitualRoomSize, tickRitual } from '../src/domain/ritual';
import { RITUAL_CAULDRON_MS, RITUAL_HOLD_MS, RITUAL_LINES, RITUAL_QUESTIONS_MAX_MS, RITUAL_QUESTIONS_MIN_MS } from '@sesion/shared';

function add(store: SessionStore, name: string, holding = false) {
  const user = createUser({
    name,
    consent: true,
    device: { lang: 'es', tz: 'UTC', dark: false, screen: '1x1', touch: true },
    ip: '127.0.0.1',
    userAgent: 'test',
  });
  user.socketId = name;
  user.holding = holding;
  store.addUser(user);
  return user;
}

describe('ritual', () => {
  it('waits until ten souls, then judges after twenty seconds', () => {
    const store = new SessionStore();
    for (let i = 0; i < 9; i++) add(store, `Alma ${i}`, true);
    expect(tickRitual(store.session, 1_000)).toBeNull();

    add(store, 'Alma 9', true);
    const armed = tickRitual(store.session, 1_000);
    expect(armed?.eliminated).toEqual([]);
    expect(store.session.ritual.holdEndsAt).toBe(1_000 + RITUAL_HOLD_MS);

    expect(tickRitual(store.session, 1_000 + RITUAL_HOLD_MS - 1)).toBeNull();
    const judged = tickRitual(store.session, 1_000 + RITUAL_HOLD_MS);
    expect(judged?.eliminated).toHaveLength(5);
    expect(judged?.eliminated.every((hit) => hit.line === RITUAL_LINES.hold)).toBe(true);
    expect(store.session.ritual.stage).toBe('questions');
    expect([...store.session.users.values()].filter((user) => !user.eliminated)).toHaveLength(5);
  });

  it('drops the hands that were not holding before the ones that were', () => {
    const store = new SessionStore();
    for (let i = 0; i < 6; i++) add(store, `Firme ${i}`, true);
    for (let i = 0; i < 4; i++) add(store, `Suelta ${i}`, false);
    tickRitual(store.session, 0);
    tickRitual(store.session, RITUAL_HOLD_MS);
    const dead = [...store.session.users.values()].filter((user) => user.eliminated);
    expect(dead.filter((user) => user.name.startsWith('Suelta'))).toHaveLength(4);
    expect(dead.filter((user) => user.name.startsWith('Firme'))).toHaveLength(1);
    expect([...store.session.users.values()].filter((user) => !user.eliminated).every((user) => user.holding)).toBe(true);
  });

  it('resets the judgment if the room breaks before the twenty seconds', () => {
    const store = new SessionStore();
    const people = Array.from({ length: 10 }, (_, i) => add(store, `Alma ${i}`, true));
    tickRitual(store.session, 0);
    store.session.users.delete(people[0]!.id);
    const cleared = tickRitual(store.session, 5_000);
    expect(cleared?.eliminated).toEqual([]);
    expect(store.session.ritual.holdEndsAt).toBeNull();
    expect(store.session.ritual.stage).toBe('hold');
  });

  it('lets the five speak, then spits out three who are not pure evil', () => {
    const store = new SessionStore();
    for (let i = 0; i < 10; i++) add(store, `Alma ${i}`, true);
    tickRitual(store.session, 0);
    tickRitual(store.session, RITUAL_HOLD_MS);
    const started = store.session.ritual.questionsStartedAt ?? 0;
    noteRitualAsk(store.session, 'Alma 0', '¿quién cae?');
    noteRitualAnswer(store.session, started + 1_000);
    expect(tickRitual(store.session, started + RITUAL_QUESTIONS_MIN_MS - 1)).toBeNull();
    const judged = tickRitual(store.session, started + RITUAL_QUESTIONS_MIN_MS);
    expect(judged?.eliminated).toHaveLength(3);
    expect(judged?.eliminated.every((hit) => hit.line === RITUAL_LINES.questions)).toBe(true);
    expect(store.session.ritual.stage).toBe('cauldron');
    expect(store.session.ritual.cauldronEndsAt).toBe(started + RITUAL_QUESTIONS_MIN_MS + RITUAL_CAULDRON_MS);
  });

  it('sacrifices whoever offered less and crowns the other', () => {
    const store = new SessionStore();
    const people = Array.from({ length: 10 }, (_, i) => add(store, `Alma ${i}`, true));
    tickRitual(store.session, 0);
    tickRitual(store.session, RITUAL_HOLD_MS);
    store.session.ritual.questionsStartedAt = 0;
    tickRitual(store.session, RITUAL_QUESTIONS_MAX_MS);
    const alive = people.filter((user) => !user.eliminated);
    expect(alive).toHaveLength(2);
    scoreRitualOffering(store.session, alive[0]!.id);
    scoreRitualOffering(store.session, alive[0]!.id);
    scoreRitualOffering(store.session, alive[1]!.id);
    const ends = store.session.ritual.cauldronEndsAt ?? 0;
    const judged = tickRitual(store.session, ends);
    expect(judged?.eliminated.map((hit) => hit.user.id)).toEqual([alive[1]!.id]);
    expect(judged?.eliminated[0]?.line).toBe(RITUAL_LINES.cauldron);
    expect(store.session.ritual.stage).toBe('pact');
    expect(store.session.ritual.pureName).toBe(alive[0]!.name);
  });

  it('starts the judgment with the room size chosen in admin', () => {
    const store = new SessionStore();
    expect(setRitualRoomSize(store.session, 4)).toBe(true);
    for (let i = 0; i < 3; i++) add(store, `Alma ${i}`, true);
    expect(tickRitual(store.session, 0)).toBeNull();
    add(store, 'Alma 3', true);
    tickRitual(store.session, 0);
    const judged = tickRitual(store.session, RITUAL_HOLD_MS);
    expect(judged?.eliminated).toHaveLength(2);
    expect([...store.session.users.values()].filter((user) => !user.eliminated)).toHaveLength(2);
    expect(store.session.ritual.stage).toBe('questions');
  });

  it('returns every soul to the cup when the director restarts the rite', () => {
    const store = new SessionStore();
    setRitualRoomSize(store.session, 4);
    for (let i = 0; i < 4; i++) add(store, `Alma ${i}`, true);
    tickRitual(store.session, 0);
    tickRitual(store.session, RITUAL_HOLD_MS);
    expect(store.session.ritual.stage).toBe('questions');
    resetRitual(store.session);
    expect(store.session.ritual.stage).toBe('hold');
    expect(store.session.ritual.roomSize).toBe(4);
    expect([...store.session.users.values()].every((user) => !user.eliminated && !user.holding)).toBe(true);
  });

  it('lets the director cut the hold as soon as the room is full', () => {
    const store = new SessionStore();
    for (let i = 0; i < 9; i++) add(store, `Alma ${i}`, true);
    expect(armRitualNow(store.session, 5_000)).toBe(false);
    add(store, 'Alma 9', true);
    expect(armRitualNow(store.session, 5_000)).toBe(true);
    const judged = tickRitual(store.session, 5_000);
    expect(judged?.eliminated).toHaveLength(5);
    expect(store.session.ritual.stage).toBe('questions');
  });
});
