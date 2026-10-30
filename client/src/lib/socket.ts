import { io, Socket } from 'socket.io-client';

const sockets = new Map<string, Socket>();

// Vacío en local: Vite proxyea /socket.io. En Vercel tiene que ser la URL del Node.
export function serverOrigin(): string {
  const raw = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.trim();
  return (raw || window.location.origin).replace(/\/$/, '');
}

export function makeSocket(ns: string, token?: string, extra?: any): Socket {
  const current = sockets.get(ns);
  // Reuse a socket that is still connecting as well as an established one.
  if (current && !current.disconnected) return current;

  const base = serverOrigin();
  const socket = io(base + ns, {
    withCredentials: true,
    // En desarrollo usamos polling: evita falsos errores del proxy WebSocket
    // de Vite y mantiene el canal Socket.IO totalmente funcional.
    transports: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? ['polling']
      : ['websocket'],
    auth: extra?.auth,
    query: extra?.query,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
  sockets.set(ns, socket);
  socket.on('connect_error', (error) => console.error(`[socket ${ns}]`, error.message));
  socket.on('disconnect', () => {
    if (sockets.get(ns) === socket) sockets.delete(ns);
  });
  return socket;
}
