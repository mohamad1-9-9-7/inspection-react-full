import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

/* ===================== API base (NORMALIZED) ===================== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";

function normalizeApiRoot(raw) {
  let s = String(raw || "").trim();
  if (!s) return API_ROOT_DEFAULT;
  s = s.replace(/\/+$/, "");
  // لو حاطط /api أو /api/reports بالغلط… شيلهم
  s = s.replace(/\/api\/reports.*$/i, "");
  s = s.replace(/\/api\/?$/i, "");
  return s || API_ROOT_DEFAULT;
}

const API_BASE = normalizeApiRoot(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
);

function getInfoEndpoint(token) {
  return `${API_BASE}/api/reports/public/${encodeURIComponent(token)}`;
}
function getSubmitEndpoint(token) {
  return `${API_BASE}/api/reports/public/${encodeURIComponent(token)}/submit`;
}

/* ===================== helpers ===================== */
async function fetchJson(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...options,
  });

  const txt = await res.text().catch(() => "");
  let data;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = txt;
  }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ===== Upload via your server images endpoint (same as other pages) ===== */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

/* ===================== Helpers (FORM init) ===================== */
function pad2(n) {
  return String(n ?? "").padStart(2, "0");
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/* ===================== PDF-LITERAL CONTENT (Same as SupplierApproval.jsx) ===================== */
const FORM = [
  {
    pageTitle: "PAGE 1 / 5 (نص حرفي)",
    blocks: [
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: [
          "Document Reference Supplier Self-Assessment Form",
          "Issue Date",
          "Owned by:QA",
          "Authorised By: DIRECTOR",
          "",
          "Please answer all questions and provide any additional information that you feel is pertinent.",
        ],
      },
      {
        title: "Company Details",
        type: "fields",
        items: [
          { key: "company_name", label: "Company Name:", kind: "text" },
          { key: "company_address", label: "Address:", kind: "textarea_short" },
          {
            key: "company_head_office_address",
            label: "Please provide Head Office address if different\nfrom above:",
            kind: "textarea_short",
          },
          { key: "company_separator_1", label: "-----------", kind: "readonly" },
        ],
      },
      {
        title: "Technical or Quality Manager Contact Details",
        type: "fields",
        items: [
          { key: "tqm_contact_name", label: "Name of Contact:", kind: "text" },
          { key: "tqm_position_held", label: "Position Held:", kind: "text" },
          { key: "tqm_telephone", label: "Telephone No:", kind: "text" },
          { key: "total_employees", label: "What is the total number of employees in your\ncompany?", kind: "text" },
        ],
      },
      {
        title: "Products to be Supplied",
        type: "fields",
        items: [
          { key: "products_to_be_supplied", label: "Product Name", kind: "textarea" },
          {
            key: "product_specs_note",
            label: "Please provide a full product specification with each product supplied",
            kind: "readonly",
          },
        ],
      },
      {
        title: "Certification",
        type: "fields",
        items: [
          {
            key: "certified_question",
            label: "Are your facilities and products certified to any\nrecognized food safety or quality schemes?",
            kind: "text",
          },
          { key: "certified_if_yes", label: "If yes which?", kind: "text" },
          { key: "certificates_copy", label: "Please provide a copy of your certificates", kind: "textarea_short" },
        ],
      },
      {
        title: "Hygiene",
        type: "fields",
        items: [
          {
            key: "hygiene_training_question",
            label: "Have your staffs received any Food Hygiene &\nSafety Training to date & certificate copies are\navailable?",
            kind: "text",
          },
        ],
      },
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by: QA", "Authorised By: DIRECTOR"],
      },
    ],
  },

  {
    pageTitle: "PAGE 2 / 5 (نص حرفي)",
    blocks: [
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by:QA", "Authorised By: DIRECTOR"],
      },

      {
        title: "Personal Hygiene (YES/NO)",
        type: "yesno",
        items: [
          { key: "ph_01", q: "Do you have documented Personal Hygiene standards & monitoring procedure?" },
          { key: "ph_02", q: "Do all food handlers have valid health cards?" },
          { key: "ph_03", q: "Is there an Illness reporting procedure available?" },
          { key: "ph_04", q: "Do the staffs have separate changing facility & toilet away from the food handling area?" },
        ],
      },

      {
        title: "Foreign Body Control",
        type: "yesno",
        items: [
          { key: "fbc_01", q: "Is there a policy for the control of glass and\nexclusion of glass from production areas?" },
          { key: "fbc_02", q: "Is there a glass/brittle material breakage\nprocedure?" },
          { key: "fbc_03", q: "Is there a policy for the control of wood and\nexclusion of wood from production areas?" },
          { key: "fbc_04", q: "Is there a policy for the control of metal and\nexclusion of potential metal contaminantsfrom\nproduction areas?" },
          { key: "fbc_05", q: "Is there a policy for the control of knives and\nexclusion of unauthorized knives from the\nproduction area?" },
        ],
      },

      {
        title: "Cleaning",
        type: "yesno",
        items: [
          {
            key: "cln_01",
            q: "Do you have documented cleaning schedules that\ninclude frequency of clean, chemicals used step\nby step instructions and the standard required?",
          },
          { key: "cln_02", q: "Do you monitor cleaning standards?" },
          { key: "cln_03", q: "Is there a separate area away from food\npreparation & storage available for cleaning\nchemicals & equipment storage?" },
          {
            key: "cln_04",
            q: "Do you use Sanitizing Chemicals specifically for\nSanitizing or Disinfecting all food contact\nsurfaces?",
          },
          { key: "cln_05", q: "Do you have effective waste disposal system?" },
        ],
      },

      {
        title: "Pest Control",
        type: "yesno",
        items: [
          { key: "pst_01", q: "Do you have a Contract with Approved Pest\nControl Company?" },
          {
            key: "pst_02",
            q: "Are raw materials, packaging and finished\nproducts stored so as to minimize the risk of\ninfestation?",
          },
          { key: "pst_03", q: "Are all buildings adequately proofed?" },
        ],
      },

      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by: QA", "Authorised By: DIRECTOR"],
      },
    ],
  },

  {
    pageTitle: "PAGE 3 / 5 (نص حرفي)",
    blocks: [
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by:QA", "Authorised By: DIRECTOR"],
      },

      {
        title: "Pest Control (continued)",
        type: "yesno",
        items: [
          {
            key: "pst_04",
            q: "Is there a complete inventory of pesticides\ndetailing the location and safe use and\napplication of baits and other materials such as\ninsecticide sprays or fumigants?",
          },
          { key: "pst_05", q: "Are flying insect controls in place?" },
        ],
      },

      {
        title: "Food Safety & Quality Systems",
        type: "yesno",
        items: [
          {
            key: "fsq_01",
            q: "Do you have a documented Quality and Food\nSafety Policy & Objectives (eg. HACCP,\nISO, HALAL, GMP)?",
          },
          {
            key: "fsq_02",
            q: "Do you have a documented food safety & quality\nassurance manual that includes procedures for:",
          },
          { key: "fsq_02a", q: "Resources and Training?" },
          { key: "fsq_02b", q: "Purchasing and Verification of Purchased\nMaterials?" },
          { key: "fsq_02c", q: "Identification and Traceability?" },
          { key: "fsq_02d", q: "Internal Audit?" },
          { key: "fsq_02e", q: "food complaint reporting procedure with\ncorrective action plan?" },
          { key: "fsq_02f", q: "Corrective Action and Preventive Action?" },
          { key: "fsq_02g", q: "Product Recall?" },
          { key: "fsq_03", q: "Are there maintenance programs for equipment\nand buildings?" },
          {
            key: "fsq_04",
            q: "Is there a system forstaff training such that all\nkey personnel are trained and have training\nrecords?",
          },
          {
            key: "fsq_05",
            q: "Do you have facilities and systems for the\ntransportation that protects products and prevent\ncontamination?",
          },
          { key: "fsq_06", q: "Do you have laboratory facilities on site and are\nthey accredited?" },
        ],
      },

      {
        title: "If yes, please list any tests carried out on the products supplied",
        type: "fields",
        items: [{ key: "lab_tests_list", label: "If yes, please list any tests carried out on the\nproducts supplied", kind: "textarea_short" }],
      },

      {
        title: "Do you use outside/contract facilities for any product testing? If yes give details",
        type: "fields",
        items: [
          {
            key: "outside_testing_details",
            label: "Do you use outside/contract facilities for any\nproduct testing? If yes give details",
            kind: "textarea_short",
          },
        ],
      },

      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by: QA", "Authorised By: DIRECTOR"],
      },
    ],
  },

  {
    pageTitle: "PAGE 4 / 5 (نص حرفي)",
    blocks: [
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by:QA", "Authorised By: DIRECTOR"],
      },

      {
        title: "Food Safety & Quality Controls (Raw materials / specs / non-conforming)",
        type: "yesno",
        items: [
          {
            key: "rm_01",
            q: "Do you monitor the quality/safety of your raw\nmaterials and request certificates of\nanalysis/conformity from your suppliers?",
          },
          { key: "rm_02", q: "Do you have a traceability system and maintain\nrecords of batch codes of materials used?" },
          { key: "rm_03", q: "Do you hold specifications for all your raw\nmaterials?" },
          {
            key: "rm_04",
            q: "Do you have procedure for dealing with out of\nspecification/non-conforming raw materials and\nfinished products?",
          },
          { key: "rm_05", q: "Do you have specifications for your finished\nproducts?" },
          { key: "rm_06", q: "Do you test all finished product against your\nspecification?" },
          { key: "rm_07", q: "Do you have a procedure for dealing with non￾\nconforming raw materials and finished products?" },
        ],
      },

      {
        title: "Food Safety & Quality Controls",
        type: "fields",
        items: [
          {
            key: "haccp_copy_note",
            label: "Please provide a copy of your HACCP plans for each product supplied",
            kind: "textarea_short",
          },
        ],
      },

      {
        title: "Food Safety & Quality Controls (process controls)",
        type: "yesno",
        items: [
          { key: "proc_01", q: "Have your critical control points (safety and\nquality) been identified for your production\nprocess?" },
          { key: "proc_02", q: "Is there a temperature monitoring system in\nplace during chilled or frozen storage, heat\nprocessing, cold processing etc.?" },
        ],
      },

      {
        title: "Transportation",
        type: "yesno",
        items: [
          { key: "trn_01", q: "Is the vehicle temperature is monitored during\ntransportation?" },
          { key: "trn_02", q: "Is there a cleaning schedule for the vehicles &\nverification system available?" },
          { key: "trn_03", q: "Are all the vehicles holding valid food control\nregulatory approval?" },
        ],
      },

      {
        title: "Production Area Controls",
        type: "yesno",
        items: [
          { key: "prd_01", q: "Are your production methods documented and\navailable on the factory floor?" },
          { key: "prd_02", q: "Are critical measurement devices calibrated to a\nNational Standard?" },
          { key: "prd_03", q: "Do you metal detect your finished product?" },
          {
            key: "prd_04",
            q: "Are all points of entry and ventilation protected\nfrom access by birds, insects, rodents, dust and\ndebris?",
          },
          { key: "prd_05", q: "Do you operate a planned maintenance\nprogramme?" },
        ],
      },

      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by: QA", "Authorised By: DIRECTOR"],
      },
    ],
  },

  {
    pageTitle: "PAGE 5 / 5 (نص حرفي)",
    blocks: [
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by:QA", "Authorised By: DIRECTOR"],
      },

      {
        title: "Production Area Controls (continued)",
        type: "yesno",
        items: [{ key: "eqp_01", q: "Is the equipment used in production fit for\npurpose, easy to clean and in a good state of\nrepair?" }],
      },

      {
        title: "Declaration",
        type: "fields",
        items: [
          {
            key: "declaration_text",
            label:
              "All products supplied to Trans Emirates livestock Trading LLC comply with all relevant local and\ninternational legislation. The information supplied in this self-audit questionnaire is a true and\naccurate reflection of the production and control systems applied.",
            kind: "readonly",
          },
          { key: "decl_name", label: "Name: .......................................................................", kind: "text" },
          { key: "decl_position", label: "Position Held: ................. ........................................................", kind: "text" },
          { key: "decl_signed", label: "Signed: ...........................................................................", kind: "text" },
          { key: "decl_date", label: "Date: ................................................", kind: "date" },
          { key: "decl_company_seal", label: "Company seal", kind: "text" },
        ],
      },
    ],
  },
];

