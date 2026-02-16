// D:\inspection-react-full\src\pages\haccp and iso\Supplier Approval\SupplierEvaluationResults.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ===================== API base ===================== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE = "supplier_self_assessment_form";

/* ===================== helpers ===================== */
async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
}
async function listReportsByType(type) {
  const url = `${REPORTS_URL}?type=${encodeURIComponent(type)}`;
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message || data?.error || `Failed to list reports (${res.status})`);
  }
  const data = await safeJson(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/* ✅ DELETE report */
async function deleteReportById(id) {
  if (!id) throw new Error("Missing report id");
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message || data?.error || `Failed to delete report (${res.status})`);
  }
  const data = await safeJson(res);
  return data;
}

function pad2(n) {
  return String(n ?? "").padStart(2, "0");
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function calcCounts(answers) {
  const a = answers || {};
  const keys = Object.keys(a);
  const yesCount = keys.filter((k) => a[k] === true).length;
  const noCount = keys.filter((k) => a[k] === false).length;
  const naCount = keys.filter((k) => a[k] === null || typeof a[k] === "undefined").length;
  return { total: keys.length, yesCount, noCount, naCount };
}

/* ===================== Questions Map (from your PDF-literal form) ===================== */
const QUESTIONS = {
  // Personal Hygiene
  ph_01: "Do you have documented Personal Hygiene standards & monitoring procedure?",
  ph_02: "Do all food handlers have valid health cards?",
  ph_03: "Is there an Illness reporting procedure available?",
  ph_04: "Do the staffs have separate changing facility & toilet away from the food handling area?",

  // Foreign Body Control
  fbc_01: "Is there a policy for the control of glass and\nexclusion of glass from production areas?",
  fbc_02: "Is there a glass/brittle material breakage\nprocedure?",
  fbc_03: "Is there a policy for the control of wood and\nexclusion of wood from production areas?",
  fbc_04: "Is there a policy for the control of metal and\nexclusion of potential metal contaminantsfrom\nproduction areas?",
  fbc_05: "Is there a policy for the control of knives and\nexclusion of unauthorized knives from the\nproduction area?",

  // Cleaning
  cln_01:
    "Do you have documented cleaning schedules that\ninclude frequency of clean, chemicals used step\nby step instructions and the standard required?",
  cln_02: "Do you monitor cleaning standards?",
  cln_03: "Is there a separate area away from food\npreparation & storage available for cleaning\nchemicals & equipment storage?",
  cln_04: "Do you use Sanitizing Chemicals specifically for\nSanitizing or Disinfecting all food contact\nsurfaces?",
  cln_05: "Do you have effective waste disposal system?",

  // Pest Control
  pst_01: "Do you have a Contract with Approved Pest\nControl Company?",
  pst_02:
    "Are raw materials, packaging and finished\nproducts stored so as to minimize the risk of\ninfestation?",
  pst_03: "Are all buildings adequately proofed?",
  pst_04:
    "Is there a complete inventory of pesticides\ndetailing the location and safe use and\napplication of baits and other materials such as\ninsecticide sprays or fumigants?",
  pst_05: "Are flying insect controls in place?",

  // Food Safety & Quality Systems
  fsq_01:
    "Do you have a documented Quality and Food\nSafety Policy & Objectives (eg. HACCP,\nISO, HALAL, GMP)?",
  fsq_02: "Do you have a documented food safety & quality\nassurance manual that includes procedures for:",
  fsq_02a: "Resources and Training?",
  fsq_02b: "Purchasing and Verification of Purchased\nMaterials?",
  fsq_02c: "Identification and Traceability?",
  fsq_02d: "Internal Audit?",
  fsq_02e: "food complaint reporting procedure with\ncorrective action plan?",
  fsq_02f: "Corrective Action and Preventive Action?",
  fsq_02g: "Product Recall?",
  fsq_03: "Are there maintenance programs for equipment\nand buildings?",
  fsq_04:
    "Is there a system forstaff training such that all\nkey personnel are trained and have training\nrecords?",
  fsq_05:
    "Do you have facilities and systems for the\ntransportation that protects products and prevent\ncontamination?",
  fsq_06: "Do you have laboratory facilities on site and are\nthey accredited?",

  // Raw materials / specs / non-conforming
  rm_01:
    "Do you monitor the quality/safety of your raw\nmaterials and request certificates of\nanalysis/conformity from your suppliers?",
  rm_02: "Do you have a traceability system and maintain\nrecords of batch codes of materials used?",
  rm_03: "Do you hold specifications for all your raw\nmaterials?",
  rm_04:
    "Do you have procedure for dealing with out of\nspecification/non-conforming raw materials and\nfinished products?",
  rm_05: "Do you have specifications for your finished\nproducts?",
  rm_06: "Do you test all finished product against your\nspecification?",
  rm_07: "Do you have a procedure for dealing with non￾\nconforming raw materials and finished products?",

  // Process controls
  proc_01:
    "Have your critical control points (safety and\nquality) been identified for your production\nprocess?",
  proc_02:
    "Is there a temperature monitoring system in\nplace during chilled or frozen storage, heat\nprocessing, cold processing etc.?",

  // Transportation
  trn_01: "Is the vehicle temperature is monitored during\ntransportation?",
  trn_02: "Is there a cleaning schedule for the vehicles &\nverification system available?",
  trn_03: "Are all the vehicles holding valid food control\nregulatory approval?",

  // Production Area Controls
  prd_01: "Are your production methods documented and\navailable on the factory floor?",
  prd_02: "Are critical measurement devices calibrated to a\nNational Standard?",
  prd_03: "Do you metal detect your finished product?",
  prd_04:
    "Are all points of entry and ventilation protected\nfrom access by birds, insects, rodents, dust and\ndebris?",
  prd_05: "Do you operate a planned maintenance\nprogramme?",

  // Equipment (continued)
  eqp_01:
    "Is the equipment used in production fit for\npurpose, easy to clean and in a good state of\nrepair?",
};

/* ✅ PDF order (important) */
const QUESTION_ORDER = [
  "ph_01",
  "ph_02",
  "ph_03",
  "ph_04",
  "fbc_01",
  "fbc_02",
  "fbc_03",
  "fbc_04",
  "fbc_05",
  "cln_01",
  "cln_02",
  "cln_03",
  "cln_04",
  "cln_05",
  "pst_01",
  "pst_02",
  "pst_03",
  "pst_04",
  "pst_05",
  "fsq_01",
  "fsq_02",
  "fsq_02a",
  "fsq_02b",
  "fsq_02c",
  "fsq_02d",
  "fsq_02e",
  "fsq_02f",
  "fsq_02g",
  "fsq_03",
  "fsq_04",
  "fsq_05",
  "fsq_06",
  "rm_01",
  "rm_02",
  "rm_03",
  "rm_04",
  "rm_05",
  "rm_06",
  "rm_07",
  "proc_01",
  "proc_02",
  "trn_01",
  "trn_02",
  "trn_03",
  "prd_01",
  "prd_02",
  "prd_03",
  "prd_04",
  "prd_05",
  "eqp_01",
];

function answerLabel(v) {
  if (v === true) return "YES";
  if (v === false) return "NO";
  return "N/A";
}

/* ✅ NEW: attachments getter (robust) */
function getAttachmentsFromPayload(payload) {
  const p = payload || {};
  const candidates = [p.attachments, p?.payload?.attachments, p?.meta?.attachments, p?.public?.attachments, p?.fields?.attachments];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

/* ✅ NEW: attachment helpers */
function normalizeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  // if url already has query, keep it
  return s;
}
function getFileExtFromUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname || "";
    const seg = path.split("/").pop() || "";
    const clean = seg.split("?")[0].split("#")[0];
    const parts = clean.split(".");
    if (parts.length >= 2) return parts.pop().toLowerCase();
    return "";
  } catch {
    const clean = String(url || "").split("?")[0].split("#")[0];
    const parts = clean.split(".");
    if (parts.length >= 2) return parts.pop().toLowerCase();
    return "";
  }
}
function guessType(file) {
  const ct = String(file?.contentType || file?.mimetype || file?.type || "").toLowerCase();
  const url = normalizeUrl(file?.url || file?.optimized_url || file?.secure_url || "");
  const ext = getFileExtFromUrl(url);

  const isPdf = ct.includes("pdf") || ext === "pdf";
  const isImage =
    ct.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext);
  const isText =
    ct.startsWith("text/") || ["txt", "csv", "log"].includes(ext);
  const isDoc =
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext) ||
    ct.includes("officedocument") ||
    ct.includes("msword") ||
    ct.includes("excel") ||
    ct.includes("powerpoint");

  return { isPdf, isImage, isText, isDoc, ext, ct, url };
}

