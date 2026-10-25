import { Server } from 'socket.io';
import type { SessionStore } from '../domain/session';
import type { AiScheduler } from '../ai/scheduler';
import { registerPlay } from './play';
import { registerMesa } from './mesa';
import { registerAdmin } from './admin';

export function createIo(httpServer: any, store: SessionStore, scheduler: AiScheduler) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    transports: ['websocket', 'polling'],
    pingInterval: 20000,
    pingTimeout: 25000,
    perMessageDeflate: false,
  });
  registerPlay(io, store, scheduler);
  registerMesa(io, store);
  registerAdmin(io, store, scheduler);
  return io;
}