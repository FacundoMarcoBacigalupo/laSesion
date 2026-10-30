import type { Session, User } from '@sesion/shared';
import { OFFER_KINDS } from '@sesion/shared';

export function buildPrompt(session: Session, pedido: string, pregunta?: string, extra?: any): any {
  const presentes = [...session.users.values()]
    .filter((u) => u.connected)
    .slice(0, 12)
    .map((u) => ({
      n: u.name,
      modelo: u.device.model,
      bat: u.device.battery ?? undefined,
      ciudad: u.device.tz.split('/').pop()?.replace(/_/g, ' '),
      sosteniendo: u.holding,
      pestañasPerdidas: u.hiddenCount,
    }));

  const votesObj: Record<string, number> = {};
  const voteCounts = new Map<string, number>();
  for (const t of session.votes.values()) voteCounts.set(t, (voteCounts.get(t) ?? 0) + 1);
  for (const [uid, c] of voteCounts.entries()) {
    const u = session.users.get(uid);
    if (u) votesObj[u.name] = c;
  }
  const masVotadoEntry = [...voteCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const masVotado = masVotadoEntry ? session.users.get(masVotadoEntry[0])?.name : undefined;

  const cola = session.queue.filter((q) => q.state === 'queued').slice(0, 5).map((q) => ({ de: q.name, texto: q.text }));
  const preguntasPrevias = session.history.slice(-5).map((q) => q.text);

  const fantasmas = [...session.users.values()]
    .filter((u) => u.ghost)
    .map((u) => ({ n: u.name, preguntaVieja: u.ghostQuestion ?? '¿Hay alguien ahí?' }));

  const ofrendas = { ...session.offerings.counts };

  const payload: any = {
    pedido,
    hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    fase: session.phase,
    humor: session.mood,
    tension: Math.round(session.tension),
    manos: session.users ? [...session.users.values()].filter((u) => u.connected && u.holding).length : 0,
    total: [...session.users.values()].filter((u) => u.connected).length,
    presentes,
    votos: votesObj,
    masVotado,
    cola,
    preguntasPrevias,
    fantasmas,
    ofrendas,
    quiere: session.offerings.want,
    humorEspiritu: session.offerings.points < 4 ? 'pide más' : session.offerings.points < 9 ? 'calmo' : 'saciado',
    ultimoEvento: session.ai.lastEvent,
  };
  if (session.victimId) {
    const v = session.users.get(session.victimId);
    if (v) payload.victimaElegida = v.name;
  }
  if (pregunta) payload.pregunta = pregunta;
  if (session.pact) payload.pacto = { firmado: !!session.pact.signedAt, penalidades: session.pact.penalties };
  if (session.exorcism.active) payload.exorcismo = { energia: Math.round(session.exorcism.energy) };
  if (extra) Object.assign(payload, extra);
  // truncate size ~3KB
  let str = JSON.stringify(payload);
  if (str.length > 3000) {
    payload.presentes = payload.presentes.slice(0, 6);
    str = JSON.stringify(payload);
  }
  return payload;
}