import { useEffect, useRef, useState } from 'react';
import { useMeStore } from '../store/meStore';
import { useSessionStore } from '../store/sessionStore';
import { useUiStore } from '../store/uiStore';
import { useSocket } from '../hooks/useSocket';
import { useHold } from '../hooks/useHold';
import { useGhostOnHide } from '../hooks/useGhostOnHide';
import { useShake } from '../hooks/useShake';
import { usePerformanceTier } from '../hooks/usePerformanceTier';

const demo = new URLSearchParams(window.location.search).get('demo') === '1';
const lite = new URLSearchParams(window.location.search).get('lite') === '1';

export default function PlayPage() {
  usePerformanceTier();
  const me = useMeStore();
  const session = useSessionStore();
  const tier = useUiStore((s: any) => s.tier);
  const socketRef = useRef<any>(null);
  const [screen, setScreen] = useState<'hold' | 'ask' | 'vote' | 'chosen' | 'pact' | 'offerings' | 'exorcism'>('hold');
  const [chosenWill, setChosenWill] = useState('');
  const [pact, setPact] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [want, setWant] = useState('🍕');
  const [exorcismEnergy, setExorcismEnergy] = useState(0);
  const [exorcismActive, setExorcismActive] = useState(false);
  const [ghost, setGhost] = useState(false);
  const [returning, setReturning] = useState(false);

  const shake = useShake(null);

  const handlers: Record<string, (p: any) => void> = {
    sync: (p) => {
      session.set({ phase: p.phase, hands: p.counts?.hands ?? 0, total: p.counts?.players ?? 0, want: p.want ?? session.want, exorcism: p.exorcism ?? session.exorcism, pact: p.pact ?? session.pact });
      if (p.me) me.setMe(p.me);
    },
    phase: (p) => session.set({ phase: p.phase }),
    hands: (p) => session.set({ hands: p.n, total: p.total }),
    'you:chosen': (p) => { me.setMe({ chosen: true }); setChosenWill(p.willText ?? ''); setScreen('chosen'); },
    'you:ghost': (p) => { setGhost(!!p.on); me.setMe({ ghost: !!p.on }); },
    'pact:offer': (p) => { setPact(p); setScreen('pact'); },
    'pact:penalty': (p) => { setPact((prev: any) => ({ ...prev, penalties: p.n, penaltyText: p.text })); },
    'pact:sealed': (p) => { setPact((prev: any) => ({ ...prev, sealed: true, png: p.png })); },
    'offering:want': (p) => setWant(emojiFor(p.kind)),
    exorcism: (p) => { setExorcismActive(p.active); setExorcismEnergy(p.energy); if (p.active) setScreen('exorcism'); },
    say: (p) => { session.set({ say: p }); },
    kick: () => { me.clear(); window.location.href = '/'; },
  };

  const socketR = useSocket('/play', handlers, demo);
  useEffect(() => { socketRef.current = socketR.current; }, [socketR]);
  const socket = socketRef.current;
  useGhostOnHide(socket);
  const hold = useHold(socket);
  useEffect(() => { me.setMe({ holding: hold.holding }); }, [hold.holding]);

  useEffect(() => {
    if (me.token) {
      // resume join
    }
  }, []);

  // join on mount if token exists? Assume joined already.

  function sendAsk() {
    socket?.emit('ask', { text: question }, (res: any) => {
      if (res?.ok) { setQuestion(''); }
    });
  }

  function sendVote(target: string) {
    if (voteTarget) return;
    setVoteTarget(target);
    socket?.emit('vote', { targetUserId: target });
  }

  function sendOffer(kind: string) {
    socket?.emit('offer', { kind });
  }

  function sendShakeTap() {
    socket?.emit('shake', { force: 12 });
  }

  const tierLow = tier === 'low' || lite;

  return (
    <div className="app">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn ghost" onClick={() => setScreen('hold')}>Hold</button>
        <button className="btn ghost" onClick={() => setScreen('ask')}>Ask</button>
        <button className="btn ghost" onClick={() => setScreen('vote')}>Vote</button>
      </div>

      {screen === 'hold' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--mu)' }}>Poné el dedo sobre el vaso. No lo sueltes.</p>
          <div style={{ margin: '20px auto', width: 170, height: 170, perspective: 600 }}>
            {tierLow ? (
              <div className={'cup-w' + (hold.holding ? ' on' : '')} style={{ width: 170, height: 170, margin: 'auto' }}>
                <div className="glow" />
                <div className="cup" onPointerDown={(e) => { (e.target as any).setPointerCapture?.(e.pointerId); hold.start(); }} onPointerUp={hold.stop} onPointerCancel={hold.stop}>
                  <div className="in" /><div className="hl" />
                  <span>{hold.holding ? 'LATIENDO\n♥' : 'TOCÁ Y\nMANTENÉ'}</span>
                </div>
              </div>
            ) : (
              <CupSceneLazy holding={hold.holding} onStart={hold.start} onStop={hold.stop} />
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--mu)' }}>{hold.holding ? '✋ Sostenés. El espíritu lo siente.' : 'Esperando tu mano...'}</p>
        </div>
      )}

      {screen === 'ask' && (
        <div className="card">
          <h3>Preguntale al espíritu</h3>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Tu pregunta..." maxLength={80}
            style={{ padding: 12, borderRadius: 10, border: '1px solid var(--l)', background: '#000', color: '#fff', width: '100%' }} />
          <button className="btn" style={{ marginTop: 8 }} onClick={sendAsk}>Enviar a la cola</button>
        </div>
      )}

      {screen === 'vote' && (
        <div className="card">
          <h3>¿Quién se va?</h3>
          {players.filter((p) => p.id !== me.id && !p.ghost).map((p) => (
            <button key={p.id} className={'vt' + (voteTarget === p.id ? ' me' : '')} onClick={() => sendVote(p.id)} style={{ width: '100%', marginBottom: 6 }}>
              <span>{p.name}</span>
            </button>
          ))}
          {voteTarget && <p style={{ fontSize: 12, color: 'var(--mu)' }}>Voto enviado.</p>}
        </div>
      )}

      {screen === 'chosen' && (
        <div className="card" style={{ background: '#3a0612', animation: 'sh .15s infinite' }}>
          <div style={{ fontSize: 50 }}>🩸</div>
          <h2>ELEGIDO</h2>
          <b style={{ fontSize: 26 }}>{me.name}</b>
          {chosenWill && <p style={{ fontSize: 11, color: '#ffb3c0' }}>📜 {chosenWill}</p>}
          <button className="btn" style={{ marginTop: 12 }} onClick={() => { setScreen('pact'); }}>Ver pacto</button>
        </div>
      )}

      {screen === 'pact' && pact && (
        <div className="card">
          <h3 style={{ color: 'var(--r)' }}>📝 PACTO 🩸</h3>
          <div style={{ textAlign: 'left', fontSize: 11, lineHeight: 1.35 }}>
            {pact.clauses?.map((c: string, i: number) => (
              <p key={i} style={i === 3 ? { opacity: 0.65, fontSize: 9 } : {}}>{c}</p>
            ))}
          </div>
          {!pact.sealed && (
            <>
              <canvas id="sigCanvas" width={240} height={80} style={{ width: '100%', maxWidth: 240, background: '#000', border: '1px dashed var(--r)', borderRadius: 8, touchAction: 'none', marginTop: 8 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn ghost" onClick={() => {
                  const c = document.getElementById('sigCanvas') as HTMLCanvasElement;
                  c.getContext('2d')?.clearRect(0, 0, 240, 80);
                }}>Borrar</button>
                <button className="btn" onClick={() => {
                  const c = document.getElementById('sigCanvas') as HTMLCanvasElement;
                  const png = c.toDataURL('image/png');
                  socket?.emit('sign:done', { pactId: pact.pactId, png }, (res: any) => { if (res?.ok) setPact((p: any) => ({ ...p, sealed: true, png })); });
                }}>Firmar 🩸</button>
              </div>
              {pact.penaltyText && <p style={{ fontSize: 11, color: '#ffb3c0', marginTop: 8 }}>⚠️ Penalidades: {pact.penalties} · {pact.penaltyText}</p>}
            </>
          )}
          {pact.sealed && (
            <>
              <p style={{ color: '#5dffa8' }}>🩸 FIRMADO. YA NO HAY VUELTA ATRAS.</p>
              <img src={pact.png} alt="firma" style={{ background: '#000', borderRadius: 8, width: '100%', maxWidth: 240 }} />
              <button className="btn" style={{ marginTop: 8 }} onClick={() => {
                const c = document.createElement('canvas'); c.width = 600; c.height = 520;
                drawContract(c, pact.clauses, me.name ?? 'yo', pact.png);
              }}>⬇️ Descargar contrato</button>
            </>
          )}
        </div>
      )}

      {screen === 'offerings' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>🔥 El caldero pide</h3>
          <p style={{ fontSize: 34 }}>{want}</p>
          <p style={{ fontSize: 12, color: 'var(--mu)' }}>Arrastrá hacia arriba o tocá.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {['🍕', '📶', '💔', '🔋'].map((e) => (
              <span key={e} className="ofr" style={{ fontSize: 36, padding: 8, borderRadius: 14, background: 'var(--p)', border: '1px solid var(--l)', cursor: 'grab' }}
                onPointerDown={(ev) => { (ev.target as any).setPointerCapture?.(ev.pointerId); }}
                onPointerUp={() => sendOffer(kindFor(e))}>
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {screen === 'exorcism' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>📳</div>
          <h3>¡EXORCISMO!</h3>
          <p style={{ fontSize: 13, color: 'var(--mu)' }}>Sacudí el celular junto a toda la sala.</p>
          <button className="btn" onClick={async () => { const ok = await shake.start(); if (!ok) alert('Permiso denegado: usá el botón.'); }}>Activar sensor</button>
          <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={sendShakeTap}>👆 Tocar rápido (alternativa)</button>
          <div className="meter" style={{ marginTop: 12 }}><i style={{ width: exorcismEnergy + '%' }} /></div>
          <p style={{ fontSize: 12, color: 'var(--mu)' }}>Energía: {Math.round(exorcismEnergy)}%</p>
        </div>
      )}

      {ghost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'grid', placeItems: 'center', zIndex: 50, backdropFilter: 'blur(2px)' }}>
          <div style={{ fontSize: 40, color: '#fff' }}>VOLVÉ 👁️</div>
        </div>
      )}
    </div>
  );
}

function emojiFor(kind: string) {
  const m: any = { pizza: '🍕', wifi: '📶', ex: '💔', battery: '🔋' };
  return m[kind] ?? '🍕';
}
function kindFor(emoji: string) {
  const m: any = { '🍕': 'pizza', '📶': 'wifi', '💔': 'ex', '🔋': 'battery' };
  return m[emoji] ?? 'pizza';
}

// lazy cup scene
import { lazy, Suspense } from 'react';
const CupSceneLazy = lazy(() => import('../components/play/CupScene'));
function drawContract(canvas: any, clauses: string[], name: string, png: string) {
  // dynamic import
  import('../lib/contractImage').then((m) => m.drawContract(canvas, clauses, name, png));
}