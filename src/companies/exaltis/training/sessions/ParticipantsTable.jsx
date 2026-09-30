// src/companies/exaltis/training/sessions/ParticipantsTable.jsx
// Training sessions — participants table of the open session.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { Badge } from "../TrainingSessionsList.helpers";

export function ParticipantsTable({ THEME, allCertsSelected, toggleAllCerts, certEligible, participants, certSel, toggleCertRow, updateCell, inputStyle, setCertData, runCertExport, bulkCertBusy, startQuiz, btn, deletingSession, openAnswers, removeRow }) {
  return (
    <div style={{ marginTop: 12, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr>
            <th
              style={{
                textAlign: "center",
                padding: 12,
                width: 40,
                background: THEME.tableHeadBg,
                borderTop: `1px solid ${THEME.lineStrong}`,
                borderBottom: `1px solid ${THEME.lineStrong}`,
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
              title="Select passed participants for the certificates PDF"
            >
              <input
                type="checkbox"
                checked={allCertsSelected}
                onChange={toggleAllCerts}
                disabled={certEligible.length === 0}
                style={{ width: 16, height: 16, cursor: certEligible.length ? "pointer" : "not-allowed" }}
              />
            </th>
            {["SL", "NAME", "DESIGNATION", "EMP ID", "SCORE", "RESULT", "LAST QUIZ", "CERT", ""].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    background: THEME.tableHeadBg,
                    borderTop: `1px solid ${THEME.lineStrong}`,
                    borderBottom: `1px solid ${THEME.lineStrong}`,
                    fontWeight: 1100,
                    whiteSpace: "nowrap",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    color: THEME.textStrong,
                  }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {participants.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ padding: 14, color: THEME.muted, fontWeight: 900 }}>
                No participants yet. Anyone who submits the session link will appear here automatically ✅
              </td>
            </tr>
          ) : (
            participants.map((p, idx) => {
              const res = String(p.result || "").toUpperCase();
              const hasAnswers = !!p?.quizAttempt?.answers?.length;
              const canCert = res === "PASS" && !!String(p.name || "").trim();
              return (
                <tr key={idx}>
                  <td
                    style={{
                      padding: 12,
                      textAlign: "center",
                      borderBottom: `1px solid rgba(148,163,184,0.14)`,
                    }}
                  >
                    {canCert ? (
                      <input
                        type="checkbox"
                        checked={!!certSel[idx]}
                        onChange={() => toggleCertRow(idx)}
                        title="Include this certificate in the PDF"
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                    ) : (
                      <span style={{ color: "#e2e8f0" }}>—</span>
                    )}
                  </td>

                  <td
                    style={{
                      padding: 12,
                      borderBottom: `1px solid rgba(148,163,184,0.14)`,
                      whiteSpace: "nowrap",
                      fontWeight: 900,
                      color: THEME.text,
                    }}
                  >
                    {p.slNo}
                  </td>

                  <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, minWidth: 240 }}>
                    <input
                      value={p.name || ""}
                      onChange={(e) => updateCell(idx, "name", e.target.value)}
                      placeholder="Participant name"
                      style={inputStyle}
                    />
                  </td>

                  <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, minWidth: 220 }}>
                    <input
                      value={p.designation || ""}
                      onChange={(e) => updateCell(idx, "designation", e.target.value)}
                      placeholder="Designation"
                      style={inputStyle}
                    />
                  </td>

                  <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, minWidth: 160 }}>
                    <input
                      value={p.employeeId || ""}
                      onChange={(e) => updateCell(idx, "employeeId", e.target.value)}
                      placeholder="Employee ID"
                      style={inputStyle}
                    />
                  </td>

                  <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                    <Badge text={`${String(p.score || "").replace("%", "") || "-"}%`} tone="blue" />
                  </td>

                  <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                    {res === "PASS" ? (
                      <Badge text="PASS" tone="green" />
                    ) : res === "FAIL" ? (
                      <Badge text="FAIL" tone="red" />
                    ) : (
                      <Badge text="-" tone="gray" />
                    )}
                  </td>

                  <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Badge text={p.lastQuizAt || "-"} tone="gray" />
                      {hasAnswers ? <Badge text="Answers Saved" tone="amber" /> : null}
                    </div>
                  </td>

                  {/* Certificate column */}
                  <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                    {res === "PASS" ? (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          onClick={() => setCertData({ participant: p, idx })}
                          style={{
                            padding:'7px 12px', borderRadius:10, border:'1.5px solid #fde68a',
                            background:'linear-gradient(135deg,#fef9c3,#fef3c7)',
                            color:'#92400e', fontWeight:800, fontSize:11.5,
                            cursor:'pointer', whiteSpace:'nowrap',
                            boxShadow:'0 1px 4px rgba(245,158,11,.2)',
                          }}
                          title="Open / print the achievement certificate"
                        >
                          🏆 Certificate
                        </button>
                        <button
                          onClick={() => runCertExport([p])}
                          disabled={bulkCertBusy || !canCert}
                          style={{
                            padding:'7px 11px', borderRadius:10, border:'1.5px solid #a7f3d0',
                            background:'linear-gradient(135deg,#ecfdf5,#d1fae5)',
                            color:'#047857', fontWeight:800, fontSize:11.5,
                            cursor: bulkCertBusy ? 'wait' : 'pointer', whiteSpace:'nowrap',
                            opacity: bulkCertBusy ? 0.7 : 1,
                          }}
                          title="Download this certificate as PDF"
                        >
                          ⬇️ PDF
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize:11, color:'#cbd5e1' }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => startQuiz(idx)} style={btn("blue")} disabled={deletingSession}>
                        🧪 Start Quiz (Admin)
                      </button>

                      <button
                        onClick={() => openAnswers(idx)}
                        disabled={!hasAnswers || deletingSession}
                        style={{
                          ...btn("light"),
                          opacity: hasAnswers ? 1 : 0.5,
                          cursor: hasAnswers ? "pointer" : "not-allowed",
                        }}
                        title={hasAnswers ? "View saved answers" : "No saved answers yet"}
                      >
                        👁 View Answers
                      </button>

                      <button
                        onClick={() => removeRow(idx)}
                        disabled={deletingSession}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid #fecaca",
                          background: "#fef2f2",
                          color: "#b91c1c",
                          cursor: "pointer",
                          fontWeight: 1000,
                          opacity: deletingSession ? 0.6 : 1,
                        }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
