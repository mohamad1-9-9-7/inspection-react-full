// src/companies/exaltis/reports/ncr/NcrClosureCard.jsx
// Non-conformance entry — Final QA closure (card 6).
// (Extracted from NonConformanceReportInput.jsx — the code is unchanged.)
import { Card, Field, Pill } from "./ncrUi";
import { bi } from "../bilingual";
import { todayDubaiISO } from "./ncrModel";

export function NcrClosureCard({ closing, statusMeta, closureDateISO, setClosureDateISO, show, finalQaName, setFinalQaName, finalQaDateISO, setFinalQaDateISO, finalQaApproved, setFinalQaApproved, signature, setSignature, signatureDate, setSignatureDate, responsiblePerson, setResponsiblePerson, responsibleSignature, setResponsibleSignature }) {
  return (
    <Card
      n="6"
      en="Final QA Closure"
      ar="الإغلاق النهائي من الجودة"
      locked={!closing}
      badge={closing ? bi("Required", "مطلوب") : bi("Only when status = Closed", "فقط عند الحالة = مغلق")}
      badgeCalm={!closing}
    >
      {!closing ? (
        <div className="ncr-empty" style={{ marginBottom: 16 }}>
          The NCR is <b>{statusMeta.en}</b> — leave this section empty until the finding is
          actually resolved, then set the status to <b>Closed</b>.
          <div style={{ direction: "rtl", marginTop: 6 }}>
            التقرير <b>{statusMeta.ar}</b> — اتركه فارغاً لحين حل المخالفة، وبعدها اضبط الحالة على «مغلق».
          </div>
        </div>
      ) : null}

      <div className="ncr-grid">
        <Field en="Closure Date" ar="تاريخ الإغلاق">
          <input
            type="date"
            value={closureDateISO}
            onChange={(e) => setClosureDateISO(e.target.value)}
          />
        </Field>
        <Field
          en="QA Name (Sign/Approve)"
          ar="اسم مسؤول الجودة"
          required={closing}
          missing={show("finalQaName")}
        >
          <input
            type="text"
            value={finalQaName}
            onChange={(e) => setFinalQaName(e.target.value)}
            placeholder="QA name · اسم الجودة"
          />
        </Field>
        <Field
          en="Approval Date"
          ar="تاريخ الاعتماد"
          required={closing}
          missing={show("finalQaDate")}
        >
          <input
            type="date"
            value={finalQaDateISO}
            onChange={(e) => setFinalQaDateISO(e.target.value)}
          />
        </Field>
        <div className={`ncr-f${show("finalQaApproved") ? " is-missing" : ""}`}>
          <div className="ncr-lbl">
            Approve {closing ? <b>*</b> : null} <span>— اعتماد</span>
          </div>
          <div className="ncr-pills">
            <Pill
              en="Approved"
              ar="معتمد"
              tone="good"
              on={finalQaApproved}
              onClick={(e) => {
                const on = e.target.checked;
                setFinalQaApproved(on);
                if (on && !finalQaDateISO) setFinalQaDateISO(todayDubaiISO());
              }}
            />
          </div>
        </div>
      </div>

      <div className="ncr-grid" style={{ marginTop: 16 }}>
        <Field en="Signature" ar="التوقيع">
          <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} />
        </Field>
        <Field en="Signature Date" ar="تاريخ التوقيع">
          <input
            type="text"
            value={signatureDate}
            onChange={(e) => setSignatureDate(e.target.value)}
            placeholder="dd/mm/yyyy"
          />
        </Field>
        <Field en="Responsible Person" ar="الشخص المسؤول">
          <input
            type="text"
            value={responsiblePerson}
            onChange={(e) => setResponsiblePerson(e.target.value)}
          />
        </Field>
        <Field en="Responsible Signature" ar="توقيع المسؤول">
          <input
            type="text"
            value={responsibleSignature}
            onChange={(e) => setResponsibleSignature(e.target.value)}
          />
        </Field>
      </div>
    </Card>
  );
}
