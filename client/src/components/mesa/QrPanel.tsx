import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';

interface Props { url: string; size?: number; visible?: boolean }
export default function QrPanel({ url, size = 180, visible = true }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (visible && ref.current) QRCode.toCanvas(ref.current, url, { width: size, margin: 1 });
  }, [url, size, visible]);
  if (!visible) return null;
  return <canvas ref={ref} width={size} height={size} style={{ background: '#fff', borderRadius: 8 }} />;
}