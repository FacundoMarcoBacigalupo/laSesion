interface Props { want: string; onOffer: (kind: string) => void }
export default function OfferingsScreen({ want, onOffer }: Props) {
  const emojiFor = (k: string) => ({ pizza: '🍕', wifi: '📶', ex: '💔', battery: '🔋' })[k] ?? '🍕';
  const kindFor = (e: string) => ({ '🍕': 'pizza', '📶': 'wifi', '💔': 'ex', '🔋': 'battery' })[e] ?? 'pizza';
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h3>🔥 El caldero pide</h3>
      <p style={{ fontSize: 34 }}>{emojiFor(want)}</p>
      <p style={{ fontSize: 12, color: 'var(--mu)' }}>Arrastrá hacia arriba o tocá.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {['🍕', '📶', '💔', '🔋'].map((e) => (
          <span key={e} className="ofr" style={{ fontSize: 36, padding: 8, borderRadius: 14, background: 'var(--p)', border: '1px solid var(--l)', cursor: 'grab' }}
            onPointerDown={(ev) => { (ev.target as any).setPointerCapture?.(ev.pointerId); }}
            onPointerUp={() => onOffer(kindFor(e))}>
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}