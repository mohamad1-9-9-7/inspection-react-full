// src/companies/exaltis/ohc/view/OhcFilters.jsx
// OHC view — filters row.
// (Extracted from OHCView.jsx — the code is unchanged.)
import { selectStyle } from "./ohcViewUi";
import { BRANCHES, SORT_OPTIONS } from "./ohcViewModel";

export function OhcFilters({ branchFilter, setBranchFilter, branchList, resultFilter, setResultFilter, nationalityFilter, setNationalityFilter, nationalityList, jobFilter, setJobFilter, jobList, sortBy, setSortBy, groupByBranch, setGroupByBranch, groupByJob, setGroupByJob, clearAllFilters, exportCSV, printList, load, loading }) {
  return (
    <div
      style={{
        marginBottom: 12,
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        background:
          "linear-gradient(135deg,rgba(15,23,42,0.02),rgba(8,47,73,0.03))",
        padding: 10,
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.5)",
      }}
    >
      <select
        value={branchFilter}
        onChange={(e) => setBranchFilter(e.target.value)}
        style={selectStyle}
        title="Filter by Branch"
      >
        <option value="all">🏢 All Branches</option>
        {(branchList.length
          ? branchList
          : BRANCHES
        ).map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>

      <select
        value={resultFilter}
        onChange={(e) => setResultFilter(e.target.value)}
        style={selectStyle}
        title="Filter by Result"
      >
        <option value="all">🩺 All Results</option>
        <option value="FIT">FIT</option>
        <option value="UNFIT">UNFIT</option>
      </select>

      <select
        value={nationalityFilter}
        onChange={(e) => setNationalityFilter(e.target.value)}
        style={selectStyle}
        title="Filter by Nationality"
      >
        <option value="all">🌍 All Nationalities</option>
        {nationalityList.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <select
        value={jobFilter}
        onChange={(e) => setJobFilter(e.target.value)}
        style={{
          ...selectStyle,
          ...(jobFilter !== "all"
            ? {
                border: "1px solid #0369a1",
                background: "linear-gradient(135deg,#e0f2fe,#bae6fd)",
                fontWeight: 700,
              }
            : null),
        }}
        title="Filter by Occupation"
      >
        <option value="all">👷 All Occupations</option>
        {jobList.map((j) => (
          <option key={j.job} value={j.job}>
            {j.job} ({j.count})
          </option>
        ))}
      </select>

      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        style={selectStyle}
        title="Sort By"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            ↕ {o.label}
          </option>
        ))}
      </select>

      <label
        style={{
          display: "inline-flex",
          gap: 6,
          alignItems: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#374151",
          padding: "4px 10px",
          borderRadius: 999,
          background: groupByBranch
            ? "linear-gradient(135deg,#dbeafe,#bfdbfe)"
            : "transparent",
          border: "1px solid rgba(148,163,184,0.7)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={groupByBranch}
          onChange={(e) => setGroupByBranch(e.target.checked)}
          style={{ margin: 0 }}
        />
        Group by Branch
      </label>

      <label
        style={{
          display: "inline-flex",
          gap: 6,
          alignItems: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "#374151",
          padding: "4px 10px",
          borderRadius: 999,
          background: groupByJob
            ? "linear-gradient(135deg,#e0f2fe,#bae6fd)"
            : "transparent",
          border: "1px solid rgba(148,163,184,0.7)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={groupByJob}
          onChange={(e) => setGroupByJob(e.target.checked)}
          style={{ margin: 0 }}
        />
        Group by Occupation
      </label>

      <button
        type="button"
        onClick={clearAllFilters}
        style={{
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px solid rgba(107,114,128,0.7)",
          background: "linear-gradient(135deg,#f3f4f6,#e5e7eb)",
          color: "#111827",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        ✕ Clear Filters
      </button>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={exportCSV}
        style={{
          padding: "6px 12px",
          borderRadius: 999,
          border: "none",
          background: "linear-gradient(135deg,#10b981,#047857)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 10px rgba(16,185,129,0.35)",
        }}
      >
        ⬇ Export CSV
      </button>

      <button
        type="button"
        onClick={printList}
        style={{
          padding: "6px 12px",
          borderRadius: 999,
          border: "none",
          background: "linear-gradient(135deg,#6366f1,#4338ca)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 10px rgba(99,102,241,0.35)",
        }}
      >
        🖨 Print
      </button>

      <button
        onClick={load}
        disabled={loading}
        style={{
          padding: "6px 14px",
          background: loading
            ? "linear-gradient(135deg,#38bdf8,#0ea5e9)"
            : "linear-gradient(135deg,#38bdf8,#0ea5e9,#0369a1)",
          color: "#f9fafb",
          border: 0,
          borderRadius: 999,
          fontWeight: 700,
          fontSize: 11,
          cursor: "pointer",
          boxShadow: "0 4px 10px rgba(14,165,233,0.45)",
          opacity: loading ? 0.9 : 1,
        }}
      >
        {loading ? "Refreshing..." : "↻ Refresh"}
      </button>
    </div>
  );
}
