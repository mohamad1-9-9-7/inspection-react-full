// src/companies/exaltis/training/sessions/SessionsDateTree.jsx
// Training sessions — sessions by year / month / day.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { getId, safeTitle, getModuleName, safeModule, safeBranch } from "../TrainingSessionsList.helpers";

export function SessionsDateTree({ dateTree, THEME, openYears, setOpenYears, openMonths, setOpenMonths, openDays, setOpenDays, selected, openSession, globalLang }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {Object.keys(dateTree).length === 0 ? (
        <div style={{
          padding: "40px 16px", textAlign: "center",
          color: THEME.muted, fontWeight: 700, fontSize: 13,
        }}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>🗂</div>
          No data.
        </div>
      ) : (
        Object.keys(dateTree)
          .sort((a, b) => String(b).localeCompare(String(a)))
          .map((year) => {
            const isYearOpen = !!openYears[year];
            const monthsObj = dateTree[year] || {};
            const months = Object.keys(monthsObj).sort((a, b) =>
              String(b).localeCompare(String(a))
            );

            return (
              <div
                key={year}
                style={{
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 12,
                  background: "#ffffff",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
                }}
              >
                <button
                  onClick={() =>
                    setOpenYears((p) => ({ ...p, [year]: !p[year] }))
                  }
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    cursor: "pointer",
                    border: "none",
                    background: isYearOpen ? "linear-gradient(135deg,#e0edff,#eef5ff)" : THEME.subBg2,
                    fontWeight: 1000,
                    fontSize: 13,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: isYearOpen ? "#1e40af" : THEME.textStrong,
                    transition: "all .15s",
                  }}
                >
                  <span>📁 {year}</span>
                  <span style={{ color: isYearOpen ? "#3b82f6" : THEME.muted }}>
                    {isYearOpen ? "▾" : "▸"}
                  </span>
                </button>

                {isYearOpen && (
                  <div style={{ padding: 10, display: "grid", gap: 8 }}>
                    {months.map((month) => {
                      const mKey = `${year}_${month}`;
                      const isMonthOpen = !!openMonths[mKey];
                      const daysObj = monthsObj[month] || {};
                      const days = Object.keys(daysObj).sort((a, b) =>
                        String(b).localeCompare(String(a))
                      );

                      return (
                        <div
                          key={mKey}
                          style={{
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 10,
                            overflow: "hidden",
                            background: "#fff",
                          }}
                        >
                          <button
                            onClick={() =>
                              setOpenMonths((p) => ({
                                ...p,
                                [mKey]: !p[mKey],
                              }))
                            }
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "8px 10px",
                              cursor: "pointer",
                              border: "none",
                              background: isMonthOpen ? "#dbeafe" : "#f8fafc",
                              fontWeight: 900,
                              fontSize: 12,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              color: isMonthOpen ? "#1e40af" : THEME.textStrong,
                              transition: "all .12s",
                            }}
                          >
                            <span>📂 {month}</span>
                            <span style={{ color: isMonthOpen ? "#3b82f6" : THEME.muted }}>
                              {isMonthOpen ? "▾" : "▸"}
                            </span>
                          </button>

                          {isMonthOpen && (
                            <div
                              style={{
                                padding: 8,
                                display: "grid",
                                gap: 6,
                                background: "#f8fafc",
                              }}
                            >
                              {days.map((day) => {
                                const dKey = `${year}_${month}_${day}`;
                                const isDayOpen = !!openDays[dKey];
                                const list = daysObj[day] || [];
                                return (
                                  <div
                                    key={dKey}
                                    style={{
                                      border: `1px solid ${THEME.line}`,
                                      borderRadius: 8,
                                      overflow: "hidden",
                                      background: "#fff",
                                    }}
                                  >
                                    <button
                                      onClick={() =>
                                        setOpenDays((p) => ({
                                          ...p,
                                          [dKey]: !p[dKey],
                                        }))
                                      }
                                      style={{
                                        width: "100%",
                                        textAlign: "left",
                                        padding: "8px 10px",
                                        cursor: "pointer",
                                        border: "none",
                                        background: isDayOpen ? "#ede9fe" : "#fff",
                                        fontWeight: 900,
                                        fontSize: 12,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        color: isDayOpen ? "#5b21b6" : THEME.textStrong,
                                        transition: "all .12s",
                                      }}
                                    >
                                      <span>📅 {day}</span>
                                      <span style={{
                                        display: "flex", gap: 6, alignItems: "center",
                                        color: isDayOpen ? "#7c3aed" : THEME.muted,
                                      }}>
                                        <span style={{
                                          background: "#dbeafe",
                                          color: "#1e40af",
                                          padding: "1px 7px",
                                          borderRadius: 999,
                                          fontSize: 10,
                                          fontWeight: 1000,
                                        }}>{list.length}</span>
                                        {isDayOpen ? "▾" : "▸"}
                                      </span>
                                    </button>

                                    {isDayOpen && (
                                      <div
                                        style={{
                                          padding: 8,
                                          display: "grid",
                                          gap: 6,
                                          background: "#f8fafc",
                                        }}
                                      >
                                        {list.map((r, i) => {
                                          const active =
                                            selected && getId(selected) === getId(r);
                                          return (
                                            <button
                                              key={getId(r) || i}
                                              onClick={() => openSession(r)}
                                              style={{
                                                width: "100%",
                                                textAlign: "left",
                                                borderRadius: 8,
                                                border: active
                                                  ? "2px solid #6366f1"
                                                  : `1px solid ${THEME.line}`,
                                                background: active ? "#eef2ff" : "#fff",
                                                padding: "8px 10px",
                                                cursor: "pointer",
                                                boxShadow: active
                                                  ? "0 4px 10px rgba(99,102,241,0.15)"
                                                  : "0 1px 2px rgba(15,23,42,0.04)",
                                                color: THEME.text,
                                                transition: "all .12s",
                                              }}
                                            >
                                              <div style={{
                                                fontWeight: 900, color: THEME.textStrong,
                                                fontSize: 12, lineHeight: 1.3,
                                                overflow: "hidden",
                                                display: "-webkit-box",
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical",
                                              }}>
                                                {safeTitle(r) || "Training Session"}
                                              </div>
                                              <div
                                                style={{
                                                  marginTop: 4,
                                                  display: "flex",
                                                  gap: 4,
                                                  flexWrap: "wrap",
                                                }}
                                              >
                                                <span style={{
                                                  fontSize: 9, fontWeight: 800,
                                                  color: "#5b21b6",
                                                  background: "#ede9fe",
                                                  padding: "2px 6px",
                                                  borderRadius: 999,
                                                }}>
                                                  📚 {getModuleName(safeModule(r), globalLang) || "—"}
                                                </span>
                                                <span style={{
                                                  fontSize: 9, fontWeight: 800,
                                                  color: "#334155",
                                                  background: "#f1f5f9",
                                                  padding: "2px 6px",
                                                  borderRadius: 999,
                                                }}>
                                                  🏢 {safeBranch(r) || "—"}
                                                </span>
                                              </div>
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
          })
      )}
    </div>
  );
}
