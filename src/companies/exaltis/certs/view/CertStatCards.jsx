// src/companies/exaltis/certs/view/CertStatCards.jsx
// Certificates view — stat cards.
// (Extracted from CertView.jsx — the code is unchanged.)
import { StatCard } from "./certViewUi";

export function CertStatCards({ stats, statusFilter, setStatusFilter }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <StatCard
        label="Total"
        value={stats.total}
        color="#1d4ed8"
        icon="📋"
        active={statusFilter === "all"}
        onClick={() => setStatusFilter("all")}
      />
      <StatCard
        label="Expired"
        value={stats.expired}
        color="#b91c1c"
        icon="⛔"
        active={statusFilter === "expired"}
        onClick={() => setStatusFilter("expired")}
      />
      <StatCard
        label="Expiring ≤ 30d"
        value={stats.expiring_soon}
        color="#c2410c"
        icon="⚠️"
        active={statusFilter === "expiring_soon"}
        onClick={() => setStatusFilter("expiring_soon")}
      />
      <StatCard
        label="Expiring ≤ 90d"
        value={stats.expiring}
        color="#a16207"
        icon="⏳"
        active={statusFilter === "expiring"}
        onClick={() => setStatusFilter("expiring")}
      />
      <StatCard
        label="Valid"
        value={stats.valid}
        color="#15803d"
        icon="✅"
        active={statusFilter === "valid"}
        onClick={() => setStatusFilter("valid")}
      />
      <StatCard
        label="No Expiry"
        value={stats.no_expiry}
        color="#6b7280"
        icon="∞"
        active={statusFilter === "no_expiry"}
        onClick={() => setStatusFilter("no_expiry")}
      />
      <StatCard
        label="Left Company"
        value={stats.left_company}
        color="#7c2d12"
        icon="🚪"
        active={statusFilter === "left_company"}
        onClick={() => setStatusFilter("left_company")}
      />
    </div>
  );
}
