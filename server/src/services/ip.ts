import type { Request } from 'express';

export function extractIp(req: Request | { headers?: any; ip?: string; socket?: { remoteAddress?: string } }): string {
  const xf: unknown = (req as any).headers?.['x-forwarded-for'];
  if (typeof xf === 'string') {
    const parts = xf.split(',');
    return parts[0]?.trim() ?? '0.0.0.0';
  }
  if (Array.isArray(xf)) {
    const first = xf[0];
    return first ? String(first).trim() : '0.0.0.0';
  }
  return ((req as any).ip ?? (req as any).socket?.remoteAddress) ?? '0.0.0.0';
}

export function maskIp(ip: string): string {
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 3).join(':') + ':x:x';
  }
  const parts = ip.split('.');
  if (parts.length === 4) return parts[0] + '.' + parts[1] + '.x.x';
  return ip;
}