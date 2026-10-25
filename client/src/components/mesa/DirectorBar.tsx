export default function DirectorBar({ onToggle }: { onToggle: () => void }) {
  return <button style={{ position: 'fixed', bottom: 10, right: 10, opacity: 0.3 }} onClick={onToggle}>D</button>;
}