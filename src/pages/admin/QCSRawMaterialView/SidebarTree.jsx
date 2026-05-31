// SidebarTree.jsx
import React, { useMemo, useRef, useEffect } from "react";
import { monthNames } from "./viewUtils";
import "./QCSRawMaterialView.css";

const MONTH_SHORT = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default function SidebarTree({
  tree,
  selectedReportId,
  setSelectedReportId,
  loadingServer,
  serverErr,
  onRefresh,
  canExportPDF,
  onExportPDF,
  onExportExcel,
  searchTerm,
  setSearchTerm,
  onExportJSON,
  onImportJSON,
  getDisplayId,
  // filters
  statusFilter = "",    setStatusFilter,
  typeFilter   = "",    setTypeFilter,
  dateFrom     = "",    setDateFrom,
  dateTo       = "",    setDateTo,
  uniqueTypes  = [],
  filteredCount = 0,
  totalCount    = 0,
  // migration
  base64Count      = 0,
  migrating        = false,
  migrateProgress  = { done: 0, total: 0 },
  onMigrateBase64,
}) {
  const importRef = useRef(null);
  const [openYears,  setOpenYears]  = React.useState({});
  const [openMonths, setOpenMonths] = React.useState({});
  const [openDays,   setOpenDays]   = React.useState({});

  const yearsSorted = useMemo(
    () => Object.keys(tree).sort((a, b) => b.localeCompare(a)),
    [tree]
  );

  // Auto-expand latest year on first load
  const autoExpanded = useRef(false);
  useEffect(() => {
    if (autoExpanded.current || yearsSorted.length === 0) return;
    setOpenYears((p) => ({ ...p, [yearsSorted[0]]: true }));
    autoExpanded.current = true;
  }, [yearsSorted]);

  const countMonth = (year, m) => {
    const days = tree?.[year]?.[m] || {};
    let total = 0;
    Object.keys(days).forEach((d) => (total += (days[d] || []).length));
    return total;
  };
  const countYear = (year) => {
    const months = tree?.[year] || {};
    let total = 0;
    Object.keys(months).forEach((m) => (total += countMonth(year, m)));
    return total;
  };

  // Quick date helpers
  const today = new Date().toISOString().slice(0, 10);
  const applyQuick = (key) => {
    const now = new Date();
    if (key === "today") {
      setDateFrom(today); setDateTo(today);
    } else if (key === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      setDateFrom(d.toISOString().slice(0, 10));
      setDateTo(today);
    } else if (key === "month") {
      setDateFrom(`${today.slice(0, 7)}-01`);
      setDateTo(today);
    }
  };

  const hasFilters = statusFilter || typeFilter || dateFrom || dateTo;
  const clearFilters = () => {
    setStatusFilter(""); setTypeFilter("");
    setDateFrom("");     setDateTo("");
  };

  const isQuickActive = (key) => {
    const now = new Date();
    if (key === "today") return dateFrom === today && dateTo === today;
    if (key === "month") return dateFrom === `${today.slice(0,7)}-01` && dateTo === today;
    return false;
  };

  // chip color helper
  const chipClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "acceptable") return "qrm-chip qrm-chip--ok";
    if (s === "average")    return "qrm-chip qrm-chip--avg";
    return                         "qrm-chip qrm-chip--bad";
  };
  const chipLabel = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "acceptable") return "✅ OK";
    if (s === "average")    return "⚠️ AVG";
    return status ? "❌ NO" : "—";
  };

  return (
    <aside className="qrm-aside no-print">

      {/* ── Header ── */}
      <div className="qrm-sb-header">
        <h3 className="qrm-sb-title">📅 Timeline</h3>
        <span className="qrm-sb-total">
          {hasFilters ? `${filteredCount} / ${totalCount}` : `${totalCount} total`}
        </span>
      </div>

      {/* ── Action buttons ── */}
      <div className="qrm-actions-row">
        <button
          className="qrm-action-btn qrm-action-btn--refresh"
          onClick={onRefresh}
          title="Reload from server"
        >
          🔄 {loadingServer ? "Loading…" : "Refresh"}
        </button>
        <button
          className="qrm-action-btn qrm-action-btn--pdf"
          onClick={onExportPDF}
          disabled={!canExportPDF}
          title="Export selected report to PDF"
        >
          ⬇️ PDF
        </button>
        <button
          className="qrm-action-btn qrm-action-btn--excel"
          onClick={onExportExcel}
          title="Export filtered reports to Excel"
        >
          📊 Excel
        </button>
      </div>

      {/* ── Status messages ── */}
      {loadingServer && (
        <div className="qrm-status qrm-status--loading">⏳ Fetching from server…</div>
      )}
      {serverErr && (
        <div className="qrm-status qrm-status--error">{serverErr}</div>
      )}

      {/* ── Search ── */}
      <div className="qrm-search-wrap">
        <span className="qrm-search-icon">🔎</span>
        <input
          className="qrm-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="AWB / Invoice / Supplier / Status…"
        />
      </div>

      {/* ══ FILTERS ══ */}
      <div className="qrm-filters">
        {/* Status */}
        <div>
          <div className="qrm-filter-label">Status</div>
          <div className="qrm-status-chips">
            {[
              { key: "",           label: "All",        cls: "qrm-sc qrm-sc--all" },
              { key: "Acceptable", label: "✅ Accept",  cls: "qrm-sc qrm-sc--ok"  },
              { key: "Average",    label: "⚠️ Average", cls: "qrm-sc qrm-sc--avg" },
              { key: "Not OK",     label: "❌ Not OK",  cls: "qrm-sc qrm-sc--bad" },
            ].map(({ key, label, cls }) => (
              <button
                key={key}
                className={`${cls}${statusFilter === key ? " qrm-sc--active" : ""}`}
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Shipment type */}
        {uniqueTypes.length > 0 && (
          <div>
            <div className="qrm-filter-label">Shipment Type</div>
            <select
              className="qrm-filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        {/* Date range */}
        <div>
          <div className="qrm-filter-label">Date Range</div>
          <div className="qrm-date-row">
            <input
              type="date" className="qrm-filter-date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <input
              type="date" className="qrm-filter-date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
          </div>
        </div>

        {/* Quick buttons */}
        <div>
          <div className="qrm-quick-btns">
            {[
              { key: "today", label: "Today" },
              { key: "week",  label: "This Week" },
              { key: "month", label: "This Month" },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`qrm-qb${isQuickActive(key) ? " qrm-qb--active" : ""}`}
                onClick={() => applyQuick(key)}
              >
                {label}
              </button>
            ))}
            {hasFilters && (
              <button className="qrm-clear-filters" onClick={clearFilters}>
                ✕ Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══ TREE ══ */}
      <div className="qrm-tree-wrap">
        <div className="qrm-rail">
          <div className="qrm-rail-line" />

          {yearsSorted.map((year) => {
            const yearOpen  = !!openYears[year];
            const yearCount = countYear(year);

            return (
              <div key={year} className="qrm-node">
                <button
                  className={`qrm-node-btn qrm-node-btn--year${yearOpen ? " qrm-node-btn--open" : ""}`}
                  onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))}
                >
                  <span className="qrm-meta-row">
                    <span className="qrm-left-dot qrm-left-dot--year" />
                    <span className="qrm-node-label">📆 {year}</span>
                    <span className="qrm-count-pill">{yearCount}</span>
                  </span>
                  <span className="qrm-chevron">{yearOpen ? "▾" : "▸"}</span>
                </button>

                {yearOpen && (
                  <div className="qrm-children">
                    {Object.keys(tree[year])
                      .sort((a, b) => b.localeCompare(a))
                      .map((m) => {
                        const ym        = `${year}-${m}`;
                        const monthOpen = !!openMonths[ym];
                        const mIdx      = parseInt(m, 10) - 1;
                        const mShort    = MONTH_SHORT[mIdx] || m;
                        const mFull     = monthNames[mIdx]  || m;
                        const mCount    = countMonth(year, m);

                        return (
                          <div key={ym} className="qrm-node">
                            <button
                              className={`qrm-node-btn qrm-node-btn--month${monthOpen ? " qrm-node-btn--open" : ""}`}
                              onClick={() => setOpenMonths((p) => ({ ...p, [ym]: !p[ym] }))}
                            >
                              <span className="qrm-meta-row">
                                <span className="qrm-left-dot qrm-left-dot--month" />
                                <span className="qrm-node-label" title={mFull}>
                                  🗓 {mShort} {year}
                                </span>
                                <span className="qrm-count-pill">{mCount}</span>
                              </span>
                              <span className="qrm-chevron">{monthOpen ? "▾" : "▸"}</span>
                            </button>

                            {monthOpen && (
                              <div className="qrm-children">
                                {Object.keys(tree[year][m])
                                  .sort((a, b) => b.localeCompare(a))
                                  .map((d) => {
                                    const ymd      = `${ym}-${d}`;
                                    const dayOpen  = !!openDays[ymd];
                                    const dayReports = tree[year][m][d] || [];

                                    return (
                                      <div key={ymd} className="qrm-node">
                                        <button
                                          className={`qrm-node-btn qrm-node-btn--day${dayOpen ? " qrm-node-btn--open" : ""}`}
                                          onClick={() => setOpenDays((p) => ({ ...p, [ymd]: !p[ymd] }))}
                                        >
                                          <span className="qrm-meta-row">
                                            <span className="qrm-left-dot qrm-left-dot--day" />
                                            <span className="qrm-node-label">
                                              {mShort} {d}, {year}
                                            </span>
                                            <span className="qrm-count-pill">{dayReports.length}</span>
                                          </span>
                                          <span className="qrm-chevron">{dayOpen ? "▾" : "▸"}</span>
                                        </button>

                                        {dayOpen && (
                                          <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                                            {dayReports.map((r, idx) => {
                                              const key    = `${ymd}-${r.id || idx}`;
                                              const active = selectedReportId === r.id;
                                              return (
                                                <button
                                                  key={key}
                                                  className={`qrm-report-btn${active ? " qrm-report-btn--active" : ""}`}
                                                  onClick={() => setSelectedReportId(r.id)}
                                                  title={getDisplayId(r)}
                                                >
                                                  <div className="qrm-report-left">
                                                    <div className="qrm-report-top-line">
                                                      <span className="qrm-report-id">{getDisplayId(r)}</span>
                                                      {r.sequence && (
                                                        <span className="qrm-report-seq">#{r.sequence}</span>
                                                      )}
                                                    </div>
                                                    {r.shipmentType && (
                                                      <span className="qrm-report-type">{r.shipmentType}</span>
                                                    )}
                                                  </div>
                                                  <span className={chipClass(r.status)}>
                                                    {chipLabel(r.status)}
                                                  </span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}

          {yearsSorted.length === 0 && (
            <p style={{ textAlign:"center", color:"#6b7280", fontWeight:700, padding:"16px 0", fontSize:13 }}>
              {loadingServer ? "Loading…" : "No reports found."}
            </p>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="qrm-footer-wrap">
        <button className="qrm-footer-btn qrm-footer-btn--export" onClick={onExportJSON}>
          ⬇️ Export JSON backup
        </button>

        <button className="qrm-footer-btn qrm-footer-btn--import" onClick={() => importRef.current?.click()}>
          ⬆️ Import JSON
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          onChange={(e) => { onImportJSON(e); if (importRef.current) importRef.current.value = ""; }}
          style={{ display: "none" }}
        />

        {/* ── Migrate base64 → Cloudinary ── always visible ── */}
        <div
          style={{
            padding: "10px 12px", borderRadius: 12,
            border: "1px solid",
            color: "#fff",
            background: migrating
              ? "linear-gradient(135deg,#1e40af,#3b82f6)"
              : base64Count > 0
              ? "linear-gradient(135deg,#b45309,#f59e0b)"
              : "linear-gradient(135deg,#374151,#6b7280)",
            borderColor: migrating ? "#1e3a8a" : base64Count > 0 ? "#92400e" : "#374151",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 6, opacity: .92 }}>
            {migrating
              ? `⏳ Migrating… ${migrateProgress.done} / ${migrateProgress.total}`
              : base64Count > 0
              ? `⚠️ ${base64Count} cert${base64Count > 1 ? "s" : ""} still base64`
              : "☁️ Migrate base64 → Cloudinary"}
          </div>

          {migrating && migrateProgress.total > 0 && (
            <div style={{ height:6, borderRadius:99, background:"rgba(255,255,255,.25)", marginBottom:8, overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:99, background:"#fff",
                width:`${Math.round((migrateProgress.done/migrateProgress.total)*100)}%`,
                transition:"width .3s ease",
              }}/>
            </div>
          )}

          <button
            onClick={onMigrateBase64}
            disabled={migrating}
            style={{
              width:"100%", padding:"8px 0", borderRadius:10,
              border:"1px solid rgba(255,255,255,.35)",
              background: migrating ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.18)",
              color:"#fff", fontWeight:900, cursor: migrating ? "not-allowed" : "pointer",
              fontSize:13, opacity: migrating ? .6 : 1,
            }}
          >
            {migrating ? "Running…" : base64Count > 0 ? `☁️ Migrate ${base64Count} cert${base64Count>1?"s":""}` : "☁️ Scan & Migrate"}
          </button>
        </div>
      </div>
    </aside>
  );
}
