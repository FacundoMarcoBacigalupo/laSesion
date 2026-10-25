interface Props { prompt: any }
export default function PromptViewer({ prompt }: Props) {
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Prompt actual a Gemini</h3>
      <pre style={{ maxHeight: 220, fontSize: 11, overflow: 'auto', background: '#000', padding: 8, borderRadius: 8 }}>
        {JSON.stringify(prompt, null, 2)}
      </pre>
    </div>
  );
}