// src/companies/exaltis/reports/ncr/NcrIdentificationCard.jsx
// Non-conformance entry — Identification (card 1).
// (Extracted from NonConformanceReportInput.jsx — the code is unchanged.)
import { Card, Field, Pill } from "./ncrUi";
import { bi } from "../bilingual";
import { SOURCES } from "./ncrModel";

export function NcrIdentificationCard({ show, location, setLocation, branchOptions, dateISO, setDraftNew, setDateISO, refNo, legacyNcNo, issuedTo, setIssuedTo, issuedBy, setIssuedBy, sources, setSources }) {
  return (
    <Card n="1" en="Identification" ar="التعريف">
      <div className="ncr-grid">
        <Field en="Branch / Location" ar="الفرع" required missing={show("location")}>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">{bi("— pick a branch —", "— اختر الفرع —")}</option>
            {branchOptions.map((b) => (
              <option key={b.code} value={b.code}>{b.label}</option>
            ))}
          </select>
        </Field>

        <Field en="Report Date" ar="تاريخ التقرير" required missing={show("date")}>
          <input
            type="date"
            value={dateISO}
            onChange={(e) => { setDraftNew(false); setDateISO(e.target.value); }}
          />
        </Field>

        <Field
          en="NC No."
          ar="رقم عدم المطابقة"
          hint={refNo ? bi("Allocated by the server — cannot be edited.", "مخصص من الخادم — لا يمكن تعديله.") : bi("Allocated automatically when you save.", "يُخصَّص تلقائياً عند الحفظ.")}
        >
          <input type="text" readOnly value={refNo || legacyNcNo || "— on save · عند الحفظ —"} />
        </Field>

        <Field en="Issued to" ar="موجّه إلى">
          <input
            type="text"
            value={issuedTo}
            onChange={(e) => setIssuedTo(e.target.value)}
            placeholder="Name / Department · الاسم / القسم"
          />
        </Field>

        <Field en="Issued by" ar="أصدره">
          <input
            type="text"
            value={issuedBy}
            onChange={(e) => setIssuedBy(e.target.value)}
            placeholder="Name · الاسم"
          />
        </Field>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="ncr-lbl" style={{ marginBottom: 8 }}>
          Raised from <span>— مصدر عدم المطابقة</span>
        </div>
        <div className="ncr-pills">
          {SOURCES.map((s) => (
            <Pill
              key={s.key}
              en={s.en}
              ar={s.ar}
              on={sources[s.key]}
              onClick={() => setSources((p) => ({ ...p, [s.key]: !p[s.key] }))}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
