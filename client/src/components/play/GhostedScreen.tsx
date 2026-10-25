export default function GhostedScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'grid', placeItems: 'center', zIndex: 50, backdropFilter: 'blur(2px)' }}>
      <div style={{ fontSize: 40, color: '#fff' }}>VOLVÉ 👁️</div>
    </div>
  );
}