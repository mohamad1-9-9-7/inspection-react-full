// src/companies/exaltis/cars/pages/loadingReports/widgets.jsx
// Loading reports — gauge, sparkline and stat card.
// (Split out of LoadingReports.jsx — the code is unchanged.)

/* ====================== Tiny charts (no libs) ====================== */
export function GaugeCircle({ value = 72, size = 120, stroke = 12, color = "#5dade2", label = "" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const dash = (clamped / 100) * c;

  return (
    <div style={{ display: "grid", placeItems: "center" }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eee" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" style={{ fontWeight: 800, fill: "#1f2937" }}>
          {Math.round(clamped)}%
        </text>
      </svg>
      {label && <div style={{ marginTop: 6, fontWeight: 700, color: "#1f2937" }}>{label}</div>}
    </div>
  );
}

export function Sparkline({ points = [], width = 240, height = 60, stroke = "#7d3c98" }) {
  if (!points || points.length === 0) {
    return <div style={{ height, display: "grid", placeItems: "center", color: "#6b7280" }}>—</div>;
  }
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(1, max - min);
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const ys = points.map((v) => {
    const norm = (v - min) / range;
    return height - norm * height;
  });
  const d = ys.map((y, i) => `${i * step},${y}`).join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={d} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

export function StatCard({ title, value, suffix = "", hint = "" }) {
  return (
    <div className="panel" style={{ padding: 14, borderRadius: 14, minWidth: 180, background: "rgba(255,255,255,0.85)" }}>
      <div style={{ fontWeight: 800, color: "#7c3aed", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: "1.8em", fontWeight: 900, color: "#0f172a" }}>
        {value}
        {suffix}
      </div>
      {hint && <div style={{ color: "#6b7280", fontSize: ".9em", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
