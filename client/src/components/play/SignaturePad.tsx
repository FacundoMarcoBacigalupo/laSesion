import { useRef, useState, useEffect } from 'react';

export default function SignaturePad({ onStroke, onClear, onDone }: any) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext('2d')!;
    ctx.strokeStyle = '#ffb3c0'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    let last: [number, number] | null = null;
    const start = (e: any) => { setDrawing(true); c.setPointerCapture(e.pointerId); last = [e.offsetX, e.offsetY]; };
    const move = (e: any) => { if (!drawing || !last) return; const [lx, ly] = last; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); last = [e.offsetX, e.offsetY]; onStroke([[lx/240, ly/80], [e.offsetX/240, e.offsetY/80]]); };
    const end = () => { setDrawing(false); last = null; };
    c.addEventListener('pointerdown', start); c.addEventListener('pointermove', move); c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    return () => { c.removeEventListener('pointerdown', start); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', end); c.removeEventListener('pointercancel', end); };
  }, [onStroke]);
  return <canvas ref={ref} width={240} height={80} style={{ width: '100%', maxWidth: 240, background: '#000', border: '1px dashed var(--r)', borderRadius: 8, touchAction: 'none' }} />;
}