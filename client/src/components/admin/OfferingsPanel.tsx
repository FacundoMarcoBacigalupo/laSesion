interface Props { offerings: any; onWant: () => void }
export default function OfferingsPanel({ offerings, onWant }: Props) {
  return (
    <div className="card">
      <h3>Ofrendas</h3>
      <div>Quiere: {offerings?.want ?? '—'}</div>
      <div>Puntos: {offerings?.points ?? 0}</div>
      <button className="btn ghost" style={{ marginTop: 6 }} onClick={onWant}>Pedir ofrenda</button>
    </div>
  );
}