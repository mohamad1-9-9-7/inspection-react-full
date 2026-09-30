// src/companies/exaltis/reports/ncr/NcrQaVerificationCard.jsx
// Non-conformance entry — QA verification (card 5).
// (Extracted from NonConformanceReportInput.jsx — the code is unchanged.)
import { Card, Field, Pill } from "./ncrUi";
import { bi } from "../bilingual";

export function NcrQaVerificationCard({ verifiedByQA, setVerifiedByQA, verifiedByQADateISO, setVerifiedByQADateISO, verification, setVerification, qaVerificationResult, setQaVerificationResult, followupActionsRequired, setFollowupActionsRequired, followupResponsible, setFollowupResponsible, followupTargetDateISO, setFollowupTargetDateISO }) {
  return (
    <Card n="5" en="QA Verification" ar="التحقق من الجودة" badge={bi("Quality only", "للجودة فقط")} badgeCalm>
      <div className="ncr-grid">
        <Field en="Verified by (QA)" ar="تحقق بواسطة الجودة">
          <input
            type="text"
            value={verifiedByQA}
            onChange={(e) => setVerifiedByQA(e.target.value)}
            placeholder="Name · الاسم"
          />
        </Field>
        <Field en="Verification Date" ar="تاريخ التحقق">
          <input
            type="date"
            value={verifiedByQADateISO}
            onChange={(e) => setVerifiedByQADateISO(e.target.value)}
          />
        </Field>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="ncr-lbl" style={{ marginBottom: 8 }}>
          Verification of Corrective Action <span>— التحقق من الإجراء التصحيحي</span>
        </div>
        <div className="ncr-pills">
          <Pill
            type="radio"
            en="Satisfactory"
            ar="مرضي"
            tone="good"
            on={verification === "Satisfactory"}
            onClick={() => setVerification("Satisfactory")}
          />
          <Pill
            type="radio"
            en="Not Satisfactory"
            ar="غير مرضي"
            tone="bad"
            on={verification === "Not Satisfactory"}
            onClick={() => setVerification("Not Satisfactory")}
          />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="ncr-lbl" style={{ marginBottom: 8 }}>
          QA Verification Result <span>— نتيجة تحقق الجودة</span>
        </div>
        <div className="ncr-pills">
          <Pill
            type="radio"
            en="Satisfactory"
            ar="مرضي"
            tone="good"
            on={qaVerificationResult === "Satisfactory"}
            onClick={() => setQaVerificationResult("Satisfactory")}
          />
          <Pill
            type="radio"
            en="Not Satisfactory"
            ar="غير مرضي"
            tone="bad"
            on={qaVerificationResult === "Not Satisfactory"}
            onClick={() => setQaVerificationResult("Not Satisfactory")}
          />
        </div>
      </div>

      {/* Follow-up only exists because the result was not satisfactory — so it
          only appears then, instead of sitting empty on every report. */}
      {qaVerificationResult === "Not Satisfactory" ? (
        <div className="ncr-grid" style={{ marginTop: 16 }}>
          <Field en="Follow-up Actions Required" ar="إجراءات المتابعة المطلوبة" span2>
            <input
              type="text"
              value={followupActionsRequired}
              onChange={(e) => setFollowupActionsRequired(e.target.value)}
              placeholder="Write actions… · اكتب الإجراءات…"
            />
          </Field>
          <Field en="Follow-up Responsible" ar="مسؤول المتابعة">
            <input
              type="text"
              value={followupResponsible}
              onChange={(e) => setFollowupResponsible(e.target.value)}
              placeholder="Name · الاسم"
            />
          </Field>
          <Field en="Follow-up Target Date" ar="تاريخ المتابعة المستهدف">
            <input
              type="date"
              value={followupTargetDateISO}
              onChange={(e) => setFollowupTargetDateISO(e.target.value)}
            />
          </Field>
        </div>
      ) : null}
    </Card>
  );
}
