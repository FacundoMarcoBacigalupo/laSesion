import { useCallback, useRef } from 'react';
import { requestMotionPermission } from '../lib/motion';

export function useShake(socket: any) {
  const last = useRef(0);
  const active = useRef(false);
  const start = useCallback(async () => {
    const ok = await requestMotionPermission();
    if (!ok) return false;
    if (active.current) return true;
    active.current = true;
    const handler = (e: any) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const m = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      const d = Math.abs(m - last.current);
      last.current = m;
      if (d > 6) socket?.emit?.('shake', { force: Math.min(15, d / 2) });
    };
    window.addEventListener('devicemotion', handler);
    return true;
  }, [socket]);
  const tap = useCallback(() => {
    socket?.emit?.('shake', { force: 12 });
  }, [socket]);
  return { start, tap };
}