// src/companies/exaltis/training/sessions/SessionDetail.jsx
// Training sessions — the open session (details, photos, participants).
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { safeTitle, safeDate, safeBranch, getModuleName, safeModule, Badge, KPI } from "../TrainingSessionsList.helpers";
import { issueTone } from "./participants";
import { SessionPhotos } from "./SessionPhotos";
import { SessionActionsBar } from "./SessionActionsBar";
import { ParticipantsTable } from "./ParticipantsTable";

export function SessionDetail({ glass, THEME, selected, globalLang, setRefOpen, deletingSession, btn, deleteTrainingSession, loading, closeSession, moduleName, sessionLevel, copySessionLink, linkBusy, openSessionLink, sessionLink, objectivesText, sessionStats, selectedQualityIssues, sessionImages, openSessionPhotoViewer, handleSessionImageUpload, uploadingSessionPhoto, savingSessionPhotos, removeSessionImage, questions, downloadCertificates, bulkCertBusy, certEligible, certChosen, addRow, add5Rows, downloadAttendanceSheet, sheetBusy, participants, saveParticipants, savingParticipants, allCertsSelected, toggleAllCerts, certSel, toggleCertRow, updateCell, inputStyle, setCertData, runCertExport, startQuiz, openAnswers, removeRow }) {
  return (
    <div style={{ ...glass, padding: 14, minHeight: "calc(100vh - 220px)" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 1100, fontSize: 16, color: THEME.textStrong }}>
            📌 Session Details
          </div>
          <div style={{ marginTop: 6, color: THEME.textStrong, fontWeight: 1000 }}>
            {safeTitle(selected)}
          </div>
          <div style={{ marginTop: 6, color: THEME.muted, fontSize: 13, fontWeight: 800 }}>
            Date: {safeDate(selected)} — Branch: {safeBranch(selected)} — Module:{" "}
            {getModuleName(safeModule(selected), globalLang)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setRefOpen(true)}
            disabled={deletingSession}
            style={{
              ...btn("violet"),
              background: 'linear-gradient(135deg,#4338ca,#6366f1)',
              boxShadow: '0 2px 8px rgba(99,102,241,.35)',
            }}
            title="Open trainer reference card for this module"
          >
            📖 References
          </button>

          <button
            onClick={deleteTrainingSession}
            disabled={deletingSession || loading}
            style={{
              ...btn("red"),
              opacity: deletingSession ? 0.75 : 1,
              cursor: deletingSession ? "not-allowed" : "pointer",
            }}
            title="Delete training session"
           data-delete-action="true">
            {deletingSession ? "Deleting..." : "🗑 Delete Training"}
          </button>

          <button onClick={closeSession} style={btn("light")} disabled={deletingSession}>
            ✖ Close
          </button>
        </div>
      </div>

      {/* ✅ ONE LINK BAR */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 16,
          border: "1px solid #bae6fd",
          background: "linear-gradient(180deg,#f0f9ff,#e6f4ff)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Badge text="Trainee Link (One for all)" tone="violet" />
            <Badge text={`Module: ${moduleName || "-"}`} tone="gray" />
            {sessionLevel ? <Badge text={`Level: ${sessionLevel}`} tone="blue" /> : null}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={copySessionLink}
              disabled={linkBusy || deletingSession}
              style={{ ...btn("violet"), opacity: linkBusy ? 0.75 : 1 }}
            >
              {linkBusy ? "Working..." : "🔗 Generate & Copy Link"}
            </button>
            <button
              onClick={openSessionLink}
              disabled={linkBusy || deletingSession}
              style={btn("light")}
            >
              ↗ Open
            </button>
          </div>
        </div>

        {sessionLink ? (
          <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted, fontWeight: 900 }}>
            Link: <span style={{ userSelect: "all", color: THEME.textStrong }}>{sessionLink}</span>
          </div>
        ) : (
          <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted, fontWeight: 900 }}>
            Click “Generate & Copy Link” to create the session link.
          </div>
        )}
      </div>

      {/* ✅ Objectives */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 16,
          border: "1px solid #ddd6fe",
          background: "linear-gradient(180deg,#f8f6ff,#f1eeff)",
        }}
      >
        <div style={{ fontWeight: 1100, color: THEME.textStrong }}>
          🎯 Objectives / Frequency / Evaluation
        </div>

        {objectivesText.trim() ? (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 14,
              border: "1px solid #e9e5ff",
              background: "#fcfbff",
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              fontWeight: 700,
              color: THEME.text,
            }}
          >
            {objectivesText}
          </div>
        ) : (
          <div style={{ marginTop: 10, color: THEME.muted, fontWeight: 900 }}>
            No objectives found for this session.
          </div>
        )}
      </div>

      {sessionStats && (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          <KPI label="Participants" value={sessionStats.total} tone="violet" />
          <KPI label="PASS" value={sessionStats.pass} tone="green" />
          <KPI label="FAIL" value={sessionStats.fail} tone="red" />
          <KPI label="Pass Rate" value={`${sessionStats.rate}%`} tone="blue" />
          <KPI label="Average Score" value={`${sessionStats.avg}%`} tone="gray" />
        </div>
      )}

      {selectedQualityIssues.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 6,
            border: "1.5px solid #fde68a",
            background: "#fffdf7",
          }}
        >
          <div style={{ fontWeight: 1000, color: "#111827", fontSize: 13, marginBottom: 8 }}>
            Smart Data Quality Checks
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {selectedQualityIssues.map((issue) => {
              const tone = issueTone(issue);
              return (
                <span key={issue.key} title={issue.detail} style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: tone.fg,
                  background: tone.bg,
                  border: `1px solid ${tone.bd}`,
                  borderRadius: 999,
                  padding: "4px 10px",
                }}>
                  {issue.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== Session Photos (max 2 — Cloudinary) ===================== */}
      <SessionPhotos sessionImages={sessionImages} openSessionPhotoViewer={openSessionPhotoViewer} btn={btn} deletingSession={deletingSession} handleSessionImageUpload={handleSessionImageUpload} uploadingSessionPhoto={uploadingSessionPhoto} savingSessionPhotos={savingSessionPhotos} removeSessionImage={removeSessionImage} />

      <SessionActionsBar questions={questions} downloadCertificates={downloadCertificates} bulkCertBusy={bulkCertBusy} deletingSession={deletingSession} certEligible={certEligible} certChosen={certChosen} addRow={addRow} btn={btn} add5Rows={add5Rows} downloadAttendanceSheet={downloadAttendanceSheet} sheetBusy={sheetBusy} selected={selected} participants={participants} saveParticipants={saveParticipants} savingParticipants={savingParticipants} />

      <ParticipantsTable THEME={THEME} allCertsSelected={allCertsSelected} toggleAllCerts={toggleAllCerts} certEligible={certEligible} participants={participants} certSel={certSel} toggleCertRow={toggleCertRow} updateCell={updateCell} inputStyle={inputStyle} setCertData={setCertData} runCertExport={runCertExport} bulkCertBusy={bulkCertBusy} startQuiz={startQuiz} btn={btn} deletingSession={deletingSession} openAnswers={openAnswers} removeRow={removeRow} />

      <div style={{ marginTop: 10, color: THEME.muted, fontSize: 13, fontWeight: 900 }}>
        ✅ Anyone submits the session link → saved on server → appears here automatically.
      </div>
    </div>
  );
}
