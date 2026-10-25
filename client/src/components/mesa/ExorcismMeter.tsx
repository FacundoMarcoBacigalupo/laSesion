interface Props { active: boolean; energy: number }
export default function ExorcismMeter({ active, energy }: Props) {
  if (!active) return null;
  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--mu)' }}>📳 Energía del exorcismo</p>
      <div className="meter"><i style={{ width: energy + '%', background: 'linear-gradient(90deg,#5de0ff,#fff)' }} /></div>
    </div>
  );
}