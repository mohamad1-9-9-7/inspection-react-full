// src/pages/admin/QCSRawMaterialView/EditReportModal.jsx
import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import {
  ATTRIBUTES,
  GENERAL_FIELDS_ORDER,
  keyLabels,
  defaultDocMeta,
} from "./viewUtils";
import { ItemCodeInput, ItemNameInput } from "../../monitor/branches/_shared/CodedProductField";
import MultiDateField from "../../monitor/branches/_shared/MultiDateField";

/* ── numeric helper (same behaviour as ReportDetails) ── */
const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/* fields that make sense as <input type="date"> */
const DATE_FIELDS = new Set(["reportOn", "receivedOn", "inspectionDate"]);
/* sample attributes that hold one or more dates */
const SAMPLE_DATE_FIELDS = new Set(["slaughterDate", "expiryDate"]);
/* YES / NO dropdowns */
const YESNO_FIELDS = new Set(["localLogger", "internationalLogger"]);

const STATUS_OPTIONS = ["Acceptable", "Average", "Below Average"];

/* general-info field order incl. receivingAddress (mirror of ReportDetails) */
const buildGeneralFields = () => {
  const arr = Array.isArray(GENERAL_FIELDS_ORDER) ? [...GENERAL_FIELDS_ORDER] : [];
  if (!arr.includes("receivingAddress")) {
    const idx = arr.indexOf("origin");
    if (idx >= 0) arr.splice(idx + 1, 0, "receivingAddress");
    else arr.push("receivingAddress");
  }
  return arr;
};

const labelFor = (k) =>
  k === "receivingAddress" ? "Receiving Address" : keyLabels[k] || k;

/* ── shared input styles ── */
const inp = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 600,
};
const lbl = { fontWeight: 800, color: "#475569", fontSize: 12, marginBottom: 4, display: "block" };
const sectionHdr = {
  fontWeight: 900,
  color: "#1e1b4b",
  fontSize: 15,
  margin: "18px 0 10px",
  borderBottom: "2px solid #e2e8f0",
  paddingBottom: 6,
};
const btn = (bg, color, border) => ({
  padding: "9px 18px",
  borderRadius: 10,
  background: bg,
  color,
  border: border || "none",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
});

