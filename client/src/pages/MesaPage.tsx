import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useSocket } from '../hooks/useSocket';
import { useFullscreen } from '../hooks/useFullscreen';
import { renderQr } from '../lib/qr';
import BloodWebs from '../components/ui/BloodWebs';
import { typeOnBoard } from '../lib/typing';
import { vibrate } from '../lib/haptics';
import { sfx, setHandsLevel } from '../lib/audio';
import { MAX_PARTICIPANTS } from '@sesion/shared';

const demo = new URLSearchParams(window.location.search).get('demo') === '1';

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

export default function MesaPage() {
  const [hands, setHands] = useState(0);
  const [typed, setTyped] = useState('');
  const [mood, setMood] = useState('calmo');
  const [sayQuestion, setSayQuestion] = useState<string | undefined>(undefined);
  const [ghosts, setGhosts] = useState<any[]>([]);
  const [pactSignatures, setPactSignatures] = useState<any[]>([]);
  const [ritual, setRitual] = useState<any>(null);
  const [intro, setIntro] = useState(true);
  const ritualStage = ritual?.stage ?? 'hold';
  const now = useClock(ritualStage === 'hold' || ritualStage === 'cauldron');

  const qrRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<{ stop: boolean }>({ stop: false });
  const mesaSocket = useRef<any>(null);

  const boardLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const [lit, setLit] = useState<Record<string, boolean>>({});
  const { enter: enterFs } = useFullscreen();

  const handlers: Record<string, (p: any) => void> = {
    state: (p) => {
      setMood(p.mood);
      setHands(p.hands);
      if (p.ritual) setRitual(p.ritual);
    },
    ritual: (p) => setRitual(p),
    hands: (p) => { setHands(p.n); },
    say: async (p) => {
      typingRef.current.stop = true;
      const signal = { stop: false };
      typingRef.current = signal;
      const text = typeof p.text === 'string' ? p.text : '';
      setTyped('');
      setSayQuestion(p.question);
      try {
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
      } finally {
        mesaSocket.current?.emit('mesa:say:done', { id: p.id });
      }
    },
    ghost: (p) => {
      setGhosts((g) => [...g, { userId: p.userId, name: p.name, question: p.question }]);
      sfx.ghost();
    },
    unghost: (p) => setGhosts((g) => g.filter((x) => x.userId !== p.userId)),
    'pact:signed': (p) => {
      setPactSignatures((prev) => [...prev, { name: p.name, time: p.time, png: p.png }]);
    },
    cauldron: () => { sfx.splash(); },
    mood: (p) => setMood(p.mood),
  };

  const socketR = useSocket('/mesa', handlers, demo, { auth: { key: new URLSearchParams(window.location.search).get('key') ?? '' } });
  useEffect(() => { mesaSocket.current = socketR.current; });

  useEffect(() => () => {
    typingRef.current.stop = true;
  }, []);

  useEffect(() => {
    if (qrRef.current) renderQr(qrRef.current, window.location.origin + '/');
  }, []);

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
    .from('.ritual-stage', {
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

  const moodColor = mood === 'calmo' ? 'var(--mood-calmo)' : mood === 'furioso' ? 'var(--mood-furioso)' : mood === 'hambriento' ? 'var(--mood-hambriento)' : 'var(--mood-burlon)';
  const holders = ritual?.holders ?? [];
  const waiting = ritual?.waiting ?? Math.max(0, MAX_PARTICIPANTS - holders.length);
  const holdLeft = secondsLeft(ritual?.holdEndsAt, now);
  const cauldronLeft = secondsLeft(ritual?.cauldronEndsAt, now);
  const scores = ritual?.scores ?? [];
  const maxScore = Math.max(1, ...scores.map((row: any) => row.score));
  const stageTitle = ritualStage === 'questions' ? 'Preguntas' : ritualStage === 'cauldron' ? 'Caldero' : ritualStage === 'pact' ? 'Pacto' : 'Mantener';

  return (
    <div ref={containerRef}>
      <BloodWebs />
      {intro && <div className="intro-screen" onClick={enterSession}>
        <div className="intro-mark" aria-hidden="true">L</div>
        <h1 className="intro-title">LA SESIÓN</h1>
        <p className="intro-subtitle">ALGO YA ESTÁ SENTADO</p>
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
              ENTRAR AL CÍRCULO
            </div>
            <h1 className="title" style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '0.01em', lineHeight: 1.1 }}>
              La Sesión
            </h1>
            <p style={{ color: 'var(--mu)', fontSize: 15, margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              Escaneá. El círculo toma el nombre que le des.
            </p>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', padding: '8px 16px', borderRadius: 12, border: '1px solid var(--l)' }}>
              <span className="mesa-status-mark" aria-hidden="true" />
              <div>
                <span style={{ fontSize: 13, color: 'var(--mu)', display: 'block' }}>{stageTitle}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--a)' }}>
                  {ritual?.alive ?? holders.length} <span style={{ fontSize: 14, color: 'var(--mu)', fontWeight: 400 }}>almas</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="ritual-stage">
          {ritualStage === 'hold' && (
            <div style={{ textAlign: 'center', padding: '28px 12px 8px' }}>
              {waiting > 0 ? (
                <>
                  <div style={{ letterSpacing: '0.28em', color: 'var(--r)', fontSize: 13, fontWeight: 800 }}>EL CÍRCULO NO CIERRA</div>
                  <h2 className="spirit-text" style={{ fontSize: 'clamp(32px, 5vw, 64px)', margin: '18px 0 8px' }}>
                    Faltan {waiting} {waiting === 1 ? 'alma' : 'almas'}
                  </h2>
                </>
              ) : (
                <>
                  <div style={{ letterSpacing: '0.28em', color: 'var(--r)', fontSize: 13, fontWeight: 800 }}>NADIE SUELTA EL VASO</div>
                  <h2 className="spirit-text" style={{ fontSize: 'clamp(32px, 5vw, 60px)', margin: '18px 0 8px' }}>
                    Todas las manos están dentro
                  </h2>
                  <p style={{ color: 'var(--mu)', margin: 0 }}>
                    {holdLeft == null ? 'El vaso les toma el pulso.' : `El juicio cae en ${holdLeft}s. No parpadeen.`}
                  </p>
                </>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 28 }}>
                {holders.map((soul: any, index: number) => (
                  <div key={soul.id} style={{
                    minWidth: 140,
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: `1px solid ${soul.holding ? 'rgba(255,59,92,0.65)' : 'rgba(255,255,255,0.08)'}`,
                    background: soul.holding ? 'rgba(90,8,18,0.55)' : 'rgba(255,255,255,0.03)',
                    boxShadow: soul.holding ? '0 0 28px rgba(255,59,92,0.28)' : 'none',
                    animation: 'fl2 2.8s ease-in-out infinite',
                    animationDelay: `${index * 0.15}s`,
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{soul.name}</div>
                    <div style={{ fontSize: 12, letterSpacing: '0.14em', color: soul.holding ? '#ffb3c0' : 'var(--mu)', marginTop: 4 }}>
                      {soul.holding ? 'NO SUELTA' : 'TIEMBLA'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ritualStage === 'questions' && (
            <div>
              {ritual?.verdict?.names?.length > 0 && (
                <p style={{ textAlign: 'center', color: '#ffb3c0', letterSpacing: '0.08em' }}>
                  {ritual.verdict.names.join(', ')}. {ritual.verdict.line}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0 18px' }}>
                {(ritual?.whispers ?? []).length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--mu)' }}>Las que quedaron pueden hablar. Sus palabras caen sobre la mesa.</p>
                )}
                {(ritual?.whispers ?? []).map((whisper: any, index: number) => (
                  <div key={`${whisper.at}-${index}`} style={{ border: '1px solid var(--l)', borderRadius: 12, padding: '10px 14px', background: 'rgba(0,0,0,0.35)' }}>
                    <b style={{ color: '#ffb3c0' }}>{whisper.name}</b>
                    <p style={{ margin: '4px 0 0' }}>{whisper.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ritualStage === 'cauldron' && (
            <div style={{ padding: '12px 0 24px' }}>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div style={{ letterSpacing: '0.22em', color: 'var(--r)', fontSize: 13, fontWeight: 800 }}>
                  {cauldronLeft == null ? 'EL CALDERO PESA' : `${cauldronLeft}s`}
                </div>
                <h2 className="spirit-text" style={{ fontSize: 'clamp(28px, 4vw, 48px)', margin: '10px 0' }}>
                  Quien ofrende menos se queda en el fuego
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720, margin: '0 auto' }}>
                {scores.map((row: any, index: number) => (
                  <div key={row.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <b style={{ color: index === 0 ? '#5dffa8' : '#fff' }}>{row.name}</b>
                      <span>{row.score}</span>
                    </div>
                    <div className="meter" style={{ height: 14 }}>
                      <i style={{ width: `${(row.score / maxScore) * 100}%`, background: index === 0 ? '#5dffa8' : 'var(--r)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ritualStage === 'pact' && (
            <div style={{ textAlign: 'center', padding: '36px 12px' }}>
              <div style={{ letterSpacing: '0.28em', color: '#ffb3c0', fontSize: 13, fontWeight: 800 }}>EL ABISMO ELIGE</div>
              <h2 className="spirit-text" style={{ fontSize: 'clamp(36px, 6vw, 72px)', margin: '16px 0', textShadow: '0 0 30px rgba(255,59,92,0.45)' }}>
                {ritual?.pureName ?? 'Alguien'}, el abismo te reconoce
              </h2>
              {pactSignatures[0]?.png && (
                <img src={pactSignatures[0].png} alt="firma" style={{ background: '#000', borderRadius: 8, width: 'min(360px, 100%)', border: '1px solid var(--l)' }} />
              )}
            </div>
          )}
        </div>

        {ritualStage === 'questions' && <>
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
              Cayó en la mesa: «{sayQuestion}»
            </p>
          )}
          <div id="wr" className="spirit-text mesa-spirit-message" style={{
            fontSize: 'clamp(22px, 4.5vw, 48px)',
            textShadow: `0 0 25px ${moodColor}` 
          }}>
            {typed || <span style={{ opacity: 0.35, fontSize: 24, fontStyle: 'normal' }}>— El vaso todavía no se mueve —</span>}
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
        </>}

        {ritualStage === 'hold' && ghosts.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--mu)', marginRight: 4 }}>Ausentes:</span>
            {ghosts.map((g) => (
              <span
                key={g.userId}
                style={{
                  padding: '4px 12px',
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  opacity: 0.7,
                  fontSize: 13,
                  animation: 'fl2 3s ease-in-out infinite',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {g.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
