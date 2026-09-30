// src/companies/exaltis/training/annualPlan/PlanMatrix.jsx
// Annual training plan — the printable plan matrix (branches × months).
// (Extracted from TrainingAnnualPlan.jsx — the code is unchanged.)
import { C, thBase, btn, tdBase, legendChip } from "./planUi";
import { SWEETS_MODULES } from "../content";
import { MONTHS, moduleMatchKey } from "./planModel";
import { getModuleNameShort } from "../TrainingSessionsList.helpers";

export function PlanMatrix({ loading, year, cellModuleChip, tableMinWidth, branchColWidth, monthColWidth, monthIsCurrent, copyMonthDown, displayBranches, planRowHeight, copyBranchAcross, matrix, editor, cellStatus, currentYear, showActual, setEditor, globalLang, sessions }) {
  return (
    <div
      className="print-area"
      style={{
        flex: 1,
        minHeight: 0,
        position: "relative",
        background: C.card,
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(2,6,23,0.35)",
        border: `1px solid ${C.line}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {loading && (
        <div className="no-print" style={{
          position: "absolute", inset: 0,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(2px)",
          zIndex: 50,
          display: "grid", placeItems: "center",
          color: C.navy, fontWeight: 1000, fontSize: 14,
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              border: `3px solid ${C.line}`, borderTopColor: C.blue,
              animation: "spin 0.7s linear infinite",
            }} />
            <div>Loading plan & actual sessions…</div>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>Fetching latest from server</div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {/* Header band */}
      <div style={{
        padding: "10px 14px",
        background: "linear-gradient(135deg,#0f172a,#1e293b)",
        color: "#fff",
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
        borderBottom: `1px solid ${C.line}`,
      }}>
        <div className="annual-plan-panel-title" style={{ fontWeight: 1000, fontSize: 15, letterSpacing: 0.3 }}>
          Annual Training Plan
        </div>
        <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 800 }}>· {year}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#cbd5e1", fontWeight: 800, flexWrap: "wrap" }}>
          <span><span style={{ ...cellModuleChip(SWEETS_MODULES[0]), padding: "1px 8px" }}>Food Safety</span></span>
          <span><span style={{ ...cellModuleChip("OHS:"), padding: "1px 8px" }}>OHS</span></span>
        </div>
      </div>

      {/* Table area — fills remaining height */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <table className="plan-table" style={{
          width: "100%",
          minWidth: tableMinWidth,
          height: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          tableLayout: "fixed",
        }}>
          <colgroup>
            <col style={{ width: branchColWidth }} />
            {MONTHS.map((mo) => (
              <col key={mo.i} style={{ width: monthColWidth }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={{
                ...thBase,
                position: "sticky",
                left: 0,
                top: 0,
                zIndex: 4,
                textAlign: "left",
                paddingLeft: 14,
                background: "linear-gradient(180deg,#0f172a,#1e293b)",
                borderRight: `2px solid ${C.line2}`,
              }}>Branch</th>
              {MONTHS.map((mo) => (
                <th
                  key={mo.i}
                  style={{
                    ...thBase,
                    position: "sticky",
                    top: 0,
                    zIndex: 3,
                    background: monthIsCurrent(mo.i)
                      ? "linear-gradient(180deg,#1d4ed8,#1e3a8a)"
                      : "linear-gradient(180deg,#0f172a,#1e293b)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 1000, letterSpacing: 0.4 }}>{mo.short}</span>
                    <button
                      className="no-print"
                      onClick={() => copyMonthDown(mo.i)}
                      title="Copy this month from one branch to all"
                      style={{
                        ...btn("rgba(255,255,255,0.10)", "#fff"),
                        padding: "1px 7px",
                        fontSize: 10,
                        fontWeight: 700,
                        boxShadow: "none",
                      }}
                    >⇣ copy</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayBranches.map((b, idx) => (
              <tr
                key={b.key}
                className="row-hover"
                style={{ background: idx % 2 ? C.band : "#fff", height: planRowHeight }}
              >
                <td style={{
                  ...tdBase,
                  position: "sticky",
                  left: 0,
                  background: idx % 2 ? C.band2 : "#fff",
                  borderRight: `2px solid ${C.line2}`,
                  zIndex: 2,
                  width: branchColWidth,
                  minWidth: branchColWidth,
                  height: planRowHeight,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <div className="annual-plan-branch-icon" style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
                        display: "grid", placeItems: "center", color: "#fff", fontSize: 16,
                        boxShadow: "0 4px 12px rgba(99,102,241,0.30)", flexShrink: 0,
                      }}>{b.icon}</div>
                      <div style={{ fontWeight: 1000, color: C.navy, fontSize: 13, lineHeight: 1.2, minWidth: 0 }}>
                        {b.label}
                      </div>
                    </div>
                    <button
                      className="row-bar no-print"
                      onClick={() => copyBranchAcross(b.key)}
                      title="Copy one month across all months for this branch"
                      style={{
                        ...btn("#fff", C.sub),
                        padding: "3px 7px",
                        fontSize: 10,
                        border: `1px solid ${C.line}`,
                        opacity: 0,
                        transition: "opacity .15s",
                        boxShadow: "none",
                      }}
                    >⇢ copy</button>
                  </div>
                </td>

                {MONTHS.map((mo) => {
                  const cell = matrix?.[b.key]?.[mo.i] || [];
                  const isEditing = editor && editor.branch === b.key && editor.month === mo.i;
                  const isCurrent = monthIsCurrent(mo.i);
                  const st = cellStatus(b.key, mo.i);
                  const monthIsPastOrCurrent =
                    Number(year) < currentYear ||
                    (Number(year) === currentYear && mo.i <= new Date().getMonth() + 1);

                  // determine cell-level status color/border
                  let statusBorder = `1px dashed ${cell.length === 0 ? C.line2 : "transparent"}`;
                  let statusBg = isEditing ? C.blueBg : (cell.length === 0 ? "transparent" : "#fff");
                  let statusBadge = null;

                  if (showActual) {
                    if (st.planned.length > 0 && st.missing.length === 0 && st.delivered.length === st.planned.length) {
                      // fully delivered
                      statusBorder = `2px solid #10b981`;
                      statusBg = isEditing ? C.blueBg : "#ecfdf5";
                      statusBadge = { text: "✓", color: "#fff", bg: "#10b981", title: "All planned trainings delivered" };
                    } else if (st.planned.length > 0 && st.delivered.length > 0 && st.missing.length > 0) {
                      // partial
                      statusBorder = `2px solid #f59e0b`;
                      statusBg = isEditing ? C.blueBg : "#fffbeb";
                      statusBadge = { text: `${st.delivered.length}/${st.planned.length}`, color: "#fff", bg: "#f59e0b", title: "Partially delivered" };
                    } else if (st.planned.length > 0 && st.missing.length > 0 && st.delivered.length === 0 && monthIsPastOrCurrent) {
                      // missing (only flag for past/current months)
                      statusBorder = `2px solid #dc2626`;
                      statusBg = isEditing ? C.blueBg : "#fef2f2";
                      statusBadge = { text: "✗", color: "#fff", bg: "#dc2626", title: "Planned but no session delivered" };
                    } else if (st.planned.length === 0 && st.extras.length > 0) {
                      // delivered but unplanned
                      statusBorder = `2px dashed #6366f1`;
                      statusBg = isEditing ? C.blueBg : "#eef2ff";
                      statusBadge = { text: "+", color: "#fff", bg: "#6366f1", title: "Delivered (unplanned)" };
                    }
                  }

                  if (isEditing) statusBorder = `2px solid ${C.blue}`;

                  return (
                    <td key={mo.i} style={{
                      ...tdBase,
                      width: monthColWidth,
                      height: planRowHeight,
                      padding: 4,
                      background: isCurrent ? "rgba(59,130,246,0.04)" : "transparent",
                    }}>
                      <button
                        className="cell-btn"
                        onClick={() => setEditor({ branch: b.key, month: mo.i })}
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                          minHeight: planRowHeight - 10,
                          boxSizing: "border-box",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "stretch",
                          justifyContent: (cell.length === 0 && st.extras.length === 0) ? "center" : "flex-start",
                          gap: 3,
                          padding: "6px 7px",
                          borderRadius: 10,
                          border: statusBorder,
                          background: statusBg,
                          cursor: "pointer",
                          transition: "all .12s",
                          textAlign: "left",
                        }}
                      >
                        {/* status badge top-right */}
                        {statusBadge && (
                          <span
                            title={statusBadge.title}
                            style={{
                              position: "absolute",
                              top: -7, right: -7,
                              background: statusBadge.bg,
                              color: statusBadge.color,
                              fontSize: 10,
                              fontWeight: 1000,
                              minWidth: 18, height: 18,
                              padding: "0 5px",
                              borderRadius: 999,
                              display: "grid", placeItems: "center",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                              border: "1.5px solid #fff",
                              zIndex: 1,
                              letterSpacing: 0,
                            }}
                          >{statusBadge.text}</span>
                        )}

                        {cell.length === 0 && st.extras.length === 0 ? (
                          <span style={{ color: C.muted, fontStyle: "italic", fontSize: 11, fontWeight: 700, textAlign: "center" }}>
                            + click to add
                          </span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, minWidth: 0, overflow: "hidden" }}>
                            {cell.map((m) => {
                              const delivered = showActual && st.delivered.some((d) => moduleMatchKey(d) === moduleMatchKey(m));
                              return (
                                <span
                                  key={m}
                                  style={{
                                    ...cellModuleChip(m),
                                    ...(showActual && delivered
                                      ? { background: "#dcfce7", color: "#14532d", borderColor: "#86efac" }
                                      : showActual && st.missing.some((mm) => moduleMatchKey(mm) === moduleMatchKey(m)) && monthIsPastOrCurrent
                                      ? { background: "#fee2e2", color: "#7f1d1d", borderColor: "#fca5a5", textDecoration: "line-through dotted" }
                                      : {}),
                                  }}
                                  title={
                                    delivered ? `${m} — delivered ✓`
                                    : showActual && st.missing.some((mm) => moduleMatchKey(mm) === moduleMatchKey(m)) && monthIsPastOrCurrent
                                    ? `${m} — planned, NOT delivered`
                                    : m
                                  }
                                >
                                  {showActual && delivered ? "✓ " : ""}
                                  {(() => {
                                    const label = getModuleNameShort(m, globalLang);
                                    return label.length > 18 ? label.slice(0, 16) + "…" : label;
                                  })()}
                                </span>
                              );
                            })}
                            {showActual && st.extras.map((m) => (
                              <span
                                key={"extra-" + m}
                                style={{
                                  ...cellModuleChip(m),
                                  background: "#eef2ff",
                                  color: "#3730a3",
                                  borderColor: "#a5b4fc",
                                  borderStyle: "dashed",
                                }}
                                title={`${m} — delivered but NOT in plan`}
                              >
                                + {(() => {
                                    const label = getModuleNameShort(m, globalLang);
                                    return label.length > 16 ? label.slice(0, 14) + "…" : label;
                                  })()}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer band — legend + quick stats */}
      <div style={{
        padding: "10px 14px",
        background: C.band,
        borderTop: `1px solid ${C.line}`,
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "center",
        fontSize: 11,
        color: C.sub,
        fontWeight: 700,
      }}>
        <span style={legendChip("#10b981", "#ecfdf5")}><b>✓</b> Fully delivered</span>
        <span style={legendChip("#f59e0b", "#fffbeb")}><b>⚡</b> Partial (some modules done)</span>
        <span style={legendChip("#dc2626", "#fef2f2")}><b>✗</b> Planned but missing</span>
        <span style={legendChip("#6366f1", "#eef2ff", true)}><b>+</b> Delivered (unplanned)</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <span>🗓 {sessions.length} actual session(s) in {year}</span>
          <span>Built by Eng. Mohammed Abdullah</span>
        </span>
      </div>
    </div>
  );
}
