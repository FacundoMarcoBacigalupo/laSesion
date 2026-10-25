interface Props { value: number; color?: string }
export default function TensionBar({ value, color = 'var(--a)' }: Props) {
  return <div className="meter"><i style={{ width: value + '%', background: `linear-gradient(90deg,${color},var(--r))` }} /></div>;
}