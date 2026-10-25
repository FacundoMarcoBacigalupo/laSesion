interface Props { pact: any; onSign: (png: string) => void; onClear: () => void }
export default function PactScreen({ pact, onSign, onClear }: Props) {
  if (!pact) return null;
  return (
    <div className="card">
      <h3 style={{ color: 'var(--r)' }}>📝 PACTO 🩸</h3>
      <div style={{ textAlign: 'left', fontSize: 11, lineHeight: 1.35 }}>
        {pact.clauses?.map((c: string, i: number) => (
          <p key={i} style={i === 3 ? { opacity: 0.65, fontSize: 9 } : {}}>{c}</p>
        ))}
      </div>
      {!pact.sealed && (
        <>
          <canvas id="sigCanvas" width={240} height={80} style={{ width: '100%', maxWidth: 240, background: '#000', border: '1px dashed var(--r)', borderRadius: 8, touchAction: 'none', marginTop: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn ghost" onClick={onClear}>Borrar</button>
            <button className="btn" onClick={() => {
              const c = document.getElementById('sigCanvas') as HTMLCanvasElement;
              onSign(c.toDataURL('image/png'));
            }}>Firmar 🩸</button>
          </div>
          {pact.penaltyText && <p style={{ fontSize: 11, color: '#ffb3c0', marginTop: 8 }}>⚠️ Penalidades: {pact.penalties} · {pact.penaltyText}</p>}
        </>
      )}
      {pact.sealed && (
        <>
          <p style={{ color: '#5dffa8' }}>🩸 FIRMADO. YA NO HAY VUELTA ATRAS.</p>
          <img src={pact.png} alt="firma" style={{ background: '#000', borderRadius: 8, width: '100%', maxWidth: 240 }} />
        </>
      )}
    </div>
  );
}