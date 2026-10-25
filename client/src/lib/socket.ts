import { io, Socket } from 'socket.io-client';

export function makeSocket(ns: string, token?: string, extra?: any): Socket {
  const base = window.location.origin;
  return io(base + ns, {
    transports: ['websocket', 'polling'],
    auth: extra?.auth,
    query: extra?.query,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
}