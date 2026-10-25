import { useEffect, useRef } from 'react';
import { makeSocket } from '../lib/socket';
import { createMockSocket } from '../lib/mockSocket';

export function useSocket(ns: string, handlers: Record<string, (p: any) => void>, demo: boolean, auth?: any) {
  const ref = useRef<any>(null);
  useEffect(() => {
    const s = demo ? createMockSocket(ns) : makeSocket(ns, undefined, { auth });
    ref.current = s;
    Object.entries(handlers).forEach(([ev, cb]) => s.on(ev, cb));
    return () => { s.disconnect(); };
  }, [ns, demo]);
  return ref;
}