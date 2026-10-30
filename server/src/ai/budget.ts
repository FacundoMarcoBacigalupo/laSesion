// Latido, fantasmas, ofrendas y exorcismo ya tienen texto local.
// Solo las preguntas (y el pacto/testamento del admin) gastan modelo.
export const AI_LOCAL_PEDIDOS = new Set([
  'latido',
  'fantasma',
  'ofrenda',
  'exorcismo_inicio',
  'exorcismo_fin',
  'despedida',
]);

export function spendsModel(pedido: string, calls: number, cap: number): boolean {
  return !AI_LOCAL_PEDIDOS.has(pedido) && calls < cap;
}

export function isLocalPedido(pedido: string): boolean {
  return AI_LOCAL_PEDIDOS.has(pedido);
}
