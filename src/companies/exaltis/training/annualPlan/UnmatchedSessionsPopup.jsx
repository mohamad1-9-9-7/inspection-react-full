// src/companies/exaltis/training/annualPlan/UnmatchedSessionsPopup.jsx
// Annual training plan — Sessions that match no cell of the plan (popup).
// (Extracted from TrainingAnnualPlan.jsx — the code is unchanged.)
import { btn, C } from "./planUi";
import { getId } from "./planApi";
import { sessionBranch, sessionModule, sessionTitle, sessionDate, fmtDate } from "./planModel";

export function UnmatchedSessionsPopup({ setShowUnmatched, deliveryIndex, navigate }) {
  return (
    <div
      className="no-print"
      onClick={(e) => { if (e.target === e.currentTarget) setShowUnmatched(false); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(2,6,23,0.65)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 14,
      }}
    >
      <div style={{
        width: "100%", maxWidth: 640, maxHeight: "85vh",
        background: "#fff", borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{
          padding: "14px 18px",
          background: "linear-gradient(135deg,#b45309,#d97706)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85, letterSpacing: 0.4, textTransform: "uppercase" }}>
              Unmatched Sessions
            </div>
            <div style={{ fontWeight: 1000, fontSize: 16, marginTop: 2 }}>
              {deliveryIndex.__unmatched} session(s) couldn't be linked to any branch
            </div>
          </div>
          <button onClick={() => setShowUnmatched(false)} style={btn("rgba(255,255,255,0.18)", "#fff")}>✕</button>
        </div>

        <div style={{ padding: "14px 18px", flex: 1, overflow: "auto" }}>
          <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginBottom: 10 }}>
            These trainings were saved with a branch name that doesn't match any branch currently shown in this table.
            Either edit the session in the Training Library, or tell me the exact name and I'll add it as an alias.
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {(deliveryIndex.__unmatchedList || []).map((s, i) => {
              const id = getId(s);
              const branchName = sessionBranch(s) || "(empty branch)";
              const mod = sessionModule(s) || "(no module)";
              const ttl = sessionTitle(s);
              const d = sessionDate(s);
              return (
                <div key={id || i} style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #fde68a",
                  background: "#fffbeb",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 1000, color: "#92400e",
                      background: "#fef3c7", padding: "2px 8px", borderRadius: 999,
                      letterSpacing: 0.3,
                    }}>
                      BRANCH: "{branchName}"
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: C.sub }}>
                      {fmtDate(d) || "no date"}
                    </span>
                  </div>
                  <div style={{ fontWeight: 900, color: C.ink, fontSize: 13 }}>
                    📚 {mod}
                  </div>
                  {ttl && (
                    <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>
                      {ttl}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          padding: "12px 18px",
          borderTop: `1px solid ${C.line}`,
          background: C.band,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>
            💡 Tip: Edit the session's branch name in the Training Library to fix the link.
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={() => navigate("/training/sessions")} style={btn(C.purple)}>
            📚 Open Library
          </button>
          <button onClick={() => setShowUnmatched(false)} style={btn("#e2e8f0", "#334155")}>Close</button>
        </div>
      </div>
    </div>
  );
}
