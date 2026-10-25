export function captureStrokes(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}