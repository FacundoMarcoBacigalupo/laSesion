interface Props { onCmd: (ev: string, payload?: any) => void }
export default function DirectorPanel({ onCmd }: Props) {
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Director</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {[0,1,2,3,4].map((i) => <button key={i} className="btn ghost" onClick={() => onCmd('dir:ask', { quickId: i })}>P{i}</button>)}
        <button className="btn ghost" onClick={() => onCmd('dir:pickVictim')}>Elegir víctima</button>
        <button className="btn ghost" onClick={() => onCmd('dir:will')}>Testamento</button>
        <button className="btn ghost" onClick={() => onCmd('dir:pact')}>Pacto</button>
        <button className="btn ghost" onClick={() => onCmd('dir:ghost')}>Fantasma</button>
        <button className="btn ghost" onClick={() => onCmd('dir:exorcism', { action: 'start' })}>Exorcismo ON</button>
        <button className="btn ghost" onClick={() => onCmd('dir:exorcism', { action: 'stop' })}>Exorcismo OFF</button>
        {['LOBBY','SESSION','VOTING','VICTIM','PACT','EXORCISM','END'].map((ph) => <button key={ph} className="btn ghost" onClick={() => onCmd('dir:phase', { phase: ph })}>{ph}</button>)}
        {['calmo','furioso','hambriento','burlon'].map((m) => <button key={m} className="btn ghost" onClick={() => onCmd('dir:mood', { mood: m })}>{m}</button>)}
        <button className="btn ghost" onClick={() => onCmd('dir:aiToggle', { on: false })}>Forzar fallbacks</button>
        <button className="btn ghost" onClick={() => onCmd('dir:aiToggle', { on: true })}>IA on</button>
      </div>
    </div>
  );
}