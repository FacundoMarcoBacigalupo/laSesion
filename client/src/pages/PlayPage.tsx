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
import { EV, MAX_PARTICIPANTS } from '@sesion/shared';
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

export default function PlayPage() {
  usePerformanceTier();
  const me = useMeStore();
  const session = useSessionStore();
  const socketRef = useRef<any>(null);

  const [screen, setScreen] = useState<'hold' | 'ask' | 'vote' | 'chosen' | 'pact' | 'offerings' | 'exorcism' | 'pacto' | 'dead'>('hold');
  const [ritual, setRitual] = useState<any>(null);
  const [deathLine, setDeathLine] = useState('No eres puro. El círculo te niega y te entrega a la muerte.');
  const eliminatedRef = useRef(false);
  const stageRef = useRef('hold');
  const meIdRef = useRef(me.id);
  useEffect(() => { meIdRef.current = me.id; }, [me.id]);
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

  const [pactoName, setPactoName] = useState(() => localStorage.getItem('pactoName') || '');
  const pactDisplayName = pactoName || me.name || '';
  const [pactoSigned, setPactoSigned] = useState(() => localStorage.getItem('pactoSigned') === '1');
  const [pactoSignature, setPactoSignature] = useState(() => localStorage.getItem('pactoSignature') || '');
  const pactoCanvasRef = useRef<HTMLCanvasElement>(null);
  const pactoDrawingRef = useRef(false);
  const pactoLastRef = useRef<[number, number] | null>(null);

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
    localStorage.setItem('pactoName', pactDisplayName.trim() || 'Invitado');
    localStorage.setItem('pactoSignature', png);
    setPactoSignature(png);
    setPactoSigned(true);
    socketRef.current?.emit('pact:standalone', { png, name: pactDisplayName.trim() || 'Invitado' });
  }
  function pactoDownload() {
    const c = document.createElement('canvas');
    c.width = 600; c.height = 520;
    drawContract(c, ['Entrego mi nombre al que espera debajo de la mesa.', 'Cuando me llamen, no voy a soltar el vaso.', 'Mi firma queda en sangre. No hay forma de borrarla.', 'Acepto el precio que el círculo fije por dejarme vivo.'], pactDisplayName.trim() || 'Invitado', pactoSignature || localStorage.getItem('pactoSignature') || '');
  }
  function pactoReset() {
    localStorage.removeItem('pactoSigned'); localStorage.removeItem('pactoName'); localStorage.removeItem('pactoSignature');
    setPactoSigned(false); setPactoSignature(''); pactoClear();
  }
  const panelRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exorcismOnRef = useRef(false);
  const now = useClock(screen === 'offerings' || screen === 'hold');

  const shake = useShake(null);

  function condemn(line?: string) {
    eliminatedRef.current = true;
    setDeathLine(line || 'No eres puro. El círculo te niega y te entrega a la muerte.');
    setScreen('dead');
    vibrate([140, 50, 140, 50, 320, 70, 520]);
  }

  function applyRitual(p: any) {
    setRitual(p);
    const judged = p?.judged?.find((row: any) => row.id === meIdRef.current);
    if (judged) {
      if (!eliminatedRef.current) condemn(judged.line);
      return;
    }
    eliminatedRef.current = false;
    if (p?.stage === 'pact' && stageRef.current !== 'pact') {
      setPactoSigned(false);
      setPactoSignature('');
    }
    stageRef.current = p?.stage ?? 'hold';
    if (p?.stage === 'questions') setScreen('ask');
    else if (p?.stage === 'cauldron') setScreen('offerings');
    else if (p?.stage === 'pact') setScreen('pacto');
    else setScreen('hold');
  }

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
      if (!p.me && !demo) {
        me.clear();
        window.location.replace('/');
        return;
      }
      if (p.me) me.setMe(p.me);
      if (p.users) setPlayers(p.users);
      if (p.players) setPlayers(p.players);
      if (p.me?.eliminated) condemn(p.me.eliminationLine);
      if (p.ritual) applyRitual(p.ritual);
    },
    phase: (p) => {
      session.set({ phase: p.phase });
    },
    ritual: (p) => applyRitual(p),
    'you:judged': (p) => {
      condemn(p?.line);
      sfx.reveal();
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
    },
    'say:reveal': (p) => {
      if (!p?.question || p.question !== pendingQuestionRef.current) return;
      setAnswerModal({ question: p.question, text: p.text });
      sfx.reveal();
      vibrate([90, 40, 180, 50, 320]);
    },
    kick: () => {
      me.clear();
      window.location.href = '/';
    },
  };

  const socketR = useSocket('/play', handlers, demo);
  useEffect(() => {
    if (demo) return;
    const socket = socketR.current;
    if (!socket) return;
    const requestSync = () => socket.emit(EV.SESSION_SYNC);
    socket.on('connect', requestSync);
    if (socket.connected) requestSync();
    return () => { socket.off('connect', requestSync); };
  }, [demo, socketR]);

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
    const waiting = !answerModal.text;
    const pulse = () => vibrate(waiting ? [24] : [160, 60, 160, 60, 360]);
    pulse();
    vibrationRef.current = window.setInterval(pulse, waiting ? 2400 : 1400);
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
    if (screen !== 'dead') return;
    const pulse = () => vibrate([140, 50, 140, 50, 320, 70, 520]);
    pulse();
    const id = window.setInterval(pulse, 1600);
    return () => window.clearInterval(id);
  }, [screen]);

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
    return () => ambient.kill();
  }, { scope: containerRef, dependencies: [screen] });

  function sendAsk() {
    if (!question.trim()) return;
    const text = question.trim();
    pendingQuestionRef.current = text;
    setAnswerModal({ question: text });
    vibrate([36, 40, 36]);
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

  const stageLabel = screen === 'dead'
    ? 'Condenado'
    : ritual?.stage === 'questions'
      ? 'Preguntas'
      : ritual?.stage === 'cauldron'
        ? 'Caldero'
        : ritual?.stage === 'pact'
          ? 'Pacto'
          : 'Mantener';
  const cauldronLeft = secondsLeft(ritual?.cauldronEndsAt, now);
  const myScore = ritual?.scores?.find((row: any) => row.id === me.id)?.score ?? 0;
  const rivalScore = ritual?.scores?.find((row: any) => row.id !== me.id)?.score ?? 0;

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
              <span style={{ color: 'var(--a)', fontWeight: 600 }}>{stageLabel}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', padding: '5px 12px', borderRadius: 99, border: '1px solid var(--l)' }}>
          <span className="status-mark" aria-hidden="true" />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: hold.holding ? '#ffb3c0' : 'var(--mu)' }}>
            {session.hands}/{session.total}
          </span>
        </div>
      </div>

      {screen === 'dead' && (
        <div className="death-screen" role="alert" onPointerDown={() => vibrate([140, 50, 140, 50, 320])}>
          <div className="death-flash" />
          <div className="death-copy">
            <div className="death-kicker">EL CÍRCULO TE NOMBRÓ</div>
            <h2>{deathLine}</h2>
            <p>No cierres los ojos. Ya no estás en la mesa.</p>
          </div>
        </div>
      )}

      {screen === 'pacto' && (
        <div className="card screen-panel" style={{ border: '1px solid rgba(255,59,92,0.3)' }}>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--r)' }}>EL PACTO</h3>
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: 14, borderRadius: 12, border: '1px solid var(--l)', fontSize: 12, lineHeight: 1.5, textAlign: 'left', marginBottom: 14, marginTop: 12 }}>
            {['Entrego mi nombre al que espera debajo de la mesa.', 'Cuando me llamen, no voy a soltar el vaso.', 'Mi firma queda en sangre. No hay forma de borrarla.', 'Acepto el precio que el círculo fije por dejarme vivo.'].map((c, i) => (
              <p key={i} style={{ marginBottom: 6 }}>{i + 1}. {c}</p>
            ))}
          </div>
          {!pactoSigned && (
            <>
              <input className="input-dark" value={pactDisplayName} disabled style={{ width: '100%', marginBottom: 12, opacity: 0.8 }} />
              <canvas ref={pactoCanvasRef} width={320} height={100} onPointerDown={pactoStart} onPointerMove={pactoMove} onPointerUp={pactoStop} onPointerCancel={pactoStop} style={{ width: '100%', height: 100, background: '#050308', border: '1.5px dashed var(--r)', borderRadius: 10, touchAction: 'none', display: 'block', cursor: 'crosshair' }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={pactoClear}>Borrar</button>
                <button className="btn danger" style={{ flex: 2 }} onClick={pactoSign}>Firmar en sangre</button>
              </div>
            </>
          )}
          {pactoSigned && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#ffb3c0', fontWeight: 700, marginBottom: 10 }}>SELLADO. TU NOMBRE YA NO TE PERTENECE.</p>
              {pactoSignature && <img src={pactoSignature} alt="firma" style={{ background: '#000', borderRadius: 8, width: '100%', maxWidth: 260, border: '1px solid var(--l)', display: 'block', margin: '0 auto 12px' }} />}
              <button className="btn" style={{ width: '100%' }} onClick={pactoDownload}>Llevarte el pacto</button>
              <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={pactoReset}>Firmar de nuevo</button>
            </div>
          )}
        </div>
      )}

      {/* HOLD SCREEN */}
      {screen === 'hold' && (
        <div ref={panelRef} className="card screen-panel" style={{ textAlign: 'center' }}>
          <p className="spirit-text" style={{ fontSize: '1.15rem', color: hold.holding ? '#fff' : 'var(--mu)', marginBottom: 4 }}>
            {hold.holding ? '«Tu pulso ya está dentro del cristal.»' : 'Apoyá el dedo en el vaso. No lo sueltes.'}
          </p>

          <div className="cup-stage">
            <CupScene holding={hold.holding} onStart={() => { vibrate(28); sfx.hold(); hold.start(); }} onStop={() => { sfx.release(); hold.stop(); }} />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, background: hold.holding ? 'rgba(120,8,18,0.45)' : 'rgba(255,255,255,0.03)', border: `1px solid ${hold.holding ? 'rgba(255,59,92,0.45)' : 'var(--l)'}` }}>
            <span style={{ fontSize: 13, color: hold.holding ? '#ffb3c0' : 'var(--mu)', fontWeight: 600 }}>
              {hold.holding ? 'No sueltes. Te está midiendo.' : 'El vaso espera tu dedo.'}
            </span>
          </div>
        </div>
      )}

      {/* ASK SCREEN */}
      {screen === 'ask' && (
        <div ref={panelRef} className="card screen-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Hablale a lo que está debajo</h3>
          </div>
          <p style={{ color: 'var(--mu)', fontSize: 13, marginBottom: 16 }}>
            Lo que escribas cae en la mesa. No vas a ver la respuesta hasta que el vaso termine de escribirla.
          </p>

          <input 
            className="input-dark" 
            value={question} 
            onChange={(e) => setQuestion(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter') sendAsk(); }}
            placeholder="Preguntá. El vaso decide si responde." 
            maxLength={80} 
          />

          <button className="btn" style={{ marginTop: 12, width: '100%' }} onClick={sendAsk}>
            Dejarla caer
          </button>

          {questionSent && (
            <p style={{ color: '#ffb3c0', marginTop: 12, fontSize: 13, textAlign: 'center' }}>
              Ya está en la mesa. Esperá al vaso.
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
          <div style={{ letterSpacing: '0.16em', color: 'var(--r)', fontSize: 12, fontWeight: 800 }}>
            {cauldronLeft == null ? 'EL CALDERO' : `${cauldronLeft}s`}
          </div>
          <h3 style={{ fontSize: 18, margin: '8px 0 6px' }}>El caldero tiene hambre</h3>
          <p style={{ fontSize: 13, color: 'var(--mu)', margin: '0 0 8px' }}>
            Pedí lo que pide. Quien dé menos se queda adentro.
          </p>
          <p style={{ fontSize: 13, margin: '0 0 12px' }}>
            Vos: <b style={{ color: myScore >= rivalScore ? '#5dffa8' : 'var(--r)' }}>{myScore}</b>
            <span style={{ color: 'var(--mu)' }}> · la otra sangre: {rivalScore}</span>
          </p>
           <div className="offering-current" aria-label={`Ofrenda solicitada: ${want}`}>
             {offerings.find((offering) => offering.label.toUpperCase() === want)?.Icon && (() => {
               const Icon = offerings.find((offering) => offering.label.toUpperCase() === want)!.Icon;
               return <Icon size={52} strokeWidth={1.25} aria-hidden="true" />;
             })()}
           </div>
          <p style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 16 }}>
            Tocá lo que pide y tiralo al fuego:
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

      {answerModal && screen !== 'dead' && (
        <div role="dialog" aria-modal="true" aria-live="assertive" onMouseDown={(e) => e.stopPropagation()} style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0,0,0,.94)', backdropFilter: 'blur(10px)' }}>
          <div className="card" style={{ width: 'min(440px, 100%)', border: '1px solid var(--r)', boxShadow: '0 0 45px rgba(180,20,35,.55)', textAlign: 'center', animation: 'shake .18s infinite', position: 'relative', zIndex: 10001 }}>
            <div style={{ color: 'var(--r)', fontSize: 12, letterSpacing: 3, fontWeight: 800 }}>{answerModal.text ? 'EL VASO TERMINÓ' : 'EL VASO ESCRIBE'}</div>
            <p style={{ color: 'var(--mu)', fontSize: 13, margin: '18px 0 8px' }}>«{answerModal.question}»</p>
            <p className="spirit-text" style={{ minHeight: 48, fontSize: 22, margin: '10px 0 24px' }}>
              {answerModal.text ?? 'Tu pregunta está sobre la mesa. Todavía no mires la respuesta.'}
            </p>
            <button className="btn danger" style={{ width: '100%' }} disabled={!answerModal.text} onClick={() => { pendingQuestionRef.current = ''; setAnswerModal(null); }}>
              {answerModal.text ? 'Bajar la vista' : 'Esperá a la mesa'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
