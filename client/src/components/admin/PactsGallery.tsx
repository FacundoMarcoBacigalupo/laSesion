interface Props { pact: any }
export default function PactsGallery({ pact }: Props) {
  return (
    <div className="card">
      <h3>Pactos firmados</h3>
      {pact && pact.sealed && (
        <div>
          <p>{pact.victimName ?? pact.id} · {new Date(pact.signedAt).toLocaleTimeString()}</p>
          {pact.png && <img src={pact.png} alt="firma" style={{ height: 40, background: '#000', borderRadius: 6 }} />}
        </div>
      )}
    </div>
  );
}