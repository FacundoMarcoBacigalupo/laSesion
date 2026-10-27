import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function NotFoundPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from('.notfound-item', {
      autoAlpha: 0,
      y: 25,
      stagger: 0.12,
      duration: 0.7,
      ease: 'power3.out',
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="app" style={{ display: 'grid', placeItems: 'center', textAlign: 'center', minHeight: '100vh' }}>
      <div>
        <h1 className="title notfound-item" style={{ fontSize: 'clamp(60px, 14vw, 120px)' }}>404</h1>
        <p className="notfound-item spirit-text" style={{ fontSize: 22, color: 'var(--mu)', marginBottom: 24 }}>
          Este portal espiritual no existe o se ha desvanecido.
        </p>
        <div className="notfound-item">
          <Link to="/" className="btn">
            Volver a la sesión 🕯️
          </Link>
        </div>
      </div>
    </div>
  );
}