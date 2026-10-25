interface Props { active: boolean; energy: number; onStart: () => void; onTap: () => void }
export default function ExorcismScreen({ active, energy, onStart, onTap }: Props) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 44 }}>📳</div>
      <h3>¡EXORCISMO!</h3>
      <p style={{ fontSize: 13, color: 'var(--mu)' }}>Sacudí el celular junto a toda la sala.</p>
      <button className="btn" onClick={onStart}>Activar sensor</button>
      <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={onTap}>👆 Tocar rápido (alternativa)</button>
      <div className="meter" style={{ marginTop: 12 }}><i style={{ width: energy + '%', background: 'linear-gradient(90deg,#5de0ff,#fff)' }} /></div>
      <p style={{ fontSize: 12, color: 'var(--mu)' }}>Energía: {Math.round(energy)}%</p>
    </div>
  );
}