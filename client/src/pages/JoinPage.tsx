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
    <div className="app" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <h1 className="title">La Sesión</h1>
      <p style={{ color: 'var(--mu)', margin: '0 auto' }}>Ouija colectiva. SideQuest Halloween.</p>
      <div className="card" style={{ marginTop: 24, width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" maxLength={24}
          style={{ padding: 14, borderRadius: 12, border: '1px solid var(--l)', background: '#000', color: '#fff', width: '100%', fontSize: 16, outline: 'none' }} />
        <label className="consent-box">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span style={{ fontSize: 13, color: 'var(--mu)', lineHeight: 1.45 }}>
            Esta sesión usa datos de tu dispositivo (modelo, batería, zona horaria) para asustarte. Todo se borra al terminar.
          </span>
        </label>
        <button className="btn" style={{ marginTop: 16, width: '100%' }} onClick={enter}>Entrar</button>
        {err && <p style={{ color: 'var(--r)', marginTop: 12, fontSize: 14 }}>{err}</p>}
      </div>
    </div>
  );
}