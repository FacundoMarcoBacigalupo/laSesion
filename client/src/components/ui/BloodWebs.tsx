const webPath = 'M0,0 L100,0 M0,0 L0,100 M0,0 L90,40 M0,0 L75,75 M0,0 L40,90';
const arcPath = 'M15,0 Q18,18 0,15 M30,0 Q35,35 0,30 M50,0 Q60,60 0,50 M75,0 Q88,88 0,75 M100,0 Q105,105 0,100';

const corners: Array<{ top?: string; bottom?: string; left?: string; right?: string; transform?: string }> = [
  { top: '0', left: '0' },
  { top: '0', right: '0', transform: 'scaleX(-1)' },
  { bottom: '0', left: '0', transform: 'scaleY(-1)' },
  { bottom: '0', right: '0', transform: 'scale(-1)' },
];

export default function BloodWebs() {
  return (
    <>
      {corners.map((c, i) => (
        <svg
          key={i}
          viewBox="0 0 100 100"
          fill="none"
          style={{
            position: 'fixed',
            width: 'clamp(140px, 20vw, 260px)',
            height: 'clamp(140px, 20vw, 260px)',
            pointerEvents: 'none',
            zIndex: 2,
            opacity: 0.22,
            filter: 'drop-shadow(0 0 6px rgba(155,25,39,0.3))',
            top: c.top,
            bottom: c.bottom,
            left: c.left,
            right: c.right,
            transform: c.transform,
          }}
        >
          <path d={webPath} stroke="#d32f3f" strokeWidth="0.8" />
          <path d={arcPath} stroke="#d32f3f" strokeWidth="0.6" />
        </svg>
      ))}
    </>
  );
}
