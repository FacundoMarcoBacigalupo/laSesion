interface Props { total: number; hands: number; queue: number; ghosts: number; phase: string; mood: string; exorcism: number; ai: string }
export default function Kpis({ total, hands, queue, ghosts, phase, mood, exorcism, ai }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10 }}>
      <div className="card"><b>{total}</b><br />Conectados</div>
      <div className="card"><b>{hands}</b><br />Sosteniendo</div>
      <div className="card"><b>{queue}</b><br />Preguntas</div>
      <div className="card"><b>{ghosts}</b><br />Fantasmas</div>
      <div className="card"><b>{phase}</b><br />Fase</div>
      <div className="card"><b>{mood}</b><br />Humor</div>
      <div className="card"><b>{exorcism}%</b><br />Exorcismo</div>
      <div className="card"><b>{ai}</b><br />IA</div>
    </div>
  );
}