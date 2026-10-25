interface Props { n: number; total: number }
export default function HandsMeter({ n, total }: Props) {
  return <div>Manos en la mesa: <b>{n}</b> / {total}</div>;
}