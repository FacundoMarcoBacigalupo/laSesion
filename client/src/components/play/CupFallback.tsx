export default function CupFallback({ holding, onStart, onStop }: { holding: boolean; onStart: () => void; onStop: () => void }) {
  return (
    <div className={'cup-w' + (holding ? ' on' : '')} style={{ width: 170, height: 170, margin: 'auto', cursor: 'pointer' }}
      onPointerDown={onStart} onPointerUp={onStop} onPointerCancel={onStop}>
      <div className="glow" />
      <div className="cup"><div className="in" /><div className="hl" /><span>{holding ? 'LATIENDO\n♥' : 'TOCÁ Y\nMANTENÉ'}</span></div>
    </div>
  );
}