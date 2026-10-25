interface Props { onExport: () => void; onPurge: () => void }
export default function DangerZone({ onExport, onPurge }: Props) {
  return (
    <div className="card warn" style={{ marginTop: 12 }}>
      <h3>Danger zone</h3>
      <button className="btn ghost" onClick={onExport}>Exportar JSON</button>
      <button className="btn ghost" style={{ marginLeft: 8 }} onClick={onPurge}>Purgar todo</button>
    </div>
  );
}