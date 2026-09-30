// src/companies/exaltis/training/annualPlan/PlanTopBar.jsx
// Annual training plan — Top bar: year, actions and summary.
// (Extracted from TrainingAnnualPlan.jsx — the code is unchanged.)
import { btn, inputSt, C, StatBlock } from "./planUi";
import { REPORTS_URL, TYPE } from "./planApi";

export function PlanTopBar({ setYear, year, currentYear, stats, showActual, setShowActual, applyDefault, fillEmptyWithDefault, clearAll, loadAll, handlePrint, handleSave, saving, loading, planId, navigate }) {
  return (
    <div className="no-print" style={{
      background: "linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%)",
      border: "1px solid rgba(255,255,255,.25)",
      borderRadius: 6,
      padding: "10px 14px",
      boxShadow: "0 22px 50px rgba(15,23,42,.16)",
      display: "flex",
      gap: 12,
      alignItems: "center",
      flexWrap: "wrap",
      color: "#fff",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="annual-plan-icon" style={{
          width: 44, height: 44, borderRadius: 12,
          background: "linear-gradient(135deg,#06b6d4,#6366f1)",
          display: "grid", placeItems: "center", fontSize: 22,
          boxShadow: "0 8px 20px rgba(99,102,241,0.45)",
        }}>📅</div>
        <div>
          <div className="annual-plan-title" style={{ fontSize: 18, fontWeight: 1000, letterSpacing: 0.3 }}>
            Annual Training Plan
          </div>
          <div style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 700 }}>
            Branches × Months · click any cell to edit modules
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Year selector */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "rgba(255,255,255,0.10)",
        padding: 4,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.15)",
      }}>
        <button
          onClick={() => setYear((y) => y - 1)}
          style={{ ...btn("rgba(255,255,255,0.10)", "#fff"), padding: "6px 10px", boxShadow: "none" }}
          title="Previous year"
        >‹</button>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ ...inputSt, fontWeight: 1000, fontSize: 14, padding: "6px 8px", color: C.ink, minWidth: 96 }}
        >
          {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={() => setYear((y) => y + 1)}
          style={{ ...btn("rgba(255,255,255,0.10)", "#fff"), padding: "6px 10px", boxShadow: "none" }}
          title="Next year"
        >›</button>
      </div>

      {/* Stats — plan vs actual */}
      <div style={{
        display: "flex", alignItems: "stretch", gap: 0,
        padding: 0,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        fontSize: 11, fontWeight: 800,
        overflow: "hidden",
      }}>
        <StatBlock label="Planned" value={stats.plannedItems} color="#bfdbfe" />
        <StatBlock label="Delivered" value={stats.deliveredItems} color="#a7f3d0" />
        <StatBlock label="Missing" value={stats.missingItems} color="#fecaca" highlight={stats.missingItems > 0} />
        <StatBlock label="Extra" value={stats.extraItems} color="#fde68a" />
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px",
          background: "linear-gradient(135deg,#10b981,#059669)",
          color: "#fff",
          fontWeight: 1000,
          fontSize: 13,
        }}>
          <span style={{ fontSize: 10, opacity: 0.85, letterSpacing: 0.5 }}>COVERAGE</span>
          <span>{stats.coverage}%</span>
        </div>
      </div>

      {/* Toggle: show actual */}
      <label style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 12px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        fontSize: 11, fontWeight: 800,
        cursor: "pointer",
      }} title="Show / hide delivery status on cells">
        <input
          type="checkbox"
          checked={showActual}
          onChange={(e) => setShowActual(e.target.checked)}
          style={{ accentColor: "#10b981" }}
        />
        <span>Link to actual sessions</span>
      </label>

      <button onClick={applyDefault} style={btn("#f59e0b")} title="Apply default monthly focus to ALL cells (overwrites)">
        ✨ Apply Default
      </button>
      <button onClick={fillEmptyWithDefault} style={btn("#10b981")} title="Fill ONLY empty cells with default — keeps filled cells">
        🌱 Fill Empty
      </button>
      <button onClick={clearAll} style={btn("#fee2e2", C.red)}>🗑 Clear</button>
      <button
        onClick={() => loadAll(year)}
        style={btn("rgba(255,255,255,0.14)", "#fff")}
        title="Reload plan and actual sessions"
      >🔄 Refresh</button>
      <button onClick={handlePrint} style={btn(C.purple)}>🖨 Print</button>
      <button
        onClick={handleSave}
        disabled={saving || loading}
        style={btn("linear-gradient(135deg,#10b981,#059669)", "#fff", saving || loading)}
        title={`Saves to ${REPORTS_URL} as type "${TYPE}"`}
      >
        {saving ? "Saving…" : planId ? "💾 Update" : "💾 Save"}
      </button>
      <button onClick={() => navigate(-1)} style={btn("rgba(255,255,255,0.14)", "#fff")}>↩ Back</button>
    </div>
  );
}
