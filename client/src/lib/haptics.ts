export function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern as any); } catch {}
}