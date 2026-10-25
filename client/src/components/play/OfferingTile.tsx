interface Props { kind: string; onOffer: () => void }
export default function OfferingTile({ kind, onOffer }: Props) {
  const emoji = { pizza: '🍕', wifi: '📶', ex: '💔', battery: '🔋' }[kind] ?? '🍕';
  return (
    <span className="ofr" style={{ fontSize: 36, padding: 8, borderRadius: 14, background: 'var(--p)', border: '1px solid var(--l)', cursor: 'grab' }} onClick={onOffer}>
      {emoji}
    </span>
  );
}