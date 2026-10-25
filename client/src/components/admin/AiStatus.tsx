interface Props { breakerOpen: boolean; fallbackForced: boolean; onToggleFallback: () => void }
export default function AiStatus({ breakerOpen, fallbackForced, onToggleFallback }: Props) {
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Estado IA</h3>
      <div>{breakerOpen ? '🔴 BREAKER ABIERTO' : fallbackForced ? '🟡 FALLBACK FORZADO' : '🟢 OK'}</div>
      <button className="btn ghost" style={{ marginTop: 6 }} onClick={onToggleFallback}>
        {fallbackForced ? 'Activar IA' : 'Forzar fallbacks'}
      </button>
    </div>
  );
}