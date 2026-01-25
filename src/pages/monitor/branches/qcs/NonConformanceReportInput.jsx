// src/pages/monitor/branches/qcs/NonConformanceReportInput.jsx
import React, { useMemo, useRef, useState } from "react";

/* =========================
   API base (CRA + Vite safe)
========================= */
const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";

const CRA_URL =
  typeof process !== "undefined" &&
  process.env &&
  process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL
    : undefined;

let VITE_URL;
try {
  VITE_URL = import.meta.env?.VITE_API_URL;
} catch {}

const API_BASE = String(VITE_URL || CRA_URL || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

/* ---- Fallbacks ---- */
const LOGO_FALLBACK = "/brand/al-mawashi.jpg";
const TYPE = "qcs_non_conformance";
const MAX_EVIDENCE_IMAGES = 10;

/* =========================
   Images API (same as Returns.js)
========================= */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: fd,
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}
async function deleteImage(url) {
  if (!url) return;
  const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Delete image failed");
}

/* ---- Small UI helpers ---- */
function RowKV({ label, value }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
      <div
        style={{
          padding: "10px 12px",
          borderInlineEnd: "1px solid #000",
          minWidth: 190,
          fontWeight: 800,
          fontSize: 14,
        }}
      >
        {label}
      </div>
      <div style={{ padding: "10px 12px", flex: 1, fontSize: 14 }}>{value}</div>
    </div>
  );
}

/* ======= Header ======= */
function NCEntryHeader({ header, date, logoUrl }) {
  const h = header;
  return (
    <div style={{ border: "1px solid #000", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 1fr", alignItems: "stretch" }}>
        <div
          style={{
            borderInlineEnd: "1px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
            background: "#fff",
          }}
        >
          <img
            src={logoUrl || LOGO_FALLBACK}
            alt="Al Mawashi"
            style={{ maxWidth: "100%", maxHeight: 90, objectFit: "contain" }}
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
            background: "#bfbfbf",
            textAlign: "center",
            fontWeight: 1000,
            padding: "10px 12px",
            borderBottom: "1px solid #000",
            fontSize: 16,
            letterSpacing: 0.2,
          }}
        >
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS
        </div>

        <div
          style={{
            background: "#e1e1e1",
            textAlign: "center",
            fontWeight: 1000,
            padding: "10px 12px",
            borderBottom: "1px solid #000",
            fontSize: 18,
            letterSpacing: 0.4,
          }}
        >
          NON-CONFORMANCE REPORT
        </div>

        {date ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px" }}>
            <span style={{ fontWeight: 1000, textDecoration: "underline", fontSize: 14 }}>Date:</span>
            <span style={{ fontSize: 14, fontWeight: 900 }}>{date}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* =========================
   Styles (Better, bigger)
========================= */
const pageWrap = {
  width: "100%",
  maxWidth: 1200,
  margin: "0 auto",
};

const sheet = {
  width: "100%",
  maxWidth: "100%",
  margin: 0,
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(2,6,23,.08)",
  fontFamily: "Inter, Arial, 'Segoe UI', Tahoma, sans-serif",
  fontSize: 14,
  padding: 16,
  boxSizing: "border-box",
};

const table = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };

const cell = {
  border: "1px solid #000",
  padding: "10px 12px",
  verticalAlign: "middle",
  fontSize: 14,
};

const labelCell = {
  ...cell,
  background: "#f8fafc",
  fontWeight: 900,
};

const inputInline = {
  width: "100%",
  border: "1px solid #cbd5e1",
  outline: "none",
  padding: "10px 12px",
  margin: 0,
  fontSize: 14,
  background: "#fff",
  borderRadius: 10,
  boxSizing: "border-box",
};

const area = {
  width: "100%",
  border: "1px solid #cbd5e1",
  outline: "none",
  minHeight: 140,
  resize: "vertical",
  padding: "10px 12px",
  fontSize: 14,
  boxSizing: "border-box",
  borderRadius: 12,
  background: "#fff",
};

const smallArea = { ...area, minHeight: 110 };

const btn = (bg) => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(2,6,23,.12)",
});