/* ===================== Styles ===================== */
const shell = {
  minHeight: "100vh",
  padding: "26px 18px",
  background:
    "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.22) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
    "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.16) 0, rgba(255,255,255,0) 55%)," +
    "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.16) 0, rgba(255,255,255,0) 58%)",
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#071b2d",
};
const wrap = { maxWidth: 1200, margin: "0 auto" };
const panel = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(15, 23, 42, 0.14)",
  borderRadius: 18,
  boxShadow: "0 12px 30px rgba(2, 132, 199, 0.10)",
  padding: 16,
};
const btn = {
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(15,23,42,0.16)",
  background: "rgba(255,255,255,0.95)",
  cursor: "pointer",
  fontWeight: 950,
};
const btnPrimary = {
  ...btn,
  background: "linear-gradient(135deg, #0ea5e9, #22c55e)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.85)",
};
const btnDanger = {
  ...btn,
  background: "rgba(239,68,68,0.10)",
  border: "1px solid rgba(239,68,68,0.28)",
  color: "#7f1d1d",
};
const input = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 12,
  border: "1px solid rgba(2,6,23,0.14)",
  outline: "none",
  background: "rgba(255,255,255,0.98)",
  fontWeight: 900,
};
const table = { width: "100%", borderCollapse: "separate", borderSpacing: "0 10px" };
const th = { textAlign: "left", fontSize: 12, color: "#64748b", fontWeight: 950, padding: "0 10px 6px" };
const rowCard = {
  background: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(15, 23, 42, 0.14)",
  borderRadius: 16,
  boxShadow: "0 10px 22px rgba(2, 132, 199, 0.08)",
};
const td = { padding: "12px 10px", verticalAlign: "top", fontWeight: 850, color: "#0f172a" };
const muted = { color: "#64748b", fontWeight: 850, fontSize: 12 };

