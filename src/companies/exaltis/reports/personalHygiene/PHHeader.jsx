// src/companies/exaltis/reports/personalHygiene/PHHeader.jsx
// Personal Hygiene — document header, footer and header editor.
// (Split out of PersonalHygieneTab.js — the code is unchanged.)
import { Bi } from "../bilingual";
import { LOGO_FALLBACK, defaultPHHeader, defaultPHFooter } from "./phModel";

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

export function PHEntryHeader({ header, date, logoUrl }) {
  const h = header || defaultPHHeader;
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr 1fr",
          alignItems: "stretch",
        }}
      >
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
          <RowKV label="Issued By:" value={h.issuedBy} />
          <RowKV label="Approved By:" value={h.approvedBy} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #000" }}>
        <div
          style={{
            background: "#c0c0c0",
            textAlign: "center",
            fontWeight: 900,
            padding: "6px 8px",
            borderBottom: "1px solid #000",
          }}
        >
          
        </div>
        <div
          style={{
            background: "#d6d6d6",
            textAlign: "center",
            fontWeight: 900,
            padding: "6px 8px",
            borderBottom: "1px solid #000",
          }}
        >
          <Bi en="PERSONAL HYGIENE CHECKLIST" ar="قائمة فحص النظافة الشخصية" />
        </div>
        {date ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px" }}>
            <span style={{ fontWeight: 900, textDecoration: "underline" }}><Bi en="Date:" /></span>
            <span>{date}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PHEntryFooter({ footer }) {
  const f = footer || defaultPHFooter;

  const sigCellStyle = {
    padding: "6px 8px",
    flex: 1,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
  };

  return (
    <div style={{ border: "1px solid #000", marginTop: 8 }}>
      <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontWeight: 900 }}>
        <Bi en="REMARKS / CORRECTIVE ACTIONS:" ar="الملاحظات / الإجراءات التصحيحية:" />
      </div>
      <div style={{ padding: "8px", borderBottom: "1px solid #000", minHeight: 40 }}>
        <em>*(C - Conform &nbsp;&nbsp; N/C - Non Conform)</em> <Bi en="" ar="(C = مطابق · N/C = غير مطابق)" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ display: "flex" }}>
          <div
            style={{
              padding: "6px 8px",
              borderInlineEnd: "1px solid #000",
              minWidth: 120,
              fontWeight: 700,
            }}
          >
            <Bi en="Checked By:" />
          </div>
          <div style={sigCellStyle}>{f.checkedBy || " "}</div>
        </div>
        <div style={{ display: "flex", borderInlineStart: "1px solid #000" }}>
          <div
            style={{
              padding: "6px 8px",
              borderInlineEnd: "1px solid #000",
              minWidth: 120,
              fontWeight: 700,
            }}
          >
            <Bi en="Verified By:" />
          </div>
          <div style={sigCellStyle}>{f.verifiedBy || " "}</div>
        </div>
      </div>
    </div>
  );
}

export function PHHeaderEditor({ header, setHeader, footer, setFooter }) {
  const h = header || defaultPHHeader;
  const f = footer || defaultPHFooter;
  const updateHeader = (k, v) => typeof setHeader === "function" && setHeader({ ...h, [k]: v });
  const updateFooter = (k, v) => typeof setFooter === "function" && setFooter({ ...f, [k]: v });

  const row = { display: "grid", gridTemplateColumns: "160px 1fr", gap: 8, alignItems: "center" };
  const input = { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8 };

  return (
    <details style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 12, margin: "10px 0" }}>
      <summary style={{ cursor: "pointer", fontWeight: 800 }}>⚙️ <Bi en="Edit Header & Footer (Personal Hygiene)" ar="تعديل الترويسة والتذييل (النظافة الشخصية)" /></summary>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={row}>
            <span><Bi en="Document Title" /></span>
            <input style={input} value={h.documentTitle} onChange={(e) => updateHeader("documentTitle", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Issue Date" /></span>
            <input style={input} value={h.issueDate} onChange={(e) => updateHeader("issueDate", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Area" /></span>
            <input style={input} value={h.area} onChange={(e) => updateHeader("area", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Controlling Officer" /></span>
            <input
              style={input}
              value={h.controllingOfficer}
              onChange={(e) => updateHeader("controllingOfficer", e.target.value)}
            />
          </label>
        </div>

        <div>
          <label style={row}>
            <span><Bi en="Document No" /></span>
            <input style={input} value={h.documentNo} onChange={(e) => updateHeader("documentNo", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Revision No" /></span>
            <input style={input} value={h.revisionNo} onChange={(e) => updateHeader("revisionNo", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Issued By" /></span>
            <input style={input} value={h.issuedBy} onChange={(e) => updateHeader("issuedBy", e.target.value)} />
          </label>
          <label style={row}>
            <span><Bi en="Approved By" /></span>
            <input style={input} value={h.approvedBy} onChange={(e) => updateHeader("approvedBy", e.target.value)} />
          </label>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <label style={row}>
          <span><Bi en="Checked By" /></span>
          <input style={input} value={f.checkedBy} onChange={(e) => updateFooter("checkedBy", e.target.value)} />
        </label>
        <label style={row}>
          <span><Bi en="Verified By" /></span>
          <input style={input} value={f.verifiedBy} onChange={(e) => updateFooter("verifiedBy", e.target.value)} />
        </label>
      </div>
    </details>
  );
}
