export function drawContract(canvas: HTMLCanvasElement, clauses: string[], name: string, signaturePng: string) {
  const x = canvas.getContext('2d')!;
  const W = canvas.width, H = canvas.height;
  x.fillStyle = '#1b0a12'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#ff3b5c'; x.strokeRect(10, 10, W - 20, H - 20);
  x.fillStyle = '#ffb3c0'; x.font = 'bold 28px serif'; x.fillText('PACTO CON EL ESPÍRITU', 120, 60);
  x.font = '16px serif'; x.fillStyle = '#eee';
  let y = 110;
  for (const t of clauses) {
    let l = '';
    for (const w of t.split(' ')) {
      if ((l + w).length > 52) { x.fillText(l, 30, y); y += 24; l = ''; }
      l += w + ' ';
    }
    x.fillText(l, 30, y); y += 34;
  }
  const img = new Image();
  img.onload = () => {
    x.drawImage(img, 30, y, 240, 80);
    x.fillStyle = '#ffb3c0'; x.fillText('🩸 Firmado: ' + name + ' · SideQuest', 30, y + 110);
    const a = document.createElement('a');
    a.href = canvas.toDataURL();
    a.download = 'pacto-' + name + '.png';
    a.click();
  };
  img.src = signaturePng;
}