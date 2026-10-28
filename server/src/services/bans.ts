export const bannedIps = new Map<string, number>();

export function isBanned(ip: string): boolean {
  const until = bannedIps.get(ip);
  if (!until) return false;
  if (Date.now() > until) { bannedIps.delete(ip); return false; }
  return true;
}

export function banIp(ip: string, minutes = 10) {
  bannedIps.set(ip, Date.now() + minutes * 60 * 1000);
}
