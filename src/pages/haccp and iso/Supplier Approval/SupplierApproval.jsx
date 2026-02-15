// D:\inspection-react-full\src\pages\haccp and iso\Supplier Approval\SupplierApproval.jsx
// ✅ UPDATED: public token mode now LOADS + SUBMITS via server token endpoints
// ✅ NO changes to PDF literal content
// ✅ Admin mode still uses /api/reports CRUD

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ===================== API base (Vite + CRA + window override) ===================== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE = "supplier_self_assessment_form"; // ✅ مطابق للـPDF كاسم نوع منفصل

/* ✅ NEW: public token endpoints (chosen) */
const PUBLIC_GET_URL = `${API_BASE}/api/supplier-self-assessment/by-token`;
const PUBLIC_SUBMIT_URL = `${API_BASE}/api/supplier-self-assessment/by-token`;

/* ===================== Helpers ===================== */
function pad2(n) {
  return String(n ?? "").padStart(2, "0");
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
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
  if (Array.isArray(data?.data?.data)) return data.data.data;
  if (Array.isArray(data?.ok && data?.data)) return data.data;
  // open-crud server usually returns {ok:true,data:[...]}
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
async function createReport(body) {
  const res = await fetch(REPORTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message || data?.error || `Failed to create report (${res.status})`);
  }
  return await safeJson(res);
}
async function updateReport(id, body) {
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message || data?.error || `Failed to update report (${res.status})`);
  }
  return await safeJson(res);
}

/* ✅ NEW: public load by token */
async function getPublicByToken(token) {
  const t = String(token || "").trim();
  if (!t) throw new Error("token required");
  const res = await fetch(`${PUBLIC_GET_URL}/${encodeURIComponent(t)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || data?.error || `Failed to load token (${res.status})`);
  return data;
}

/* ✅ NEW: public submit by token */
async function submitPublicByToken(token, body) {
  const t = String(token || "").trim();
  if (!t) throw new Error("token required");
  const res = await fetch(`${PUBLIC_SUBMIT_URL}/${encodeURIComponent(t)}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || data?.error || `Failed to submit (${res.status})`);
  return data;
}

/* ===================== PDF-LITERAL CONTENT (Page by Page) ===================== */
/* ✅ كل النصوص بالأسئلة هنا حرفيًا كما أرسلتها */
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
        items: [
          { key: "eqp_01", q: "Is the equipment used in production fit for\npurpose, easy to clean and in a good state of\nrepair?" },
        ],
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

/* ===================== UI Theme (soft borders / clear sections) ===================== */
const THEME = {
  bg:
    "radial-gradient(circle at 18% 10%, rgba(34,197,94,0.20) 0, rgba(14,165,233,0.12) 35%, rgba(2,6,23,0.92) 100%)," +
    "linear-gradient(135deg, rgba(34,197,94,0.32) 0%, rgba(14,165,233,0.28) 55%, rgba(2,6,23,0.96) 100%)",
  text: "#06121f",
  muted: "rgba(2,6,23,0.62)",
  glass: "linear-gradient(135deg, rgba(236,253,245,0.88), rgba(236,254,255,0.84))",
  glassStrong: "linear-gradient(135deg, rgba(220,252,231,0.92), rgba(224,242,254,0.90))",
  border: "rgba(255,255,255,0.62)",
};