function FieldLine({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 950, color: "#64748b" }}>{label}</div>
      <div style={{ fontWeight: 900, color: "#0f172a", whiteSpace: "pre-wrap" }}>{String(value)}</div>
    </div>
  );
}

/* ✅ NEW: Attachment Preview Modal */
function AttachmentModal({ file, onClose }) {
  if (!file) return null;

  const url = normalizeUrl(file?.url || file?.optimized_url || file?.secure_url || "");
  const name = file?.name || file?.filename || "Attachment";
  const info = guessType(file);

  const headerBtn = {
    ...btn,
    padding: "8px 12px",
    borderRadius: 12,
    fontWeight: 950,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.62)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 18,
        overflowY: "auto",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(1100px, 100%)",
          marginTop: 20,
          background: "rgba(255,255,255,0.98)",
          border: "1px solid rgba(15,23,42,0.18)",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(2,6,23,0.35)",
          padding: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 200 }}>
            <div style={{ fontSize: 16, fontWeight: 990, color: "#0f172a" }}>📎 {name}</div>
            <div style={{ marginTop: 4, color: "#64748b", fontWeight: 850, fontSize: 12 }}>
              {info.ct ? `Type: ${info.ct}` : info.ext ? `Ext: .${info.ext}` : "Type: —"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {url ? (
              <a
                href={url}
                download
                style={{ textDecoration: "none" }}
                onClick={(e) => {
                  // stays same tab, triggers download if browser allows
                  if (!url) e.preventDefault();
                }}
              >
                <span style={headerBtn}>⬇ Download</span>
              </a>
            ) : null}
            <button style={btn} onClick={onClose}>
              ✖ Close
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, borderTop: "1px solid rgba(15,23,42,0.12)", paddingTop: 12 }}>
          {!url ? (
            <div style={{ color: "#64748b", fontWeight: 850, fontSize: 13 }}>No file URL found.</div>
          ) : info.isImage ? (
            <div style={{ display: "grid", placeItems: "center" }}>
              <img
                src={url}
                alt={name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "75vh",
                  borderRadius: 14,
                  border: "1px solid rgba(15,23,42,0.12)",
                  boxShadow: "0 12px 26px rgba(2, 132, 199, 0.10)",
                }}
              />
            </div>
          ) : info.isPdf ? (
            <iframe
              title={name}
              src={url}
              style={{
                width: "100%",
                height: "75vh",
                border: "1px solid rgba(15,23,42,0.12)",
                borderRadius: 14,
                background: "#fff",
              }}
            />
          ) : info.isText ? (
            <iframe
              title={name}
              src={url}
              style={{
                width: "100%",
                height: "75vh",
                border: "1px solid rgba(15,23,42,0.12)",
                borderRadius: 14,
                background: "#fff",
              }}
            />
          ) : (
            <div style={{ color: "#64748b", fontWeight: 850, fontSize: 13, lineHeight: 1.7 }}>
              Preview is not supported for this file type inside the app.
              <div style={{ marginTop: 10 }}>
                <a href={url} download style={{ textDecoration: "none" }}>
                  <span style={btnPrimary}>⬇ Download File</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SupplierEvaluationResults() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null); // report.id opened details
  const [deletingId, setDeletingId] = useState(null);

  /* ✅ NEW: attachment modal state */
  const [openAttachment, setOpenAttachment] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const list = await listReportsByType(TYPE);

      // ✅ فقط اللي انرسل من المورد عبر Public Mode
      const onlySubmitted = (list || []).filter((r) => {
        const p = r?.payload || {};
        const isPublic = !!p?.public?.token || p?.public?.mode === "PUBLIC";
        const isSubmitted = p?.meta?.submitted === true || !!p?.public?.submittedAt;
        return isPublic && isSubmitted;
      });

      const sorted = [...onlySubmitted].sort((a, b) => {
        const da = a?.payload?.public?.submittedAt || a?.payload?.meta?.savedAt || "";
        const db = b?.payload?.public?.submittedAt || b?.payload?.meta?.savedAt || "";
        return String(db).localeCompare(String(da));
      });

      setItems(sorted);
    } catch (e) {
      console.error(e);
      alert(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return items;

    return (items || []).filter((r) => {
      const company = String(r?.payload?.fields?.company_name || "").toLowerCase();
      const recDate = String(r?.payload?.recordDate || "").toLowerCase();
      const token = String(r?.payload?.public?.token || "").toLowerCase();
      return company.includes(q) || recDate.includes(q) || token.includes(q);
    });
  }, [items, query]);

  const opened = useMemo(() => {
    return (items || []).find((x) => String(x?.id) === String(openId)) || null;
  }, [items, openId]);

  const openedAnswers = opened?.payload?.answers || {};
  const openedFields = opened?.payload?.fields || {};
  const openedCounts = calcCounts(openedAnswers);

  // ✅ NEW: read attachments
  const openedAttachments = useMemo(() => {
    return getAttachmentsFromPayload(opened?.payload);
  }, [opened]);

  // ✅ sort answers by PDF order (fallback: unknown keys at end)
  const openedAnswerPairs = useMemo(() => {
    const ans = openedAnswers || {};
    const keys = Object.keys(ans);

    const ordered = QUESTION_ORDER.filter((k) => keys.includes(k));
    const unknown = keys.filter((k) => !QUESTION_ORDER.includes(k)).sort();

    const all = [...ordered, ...unknown];
    return all.map((k) => ({ key: k, q: QUESTIONS[k] || k, v: ans[k] }));
  }, [openedAnswers]);

  const copyText = async (t) => {
    try {
      if (!t) return;
      await navigator.clipboard.writeText(String(t));
      alert("Copied ✅");
    } catch {
      alert("Copy failed");
    }
  };

  const buildPublicUrl = (token) => {
    if (!token) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/supplier-approval/t/${encodeURIComponent(String(token))}`;
  };

  const handleDelete = async (report) => {
    const id = report?.id;
    const supplier = report?.payload?.fields?.company_name || "Supplier";
    const recDate = report?.payload?.recordDate || "";
    const ok = window.confirm(
      `Delete this submitted result?\n\nSupplier: ${supplier}\nDate: ${recDate || "—"}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(String(id));
    try {
      await deleteReportById(id);
      setOpenId((prev) => (String(prev) === String(id) ? null : prev));
      await fetchData();
      alert("Deleted ✅");
    } catch (e) {
      console.error(e);
      alert(String(e?.message || e));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main style={shell}>
      <div style={wrap}>
        {/* Top header */}
        <div style={{ ...panel, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 980 }}>Submitted Supplier Results</div>
            <div style={{ marginTop: 6, color: "#64748b", fontWeight: 850, fontSize: 13 }}>
              Suppliers who opened the public link and submitted the self-assessment form.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button style={btn} onClick={() => nav("/haccp-iso/supplier-evaluation")}>
              ↩ Back to Hub
            </button>
            <button style={btn} disabled={loading} onClick={fetchData}>
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ ...panel, marginTop: 14, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <div style={{ fontWeight: 950, color: "#0f172a" }}>Search</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={input}
            placeholder="Search by supplier name / date / token..."
          />
          <div style={muted}>Total submitted: {filtered.length}</div>
        </div>

        {/* List */}
        <div style={{ ...panel, marginTop: 14 }}>
          {filtered.length === 0 ? (
            <div style={{ fontWeight: 900, color: "#64748b" }}>{loading ? "Loading..." : "No submitted results yet."}</div>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Supplier</th>
                  <th style={th}>Record Date</th>
                  <th style={th}>Submitted At</th>
                  <th style={th}>YES / NO / N/A</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const p = r?.payload || {};
                  const supplier = p?.fields?.company_name || "—";
                  const recDate = p?.recordDate || "—";
                  const submittedAt = p?.public?.submittedAt || p?.meta?.savedAt || "";
                  const c = p?.meta?.counts || calcCounts(p?.answers);
                  const token = String(p?.public?.token || "");
                  const isDeleting = String(deletingId) === String(r?.id);

                  return (
                    <tr key={String(r?.id)} style={rowCard}>
                      <td style={td}>
                        <div style={{ fontWeight: 980 }}>{supplier}</div>
                        <div style={muted}>
                          Token: {token || "—"}{" "}
                          {token ? (
                            <button style={{ ...btn, padding: "6px 10px", marginLeft: 8 }} onClick={() => copyText(token)}>
                              Copy
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td style={td}>{recDate}</td>
                      <td style={td}>{fmtDateTime(submittedAt)}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 980 }}>
                          Yes: {c?.yesCount ?? 0} &nbsp;•&nbsp; No: {c?.noCount ?? 0} &nbsp;•&nbsp; N/A: {c?.naCount ?? 0}
                        </div>
                        <div style={muted}>Total: {c?.total ?? 0}</div>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button style={btnPrimary} onClick={() => setOpenId(String(r?.id))} disabled={isDeleting}>
                            View Answers
                          </button>
                          <button style={btnDanger} onClick={() => handleDelete(r)} disabled={isDeleting}>
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Details modal */}
        {opened ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.62)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: 18,
              overflowY: "auto",
              zIndex: 9999,
            }}
            onClick={() => setOpenId(null)}
          >
            <div
              style={{
                width: "min(1100px, 100%)",
                marginTop: 20,
                background: "rgba(255,255,255,0.98)",
                border: "1px solid rgba(15,23,42,0.18)",
                borderRadius: 18,
                boxShadow: "0 24px 70px rgba(2,6,23,0.35)",
                padding: 16,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 990 }}>
                    {openedFields.company_name || "Supplier"} — Answers
                  </div>
                  <div style={{ marginTop: 6, color: "#64748b", fontWeight: 850, fontSize: 13 }}>
                    Record Date: <b>{opened?.payload?.recordDate || "—"}</b> • Submitted:{" "}
                    <b>{fmtDateTime(opened?.payload?.public?.submittedAt || opened?.payload?.meta?.savedAt)}</b>
                  </div>
                  <div style={{ marginTop: 6, color: "#64748b", fontWeight: 850, fontSize: 13 }}>
                    Summary — Yes: <b>{openedCounts.yesCount}</b> • No: <b>{openedCounts.noCount}</b> • N/A: <b>{openedCounts.naCount}</b>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {opened?.payload?.public?.token ? (
                    <>
                      <button style={btn} onClick={() => copyText(buildPublicUrl(opened.payload.public.token))}>
                        Copy Public Link
                      </button>
                      <button
                        style={btnPrimary}
                        onClick={() => {
                          const u = buildPublicUrl(opened.payload.public.token);
                          if (u) window.open(u, "_blank", "noopener,noreferrer");
                        }}
                      >
                        Open Public Link
                      </button>
                    </>
                  ) : null}

                  <button style={btnDanger} disabled={String(deletingId) === String(opened?.id)} onClick={() => handleDelete(opened)}>
                    {String(deletingId) === String(opened?.id) ? "Deleting..." : "Delete"}
                  </button>

                  <button style={btn} onClick={() => setOpenId(null)}>
                    ✖ Close
                  </button>
                </div>
              </div>

              {/* Supplier fields summary */}
              <div style={{ marginTop: 12, borderTop: "1px solid rgba(15,23,42,0.12)", paddingTop: 12 }}>
                <div style={{ fontWeight: 980, marginBottom: 10 }}>Supplier Details (from PDF fields)</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                  <FieldLine label="Company Name" value={openedFields.company_name} />
                  <FieldLine label="Address" value={openedFields.company_address} />
                  <FieldLine label="Head Office (if different)" value={openedFields.company_head_office_address} />
                  <FieldLine label="Technical/Quality Manager - Name" value={openedFields.tqm_contact_name} />
                  <FieldLine label="Position Held" value={openedFields.tqm_position_held} />
                  <FieldLine label="Telephone No" value={openedFields.tqm_telephone} />
                  <FieldLine label="Total employees" value={openedFields.total_employees} />
                  <FieldLine label="Products to be supplied" value={openedFields.products_to_be_supplied} />
                  <FieldLine label="Certificates copy / notes" value={openedFields.certificates_copy} />
                  <FieldLine label="HACCP plans copy note" value={openedFields.haccp_copy_note} />
                  <FieldLine label="Lab tests list" value={openedFields.lab_tests_list} />
                  <FieldLine label="Outside testing details" value={openedFields.outside_testing_details} />
                </div>
              </div>

              {/* ✅ Attachments (NOW opens popup modal, not external tab) */}
              <div style={{ marginTop: 14, borderTop: "1px solid rgba(15,23,42,0.12)", paddingTop: 12 }}>
                <div style={{ fontWeight: 980, marginBottom: 10 }}>Attachments</div>

                {openedAttachments.length === 0 ? (
                  <div style={{ color: "#64748b", fontWeight: 850, fontSize: 13 }}>No attachments found for this submission.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {openedAttachments.map((f, i) => {
                      const url = normalizeUrl(f?.url || f?.optimized_url || f?.secure_url || "");
                      const name = f?.name || f?.filename || `File ${i + 1}`;
                      return (
                        <button
                          key={`${url}-${i}`}
                          type="button"
                          onClick={() => setOpenAttachment({ ...f, url, name })}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "center",
                            textDecoration: "none",
                            padding: 12,
                            borderRadius: 14,
                            border: "1px solid rgba(15,23,42,0.12)",
                            background: "rgba(255,255,255,0.96)",
                            color: "#0f172a",
                            fontWeight: 900,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {name}</span>
                          <span style={{ color: "#64748b", fontWeight: 850, fontSize: 12 }}>Preview</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* YES/NO questions */}
              <div style={{ marginTop: 14, borderTop: "1px solid rgba(15,23,42,0.12)", paddingTop: 12 }}>
                <div style={{ fontWeight: 980, marginBottom: 10 }}>YES/NO Questions (PDF order)</div>

                <div style={{ display: "grid", gap: 10 }}>
                  {openedAnswerPairs.map((x) => (
                    <div
                      key={x.key}
                      style={{
                        border: "1px solid rgba(15,23,42,0.12)",
                        borderRadius: 14,
                        padding: 12,
                        background: "rgba(248,250,252,0.9)",
                      }}
                    >
                      <div style={{ whiteSpace: "pre-wrap", fontWeight: 950, color: "#0f172a", lineHeight: 1.6 }}>{x.q}</div>
                      <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 980 }}>Answer:</span>
                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            fontWeight: 980,
                            border: "1px solid rgba(15,23,42,0.14)",
                            background:
                              x.v === true
                                ? "rgba(34,197,94,0.14)"
                                : x.v === false
                                ? "rgba(239,68,68,0.12)"
                                : "rgba(148,163,184,0.16)",
                            color: x.v === true ? "#14532d" : x.v === false ? "#7f1d1d" : "#334155",
                          }}
                        >
                          {answerLabel(x.v)}
                        </span>
                        <span style={muted}>({x.key})</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optional notes */}
                {opened?.payload?.notes ? (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 980, marginBottom: 8 }}>Internal Notes</div>
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        border: "1px solid rgba(15,23,42,0.12)",
                        borderRadius: 14,
                        padding: 12,
                        background: "rgba(255,255,255,0.92)",
                        fontWeight: 850,
                        color: "#0f172a",
                        lineHeight: 1.7,
                      }}
                    >
                      {opened.payload.notes}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* ✅ NEW: attachment popup (no external tab) */}
        {openAttachment ? (
          <AttachmentModal file={openAttachment} onClose={() => setOpenAttachment(null)} />
        ) : null}

        <div style={{ marginTop: 18, fontSize: 12, color: "#64748b", fontWeight: 800, textAlign: "center", opacity: 0.95 }}>
          © Al Mawashi — Supplier Evaluation Results
        </div>
      </div>
    </main>
  );
}
