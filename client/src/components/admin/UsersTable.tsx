interface Props { users: any[]; onKick: (id: string) => void }
export default function UsersTable({ users, onKick }: Props) {
  return (
    <div className="card">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr><th>Nombre</th><th>Modelo</th><th>IP</th><th>Bat</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.device?.model ?? 'n/d'}</td>
              <td>{u.ip}</td>
              <td>{u.device?.battery ?? 'n/d'}%</td>
              <td>{u.ghost ? '👻' : u.holding ? '✋' : u.hidden ? '👁️' : '·'} {u.wasVictim ? '🩸' : ''}</td>
              <td><button className="btn ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => onKick(u.id)}>kick</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}