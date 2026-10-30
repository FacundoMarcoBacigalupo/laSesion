import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useMeStore } from '../store/meStore';
import { useSessionStore } from '../store/sessionStore';
import { useSocket } from '../hooks/useSocket';
import { useHold } from '../hooks/useHold';
import { useGhostOnHide } from '../hooks/useGhostOnHide';
import { useShake } from '../hooks/useShake';
import { usePerformanceTier } from '../hooks/usePerformanceTier';
import { vibrate } from '../lib/haptics';
import { sfx, setHandsLevel } from '../lib/audio';
import { MAX_PARTICIPANTS } from '@sesion/shared';
import CupScene from '../components/play/CupScene';
import { Battery, Flame, HeartCrack, Pizza, Radio } from 'lucide-react';

const demo = new URLSearchParams(window.location.search).get('demo') === '1';
const debugHands = new URLSearchParams(window.location.search).get('debugHands') === '1';

function drawContract(canvas: any, clauses: string[], name: string, png: string) {
  import('../lib/contractImage').then((m) => m.drawContract(canvas, clauses, name, png));
}

function emojiFor(kind: string) {
  const m: Record<string, string> = { pizza: 'ALIMENTO', wifi: 'SEÑAL', ex: 'VÍNCULO', battery: 'RESERVA' };
  return m[kind] ?? 'ALIMENTO';
}

function kindFor(emoji: string) {
  const m: Record<string, string> = { ALIMENTO: 'pizza', SEÑAL: 'wifi', VÍNCULO: 'ex', RESERVA: 'battery' };
  return m[emoji] ?? 'pizza';
}

const offerings = [
  { kind: 'pizza', label: 'Alimento', Icon: Pizza },
  { kind: 'wifi', label: 'Señal', Icon: Radio },
  { kind: 'ex', label: 'Vínculo', Icon: HeartCrack },
  { kind: 'battery', label: 'Reserva', Icon: Battery },
];

