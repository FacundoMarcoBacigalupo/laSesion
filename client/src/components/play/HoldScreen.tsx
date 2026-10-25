interface Props { holding: boolean; onStart: () => void; onStop: () => void }
export default function HoldScreen({ holding, onStart, onStop }: Props) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <p style={{ color: 'var(--mu)' }}>Poné el dedo sobre el vaso. No lo sueltes.</p>
      <div style={{ margin: '20px auto', width: 170, height: 170, perspective: 600 }}>
        <div className={'cup-w' + (holding ? ' on' : '')} style={{ width: 170, height: 170, margin: 'auto' }}>
          <div className="glow" />
          <div className="cup" onPointerDown={(e) => { (e.target as any).setPointerCapture?.(e.pointerId); onStart(); }} onPointerUp={onStop} onPointerCancel={onStop}>
            <div className="in" /><div className="hl" />
            <span>{holding ? 'LATIENDO\n♥' : 'TOCÁ Y\nMANTENÉ'}</span>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--mu)' }}>{holding ? '✋ Sostenés. El espíritu lo siente.' : 'Esperando tu mano...'}</p>
    </div>
  );
}