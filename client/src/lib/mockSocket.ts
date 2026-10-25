class SimpleEmitter {
  private handlers: Map<string, Set<Function>> = new Map();
  on(event: string, cb: Function) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(cb);
  }
  emit(event: string, payload?: any) {
    this.handlers.get(event)?.forEach(cb => cb(payload));
  }
}

export function createMockSocket(ns: string) {
  const ee = new SimpleEmitter();
  const socket: any = {
    on: (ev: string, cb: any) => ee.on(ev, cb),
    emit: (ev: string, payload?: any, ack?: any) => {
      // basic echo for join
      if (ev === 'join') {
        setTimeout(() => {
          ee.emit('sync', { phase: 'LOBBY', me: { id: 'me', name: payload?.name ?? 'Yo', ghost: false, holding: false }, counts: { players: 5, hands: 0 }, want: 'pizza', exorcism: { active: false, energy: 0 }, pact: null });
          if (ack) ack({ ok: true, userId: 'me', token: 'demo-token', phase: 'LOBBY', me: { id: 'me', name: payload?.name ?? 'Yo', ghost: false, holding: false } });
        }, 50);
      }
      if (ev === 'hold') {
        setTimeout(() => {
          ee.emit('hands', { n: payload?.on ? 1 : 0, total: 5 });
        }, 30);
      }
      if (ack && ev !== 'join') setTimeout(() => ack({ ok: true }), 30);
      return socket;
    },
    connect: () => {},
    disconnect: () => {},
    connected: true,
    id: 'mock-' + Math.random().toString(36).slice(2),
  };
  // initial
  setTimeout(() => {
    ee.emit('sync', { phase: 'LOBBY', me: null, counts: { players: 4, hands: 0 }, want: 'pizza', exorcism: { active: false, energy: 0 }, pact: null });
  }, 100);
  return socket;
}