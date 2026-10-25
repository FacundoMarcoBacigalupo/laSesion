import QRCode from 'qrcode';

export async function renderQr(canvas: HTMLCanvasElement, text: string) {
  await QRCode.toCanvas(canvas, text, { width: canvas.width, margin: 1 });
}