import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAdminStore } from '../store/adminStore';
import { useSocket } from '../hooks/useSocket';
import { api } from '../lib/api';
import BloodWebs from '../components/ui/BloodWebs';

const demo = new URLSearchParams(window.location.search).get('demo') === '1';

const PHASES = [
  { id: 'LOBBY', label: '1. Lobby (QR)', icon: '📱' },
  { id: 'SESSION', label: '2. Sesión Ouija', icon: '🖐️' },
  { id: 'VOTING', label: '3. Votación', icon: '🗳️' },
  { id: 'VICTIM', label: '4. Elegido', icon: '🩸' },
  { id: 'PACT', label: '5. Pacto', icon: '📜' },
  { id: 'EXORCISM', label: '6. Exorcismo', icon: '⚡' },
  { id: 'END', label: '7. Final', icon: '✨' },
];

const MOODS = [
  { id: 'calmo', label: 'Calmo', color: 'var(--mood-calmo)' },
  { id: 'furioso', label: 'Furioso', color: 'var(--mood-furioso)' },
  { id: 'hambriento', label: 'Hambriento', color: 'var(--mood-hambriento)' },
  { id: 'burlon', label: 'Burlón', color: 'var(--mood-burlon)' },
];

export default function AdminPage() {
  const admin = useAdminStore();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [mockActive, setMockActive] = useState(false);
  const [sayText, setSayText] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api('/api/auth/me').then((r) => setAuthed(!!r?.admin));
  }, []);

  const handlers: Record<string, (p: any) => void> = {
    'admin:state': (p) => admin.setState(p),
    'admin:prompt': (p) => admin.addPrompt(p),
    'admin:log': (p) => admin.addLog(p),
  };
  const socketR = useSocket('/admin', handlers, demo);

  const s = admin.state;

  function cmd(ev: string, payload?: any, ack?: (r: any) => void) {
    socketR.current?.emit?.(ev, payload ?? {}, (r: any) => {
      if (r && !r.ok) console.warn(r.error);
      ack?.(r);
    });
  }

  useGSAP(() => {
    if (s && containerRef.current) {
      gsap.from('.admin-kpi', {
        autoAlpha: 0,
        y: 15,
        stagger: 0.04,
        duration: 0.45,
        ease: 'power2.out',
      });
    }
  }, [s !== null]);

  if (authed === false) {
    return (
      <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center' }}>
        <BloodWebs />
      <div style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => cmd('dir:mock', {}, (r: any) => setMockActive(!!r?.active))}>{mockActive ? 'Parar datos mockeados' : 'Activar datos mockeados'}</button>
      </div>

        <div className="card" style={{ maxWidth: 360, width: '100%' }}>
          <p style={{ marginBottom: 16 }}>Acceso restringido a directores.</p>
          <a href="/admin/login" className="btn" style={{ width: '100%', textDecoration: 'none' }}>
            Iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  if (!s) {
    return (
      <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <p className="spirit-text" style={{ color: 'var(--mu)', fontSize: 20 }}>Conectando a la mesa de control...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="app" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <BloodWebs />
      <div style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => cmd('dir:mock')}>Activar datos mockeados</button>
      </div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 className="title" style={{ fontSize: 36, margin: 0 }}>Director de Sesión</h1>
          <p style={{ color: 'var(--mu)', fontSize: 13, margin: '2px 0 0' }}>Panel de control en vivo para la presentación de 7 minutos</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/mesa" target="_blank" rel="noreferrer" className="btn ghost" style={{ textDecoration: 'none', fontSize: 13, padding: '8px 14px' }}>
            🖥️ Abrir Proyector
          </a>
        </div>
      </div>

      {/* Real-time KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div className="card admin-kpi" style={{ padding: '14px 18px' }}>
          <b style={{ fontSize: 22, color: '#fff' }}>{s.total}</b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Conectados</div>
        </div>
        <div className="card admin-kpi" style={{ padding: '14px 18px' }}>
          <b style={{ fontSize: 22, color: s.hands > 0 ? '#5dffa8' : '#fff' }}>{s.hands}</b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Sosteniendo</div>
        </div>
        <div className="card admin-kpi" style={{ padding: '14px 18px' }}>
          <b style={{ fontSize: 22, color: 'var(--a)' }}>{s.queue?.length ?? 0}</b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Preguntas</div>
        </div>
        <div className="card admin-kpi" style={{ padding: '14px 18px' }}>
          <b style={{ fontSize: 22, color: (s.users?.filter((u: any) => u.ghost).length ?? 0) > 0 ? '#ffb3c0' : 'var(--mu)' }}>
            {s.users?.filter((u: any) => u.ghost).length ?? 0}
          </b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Fantasmas</div>
        </div>
        <div className="card admin-kpi" style={{ padding: '14px 18px' }}>
          <b style={{ fontSize: 20, color: 'var(--a)' }}>{s.phase}</b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Fase activa</div>
        </div>
        <div className="card admin-kpi" style={{ padding: '14px 18px' }}>
          <b style={{ fontSize: 20, color: '#ffd6a5' }}>{s.mood}</b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Humor</div>
        </div>
        <div className="card admin-kpi" style={{ padding: '14px 18px' }}>
          <b style={{ fontSize: 22, color: 'var(--cyan)' }}>{s.exorcism?.energy ?? 0}%</b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Exorcismo</div>
        </div>
        <div className="card admin-kpi" style={{ padding: '14px 18px' }}>
          <b style={{ fontSize: 18, color: s.ai?.breakerOpen ? 'var(--r)' : '#5dffa8' }}>
            {s.ai?.breakerOpen ? 'BREAKER' : s.ai?.fallbackForced ? 'FALLBACK' : 'ACTIVO'}
          </b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Gemini IA</div>
        </div>
      </div>

      {/* PHASE CONTROL PIPELINE (7-Min Presentation Flow) */}
      <div className="card card-highlight" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>⏱️ Flujo de la Presentación (Fases)</h3>
          <span style={{ fontSize: 12, color: 'var(--mu)' }}>Avanzá secuencialmente según tu relato</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
          {PHASES.map((p) => {
            const isActive = s.phase === p.id;
            return (
              <button
                key={p.id}
                className={`btn ${isActive ? '' : 'ghost'}`}
                style={{
                  padding: '10px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderColor: isActive ? 'var(--a)' : undefined,
                  boxShadow: isActive ? '0 0 20px var(--a-glow)' : 'none',
                }}
                onClick={() => cmd('dir:phase', { phase: p.id })}
              >
                <span>{p.icon}</span> {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* DIRECTOR ACTIONS & SAY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Quick Narrative Actions */}
        <div className="card">
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>⚡ Acciones Clave del Show</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button className="btn ghost" onClick={() => cmd('dir:pickVictim')}>
              🩸 Elegir víctima
            </button>
            <button className="btn ghost" onClick={() => cmd('dir:will')}>
              📜 Enviar testamento
            </button>
            <button className="btn ghost" onClick={() => cmd('dir:pact')}>
              ✍️ Abrir pacto
            </button>
            <button className="btn ghost" onClick={() => cmd('dir:wantOffering')}>
              🔥 Pedir ofrenda
            </button>
            <button className="btn ghost" onClick={() => cmd('dir:ghost')}>
              👻 Forzar fantasma
            </button>
            <button className="btn ghost" style={{ color: 'var(--cyan)' }} onClick={() => cmd('dir:exorcism', { action: 'start' })}>
              ⚡ Exorcismo INICIAR
            </button>
            <button className="btn ghost" onClick={() => cmd('dir:exorcism', { action: 'stop' })}>
              ⏹️ Exorcismo DETENER
            </button>
          </div>

          {/* Quick ask */}
          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 6 }}>Preguntas Rápidas (IA):</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <button key={i} className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => cmd('dir:ask', { quickId: i })}>
                  P{i}
                </button>
              ))}
            </div>
          </div>

          {/* Mood selection */}
          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--mu)', display: 'block', marginBottom: 6 }}>Humor de la Entidad:</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  className="btn ghost"
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    color: m.color,
                    borderColor: s.mood === m.id ? m.color : undefined,
                    background: s.mood === m.id ? 'rgba(255,255,255,0.06)' : undefined,
                  }}
                  onClick={() => cmd('dir:mood', { mood: m.id })}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Speak & Queue */}
        <div className="card">
          <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>🗣️ El Espíritu Habla</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              className="input-dark"
              value={sayText}
              onChange={(e) => setSayText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sayText.trim()) {
                  cmd('dir:say', { text: sayText.trim() });
                  setSayText('');
                }
              }}
              placeholder="Escribí lo que deletreará el vaso en el proyector..."
              style={{ fontSize: 14, padding: '10px 14px' }}
            />
            <button
              className="btn"
              onClick={() => {
                if (sayText.trim()) {
                  cmd('dir:say', { text: sayText.trim() });
                  setSayText('');
                }
              }}
            >
              Decir
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Cola de Preguntas del Público ({s.queue?.length ?? 0})</span>
            {s.queue && s.queue.length > 0 && (
              <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => cmd('dir:readQueue')}>
                Leer siguiente con IA
              </button>
            )}
          </div>

          <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {s.queue?.map((q: any) => (
              <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--l)', fontSize: 13 }}>
                <span><b>{q.name}:</b> {q.text}</span>
                <button className="btn ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => cmd('dir:queueDelete', { questionId: q.id })}>
                  ✕
                </button>
              </div>
            ))}
            {(!s.queue || s.queue.length === 0) && (
              <p style={{ color: 'var(--mu)', fontSize: 12, margin: '8px 0' }}>No hay preguntas en espera.</p>
            )}
          </div>
        </div>
      </div>

      {/* Connected Users Table */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>👥 Participantes Conectados ({s.users?.length ?? 0})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--l)', textAlign: 'left', color: 'var(--mu)' }}>
                <th style={{ padding: '8px 10px' }}>Nombre</th>
                <th style={{ padding: '8px 10px' }}>Dispositivo</th>
                <th style={{ padding: '8px 10px' }}>Batería</th>
                <th style={{ padding: '8px 10px' }}>Estado</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {s.users?.map((u: any) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--mu)' }}>
                    <div>{u.device?.model ?? 'Dispositivo desconocido'}</div>
                    <small>{[u.device?.platform, u.device?.screen].filter(Boolean).join(' · ') || 'Sistema desconocido'}</small>
                  </td>
                  <td style={{ padding: '8px 10px' }}>{u.device?.battery ?? '—'}%</td>
                  <td style={{ padding: '8px 10px' }}>
                    {u.ghost ? '👻 Fantasma' : u.holding ? '✋ Sosteniendo' : u.hidden ? '👁️ Oculto' : 'En círculo'}
                    {u.wasVictim ? ' 🩸 Víctima' : ''}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => cmd('dir:kick', { userId: u.id })}>
                      Expulsar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collapsible Gemini Prompt & Advanced Debug */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15 }}>🤖 Diagnóstico Gemini API</h3>
            <span style={{ fontSize: 12, color: 'var(--mu)' }}>
              {s.ai?.breakerOpen ? '⚠️ Breaker activado (fallbacks activos)' : 'IA operativa con Gemini'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => cmd('dir:aiToggle', { on: !s.ai?.fallbackForced })}>
              {s.ai?.fallbackForced ? 'Reactivar Gemini' : 'Forzar Fallbacks'}
            </button>
            <button className="btn ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShowPrompt(!showPrompt)}>
              {showPrompt ? 'Ocultar Prompt' : 'Ver Prompt'}
            </button>
          </div>
        </div>

        {showPrompt && (
          <pre style={{ maxHeight: 220, fontSize: 11, overflow: 'auto', background: '#050308', padding: 12, borderRadius: 8, marginTop: 12, border: '1px solid var(--l)' }}>
            {JSON.stringify(admin.prompts?.[0] ?? {}, null, 2)}
          </pre>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--mu)' }}>Administración de Datos</h3>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" style={{ fontSize: 12 }} onClick={async () => { await api('/api/admin/export'); }}>
            Exportar sesión
          </button>
          <button className="btn danger" style={{ fontSize: 12, padding: '8px 14px' }} onClick={async () => { if (confirm('¿Purgar todos los datos de la sesión?')) await api('/api/admin/purge', { method: 'POST' }); }}>
            Purgar sesión
          </button>
        </div>
      </div>
    </div>
  );
}