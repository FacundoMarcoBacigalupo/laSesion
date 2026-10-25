interface Props { onDismiss: () => void }
export default function ReturnBanner({ onDismiss }: Props) {
  return (
    <div style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'var(--p)', border: '1px solid var(--l)', borderRadius: 12, padding: '12px 20px', zIndex: 100, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 20 }}>👻</span>
      <span>El espíritu despierta...</span>
      <button className="btn ghost" onClick={onDismiss}>Cerrar</button>
    </div>
  );
}