export default function PlayPage() {
  usePerformanceTier();
  const me = useMeStore();
  const session = useSessionStore();
  const socketRef = useRef<any>(null);

  const [screen, setScreen] = useState<'hold' | 'ask' | 'vote' | 'chosen' | 'pact' | 'offerings' | 'exorcism' | 'pacto'>('hold');
  const [chosenWill, setChosenWill] = useState('');
  const [pact, setPact] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [questionSent, setQuestionSent] = useState(false);
  const [answerModal, setAnswerModal] = useState<{ question: string; text?: string } | null>(null);
  const pendingQuestionRef = useRef('');
  const vibrationRef = useRef<number | null>(null);
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [want, setWant] = useState('ALIMENTO');
  const [exorcismEnergy, setExorcismEnergy] = useState(0);
  const [exorcismActive, setExorcismActive] = useState(false);
  const [ghost, setGhost] = useState(false);

  const [pactoName, setPactoName] = useState(() => localStorage.getItem('pactoName') || me.name || '');
  const [pactoSigned, setPactoSigned] = useState(() => localStorage.getItem('pactoSigned') === '1');
  const [pactoSignature, setPactoSignature] = useState(() => localStorage.getItem('pactoSignature') || '');
  const pactoCanvasRef = useRef<HTMLCanvasElement>(null);
  const pactoDrawingRef = useRef(false);
  const pactoLastRef = useRef<[number, number] | null>(null);
  useEffect(() => { if (!pactoName && me.name) setPactoName(me.name); }, [me.name]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = pactoCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.strokeStyle = '#ffb3c0'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  }, []);

  function pactoStart(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = pactoCanvasRef.current!;
    const ctx = c.getContext('2d')!;
    ctx.strokeStyle = '#ffb3c0'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    pactoDrawingRef.current = true;
    c.setPointerCapture(e.pointerId);
    pactoLastRef.current = [e.nativeEvent.offsetX, e.nativeEvent.offsetY];
  }
  function pactoMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!pactoDrawingRef.current || !pactoLastRef.current) return;
    const c = pactoCanvasRef.current!;
    const ctx = c.getContext('2d')!;
    const [lx, ly] = pactoLastRef.current;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.stroke();
    pactoLastRef.current = [e.nativeEvent.offsetX, e.nativeEvent.offsetY];
  }
  function pactoStop() { pactoDrawingRef.current = false; pactoLastRef.current = null; }
  function pactoClear() {
    const c = pactoCanvasRef.current!;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
  }
  function pactoSign() {
    const c = pactoCanvasRef.current!;
    const png = c.toDataURL('image/png');
    localStorage.setItem('pactoSigned', '1');
    localStorage.setItem('pactoName', pactoName.trim() || 'Invitado');
    localStorage.setItem('pactoSignature', png);
    setPactoSignature(png);
    setPactoSigned(true);
    socketRef.current?.emit('pact:standalone', { png, name: pactoName.trim() || 'Invitado' });
  }
  function pactoDownload() {
    const c = document.createElement('canvas');
    c.width = 600; c.height = 520;
    drawContract(c, ['Acepto caminar en la oscuridad cuando el espíritu lo reclame.', 'Entrego mi nombre y mi firma al círculo.', 'No romperé el pacto sellado en sangre digital.', 'Acepto las penalidades que el espíritu imponga.'], pactoName.trim() || 'Invitado', pactoSignature || localStorage.getItem('pactoSignature') || '');
  }
  function pactoReset() {
    localStorage.removeItem('pactoSigned'); localStorage.removeItem('pactoName'); localStorage.removeItem('pactoSignature');
    setPactoSigned(false); setPactoSignature(''); pactoClear();
  }
  const panelRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exorcismOnRef = useRef(false);

  const shake = useShake(null);

  const handlers: Record<string, (p: any) => void> = {
    sync: (p) => {
      session.set({
        phase: p.phase,
        hands: p.counts?.hands ?? 0,
        total: p.counts?.players ?? 0,
        want: p.want ?? session.want,
        exorcism: p.exorcism ?? session.exorcism,
        pact: p.pact ?? session.pact
      });
      if (p.me) me.setMe(p.me);
      if (p.users) setPlayers(p.users);
      if (p.players) setPlayers(p.players);
      if (p.phase === 'VOTING' && screen === 'hold') setScreen('vote');
      if (p.phase === 'EXORCISM' && !screen.includes('exorcism')) setScreen('exorcism');
    },
    phase: (p) => {
      session.set({ phase: p.phase });
      if (p.phase === 'VOTING' && screen !== 'chosen' && screen !== 'pact') {
        setScreen('vote');
      } else if (p.phase === 'SESSION' && screen === 'vote') {
        setScreen('hold');
      }
    },
    hands: (p) => session.set({ hands: p.n, total: p.total }),
    players: (p) => setPlayers(p.users ?? p ?? []),
    'debug:hands:state': (p) => {
      if (!debugHands) return;
      console.info(`[La Sesión] Manos en el vaso: ${p.hands}/${p.total}`);
      console.table(p.holding);
    },
    'you:chosen': (p) => {
      me.setMe({ chosen: true });
      setChosenWill(p.willText ?? '');
      setScreen('chosen');
      sfx.chosen();
    },
    'you:ghost': (p) => {
      setGhost(!!p.on);
      me.setMe({ ghost: !!p.on });
      if (p.on) sfx.ghost();
    },
    'pact:offer': (p) => {
      setPact(p);
      setScreen('pact');
      sfx.scroll();
    },
    'pact:penalty': (p) => {
      setPact((prev: any) => ({ ...prev, penalties: p.n, penaltyText: p.text }));
    },
    'pact:sealed': (p) => {
      setPact((prev: any) => ({ ...prev, sealed: true, png: p.png }));
    },
    'offering:want': (p) => setWant(emojiFor(p.kind)),
    exorcism: (p) => {
      setExorcismActive(p.active);
      setExorcismEnergy(p.energy);
      if (p.active) setScreen('exorcism');
      if (p.active && !exorcismOnRef.current) sfx.exorcism();
      exorcismOnRef.current = !!p.active;
    },
    say: (p) => {
      session.set({ say: p });
      if (p.question && p.question === pendingQuestionRef.current) {
        setAnswerModal({ question: p.question, text: p.text });
      }
    },
    kick: () => {
      me.clear();
      window.location.href = '/';
    },
  };

  const socketR = useSocket('/play', handlers, demo);
  useEffect(() => {
    if (!debugHands || demo) return;
    const socket = socketR.current;
    if (!socket) return;
    const subscribe = () => socket.emit('debug:hands:subscribe');
    socket.on('connect', subscribe);
    if (socket.connected) subscribe();
    return () => { socket.off('connect', subscribe); };
  }, [socketR]);

  useEffect(() => {
    socketRef.current = socketR.current;
  }, [socketR]);
  useGhostOnHide(socketRef);
  const hold = useHold(socketRef);
  useEffect(() => {
    me.setMe({ holding: hold.holding });
  }, [hold.holding]);

  useEffect(() => {
    if (!answerModal) return;
    // Repite la vibración mientras el mensaje está abierto; algunos
    // navegadores requieren interacción previa y pueden ignorarla.
    const pulse = () => vibrate([180, 70, 180, 70, 420]);
    pulse();
    vibrationRef.current = window.setInterval(pulse, 1100);
    return () => {
      if (vibrationRef.current !== null) window.clearInterval(vibrationRef.current);
      vibrationRef.current = null;
      if (navigator.vibrate) navigator.vibrate(0);
    };
  }, [answerModal]);

  useEffect(() => {
    setHandsLevel(session.hands, MAX_PARTICIPANTS);
  }, [session.hands]);

  useEffect(() => {
    if (!hold.holding) return;
    sfx.heartbeat();
    const id = window.setInterval(sfx.heartbeat, 900);
    return () => window.clearInterval(id);
  }, [hold.holding]);

  // Screen transition animation with GSAP
  useGSAP(() => {
    if (panelRef.current) {
      gsap.fromTo(panelRef.current,
        { autoAlpha: 0, y: 16, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'power2.out' }
      );
    }
    gsap.from('.screen-panel > *', {
      opacity: 0,
      y: 10,
      duration: 0.42,
      stagger: 0.045,
      ease: 'power2.out',
      clearProps: 'transform',
    });
  }, { scope: containerRef, dependencies: [screen] });

  // Exorcism meter animation with GSAP
  useGSAP(() => {
    if (screen === 'exorcism') {
      gsap.to('.exorcism-fill', {
        width: `${Math.min(100, Math.max(0, exorcismEnergy))}%`,
        duration: 0.3,
        ease: 'power1.out',
      });
    }
    if (screen === 'exorcism') {
      gsap.to('.screen-panel', { '--ritual-intensity': Math.min(1, exorcismEnergy / 100), duration: 0.35, ease: 'power2.out' });
    }
  }, { scope: containerRef, dependencies: [exorcismEnergy, screen] });

  // Ambient movement gives the séance a living, uneasy presence without touching layout.
  useGSAP(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const ambient = gsap.timeline({ repeat: -1, yoyo: true });
    ambient.to('.screen-panel', { y: -3, rotation: 0.18, duration: 3.8, stagger: 0.18, ease: 'sine.inOut' });
    gsap.to('.nav-tab.active', { boxShadow: '0 0 24px rgba(155, 25, 39, .42)', duration: 1.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    return () => ambient.kill();
  }, { scope: containerRef, dependencies: [screen] });

  function sendAsk() {
    if (!question.trim()) return;
    const text = question.trim();
    pendingQuestionRef.current = text;
    setAnswerModal({ question: text });
    vibrate([220, 60, 220, 60, 500]);
    socketRef.current?.emit('ask', { text }, (res: any) => {
      if (res?.ok) {
        setQuestion('');
        setQuestionSent(true);
        sfx.whisper();
        setTimeout(() => setQuestionSent(false), 3000);
      } else {
        // El modal debe permanecer visible para explicar el error, nunca
        // desaparecer silenciosamente antes de que el jugador pueda verlo.
        setAnswerModal({ question: text, text: `El más allá rechazó la pregunta (${res?.error ?? 'sin conexión'}).` });
      }
    });
  }

  function sendVote(target: string) {
    if (voteTarget) return;
    setVoteTarget(target);
    sfx.vote();
    socketRef.current?.emit('vote', { targetUserId: target });
  }

  function sendOffer(kind: string) {
    sfx.fire();
    socketRef.current?.emit('offer', { kind });
  }

  function sendShakeTap() {
    vibrate([35, 25, 55]);
    sfx.hit();
    gsap.fromTo('.exorcism-fill', { filter: 'brightness(1.8)' }, { filter: 'brightness(1)', duration: 0.25 });
    socketRef.current?.emit('shake', { force: 12 });
  }

  // Signature canvas drawing functions
  function startDrawing(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.strokeStyle = '#ff3b5c';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function drawStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = e.currentTarget;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
  }

  function stopDrawing() {
    isDrawingRef.current = false;
  }

  function clearSignature() {
    const c = canvasRef.current;
    if (c) {
      c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    }
    sfx.swish();
  }

  function submitSignature() {
    const c = canvasRef.current;
    if (!c || !pact) return;
    const png = c.toDataURL('image/png');
    socketRef.current?.emit('sign:done', { pactId: pact.pactId, png }, (res: any) => {
      if (res?.ok) {
        setPact((p: any) => ({ ...p, sealed: true, png }));
        sfx.seal();
      }
    });
  }

  const showVoteTab = session.phase === 'VOTING' || players.length > 0;

  return (
    <div ref={containerRef} className="app" style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
      {/* Session header status */}
      <div className="session-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="sigil" aria-hidden="true">I</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
              {me.name || 'Iniciado'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--mu)' }}>
              Fase: <span style={{ color: 'var(--a)', fontWeight: 600 }}>{session.phase}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', padding: '5px 12px', borderRadius: 99, border: '1px solid var(--l)' }}>
          <span className="status-mark" aria-hidden="true" />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: hold.holding ? '#5dffa8' : 'var(--mu)' }}>
            {session.hands}/{session.total}
          </span>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
        <nav className="nav-tabs" style={{ width: '100%', justifyContent: 'center' }}>
          <button 
            id="tabHold"
            className={`nav-tab ${screen === 'hold' ? 'active' : ''}`} 
            onClick={() => setScreen('hold')}
          >
            Sostener
          </button>
          <button 
            id="tabAsk"
            className={`nav-tab ${screen === 'ask' ? 'active' : ''}`} 
            onClick={() => setScreen('ask')}
          >
            Preguntar
          </button>
          {showVoteTab && (
            <button 
              id="tabVote"
              className={`nav-tab ${screen === 'vote' ? 'active' : ''}`} 
              onClick={() => setScreen('vote')}
              style={session.phase === 'VOTING' ? { borderColor: 'rgba(255,59,92,0.4)', color: '#ffb3c0' } : {}}
            >
              Votar
            </button>
          )}
          {session.want && (
            <button 
              id="tabOfferings"
              className={`nav-tab ${screen === 'offerings' ? 'active' : ''}`} 
              onClick={() => setScreen('offerings')}
            >
              Ofrendas
            </button>
          )}
          <button
            id="tabPacto"
            className={`nav-tab ${screen === 'pacto' ? 'active' : ''}`}
            onClick={() => setScreen('pacto')}
          >
            Pacto
          </button>
        </nav>
      </div>

      {screen === 'pacto' && (
        <div className="card screen-panel" style={{ border: '1px solid rgba(255,59,92,0.3)' }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--r)' }}>PACTO CON EL ESPÍRITU</h3>
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: 14, borderRadius: 12, border: '1px solid var(--l)', fontSize: 12, lineHeight: 1.5, textAlign: 'left', marginBottom: 14, marginTop: 12 }}>
            {['Acepto caminar en la oscuridad cuando el espíritu lo reclame.', 'Entrego mi nombre y mi firma al círculo.', 'No romperé el pacto sellado en sangre digital.', 'Acepto las penalidades que el espíritu imponga.'].map((c, i) => (
              <p key={i} style={{ marginBottom: 6 }}>{i + 1}. {c}</p>
            ))}
          </div>
          {!pactoSigned && (
            <>
              <input className="input-dark" value={pactoName} disabled style={{ width: '100%', marginBottom: 12, opacity: 0.8 }} />
              <canvas ref={pactoCanvasRef} width={320} height={100} onPointerDown={pactoStart} onPointerMove={pactoMove} onPointerUp={pactoStop} onPointerCancel={pactoStop} style={{ width: '100%', height: 100, background: '#050308', border: '1.5px dashed var(--r)', borderRadius: 10, touchAction: 'none', display: 'block', cursor: 'crosshair' }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={pactoClear}>Borrar</button>
                <button className="btn danger" style={{ flex: 2 }} onClick={pactoSign}>Firmar en sangre</button>
              </div>
            </>
          )}
          {pactoSigned && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#5dffa8', fontWeight: 700, marginBottom: 10 }}>PACTO SELLADO. YA NO HAY SALVACIÓN.</p>
              {pactoSignature && <img src={pactoSignature} alt="firma" style={{ background: '#000', borderRadius: 8, width: '100%', maxWidth: 260, border: '1px solid var(--l)', display: 'block', margin: '0 auto 12px' }} />}
              <button className="btn" style={{ width: '100%' }} onClick={pactoDownload}>Descargar el pacto</button>
              <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={pactoReset}>Firmar de nuevo</button>
            </div>
          )}
        </div>
      )}

      {/* HOLD SCREEN */}
      {screen === 'hold' && (
        <div ref={panelRef} className="card screen-panel" style={{ textAlign: 'center' }}>
          <p className="spirit-text" style={{ fontSize: '1.15rem', color: hold.holding ? '#fff' : 'var(--mu)', marginBottom: 4 }}>
            {hold.holding ? '«Tu energía fluye con el vaso...»' : 'Apoyá tu dedo sobre el vaso sin soltar'}
          </p>

          <div className="cup-stage" style={{ margin: '20px auto', width: 220, height: 220, perspective: 600, display: 'grid', placeItems: 'center' }}>
            <CupScene holding={hold.holding} onStart={() => { vibrate(28); sfx.hold(); hold.start(); }} onStop={() => { sfx.release(); hold.stop(); }} />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, background: hold.holding ? 'rgba(93,255,168,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${hold.holding ? 'rgba(93,255,168,0.3)' : 'var(--l)'}` }}>
            <span style={{ fontSize: 13, color: hold.holding ? '#5dffa8' : 'var(--mu)', fontWeight: 600 }}>
              {hold.holding ? 'Sostenés firmemente. El espíritu te escucha.' : 'Esperando tu contacto con la mesa...'}
            </span>
          </div>
        </div>
      )}

      {/* ASK SCREEN */}
      {screen === 'ask' && (
        <div ref={panelRef} className="card screen-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Preguntale al espíritu</h3>
          </div>
          <p style={{ color: 'var(--mu)', fontSize: 13, marginBottom: 16 }}>
            Las preguntas entran a la cola y el espíritu deletreará las respuestas en el tablero común.
          </p>

          <input 
            className="input-dark" 
            value={question} 
            onChange={(e) => setQuestion(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter') sendAsk(); }}
            placeholder="¿Hay alguien aquí? ¿Quién morirá primero?..." 
            maxLength={80} 
          />

          <button className="btn" style={{ marginTop: 12, width: '100%' }} onClick={sendAsk}>
            Enviar al más allá
          </button>

          {questionSent && (
            <p style={{ color: '#5dffa8', marginTop: 12, fontSize: 13, textAlign: 'center' }}>
              ✓ Pregunta entregada a la niebla espectral
            </p>
          )}
        </div>
      )}

      {/* VOTE SCREEN */}
      {screen === 'vote' && (
        <div ref={panelRef} className="card screen-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--r)' }}>El sacrificio del círculo</h3>
          </div>
          <p style={{ color: 'var(--mu)', fontSize: 13, marginBottom: 16 }}>
            El espíritu exige una ofrenda humana. Votá quién debe firmar el pacto:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.filter((p) => p.id !== me.id && !p.ghost).map((p) => (
              <button 
                key={p.id} 
                className={'vt' + (voteTarget === p.id ? ' me' : '')} 
                onClick={() => sendVote(p.id)}
              >
                <span>{p.name}</span>
                {voteTarget === p.id && <span style={{ color: 'var(--r)', fontSize: 13 }}>Votado</span>}
              </button>
            ))}
            {players.filter((p) => p.id !== me.id && !p.ghost).length === 0 && (
              <p style={{ color: 'var(--mu)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                Esperando a que más participantes ingresen al círculo...
              </p>
            )}
          </div>

          {voteTarget && (
            <p style={{ fontSize: 13, color: '#ffb3c0', marginTop: 14, textAlign: 'center', background: 'rgba(255,59,92,0.1)', padding: '8px', borderRadius: 8 }}>
              Tu voto fue entregado al tablero.
            </p>
          )}
        </div>
      )}

      {/* CHOSEN SCREEN */}
      {screen === 'chosen' && (
        <div ref={panelRef} className="card screen-panel" style={{ background: 'linear-gradient(180deg, #420816 0%, #1f040b 100%)', border: '1px solid rgba(255,59,92,0.4)', textAlign: 'center', animation: 'sh .25s infinite' }}>
          <h2 style={{ color: '#fff', fontSize: 26, letterSpacing: '0.05em', textShadow: '0 0 20px rgba(255,59,92,0.8)' }}>
            HAS SIDO ELEGIDO
          </h2>
          <b style={{ fontSize: 28, color: '#ff7a90', display: 'block', margin: '8px 0' }}>{me.name}</b>
          <p style={{ color: '#ffd6de', fontSize: 14, margin: '8px auto', maxWidth: 320 }}>
            El círculo ha decidido. El espíritu reclama tu firma para continuar.
          </p>
          {chosenWill && (
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px 16px', borderRadius: 10, margin: '14px 0', border: '1px dashed var(--r)' }}>
              <p style={{ fontSize: 12.5, color: '#ffb3c0', fontStyle: 'italic', margin: 0 }}>«{chosenWill}»</p>
            </div>
          )}
          <button className="btn danger" style={{ marginTop: 12, width: '100%', fontSize: 16 }} onClick={() => setScreen('pact')}>
            Ver y firmar el pacto
          </button>
        </div>
      )}

      {/* PACT SCREEN */}
      {screen === 'pact' && pact && (
        <div ref={panelRef} className="card screen-panel" style={{ border: '1px solid rgba(255,59,92,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--r)' }}>PACTO CON EL MÁS ALLÁ</h3>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.6)', padding: 14, borderRadius: 12, border: '1px solid var(--l)', fontSize: 12, lineHeight: 1.5, textAlign: 'left', marginBottom: 14 }}>
            {pact.clauses?.map((c: string, i: number) => (
              <p key={i} style={{ marginBottom: 6, opacity: i === 3 ? 0.7 : 1 }}>
                {i + 1}. {c}
              </p>
            ))}
          </div>

          {!pact.sealed && (
            <div>
              <p style={{ fontSize: 12.5, color: 'var(--mu)', marginBottom: 8, textAlign: 'left' }}>
                Dibujá tu firma con sangre en el recuadro:
              </p>
              <canvas
                ref={canvasRef}
                id="sigCanvas"
                width={320}
                height={100}
                onPointerDown={startDrawing}
                onPointerMove={drawStroke}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                style={{ width: '100%', height: 100, background: '#050308', border: '1.5px dashed var(--r)', borderRadius: 10, touchAction: 'none', display: 'block', cursor: 'crosshair' }}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={clearSignature}>
                  Borrar
                </button>
                <button className="btn danger" style={{ flex: 2 }} onClick={submitSignature}>
                  Firmar en sangre
                </button>
              </div>

              {pact.penaltyText && (
                <p style={{ fontSize: 12, color: '#ffb3c0', marginTop: 10 }}>
                   Penalidades ({pact.penalties}): {pact.penaltyText}
                </p>
              )}
            </div>
          )}

          {pact.sealed && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#5dffa8', fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
                PACTO SELLADO. YA NO HAY SALVACIÓN.
              </div>
              <img src={pact.png} alt="firma" style={{ background: '#000', borderRadius: 8, width: '100%', maxWidth: 260, border: '1px solid var(--l)', display: 'block', margin: '0 auto 12px' }} />
              <button 
                className="btn" 
                style={{ width: '100%' }}
                onClick={() => {
                  const c = document.createElement('canvas');
                  c.width = 600; c.height = 520;
                  drawContract(c, pact.clauses, me.name ?? 'yo', pact.png);
                }}
              >
                 Descargar contrato sellado
              </button>
            </div>
          )}
        </div>
      )}

      {/* OFFERINGS SCREEN */}
      {screen === 'offerings' && (
        <div ref={panelRef} className="card screen-panel" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>El caldero solicita</h3>
           <div className="offering-current" aria-label={`Ofrenda solicitada: ${want}`}>
             {offerings.find((offering) => offering.label.toUpperCase() === want)?.Icon && (() => {
               const Icon = offerings.find((offering) => offering.label.toUpperCase() === want)!.Icon;
               return <Icon size={52} strokeWidth={1.25} aria-hidden="true" />;
             })()}
           </div>
          <p style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 16 }}>
            Tocá el elemento para lanzarlo a las llamas de la sesión:
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {offerings.map(({ kind, label, Icon }) => (
              <button 
                key={kind} 
                className="ofr" 
                onClick={() => sendOffer(kind)}
                title={`Ofrendar ${label}`}
                aria-label={`Ofrendar ${label}`}
              >
                <Icon size={30} strokeWidth={1.35} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* EXORCISM SCREEN */}
      {screen === 'exorcism' && (
        <div ref={panelRef} className="card screen-panel" style={{ textAlign: 'center', background: 'linear-gradient(180deg, rgba(93,224,255,0.08) 0%, rgba(7,4,12,0.8) 100%)', border: '1px solid rgba(93,224,255,0.3)' }}>
          <h3 style={{ fontSize: 22, color: 'var(--cyan)', letterSpacing: '0.02em' }}>¡RITUAL DE EXORCISMO!</h3>
          <p style={{ fontSize: 13, color: 'var(--tx)', margin: '8px auto', maxWidth: 340 }}>
            ¡Sacudí tu dispositivo con fuerza o pulsá a toda velocidad junto con la sala para expulsar la entidad!
          </p>

           <div className="ritual-actions" style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button 
              className="btn" 
              style={{ flex: 1, background: 'linear-gradient(135deg, #5de0ff 0%, #2a94d6 100%)', color: '#000', fontWeight: 700 }}
              onClick={async () => {
                const ok = await shake.start();
                if (!ok) alert('Permiso de movimiento denegado: usá el botón rápido.');
              }}
            >
              Sensor de agitar
            </button>
            <button 
              className="btn ghost" 
              style={{ flex: 1 }} 
              onClick={sendShakeTap}
            >
              Tocar rápido
            </button>
          </div>

          <div className="meter" style={{ marginTop: 18, height: 14 }}>
            <i 
              className="exorcism-fill" 
              style={{ 
                width: `${exorcismEnergy}%`, 
                background: 'linear-gradient(90deg, var(--cyan), #ffffff)' 
              }} 
            />
          </div>
          <p style={{ fontSize: 13, color: 'var(--mu)', marginTop: 4 }}>
            Energía del ritual: <b style={{ color: 'var(--cyan)' }}>{Math.round(exorcismEnergy)}%</b>
          </p>
        </div>
      )}

      {/* Ghost overlay when user closed or lost focus */}
      {ghost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'grid', placeItems: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div className="ghost-mark" aria-hidden="true">NO MIRES</div>
            <h2 className="title" style={{ fontSize: 44, margin: '12px 0' }}>VOLVÉ</h2>
            <p className="spirit-text" style={{ color: 'var(--mu)', fontSize: 18 }}>
              El espíritu nota tu ausencia. No abandones el círculo.
            </p>
          </div>
        </div>
      )}

      {answerModal && (
        <div role="dialog" aria-modal="true" aria-live="assertive" onMouseDown={(e) => e.stopPropagation()} style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0,0,0,.94)', backdropFilter: 'blur(10px)' }}>
          <div className="card" style={{ width: 'min(440px, 100%)', border: '1px solid var(--r)', boxShadow: '0 0 45px rgba(180,20,35,.55)', textAlign: 'center', animation: 'shake .18s infinite', position: 'relative', zIndex: 10001 }}>
            <div style={{ color: 'var(--r)', fontSize: 12, letterSpacing: 3, fontWeight: 800 }}>EL ESPÍRITU RESPONDE</div>
            <p style={{ color: 'var(--mu)', fontSize: 13, margin: '18px 0 8px' }}>«{answerModal.question}»</p>
            <p className="spirit-text" style={{ minHeight: 48, fontSize: 22, margin: '10px 0 24px' }}>
              {answerModal.text ?? 'La niebla está escribiendo tu respuesta…'}
            </p>
            <button className="btn danger" style={{ width: '100%' }} onClick={() => { pendingQuestionRef.current = ''; setAnswerModal(null); }}>
              Cerrar la aparición
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
