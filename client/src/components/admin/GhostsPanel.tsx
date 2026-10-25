interface Props { ghosts: { name: string; question: string }[] }
export default function GhostsPanel({ ghosts }: Props) {
  return (
    <div className="card">
      <h3>Fantasmas</h3>
      {ghosts.map((g) => (
        <p key={g.name} style={{ fontSize: 13, margin: '4px 0' }}>👻 {g.name}: {g.question}</p>
      ))}
    </div>
  );
}