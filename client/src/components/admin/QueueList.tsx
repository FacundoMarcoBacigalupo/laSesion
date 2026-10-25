interface Props { queue: any[]; onDelete: (id: string) => void; onRead: () => void }
export default function QueueList({ queue, onDelete, onRead }: Props) {
  return (
    <div className="card">
      <h3>Cola de preguntas</h3>
      {queue.map((q) => (
        <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span><b>{q.name}:</b> {q.text}</span>
          <button className="btn ghost" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => onDelete(q.id)}>borrar</button>
        </div>
      ))}
      <button className="btn" style={{ marginTop: 8 }} onClick={onRead}>Leer de la cola</button>
    </div>
  );
}