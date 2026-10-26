import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/api';

export default function AdminLoginPage() {
  const nav = useNavigate();
  const [pw, setPw] = useState('admin');
  const [err, setErr] = useState('');
  async function submit() {
    const r = await login(pw);
    if (r?.ok) nav('/admin'); else setErr(r?.error ?? 'error');
  }
  return (
    <div className="app" style={{ display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>Admin login</h2>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Contraseña"
            style={{ padding: 12, borderRadius: 10, border: '1px solid var(--l)', background: '#000', color: '#fff', width: '100%', fontSize: 16 }}
          />
          <button type="submit" className="btn" style={{ marginTop: 14, width: '100%' }}>
            Entrar
          </button>
        </form>
        {err && <p style={{ color: 'var(--r)', marginTop: 8 }}>{err}</p>}
      </div>
    </div>
  );
}