/* ===================== UI helpers ===================== */
const THEME = {
  bg: "linear-gradient(180deg,#eaf6ff,#ffffff)",
  cardBg: "rgba(255,255,255,0.92)",
  border: "rgba(2,6,23,0.12)",
  text: "#0f172a",
  muted: "#64748b",
};

export default function SupplierEvaluationPublic() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ نفس مفاتيح الأدمن (company_name… الخ)
  const [fields, setFields] = useState(() => {
    const init = {};
    FORM.forEach((p) =>
      p.blocks.forEach((b) => {
        if (b.type === "fields") (b.items || []).forEach((it) => (init[it.key] = ""));
      })
    );
    return init;
  });

  const [answers, setAnswers] = useState(() => {
    const init = {};
    FORM.forEach((p) =>
      p.blocks.forEach((b) => {
        if (b.type === "yesno") (b.items || []).forEach((it) => (init[it.key] = null));
      })
    );
    return init;
  });

  const [attachments, setAttachments] = useState([]); // [{name,url}]

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const u = new URL(window.location.href);
      return `${u.origin}${u.pathname}`;
    } catch {
      return window.location.href;
    }
  }, [token]);

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await fetchJson(getInfoEndpoint(token), { method: "GET" });

      // ✅ server returns { ok:true, report:{...} }
      const report = data?.report || data?.item || data?.data || data;
      setInfo(report);

      const p =
        report?.payload ||
        report?.payload_json ||
        report?.data?.payload ||
        report?.item?.payload ||
        {};

      const preFields = p?.fields && typeof p.fields === "object" ? p.fields : {};
      const preAnswers = p?.answers && typeof p.answers === "object" ? p.answers : {};
      const preAttachments = Array.isArray(p?.attachments) ? p.attachments : [];

      // hydrate safely
      setFields((prev) => {
        const out = { ...prev };
        Object.keys(out).forEach((k) => {
          if (Object.prototype.hasOwnProperty.call(preFields, k)) out[k] = preFields[k];
        });
        // keep any extra keys if present
        Object.keys(preFields).forEach((k) => {
          if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = preFields[k];
        });
        return out;
      });

      setAnswers((prev) => {
        const out = { ...prev };
        Object.keys(out).forEach((k) => {
          if (Object.prototype.hasOwnProperty.call(preAnswers, k)) out[k] = preAnswers[k];
        });
        Object.keys(preAnswers).forEach((k) => {
          if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = preAnswers[k];
        });
        return out;
      });

      setAttachments(preAttachments);
    } catch (e) {
      setMsg(`❌ ${e?.message || "Failed to load"} (token: ${token})`);
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onField = (key, value) => setFields((p) => ({ ...p, [key]: value }));
  const onToggle = (key, value) => setAnswers((p) => ({ ...p, [key]: value }));

  const pickFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setMsg("");
    setSaving(true);
    try {
      const uploaded = [];
      for (const f of files) {
        const url = await uploadViaServer(f);
        uploaded.push({ name: f.name, url });
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      setMsg("✅ Files uploaded");
    } catch (e) {
      setMsg(`❌ ${e?.message || "Upload failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    setMsg("");
    setSaving(true);
    try {
      // ✅ Server expects { fields, answers, attachments }
      await fetchJson(getSubmitEndpoint(token), {
        method: "POST",
        body: JSON.stringify({ fields, answers, attachments }),
      });

      setDone(true);
      setMsg("✅ Submitted successfully");
    } catch (e) {
      setMsg(`❌ ${e?.message || "Submit failed"}`);
    } finally {
      setSaving(false);
    }
  };

  /* ===================== styles ===================== */
  const page = {
    minHeight: "100vh",
    padding: 18,
    direction: "ltr",
    fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Arial",
    background: THEME.bg,
  };

  const card = {
    maxWidth: 1100,
    margin: "0 auto",
    background: THEME.cardBg,
    border: `1px solid ${THEME.border}`,
    borderRadius: 18,
    padding: 14,
  };

  const section = {
    marginTop: 14,
    borderTop: `1px solid ${THEME.border}`,
    paddingTop: 12,
  };

  const input = {
    width: "100%",
    borderRadius: 12,
    border: `1px solid ${THEME.border}`,
    padding: "10px 12px",
    outline: "none",
    background: "#fff",
    fontFamily: "inherit",
  };

  const textarea = {
    ...input,
    minHeight: 90,
    resize: "vertical",
  };

  const btn = {
    border: `1px solid ${THEME.border}`,
    background: "#fff",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 900,
  };

  const toggleBtn = (active, kind) => {
    const base = { ...btn, minWidth: 90 };
    if (!active) return base;
    if (kind === "yes") return { ...base, background: "rgba(16,185,129,0.10)" };
    if (kind === "no") return { ...base, background: "rgba(239,68,68,0.08)" };
    return base;
  };

  const renderField = (it) => {
    if (it.kind === "readonly") {
      return (
        <div style={{ padding: 12, borderRadius: 12, border: `1px dashed ${THEME.border}`, background: "rgba(2,6,23,0.03)" }}>
          <div style={{ whiteSpace: "pre-wrap", fontWeight: 900, color: THEME.text, lineHeight: 1.6 }}>{it.label}</div>
        </div>
      );
    }
    if (it.kind === "date") {
      return <input type="date" value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={input} />;
    }
    if (it.kind === "textarea") {
      return <textarea value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={{ ...textarea, minHeight: 140 }} />;
    }
    if (it.kind === "textarea_short") {
      return <textarea value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={textarea} />;
    }
    return <input value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={input} />;
  };

  if (loading) {
    return (
      <div style={page}>
        <div style={card}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ fontWeight: 1100, fontSize: 18, color: THEME.text }}>Supplier Evaluation Form</div>
        <div style={{ marginTop: 6, color: THEME.muted, fontSize: 12 }}>
          Token: <b>{token}</b> • Link: <span style={{ wordBreak: "break-word" }}>{shareUrl}</span>
        </div>

        {msg ? (
          <div style={{ marginTop: 10, fontWeight: 900, color: msg.startsWith("✅") ? "#065f46" : "#991b1b" }}>{msg}</div>
        ) : null}

        {done ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(16,185,129,0.35)",
              background: "rgba(16,185,129,0.08)",
              fontWeight: 1000,
            }}
          >
            Thank you. Your submission has been received.
          </div>
        ) : null}

        {/* ✅ Pages (FULL FORM) */}
        <div style={section}>
          {FORM.map((p, pIdx) => (
            <div key={pIdx} style={{ marginTop: 12, padding: 12, borderRadius: 16, border: `1px solid ${THEME.border}`, background: "#fff" }}>
              <div style={{ fontWeight: 1100, color: THEME.text }}>{p.pageTitle}</div>

              <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                {p.blocks.map((b, bIdx) => (
                  <div key={bIdx} style={{ padding: 12, borderRadius: 14, border: `1px solid ${THEME.border}`, background: "rgba(2,6,23,0.02)" }}>
                    <div style={{ fontWeight: 1000, color: THEME.text }}>{b.title}</div>

                    {b.type === "info" ? (
                      <div style={{ marginTop: 8, whiteSpace: "pre-wrap", color: THEME.text, fontWeight: 800, lineHeight: 1.6 }}>
                        {(b.lines || []).join("\n")}
                      </div>
                    ) : null}

                    {b.type === "fields" ? (
                      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 10 }}>
                        {(b.items || []).map((it) => (
                          <div key={it.key} style={{ display: "grid", gap: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: "#334155", whiteSpace: "pre-wrap" }}>{it.label}</div>
                            {renderField(it)}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {b.type === "yesno" ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                        {(b.items || []).map((it) => {
                          const v = answers[it.key];
                          return (
                            <div key={it.key} style={{ paddingTop: 10, borderTop: `1px dashed ${THEME.border}` }}>
                              <div style={{ fontWeight: 900, color: THEME.text, whiteSpace: "pre-wrap" }}>{it.q}</div>
                              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                <button type="button" style={toggleBtn(v === true, "yes")} onClick={() => onToggle(it.key, true)}>
                                  YES
                                </button>
                                <button type="button" style={toggleBtn(v === false, "no")} onClick={() => onToggle(it.key, false)}>
                                  NO
                                </button>
                                <button type="button" style={toggleBtn(v === null, "na")} onClick={() => onToggle(it.key, null)}>
                                  N/A
                                </button>
                                <div style={{ marginLeft: 6, fontSize: 12, fontWeight: 900, color: THEME.muted }}>
                                  Selected: <b style={{ color: v === true ? "#065f46" : v === false ? "#991b1b" : THEME.muted }}>{v === true ? "YES" : v === false ? "NO" : "N/A"}</b>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Attachments */}
        <div style={section}>
          <div style={{ fontWeight: 1000, color: THEME.text, marginBottom: 8 }}>Attachments</div>

          <input type="file" multiple onChange={(e) => pickFiles(e.target.files)} disabled={saving || done} />

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {attachments.map((f, i) => (
              <div
                key={`${f.url}-${i}`}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  border: `1px solid ${THEME.border}`,
                  background: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontWeight: 900,
                    color: THEME.text,
                    textDecoration: "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  📎 {f.name || `File ${i + 1}`}
                </a>
                {!done ? (
                  <button
                    type="button"
                    style={{ ...btn, borderColor: "rgba(239,68,68,0.35)", color: "#991b1b" }}
                    onClick={() => removeAttachment(i)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ ...btn, background: saving ? "#f1f5f9" : "#fff" }} onClick={submit} disabled={saving || done}>
            {saving ? "Submitting..." : "✅ Submit"}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px){
          div[style*="gridTemplateColumns: repeat(auto-fit, minmax(320px, 1fr))"]{
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
