// src/companies/exaltis/training/sessions/SessionActionsBar.jsx
// Training sessions — actions of the open session (link, certificates, attendance).
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { Badge, PASS_MARK } from "../TrainingSessionsList.helpers";
import { namedParticipants } from "./participants";

export function SessionActionsBar({ questions, downloadCertificates, bulkCertBusy, deletingSession, certEligible, certChosen, addRow, btn, add5Rows, downloadAttendanceSheet, sheetBusy, selected, participants, saveParticipants, savingParticipants }) {
  return (
    <div
      style={{
        marginTop: 12,
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Badge text={`Questions: ${questions.length}`} tone="blue" />
        <Badge text={`Pass Mark: ${PASS_MARK}%`} tone="green" />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={downloadCertificates}
          disabled={bulkCertBusy || deletingSession || certEligible.length === 0}
          title={
            certEligible.length === 0
              ? "No passed participants yet"
              : certChosen.length
              ? `Download ${certChosen.length} selected certificate(s) as one PDF`
              : `Download all ${certEligible.length} certificate(s) as one PDF`
          }
          style={{
            padding: "9px 14px", borderRadius: 12,
            border: "1.5px solid #a7f3d0",
            background: certEligible.length ? "linear-gradient(135deg,#ecfdf5,#d1fae5)" : "#f8fafc",
            color: certEligible.length ? "#047857" : "#94a3b8",
            fontWeight: 900, fontSize: 12.5,
            cursor: bulkCertBusy ? "wait" : certEligible.length ? "pointer" : "not-allowed",
            opacity: bulkCertBusy ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {bulkCertBusy
            ? "⏳ Building PDF…"
            : `⬇️ Certificates PDF (${certChosen.length || certEligible.length})`}
        </button>
        <button onClick={addRow} style={btn("light")} disabled={deletingSession}>
          ➕ Add Row
        </button>
        <button onClick={add5Rows} style={btn("light")} disabled={deletingSession}>
          ➕ Add 5 Rows
        </button>
        <button
          onClick={downloadAttendanceSheet}
          disabled={sheetBusy || deletingSession || namedParticipants(selected, participants).length === 0}
          title={
            namedParticipants(selected, participants).length === 0
              ? "Add at least one named participant first"
              : "Attendance record — trainees, scores and results"
          }
          style={{
            padding: "9px 14px", borderRadius: 12,
            border: "1.5px solid #bae6fd",
            background: namedParticipants(selected, participants).length
              ? "linear-gradient(135deg,#f0f9ff,#e0f2fe)"
              : "#f8fafc",
            color: namedParticipants(selected, participants).length ? "#0369a1" : "#94a3b8",
            fontWeight: 900, fontSize: 12.5,
            cursor: sheetBusy ? "wait" : namedParticipants(selected, participants).length ? "pointer" : "not-allowed",
            opacity: sheetBusy ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {sheetBusy ? "⏳ Building sheet…" : "🖊️ Attendance Sheet PDF"}
        </button>
        <button
          onClick={saveParticipants}
          disabled={savingParticipants || deletingSession}
          style={{
            ...btn("dark"),
            opacity: savingParticipants ? 0.7 : 1,
            cursor: savingParticipants ? "not-allowed" : "pointer",
          }}
        >
          {savingParticipants ? "Saving..." : "💾 Save Participants"}
        </button>
      </div>
    </div>
  );
}
