interface Props { phase: string; onChange: (p: string) => void }
export default function PhaseControl({ phase, onChange }: Props) {
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Fase actual: {phase}</h3>
      {['LOBBY','SESSION','VOTING','VICTIM','PACT','EXORCISM','END'].map((p) => (
        <button key={p} className="btn ghost" onClick={() => onChange(p)} style={{ margin: 2 }}>{p}</button>
      ))}
    </div>
  );
}