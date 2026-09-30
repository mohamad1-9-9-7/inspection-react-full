// src/companies/exaltis/training/sessions/AttendanceStage.jsx
// Training sessions — off-screen attendance sheet captured by the PDF exporter.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { pdfStageStyle } from "../../../../utils/nodeToPdf";
import { CompanyMark, companyLine } from "../brand";
import { ATT, TRAINING_DOC_NO, TRAINING_DOC_REV, TRAINING_DOC_ISSUE, DEFAULT_QA_MANAGER } from "./certificates";
import { safeModule, safeDate, safeBranch, PASS_MARK } from "../TrainingSessionsList.helpers";
import { namedParticipants } from "./participants";

export function AttendanceStage({ attendanceRef, selected, participants }) {
  return (
    <div ref={attendanceRef} style={pdfStageStyle(900)}>
      {/* ── Header: identity + document control ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <CompanyMark size={46} style={{ marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={ATT.title}>Training Attendance Sheet</div>
          <div style={ATT.subtitle}>{companyLine("Quality & Training Department").toUpperCase()}</div>
        </div>
        <table style={ATT.docBox}>
          <tbody>
            <tr><td style={ATT.docKey}>Doc. No</td><td style={ATT.docVal}>{TRAINING_DOC_NO || "—"}</td></tr>
            <tr><td style={ATT.docKey}>Revision</td><td style={ATT.docVal}>{TRAINING_DOC_REV}</td></tr>
            <tr><td style={ATT.docKey}>Issue date</td><td style={ATT.docVal}>{TRAINING_DOC_ISSUE}</td></tr>
          </tbody>
        </table>
      </div>
      <div style={ATT.rule} />

      {/* ── Session details — every name is filled in automatically ── */}
      <table style={ATT.meta}>
        <tbody>
          <tr>
            <td style={ATT.metaKey}>Module</td>
            <td style={ATT.metaVal}>{safeModule(selected)}</td>
            <td style={ATT.metaKey}>Date</td>
            <td style={ATT.metaVal}>{safeDate(selected) || "—"}</td>
          </tr>
          <tr>
            <td style={ATT.metaKey}>Branch</td>
            <td style={ATT.metaVal}>{safeBranch(selected) || "—"}</td>
            <td style={ATT.metaKey}>Conducted by</td>
            <td style={ATT.metaVal}>{selected?.payload?.conductedBy || "—"}</td>
          </tr>
          <tr>
            <td style={ATT.metaKey}>Verified by</td>
            <td style={ATT.metaVal}>{selected?.payload?.verifiedBy || "—"}</td>
            <td style={ATT.metaKey}>Approved by</td>
            <td style={ATT.metaVal}>{selected?.payload?.approvedBy || DEFAULT_QA_MANAGER}</td>
          </tr>
          <tr>
            <td style={ATT.metaKey}>Pass mark</td>
            <td style={ATT.metaVal}>{PASS_MARK}%</td>
            <td style={ATT.metaKey}>Trainees</td>
            <td style={ATT.metaVal}>{namedParticipants(selected, participants).length}</td>
          </tr>
        </tbody>
      </table>

      {selected?.payload?.objectives && (
        <div style={ATT.panel}>
          <div style={ATT.panelTitle}>Training objectives</div>
          {String(selected.payload.objectives).split(/\r?\n/).filter((ln) => ln.trim()).map((ln, i) => {
            const at = ln.indexOf(":");
            const hasLabel = at > 0 && at < 40;
            return (
              <div key={i} style={ATT.panelLine}>
                {hasLabel
                  ? <><span style={ATT.panelLabel}>{ln.slice(0, at + 1)}</span>{ln.slice(at + 1)}</>
                  : ln}
              </div>
            );
          })}
        </div>
      )}

      <div style={ATT.declaration}>
        Attendance is evidenced by each trainee&rsquo;s completed assessment. The scores and
        results below are taken from the recorded quiz and are not entered by hand.
      </div>

      {/* ── Attendance & assessment results ──
          No signature column: sitting the assessment is itself the attendance evidence. */}
      <table style={ATT.table}>
        <thead>
          <tr>
            <th style={{ ...ATT.th, width: 26 }}>#</th>
            <th style={{ ...ATT.th, textAlign: "left" }}>Trainee name</th>
            <th style={{ ...ATT.th, width: 92 }}>Emp. ID</th>
            <th style={{ ...ATT.th, width: 190 }}>Designation</th>
            <th style={{ ...ATT.th, width: 70 }}>Score</th>
            <th style={{ ...ATT.th, width: 80 }}>Result</th>
          </tr>
        </thead>
        <tbody>
          {namedParticipants(selected, participants).map((pt, i) => {
            const zebra = i % 2 ? { background: "#f8fafc" } : null;
            const passed = String(pt.result || "").toUpperCase() === "PASS";
            return (
              <tr key={pt.employeeId || pt.name || i}>
                <td style={{ ...ATT.td, ...zebra, textAlign: "center", color: "#64748b" }}>{i + 1}</td>
                <td style={{ ...ATT.td, ...zebra, fontWeight: 700 }}>{pt.name}</td>
                <td style={{ ...ATT.td, ...zebra, textAlign: "center" }}>{pt.employeeId || "—"}</td>
                <td style={{ ...ATT.td, ...zebra, color: "#475569" }}>{pt.designation || "—"}</td>
                <td style={{ ...ATT.td, ...zebra, textAlign: "center", fontWeight: 700 }}>{pt.score || "—"}</td>
                <td style={{
                  ...ATT.td, ...zebra, textAlign: "center", fontWeight: 800, letterSpacing: 0.4,
                  color: pt.result ? (passed ? "#15803d" : "#b91c1c") : "#94a3b8",
                }}>{pt.result || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={ATT.footer}>
        <span>{[TRAINING_DOC_NO, `Rev ${TRAINING_DOC_REV}`, "ISO 22000:2018"].filter(Boolean).join(" · ")}</span>
        <span>Printed on {new Date().toISOString().slice(0, 10)}</span>
      </div>
    </div>
  );
}