export default function EditReportModal({ report, onClose, onSave }) {
  const generalFields = useMemo(buildGeneralFields, []);

  // ── local editable copies ──
  const [shipmentType, setShipmentType] = useState(report?.shipmentType || "");
  const [status, setStatus] = useState(report?.status || "Acceptable");
  const [general, setGeneral] = useState(() => ({ ...(report?.generalInfo || {}) }));
  const [samples, setSamples] = useState(() =>
    Array.isArray(report?.samples) ? report.samples.map((s) => ({ ...s })) : []
  );
  const [lines, setLines] = useState(() =>
    Array.isArray(report?.productLines)
      ? report.productLines.map((l) => ({
          code: l?.code ?? l?.itemCode ?? l?.item_code ?? "",
          name: l?.name ?? l?.productName ?? "",
          qty: l?.qty ?? l?.quantity ?? l?.pcs ?? l?.pieces ?? "",
          weight: l?.weight ?? l?.wt ?? l?.kg ?? l?.kgs ?? l?.weightKg ?? "",
        }))
      : []
  );
  const [inspectedBy, setInspectedBy] = useState(
    report?.inspectedBy || report?.inspectorName || report?.generalInfo?.inspectorName || ""
  );
  const [verifiedBy, setVerifiedBy] = useState(
    report?.verifiedBy || report?.auditorName || report?.generalInfo?.auditorName || ""
  );
  const [notes, setNotes] = useState(report?.notes || report?.generalInfo?.notes || "");
  const [docMeta, setDocMeta] = useState(() => ({ ...defaultDocMeta, ...(report?.docMeta || {}) }));
  const [saving, setSaving] = useState(false);

  // ── live totals from product lines ──
  const totals = useMemo(() => {
    const q = lines.reduce((a, l) => a + toNum(l.qty), 0);
    const w = lines.reduce((a, l) => a + toNum(l.weight), 0);
    return {
      totalQuantity: q,
      totalWeight: Number(w.toFixed(3)),
      averageWeight: q > 0 ? Number((w / q).toFixed(3)) : 0,
    };
  }, [lines]);

  const setGeneralField = (k, v) => setGeneral((g) => ({ ...g, [k]: v }));

  // ── samples helpers ──
  const setSampleField = (idx, key, v) =>
    setSamples((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: v } : s)));
  const addSample = () => setSamples((prev) => [...prev, { productName: "" }]);
  const removeSample = (idx) => setSamples((prev) => prev.filter((_, i) => i !== idx));

  // ── product-line helpers ──
  const setLineField = (idx, key, v) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: v } : l)));
  const addLine = () => setLines((prev) => [...prev, { code: "", name: "", qty: "", weight: "" }]);
  // Code and name are one unit — a catalog pick on either side rewrites both.
  const setSampleProduct = (idx, { code, name }) =>
    setSamples((prev) => prev.map((s, i) => (i === idx ? { ...s, productCode: code, productName: name } : s)));

  // Product lines may only name products that appear in the sample columns.
  const lineKeyOf = (r) => (r?.code || r?.name ? `${r.code || ""}||${r.name || ""}` : "");
  const sampleProducts = useMemo(() => {
    const seen = new Map();
    samples.forEach((s) => {
      const code = String(s?.productCode ?? s?.itemCode ?? "").trim();
      const name = String(s?.productName ?? "").trim();
      if (!code && !name) return;
      const key = `${code}||${name}`;
      if (!seen.has(key)) seen.set(key, { key, code, name });
    });
    return Array.from(seen.values());
  }, [samples]);
  const pickLineProduct = (idx, key) => {
    const hit = sampleProducts.find((sp) => sp.key === key);
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, code: hit?.code ?? "", name: hit?.name ?? "" } : l))
    );
  };
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const cleanLines = lines
      .filter((l) => String(l.name).trim() || String(l.code || "").trim() || l.qty || l.weight)
      .map((l, i) => ({
        id: report?.productLines?.[i]?.id || `pl_${i}_${Date.now()}`,
        code: String(l.code || "").trim(),
        name: String(l.name).trim(),
        qty: l.qty,
        weight: l.weight,
      }));

    const next = {
      ...report,
      shipmentType: shipmentType.trim(),
      status,
      generalInfo: { ...report?.generalInfo, ...general },
      samples,
      productLines: cleanLines,
      inspectedBy: inspectedBy.trim(),
      verifiedBy: verifiedBy.trim(),
      notes,
      docMeta,
      totalQuantity: totals.totalQuantity,
      totalWeight: totals.totalWeight,
      averageWeight: totals.averageWeight,
    };

    try {
      setSaving(true);
      await onSave(next);
      onClose();
    } catch (e) {
      alert("❌ Failed to save changes to the server.");
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.55)",
        backdropFilter: "blur(3px)",
        zIndex: 99998,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 12px",
        overflowY: "auto",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, 100%)",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 24px 80px rgba(0,0,0,.4)",
          overflow: "hidden",
          margin: "auto 0",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            color: "#fff",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 17 }}>✏️ Edit Shipment Report</div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: "none", borderRadius: 8, width: 34, height: 34, fontSize: 18, fontWeight: 900, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div style={{ padding: "6px 22px 20px", maxHeight: "72vh", overflowY: "auto" }}>
          {/* Shipment type + status */}
          <div style={sectionHdr}>📦 Shipment</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <div>
              <label style={lbl}>Shipment Type</label>
              <input style={inp} value={shipmentType} onChange={(e) => setShipmentType(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Shipment Status</label>
              <select
                style={{
                  ...inp,
                  fontWeight: 800,
                  color: status === "Acceptable" ? "#16a34a" : status === "Average" ? "#d97706" : "#dc2626",
                }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          {/* General info */}
          <div style={sectionHdr}>📋 General Information</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            {generalFields.map((k) => (
              <div key={k}>
                <label style={lbl}>{labelFor(k)}</label>
                {YESNO_FIELDS.has(k) ? (
                  <select style={inp} value={general[k] ?? ""} onChange={(e) => setGeneralField(k, e.target.value)}>
                    <option value="">—</option>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                ) : (
                  <input
                    style={inp}
                    type={DATE_FIELDS.has(k) ? "date" : "text"}
                    value={general[k] ?? ""}
                    onChange={(e) => setGeneralField(k, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Test samples */}
          <div style={sectionHdr}>🧪 Test Samples</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 620 }}>
              <thead>
                <tr>
                  <th style={{ ...thTd, textAlign: "left", background: "#f8fafc", minWidth: 150 }}>Attribute</th>
                  {samples.map((_, idx) => (
                    <th key={idx} style={{ ...thTd, background: "#f8fafc", minWidth: 130 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        Sample {idx + 1}
                        <button
                          onClick={() => removeSample(idx)}
                          title="Remove sample"
                          style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, width: 22, height: 22, cursor: "pointer", fontWeight: 900 }}
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
                <tr>
                  <th style={{ ...thTd, textAlign: "left", background: "#f1f5f9", fontWeight: 700 }}>Product Code</th>
                  {samples.map((s, idx) => (
                    <th key={`pc-${idx}`} style={{ ...thTd, background: "#f1f5f9" }}>
                      <ItemCodeInput
                        code={s.productCode ?? s.itemCode ?? ""}
                        name={s.productName ?? ""}
                        onChange={(pair) => setSampleProduct(idx, pair)}
                        style={inp}
                      />
                    </th>
                  ))}
                </tr>
                <tr>
                  <th style={{ ...thTd, textAlign: "left", background: "#f1f5f9", fontWeight: 700 }}>Product Name</th>
                  {samples.map((s, idx) => (
                    <th key={`pn-${idx}`} style={{ ...thTd, background: "#f1f5f9" }}>
                      <ItemNameInput
                        code={s.productCode ?? s.itemCode ?? ""}
                        name={s.productName ?? ""}
                        onChange={(pair) => setSampleProduct(idx, pair)}
                        style={inp}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ATTRIBUTES.map((attr) => (
                  <tr key={attr.key}>
                    <td style={{ ...thTd, textAlign: "left", fontWeight: 800, color: "#334155" }}>{attr.label}</td>
                    {samples.map((s, idx) => (
                      <td key={`${attr.key}-${idx}`} style={thTd}>
                        {SAMPLE_DATE_FIELDS.has(attr.key) ? (
                          <MultiDateField
                            value={s[attr.key] ?? ""}
                            onChange={(v) => setSampleField(idx, attr.key, v)}
                            style={inp}
                          />
                        ) : (
                          <input style={inp} value={s[attr.key] ?? ""} onChange={(e) => setSampleField(idx, attr.key, e.target.value)} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addSample} style={{ ...btn("#eef2ff", "#4338ca", "1.5px solid #c7d2fe"), marginTop: 10, fontSize: 13, padding: "7px 14px" }}>
            ➕ Add sample
          </button>

          {/* Product lines */}
          <div style={sectionHdr}>📦 Product Lines</div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...thTd, textAlign: "left", background: "#f8fafc", width: 130 }}>Item Code</th>
                <th style={{ ...thTd, textAlign: "left", background: "#f8fafc" }}>Product Name</th>
                <th style={{ ...thTd, background: "#f8fafc", width: 120 }}>Qty (pcs)</th>
                <th style={{ ...thTd, background: "#f8fafc", width: 130 }}>Weight (kg)</th>
                <th style={{ ...thTd, background: "#f8fafc", width: 46 }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx}>
                  {/* A product line names a product inspected in the sample
                      columns above, so it is picked from those — not the whole
                      catalog. */}
                  <td style={thTd}>
                    <select value={lineKeyOf(l)} onChange={(e) => pickLineProduct(idx, e.target.value)} style={inp}>
                      <option value="">— اختر —</option>
                      {sampleProducts.map((sp) => (
                        <option key={sp.key} value={sp.key}>
                          {sp.code || "—"}{sp.name ? ` · ${sp.name}` : ""}
                        </option>
                      ))}
                      {lineKeyOf(l) && !sampleProducts.some((sp) => sp.key === lineKeyOf(l)) && (
                        <option value={lineKeyOf(l)}>
                          {l.code || "—"}{l.name ? ` · ${l.name}` : ""} (خارج العينات)
                        </option>
                      )}
                    </select>
                  </td>
                  <td style={thTd}>
                    <input value={l.name || ""} readOnly style={{ ...inp, background: "#f1f5f9", fontWeight: 700 }} />
                  </td>
                  <td style={thTd}><input style={inp} type="number" value={l.qty} onChange={(e) => setLineField(idx, "qty", e.target.value)} /></td>
                  <td style={thTd}><input style={inp} type="number" value={l.weight} onChange={(e) => setLineField(idx, "weight", e.target.value)} /></td>
                  <td style={thTd}>
                    <button onClick={() => removeLine(idx)} title="Remove row" style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, width: 30, height: 30, cursor: "pointer", fontWeight: 900 }}>×</button>
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={5} style={{ ...thTd, textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>No product lines.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ ...thTd, textAlign: "right", fontWeight: 800 }}>Totals:</td>
                <td style={{ ...thTd, textAlign: "center", fontWeight: 800 }}>{totals.totalQuantity}</td>
                <td style={{ ...thTd, textAlign: "center", fontWeight: 800 }}>{totals.totalWeight}</td>
                <td style={thTd} />
              </tr>
              <tr>
                <td colSpan={5} style={{ ...thTd, textAlign: "right", color: "#475569" }}>
                  Average Weight (kg/pc): <strong>{totals.averageWeight}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
          <button onClick={addLine} style={{ ...btn("#eef2ff", "#4338ca", "1.5px solid #c7d2fe"), marginTop: 10, fontSize: 13, padding: "7px 14px" }}>
            ➕ Add product line
          </button>

          {/* Inspector / auditor */}
          <div style={sectionHdr}>👤 Inspector / Auditor</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <div>
              <label style={lbl}>Inspector Name (اسم المفتش)</label>
              <input style={inp} value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Auditor / Verifier (اسم المدقق)</label>
              <input style={inp} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div style={sectionHdr}>📝 Notes</div>
          <textarea
            style={{ ...inp, minHeight: 80, resize: "vertical", fontWeight: 500 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Document meta */}
          <div style={sectionHdr}>🗂 Document Info</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            {[
              ["documentTitle", "Document Title"],
              ["documentNo", "Document No"],
              ["issueDate", "Issue Date"],
              ["revisionNo", "Revision No"],
              ["area", "Area"],
            ].map(([k, label]) => (
              <div key={k}>
                <label style={lbl}>{label}</label>
                <input style={inp} value={docMeta[k] ?? ""} onChange={(e) => setDocMeta((d) => ({ ...d, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <button onClick={onClose} disabled={saving} style={btn("#e2e8f0", "#475569")}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={btn(saving ? "#a5b4fc" : "#4f46e5", "#fff")}>
            {saving ? "Saving…" : "💾 Save changes"}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

const thTd = {
  border: "1px solid #e2e8f0",
  padding: 6,
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: 13,
};
