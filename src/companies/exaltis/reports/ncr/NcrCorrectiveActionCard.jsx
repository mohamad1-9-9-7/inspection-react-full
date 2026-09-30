// src/companies/exaltis/reports/ncr/NcrCorrectiveActionCard.jsx
// Non-conformance entry — Corrective action (card 3).
// (Extracted from NonConformanceReportInput.jsx — the code is unchanged.)
import { Card, Field } from "./ncrUi";
import { bi } from "../bilingual";

export function NcrCorrectiveActionCard({ closing, show, correctiveAction, setCorrectiveAction, implementationOwner, setImplementationOwner, targetCompletionDateISO, setTargetCompletionDateISO, performedBy, setPerformedBy, department, setDepartment }) {
  return (
    <Card
      n="3"
      en="Corrective Action"
      ar="الإجراء التصحيحي"
      badge={closing ? bi("Required to close", "مطلوب للإغلاق") : bi("Fill as work progresses", "يُعبّأ مع تقدم العمل")}
      badgeCalm={!closing}
    >
      <div className="ncr-grid wide">
        <Field
          en="Corrective Action"
          ar="الإجراء التصحيحي"
          required={closing}
          missing={show("correctiveAction")}
          hint={bi("Remove the cause, not only the symptom.", "أزل السبب لا العَرَض فقط.")}
        >
          <textarea
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
            placeholder="Corrective action… · الإجراء التصحيحي…"
            style={{ minHeight: 100 }}
          />
        </Field>
      </div>

      <div className="ncr-grid" style={{ marginTop: 14 }}>
        <Field en="Implementation Owner" ar="مسؤول التنفيذ">
          <input
            type="text"
            value={implementationOwner}
            onChange={(e) => setImplementationOwner(e.target.value)}
            placeholder="Responsible person · الشخص المسؤول"
          />
        </Field>
        <Field en="Target Completion Date" ar="تاريخ الإنجاز المستهدف">
          <input
            type="date"
            value={targetCompletionDateISO}
            onChange={(e) => setTargetCompletionDateISO(e.target.value)}
          />
        </Field>
        <Field en="Performed by" ar="نُفّذ بواسطة">
          <input
            type="text"
            value={performedBy}
            onChange={(e) => setPerformedBy(e.target.value)}
            placeholder="Name · الاسم"
          />
        </Field>
        <Field en="Department" ar="القسم">
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Department · القسم"
          />
        </Field>
      </div>
    </Card>
  );
}
