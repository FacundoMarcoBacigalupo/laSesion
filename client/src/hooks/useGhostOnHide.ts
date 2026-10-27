import { useEffect } from 'react';

export function useGhostOnHide(socket: any) {
  useEffect(() => {
    const handler = () => {
      document.title = document.hidden ? 'VOLVÉ 👁️' : 'La Sesión · Ouija colectiva';
      const current = socket?.current ?? socket;
      current?.emit?.('visibility', { hidden: document.hidden });
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [socket]);
}
