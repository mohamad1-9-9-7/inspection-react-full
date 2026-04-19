// SidebarTree.jsx
import React, { useMemo, useRef } from "react";
import { monthNames } from "./viewUtils";

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

  const styles = {
    aside: {
      flex: "0 0 320px",
      maxHeight: "80vh",
      overflowY: "auto",
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      boxShadow: "0 12px 28px rgba(2,6,23,0.08)",
      padding: 14,
    },

    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 10,
      padding: "6px 4px",
    },
    title: {
      margin: 0,
      color: "#0f172a",
      fontWeight: 900,
      letterSpacing: 0.2,
      fontSize: "1.05rem",
    },
    badge: {
      padding: "6px 10px",
      borderRadius: 999,
      fontWeight: 900,
      fontSize: 12,
      background: "#111827",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.12)",
      whiteSpace: "nowrap",
    },

    actionsRow: { display: "flex", gap: 8, marginBottom: 10 },
    actionBtn: (variant, disabled) => {
      const base = {
        flex: 1,
        padding: "10px 12px",
        borderRadius: 12,
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "1px solid #e5e7eb",
        boxShadow: "0 6px 14px rgba(2,6,23,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "transform .12s ease, box-shadow .12s ease",
      };

      const variants = {
        refresh: {
          background: disabled ? "#cbd5e1" : "linear-gradient(135deg,#10b981,#0ea5e9)",
          color: "#fff",
          border: "1px solid rgba(15,118,110,0.35)",
        },
        pdf: {
          background: disabled ? "#c7d2fe" : "linear-gradient(135deg,#0ea5e9,#6366f1)",
          color: "#fff",
          border: "1px solid rgba(29,78,216,0.35)",
        },
      };
      return { ...base, ...variants[variant] };
    },

    status: (type) => ({
      marginBottom: 10,
      padding: "10px 12px",
      borderRadius: 12,
      fontWeight: 900,
      border: "1px solid",
      background:
        type === "loading"
          ? "linear-gradient(180deg,#ecfeff,#f0f9ff)"
          : "linear-gradient(180deg,#fff1f2,#ffe4e6)",
      borderColor: type === "loading" ? "#67e8f9" : "#fecaca",
      color: type === "loading" ? "#0369a1" : "#b91c1c",
      boxShadow: "0 6px 14px rgba(2,6,23,0.05)",
    }),

    searchWrap: {
      position: "relative",
      marginBottom: 12,
    },
    searchInput: {
      width: "100%",
      padding: "12px 12px 12px 40px",
      borderRadius: 14,
      border: "1px solid #e5e7eb",
      outline: "none",
      background: "#fff",
      boxShadow: "0 6px 14px rgba(2,6,23,0.05)",
      fontWeight: 700,
    },
    searchIcon: {
      position: "absolute",
      left: 12,
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: 16,
      opacity: 0.75,
    },

    treeWrap: {
      padding: 8,
      borderRadius: 14,
      border: "1px solid #e5e7eb",
      background: "rgba(255,255,255,0.75)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
    },

    // timeline line (left rail)
    rail: {
      position: "relative",
      paddingLeft: 14,
    },
    railLine: {
      position: "absolute",
      left: 6,
      top: 8,
      bottom: 8,
      width: 2,
      background: "linear-gradient(180deg,#c7d2fe,#bae6fd,#bbf7d0)",
      borderRadius: 99,
      opacity: 0.85,
    },

    // Year / Month / Day cards
    node: {
      marginBottom: 10,
    },
    nodeBtn: (level, open) => {
      const base = {
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        background: "#fff",
        cursor: "pointer",
        fontWeight: 900,
        color: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        boxShadow: "0 10px 22px rgba(2,6,23,0.06)",
        transition: "transform .12s ease, box-shadow .12s ease",
      };

      const tint =
        level === "year"
          ? { background: open ? "linear-gradient(180deg,#eef2ff,#ffffff)" : "#fff" }
          : level === "month"
          ? { background: open ? "linear-gradient(180deg,#eff6ff,#ffffff)" : "#fff" }
          : { background: open ? "linear-gradient(180deg,#ecfeff,#ffffff)" : "#fff" };

      return { ...base, ...tint };
    },

    leftDot: (level) => ({
      width: 10,
      height: 10,
      borderRadius: 999,
      background:
        level === "year" ? "#6366f1" : level === "month" ? "#0ea5e9" : "#10b981",
      boxShadow: "0 0 0 4px rgba(99,102,241,0.12)",
      flex: "0 0 auto",
    }),

    metaRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      minWidth: 0,
    },
    label: {
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    countPill: {
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      border: "1px solid #e5e7eb",
      background: "#f8fafc",
      color: "#0f172a",
      whiteSpace: "nowrap",
    },
    chevron: {
      width: 30,
      height: 30,
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      background: "#fff",
      display: "grid",
      placeItems: "center",
      fontWeight: 900,
      color: "#0f172a",
      flex: "0 0 auto",
    },

    children: {
      marginTop: 8,
      marginLeft: 10,
      paddingLeft: 10,
      borderLeft: "2px dashed rgba(148,163,184,0.6)",
    },

    // report item button
    reportBtn: (active) => ({
      width: "100%",
      padding: "10px 10px",
      borderRadius: 14,
      cursor: "pointer",
      border: active ? "2px solid #111827" : "1px solid #e5e7eb",
      background: active ? "linear-gradient(180deg,#f1f5f9,#ffffff)" : "#fff",
      boxShadow: active ? "0 10px 20px rgba(2,6,23,0.10)" : "0 6px 14px rgba(2,6,23,0.05)",
      fontWeight: active ? 900 : 700,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      textAlign: "left",
      color: "#0f172a",
      gap: 10,
    }),
    reportLeft: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 },
    reportTopLine: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      minWidth: 0,
    },
    small: { fontSize: 12, opacity: 0.78, fontWeight: 800, whiteSpace: "nowrap" },
    reportId: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    statusChip: (status) => {
      const s = String(status || "").toLowerCase();
      const ok = s === "acceptable";
      const mid = s === "average";
      const bg = ok ? "#dcfce7" : mid ? "#fef9c3" : "#fee2e2";
      const br = ok ? "#86efac" : mid ? "#fde68a" : "#fecaca";
      const fg = ok ? "#166534" : mid ? "#854d0e" : "#991b1b";
      const txt = ok ? "ACCEPT" : mid ? "AVERAGE" : "NOT OK";
      const icon = ok ? "✅" : mid ? "⚠️" : "❌";
      return {
        background: bg,
        border: `1px solid ${br}`,
        color: fg,
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 6,
      };
      // eslint-disable-next-line no-unreachable
      return { txt, icon };
    },

    footerWrap: {
      marginTop: 12,
      paddingTop: 12,
      borderTop: "1px dashed #cbd5e1",
    },
    footerBtn: (variant) => ({
      padding: 10,
      borderRadius: 12,
      width: "100%",
      fontWeight: 900,
      border: "1px solid",
      cursor: "pointer",
      boxShadow: "0 8px 18px rgba(2,6,23,0.06)",
      background:
        variant === "export"
          ? "linear-gradient(135deg,#111827,#334155)"
          : "linear-gradient(135deg,#16a34a,#22c55e)",
      color: "#fff",
      borderColor: variant === "export" ? "#111827" : "#15803d",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    }),
  };

  return (
    <aside className="no-print" style={styles.aside}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>📅 Reports Timeline</h3>
        <span style={styles.badge}>{yearsSorted.reduce((a, y) => a + countYear(y), 0)} total</span>
      </div>

      {/* Actions */}
      <div style={styles.actionsRow}>
        <button onClick={onRefresh} style={styles.actionBtn("refresh", false)} title="Reload">
          🔄 Refresh
        </button>
        <button
          onClick={onExportPDF}
          disabled={!canExportPDF}
          style={styles.actionBtn("pdf", !canExportPDF)}
          title="Export selected report to PDF"
        >
          ⬇️ PDF
        </button>
      </div>

      {loadingServer && <div style={styles.status("loading")}>⏳ Fetching from server…</div>}
      {serverErr && <div style={styles.status("error")}>{serverErr}</div>}

      {/* Search */}
      <div style={styles.searchWrap}>
        <span style={styles.searchIcon}>🔎</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search (AWB / Invoice / Key)"
          style={styles.searchInput}
        />
      </div>

      {/* Tree */}
      <div style={styles.treeWrap}>
        <div style={styles.rail}>
          <div style={styles.railLine} />

          {yearsSorted.map((year) => {
            const yearOpen = !!openYears[year];
            const yearCount = countYear(year);

            return (
              <div key={year} style={styles.node}>
                <button
                  onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))}
                  style={styles.nodeBtn("year", yearOpen)}
                >
                  <span style={styles.metaRow}>
                    <span style={styles.leftDot("year")} />
                    <span style={styles.label}>Year {year}</span>
                    <span style={styles.countPill}>{yearCount}</span>
                  </span>
                  <span style={styles.chevron}>{yearOpen ? "▾" : "▸"}</span>
                </button>

                {yearOpen && (
                  <div style={styles.children}>
                    {Object.keys(tree[year])
                      .sort((a, b) => b.localeCompare(a))
                      .map((m) => {
                        const ym = `${year}-${m}`;
                        const monthOpen = !!openMonths[ym];
                        const monthLabel = monthNames[parseInt(m, 10) - 1] || m;
                        const monthCount = countMonth(year, m);

                        return (
                          <div key={ym} style={styles.node}>
                            <button
                              onClick={() => setOpenMonths((p) => ({ ...p, [ym]: !p[ym] }))}
                              style={styles.nodeBtn("month", monthOpen)}
                            >
                              <span style={styles.metaRow}>
                                <span style={styles.leftDot("month")} />
                                <span style={styles.label}>
                                  {monthLabel} <span style={{ opacity: 0.7, fontWeight: 900 }}>({m})</span>
                                </span>
                                <span style={styles.countPill}>{monthCount}</span>
                              </span>
                              <span style={styles.chevron}>{monthOpen ? "▾" : "▸"}</span>
                            </button>

                            {monthOpen && (
                              <div style={styles.children}>
                                {Object.keys(tree[year][m])
                                  .sort((a, b) => b.localeCompare(a))
                                  .map((d) => {
                                    const ymd = `${ym}-${d}`;
                                    const dayOpen = !!openDays[ymd];
                                    const dayReports = tree[year][m][d] || [];

                                    return (
                                      <div key={ymd} style={styles.node}>
                                        <button
                                          onClick={() => setOpenDays((p) => ({ ...p, [ymd]: !p[ymd] }))}
                                          style={styles.nodeBtn("day", dayOpen)}
                                        >
                                          <span style={styles.metaRow}>
                                            <span style={styles.leftDot("day")} />
                                            <span style={styles.label}>
                                              {year}-{m}-{d}
                                            </span>
                                            <span style={styles.countPill}>{dayReports.length}</span>
                                          </span>
                                          <span style={styles.chevron}>{dayOpen ? "▾" : "▸"}</span>
                                        </button>

                                        {dayOpen && (
                                          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                                            {dayReports.map((r, idx) => {
                                              const uniqueKey = `${ymd}-${r.id || "noid"}-${
                                                r.serverId || "nosid"
                                              }-${r.uniqueKey || "nokey"}-${idx}`;

                                              const active = selectedReportId === r.id;
                                              const statusStyle = styles.statusChip(r.status);
                                              const s = String(r.status || "").toLowerCase();
                                              const ok = s === "acceptable";
                                              const mid = s === "average";
                                              const chipTxt = ok ? "ACCEPT" : mid ? "AVERAGE" : "NOT OK";
                                              const chipIcon = ok ? "✅" : mid ? "⚠️" : "❌";

                                              return (
                                                <button
                                                  key={uniqueKey}
                                                  onClick={() => setSelectedReportId(r.id)}
                                                  title={`Open report ${getDisplayId(r)}`}
                                                  style={styles.reportBtn(active)}
                                                >
                                                  <div style={styles.reportLeft}>
                                                    <div style={styles.reportTopLine}>
                                                      <span style={styles.reportId}>{getDisplayId(r)}</span>
                                                      {r.sequence ? (
                                                        <span style={styles.small}># {r.sequence}</span>
                                                      ) : null}
                                                    </div>
                                                    {r.shipmentType ? (
                                                      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>
                                                        {r.shipmentType}
                                                      </div>
                                                    ) : null}
                                                  </div>

                                                  <span style={statusStyle}>
                                                    <span>{chipIcon}</span>
                                                    <span>{chipTxt}</span>
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
      <div style={styles.footerWrap}>
        <button onClick={onExportJSON} style={styles.footerBtn("export")}>
          ⬇️ Export reports (JSON)
        </button>

        <div style={{ height: 8 }} />

        <button onClick={() => importRef.current?.click()} style={styles.footerBtn("import")}>
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
