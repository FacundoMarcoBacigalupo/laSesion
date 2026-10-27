import { Volume2, VolumeX } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

export default function SoundToggle() {
  const muted = useUiStore((s: any) => s.muted);
  const setMuted = useUiStore((s: any) => s.setMuted);
  const Icon = muted ? VolumeX : Volume2;

  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
      title={muted ? 'Activar sonido' : 'Silenciar sonido'}
      style={{
        position: 'fixed',
        bottom: 10,
        left: 10,
        zIndex: 1000,
        display: 'grid',
        placeItems: 'center',
        width: 36,
        height: 36,
        borderRadius: 99,
        border: '1px solid var(--l)',
        background: 'rgba(15, 10, 25, 0.7)',
        color: muted ? 'var(--mu)' : 'var(--a)',
        cursor: 'pointer',
        opacity: 0.6,
      }}
    >
      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
