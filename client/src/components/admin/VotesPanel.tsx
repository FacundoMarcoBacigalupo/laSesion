interface Props { votes: Record<string, number> }
export default function VotesPanel({ votes }: Props) {
  return (
    <div className="card">
      <h3>Votos</h3>
      {Object.entries(votes).map(([k, v]) => (
        <div key={k}>{k}: <span style={{ color: 'var(--a)' }}>{'█'.repeat(v)}</span> {v}</div>
      ))}
    </div>
  );
}