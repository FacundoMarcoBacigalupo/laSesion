import { useEffect } from 'react';
import { useUiStore } from '../store/uiStore';

export function usePerformanceTier() {
  const setTier = useUiStore((s: any) => s.setTier);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    const mem = (navigator as any).deviceMemory ?? 4;
    let fps = 60;
    let frames = 0; let start = performance.now();
    const loop = () => {
      frames++;
      if (performance.now() - start >= 2000) {
        fps = (frames / (performance.now() - start)) * 1000;
        if (!gl || mem <= 2 || fps < 30) setTier('low'); else setTier('high');
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, [setTier]);
}