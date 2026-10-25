export default function Button({ children, ...props }: any) {
  return <button className="btn" {...props}>{children}</button>;
}