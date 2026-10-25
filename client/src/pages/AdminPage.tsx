import { useEffect, useState } from 'react';
import { useAdminStore } from '../store/adminStore';
import { useSocket } from '../hooks/useSocket';
import { api } from '../lib/api';

const demo = new URLSearchParams(window.location.search).get('demo') === '1';

export default function AdminPage() {
  const admin = useAdminStore();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [sayText, setSayText] = useState('');

  useEffect(() => { api('/api/auth/me').then((r) => setAuthed(!!r?.admin)); }, []);

  const handlers: Record<string, (p: any) => void> = {
    'admin:state': (p) => admin.setState(p),
    'admin:prompt': (p) => admin.addPrompt(p),
    'admin:log': (p) => admin.addLog(p),
  };
  const socketR = useSocket('/admin', handlers, demo);

  const s = admin.state;

  function cmd(ev: string, payload?: any) {
    socketR.current?.emit?.(ev, payload ?? {}, (r: any) => { if (r && !r.ok) console.warn(r.error); });
  }

  if (authed === false) return <div className="app"><p>Sin acceso. <a href="/admin/login">Login</a></p></div>;
  if (!s) return <div className="app"><p>Cargando...</p></div>;

  return (
    <div className="app">
      <h1 className="title" style={{ fontSize: 40 }}>Admin</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10, margin: '12px 0' }}>
        <div className="card"><b>{s.total}</b><br />Conectados</div>
        <div className="card"><b>{s.hands}</b><br />Sosteniendo</div>
        <div className="card"><b>{s.queue?.length ?? 0}</b><br />Preguntas</div>
        <div className="card"><b>{s.users?.filter((u: any) => u.ghost).length ?? 0}</b><br />Fantasmas</div>
        <div className="card"><b>{s.phase}</b><br />Fase</div>
        <div className="card"><b>{s.mood}</b><br />Humor</div>
        <div className="card"><b>{s.exorcism?.energy ?? 0}%</b><br />Exorcismo</div>
        <div className="card"><b>{s.ai?.breakerOpen ? 'BREAKER' : s.ai?.fallbackForced ? 'FALLBACK' : 'OK'}</b><br />IA</div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Usuarios</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><th>Nombre</th><th>Modelo</th><th>IP</th><th>Bat</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {s.users?.map((u: any) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.device?.model ?? 'n/d'}</td>
                <td>{u.ip}</td>
                <td>{u.device?.battery ?? 'n/d'}%</td>
                <td>{u.ghost ? '👻' : u.holding ? '✋' : u.hidden ? '👁️' : '·'} {u.wasVictim ? '🩸' : ''}</td>
                <td><button className="btn ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => cmd('dir:kick', { userId: u.id })}>kick</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
        <div className="card">
          <h3>Cola de preguntas</h3>
          {s.queue?.map((q: any) => (
            <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span><b>{q.name}:</b> {q.text}</span>
              <button className="btn ghost" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => cmd('dir:queueDelete', { questionId: q.id })}>borrar</button>
            </div>
          ))}
          <button className="btn" style={{ marginTop: 8 }} onClick={() => cmd('dir:readQueue')}>Leer de la cola</button>
        </div>
        <div className="card">
          <h3>Votos</h3>
          {Object.entries(s.voteCounts ?? {}).map(([k, v]) => (
            <div key={k}>{k}: {String(v)}</div>
          ))}
        </div>
        <div className="card">
          <h3>Ofrendas</h3>
          <div>Quiere: {s.offerings?.want}</div>
          <div>Puntos: {s.offerings?.points}</div>
          <button className="btn ghost" style={{ marginTop: 6 }} onClick={() => cmd('dir:wantOffering')}>Pedir ofrenda</button>
        </div>
        <div className="card">
          <h3>Pactos</h3>
          {s.pact && <div>{s.pact.id} · penalidades {s.pact.penalties}</div>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Director</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <button key={i} className="btn ghost" onClick={() => cmd('dir:ask', { quickId: i })}>P{i}</button>
          ))}
          <button className="btn ghost" onClick={() => cmd('dir:pickVictim')}>Elegir víctima</button>
          <button className="btn ghost" onClick={() => cmd('dir:will')}>Testamento</button>
          <button className="btn ghost" onClick={() => cmd('dir:pact')}>Pacto</button>
          <button className="btn ghost" onClick={() => cmd('dir:ghost')}>Fantasma</button>
          <button className="btn ghost" onClick={() => cmd('dir:exorcism', { action: 'start' })}>Exorcismo ON</button>
          <button className="btn ghost" onClick={() => cmd('dir:exorcism', { action: 'stop' })}>Exorcismo OFF</button>
          {['LOBBY', 'SESSION', 'VOTING', 'VICTIM', 'PACT', 'EXORCISM', 'END'].map((ph) => (
            <button key={ph} className="btn ghost" onClick={() => cmd('dir:phase', { phase: ph })}>{ph}</button>
          ))}
          {['calmo', 'furioso', 'hambriento', 'burlon'].map((m) => (
            <button key={m} className="btn ghost" onClick={() => cmd('dir:mood', { mood: m })}>{m}</button>
          ))}
          <button className="btn ghost" onClick={() => cmd('dir:aiToggle', { on: false })}>Forzar fallbacks</button>
          <button className="btn ghost" onClick={() => cmd('dir:aiToggle', { on: true })}>IA on</button>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <input value={sayText} onChange={(e) => setSayText(e.target.value)} placeholder="Texto libre" style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--l)', background: '#000', color: '#fff' }} />
          <button className="btn" onClick={() => { cmd('dir:say', { text: sayText }); setSayText(''); }}>Decir</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Prompt actual a Gemini</h3>
        <pre style={{ maxHeight: 220, fontSize: 11, overflow: 'auto', background: '#000', padding: 8, borderRadius: 8 }}>
          {JSON.stringify(admin.prompts?.[0] ?? {}, null, 2)}
        </pre>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Danger zone</h3>
        <button className="btn ghost" onClick={async () => { await api('/api/admin/export'); }}>Exportar</button>
        <button className="btn ghost" style={{ marginLeft: 8 }} onClick={async () => { await api('/api/admin/purge', { method: 'POST' }); }}>Purgar</button>
      </div>
    </div>
  );
}