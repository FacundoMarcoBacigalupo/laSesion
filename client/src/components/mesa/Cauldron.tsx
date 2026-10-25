import { useEffect, useRef } from 'react';
import { createCauldron, addBody } from '../../lib/physics';

interface Props { want: string; bodies: any[]; onAdd: (kind: string) => void }
export default function Cauldron({ want, bodies, onAdd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const { engine, world } = createCauldron(canvas);
    worldRef.current = world;
    let raf = 0;
    const ctx = canvas.getContext('2d')!;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#150c1d';
      ctx.beginPath();
      ctx.moveTo(30, 50);
      ctx.quadraticCurveTo(10, canvas.height + 10, canvas.width / 2, canvas.height - 4);
      ctx.quadraticCurveTo(canvas.width - 10, canvas.height + 10, canvas.width - 30, 50);
      ctx.fill();
      bodies.forEach((b) => {
        ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.emoji, b.x, b.y);
      });
      ctx.strokeStyle = '#5dffa8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(30, 50); ctx.lineTo(canvas.width - 30, 50); ctx.stroke();
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [bodies.length]);

  return <canvas ref={canvasRef} width={320} height={170} style={{ width: '100%', maxWidth: 320, display: 'block', margin: '6px auto', background: '#0a0612', borderRadius: 10 }} />;
}