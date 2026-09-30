// src/companies/exaltis/training/sessions/SessionsToolbar.jsx
// Training sessions — smart filter and sort toolbar.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)

export function SessionsToolbar({ THEME, q, setQ, inputStyle, visible, rows, clearAllFilters, activeFilterCount, sortBy, btn, fieldLabel, setSortBy, selectStyle, fBranch, setFBranch, branchOptions, fModule, setFModule, moduleOptions, setFQuiz, fQuiz, dateFrom, dateTo, setDateFrom, setDateTo }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${THEME.glassBd}`,
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        boxShadow: THEME.glassShadow,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Row 1: search + count + clear all */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔎 Search by Branch / Module / Title / Date…"
          style={{ ...inputStyle, flex: 1, minWidth: 240 }}
        />
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: 800,
            color: "#1e40af",
            background: "#eef4fc",
            border: "1px solid #cdddf5",
            padding: "8px 12px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          {visible.length} / {rows.length} session(s)
        </span>
        <button
          onClick={clearAllFilters}
          disabled={activeFilterCount === 0 && sortBy === "newest"}
          style={{
            ...btn("gray"),
            opacity: activeFilterCount === 0 && sortBy === "newest" ? 0.5 : 1,
            cursor:
              activeFilterCount === 0 && sortBy === "newest"
                ? "not-allowed"
                : "pointer",
          }}
          title="Reset all filters & sorting"
        >
          ✕ Clear all{activeFilterCount ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {/* Row 2: smart controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div>
          <label style={fieldLabel}>↕ Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={selectStyle}
          >
            <option value="newest">📅 Newest first</option>
            <option value="oldest">📅 Oldest first</option>
            <option value="title">🔤 Title (A→Z)</option>
            <option value="branch">🏢 Branch (A→Z)</option>
            <option value="module">📚 Module (A→Z)</option>
            <option value="participants">👥 Most participants</option>
            <option value="passrate">✅ Best pass rate</option>
          </select>
        </div>

        <div>
          <label style={fieldLabel}>🏢 Branch</label>
          <select
            value={fBranch}
            onChange={(e) => setFBranch(e.target.value)}
            style={selectStyle}
          >
            <option value="">All branches</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={fieldLabel}>📚 Module</label>
          <select
            value={fModule}
            onChange={(e) => setFModule(e.target.value)}
            style={selectStyle}
          >
            <option value="">All modules</option>
            {moduleOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={fieldLabel}>📝 Quiz</label>
          <div
            style={{
              display: "flex",
              background: "#f1f5f9",
              border: `1px solid ${THEME.inputBd}`,
              borderRadius: 10,
              padding: 3,
              gap: 2,
            }}
          >
            {[
              { k: "all", t: "All" },
              { k: "with", t: "With" },
              { k: "without", t: "Without" },
            ].map((o) => (
              <button
                key={o.k}
                onClick={() => setFQuiz(o.k)}
                style={{
                  border: "none",
                  background: fQuiz === o.k ? "#fff" : "transparent",
                  color: fQuiz === o.k ? "#1e3a8a" : THEME.muted,
                  boxShadow:
                    fQuiz === o.k ? "0 1px 3px rgba(30,58,138,0.16)" : "none",
                  fontWeight: 900,
                  fontSize: 12,
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all .12s",
                }}
              >
                {o.t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={fieldLabel}>📆 From date</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            style={selectStyle}
          />
        </div>

        <div>
          <label style={fieldLabel}>📆 To date</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            style={selectStyle}
          />
        </div>
      </div>
    </div>
  );
}
