import type { Session } from '@sesion/shared';

const LATIDOS = [
  (ctx: any) => `Son las ${ctx.hora}. Te estaba esperando.`,
  (ctx: any) => `Estás en ${ctx.ciudad}. Ya lo sé.`,
  (ctx: any) => `Batería: ${ctx.bat}. Eso no te va a alcanzar.`,
  () => 'A las 21:12 otro preguntó lo mismo. No volvió.',
  () => 'Uno de ustedes tiene que irse.',
];

let latidoIdx = 0;

export function fallbackFor(pedido: string, session: Session, extra?: any): { texto: string; humor: string; clausulas?: string[] } {
  const v = session.victimId ? session.users.get(session.victimId) : null;
  const bat = (extra?.bat ?? v?.device?.battery);
  const modelo = (extra?.modelo ?? v?.device?.model) ?? 'celular';
  const ciudad = extra?.ciudad ?? 'acá';
  const nombre = v?.name ?? (extra?.nombre ?? 'elegido');
  const a = extra?.herederoA ?? 'alguien';
  const b = extra?.herederoB ?? 'otro';
  const hh = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  switch (pedido) {
    case 'latido': {
      const hands = [...session.users.values()].filter((u) => u.connected && u.holding).length;
      if (hands === 0) return { texto: 'Soltaron el vaso... esto no les va a gustar.', humor: 'furioso' };
      const i = latidoIdx++ % LATIDOS.length;
      const ctx = { hora: hh, ciudad, bat: bat ?? '??', modelo };
      const fn = LATIDOS[i] ?? (() => 'Son las ' + hh + '. Te estaba esperando.');
      return { texto: fn(ctx), humor: 'burlon' };
    }
    case 'victima':
      return { texto: `${nombre}. La sala habló (${extra?.votos ?? 0} votos).`, humor: 'furioso' };
    case 'testamento':
      return { texto: `Yo, ${nombre}, dejo ${bat != null ? 'mi ' + bat + '% de batería' : 'mi cargador'} a ${a}, mi ${modelo} a ${b} y mi vergüenza a todos.`, humor: 'burlon' };
    case 'pacto': {
      const clausulas = [
        `Yo, el Espíritu, le concedo a ${nombre} 3 años de buena suerte.`,
        `A cambio, ${nombre} cede ${bat != null ? 'su ' + bat + '% de batería' : 'su cargador'} y su lugar en la fila del baño.`,
        'Cláusula 7: si responde "ya vuelvo", no vuelve.',
        `Letra chica: el Espíritu puede usar su ${modelo} para posesiones menores.`,
      ];
      return { texto: `Tengo un trato para ${nombre}.`, humor: 'burlon', clausulas };
    }
    case 'fantasma':
      return { texto: `${extra?.nombre ?? 'alguien'} ya no está... pero sigue acá. ${extra?.pregunta ?? '¿Hay alguien ahí?…'}`, humor: 'burlon' };
    case 'ofrenda': {
      const kind = extra?.kind ?? 'pizza';
      const lines: Record<string, string> = { pizza: 'PIZZA... ¿DE MUZZARELLA?', wifi: 'TU WIFI AHORA ES MIO.', ex: 'TU EX SABE RICO.', battery: 'GRACIAS. TENIAS 5%.' };
      const base = lines[kind] ?? 'GRACIAS.';
      const texto = extra?.matched ? 'ESO QUERIA. ' + base : (extra?.repeat ? 'OTRA VEZ ESO? ME OFENDES.' : base);
      return { texto, humor: 'hambriento' };
    }
    case 'exorcismo_inicio':
      return { texto: '¿Creen que pueden echarme?', humor: 'furioso' };
    case 'exorcismo_fin':
      return { texto: 'NO... ME VOY... PERO VUELVO.', humor: 'calmo' };
    case 'despedida':
      return { texto: 'Esta noche me llevé a uno. La próxima, a todos.', humor: 'burlon' };
    case 'responder_pregunta':
    case 'usar_cola':
      return { texto: 'LO SABES. A las ' + hh + ' otro preguntó lo mismo. No volvió.', humor: 'burlon' };
    default:
      return { texto: 'Son las ' + hh + '. Te estaba esperando.', humor: 'calmo' };
  }
}