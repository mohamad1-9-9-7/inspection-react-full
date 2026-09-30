// src/companies/exaltis/certs/view/CertFilters.jsx
// Certificates view — filters, sort and actions.
// (Extracted from CertView.jsx — the code is unchanged.)
import { selectStyle } from "./certViewUi";
import { SORT_OPTIONS } from "./certViewModel";

export function CertFilters({ branchFilter, setBranchFilter, branchList, courseFilter, setCourseFilter, courseList, nationalityFilter, setNationalityFilter, nationalityList, sortBy, setSortBy, groupByBranch, setGroupByBranch, clearAllFilters, exportCSV, printList }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <select
        value={branchFilter}
        onChange={(e) => setBranchFilter(e.target.value)}
        style={selectStyle}
        title="Filter by Branch"
      >
        <option value="">🏢 All Branches</option>
        {branchList.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>

      <select
        value={courseFilter}
        onChange={(e) => setCourseFilter(e.target.value)}
        style={selectStyle}
        title="Filter by Course Type"
      >
        <option value="">🎓 All Courses</option>
        {courseList.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={nationalityFilter}
        onChange={(e) => setNationalityFilter(e.target.value)}
        style={selectStyle}
        title="Filter by Nationality"
      >
        <option value="">🌍 All Nationalities</option>
        {nationalityList.map((n) => (
          <option key={n} value={n}>
            {n}
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
    </div>
  );
}
