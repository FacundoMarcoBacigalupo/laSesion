import type { Session, User } from '@sesion/shared';

export function castVote(session: Session, voterId: string, targetId: string): { ok: boolean; reason?: string } {
  if (session.votes.has(voterId)) return { ok: false, reason: 'already' };
  if (voterId === targetId) return { ok: false, reason: 'self' };
  const target = session.users.get(targetId);
  if (!target || target.ghost) return { ok: false, reason: 'invalid' };
  const voter = session.users.get(voterId);
  if (!voter) return { ok: false, reason: 'novoter' };
  session.votes.set(voterId, targetId);
  return { ok: true };
}

export function pickVictim(
  users: User[],
  votes: Map<string, string>,
  exclude: string[] = [],
  rng: () => number = Math.random,
): string | null {
  const candidates = users.filter((u) => u.connected && !u.ghost && !exclude.includes(u.id));
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!.id;
  // weights
  const counts = new Map<string, number>();
  for (const c of candidates) counts.set(c.id, 1);
  for (const [voter, target] of votes.entries()) {
    if (candidates.some((c) => c.id === target)) {
      counts.set(target, (counts.get(target) ?? 1) + 1);
    }
  }
  // Actually spec: w_i = 1 + votos_i. We added 1 base + votes. But above we set base 1 then +1 per vote? Need +votos count not +1 per? Let's recompute: w_i = 1 + number of votes for i.
  const wmap = new Map<string, number>();
  for (const c of candidates) {
    const vc = [...votes.values()].filter((t) => t === c.id).length;
    wmap.set(c.id, 1 + vc);
  }
  const total = [...wmap.values()].reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (const c of candidates) {
    const w = wmap.get(c.id) ?? 1;
    r -= w;
    if (r <= 0) return c.id;
  }
  return candidates[candidates.length - 1]!.id;
}