import { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { useUiStore } from '../store/uiStore';
import { useSocket } from '../hooks/useSocket';
import { useFullscreen } from '../hooks/useFullscreen';
import { renderQr } from '../lib/qr';
import { typeOnBoard } from '../lib/typing';
import { createCauldron, addBody } from '../lib/physics';

const demo = new URLSearchParams(window.location.search).get('demo') === '1';
const lite = new URLSearchParams(window.location.search).get('lite') === '1';

export default function MesaPage() {
  const session = useSessionStore();
  const tier = useUiStore((s: any) => s.tier);
  const [hands, setHands] = useState(0);
  const [total, setTotal] = useState(0);
  const [tension, setTension] = useState(0);
  const [queueSize, setQueueSize] = useState(0);
  const [players, setPlayers] = useState<any[]>([]);
  const [typed, setTyped] = useState('');
  const [mood, setMood] = useState('calmo');
  const [phase, setPhase] = useState('LOBBY');
  const [sayQuestion, setSayQuestion] = useState<string | undefined>(undefined);
  const [victim, setVictim] = useState<string | null>(null);
  const [willText, setWillText] = useState<string | null>(null);
  const [pact, setPact] = useState<any>(null);
  const [ghosts, setGhosts] = useState<any[]>([]);
  const [want, setWant] = useState('🍕');
  const [points, setPoints] = useState(0);
  const [bodies, setBodies] = useState<any[]>([]);
  const [exorcismActive, setExorcismActive] = useState(false);
  const [exorcismEnergy, setExorcismEnergy] = useState(0);
  const [directorOpen, setDirectorOpen] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const boardLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const [lit, setLit] = useState<Record<string, boolean>>({});
  const typingRef = useRef<{ stop: boolean }>({ stop: false });
  const cauldronRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { enter: enterFs } = useFullscreen();

  const handlers: Record<string, (p: any) => void> = {
    state: (p) => {
      setPhase(p.phase); setMood(p.mood); setTension(p.tension); setHands(p.hands); setTotal(p.total);
      setQueueSize(p.queueSize); setPlayers(p.users ?? []); setPact(p.pact); setWant(p.offerings?.want ?? want);
      setPoints(p.offerings?.points ?? points); setExorcismActive(p.exorcism?.active ?? false); setExorcismEnergy(p.exorcism?.energy ?? 0);
      if (p.victimName) setVictim(p.victimName); if (p.willText) setWillText(p.willText);
    },
    players: (p) => setPlayers(p.users ?? []),
    hands: (p) => { setHands(p.n); setTotal(p.total); },
    tension: (p) => setTension(p.value),
    queue: (p) => setQueueSize(p.size),
    votes: () => {},
    say: async (p) => {
      typingRef.current.stop = false;
      setSayQuestion(p.question);
      await typeOnBoard(p.text, {
        force: p.force,
        hands: () => hands,
        onChar: (ch) => setTyped((prev) => prev + ch),
        onLetter: (letter, on) => setLit((prev) => ({ ...prev, [letter]: on })),
        signal: typingRef.current,
      });
      // reset typed? keep
    },
    victim: (p) => setVictim(p.name),
    will: (p) => setWillText(p.text),
    ghost: (p) => setGhosts((g) => [...g, { userId: p.userId, name: p.name, question: p.question }]),
    unghost: (p) => setGhosts((g) => g.filter((x) => x.userId !== p.userId)),
    'pact:start': (p) => setPact({ id: p.pactId, clauses: p.clauses, victimName: p.victimName, penalties: 0 }),
    'pact:stroke': (p) => { /* redraw not implemented fully */ },
    'pact:clear': () => {},
    'pact:penalty': (p) => setPact((prev: any) => prev ? { ...prev, penalties: p.n, penaltyText: p.text } : prev),
    'pact:sealed': (p) => setPact((prev: any) => prev ? { ...prev, sealed: true, png: p.png } : prev),
    cauldron: (p) => {
      const r = 13;
      const body = { id: Math.random(), kind: p.kind, x: 50 + Math.random() * 200, y: 10, vx: Math.random() * 2 - 1, vy: 0, r, emoji: emojiFor(p.kind) };
      setBodies((b) => [...b.slice(-(40 - 1)), body]);
    },
    offering: (p) => { setWant(emojiFor(p.want)); setPoints(p.points); },
    exorcism: (p) => { setExorcismActive(p.active); setExorcismEnergy(p.energy); },
    'exorcism:won': () => { setExorcismActive(false); setExorcismEnergy(0); },
    phase: (p) => setPhase(p.phase),
    mood: (p) => setMood(p.mood),
  };

  const socketR = useSocket('/mesa', handlers, demo, { auth: { key: new URLSearchParams(window.location.search).get('key') ?? '' } });
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('key');
    socketR.current?.emit?.('auth', { key });
  }, [socketR]);

  useEffect(() => {
    const url = (window as any).__CONFIG__?.publicUrl ?? window.location.origin;
    if (qrRef.current) renderQr(qrRef.current, window.location.origin + '/');
  }, []);

  // cauldron physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // cauldron
      ctx.fillStyle = '#150c1d';
      ctx.beginPath();
      ctx.moveTo(30, 50);
      ctx.quadraticCurveTo(10, canvas.height + 10, canvas.width / 2, canvas.height - 4);
      ctx.quadraticCurveTo(canvas.width - 10, canvas.height + 10, canvas.width - 30, 50);
      ctx.fill();
      // bodies
      setBodies((prev) => {
        const next = prev.map((b) => {
          let { x, y, vx, vy, r } = b;
          vy += 0.35; x += vx; y += vy;
          const lo = 42 + r, hi = canvas.width - 42 - r;
          if (x < lo) { x = lo; vx *= -0.5; }
          if (x > hi) { x = hi; vx *= -0.5; }
          if (y > canvas.height - 18 - r) { y = canvas.height - 18 - r; vy *= -0.3; vx *= 0.95; }
          return { ...b, x, y, vx, vy };
        });
        // collisions
        for (let i = 0; i < next.length; i++) for (let j = i + 1; j < next.length; j++) {
          const a = next[i], b2 = next[j];
          const dx = b2.x - a.x, dy = b2.y - a.y, d = Math.hypot(dx, dy) || 1, m = a.r + b2.r;
          if (d < m) {
            const k = (m - d) / 2;
            a.x -= (dx / d) * k; a.y -= (dy / d) * k;
            b2.x += (dx / d) * k; b2.y += (dy / d) * k;
          }
        }
        return next;
      });
      // draw
      bodies.forEach((b) => {
        ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.emoji, b.x, b.y);
      });
      ctx.strokeStyle = '#5dffa8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(30, 50); ctx.lineTo(canvas.width - 30, 50); ctx.stroke();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bodies.length]);

  const moodColor = mood === 'calmo' ? '#8b6cff' : mood === 'furioso' ? '#ff3b5c' : mood === 'hambriento' ? '#ff7a00' : '#2eea8a';

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--tx)', fontFamily: 'system-ui' }} onClick={() => enterFs()}>
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <canvas ref={qrRef} width={120} height={120} style={{ background: '#fff', borderRadius: 8 }} />
          <div>
            <h2 style={{ margin: 0 }}>La Sesión</h2>
            <p style={{ color: 'var(--mu)', fontSize: 13 }}>Escaneá para entrar</p>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--mu)' }}>
            Manos: {hands} / {total} · Cola: {queueSize}
          </div>
        </div>
        <div className="meter"><i style={{ width: (hands / Math.max(1, total)) * 100 + '%' }} /></div>
        <div style={{ fontSize: 13, color: 'var(--mu)' }}>Tensión: {Math.round(tension)}</div>
        {victim && <div style={{ fontSize: 40, color: 'var(--r)', textShadow: '0 0 20px var(--r)', animation: 'sh .15s infinite' }}>{victim}</div>}
        {willText && <div style={{ fontSize: 14, color: 'var(--mu)', fontStyle: 'italic' }}>{willText}</div>}
        <div id="wr" style={{ minHeight: 56, fontSize: 20, letterSpacing: '.06em', color: '#fff', textShadow: `0 0 12px ${moodColor}` }}>{typed}</div>
        {sayQuestion && <p style={{ color: 'var(--mu)', fontSize: 12, fontStyle: 'italic' }}>«{sayQuestion}»</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
          {boardLetters.map((c) => (
            <span key={c} style={{ width: 30, height: 34, display: 'grid', placeItems: 'center', borderRadius: 7, color: 'var(--mu)', border: '1px solid #2a2040', background: lit[c] ? moodColor : 'transparent', transform: lit[c] ? 'translateY(-6px) scale(1.25)' : 'none', boxShadow: lit[c] ? `0 0 20px ${moodColor}` : 'none', transition: '.06s' }}>{c}</span>
          ))}
        </div>
        {ghosts.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ghosts.map((g) => <span key={g.userId} style={{ padding: '3px 11px', borderRadius: 99, background: '#ffffff12', color: '#fff', opacity: .5, filter: 'blur(.6px)', fontSize: 13, animation: 'fl2 3s ease-in-out infinite' }}>👻 {g.name}</span>)}
          </div>
        )}
        {pact && (
          <div style={{ border: '1px solid var(--l)', borderRadius: 12, padding: 12 }}>
            <h3 style={{ margin: 0 }}>📝 Pacto</h3>
            {pact.clauses?.map((c: string, i: number) => (
              <p key={i} style={i === 3 ? { opacity: .65, fontSize: 10 } : { fontSize: 14 }}>{c}</p>
            ))}
            {pact.penalties > 0 && <p style={{ color: '#ffb3c0' }}>⚠️ Penalidad {pact.penalties}: {pact.penaltyText}</p>}
            {pact.sealed && <p style={{ color: '#5dffa8' }}>🩸 FIRMADO</p>}
            {pact.png && <img src={pact.png} alt="firma" style={{ height: 40, background: '#000', borderRadius: 6 }} />}
          </div>
        )}
        {exorcismActive && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--mu)' }}>📳 Energía del exorcismo</p>
            <div className="meter"><i style={{ width: exorcismEnergy + '%', background: 'linear-gradient(90deg,#5de0ff,#fff)' }} /></div>
          </div>
        )}
        <div style={{ border: '1px solid var(--l)', borderRadius: 12, padding: 12 }}>
          <h3 style={{ margin: 0 }}>🔥 Caldero</h3>
          <p>Pide: <b style={{ fontSize: 22 }}>{want}</b></p>
          <canvas ref={canvasRef} width={320} height={170} style={{ width: '100%', maxWidth: 320, display: 'block', margin: '6px auto', background: '#0a0612', borderRadius: 10 }} />
          <p style={{ fontSize: 13 }}>Humor: {points < 4 ? 'pide más' : points < 9 ? 'se calma' : 'saciado'} ({points} pts)</p>
        </div>
      </div>
      {directorOpen && (
        <div style={{ width: 320, borderLeft: '1px solid var(--l)', padding: 12, overflowY: 'auto' }}>
          <button className="btn ghost" onClick={() => setDirectorOpen(false)}>Cerrar</button>
          <p style={{ color: 'var(--mu)', fontSize: 12 }}>Barra del director (requiere cookie admin). Comandos vía /admin.</p>
        </div>
      )}
      <button style={{ position: 'fixed', bottom: 10, right: 10, opacity: 0.3 }} onClick={() => setDirectorOpen((v) => !v)}>D</button>
    </div>
  );
}

function emojiFor(kind: string) {
  const m: any = { pizza: '🍕', wifi: '📶', ex: '💔', battery: '🔋' };
  return m[kind] ?? '🍕';
}