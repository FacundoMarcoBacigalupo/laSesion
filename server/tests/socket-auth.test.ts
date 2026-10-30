import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { authHandshakeAdmin } from '../src/sockets/middleware';
import { registerMesa } from '../src/sockets/mesa';

function authenticate(socket: any): Error | undefined {
  let result: Error | undefined;
  authHandshakeAdmin(socket, (error) => { result = error; });
  return result;
}

describe('admin socket authentication', () => {
  it('accepts an authenticated admin session', () => {
    const token = jwt.sign({ admin: true }, env.JWT_SECRET);
    const socket = {
      handshake: {
        headers: { cookie: `admin_token=${token}` },
      },
      data: {},
    };

    expect(authenticate(socket)).toBeUndefined();
    expect(socket.data.admin).toBe(true);
  });

  it('rejects clients without an admin session', () => {
    expect(authenticate({ handshake: { headers: {} }, data: {} })).toBeInstanceOf(Error);
  });
});

describe('public projector socket', () => {
  it('does not require authentication to connect to /mesa', () => {
    const namespace = { use: vi.fn(), on: vi.fn(), emit: vi.fn() };
    const io = { of: vi.fn(() => namespace) };
    vi.useFakeTimers();

    try {
      registerMesa(io, {} as any);
      expect(namespace.use).not.toHaveBeenCalled();
      expect(namespace.on).toHaveBeenCalledWith('connection', expect.any(Function));
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
