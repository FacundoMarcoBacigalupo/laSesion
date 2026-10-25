interface Props { onAccept: () => void }
export default function ConsentNotice({ onAccept }: Props) {
  return (
    <label style={{ display: 'block', marginTop: 12, fontSize: 13, color: 'var(--mu)' }}>
      <input type="checkbox" onChange={(e) => { if (e.target.checked) onAccept(); }} />
      Esta sesión usa datos de tu dispositivo (modelo, batería, zona horaria) para asustarte. Todo se borra al terminar.
    </label>
  );
}