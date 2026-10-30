import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAdminStore } from '../store/adminStore';
import { useSocket } from '../hooks/useSocket';
import { api } from '../lib/api';
import BloodWebs from '../components/ui/BloodWebs';
import { MAX_PARTICIPANTS, RITUAL_MIN_ROOM } from '@sesion/shared';

const demo = new URLSearchParams(window.location.search).get('demo') === '1';

const RITUAL_STEPS = [
  { id: 'hold', label: '1. Mantener' },
  { id: 'questions', label: '2. Preguntas' },
  { id: 'cauldron', label: '3. Caldero' },
  { id: 'pact', label: '4. Pacto' },
];

function secondsLeft(endsAt: number | null | undefined, now: number) {
  if (!endsAt || now <= 0) return null;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

function useClock(active: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

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
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [sayText, setSayText] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<{ at: number; id: string } | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const historyLoadingRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const ritual = admin.state?.ritual;
  const now = useClock(!!(ritual?.holdEndsAt || ritual?.cauldronEndsAt));

  useEffect(() => {
    api('/api/auth/me').then((r) => {
      const ok = !!r?.admin;
      setAuthed(ok);
      if (ok) void loadConversationHistory();
    });
  }, []);

  async function loadConversationHistory(cursor: { at: number; id: string } | null = null) {
    if (historyLoadingRef.current || demo) return;
    historyLoadingRef.current = true;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (cursor) {
        params.set('beforeAt', String(cursor.at));
        params.set('beforeId', cursor.id);
      }
      const result = await api(`/api/admin/conversations?${params.toString()}`);
      if (!result || !Array.isArray(result.items)) {
        throw new Error(result?.error ?? 'No se pudo cargar el historial.');
      }
      admin.mergeConversations(result.items);
      setHistoryHasMore(!!result.hasMore);
      const oldest = result.items[result.items.length - 1];
      setHistoryCursor(oldest ? { at: oldest.at, id: oldest.id } : null);
    } catch (error) {
      console.error('[admin] No se pudo cargar el historial de conversaciones', error);
      setHistoryError('No se pudo cargar el historial. Revisá la conexión e intentá de nuevo.');
    } finally {
      historyLoadingRef.current = false;
      setHistoryLoading(false);
    }
  }

  const handlers: Record<string, (p: any) => void> = {
    'admin:state': (p) => {
      admin.setState(p);
      if (!p.total) setMockActive(false);
    },
    'admin:prompt': (p) => admin.addAiReply(p),
    'admin:question': (p) => admin.addQuestion(p),
    'admin:log': (p) => admin.addLog(p),
  };
  const socketR = useSocket('/admin', handlers, demo);

  const s = admin.state;
  const conversationGroups = admin.conversations.reduce((groups: any[], item: any) => {
    const date = new Date(item.at);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = {
        key,
        label: date.toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
    return groups;
  }, []);
  const aiStatus = s?.ai?.providerStatus === 'unconfigured'
    ? { label: 'IA sin API key', color: '#ff6b6b' }
    : s?.ai?.providerStatus === 'disabled'
      ? { label: 'IA deshabilitada', color: '#ff6b6b' }
      : s?.ai?.fallbackForced || s?.ai?.providerStatus === 'fallback'
        ? { label: 'Usando respuestas de respaldo', color: '#ffb454' }
        : s?.ai?.breakerOpen || s?.ai?.providerStatus === 'error'
      ? { label: 'IA desconectada · usando fallback', color: '#ff6b6b' }
      : s?.ai?.providerStatus === 'connected'
        ? { label: 'IA conectada', color: '#5dffa8' }
        : s?.ai?.providerStatus === 'checking'
          ? { label: 'Conectando IA…', color: '#ffd166' }
          : { label: 'IA sin verificar', color: '#ffd166' };

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

  function resetFlow() {
    if (resetting || !window.confirm('Se va a cerrar la conexión de todos y borrar el estado actual del rito. ¿Querés reiniciar la sesión?')) return;
    setResetting(true);
    setResetMessage('');
    cmd('dir:reset', {}, (result: any) => {
      setResetting(false);
      setResetMessage(result?.ok ? 'Sesión reiniciada. Ya pueden volver a entrar.' : 'No se pudo reiniciar la sesión. Intentá de nuevo.');
    });
  }

  return (
    <div ref={containerRef} className="app" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      <BloodWebs />
      <div style={{ marginBottom: 12 }}>
        <button className="btn" onClick={() => cmd('dir:mock', {}, (r: any) => setMockActive(!!r?.active))}>{mockActive ? 'Vaciar almas de prueba' : 'Llenar la sala con 10 almas'}</button>
        <button className="btn danger" style={{ marginLeft: 8 }} disabled={resetting} onClick={resetFlow}>
          {resetting ? 'Reiniciando…' : 'Reiniciar flujo y desconectar a todos'}
        </button>
        {resetMessage && <span role="status" style={{ marginLeft: 10, color: 'var(--mu)', fontSize: 12 }}>{resetMessage}</span>}
      </div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 className="title" style={{ fontSize: 36, margin: 0 }}>Director de Sesión</h1>
          <p style={{ color: 'var(--mu)', fontSize: 13, margin: '2px 0 0' }}>El rito avanza solo. Desde acá ves la sala, adelantás el corte o lo volvés a empezar.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            role="status"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 99, border: `1px solid ${aiStatus.color}55`, background: `${aiStatus.color}12`, color: aiStatus.color, fontSize: 12, fontWeight: 700 }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: aiStatus.color, boxShadow: `0 0 10px ${aiStatus.color}` }} />
            {aiStatus.label}
          </div>
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
          <b style={{ fontSize: 20, color: 'var(--a)' }}>{RITUAL_STEPS.find((step) => step.id === s.ritual?.stage)?.label ?? 'Mantener'}</b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Etapa del rito</div>
        </div>
        <div className="card admin-kpi" style={{ padding: '14px 18px' }}>
          <b style={{ fontSize: 20, color: '#ffd6a5' }}>{s.mood}</b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Humor</div>
        </div>
        <div className="card admin-kpi" style={{ padding: '14px 18px' }}>
          <b style={{ fontSize: 22, color: '#ffb3c0' }}>{s.ritual?.alive ?? 0}</b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Almas en el rito</div>
        </div>
        <div className="card admin-kpi" style={{ padding: '14px 18px' }}>
          <b style={{ fontSize: 18, color: s.ai?.breakerOpen ? 'var(--r)' : '#5dffa8' }}>
            {s.ai?.breakerOpen ? 'BREAKER' : s.ai?.fallbackForced ? 'FALLBACK' : 'ACTIVO'}
          </b>
          <div style={{ fontSize: 12, color: 'var(--mu)', marginTop: 2 }}>Gemini IA</div>
        </div>
      </div>

      <div className="card card-highlight" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>El rito</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn danger"
              style={{ fontSize: 13, padding: '8px 14px' }}
              disabled={s.ritual?.stage === 'pact' || (s.ritual?.stage !== 'questions' && s.ritual?.stage !== 'cauldron' && (s.ritual?.waiting ?? 1) > 0)}
              onClick={() => cmd('dir:ritualCut')}
            >
              {s.ritual?.stage === 'questions' ? 'Cortar a los impuros' : s.ritual?.stage === 'cauldron' ? 'Cerrar el caldero' : s.ritual?.stage === 'pact' ? 'Pacto abierto' : 'Juzgar ahora'}
            </button>
            <button className="btn ghost" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => cmd('dir:ritualReset')}>
              Reiniciar el rito
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 14 }}>
          {RITUAL_STEPS.map((step) => {
            const active = (s.ritual?.stage ?? 'hold') === step.id;
            return (
              <div key={step.id} style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${active ? 'var(--r)' : 'var(--l)'}`, background: active ? 'rgba(120,16,28,0.35)' : 'transparent', fontWeight: 700, fontSize: 13 }}>
                {step.label}
              </div>
            );
          })}
        </div>
        {(s.ritual?.stage ?? 'hold') === 'hold' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--mu)' }}>Almas para empezar</span>
            <button className="btn ghost" style={{ padding: '4px 12px' }} disabled={(s.ritual?.roomSize ?? MAX_PARTICIPANTS) <= RITUAL_MIN_ROOM} onClick={() => cmd('dir:roomSize', { size: (s.ritual?.roomSize ?? MAX_PARTICIPANTS) - 1 })}>−</button>
            <b style={{ minWidth: 24, textAlign: 'center' }}>{s.ritual?.roomSize ?? MAX_PARTICIPANTS}</b>
            <button className="btn ghost" style={{ padding: '4px 12px' }} disabled={(s.ritual?.roomSize ?? MAX_PARTICIPANTS) >= MAX_PARTICIPANTS} onClick={() => cmd('dir:roomSize', { size: (s.ritual?.roomSize ?? MAX_PARTICIPANTS) + 1 })}>+</button>
          </div>
        )}
        <RitualDetail ritual={s.ritual} users={s.users ?? []} now={now} />
      </div>

      {/* DIRECTOR ACTIONS & SAY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Quick Narrative Actions */}
        <div className="card">
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Dirección</h3>
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
          <div style={{ marginTop: 16, borderTop: '1px solid var(--l)', paddingTop: 12 }}>
            <b style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
              Historial de mensajes y respuestas ({admin.conversations.length})
            </b>
            <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {conversationGroups.map((group: any) => (
                <section key={group.key}>
                  <h4 style={{ position: 'sticky', top: 0, zIndex: 1, margin: '0 0 8px', padding: '7px 10px', background: '#100b18', borderBottom: '1px solid var(--l)', color: 'var(--a)', fontSize: 12, textTransform: 'capitalize' }}>
                    {group.label}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.items.map((item: any) => (
                      <article key={item.id} style={{ padding: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--l)', borderRadius: 8, fontSize: 13 }}>
                        <small style={{ color: 'var(--mu)' }}>
                          {new Date(item.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </small>
                        <div style={{ marginTop: 3 }}><b>{item.name} preguntó:</b> {item.text}</div>
                        <div style={{ marginTop: 6, color: item.answer ? 'var(--tx)' : 'var(--mu)' }}>
                          <b>Espíritu:</b> {item.answer ?? 'Esperando respuesta…'}
                        </div>
                        {item.answer && (
                          <small style={{ display: 'block', marginTop: 5, color: item.fallback ? '#ffb454' : '#5dffa8' }}>
                            {item.fallback ? 'Respuesta de respaldo' : 'Respuesta de IA'}{item.latencyMs != null ? ` · ${item.latencyMs} ms` : ''}
                          </small>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
              {admin.conversations.length === 0 && !historyLoading && (
                <p style={{ color: 'var(--mu)', fontSize: 12 }}>
                  {historyError || 'Todavía no llegaron mensajes de participantes.'}
                </p>
              )}
            </div>
            {historyError && admin.conversations.length > 0 && (
              <p role="alert" style={{ color: '#ffb454', fontSize: 12 }}>{historyError}</p>
            )}
            {historyHasMore && (
              <button
                className="btn ghost"
                style={{ width: '100%', marginTop: 10, fontSize: 12 }}
                disabled={historyLoading}
                onClick={() => void loadConversationHistory(historyCursor)}
              >
                {historyLoading ? 'Cargando historial…' : 'Cargar mensajes anteriores'}
              </button>
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
                    {u.eliminated ? `Condenado · ${u.eliminationLine ?? 'el círculo lo entregó'}` : u.ghost ? 'Fantasma' : u.holding ? 'No suelta' : u.hidden ? 'Oculto' : 'En el círculo'}
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

      {/* Collapsible provider prompt and diagnostics */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15 }}>🤖 Diagnóstico de IA · DeepSeek</h3>
            <span style={{ fontSize: 12, color: 'var(--mu)' }}>
              {s.ai?.breakerOpen ? '⚠️ Breaker activado (fallbacks activos)' : 'Estado del proveedor DeepSeek'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => cmd('dir:aiToggle', { on: !s.ai?.fallbackForced })}>
              {s.ai?.fallbackForced ? 'Reactivar IA' : 'Forzar Fallbacks'}
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

function RitualDetail({ ritual, users, now }: { ritual: any; users: any[]; now: number }) {
  const stage = ritual?.stage ?? 'hold';
  const waiting = ritual?.waiting ?? 0;
  const holdLeft = secondsLeft(ritual?.holdEndsAt, now);
  const cauldronLeft = secondsLeft(ritual?.cauldronEndsAt, now);
  const dead = users.filter((user) => user.eliminated);
  const scores = ritual?.scores ?? [];
  const maxScore = Math.max(1, ...scores.map((row: any) => row.score ?? 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
      {stage === 'hold' && (
        <p style={{ margin: 0 }}>
          {waiting > 0
            ? `Faltan ${waiting} ${waiting === 1 ? 'alma' : 'almas'}. El juicio cae solo unos 20 segundos después de cerrar la sala.`
            : `La sala está cerrada. ${holdLeft == null ? 'El círculo está por juzgar.' : `El juicio cae en ${holdLeft}s.`}`}
        </p>
      )}
      {stage === 'questions' && (
        <p style={{ margin: 0 }}>Las que quedaron hablan. La respuesta se escribe en la mesa antes de llegar al celular. Después el círculo escupe a las que no alcanzan.</p>
      )}
      {stage === 'cauldron' && (
        <p style={{ margin: 0 }}>
          Quedan dos. {cauldronLeft == null ? 'El caldero está abierto.' : `Se cierra en ${cauldronLeft}s.`} Quien ofrende menos se queda adentro.
        </p>
      )}
      {stage === 'pact' && (
        <p style={{ margin: 0, color: '#5dffa8', fontWeight: 700 }}>
          {ritual?.pureName ?? 'Alguien'}, el abismo lo reconoce
        </p>
      )}
      {ritual?.verdict?.names?.length > 0 && (
        <p style={{ margin: 0, color: '#ffb3c0' }}>{ritual.verdict.names.join(', ')}. {ritual.verdict.line}</p>
      )}
      {stage === 'hold' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(ritual?.holders ?? []).map((soul: any) => (
            <span key={soul.id} style={{ padding: '4px 10px', borderRadius: 99, border: '1px solid var(--l)', color: soul.holding ? '#ffb3c0' : 'var(--mu)' }}>
              {soul.name} · {soul.holding ? 'no suelta' : 'tiembla'}
            </span>
          ))}
        </div>
      )}
      {stage === 'cauldron' && scores.map((row: any) => (
        <div key={row.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <b>{row.name}</b>
            <span>{row.score}</span>
          </div>
          <div className="meter" style={{ height: 8 }}>
            <i style={{ width: `${(row.score / maxScore) * 100}%` }} />
          </div>
        </div>
      ))}
      {dead.length > 0 && (
        <p style={{ margin: 0, color: 'var(--mu)' }}>Eliminados: {dead.map((user) => user.name).join(', ')}</p>
      )}
    </div>
  );
}