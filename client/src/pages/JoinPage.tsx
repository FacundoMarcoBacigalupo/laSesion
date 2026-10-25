import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeStore } from '../store/meStore';
import { readDevice } from '../lib/device';
import { makeSocket } from '../lib/socket';
import { createMockSocket } from '../lib/mockSocket';

export default function JoinPage() {
  const nav = useNavigate();
  const setMe = useMeStore((s: any) => s.setMe);
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState('');

  const demo = new URLSearchParams(window.location.search).get('demo') === '1';

  async function enter() {
    if (!name.trim() || !consent) { setErr('Nombre y consentimiento requeridos'); return; }
    const device = await readDevice();
    const socket = demo ? createMockSocket('/play') : makeSocket('/play');
    socket.emit('join', { name: name.trim(), consent: true, device }, (res: any) => {
      if (res?.ok) {
        setMe({ id: res.userId, token: res.token, name: name.trim(), ghost: false, chosen: false, holding: false });
        localStorage.setItem('resumeToken', res.token);
        nav('/play' + window.location.search);
      } else setErr(res?.error ?? 'error');
    });
  }

  return (
    <div className="app">
      <h1 className="title">La Sesión</h1>
      <p style={{ color: 'var(--mu)' }}>Ouija colectiva. SideQuest Halloween.</p>
      <div className="card" style={{ marginTop: 20, maxWidth: 420 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" maxLength={24}
          style={{ padding: 12, borderRadius: 10, border: '1px solid var(--l)', background: '#000', color: '#fff', width: '100%' }} />
        <label style={{ display: 'block', marginTop: 12, fontSize: 13, color: 'var(--mu)' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Esta sesión usa datos de tu dispositivo (modelo, batería, zona horaria) para asustarte. Todo se borra al terminar.
        </label>
        <button className="btn" style={{ marginTop: 12, width: '100%' }} onClick={enter}>Entrar</button>
        {err && <p style={{ color: 'var(--r)', marginTop: 8 }}>{err}</p>}
      </div>
    </div>
  );
}