import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useSessionStore } from '../store/sessionStore';
import { useUiStore } from '../store/uiStore';
import { useSocket } from '../hooks/useSocket';
import { useFullscreen } from '../hooks/useFullscreen';
import { renderQr } from '../lib/qr';
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
  const [want, setWant] = useState('🍕');
  const [points, setPoints] = useState(0);
  const [bodies, setBodies] = useState<any[]>([]);
  const [exorcismActive, setExorcismActive] = useState(false);
  const [exorcismEnergy, setExorcismEnergy] = useState(0);
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
      typingRef.current.stop = false;
      setSayQuestion(p.question);
      await typeOnBoard(p.text, {
        force: p.force,
        hands: () => hands,
        onChar: (ch) => setTyped((prev) => prev + ch),
        onLetter: (letter, on) => {
          setLit((prev) => ({ ...prev, [letter]: on }));
          if (on) sfx.letter();
        },
        signal: typingRef.current,
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
    cauldron: (p) => {
      const r = 13;
      const body = { id: Math.random(), kind: p.kind, x: 50 + Math.random() * 200, y: 10, vx: Math.random() * 2 - 1, vy: 0, r, emoji: emojiFor(p.kind) };
      setBodies((b) => [...b.slice(-(40 - 1)), body]);
      sfx.splash();
    },
    offering: (p) => { setWant(emojiFor(p.want)); setPoints(p.points); },
    exorcism: (p) => { setExorcismActive(p.active); setExorcismEnergy(p.energy); },
    'exorcism:won': () => { setExorcismActive(false); setExorcismEnergy(0); sfx.exorcismWon(); },
    phase: (p) => { setPhase(p.phase); sfx.phase(); },
    mood: (p) => setMood(p.mood),
  };

  const socketR = useSocket('/mesa', handlers, demo, { auth: { key: new URLSearchParams(window.location.search).get('key') ?? '' } });

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Cauldron pot drawing
      ctx.fillStyle = '#140c1e';
      ctx.beginPath();
      ctx.moveTo(30, 45);
      ctx.quadraticCurveTo(10, canvas.height + 10, canvas.width / 2, canvas.height - 4);
      ctx.quadraticCurveTo(canvas.width - 10, canvas.height + 10, canvas.width - 30, 45);
      ctx.fill();

      // Bodies
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

        // Collisions
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i], b2 = next[j];
            const dx = b2.x - a.x, dy = b2.y - a.y, d = Math.hypot(dx, dy) || 1, m = a.r + b2.r;
            if (d < m) {
              const k = (m - d) / 2;
              a.x -= (dx / d) * k; a.y -= (dy / d) * k;
              b2.x += (dx / d) * k; b2.y += (dy / d) * k;
            }
          }
        }
        return next;
      });

      // Draw emojis
      bodies.forEach((b) => {
        ctx.font = '22px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.emoji, b.x, b.y);
      });

      // Cauldron rim
      ctx.strokeStyle = '#8b6cff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(30, 45);
      ctx.lineTo(canvas.width - 30, 45);
      ctx.stroke();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bodies.length]);

  const moodColor = mood === 'calmo' ? 'var(--mood-calmo)' : mood === 'furioso' ? 'var(--mood-furioso)' : mood === 'hambriento' ? 'var(--mood-hambriento)' : 'var(--mood-burlon)';
  const handsPct = total > 0 ? (hands / total) * 100 : 0;

  return (
    <>
      {intro && <div className="intro-screen" onClick={enterSession}>
        <div className="intro-mark" aria-hidden="true">L</div>
        <h1 className="intro-title">LA SESIÓN</h1>
        <p className="intro-subtitle">EL CÍRCULO ESTÁ ESPERANDO</p>
        <button className="intro-enter" onClick={(event) => { event.stopPropagation(); enterSession(); }}>ENTRAR</button>
      </div>}
      <div 
      ref={containerRef} 
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
          <div style={{ background: '#fff', padding: 8, borderRadius: 14, display: 'inline-flex', boxShadow: '0 0 30px rgba(139,108,255,0.35)', flexShrink: 0 }}>
            <canvas ref={qrRef} width={136} height={136} style={{ display: 'block' }} />
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
        <div style={{ 
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
            <p style={{ color: 'var(--mu)', fontSize: 14, fontStyle: 'italic', marginBottom: 6 }}>
              Pregunta: «{sayQuestion}»
            </p>
          )}
          <div id="wr" className="spirit-text" style={{ 
            fontSize: 'clamp(28px, 4.5vw, 48px)', 
            letterSpacing: '0.08em', 
            color: '#ffffff', 
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
            <canvas ref={canvasRef} width={340} height={130} style={{ width: 340, height: 130, background: '#08040f', borderRadius: 12, border: '1px solid var(--l)' }} />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