const ghostBtn = {
  background: "#f1f5f9",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const pill = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "#f1f5f9",
  border: "1px solid #cbd5e1",
  padding: "8px 10px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 13,
};

const divider = {
  height: 1,
  background: "#e5e7eb",
  margin: "14px 0",
};

/* =========================
   Server helpers (NC only)
========================= */
async function listReportsByType(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, {
    method: "GET",
    cache: "no-store",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : json?.data || [];
}
async function fetchExistingNCByDate(dateStr) {
  const rows = await listReportsByType(TYPE);
  const found = rows.find((r) => String(r?.payload?.headRow?.reportDate || r?.payload?.reportDate || "") === String(dateStr));
  return found ? { id: found._id || found.id, payload: found.payload || {} } : null;
}

/* =========================
   Component
========================= */
export default function NonConformanceReportInput(props) {
  const { logoUrl } = props || {};
  const evidenceInputRef = useRef(null);

  const [header] = useState({
    documentTitle: "NC Report",
    documentNo: "TELL/QA/NC/1",
    issueDate: "30/09/2023",
    revisionNo: "0",
    area: "QA",
    issuedBy: "MOHAMAD ABDULLAH",
    controllingOfficer: "QC",
    approvedBy: "Hussam O. Sarhan",
  });

  const [dateISO, setDateISO] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  });

  const [location, setLocation] = useState("");

  const [ncNo, setNcNo] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [issuedBy, setIssuedBy] = useState("");

  const [refInhouse, setRefInhouse] = useState(false);
  const [refCustComplaint, setRefCustComplaint] = useState(false);
  const [refInternalAudit, setRefInternalAudit] = useState(false);
  const [refExternalAudit, setRefExternalAudit] = useState(false);

  const [details, setDetails] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [department, setDepartment] = useState("");

  const [implementationOwner, setImplementationOwner] = useState("");
  const [targetCompletionDateISO, setTargetCompletionDateISO] = useState("");
  const [status, setStatus] = useState("Open");

  // ✅ صور فقط (10)
  const [evidenceImages, setEvidenceImages] = useState([]);
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [evidenceMsg, setEvidenceMsg] = useState("");

  const [verification, setVerification] = useState("Satisfactory");

  const [verifiedByQA, setVerifiedByQA] = useState("");
  const [verifiedByQADateISO, setVerifiedByQADateISO] = useState("");
  const [qaVerificationResult, setQaVerificationResult] = useState("Satisfactory");
  const [followupActionsRequired, setFollowupActionsRequired] = useState("");
  const [followupResponsible, setFollowupResponsible] = useState("");
  const [followupTargetDateISO, setFollowupTargetDateISO] = useState("");
  const [closureDateISO, setClosureDateISO] = useState("");

  const [finalQaName, setFinalQaName] = useState("");
  const [finalQaDateISO, setFinalQaDateISO] = useState("");
  const [finalQaApproved, setFinalQaApproved] = useState(false);

  const [signature, setSignature] = useState("");
  const [signatureDate, setSignatureDate] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [responsibleSignature, setResponsibleSignature] = useState("");

  const [opMsg, setOpMsg] = useState("");

  const monthText = useMemo(() => {
    const m = String(dateISO || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [dateISO]);

  async function addEvidenceImagesFromFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;

    const remaining = MAX_EVIDENCE_IMAGES - evidenceImages.length;
    if (remaining <= 0) return alert(`Maximum ${MAX_EVIDENCE_IMAGES} images.`);

    const toUpload = files.slice(0, remaining);

    try {
      setEvidenceBusy(true);
      setEvidenceMsg("Uploading…");

      const urls = [];
      for (const f of toUpload) {
        if (!String(f.type || "").startsWith("image/")) continue;
        try {
          const url = await uploadViaServer(f);
          if (url) urls.push(url);
        } catch (e) {
          console.error(e);
        }
      }

      if (urls.length) {
        setEvidenceImages((prev) => [...prev, ...urls].slice(0, MAX_EVIDENCE_IMAGES));
        setEvidenceMsg(`Uploaded ${urls.length} image(s).`);
      } else {
        setEvidenceMsg("No images uploaded.");
      }
    } finally {
      setEvidenceBusy(false);
      setTimeout(() => setEvidenceMsg(""), 2500);
      if (evidenceInputRef.current) evidenceInputRef.current.value = "";
    }
  }

  async function removeEvidenceImageAt(index) {
    const url = evidenceImages[index];
    if (!url) return;

    setEvidenceImages((prev) => prev.filter((_, i) => i !== index));

    try {
      await deleteImage(url);
      setEvidenceMsg("Image removed.");
    } catch (e) {
      console.error(e);
      setEvidenceMsg("Removed locally (server delete failed).");
    } finally {
      setTimeout(() => setEvidenceMsg(""), 2200);
    }
  }

  async function saveNCToServer() {
    if (!dateISO) return alert("اختر التاريخ.");
    if (!details.trim()) return alert("اكتب تفاصيل عدم المطابقة.");

    if (!finalQaName.trim()) return alert("Final QA Closure: اكتب اسم QA (Sign/Approve).");
    if (!finalQaDateISO) return alert("Final QA Closure: اختر تاريخ الإغلاق/الاعتماد.");
    if (!finalQaApproved) return alert("Final QA Closure: لازم تفعيل (Approve) قبل الحفظ.");

    const payload = {
      headerTop: header,
      title: "TRANS EMIRATES LIVESTOCK LLC • NON-CONFORMANCE REPORT",
      location,
      headRow: {
        reportDate: dateISO,
        ncNo,
        issuedTo,
        issuedBy,
      },
      reference: {
        inhouseQC: refInhouse,
        customerComplaint: refCustComplaint,
        internalAudit: refInternalAudit,
        externalAudit: refExternalAudit,
      },
      detailsBlock: details,
      rootCause,
      correctiveAction,
      correctiveActionExtras: {
        implementationOwner,
        targetCompletionDateISO,
        status,
        evidence: {
          images: evidenceImages, // ✅ صور فقط
        },
      },
      performedBy,
      department,
      verificationOfCorrectiveAction: verification,
      qaVerification: {
        verifiedByQA,
        dateISO: verifiedByQADateISO,
        result: qaVerificationResult,
        followupActionsRequired,
        followupResponsible,
        followupTargetDateISO,
        closureDateISO,
      },
      finalQaClosure: {
        note: "electronically approved; no signature required",
        name: finalQaName,
        dateISO: finalQaDateISO,
        approved: finalQaApproved,
      },
      signature: {
        signature,
        date: signatureDate,
        responsiblePerson,
        responsibleSignature,
      },
      month: monthText,
      savedAt: Date.now(),
    };

    try {
      setOpMsg("Saving…");
      const existing = await fetchExistingNCByDate(dateISO);

      const body = { reporter: "qcs", type: TYPE, payload };

      if (existing?.id) {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(existing.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to update NC report");
      } else {
        const res = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to create NC report");
      }

      setOpMsg(`Saved for ${dateISO}.`);
    } catch (e) {
      console.error(e);
      setOpMsg(`Failed: ${e.message || e}`);
    } finally {
      setTimeout(() => setOpMsg(""), 3500);
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={pageWrap}>
        {/* Top bar */}
        <div
          style={{
            background: "#fff",
            padding: "14px 14px",
            marginBottom: 12,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 24px rgba(2,6,23,.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 1000 }}>🚫 Non-Conformance Report</div>
            <span style={pill}>Images: {evidenceImages.length}/{MAX_EVIDENCE_IMAGES}</span>
          </div>

          <label style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 10 }}>
            Date:
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                fontWeight: 900,
                fontSize: 14,
              }}
            />
          </label>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button style={btn("#2563eb")} onClick={saveNCToServer}>
              Save
            </button>
          </div>

          {opMsg ? (
            <div style={{ width: "100%", marginTop: 6, fontWeight: 1000, color: "#0f172a" }}>{opMsg}</div>
          ) : null}
        </div>

        <div style={sheet}>
          <NCEntryHeader header={header} date={dateISO} logoUrl={logoUrl} />

          {/* Location */}
          <table style={table}>
            <tbody>
              <tr>
                <td style={{ ...labelCell, width: 180 }}>Location</td>
                <td style={cell}>
                  <input style={inputInline} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., QCS - Al Qusais" />
                </td>
              </tr>
            </tbody>
          </table>

          <div style={divider} />

          {/* Date | NC No | Issued to/by */}
          <table style={table}>
            <colgroup>
              <col style={{ width: "18%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "32%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={labelCell}>Date</td>
                <td style={cell}>
                  <input style={{ ...inputInline, background: "#f8fafc" }} value={dateISO} readOnly />
                </td>
                <td style={labelCell}>NC No.</td>
                <td style={cell}>
                  <input style={inputInline} value={ncNo} onChange={(e) => setNcNo(e.target.value)} placeholder="NC-001" />
                </td>
              </tr>
              <tr>
                <td style={labelCell}>Issued to</td>
                <td style={cell}>
                  <input style={inputInline} value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} placeholder="Name / Department" />
                </td>
                <td style={labelCell}>Issued by</td>
                <td style={cell}>
                  <input style={inputInline} value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} placeholder="Name" />
                </td>
              </tr>
            </tbody>
          </table>

          <div style={divider} />

          {/* Reference */}
          <table style={table}>
            <tbody>
              <tr>
                <td style={{ ...labelCell, width: 180 }}>Reference</td>
                <td style={cell}>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontWeight: 900 }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={refInhouse} onChange={(e) => setRefInhouse(e.target.checked)} /> In-house QC
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={refCustComplaint} onChange={(e) => setRefCustComplaint(e.target.checked)} /> Customer Complaint
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={refInternalAudit} onChange={(e) => setRefInternalAudit(e.target.checked)} /> Internal Audit
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={refExternalAudit} onChange={(e) => setRefExternalAudit(e.target.checked)} /> External Audit
                    </label>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={divider} />

          {/* Details */}
          <table style={table}>
            <tbody>
              <tr>
                <td style={{ ...labelCell, width: 260 }}>Nonconformance / Report Details</td>
                <td style={cell}>
                  <textarea style={area} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Write details here..." />
                </td>
              </tr>
            </tbody>
          </table>

          <div style={divider} />

          {/* Root Cause */}
          <table style={table}>
            <tbody>
              <tr>
                <td style={{ ...labelCell, width: 260 }}>Root Cause(s) of Nonconformance</td>
                <td style={cell}>
                  <textarea style={smallArea} value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="Root cause..." />
                </td>
              </tr>
            </tbody>
          </table>

          <div style={divider} />

          {/* Corrective Action */}
          <table style={table}>
            <tbody>
              <tr>
                <td style={{ ...labelCell, width: 260 }}>Corrective Action</td>
                <td style={cell}>
                  <textarea style={smallArea} value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} placeholder="Corrective action..." />
                </td>
              </tr>
            </tbody>
          </table>

          <div style={divider} />

          {/* Owner / Target / Status */}
          <table style={table}>
            <colgroup>
              <col style={{ width: "25%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={labelCell}>Implementation Owner</td>
                <td style={cell}>
                  <input style={inputInline} value={implementationOwner} onChange={(e) => setImplementationOwner(e.target.value)} placeholder="Responsible person" />
                </td>
                <td style={labelCell}>Target Completion Date</td>
                <td style={cell}>
                  <input type="date" style={inputInline} value={targetCompletionDateISO} onChange={(e) => setTargetCompletionDateISO(e.target.value)} />
                </td>
              </tr>
              <tr>
                <td style={labelCell}>Status</td>
                <td style={cell} colSpan={3}>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontWeight: 900 }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="radio" name="status" checked={status === "Open"} onChange={() => setStatus("Open")} /> Open
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="radio" name="status" checked={status === "In Progress"} onChange={() => setStatus("In Progress")} /> In Progress
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="radio" name="status" checked={status === "Closed"} onChange={() => setStatus("Closed")} /> Closed
                    </label>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={divider} />

          {/* Evidence - Images only */}
          <table style={table}>
            <tbody>
              <tr>
                <td style={{ ...labelCell, width: 260 }}>
                  Evidence / Attachment
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, opacity: 0.8 }}>Images only (max 10)</div>
                </td>
                <td style={cell}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => evidenceInputRef.current?.click()}
                      disabled={evidenceBusy || evidenceImages.length >= MAX_EVIDENCE_IMAGES}
                      style={{
                        ...btn(evidenceBusy ? "#64748b" : "#0ea5e9"),
                        padding: "10px 14px",
                        cursor: evidenceBusy ? "not-allowed" : "pointer",
                      }}
                      title="Upload evidence images"
                    >
                      ⬆️ Upload images ({evidenceImages.length}/{MAX_EVIDENCE_IMAGES})
                    </button>

                    <button
                      type="button"
                      style={ghostBtn}
                      onClick={() => {
                        if (!evidenceImages.length) return;
                        if (!window.confirm("Remove all evidence images?")) return;

                        setEvidenceImages([]);
                      }}
                    >
                      Clear all
                    </button>

                    <input
                      ref={evidenceInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) => addEvidenceImagesFromFiles(e.target.files)}
                    />

                    {evidenceMsg ? <div style={{ fontWeight: 1000, fontSize: 13 }}>{evidenceMsg}</div> : null}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    {evidenceImages.length === 0 ? (
                      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>No evidence images yet.</div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 12,
                        }}
                      >
                        {evidenceImages.map((src, i) => (
                          <div
                            key={src + i}
                            style={{
                              position: "relative",
                              border: "1px solid #e5e7eb",
                              borderRadius: 16,
                              overflow: "hidden",
                              background: "#0b1220",
                              boxShadow: "0 10px 20px rgba(2,6,23,.14)",
                            }}
                          >
                            <img
                              src={src}
                              alt={`evidence-${i}`}
                              style={{
                                width: "100%",
                                height: 160,
                                objectFit: "cover",
                                display: "block",
                                opacity: 0.95,
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                left: 10,
                                bottom: 10,
                                background: "rgba(255,255,255,.9)",
                                color: "#0f172a",
                                padding: "6px 10px",
                                borderRadius: 999,
                                fontWeight: 1000,
                                fontSize: 12,
                                border: "1px solid rgba(0,0,0,.12)",
                              }}
                            >
                              #{i + 1}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEvidenceImageAt(i)}
                              style={{
                                position: "absolute",
                                top: 10,
                                right: 10,
                                background: "rgba(239, 68, 68, .95)",
                                color: "#fff",
                                border: "none",
                                borderRadius: 12,
                                padding: "6px 10px",
                                fontWeight: 1000,
                                cursor: "pointer",
                              }}
                              title="Remove image"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={divider} />

          {/* Performed by / Department */}
          <table style={table}>
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={labelCell}>Performed by</td>
                <td style={cell}>
                  <input style={inputInline} value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} placeholder="Name" />
                </td>
                <td style={labelCell}>Department</td>
                <td style={cell}>
                  <input style={inputInline} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department" />
                </td>
              </tr>
            </tbody>
          </table>

          <div style={divider} />

          {/* Verification of Corrective Action */}
          <table style={table}>
            <tbody>
              <tr>
                <td style={{ ...labelCell, width: 260 }}>Verification of Corrective Action</td>
                <td style={cell}>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontWeight: 1000 }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="radio" name="veri" checked={verification === "Satisfactory"} onChange={() => setVerification("Satisfactory")} /> Satisfactory
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="radio" name="veri" checked={verification === "Not Satisfactory"} onChange={() => setVerification("Not Satisfactory")} /> Not Satisfactory
                    </label>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={divider} />

          {/* QA Verification */}
          <table style={table}>
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={labelCell}>Verified by (QA)</td>
                <td style={cell}>
                  <input style={inputInline} value={verifiedByQA} onChange={(e) => setVerifiedByQA(e.target.value)} placeholder="Name" />
                </td>
                <td style={labelCell}>Date</td>
                <td style={cell}>
                  <input type="date" style={inputInline} value={verifiedByQADateISO} onChange={(e) => setVerifiedByQADateISO(e.target.value)} />
                </td>
              </tr>

              <tr>
                <td style={labelCell}>Verification Result</td>
                <td style={cell} colSpan={3}>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontWeight: 1000 }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="radio" name="qaVeri" checked={qaVerificationResult === "Satisfactory"} onChange={() => setQaVerificationResult("Satisfactory")} /> Satisfactory
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="radio" name="qaVeri" checked={qaVerificationResult === "Not Satisfactory"} onChange={() => setQaVerificationResult("Not Satisfactory")} /> Not Satisfactory
                    </label>
                  </div>
                </td>
              </tr>

              <tr>
                <td style={labelCell}>If Not Satisfactory – Follow-up Actions Required</td>
                <td style={cell} colSpan={3}>
                  <input style={inputInline} value={followupActionsRequired} onChange={(e) => setFollowupActionsRequired(e.target.value)} placeholder="Write actions..." />
                </td>
              </tr>

              <tr>
                <td style={labelCell}>Follow-up Responsible</td>
                <td style={cell}>
                  <input style={inputInline} value={followupResponsible} onChange={(e) => setFollowupResponsible(e.target.value)} placeholder="Name" />
                </td>
                <td style={labelCell}>Target Date</td>
                <td style={cell}>
                  <input type="date" style={inputInline} value={followupTargetDateISO} onChange={(e) => setFollowupTargetDateISO(e.target.value)} />
                </td>
              </tr>

              <tr>
                <td style={labelCell}>Closure Date</td>
                <td style={cell} colSpan={3}>
                  <input type="date" style={inputInline} value={closureDateISO} onChange={(e) => setClosureDateISO(e.target.value)} />
                </td>
              </tr>

              <tr>
                <td style={labelCell}>
                  Final QA Closure (Sign/Approve)
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, opacity: 0.8 }}>mandatory before Save</div>
                </td>
                <td style={cell}>
                  <input style={inputInline} value={finalQaName} onChange={(e) => setFinalQaName(e.target.value)} placeholder="QA Name (required)" />
                </td>
                <td style={labelCell}>Date</td>
                <td style={cell}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="date" style={inputInline} value={finalQaDateISO} onChange={(e) => setFinalQaDateISO(e.target.value)} />
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 1000, whiteSpace: "nowrap" }}>
                      <input type="checkbox" checked={finalQaApproved} onChange={(e) => setFinalQaApproved(e.target.checked)} />
                      Approve
                    </label>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={divider} />

          {/* Signature section (kept) */}
          <table style={table}>
            <colgroup>
              <col style={{ width: "20%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={labelCell}>Signature</td>
                <td style={cell}>
                  <input style={inputInline} value={signature} onChange={(e) => setSignature(e.target.value)} />
                </td>
                <td style={labelCell}>Date</td>
                <td style={cell}>
                  <input style={inputInline} value={signatureDate} onChange={(e) => setSignatureDate(e.target.value)} placeholder="dd/mm/yyyy" />
                </td>
              </tr>
              <tr>
                <td style={labelCell}>Responsible Person</td>
                <td style={cell}>
                  <input style={inputInline} value={responsiblePerson} onChange={(e) => setResponsiblePerson(e.target.value)} />
                </td>
                <td style={labelCell}>Signature</td>
                <td style={cell}>
                  <input style={inputInline} value={responsibleSignature} onChange={(e) => setResponsibleSignature(e.target.value)} />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer note */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: "2px solid #0f172a",
              textAlign: "center",
              fontWeight: 1000,
              fontSize: 14,
              color: "#0f172a",
              background: "#f8fafc",
              borderRadius: 14,
              padding: "12px 14px",
            }}
          >
            معتمد إلكترونياً؛ لا حاجة للتوقيع — Electronically approved; no signature required.
          </div>
        </div>
      </div>
    </div>
  );
}
