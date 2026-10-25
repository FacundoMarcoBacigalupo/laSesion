interface Props { name: string; willText: string; onNext: () => void }
export default function ChosenScreen({ name, willText, onNext }: Props) {
  return (
    <div className="card" style={{ background: '#3a0612', animation: 'sh .15s infinite' }}>
      <div style={{ fontSize: 50 }}>🩸</div>
      <h2>ELEGIDO</h2>
      <b style={{ fontSize: 26 }}>{name}</b>
      {willText && <p style={{ fontSize: 11, color: '#ffb3c0' }}>📜 {willText}</p>}
      <button className="btn" style={{ marginTop: 12 }} onClick={onNext}>Ver pacto</button>
    </div>
  );
}