// src/companies/exaltis/training/sessions/SessionsList.jsx
// Training sessions — the sessions list tab.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { getId, safeTitle, safeDate, getModuleName, safeModule, safeBranch } from "../TrainingSessionsList.helpers";
import { dataQualityIssuesForSession, issueTone } from "./participants";

export function SessionsList({ loading, THEME, visible, activeFilterCount, selected, openSession, globalLang, liveQuizBank }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {loading ? (
        <div style={{
          padding: 24, textAlign: "center",
          color: THEME.muted, fontWeight: 800, fontSize: 13,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "3px solid #e2e8f0", borderTopColor: "#3b82f6",
            margin: "0 auto 10px",
            animation: "tspin 0.7s linear infinite",
          }} />
          <style>{`@keyframes tspin { to { transform: rotate(360deg); } }`}</style>
          Loading sessions…
        </div>
      ) : visible.length === 0 ? (
        <div style={{
          padding: "40px 16px", textAlign: "center",
          color: THEME.muted, fontWeight: 700, fontSize: 13,
        }}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>📭</div>
          {activeFilterCount
            ? "No sessions match your filters."
            : "No sessions found yet."}
        </div>
      ) : (
        visible.map((r, idx) => {
          const active = selected && getId(selected) === getId(r);
          return (
            <button
              key={getId(r) || idx}
              onClick={() => openSession(r)}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: 12,
                border: active
                  ? "2px solid #6366f1"
                  : `1px solid ${THEME.line}`,
                background: active ? "#eef2ff" : "#ffffff",
                padding: "10px 12px",
                cursor: "pointer",
                boxShadow: active
                  ? "0 8px 20px rgba(99,102,241,0.18)"
                  : "0 1px 3px rgba(15,23,42,0.05)",
                color: THEME.text,
                transition: "all .12s",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
              title="Open"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <div style={{
                  fontWeight: 900, color: THEME.textStrong,
                  fontSize: 13, lineHeight: 1.35,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  flex: 1,
                }}>
                  {safeTitle(r) || "Training Session"}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 1000,
                  color: "#1e40af",
                  background: "#dbeafe",
                  padding: "3px 8px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  border: "1px solid #bfdbfe",
                }}>
                  📅 {safeDate(r) || "-"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  color: "#5b21b6",
                  background: "#ede9fe",
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "1px solid #ddd6fe",
                }}>
                  📚 {getModuleName(safeModule(r), globalLang) || "—"}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  color: "#334155",
                  background: "#f1f5f9",
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "1px solid #e2e8f0",
                }}>
                  🏢 {safeBranch(r) || "—"}
                </span>
              </div>
              {(() => {
                const issues = dataQualityIssuesForSession(r, liveQuizBank);
                return issues.length ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {issues.map((issue) => {
                      const tone = issueTone(issue);
                      return (
                        <span key={issue.key} title={issue.detail} style={{
                          fontSize: 10,
                          fontWeight: 900,
                          color: tone.fg,
                          background: tone.bg,
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: `1px solid ${tone.bd}`,
                        }}>
                          {issue.label}
                        </span>
                      );
                    })}
                  </div>
                ) : null;
              })()}
            </button>
          );
        })
      )}
    </div>
  );
}
