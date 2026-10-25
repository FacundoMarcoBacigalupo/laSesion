import type { Session, User } from '@sesion/shared';

export function buildTestament(session: Session, victim: User): string {
  const others = [...session.users.values()].filter((u) => u.id !== victim.id && u.connected);
  const a = (others.length ? others[Math.floor(Math.random() * others.length)] : victim) as User;
  const aId = a.id;
  const rest = others.filter((u) => u.id !== aId);
  const b = (rest.length ? rest[Math.floor(Math.random() * rest.length)] : a) as User;
  const bat = victim.device.battery;
  const batText = bat != null ? `mi ${bat}% de batería` : 'mi cargador';
  const aName = a.name;
  const bName = b.name;
  const model = victim.device.model ?? 'celular';
  return `Yo, ${victim.name}, dejo ${batText} a ${aName}, mi ${model} a ${bName} y mi vergüenza a todos.`;
}