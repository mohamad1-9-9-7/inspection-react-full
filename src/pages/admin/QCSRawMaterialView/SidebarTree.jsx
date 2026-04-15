// SidebarTree.jsx
import React, { useMemo, useRef } from "react";
import { monthNames } from "./viewUtils";
import Button from "../../../components/Button";

export default function SidebarTree({
  tree,
  selectedReportId,
  setSelectedReportId,
  loadingServer,
  serverErr,
  onRefresh,
  canExportPDF,
  onExportPDF,
  searchTerm,
  setSearchTerm,
  onExportJSON,
  onImportJSON,
  getDisplayId,
}) {
  const importRef = useRef(null);
  const [openYears, setOpenYears] = React.useState({});
  const [openMonths, setOpenMonths] = React.useState({});
  const [openDays, setOpenDays] = React.useState({});

  const yearsSorted = useMemo(
    () => Object.keys(tree).sort((a, b) => b.localeCompare(a)),
    [tree]
  );

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

  const getChipClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "acceptable") return "qrm-chip qrm-chip--ok";
    if (s === "average")    return "qrm-chip qrm-chip--avg";
    return "qrm-chip qrm-chip--bad";
  };

  const getChipLabel = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "acceptable") return { icon: "✅", txt: "ACCEPT" };
    if (s === "average")    return { icon: "⚠️", txt: "AVERAGE" };
    return { icon: "❌", txt: "NOT OK" };
  };

  return (
    <aside className="qrm-aside no-print">
      {/* Header */}
      <div className="qrm-sb-header">
        <h3 className="qrm-sb-title">📅 Reports Timeline</h3>
        <span className="qrm-sb-total">
          {yearsSorted.reduce((a, y) => a + countYear(y), 0)} total
        </span>
      </div>

      {/* Actions */}
      <div className="qrm-actions-row">
        <Button variant="success" size="sm" onClick={onRefresh} style={{ flex: 1 }}>
          🔄 Refresh
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!canExportPDF}
          onClick={onExportPDF}
          style={{ flex: 1 }}
        >
          ⬇️ PDF
        </Button>
      </div>

      {loadingServer && (
        <div className="qrm-status qrm-status--loading">⏳ Fetching from server…</div>
      )}
      {serverErr && (
        <div className="qrm-status qrm-status--error">{serverErr}</div>
      )}

      {/* Search */}
      <div className="qrm-search-wrap">
        <span className="qrm-search-icon">🔎</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search (AWB / Invoice / Key)"
          className="qrm-search-input"
        />
      </div>

      {/* Tree */}
      <div className="qrm-tree-wrap">
        <div className="qrm-rail">
          <div className="qrm-rail-line" />

          {yearsSorted.map((year) => {
            const yearOpen = !!openYears[year];
            const yearCount = countYear(year);

            return (
              <div key={year} className="qrm-node">
                <button
                  onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))}
                  className={`qrm-node-btn qrm-node-btn--year${yearOpen ? " qrm-node-btn--open" : ""}`}
                >
                  <span className="qrm-meta-row">
                    <span className="qrm-left-dot qrm-left-dot--year" />
                    <span className="qrm-node-label">Year {year}</span>
                    <span className="qrm-count-pill">{yearCount}</span>
                  </span>
                  <span className="qrm-chevron">{yearOpen ? "▾" : "▸"}</span>
                </button>

                {yearOpen && (
                  <div className="qrm-children">
                    {Object.keys(tree[year])
                      .sort((a, b) => b.localeCompare(a))
                      .map((m) => {
                        const ym = `${year}-${m}`;
                        const monthOpen = !!openMonths[ym];
                        const monthLabel = monthNames[parseInt(m, 10) - 1] || m;
                        const monthCount = countMonth(year, m);

                        return (
                          <div key={ym} className="qrm-node">
                            <button
                              onClick={() => setOpenMonths((p) => ({ ...p, [ym]: !p[ym] }))}
                              className={`qrm-node-btn qrm-node-btn--month${monthOpen ? " qrm-node-btn--open" : ""}`}
                            >
                              <span className="qrm-meta-row">
                                <span className="qrm-left-dot qrm-left-dot--month" />
                                <span className="qrm-node-label">
                                  {monthLabel}{" "}
                                  <span style={{ opacity: .7, fontWeight: 900 }}>({m})</span>
                                </span>
                                <span className="qrm-count-pill">{monthCount}</span>
                              </span>
                              <span className="qrm-chevron">{monthOpen ? "▾" : "▸"}</span>
                            </button>

                            {monthOpen && (
                              <div className="qrm-children">
                                {Object.keys(tree[year][m])
                                  .sort((a, b) => b.localeCompare(a))
                                  .map((d) => {
                                    const ymd = `${ym}-${d}`;
                                    const dayOpen = !!openDays[ymd];
                                    const dayReports = tree[year][m][d] || [];

                                    return (
                                      <div key={ymd} className="qrm-node">
                                        <button
                                          onClick={() => setOpenDays((p) => ({ ...p, [ymd]: !p[ymd] }))}
                                          className={`qrm-node-btn qrm-node-btn--day${dayOpen ? " qrm-node-btn--open" : ""}`}
                                        >
                                          <span className="qrm-meta-row">
                                            <span className="qrm-left-dot qrm-left-dot--day" />
                                            <span className="qrm-node-label">{year}-{m}-{d}</span>
                                            <span className="qrm-count-pill">{dayReports.length}</span>
                                          </span>
                                          <span className="qrm-chevron">{dayOpen ? "▾" : "▸"}</span>
                                        </button>

                                        {dayOpen && (
                                          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                                            {dayReports.map((r, idx) => {
                                              const uniqueKey = `${ymd}-${r.id || "noid"}-${r.serverId || "nosid"}-${r.uniqueKey || "nokey"}-${idx}`;
                                              const active = selectedReportId === r.id;
                                              const chip = getChipLabel(r.status);

                                              return (
                                                <button
                                                  key={uniqueKey}
                                                  onClick={() => setSelectedReportId(r.id)}
                                                  title={`Open report ${getDisplayId(r)}`}
                                                  className={`qrm-report-btn${active ? " qrm-report-btn--active" : ""}`}
                                                >
                                                  <div className="qrm-report-left">
                                                    <div className="qrm-report-top-line">
                                                      <span className="qrm-report-id">{getDisplayId(r)}</span>
                                                      {r.sequence && (
                                                        <span className="qrm-report-seq"># {r.sequence}</span>
                                                      )}
                                                    </div>
                                                    {r.shipmentType && (
                                                      <div className="qrm-report-type">{r.shipmentType}</div>
                                                    )}
                                                  </div>
                                                  <span className={getChipClass(r.status)}>
                                                    <span>{chip.icon}</span>
                                                    <span>{chip.txt}</span>
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
        </div>
      </div>

      {/* Footer */}
      <div className="qrm-footer-wrap">
        <button className="qrm-footer-btn qrm-footer-btn--export" onClick={onExportJSON}>
          ⬇️ Export reports (JSON)
        </button>

        <button className="qrm-footer-btn qrm-footer-btn--import" onClick={() => importRef.current?.click()}>
          ⬆️ Import reports
        </button>

        <input
          ref={importRef}
          type="file"
          accept="application/json"
          onChange={(e) => {
            onImportJSON(e);
            if (importRef.current) importRef.current.value = "";
          }}
          style={{ display: "none" }}
        />
      </div>
    </aside>
  );
}
