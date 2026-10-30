import { serverOrigin } from './socket';

function apiUrl(path: string): string {
  const origin = serverOrigin();
  return origin === window.location.origin ? path : origin + path;
}

export async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(apiUrl(path), { credentials: 'include', headers: { 'content-type': 'application/json' }, ...opts });
  return res.json();
}
export const login = (password: string) => api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) });
export const logout = () => api('/api/auth/logout', { method: 'POST' });
export const me = () => api('/api/auth/me');
export const config = () => api('/api/config');