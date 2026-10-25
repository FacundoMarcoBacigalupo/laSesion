export default function Meter({ value = 0 }: { value?: number }) {
  return <div className="meter"><i style={{ width: value + '%' }} /></div>;
}