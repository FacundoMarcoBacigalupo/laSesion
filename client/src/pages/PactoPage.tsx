import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BloodWebs from '../components/ui/BloodWebs';
import { drawContract } from '../lib/contractImage';

const CLAUSES = [
  'Acepto caminar en la oscuridad cuando el espíritu lo reclame.',
  'Entrego mi nombre y mi firma al círculo para que el Más Allá las recuerde.',
  'No romperé el pacto sellado en sangre digital.',
  'Acepto las penalidades que el espíritu imponga si fallo.',
];

export default function PactoPage() {
  const nav = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<[number, number] | null>(null);

  const [name, setName] = useState(() => localStorage.getItem('pactoName') || '');
  const [signed, setSigned] = useState(() => localStorage.getItem('pactoSigned') === '1');
  const [signature, setSignature] = useState(() => localStorage.getItem('pactoSignature') || '');
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.strokeStyle = '#ffb3c0';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }, []);

  function startDrawing(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    drawingRef.current = true;
    setDrawing(true);
    c.setPointerCapture(e.pointerId);
    lastRef.current = [e.nativeEvent.offsetX, e.nativeEvent.offsetY];
  }
  function drawStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !lastRef.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    const [lx, ly] = lastRef.current;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
    lastRef.current = [e.nativeEvent.offsetX, e.nativeEvent.offsetY];
  }
  function stopDrawing() {
    drawingRef.current = false;
    setDrawing(false);
    lastRef.current = null;
  }
  function clearSignature() {
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
  }
  function sign() {
    const c = canvasRef.current!;
    const png = c.toDataURL('image/png');
    localStorage.setItem('pactoSigned', '1');
    localStorage.setItem('pactoName', name.trim() || 'Invitado');
    localStorage.setItem('pactoSignature', png);
    setSignature(png);
    setSigned(true);
  }
  function download() {
    const c = document.createElement('canvas');
    c.width = 600;
    c.height = 520;
    drawContract(c, CLAUSES, name.trim() || 'Invitado', signature || localStorage.getItem('pactoSignature') || '');
  }
  function reset() {
    localStorage.removeItem('pactoSigned');
    localStorage.removeItem('pactoName');
    localStorage.removeItem('pactoSignature');
    setSigned(false);
    setSignature('');
    clearSignature();
  }

  return (
    <div className="app" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '100vh', padding: 24 }}>
      <BloodWebs />
      <div style={{ width: '100%', maxWidth: 520 }}>
        <h1 className="title" style={{ color: 'var(--r)' }}>Pacto con el Espíritu</h1>
        <p style={{ color: 'var(--mu)', marginBottom: 16 }}>Firma el pacto y guárdalo como recuerdo.</p>

        <div style={{ background: 'rgba(0,0,0,0.6)', padding: 14, borderRadius: 12, border: '1px solid var(--l)', fontSize: 12, lineHeight: 1.5, textAlign: 'left', marginBottom: 14 }}>
          {CLAUSES.map((c, i) => (
            <p key={i} style={{ marginBottom: 6 }}>{i + 1}. {c}</p>
          ))}
        </div>

        {!signed && (
          <>
            <input
              className="input-dark"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />
            <canvas
              ref={canvasRef}
              width={320}
              height={100}
              onPointerDown={startDrawing}
              onPointerMove={drawStroke}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              style={{ width: '100%', height: 100, background: '#050308', border: '1.5px dashed var(--r)', borderRadius: 10, touchAction: 'none', display: 'block', cursor: 'crosshair' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={clearSignature}>Borrar</button>
              <button className="btn danger" style={{ flex: 2 }} onClick={sign}>Firmar en sangre</button>
            </div>
          </>
        )}

        {signed && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#5dffa8', fontWeight: 700, marginBottom: 10 }}>PACTO SELLADO. YA NO HAY SALVACIÓN.</p>
            {signature && <img src={signature} alt="firma" style={{ background: '#000', borderRadius: 8, width: '100%', maxWidth: 260, border: '1px solid var(--l)', display: 'block', margin: '0 auto 12px' }} />}
            <button className="btn" style={{ width: '100%' }} onClick={download}>Descargar el pacto</button>
            <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={reset}>Firmar de nuevo</button>
          </div>
        )}

        <button className="btn ghost" style={{ width: '100%', marginTop: 16 }} onClick={() => nav('/')}>Volver</button>
      </div>
    </div>
  );
}
