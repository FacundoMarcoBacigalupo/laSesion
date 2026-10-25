interface Props { question: string; onChange: (v: string) => void; onSend: () => void }
export default function AskScreen({ question, onChange, onSend }: Props) {
  return (
    <div className="card">
      <h3>Preguntale al espíritu</h3>
      <input value={question} onChange={(e) => onChange(e.target.value)} placeholder="Tu pregunta..." maxLength={80}
        style={{ padding: 12, borderRadius: 10, border: '1px solid var(--l)', background: '#000', color: '#fff', width: '100%' }} />
      <button className="btn" style={{ marginTop: 8 }} onClick={onSend}>Enviar a la cola</button>
    </div>
  );
}