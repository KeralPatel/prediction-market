import { MacroIndicator } from "@/types";

interface Props {
  indicators: MacroIndicator[];
}

export default function MacroBar({ indicators }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${indicators.length}, 1fr)`,
        gap: 1,
        background: "#1e293b",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {indicators.map((m) => (
        <div
          key={m.label}
          style={{ background: "#111827", padding: "14px 16px", textAlign: "center" }}
        >
          <div style={{ color: "#64748b", fontSize: 10, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
            {m.label}
          </div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{m.value}</div>
          <div
            style={{
              color: m.up === null ? "#64748b" : m.up ? "#10b981" : "#ef4444",
              fontSize: 11,
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {m.chg}
          </div>
        </div>
      ))}
    </div>
  );
}
