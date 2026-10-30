import { useEffect } from 'react';
import { useMeStore } from '../store/meStore';

export function useGhostOnHide(socket: any) {
  useEffect(() => {
    let leaving = false;
    const leave = (redirect: boolean) => {
      if (leaving) return;
      leaving = true;
      localStorage.removeItem('resumeToken');
      useMeStore.getState().clear();
      const current = socket?.current ?? socket;
      const goToLogin = () => window.location.replace('/');
      if (!current?.connected) {
        if (redirect) goToLogin();
        return;
      }
      current.emit('leave', {}, () => {
        if (redirect) goToLogin();
      });
      if (redirect) window.setTimeout(goToLogin, 500);
    };
    const handler = () => {
      document.title = document.hidden ? 'VOLVÉ 👁️' : 'La Sesión · Ouija colectiva';
      if (document.hidden) {
        leave(true);
        return;
      }
      const current = socket?.current ?? socket;
      current?.emit?.('visibility', { hidden: document.hidden });
    };
    const handlePageHide = () => leave(false);
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [socket]);
}
