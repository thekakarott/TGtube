export default function Spinner({ text }: { text?: string }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "var(--text-sub)" }}>
      <div style={{ width: 24, height: 24, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
      {text && <div style={{ fontSize: 13 }}>{text}</div>}
    </div>
  );
}
