interface Props {
  title: string;
  action?: React.ReactNode;
}

export default function SectionHeader({ title, action }: Props) {
  return (
    <div style={{
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: "var(--space-4)",
    }}>
      <h2 style={{
        fontSize: "var(--text-2xl)",
        fontWeight: 700,
        color: "var(--text)",
        lineHeight: 1.2,
      }}>{title}</h2>
      {action}
    </div>
  );
}
