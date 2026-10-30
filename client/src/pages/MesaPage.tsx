import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useSessionStore } from '../store/sessionStore';
import { useUiStore } from '../store/uiStore';
import { useSocket } from '../hooks/useSocket';
import { useFullscreen } from '../hooks/useFullscreen';
import { renderQr } from '../lib/qr';
import BloodWebs from '../components/ui/BloodWebs';
import { typeOnBoard } from '../lib/typing';
import { Battery, Flame, HeartCrack, Pizza, Radio } from 'lucide-react';
import { vibrate } from '../lib/haptics';
import { sfx, setAmbientIntensity, setHandsLevel } from '../lib/audio';
import { MAX_PARTICIPANTS } from '@sesion/shared';

const demo = new URLSearchParams(window.location.search).get('demo') === '1';

function emojiFor(kind: string) {
  const m: Record<string, string> = { pizza: 'ALIMENTO', wifi: 'SEÑAL', ex: 'VÍNCULO', battery: 'RESERVA' };
  return m[kind] ?? 'ALIMENTO';
}

const offeringIcons: Record<string, any> = { ALIMENTO: Pizza, SEÑAL: Radio, VÍNCULO: HeartCrack, RESERVA: Battery };

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
  const [want, setWant] = useState('ALIMENTO');
  const [points, setPoints] = useState(0);
  const bodiesRef = useRef<any[]>([]);
  const [exorcismActive, setExorcismActive] = useState(false);
  const [exorcismEnergy, setExorcismEnergy] = useState(0);
  const [pactSignatures, setPactSignatures] = useState<any[]>([]);
  const [intro, setIntro] = useState(true);

  const qrRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const victimRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typingRef = useRef<{ stop: boolean }>({ stop: false });

  const boardLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const [lit, setLit] = useState<Record<string, boolean>>({});
  const { enter: enterFs } = useFullscreen();

  const handlers: Record<string, (p: any) => void> = {
    state: (p) => {
      setPhase(p.phase);
      setMood(p.mood);
      setTension(p.tension);
      setHands(p.hands);
      setTotal(p.total);
      setQueueSize(p.queueSize);
      setPlayers(p.users ?? []);
      setPact(p.pact);
      setWant(p.offerings?.want ?? want);
      setPoints(p.offerings?.points ?? points);
      setExorcismActive(p.exorcism?.active ?? false);
      setExorcismEnergy(p.exorcism?.energy ?? 0);
      if (p.victimName) setVictim(p.victimName);
      if (p.willText) setWillText(p.willText);
    },
    players: (p) => setPlayers(p.users ?? []),
    hands: (p) => { setHands(p.n); setTotal(p.total); },
    tension: (p) => setTension(p.value),
    queue: (p) => setQueueSize(p.size),
    votes: () => {},
    say: async (p) => {
      typingRef.current.stop = true;
      const signal = { stop: false };
      typingRef.current = signal;
      const text = typeof p.text === 'string' ? p.text : '';
      setTyped('');
      setSayQuestion(p.question);
      await typeOnBoard(text, {
        force: p.force,
        hands: () => hands,
        onChar: (ch) => setTyped((prev) => prev + ch),
        onLetter: (letter, on) => {
          setLit((prev) => ({ ...prev, [letter]: on }));
          if (on) sfx.letter();
        },
        signal,
      });
    },
    victim: (p) => { setVictim(p.name); sfx.reveal(); },
    will: (p) => setWillText(p.text),
    ghost: (p) => {
      setGhosts((g) => [...g, { userId: p.userId, name: p.name, question: p.question }]);
      sfx.ghost();
    },
    unghost: (p) => setGhosts((g) => g.filter((x) => x.userId !== p.userId)),
    'pact:start': (p) => {
      setPact({ id: p.pactId, clauses: p.clauses, victimName: p.victimName, penalties: 0 });
      sfx.scroll();
    },
    'pact:stroke': () => {},
    'pact:clear': () => {},
    'pact:penalty': (p) => setPact((prev: any) => prev ? { ...prev, penalties: p.n, penaltyText: p.text } : prev),
    'pact:sealed': (p) => {
      setPact((prev: any) => prev ? { ...prev, sealed: true, png: p.png } : prev);
      sfx.seal();
    },
    'pact:signed': (p) => {
      setPactSignatures((prev) => [...prev, { name: p.name, time: p.time, png: p.png }]);
    },
    cauldron: (p) => {
      const r = 13;
      const body = { id: Math.random(), kind: p.kind, x: 50 + Math.random() * 200, y: 10, vx: Math.random() * 2 - 1, vy: 0, r, emoji: emojiFor(p.kind) };
      bodiesRef.current = [...bodiesRef.current.slice(-(40 - 1)), body];
      sfx.splash();
    },
    offering: (p) => { setWant(emojiFor(p.want)); setPoints(p.points); },
    exorcism: (p) => { setExorcismActive(p.active); setExorcismEnergy(p.energy); },
    'exorcism:won': () => { setExorcismActive(false); setExorcismEnergy(0); sfx.exorcismWon(); },
    phase: (p) => { setPhase(p.phase); sfx.phase(); },
    mood: (p) => setMood(p.mood),
  };

  const socketR = useSocket('/mesa', handlers, demo, { auth: { key: new URLSearchParams(window.location.search).get('key') ?? '' } });

  useEffect(() => () => {
    typingRef.current.stop = true;
  }, []);

  useEffect(() => {
    if (qrRef.current) renderQr(qrRef.current, window.location.origin + '/');
  }, []);

  useEffect(() => {
    setAmbientIntensity(tension / 100);
  }, [tension]);

  useEffect(() => {
    setHandsLevel(hands, MAX_PARTICIPANTS);
  }, [hands]);

  // GSAP orchestrations
  useGSAP(() => {
    if (intro) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.mesa-header', {
      autoAlpha: 0,
      y: -25,
      duration: 0.7,
    })
    .from('.board-letter', {
      autoAlpha: 0,
      scale: 0.6,
      y: 12,
      stagger: 0.02,
      duration: 0.45,
      ease: 'back.out(1.4)',
    }, '-=0.4')
    .from('.cauldron-box', {
      autoAlpha: 0,
      y: 20,
      duration: 0.6,
    }, '-=0.2');
  }, { scope: containerRef, dependencies: [intro] });

  useGSAP(() => {
    if (!intro) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.intro-mark', { scale: 0, rotation: -18, autoAlpha: 0, duration: 1.1, ease: 'back.out(1.7)' })
      .from('.intro-title', { y: 28, autoAlpha: 0, duration: .8 }, '-=.55')
      .from('.intro-subtitle, .intro-enter', { y: 14, autoAlpha: 0, stagger: .12, duration: .55 }, '-=.35');
    gsap.to('.intro-mark', { opacity: .55, scale: 1.04, duration: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }, { scope: containerRef, dependencies: [intro] });

  function enterSession() {
    vibrate([24, 30, 60]);
    sfx.bell();
    const introEl = containerRef.current?.querySelector('.intro-screen');
    if (!introEl) return setIntro(false);
    gsap.to(introEl, { autoAlpha: 0, scale: 1.04, duration: .75, ease: 'power3.in', onComplete: () => setIntro(false) });
  }

  // Dramatic victim reveal with GSAP
  useGSAP(() => {
    if (victim && victimRef.current) {
      gsap.fromTo(victimRef.current,
        { scale: 0.3, autoAlpha: 0, filter: 'blur(10px)' },
        { scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 0.8, ease: 'elastic.out(1, 0.4)' }
      );
    }
  }, [victim]);

  // Cauldron physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const loop = () => {
      const time = performance.now() / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fire flickers behind the pot.
      for (let i = 0; i < 7; i++) {
        const x = 35 + i * 45;
        const flicker = Math.sin(time * 8 + i * 2.1);
        const height = 22 + (flicker + 1) * 13;
        const flame = ctx.createLinearGradient(0, 125, 0, 125 - height);
        flame.addColorStop(0, 'rgba(255,35,12,0)');
        flame.addColorStop(0.25, 'rgba(255,54,10,0.65)');
        flame.addColorStop(0.72, 'rgba(255,145,24,0.8)');
        flame.addColorStop(1, 'rgba(255,225,115,0.05)');
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.moveTo(x - 13, 124);
        ctx.bezierCurveTo(x - 19, 110, x - 5 + flicker * 3, 106 - height / 2, x, 125 - height);
        ctx.bezierCurveTo(x + 4, 107 - height / 3, x + 17, 114, x + 13, 124);
        ctx.closePath();
        ctx.fill();
      }

      // Dark, charred wooden body.
      const potPath = () => {
        ctx.beginPath();
        ctx.moveTo(30, 43);
        ctx.quadraticCurveTo(30, 122, canvas.width / 2, canvas.height - 4);
        ctx.quadraticCurveTo(canvas.width - 30, 122, canvas.width - 30, 43);
        ctx.closePath();
      };
      const potFill = ctx.createLinearGradient(0, 42, 0, canvas.height);
      potFill.addColorStop(0, '#160b0a');
      potFill.addColorStop(0.42, '#080708');
      potFill.addColorStop(1, '#210807');
      ctx.beginPath();
      potPath();
      ctx.fillStyle = potFill;
      ctx.fill();

      ctx.save();
      potPath();
      ctx.clip();
      for (let i = 0; i < 9; i++) {
        const x = 44 + i * 31;
        const stave = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
        stave.addColorStop(0, 'rgba(71,28,16,0.05)');
        stave.addColorStop(0.5, 'rgba(112,47,24,0.46)');
        stave.addColorStop(1, 'rgba(15,8,7,0.75)');
        ctx.strokeStyle = stave;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(x, 42);
        ctx.quadraticCurveTo(x - 8, 84, x + (170 - x) * 0.3, 128);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(210,105,55,0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 3, 52);
        ctx.quadraticCurveTo(x - 7, 85, x + (170 - x) * 0.3 - 3, 118);
        ctx.stroke();
      }

      // Blood-dark, rippling liquid inside the cauldron.
      const liquid = ctx.createLinearGradient(0, 45, 0, 125);
      liquid.addColorStop(0, 'rgba(123,5,20,0.82)');
      liquid.addColorStop(0.45, 'rgba(59,2,12,0.88)');
      liquid.addColorStop(1, 'rgba(16,3,5,0.96)');
      ctx.fillStyle = liquid;
      ctx.beginPath();
      ctx.moveTo(39, 49 + Math.sin(time * 2) * 2);
      ctx.quadraticCurveTo(170, 57 + Math.sin(time * 2.7) * 3, 301, 49 - Math.sin(time * 1.8) * 2);
      ctx.lineTo(310, 126);
      ctx.lineTo(30, 126);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Wooden rim, iron binding, and blood drips.
      ctx.shadowColor = '#ff3018';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#30150e';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, 45, 140, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#75604a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, 43, 140, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#7d0715';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const x = 65 + i * 43;
        const drip = 7 + (Math.sin(time * 2 + i * 1.7) + 1) * 5;
        ctx.beginPath();
        ctx.moveTo(x, 47);
        ctx.bezierCurveTo(x - 2, 51, x + 2, 52, x, 47 + drip);
        ctx.stroke();
      }

      // Small skull ornaments carved into the wooden sides.
      ctx.font = '17px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💀', 55, 82);
      ctx.fillText('💀', canvas.width - 55, 82);

      // Move and draw the latest offerings without capturing stale React state.
      const bodies = bodiesRef.current;
      bodies.forEach((b) => {
        b.trail ??= [];
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 7) b.trail.shift();
        b.vy += 0.35;
        b.x += b.vx;
        b.y += b.vy;
        const lo = 42 + b.r, hi = canvas.width - 42 - b.r;
        if (b.x < lo) { b.x = lo; b.vx *= -0.5; }
        if (b.x > hi) { b.x = hi; b.vx *= -0.5; }
        if (b.y > canvas.height - 18 - b.r) {
          b.y = canvas.height - 18 - b.r;
          b.vy *= -0.3;
          b.vx *= 0.95;
        }
      });

      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i]!;
          const b = bodies[j]!;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy) || 1;
          const minDistance = a.r + b.r;
          if (distance < minDistance) {
            const overlap = (minDistance - distance) / 2;
            a.x -= (dx / distance) * overlap;
            a.y -= (dy / distance) * overlap;
            b.x += (dx / distance) * overlap;
            b.y += (dy / distance) * overlap;
          }
        }
      }

      bodies.forEach((b) => {
        b.trail.forEach((point: { x: number; y: number }, index: number) => {
          const progress = (index + 1) / b.trail.length;
          ctx.globalAlpha = progress * 0.28;
          ctx.fillStyle = index % 2 ? '#ff3b0a' : '#ffc247';
          ctx.shadowColor = '#ff2a08';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(point.x, point.y, b.r * progress * 0.75, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        const glow = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r * 2.4);
        glow.addColorStop(0, 'rgba(255,244,170,0.9)');
        glow.addColorStop(0.35, 'rgba(255,104,15,0.62)');
        glow.addColorStop(1, 'rgba(255,28,8,0)');
        ctx.fillStyle = glow;
        ctx.shadowColor = '#ff4812';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = '22px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff6018';
        ctx.shadowBlur = 12;
        ctx.fillText(b.emoji, b.x, b.y);
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const moodColor = mood === 'calmo' ? 'var(--mood-calmo)' : mood === 'furioso' ? 'var(--mood-furioso)' : mood === 'hambriento' ? 'var(--mood-hambriento)' : 'var(--mood-burlon)';
  const handsPct = total > 0 ? (hands / total) * 100 : 0;

  return (
    <div ref={containerRef}>
      <BloodWebs />
      {intro && <div className="intro-screen" onClick={enterSession}>
        <div className="intro-mark" aria-hidden="true">L</div>
        <h1 className="intro-title">LA SESIÓN</h1>
        <p className="intro-subtitle">EL CÍRCULO ESTÁ ESPERANDO</p>
        <button className="intro-enter" onClick={(event) => { event.stopPropagation(); enterSession(); }}>ENTRAR</button>
      </div>}
      <div 
      style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--tx)', userSelect: 'none', cursor: 'default' }} 
        onClick={() => { if (!intro) enterFs(); }}
    >
      <div style={{ flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {/* Cinematic Header with QR and real-time status */}
        <div className="mesa-header" style={{
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          background: 'rgba(20, 14, 32, 0.75)',
          border: '1px solid var(--l)',
          padding: '18px 26px',
          borderRadius: 20,
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.6)'
        }}>
          {/* QR */}
          <div style={{ background: '#fff', padding: 12, borderRadius: 16, display: 'inline-flex', boxShadow: '0 0 30px rgba(139,108,255,0.35)', flexShrink: 0 }}>
            <canvas ref={qrRef} width={220} height={220} style={{ display: 'block' }} />
          </div>

          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(139,108,255,0.2)', color: 'var(--a)', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
              UNIRSE A LA SESIÓN
            </div>
            <h1 className="title" style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '0.01em', lineHeight: 1.1 }}>
              La Sesión
            </h1>
            <p style={{ color: 'var(--mu)', fontSize: 15, margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              Escaneá con la cámara de tu celular para participar
            </p>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', padding: '8px 16px', borderRadius: 12, border: '1px solid var(--l)' }}>
              <span className="mesa-status-mark" aria-hidden="true" />
              <div>
                <span style={{ fontSize: 13, color: 'var(--mu)', display: 'block' }}>Manos en el vaso</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: handsPct > 60 ? '#5dffa8' : 'var(--a)' }}>
                  {hands} <span style={{ fontSize: 14, color: 'var(--mu)', fontWeight: 400 }}>/ {total}</span>
                </span>
              </div>
            </div>

            <div style={{ fontSize: 13, color: 'var(--mu)', display: 'flex', gap: 16 }}>
              <span>Preguntas en cola: <b style={{ color: '#fff' }}>{queueSize}</b></span>
              <span>Fase: <b style={{ color: 'var(--a)' }}>{phase}</b></span>
            </div>
          </div>
        </div>

        {/* Collective energy meter */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--mu)', marginBottom: 4 }}>
            <span>CONEXIÓN ESPIRITUAL COLECTIVA</span>
            <span>TENSIÓN: <b style={{ color: moodColor }}>{Math.round(tension)}</b></span>
          </div>
          <div className="meter" style={{ height: 12 }}>
            <i style={{ width: `${handsPct}%`, background: `linear-gradient(90deg, var(--a), ${moodColor})` }} />
          </div>
        </div>

        {/* DRAMATIC VICTIM CALLOUT */}
        {victim && (
          <div 
            ref={victimRef} 
            style={{ 
              textAlign: 'center', 
              padding: '20px 24px', 
              background: 'linear-gradient(180deg, rgba(66,8,22,0.8) 0%, rgba(20,4,8,0.9) 100%)', 
              border: '2px solid rgba(255,59,92,0.5)', 
              borderRadius: 18,
              boxShadow: '0 0 40px rgba(255,59,92,0.4)' 
            }}
          >
            <div style={{ fontSize: 14, letterSpacing: '0.2em', color: 'var(--r)', fontWeight: 800 }}>
              ALMA SELECCIONADA POR EL CÍRCULO
            </div>
            <div style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, color: '#fff', textShadow: '0 0 30px var(--r)', margin: '6px 0' }}>
              {victim}
            </div>
            {willText && (
              <p className="spirit-text" style={{ fontSize: 20, color: '#ffd6de', margin: '4px 0 0' }}>
                «{willText}»
              </p>
            )}
          </div>
        )}

        {/* SPIRIT TYPED MESSAGE ON BOARD */}
        <div className="mesa-spirit-panel" style={{
          minHeight: 88, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          textAlign: 'center',
          padding: '16px 20px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--l)',
          borderRadius: 16,
        }}>
          {sayQuestion && (
            <p className="mesa-spirit-question" style={{ color: 'var(--mu)', fontSize: 14, fontStyle: 'italic', marginBottom: 6 }}>
              Pregunta: «{sayQuestion}»
            </p>
          )}
          <div id="wr" className="spirit-text mesa-spirit-message" style={{
            fontSize: 'clamp(22px, 4.5vw, 48px)',
            textShadow: `0 0 25px ${moodColor}` 
          }}>
            {typed || <span style={{ opacity: 0.35, fontSize: 24, fontStyle: 'normal' }}>— Las fuerzas del círculo guardan silencio —</span>}
          </div>
        </div>

        {/* OUIJA LETTERS BOARD */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', padding: '10px 0' }}>
          {boardLetters.map((c) => {
            const isLit = lit[c];
            return (
              <span 
                key={c} 
                className="board-letter"
                style={{ 
                  width: 'clamp(38px, 3.2vw, 54px)', 
                  height: 'clamp(44px, 3.8vw, 60px)', 
                  display: 'grid', 
                  placeItems: 'center', 
                  borderRadius: 10, 
                  fontFamily: 'var(--font-spirit)',
                  fontSize: 'clamp(20px, 1.8vw, 26px)',
                  fontWeight: 700,
                  color: isLit ? '#ffffff' : 'var(--mu)', 
                  border: `1.5px solid ${isLit ? moodColor : 'rgba(255,255,255,0.08)'}`, 
                  background: isLit ? moodColor : 'rgba(15, 10, 25, 0.6)', 
                  transform: isLit ? 'translateY(-10px) scale(1.3)' : 'none', 
                  boxShadow: isLit ? `0 0 30px ${moodColor}, 0 10px 20px rgba(0,0,0,0.5)` : 'none', 
                  transition: 'transform 0.08s ease, background 0.08s ease, border-color 0.08s ease, box-shadow 0.08s ease',
                  zIndex: isLit ? 10 : 1
                }}
              >
                {c}
              </span>
            );
          })}
        </div>

        {/* GHOST ROW */}
        {ghosts.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--mu)', marginRight: 4 }}>Desconectados:</span>
            {ghosts.map((g) => (
              <span 
                key={g.userId} 
                style={{ 
                  padding: '4px 12px', 
                  borderRadius: 99, 
                  background: 'rgba(255,255,255,0.08)', 
                  color: '#fff', 
                  opacity: 0.7, 
                  filter: 'blur(0.4px)', 
                  fontSize: 13, 
                  animation: 'fl2 3s ease-in-out infinite',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {g.name}
              </span>
            ))}
          </div>
        )}

        {/* PACT SEALS DISPLAY */}
        {pact && (
          <div style={{ border: '1px solid var(--l)', borderRadius: 16, padding: 18, background: 'rgba(19,13,31,0.65)', backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
               <h3 style={{ margin: 0, fontSize: 17, color: 'var(--r)' }}>Pacto Espiritual: {pact.victimName ?? 'Víctima'}</h3>
               {pact.sealed && <span style={{ color: '#5dffa8', fontWeight: 700, fontSize: 14 }}>FIRMADO</span>}
            </div>
            {pact.clauses?.map((c: string, i: number) => (
              <p key={i} style={{ fontSize: 13, color: 'var(--tx)', marginBottom: 4, opacity: i === 3 ? 0.7 : 1 }}>
                {i + 1}. {c}
              </p>
            ))}
             {pact.penalties > 0 && <p style={{ color: '#ffb3c0', fontSize: 13, marginTop: 6 }}>Penalidad {pact.penalties}: {pact.penaltyText}</p>}
            {pact.png && (
              <div style={{ marginTop: 10 }}>
                <img src={pact.png} alt="firma" style={{ height: 48, background: '#000', borderRadius: 8, border: '1px solid var(--r)', padding: 4 }} />
              </div>
            )}
          </div>
        )}

        {/* EXORCISM RITUAL BAR */}
        {exorcismActive && (
          <div style={{ background: 'rgba(93,224,255,0.06)', border: '1px solid rgba(93,224,255,0.3)', borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>RITUAL DE EXORCISMO EN CURSO</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{Math.round(exorcismEnergy)}%</span>
            </div>
            <div className="meter" style={{ height: 16, margin: 0 }}>
              <i style={{ width: `${exorcismEnergy}%`, background: 'linear-gradient(90deg, #5de0ff, #ffffff)', boxShadow: '0 0 20px #5de0ff' }} />
            </div>
          </div>
        )}

        {/* CAULDRON OF OFFERINGS */}
        <div className="cauldron-box" style={{ border: '1px solid var(--l)', borderRadius: 16, padding: 16, background: 'rgba(19,13,31,0.5)', display: 'flex', gap: 24, alignItems: 'center' }}>
          <div>
             <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Caldero de los Espíritus</h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--mu)' }}>
               Demanda actual: <b className="mesa-offering-icon" aria-label={want}>{(() => { const Icon = offeringIcons[want] ?? Flame; return <Icon size={32} strokeWidth={1.25} aria-hidden="true" />; })()}</b>
            </p>
            <p style={{ fontSize: 13, color: 'var(--tx)', marginTop: 6 }}>
              Estado: <b style={{ color: points >= 9 ? '#5dffa8' : points >= 4 ? 'var(--a)' : 'var(--r)' }}>
                {points < 4 ? 'Hambriento (pide más ofrendas)' : points < 9 ? 'Calmándose...' : 'Saciado'}
              </b> ({points} pts)
            </p>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <canvas ref={canvasRef} width={340} height={130} style={{ width: 340, height: 130, background: '#08040f', borderRadius: 12, border: '1px solid rgba(120,35,24,0.65)' }} />
          </div>
        </div>
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pactSignatures.map((sig, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 10, border: '1px solid var(--l)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <b style={{ color: '#ffb3c0' }}>{sig.name}</b>
              <span style={{ fontSize: 11, color: 'var(--mu)' }}>{new Date(sig.time).toLocaleTimeString()}</span>
            </div>
            {sig.png && <img src={sig.png} alt="firma" style={{ background: '#000', borderRadius: 6, width: '100%', maxWidth: 260 }} />}
          </div>
        ))}
      </div>
      </div>
    </div>
    </div>
  );
}
