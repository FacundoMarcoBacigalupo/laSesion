import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { login } from '../lib/api';

export default function AdminLoginPage() {
  const nav = useNavigate();
  const [pw, setPw] = useState('admin');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: containerRef });

  useGSAP(() => {
    gsap.from(cardRef.current, {
      autoAlpha: 0,
      y: 25,
      scale: 0.96,
      duration: 0.6,
      ease: 'power3.out',
    });
  }, { scope: containerRef });

  const triggerErrorShake = contextSafe(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current,
        { x: -8 },
        { x: 8, duration: 0.08, repeat: 4, yoyo: true, ease: 'none', onComplete: () => {
          gsap.to(cardRef.current, { x: 0, duration: 0.1 });
        }}
      );
    }
  });

  async function submit() {
    setLoading(true);
    setErr('');
    const r = await login(pw);
    setLoading(false);
    if (r?.ok) {
      nav('/admin');
    } else {
      setErr(r?.error ?? 'Contraseña incorrecta');
      triggerErrorShake();
    }
  }

  return (
    <div ref={containerRef} className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div ref={cardRef} className="card card-highlight" style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>👁️</div>
        <h2 style={{ marginBottom: 6, letterSpacing: '-0.02em' }}>Director de Sesión</h2>
        <p style={{ color: 'var(--mu)', fontSize: 13, marginBottom: 20 }}>Ingresá para controlar el flujo de la experiencia</p>
        
        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div style={{ textAlign: 'left', marginBottom: 16 }}>
            <label htmlFor="adminPw" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
              Clave de acceso
            </label>
            <input
              id="adminPw"
              type="password"
              className="input-dark"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Contraseña"
              autoFocus
            />
          </div>

          <button type="submit" className="btn" style={{ width: '100%', padding: '13px' }} disabled={loading}>
            {loading ? 'Verificando...' : 'Iniciar control ⚡'}
          </button>
        </form>

        {err && (
          <p style={{ color: 'var(--r)', marginTop: 14, fontSize: 13, background: 'rgba(255,59,92,0.1)', padding: '8px 12px', borderRadius: 8 }}>
            {err}
          </p>
        )}
      </div>
    </div>
  );
}