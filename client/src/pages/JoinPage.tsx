import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
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
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const demo = new URLSearchParams(window.location.search).get('demo') === '1';

  const { contextSafe } = useGSAP({ scope: containerRef });

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.join-badge', {
      autoAlpha: 0,
      scale: 0.8,
      y: -15,
      duration: 0.6,
    })
    .from('.join-title', {
      autoAlpha: 0,
      y: 35,
      scale: 0.95,
      duration: 0.8,
    }, '-=0.3')
    .from('.join-sub', {
      autoAlpha: 0,
      y: 20,
      duration: 0.6,
    }, '-=0.4')
    .from(cardRef.current, {
      autoAlpha: 0,
      y: 30,
      duration: 0.7,
      ease: 'back.out(1.2)',
    }, '-=0.3')
    .from('.join-item', {
      autoAlpha: 0,
      y: 15,
      stagger: 0.08,
      duration: 0.45,
    }, '-=0.3');
  }, { scope: containerRef });

  const triggerErrorShake = contextSafe(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, 
        { x: -10 }, 
        { x: 10, duration: 0.08, repeat: 5, yoyo: true, ease: 'none', onComplete: () => {
          gsap.to(cardRef.current, { x: 0, duration: 0.1 });
        }}
      );
    }
  });

  async function enter() {
    if (!name.trim() || !consent) {
      setErr('Ingresá tu nombre y aceptá los términos para continuar');
      triggerErrorShake();
      return;
    }

    setLoading(true);
    setErr('');

    try {
      const device = await readDevice();
      const socket = demo ? createMockSocket('/play') : makeSocket('/play');
      socket.emit('join', { name: name.trim(), consent: true, device }, (res: any) => {
        if (res?.ok) {
          setMe({ id: res.userId, token: res.token, name: name.trim(), ghost: false, chosen: false, holding: false });
          localStorage.setItem('resumeToken', res.token);
          nav('/play' + window.location.search);
        } else {
          setLoading(false);
          setErr(res?.error === 'session_full' ? 'El círculo está completo: máximo 10 participantes' : res?.error ?? 'Error al ingresar');
          triggerErrorShake();
        }
      });
    } catch {
      setLoading(false);
      setErr('Error de conexión');
      triggerErrorShake();
    }
  }

  return (
    <div ref={containerRef} className="app" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '100vh' }}>
      <div className="join-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 99, background: 'rgba(139,108,255,0.15)', border: '1px solid rgba(139,108,255,0.3)', color: 'var(--a)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
        <span>🔮</span> SideQuest Halloween
      </div>

      <h1 className="title join-title">La Sesión</h1>

      <p className="join-sub spirit-text" style={{ maxWidth: 440, margin: '0 auto 8px', color: 'var(--mu)', fontSize: '1.15rem' }}>
        Ouija colectiva en tiempo real. Uní tu energía a la del círculo.
      </p>

      <div ref={cardRef} className="card join-card card-highlight" style={{ marginTop: 20, width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div className="join-item" style={{ marginBottom: 16 }}>
          <label htmlFor="playerName" style={{ display: 'block', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
            Tu nombre
          </label>
          <input
            id="playerName"
            className="input-dark"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') enter(); }}
            placeholder="¿Cómo te llamás?"
            maxLength={24}
            autoFocus
          />
        </div>

        <div className="join-item">
          <label className="consent-box">
            <input
              type="checkbox"
              id="consentCheckbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span style={{ fontSize: 12.5, color: 'var(--mu)', lineHeight: 1.45 }}>
              Esta sesión accede a datos de tu dispositivo (modelo, batería, zona horaria) para manifestarse durante la experiencia. Toda información se destruye al finalizar.
            </span>
          </label>
        </div>

        <div className="join-item" style={{ marginTop: 18 }}>
          <button 
            id="btnEnterSession"
            className="btn" 
            style={{ width: '100%', padding: '14px 20px', fontSize: 16 }} 
            onClick={enter}
            disabled={loading}
          >
            {loading ? 'Invocando...' : 'Entrar al círculo 🕯️'}
          </button>
        </div>

        {err && (
          <p id="joinErrorMessage" style={{ color: 'var(--r)', marginTop: 14, fontSize: 13.5, fontWeight: 500, background: 'rgba(255,59,92,0.1)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,59,92,0.2)' }}>
            ⚠️ {err}
          </p>
        )}
      </div>

      <div className="join-sub" style={{ marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>💀</span> Duración aproximada: 7 minutos
      </div>
    </div>
  );
}