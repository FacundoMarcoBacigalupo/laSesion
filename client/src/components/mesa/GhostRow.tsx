interface Props { ghosts: { name: string }[] }
export default function GhostRow({ ghosts }: Props) {
  if (!ghosts.length) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {ghosts.map((g) => (
        <span key={g.name} style={{ padding: '3px 11px', borderRadius: 99, background: '#ffffff12', color: '#fff', opacity: .5, filter: 'blur(.6px)', fontSize: 13, animation: 'fl2 3s ease-in-out infinite' }}>
          👻 {g.name}
        </span>
      ))}
    </div>
  );
}