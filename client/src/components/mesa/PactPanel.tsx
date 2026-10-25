interface Props { pact: any }
export default function PactPanel({ pact }: Props) {
  if (!pact) return null;
  return (
    <div style={{ border: '1px solid var(--l)', borderRadius: 12, padding: 12 }}>
      <h3 style={{ margin: 0 }}>📝 Pacto</h3>
      {pact.clauses?.map((c: string, i: number) => (
        <p key={i} style={i === 3 ? { opacity: .65, fontSize: 10 } : { fontSize: 14 }}>{c}</p>
      ))}
      {pact.penalties > 0 && <p style={{ color: '#ffb3c0' }}>⚠️ Penalidad {pact.penalties}: {pact.penaltyText}</p>}
      {pact.sealed && <p style={{ color: '#5dffa8' }}>🩸 FIRMADO</p>}
      {pact.png && <img src={pact.png} alt="firma" style={{ height: 40, background: '#000', borderRadius: 6 }} />}
    </div>
  );
}