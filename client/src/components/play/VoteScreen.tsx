interface Props { players: any[]; meId: string; voteTarget: string | null; onVote: (id: string) => void }
export default function VoteScreen({ players, meId, voteTarget, onVote }: Props) {
  return (
    <div className="card">
      <h3>¿Quién se va?</h3>
      {players.filter((p) => p.id !== meId && !p.ghost).map((p) => (
        <button key={p.id} className={'vt' + (voteTarget === p.id ? ' me' : '')} onClick={() => onVote(p.id)} style={{ width: '100%', marginBottom: 6 }}>
          <span>{p.name}</span>
        </button>
      ))}
      {voteTarget && <p style={{ fontSize: 12, color: 'var(--mu)' }}>Voto enviado.</p>}
    </div>
  );
}