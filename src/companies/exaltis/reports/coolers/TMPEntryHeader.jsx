// src/companies/exaltis/reports/coolers/TMPEntryHeader.jsx
// Cooler temperatures — document header and temperature input style.
// (Split out of CoolersTab.js — the code is unchanged.)
import { Bi } from "../bilingual";
import { rangeOf, warnBandOf } from "../coolerDefs";
import { LOGO_FALLBACK, defaultTMPHeader } from "./coolersModel";

/* ---- Small UI helpers ---- */
export function RowKV({ label, value }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
      <div
        style={{
          padding: "6px 8px",
          borderInlineEnd: "1px solid #000",
          minWidth: 170,
          fontWeight: 700,
        }}
      >
        <Bi en={label} />
      </div>
      <div style={{ padding: "6px 8px", flex: 1 }}>{value}</div>
    </div>
  );
}

/* Document header (no manual title editing) */
export function TMPEntryHeader({ header, logoUrl, reportDate, dateValue, onDateChange }) {
  const h = header || defaultTMPHeader;
  return (
    <div style={{ border: "1px solid #000", marginBottom: 12, background: "#fff" }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", alignItems: "stretch" }}>
        <div
          style={{
            borderInlineEnd: "1px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          <img
            src={logoUrl || LOGO_FALLBACK}
            alt=""
            style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }}
            crossOrigin="anonymous"
          />
        </div>
        <div style={{ borderInlineEnd: "1px solid #000" }}>
          <RowKV label="Document Title:" value={h.documentTitle} />
          <RowKV label="Issue Date:" value={h.issueDate} />
          <RowKV label="Area:" value={h.area} />
          <RowKV label="Controlling Officer:" value={h.controllingOfficer} />
        </div>
        <div>
          <RowKV label="Document No:" value={h.documentNo} />
          <RowKV label="Revision No:" value={h.revisionNo} />
          <RowKV label="Issued by:" value={h.issuedBy} />
          <RowKV label="Approved by:" value={h.approvedBy} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #000" }}>
        <div style={{ textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          
        </div>
        <div style={{ textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          <Bi en="TEMPERATURE CONTROL CHECKLIST (CCP)" ar="قائمة فحص التحكم بالحرارة (نقطة تحكم حرجة)" />
        </div>

        <div style={{ padding: "8px 10px", lineHeight: 1.6 }}>
          <div><Bi en="1) If the temp is +5°C or more, check product temperature - take corrective action." ar="1) إذا كانت الحرارة +5 °م أو أكثر افحص حرارة المنتج واتخذ إجراءً تصحيحياً." /></div>
          <div><Bi en="2) If the loading area is more than +16°C - take corrective action." ar="2) إذا تجاوزت منطقة التحميل +16 °م اتخذ إجراءً تصحيحياً." /></div>
          <div><Bi en="3) If the preparation area is more than +10°C - take corrective action." ar="3) إذا تجاوزت منطقة التحضير +10 °م اتخذ إجراءً تصحيحياً." /></div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>
            <Bi en="Corrective action: transfer the products to another cold room and call maintenance to check and solve the problem." ar="الإجراء التصحيحي: انقل المنتجات إلى غرفة تبريد أخرى واستدعِ الصيانة لفحص المشكلة وحلها." />
          </div>
        </div>

        {/* Report Date */}
        <div style={{ borderTop: "1px solid #000" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 170, fontWeight: 700 }}>
              <Bi en="Report Date:" ar="تاريخ التقرير:" />
            </div>
            <div style={{ padding: "6px 8px", flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800 }}>{reportDate || "—"}</span>
              <input
                type="date"
                value={dateValue}
                onChange={onDateChange}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* One style function for every unit — the band comes from the unit's own
   definition, so a dry store no longer paints 20°C red. */
export function tempInputStyle(temp, def) {
  const t = Number(temp);
  const base = {
    width: 80,
    padding: "6px 8px",
    borderRadius: 8,
    border: "1.7px solid #94a3b8",
    textAlign: "center",
    fontWeight: 600,
    color: "#111827",
    background: "#ffffff",
    transition: "all .18s",
  };
  if (Number.isNaN(t) || temp === "") return base;

  const { min, max } = rangeOf(def);
  if (t < min || t > max) {
    return { ...base, background: "#fee2e2", borderColor: "#ef4444", color: "#991b1b", fontWeight: 700 };
  }
  if (t >= max - warnBandOf(def)) {
    return { ...base, background: "#e0f2fe", borderColor: "#38bdf8", color: "#075985" };
  }
  return base;
}
