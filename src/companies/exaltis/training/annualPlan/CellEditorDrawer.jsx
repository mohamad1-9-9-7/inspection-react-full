// src/companies/exaltis/training/annualPlan/CellEditorDrawer.jsx
// Annual training plan — Editor drawer for one cell (branch × month).
// (Extracted from TrainingAnnualPlan.jsx — the code is unchanged.)
import { MONTHS, DEFAULT_MONTHLY_FOCUS, sessionModule, sessionTitle, sessionDate, moduleMatchKey, fmtDate, MODULES } from "./planModel";
import { btn, C, MiniStat } from "./planUi";
import { getId } from "./planApi";
import { getModuleName } from "../TrainingSessionsList.helpers";

export function CellEditorDrawer({ setEditor, displayBranches, editor, year, clearCell, setCellModules, navigate, cellStatus, matrix, toggleModuleInCell, globalLang }) {
  return (
    <div
      className="no-print"
      onClick={(e) => { if (e.target === e.currentTarget) setEditor(null); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(2,6,23,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "flex-end",
        zIndex: 1000,
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: 480,
        height: "100vh",
        background: "#fff",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 18px",
          background: "linear-gradient(135deg,#0f172a,#1e293b)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.4, textTransform: "uppercase" }}>
              Edit Cell
            </div>
            <div style={{ fontWeight: 1000, fontSize: 16, marginTop: 2 }}>
              {displayBranches.find((x) => x.key === editor.branch)?.label || editor.branch}
            </div>
            <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 800, marginTop: 1 }}>
              {MONTHS[editor.month - 1].full} · {year}
            </div>
          </div>
          <button onClick={() => setEditor(null)} style={btn("rgba(255,255,255,0.14)", "#fff")}>✕</button>
        </div>

        {/* Quick actions */}
        <div style={{ padding: "10px 18px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: `1px solid ${C.line}` }}>
          <button onClick={() => clearCell(editor.branch, editor.month)} style={btn("#fee2e2", C.red)}>
            Clear cell
          </button>
          <button
            onClick={() => setCellModules(editor.branch, editor.month, [...(DEFAULT_MONTHLY_FOCUS[editor.month] || [])])}
            style={btn(C.amberBg, C.amber)}
            title="Use default focus for this month"
          >Use month default</button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => navigate("/training/sessions")}
            style={btn(C.purpleBg, C.purple)}
            title="Open Training Library"
          >📚 Sessions</button>
        </div>

        {/* ===== Actual sessions for this cell ===== */}
        {(() => {
          const st = cellStatus(editor.branch, editor.month);
          return (
            <div style={{
              padding: "12px 18px",
              borderBottom: `1px solid ${C.line}`,
              background: "#f8fafc",
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.sub, letterSpacing: 0.4, textTransform: "uppercase" }}>
                  Actual Sessions This Month
                </span>
                <span style={{
                  background: st.sessionsAll.length > 0 ? "#dcfce7" : "#f3f4f6",
                  color: st.sessionsAll.length > 0 ? "#14532d" : "#6b7280",
                  fontSize: 11, fontWeight: 1000,
                  padding: "2px 8px", borderRadius: 999,
                }}>{st.sessionsAll.length}</span>
              </div>

              {/* Coverage summary for this cell */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                <MiniStat label="Planned" value={st.planned.length} bg="#dbeafe" fg="#1e40af" />
                <MiniStat label="Delivered" value={st.delivered.length} bg="#dcfce7" fg="#14532d" />
                <MiniStat label="Missing" value={st.missing.length} bg={st.missing.length ? "#fee2e2" : "#f3f4f6"} fg={st.missing.length ? "#7f1d1d" : "#6b7280"} />
                <MiniStat label="Extra" value={st.extras.length} bg={st.extras.length ? "#ede9fe" : "#f3f4f6"} fg={st.extras.length ? "#5b21b6" : "#6b7280"} />
              </div>

              {/* Sessions list */}
              {st.sessionsAll.length === 0 ? (
                <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", padding: "6px 0" }}>
                  No sessions delivered for this branch in {MONTHS[editor.month - 1].full}.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6, maxHeight: 180, overflow: "auto" }}>
                  {st.sessionsAll.map((s, i) => {
                    const mod = sessionModule(s) || "(unspecified)";
                    const ttl = sessionTitle(s);
                    const d = sessionDate(s);
                    const inPlan = st.planned.some((p) => moduleMatchKey(p) === moduleMatchKey(mod));
                    return (
                      <div key={getId(s) || i} style={{
                        border: `1px solid ${inPlan ? "#86efac" : "#c7d2fe"}`,
                        background: inPlan ? "#f0fdf4" : "#eef2ff",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 12,
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 900, color: inPlan ? "#14532d" : "#3730a3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {inPlan ? "✓" : "+"} {mod}
                          </div>
                          {ttl && (
                            <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {ttl}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: C.sub, whiteSpace: "nowrap" }}>
                          {fmtDate(d)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {st.missing.length > 0 && (
                <div style={{ marginTop: 8, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 11, color: "#7f1d1d", fontWeight: 800 }}>
                  ⚠ Missing: {st.missing.join(" · ")}
                </div>
              )}
            </div>
          );
        })()}

        {/* Modules list */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "12px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 8 }}>
            Select Training Modules
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {MODULES.map((m) => {
              const checked = (matrix?.[editor.branch]?.[editor.month] || []).includes(m);
              const isOHS = m.startsWith("OHS:");
              const stMod = cellStatus(editor.branch, editor.month);
              const wasDelivered = stMod.sessionsByModule.has(moduleMatchKey(m));
              return (
                <label
                  key={m}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${checked ? (isOHS ? "#fb923c" : C.blue) : C.line}`,
                    background: checked ? (isOHS ? "#fff7ed" : C.blueBg) : "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: checked ? 900 : 700,
                    color: C.ink,
                    transition: "all .12s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleModuleInCell(editor.branch, editor.month, m)}
                    style={{ width: 18, height: 18, accentColor: isOHS ? "#ea580c" : C.blue, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1 }}>{getModuleName(m, globalLang)}</span>
                  {wasDelivered && (
                    <span style={{ fontSize: 9, fontWeight: 1000, color: "#fff", background: "#10b981", padding: "2px 7px", borderRadius: 999 }}
                      title="A session for this module was delivered this month">
                      ✓ DELIVERED
                    </span>
                  )}
                  {isOHS && (
                    <span style={{ fontSize: 9, fontWeight: 900, color: "#9a3412", background: "#ffedd5", padding: "2px 6px", borderRadius: 999 }}>
                      OHS
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "10px 18px",
          borderTop: `1px solid ${C.line}`,
          background: C.band,
          fontSize: 11,
          color: C.sub,
          fontWeight: 700,
        }}>
          💡 Changes are kept locally — click <b style={{ color: C.green }}>Save</b> on top to persist online.
        </div>
      </div>
    </div>
  );
}