/* ===================== Component ===================== */
export default function SupplierApproval({ publicMode = false, publicToken = "", onPublicSubmitted }) {
  const nav = useNavigate();

  // ✅ NEW: Parent hub route (change here if you choose different path)
  const PARENT_HUB_ROUTE = "/haccp-iso/supplier-evaluation";

  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  /* ✅ NEW: public loading state */
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicLoaded, setPublicLoaded] = useState(false);

  // ✅ حقول عامة (مش تغيير على نص الـPDF، بس لإدارة السجل)
  const [recordDate, setRecordDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  // ✅ القيم الحرفية للـPDF (حقول + YES/NO)
  const [fields, setFields] = useState(() => {
    const init = {};
    FORM.forEach((p) =>
      p.blocks.forEach((b) => {
        if (b.type === "fields") (b.items || []).forEach((it) => (init[it.key] = it.kind === "readonly" ? "" : ""));
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

  const [existing, setExisting] = useState([]);

  const uniqueKey = useMemo(() => {
    const company = (fields.company_name || "").trim();
    // ✅ public link: key includes token to avoid overwrite between suppliers
    const t = String(publicToken || "").trim();
    const base = `${company}__${recordDate}`.trim().toLowerCase();
    return publicMode && t ? `${base}__${t}` : base;
  }, [fields.company_name, recordDate, publicMode, publicToken]);

  const title = useMemo(() => {
    const company = (fields.company_name || "").trim() || "Supplier";
    return `Supplier Self-Assessment Form • ${company} • ${recordDate}`;
  }, [fields.company_name, recordDate]);

  const counts = useMemo(() => {
    const keys = Object.keys(answers || {});
    const yesCount = keys.filter((k) => answers[k] === true).length;
    const noCount = keys.filter((k) => answers[k] === false).length;
    const naCount = keys.filter((k) => answers[k] === null).length;
    return { total: keys.length, yesCount, noCount, naCount };
  }, [answers]);

  const validate = () => {
    if (!recordDate) return "Please select a Date.";
    if (!(fields.company_name || "").trim()) return "Company Name is required (for saving).";
    if (publicMode && !String(publicToken || "").trim()) return "Invalid link (token missing).";
    return "";
  };

  const fetchExisting = async () => {
    // في publicMode ما في داعي تعرض آخر السجلات
    if (publicMode) return;

    setLoadingList(true);
    try {
      const data = await listReportsByType(TYPE);
      const sorted = [...(data || [])].sort((a, b) => {
        const da = a?.payload?.recordDate || a?.payload?.createdAt || "";
        const db = b?.payload?.recordDate || b?.payload?.createdAt || "";
        return String(db).localeCompare(String(da));
      });
      setExisting(sorted.slice(0, 30));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ✅ NEW: on publicMode → load by token from server and hydrate state */
  useEffect(() => {
    const t = String(publicToken || "").trim();
    if (!publicMode) return;
    if (!t) return;

    let alive = true;

    (async () => {
      setPublicLoading(true);
      setPublicLoaded(false);
      try {
        const data = await getPublicByToken(t);

        // expected shape (server): {ok:true, reportId, type, payload}
        const payload = data?.payload || data?.report?.payload || data?.report || data?.data?.payload || data?.data || {};

        // hydrate safe
        const loadedRecordDate = payload?.recordDate || payload?.reportDate || todayISO();
        const loadedNotes = payload?.notes || "";

        const loadedFields = payload?.fields && typeof payload.fields === "object" ? payload.fields : {};
        const loadedAnswers = payload?.answers && typeof payload.answers === "object" ? payload.answers : {};

        if (!alive) return;

        setRecordDate(String(loadedRecordDate || todayISO()));
        setNotes(String(loadedNotes || ""));

        setFields((prev) => {
          const out = { ...prev };
          // only fill known keys
          Object.keys(out).forEach((k) => {
            if (Object.prototype.hasOwnProperty.call(loadedFields, k)) out[k] = loadedFields[k];
          });
          // if server has extra keys (keep them too)
          Object.keys(loadedFields || {}).forEach((k) => {
            if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = loadedFields[k];
          });
          return out;
        });

        setAnswers((prev) => {
          const out = { ...prev };
          Object.keys(out).forEach((k) => {
            if (Object.prototype.hasOwnProperty.call(loadedAnswers, k)) out[k] = loadedAnswers[k];
          });
          Object.keys(loadedAnswers || {}).forEach((k) => {
            if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = loadedAnswers[k];
          });
          return out;
        });

        setPublicLoaded(true);
      } catch (e) {
        console.error(e);
        alert(String(e?.message || e));
      } finally {
        if (alive) setPublicLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [publicMode, publicToken]);

  const onField = (key, value) => setFields((p) => ({ ...p, [key]: value }));
  const onToggle = (key, value) => setAnswers((p) => ({ ...p, [key]: value }));

  const onSave = async () => {
    const err = validate();
    if (err) return alert(err);

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();

      // ✅ build payload common
      const payload = {
        recordDate,
        title,
        uniqueKey,

        // ✅ هذا هو محتوى النموذج الحرفي
        fields,
        answers,
        notes,

        // ✅ public meta (token)
        public: publicMode
          ? {
              token: String(publicToken || ""),
              submittedAt: nowIso,
              mode: "PUBLIC",
            }
          : null,

        // ✅ فقط لتسهيل التقارير
        meta: {
          counts,
          savedAt: nowIso,
          pdfMatch: "LITERAL_TEXT_MATCH",
          ...(publicMode ? { submitted: true } : {}),
        },
      };

      if (publicMode) {
        // ✅ submit strictly via token endpoint (no listReports / no uniqueKey lookup)
        await submitPublicByToken(String(publicToken || ""), { payload });
        alert("Submitted successfully ✅");
        if (typeof onPublicSubmitted === "function") onPublicSubmitted();
        return;
      }

      // ✅ admin mode uses normal CRUD
      const list = await listReportsByType(TYPE);
      const found = Array.isArray(list)
        ? list.find((r) => (r?.payload?.uniqueKey || "").toLowerCase() === uniqueKey)
        : null;

      if (found?.id) await updateReport(found.id, { type: TYPE, title, payload });
      else await createReport({ type: TYPE, title, payload });

      alert("Saved successfully ✅");

      // ✅ go back to parent hub (instead of /haccp-iso)
      nav(PARENT_HUB_ROUTE);
    } catch (e) {
      console.error(e);
      alert(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  /* ===================== Styles ===================== */
  const page = {
    minHeight: "100vh",
    width: "100%",
    padding: "22px 18px 28px",
    boxSizing: "border-box",
    direction: "ltr",
    fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    background: THEME.bg,
    overflowX: "hidden",
  };

  const glass = {
    background: THEME.glass,
    border: `1px solid ${THEME.border}`,
    borderRadius: 22,
    boxShadow: "0 20px 60px rgba(2,6,23,0.28)",
    backdropFilter: "blur(14px)",
  };

  const section = { ...glass, padding: 18 };

  const label = { fontWeight: 1200, color: THEME.text, fontSize: 15 };

  const input = {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(2,6,23,0.14)",
    outline: "none",
    background: "rgba(255,255,255,0.96)",
    fontWeight: 900,
    fontSize: 15,
    color: THEME.text,
    boxSizing: "border-box",
  };

  const textarea = {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(2,6,23,0.14)",
    outline: "none",
    background: "rgba(255,255,255,0.96)",
    fontWeight: 850,
    fontSize: 15,
    lineHeight: 1.6,
    color: THEME.text,
    fontFamily: "inherit",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: 140,
  };

  const textareaShort = { ...textarea, minHeight: 90 };

  const btnPrimary = (disabled) => ({
    padding: "13px 18px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.85)",
    background: disabled
      ? "linear-gradient(135deg, rgba(148,163,184,0.95), rgba(100,116,139,0.95))"
      : "linear-gradient(135deg, #0ea5e9, #22c55e)",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 1300,
    boxShadow: "0 12px 28px rgba(14,165,233,0.26)",
    whiteSpace: "nowrap",
    fontSize: 14,
  });

  const btnGhost = {
    padding: "13px 18px",
    borderRadius: 14,
    border: "1px solid rgba(2,6,23,0.14)",
    background: "rgba(255,255,255,0.94)",
    cursor: "pointer",
    fontWeight: 1300,
    whiteSpace: "nowrap",
    fontSize: 14,
  };

  const pageCard = {
    background: THEME.glassStrong,
    border: "1px solid rgba(2,6,23,0.12)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 10px 24px rgba(2,6,23,0.10)",
  };

  const titleH = { fontSize: 22, fontWeight: 1500, color: THEME.text };
  const subH = { marginTop: 6, color: THEME.muted, fontSize: 14, fontWeight: 1200 };

  const toggleRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 10,
  };

  const toggleBtn = (active, kind) => {
    const base = {
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid rgba(2,6,23,0.12)",
      background: "rgba(255,255,255,0.94)",
      cursor: "pointer",
      fontWeight: 1300,
      fontSize: 13,
      minWidth: 95,
    };
    if (!active) return base;
    if (kind === "yes") return { ...base, background: "rgba(34,197,94,0.16)", border: "1px solid rgba(34,197,94,0.42)" };
    if (kind === "no") return { ...base, background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.40)" };
    return { ...base, background: "rgba(148,163,184,0.18)", border: "1px solid rgba(148,163,184,0.44)" };
  };

  const renderField = (it) => {
    if (it.kind === "readonly") {
      return (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px dashed rgba(2,6,23,0.22)",
            background: "rgba(255,255,255,0.70)",
          }}
        >
          <div style={{ whiteSpace: "pre-wrap", fontWeight: 1100, color: THEME.text, lineHeight: 1.6 }}>{it.label}</div>
        </div>
      );
    }

    if (it.kind === "date") {
      return <input type="date" value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={input} />;
    }

    if (it.kind === "textarea") {
      return <textarea value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={textarea} />;
    }

    if (it.kind === "textarea_short") {
      return <textarea value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={textareaShort} />;
    }

    if (it.kind === "text") {
      return <input value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={input} />;
    }

    return <input value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={input} />;
  };

  return (
    <div style={page}>
      {/* Header */}
      <div style={{ ...glass, padding: 18, maxWidth: 1900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 1600, color: THEME.text }}>
              ✅ Supplier Evaluation Form (PDF – Literal)
            </div>
            <div style={{ marginTop: 8, color: THEME.muted, fontSize: 14, fontWeight: 1200 }}>
              Same questions as PDF page-by-page (no rewording).
            </div>
            {publicMode ? (
              <div style={{ marginTop: 8, color: THEME.muted, fontSize: 12, fontWeight: 1200 }}>
                Public reference token: <b>{String(publicToken || "")}</b>
                {publicLoading ? <span> &nbsp;•&nbsp; Loading...</span> : null}
                {!publicLoading && publicLoaded ? <span> &nbsp;•&nbsp; Loaded ✅</span> : null}
              </div>
            ) : null}
          </div>

          {!publicMode ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => nav(PARENT_HUB_ROUTE)} style={btnGhost}>
                ↩ Back to Supplier Hub
              </button>
              <button onClick={() => nav("/haccp-iso")} style={btnGhost}>
                ↩ HACCP/ISO Menu
              </button>
            </div>
          ) : null}
        </div>

        {/* top meta */}
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <div style={pageCard}>
            <div style={{ color: THEME.muted, fontWeight: 1200, fontSize: 13 }}>Record Date</div>
            <div style={{ marginTop: 8 }}>
              <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} style={input} />
            </div>
          </div>

          <div style={pageCard}>
            <div style={{ color: THEME.muted, fontWeight: 1200, fontSize: 13 }}>Company Name (from PDF fields)</div>
            <div style={{ marginTop: 8 }}>
              <input value={fields.company_name || ""} onChange={(e) => onField("company_name", e.target.value)} style={input} />
            </div>
          </div>

          <div style={pageCard}>
            <div style={{ color: THEME.muted, fontWeight: 1200, fontSize: 13 }}>Yes / No Summary</div>
            <div style={{ marginTop: 10, fontSize: 18, fontWeight: 1500, color: THEME.text }}>
              Yes: {counts.yesCount} &nbsp;•&nbsp; No: {counts.noCount} &nbsp;•&nbsp; N/A: {counts.naCount}
            </div>
            <div style={{ marginTop: 6, color: THEME.muted, fontWeight: 1100, fontSize: 13 }}>Total questions: {counts.total}</div>
          </div>

          <div style={pageCard}>
            <div style={{ color: THEME.muted, fontWeight: 1200, fontSize: 13 }}>uniqueKey</div>
            <div
              style={{
                marginTop: 10,
                fontFamily: "ui-monospace, Menlo, Monaco, Consolas, 'Courier New', monospace",
                fontWeight: 1200,
                color: THEME.text,
              }}
            >
              {uniqueKey || "—"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onSave} disabled={saving || (publicMode && publicLoading)} style={btnPrimary(saving || (publicMode && publicLoading))}>
            {saving ? "Saving..." : publicMode ? "✅ Submit" : "💾 Save"}
          </button>

          {!publicMode ? (
            <button onClick={() => nav(PARENT_HUB_ROUTE)} style={btnGhost}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1900, margin: "14px auto 0", display: "grid", gap: 14 }}>
        {/* Notes */}
        <div style={section}>
          <div style={label}>Notes (internal)</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={textarea} placeholder="(optional) internal notes..." />
        </div>

        {/* Pages */}
        {FORM.map((p, pIdx) => (
          <div key={pIdx} style={section}>
            <div style={titleH}>{p.pageTitle}</div>
            <div style={subH}>Below is the same structure as provided.</div>

            <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
              {p.blocks.map((b, bIdx) => (
                <div key={bIdx} style={pageCard}>
                  <div style={{ fontSize: 18, fontWeight: 1500, color: THEME.text }}>{b.title}</div>

                  {b.type === "info" && (
                    <div style={{ marginTop: 10, whiteSpace: "pre-wrap", color: THEME.text, fontWeight: 1100, lineHeight: 1.6 }}>
                      {(b.lines || []).join("\n")}
                    </div>
                  )}

                  {b.type === "fields" && (
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                      {(b.items || []).map((it) => (
                        <div key={it.key} style={{ display: "grid", gap: 8 }}>
                          <div style={{ fontWeight: 1200, color: THEME.text, fontSize: 15, whiteSpace: "pre-wrap" }}>{it.label}</div>
                          {renderField(it)}
                        </div>
                      ))}
                    </div>
                  )}

                  {b.type === "yesno" && (
                    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                      {(b.items || []).map((it) => (
                        <div key={it.key} style={{ borderTop: "1px dashed rgba(2,6,23,0.22)", paddingTop: 12 }}>
                          <div style={{ fontWeight: 1300, color: THEME.text, fontSize: 15, whiteSpace: "pre-wrap" }}>{it.q}</div>

                          <div style={toggleRow}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button type="button" onClick={() => onToggle(it.key, true)} style={toggleBtn(answers[it.key] === true, "yes")}>
                                ✅ YES
                              </button>
                              <button type="button" onClick={() => onToggle(it.key, false)} style={toggleBtn(answers[it.key] === false, "no")}>
                                ❌ NO
                              </button>
                              <button type="button" onClick={() => onToggle(it.key, null)} style={toggleBtn(answers[it.key] === null, "na")}>
                                ➖ N/A
                              </button>
                            </div>

                            <div style={{ fontSize: 13, fontWeight: 1200, color: THEME.muted }}>
                              Selected:{" "}
                              <b style={{ color: answers[it.key] === true ? "#16a34a" : answers[it.key] === false ? "#dc2626" : THEME.muted }}>
                                {answers[it.key] === true ? "YES" : answers[it.key] === false ? "NO" : "N/A"}
                              </b>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Existing quick view (admin only) */}
        {!publicMode ? (
          <div style={section}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 1500, color: THEME.text }}>Recent Saved Forms</div>
              <button onClick={fetchExisting} disabled={loadingList} style={btnGhost}>
                {loadingList ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {existing.length === 0 ? (
                <div style={{ color: THEME.muted, fontWeight: 1100, fontSize: 14 }}>No saved forms yet.</div>
              ) : (
                existing.map((r, idx) => (
                  <div
                    key={r?.id || idx}
                    style={{
                      border: "1px solid rgba(2,6,23,0.14)",
                      borderRadius: 16,
                      padding: 14,
                      background: THEME.glassStrong,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 1400, color: THEME.text, fontSize: 15 }}>{r?.payload?.fields?.company_name || r?.title || "Supplier Evaluation Form"}</div>
                      <div style={{ color: THEME.muted, fontWeight: 1200, fontSize: 13, marginTop: 6 }}>
                        Date: {r?.payload?.recordDate || "—"} • YES: {r?.payload?.meta?.counts?.yesCount ?? "—"} • NO: {r?.payload?.meta?.counts?.noCount ?? "—"}
                      </div>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 1200, color: THEME.muted }}>{r?.payload?.uniqueKey || ""}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        <div style={{ textAlign: "left", color: "rgba(255,255,255,0.92)", fontWeight: 1100, fontSize: 13 }}>Built by Eng. Mohammed Abdullah</div>
      </div>
    </div>
  );
}
