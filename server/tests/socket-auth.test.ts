import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { authHandshakeMesa } from '../src/sockets/middleware';

function authenticate(socket: any): Error | undefined {
  let result: Error | undefined;
  authHandshakeMesa(socket, (error) => { result = error; });
  return result;
}

describe('mesa socket authentication', () => {
  it('accepts the configured projector key', () => {
    expect(authenticate({ handshake: { auth: { key: env.MESA_KEY } } })).toBeUndefined();
  });

  it('accepts an authenticated admin session without exposing the projector key', () => {
    const token = jwt.sign({ admin: true }, env.JWT_SECRET);
    const socket = {
      handshake: {
        headers: { cookie: `admin_token=${token}` },
        auth: {},
      },
      data: {},
    };

    expect(authenticate(socket)).toBeUndefined();
    expect(socket.data.admin).toBe(true);
  });

  it('rejects clients without a projector key or admin session', () => {
    expect(authenticate({ handshake: { auth: {}, headers: {} }, data: {} })).toBeInstanceOf(Error);
  });
});
