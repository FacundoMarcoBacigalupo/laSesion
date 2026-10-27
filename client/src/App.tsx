import { useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './styles/tokens.css';
import './styles/global.css';
import './styles/animations.css';
import Router from './router';
import SoundToggle from './components/ui/SoundToggle';
import { setupAudio } from './lib/audio';

gsap.registerPlugin(useGSAP);

export default function App() {
  useEffect(() => setupAudio(), []);

  useEffect(() => {
    // Respect user's motion preferences globally
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        gsap.globalTimeline.timeScale(100);
      } else {
        gsap.globalTimeline.timeScale(1);
      }
    };
    handleMotionChange(mediaQuery);
    mediaQuery.addEventListener?.('change', handleMotionChange);
    return () => mediaQuery.removeEventListener?.('change', handleMotionChange);
  }, []);

  return (
    <>
      <Router />
      <SoundToggle />
    </>
  );
}