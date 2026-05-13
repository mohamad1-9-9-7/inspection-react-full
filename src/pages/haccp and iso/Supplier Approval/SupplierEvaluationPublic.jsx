import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "./SupplierApproval.css";

/* ===================== API base (NORMALIZED) ===================== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";

function normalizeApiRoot(raw) {
  let s = String(raw || "").trim();
  if (!s) return API_ROOT_DEFAULT;
  s = s.replace(/\/+$/, "");
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
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per file
const ALLOWED_EXTS = [
  "pdf", "jpg", "jpeg", "png", "webp", "gif", "bmp",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
];

function getExtFromName(name) {
  const s = String(name || "").toLowerCase();
  const i = s.lastIndexOf(".");
  if (i < 0 || i === s.length - 1) return "";
  return s.slice(i + 1);
}

function validateFileForUpload(file) {
  if (!file || typeof file.size !== "number") return "Invalid file";
  if (file.size <= 0) return `File "${file.name}" is empty`;
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `File "${file.name}" is too large (${mb} MB). Max allowed is 15 MB.`;
  }
  const ext = getExtFromName(file.name);
  if (!ALLOWED_EXTS.includes(ext)) {
    return `File type ".${ext || "unknown"}" is not allowed. Allowed: ${ALLOWED_EXTS.join(", ")}.`;
  }
  return null;
}

async function uploadViaServer(file) {
  const validationError = validateFileForUpload(file);
  if (validationError) throw new Error(validationError);

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

/* ===================== Supplier Types ===================== */
const SUPPLIER_TYPE_OPTIONS = [
  { value: "food", labelEn: "Food / Raw Materials", labelAr: "مواد غذائية / مواد خام" },
  { value: "cleaning_chemicals", labelEn: "Cleaning Materials / Chemicals", labelAr: "مواد تنظيف / كيماويات" },
  { value: "packaging", labelEn: "Packaging Materials", labelAr: "مواد تعبئة وتغليف" },
  { value: "services", labelEn: "Services (Pest Control / Calibration / Transport / Waste)", labelAr: "خدمات (مكافحة آفات / معايرة / نقل / نفايات)" },
  { value: "other", labelEn: "Other / Equipment / Uniforms", labelAr: "أخرى / معدات / ملابس" },
];

/* ===================== FORM (structured by supplier type) =====================
 * Blocks without `types` = shared (shown for all).
 * Blocks/pages with `types: [...]` = shown only for matching supplier types.
 */
const FORM = [
  /* ─────────────── SHARED — always shown ─────────────── */
  {
    pageTitle: "Page 1 — Company & Products",
    blocks: [
      {
        title: "Company Details",
        type: "fields",
        items: [
          { key: "company_name", label: "Company Name:", kind: "text", required: true },
          { key: "company_address", label: "Address:", kind: "textarea_short", required: true },
          {
            key: "company_head_office_address",
            label: "Please provide Head Office address if different\nfrom above:",
            kind: "textarea_short",
          },
        ],
      },
      {
        title: "Technical or Quality Manager Contact Details",
        type: "fields",
        items: [
          { key: "tqm_contact_name", label: "Name of Contact:", kind: "text", required: true },
          { key: "tqm_position_held", label: "Position Held:", kind: "text", required: true },
          { key: "tqm_telephone", label: "Telephone No:", kind: "text", required: true },
          { key: "total_employees", label: "What is the total number of employees in your\ncompany?", kind: "text" },
        ],
      },
      {
        title: "Products / Services to be Supplied",
        type: "products_list",
        required: true,
      },
      {
        title: "Certification",
        type: "fields",
        items: [
          {
            key: "certified_question",
            label: "Are your facilities and products certified to any\nrecognized food safety / quality / regulatory schemes?",
            kind: "text",
          },
          { key: "certified_if_yes", label: "If yes which? (e.g. ISO 9001, HACCP, HALAL, BRC, FDA, ECAS)", kind: "text" },
          { key: "certificates_copy", label: "Please provide a copy of your certificates", kind: "textarea_short" },
          { key: "att_certificates", label: "Attach certificates copy", kind: "attachment" },
        ],
      },
      {
        title: "Staff Training & Hygiene",
        type: "fields",
        items: [
          {
            key: "hygiene_training_question",
            label: "Have your staff received any Hygiene / Safety / Job-specific Training and are certificate copies available?",
            kind: "text",
          },
          { key: "att_hygiene_training", label: "Attach training certificates (if available)", kind: "attachment" },
        ],
      },
    ],
  },

  /* ─────────────── FOOD ONLY — Pages 2–5 ─────────────── */
  {
    pageTitle: "Page 2 — Personal Hygiene, Foreign Body, Cleaning, Pests",
    pageTypes: ["food"],
    blocks: [
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
          { key: "fbc_04", q: "Is there a policy for the control of metal and\nexclusion of potential metal contaminants from\nproduction areas?" },
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
    ],
  },
  {
    pageTitle: "Page 3 — Pest Control (cont.), Food Safety Systems, Lab",
    pageTypes: ["food"],
    blocks: [
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
            q: "Is there a system for staff training such that all\nkey personnel are trained and have training\nrecords?",
          },
          {
            key: "fsq_05",
            q: "Do you have facilities and systems for the\ntransportation that protects products and prevent\ncontamination?",
          },
          { key: "fsq_06", q: "Do you have laboratory facilities on site and are\nthey accredited?" },
        ],
      },
      {
        title: "Laboratory Tests",
        type: "fields",
        items: [
          { key: "lab_tests_list", label: "If yes, please list any tests carried out on the\nproducts supplied", kind: "textarea_short" },
          { key: "att_lab_tests", label: "Attach lab test reports (if any)", kind: "attachment" },
        ],
      },
      {
        title: "Outside Testing",
        type: "fields",
        items: [
          {
            key: "outside_testing_details",
            label: "Do you use outside/contract facilities for any\nproduct testing? If yes give details",
            kind: "textarea_short",
          },
        ],
      },
    ],
  },
  {
    pageTitle: "Page 4 — RM Specs, HACCP, Process, Transport, Production",
    pageTypes: ["food"],
    blocks: [
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
          { key: "rm_07", q: "Do you have a procedure for dealing with non-conforming raw materials and finished products?" },
        ],
      },
      {
        title: "HACCP Plans",
        type: "fields",
        items: [
          {
            key: "haccp_copy_note",
            label: "Please provide a copy of your HACCP plans for each product supplied",
            kind: "textarea_short",
          },
          { key: "att_haccp", label: "Attach HACCP plans copy", kind: "attachment" },
        ],
      },
      {
        title: "Process Controls",
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
          { key: "trn_01", q: "Is the vehicle temperature monitored during\ntransportation?" },
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
    ],
  },
  {
    pageTitle: "Page 5 — Equipment & Allergen Management",
    pageTypes: ["food"],
    blocks: [
      {
        title: "Production Equipment",
        type: "yesno",
        items: [{ key: "eqp_01", q: "Is the equipment used in production fit for\npurpose, easy to clean and in a good state of\nrepair?" }],
      },
      {
        title: "Allergen Management",
        type: "yesno",
        items: [
          { key: "alg_01", q: "Do you maintain an allergen register for all raw\nmaterials and finished products?" },
          { key: "alg_02", q: "Are allergen-containing products physically\nsegregated during storage and production?" },
          { key: "alg_03", q: "Do you have validated cleaning procedures to\nprevent allergen cross-contamination between\nproducts?" },
          { key: "alg_04", q: "Are all allergens clearly declared on product\nlabels per local / destination country regulation?" },
          { key: "alg_05", q: "Do you have a documented policy to manage\nallergen cross-contact and staff training?" },
        ],
      },
      {
        title: "Allergen Declaration (text)",
        type: "fields",
        items: [
          {
            key: "allergen_declaration",
            label: "List all allergens present in products supplied (e.g. nuts, soy, gluten, dairy, eggs, fish, shellfish, sesame, etc.)",
            kind: "textarea_short",
          },
        ],
      },
    ],
  },

  /* ─────────────── CLEANING CHEMICALS ONLY ─────────────── */
  {
    pageTitle: "Page 2 — Chemical Product Safety (SDS / GHS / COA)",
    pageTypes: ["cleaning_chemicals"],
    blocks: [
      {
        title: "Safety Data Sheets & Labeling",
        type: "yesno",
        items: [
          { key: "chem_01", q: "Do you provide Safety Data Sheets (SDS / MSDS)\nin English/Arabic for every product supplied?" },
          { key: "chem_02", q: "Are your product labels compliant with GHS\n(Globally Harmonized System) hazard\ncommunication?" },
          { key: "chem_03", q: "Are hazard pictograms, signal words, H- and\nP-statements shown on primary packaging?" },
          { key: "chem_04", q: "Is product shelf life / expiry date clearly printed\non every container?" },
        ],
      },
      {
        title: "Attach Sample SDS / Labels",
        type: "fields",
        items: [
          { key: "att_sds", label: "Attach Safety Data Sheets (SDS/MSDS) for all products supplied", kind: "attachment" },
          { key: "att_labels", label: "Attach sample product labels (optional)", kind: "attachment" },
        ],
      },
      {
        title: "Quality, COA & Traceability",
        type: "yesno",
        items: [
          { key: "chem_05", q: "Do you issue a Certificate of Analysis (COA) per\nbatch upon request?" },
          { key: "chem_06", q: "Do you maintain batch traceability from raw\nchemical to finished product delivered?" },
          { key: "chem_07", q: "Do you operate under a documented Quality\nManagement System (e.g. ISO 9001)?" },
          { key: "chem_08", q: "Do you have a product recall procedure in place?" },
        ],
      },
      {
        title: "Attach COA Sample",
        type: "fields",
        items: [
          { key: "att_coa", label: "Attach a sample Certificate of Analysis (COA)", kind: "attachment" },
        ],
      },
      {
        title: "Food-Contact Suitability",
        type: "yesno",
        items: [
          {
            key: "chem_09",
            q: "Are your sanitizers / disinfectants approved for\nfood-contact surfaces (e.g. EPA / ECHA / FDA /\nESMA approval)?",
          },
          { key: "chem_10", q: "Do you provide recommended dilution rates,\ncontact time and rinse requirements in writing?" },
          { key: "chem_11", q: "Are your products halal-compliant where required\nfor food industry use?" },
        ],
      },
      {
        title: "Storage & Transport",
        type: "yesno",
        items: [
          { key: "chem_12", q: "Are chemicals stored separately from food and\nraw materials in your warehouse?" },
          { key: "chem_13", q: "Are transport drivers trained on ADR / hazardous\nmaterial handling for chemical deliveries?" },
          { key: "chem_14", q: "Is there a documented emergency / spillage\nresponse procedure available?" },
        ],
      },
    ],
  },

  /* ─────────────── PACKAGING ONLY ─────────────── */
  {
    pageTitle: "Page 2 — Packaging Compliance & Safety",
    pageTypes: ["packaging"],
    blocks: [
      {
        title: "Food-Contact Compliance",
        type: "yesno",
        items: [
          {
            key: "pkg_01",
            q: "Are all materials supplied compliant with\nfood-contact regulations (e.g. EU 10/2011, FDA\n21 CFR, GSO / ESMA)?",
          },
          { key: "pkg_02", q: "Do you provide a Declaration of Compliance (DOC)\nwith every consignment?" },
          { key: "pkg_03", q: "Have migration tests (overall & specific) been\nperformed and are reports available?" },
          { key: "pkg_04", q: "Are inks, adhesives and coatings used certified\nfor food-contact use?" },
        ],
      },
      {
        title: "Attach Compliance Documents",
        type: "fields",
        items: [
          { key: "att_doc", label: "Attach Declaration of Compliance (DOC)", kind: "attachment" },
          { key: "att_migration", label: "Attach migration test reports (if available)", kind: "attachment" },
        ],
      },
      {
        title: "Production Hygiene & Traceability",
        type: "yesno",
        items: [
          { key: "pkg_05", q: "Is your production facility certified to BRC\nPackaging, ISO 22000 / 15378 or equivalent?" },
          { key: "pkg_06", q: "Are production areas segregated from sources of\ncontamination (wood, glass, chemicals)?" },
          { key: "pkg_07", q: "Do you maintain batch traceability for raw\nmaterials, production and dispatch?" },
          { key: "pkg_08", q: "Do you have documented pest control and\nhousekeeping procedures?" },
          { key: "pkg_09", q: "Do you have a non-conformance / recall\nprocedure in place?" },
        ],
      },
      {
        title: "Storage & Delivery",
        type: "yesno",
        items: [
          { key: "pkg_10", q: "Is finished packaging stored off the floor in a\nclean, dry, pest-free environment?" },
          { key: "pkg_11", q: "Is packaging shrink-wrapped / pallet-protected\nduring transport?" },
        ],
      },
    ],
  },

  /* ─────────────── SERVICES ONLY ─────────────── */
  {
    pageTitle: "Page 2 — Service Provider Details",
    pageTypes: ["services"],
    blocks: [
      {
        title: "Scope of Service",
        type: "fields",
        items: [
          {
            key: "service_scope",
            label: "Describe the scope of services you provide (e.g. pest control, calibration, transport, waste, cleaning, maintenance, etc.)",
            kind: "textarea_short",
          },
        ],
      },
      {
        title: "Licensing, Training & Insurance",
        type: "yesno",
        items: [
          {
            key: "srv_01",
            q: "Do you hold all relevant regulatory licenses /\npermits to operate (e.g. municipality, civil\ndefense, Dubai Municipality PCO)?",
          },
          { key: "srv_02", q: "Are all technicians/operators trained and\ncertified for the services they deliver?" },
          { key: "srv_03", q: "Do you maintain valid public liability insurance\ncoverage for service operations?" },
          { key: "srv_04", q: "Are staff medically fit (valid health cards where\nrequired)?" },
        ],
      },
      {
        title: "Attach Licenses & Insurance",
        type: "fields",
        items: [
          { key: "att_srv_license", label: "Attach trade license / municipal permit / professional registration", kind: "attachment" },
          { key: "att_srv_insurance", label: "Attach liability insurance certificate (optional)", kind: "attachment" },
        ],
      },
      {
        title: "Service Delivery & Records",
        type: "yesno",
        items: [
          {
            key: "srv_05",
            q: "Do you issue a service report / certificate after\nevery visit, signed by the technician and client?",
          },
          { key: "srv_06", q: "Do you maintain service records, traceability and\nequipment calibration for at least 2 years?" },
          { key: "srv_07", q: "Do you follow a documented scope-of-work and\nmethod statement for each service?" },
        ],
      },
      {
        title: "Chemicals / Materials Used (if applicable)",
        type: "yesno",
        items: [
          {
            key: "srv_08",
            q: "Are all chemicals / materials used approved for\nfood-industry use and accompanied by SDS?",
          },
          {
            key: "srv_09",
            q: "Are equipment and tools used maintained,\ncalibrated and in a good state of repair?",
          },
        ],
      },
      {
        title: "Attach Sample Service Report / SDS",
        type: "fields",
        items: [
          { key: "att_srv_report", label: "Attach a sample service report / certificate (optional)", kind: "attachment" },
          { key: "att_srv_sds", label: "Attach SDS for chemicals used (if applicable)", kind: "attachment" },
        ],
      },
    ],
  },

  /* ─────────────── OTHER (Equipment / Uniforms / Misc) ─────────────── */
  {
    pageTitle: "Page 2 — Product Quality & Documentation",
    pageTypes: ["other"],
    blocks: [
      {
        title: "General Quality & Compliance",
        type: "yesno",
        items: [
          { key: "oth_01", q: "Do you operate under a documented Quality\nManagement System (ISO 9001 or equivalent)?" },
          { key: "oth_02", q: "Do products comply with relevant local / GCC\nregulations (SASO, ESMA, Emirates Authority)?" },
          { key: "oth_03", q: "Do you provide product specifications / datasheets\nwith every shipment?" },
          { key: "oth_04", q: "Do you offer warranty / after-sales support on\nproducts supplied?" },
          { key: "oth_05", q: "Do you maintain batch / lot traceability?" },
          { key: "oth_06", q: "Do you have a documented non-conformance and\nreturn procedure?" },
        ],
      },
      {
        title: "Attach Specifications",
        type: "fields",
        items: [
          { key: "att_oth_specs", label: "Attach product specifications / datasheets", kind: "attachment" },
        ],
      },
    ],
  },

  /* ─────────────── SHARED — Required Documents + QA Contact ─────────────── */
  {
    pageTitle: "Required Documents & Quality Officer Contact",
    blocks: [
      {
        title: "Required Documents",
        type: "fields",
        items: [
          {
            key: "att_trade_license",
            label: "Trade / Company License (Commercial Registration)",
            kind: "attachment",
          },
          {
            key: "att_vehicle_dm_card",
            label: "Vehicle Registration / Dubai Municipality (DM) Card — if you deliver by your own vehicle",
            kind: "attachment",
            required: true,
          },
          {
            key: "att_msds",
            label: "MSDS / Safety Data Sheets — if products contain any chemicals / hazardous substances",
            kind: "attachment",
          },
          {
            key: "att_coc_packaging",
            label: "Certificate of Conformity — Packaging Materials (food-contact)",
            kind: "attachment",
          },
        ],
      },
      {
        title: "Quality Officer Contact",
        type: "contact_info",
        email: "m.abdullah@almawashi.ae",
        phone: "+971585446473",
        whatsapp: "971585446473",
      },
    ],
  },

  /* ─────────────── SHARED — always last (Declaration) ─────────────── */
  {
    pageTitle: "Final — Declaration",
    blocks: [
      {
        title: "Declaration",
        type: "declaration",
      },
    ],
  },
];

/* ===================== FORM helpers (filter by type) ===================== */
function filterFormByType(supplierType) {
  const type = String(supplierType || "other").toLowerCase();
  return FORM
    .filter((page) => !page.pageTypes || page.pageTypes.includes(type))
    .map((page) => ({
      ...page,
      blocks: (page.blocks || []).filter((b) => !b.types || b.types.includes(type)),
    }))
    .filter((page) => page.blocks.length > 0);
}

/* Collect ALL field keys / answer keys for a given type (used to init state) */
function collectKeysForType(supplierType) {
  const pages = filterFormByType(supplierType);
  const fields = [];
  const answers = [];
  pages.forEach((p) =>
    p.blocks.forEach((b) => {
      if (b.type === "fields") (b.items || []).forEach((it) => fields.push(it.key));
      if (b.type === "yesno") (b.items || []).forEach((it) => answers.push(it.key));
    })
  );
  return { fields, answers };
}

/* ===================== UI helpers ===================== */
const THEME = {
  bg:
    "radial-gradient(circle at 12% 10%, rgba(14,165,233,0.14) 0, rgba(255,255,255,1) 46%, rgba(255,255,255,1) 100%)," +
    "radial-gradient(circle at 88% 10%, rgba(34,197,94,0.12) 0, rgba(255,255,255,0) 55%)," +
    "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.10) 0, rgba(255,255,255,0) 58%)",
  cardBg: "rgba(255,255,255,0.94)",
  border: "rgba(2,6,23,0.12)",
  text: "#0f172a",
  muted: "#64748b",
  soft: "rgba(2,6,23,0.03)",
};

const UI = {
  en: {
    title: "Supplier Evaluation Form",
    token: "Token",
    link: "Link",
    loading: "Loading...",
    attach: "Attachments",
    uploadDone: "✅ Files uploaded",
    submit: "✅ Submit",
    submitting: "Submitting...",
    selected: "Selected",
    yes: "YES",
    no: "NO",
    na: "N/A",
    thankTitle: "Thank you ✅",
    thankSub: "Your submission has been received.",
    closeNote: "You can close this page now.",
    lang: "Language",
    attachHint: "Attach (optional)",
    addFiles: "Add files",
    upload: "Upload",
    clear: "Clear",
    remove: "Remove",
    saving: "Saving...",
  },
  ar: {
    title: "نموذج تقييم المورد",
    token: "الرمز",
    link: "الرابط",
    loading: "جاري التحميل...",
    attach: "المرفقات",
    uploadDone: "✅ تم رفع الملفات",
    submit: "✅ إرسال",
    submitting: "جاري الإرسال...",
    selected: "المحدد",
    yes: "نعم",
    no: "لا",
    na: "غير متاح",
    thankTitle: "شكرًا ✅",
    thankSub: "تم استلام إجابتك بنجاح.",
    closeNote: "يمكنك إغلاق الصفحة الآن.",
    lang: "اللغة",
    attachHint: "إرفاق (اختياري)",
    addFiles: "إضافة ملفات",
    upload: "رفع",
    clear: "مسح",
    remove: "إزالة",
    saving: "جاري الحفظ...",
  },
};

/* ===================== AR translations for labels/questions/titles ===================== */
const AR_TRANSLATIONS = {
  "Page 1 — Company & Products": "الصفحة 1 — بيانات الشركة والمنتجات",
  "Page 2 — Personal Hygiene, Foreign Body, Cleaning, Pests":
    "الصفحة 2 — النظافة الشخصية / الأجسام الغريبة / التنظيف / الآفات",
  "Page 3 — Pest Control (cont.), Food Safety Systems, Lab":
    "الصفحة 3 — مكافحة الآفات (تكملة) / أنظمة سلامة الغذاء / المختبر",
  "Page 4 — RM Specs, HACCP, Process, Transport, Production":
    "الصفحة 4 — مواصفات المواد الخام / HACCP / العمليات / النقل / الإنتاج",
  "Page 5 — Equipment & Allergen Management":
    "الصفحة 5 — المعدات وإدارة مسببات الحساسية",
  "Page 2 — Chemical Product Safety (SDS / GHS / COA)":
    "الصفحة 2 — سلامة المنتجات الكيميائية (SDS / GHS / COA)",
  "Page 2 — Packaging Compliance & Safety":
    "الصفحة 2 — مطابقة وسلامة مواد التعبئة والتغليف",
  "Page 2 — Service Provider Details":
    "الصفحة 2 — بيانات مقدم الخدمة",
  "Page 2 — Product Quality & Documentation":
    "الصفحة 2 — جودة المنتج والتوثيق",
  "Final — Declaration": "الخاتمة — الإقرار",

  "Supplier Evaluation Form": "نموذج تقييم المورد",
  "Company Details": "بيانات الشركة",
  "Technical or Quality Manager Contact Details": "بيانات مسؤول الجودة/الفني",
  "Products / Services to be Supplied": "المنتجات / الخدمات المراد توريدها",
  "Products to be Supplied": "المنتجات المراد توريدها",
  "Certification": "الشهادات",
  "Staff Training & Hygiene": "تدريب ونظافة الموظفين",
  "Hygiene": "النظافة",
  "Personal Hygiene (YES/NO)": "النظافة الشخصية (نعم/لا)",
  "Foreign Body Control": "التحكم بالأجسام الغريبة",
  "Cleaning": "التنظيف",
  "Pest Control": "مكافحة الآفات",
  "Pest Control (continued)": "مكافحة الآفات (تكملة)",
  "Food Safety & Quality Systems": "أنظمة سلامة الغذاء والجودة",
  "If yes, please list any tests carried out on the products supplied": "إذا نعم، يرجى ذكر أي فحوصات تُجرى على المنتجات المورّدة",
  "Do you use outside/contract facilities for any product testing? If yes give details":
    "هل تستخدمون مختبرات/جهات خارجية لفحص المنتجات؟ إذا نعم اذكر التفاصيل",
  "Food Safety & Quality Controls (Raw materials / specs / non-conforming)":
    "ضوابط سلامة الغذاء والجودة (مواد خام/مواصفات/غير مطابق)",
  "Food Safety & Quality Controls": "ضوابط سلامة الغذاء والجودة",
  "Food Safety & Quality Controls (process controls)": "ضوابط سلامة الغذاء والجودة (ضوابط العمليات)",
  "Transportation": "النقل",
  "Production Area Controls": "ضوابط مناطق الإنتاج",
  "Production Area Controls (continued)": "ضوابط مناطق الإنتاج (تكملة)",
  "Declaration": "الإقرار",

  "Company Name:": "اسم الشركة:",
  "Address:": "العنوان:",
  "Please provide Head Office address if different\nfrom above:": "يرجى إدخال عنوان المكتب الرئيسي إذا كان مختلفاً عن المذكور أعلاه:",
  "Name of Contact:": "اسم جهة الاتصال:",
  "Position Held:": "المنصب:",
  "Telephone No:": "رقم الهاتف:",
  "What is the total number of employees in your\ncompany?": "كم عدد الموظفين الإجمالي في شركتكم؟",
  "Product Name": "اسم المنتج",
  "Please provide a full product specification with each product supplied": "يرجى توفير المواصفات الكاملة للمنتج مع كل منتج يتم توريده",
  "Attach product specification / spec sheet (PDF, image, etc.)": "إرفاق مواصفات المنتج/ورقة المواصفات (PDF/صورة…)",
  "Are your facilities and products certified to any\nrecognized food safety / quality / regulatory schemes?":
    "هل مرافقكم ومنتجاتكم معتمدة ضمن أنظمة معترف بها لسلامة الغذاء/الجودة/التنظيمية؟",
  "Are your facilities and products certified to any\nrecognized food safety or quality schemes?":
    "هل مرافقكم ومنتجاتكم معتمدة ضمن أي أنظمة معترف بها لسلامة الغذاء أو الجودة؟",
  "If yes which? (e.g. ISO 9001, HACCP, HALAL, BRC, FDA, ECAS)":
    "إذا نعم، ما هي؟ (مثل ISO 9001 / HACCP / HALAL / BRC / FDA / ECAS)",
  "If yes which?": "إذا نعم، ما هي؟",
  "Please provide a copy of your certificates": "يرجى إرفاق/ذكر نسخة من الشهادات",
  "Attach certificates copy": "إرفاق نسخة الشهادات",
  "Have your staff received any Hygiene / Safety / Job-specific Training and are certificate copies available?":
    "هل تلقى موظفوكم أي تدريب على النظافة / السلامة / الخاص بالمهمة، وهل تتوفر نسخ من الشهادات؟",
  "Have your staffs received any Food Hygiene &\nSafety Training to date & certificate copies are\navailable?":
    "هل تلقى الموظفون تدريباً على نظافة وسلامة الغذاء وهل تتوفر نسخ من الشهادات؟",
  "Attach training certificates (if available)": "إرفاق شهادات التدريب (إن وجدت)",
  "If yes, please list any tests carried out on the\nproducts supplied": "إذا نعم، يرجى ذكر أي فحوصات تُجرى على المنتجات الموردة",
  "Attach lab test reports (if any)": "إرفاق تقارير الفحوصات المخبرية (إن وجدت)",
  "Do you use outside/contract facilities for any\nproduct testing? If yes give details":
    "هل تستخدمون مختبرات/جهات خارجية لفحص المنتجات؟ إذا نعم اذكر التفاصيل",
  "Please provide a copy of your HACCP plans for each product supplied": "يرجى إرفاق نسخة من خطط الهاسب (HACCP) لكل منتج يتم توريده",
  "Attach HACCP plans copy": "إرفاق نسخة خطط HACCP",
  "Name: .......................................................................": "الاسم: .......................................................................",
  "Position Held: ................. ........................................................": "المنصب: ................. ........................................................",
  "Signed: ...........................................................................": "التوقيع: ...........................................................................",
  "Date: ................................................": "التاريخ: ................................................",
  "Company seal": "ختم الشركة",
  "Attach signed declaration / company seal scan (optional)": "إرفاق الإقرار الموقّع/ختم الشركة (اختياري)",

  "Document Reference Supplier Self-Assessment Form": "مرجع الوثيقة: نموذج التقييم الذاتي للمورد",
  "Issue Date": "تاريخ الإصدار",
  "Owned by:QA": "الجهة المالكة: QA",
  "Owned by: QA": "الجهة المالكة: QA",
  "Authorised By: DIRECTOR": "المعتمد من: المدير",
  "Please answer all questions and provide any additional information that you feel is pertinent.":
    "يرجى الإجابة على جميع الأسئلة وإضافة أي معلومات إضافية تراها مناسبة.",

  "Do you have documented Personal Hygiene standards & monitoring procedure?":
    "هل لديكم معايير موثّقة للنظافة الشخصية وإجراءات متابعة/مراقبة؟",
  "Do all food handlers have valid health cards?": "هل جميع العاملين في تداول الغذاء لديهم بطاقات صحية سارية؟",
  "Is there an Illness reporting procedure available?": "هل توجد إجراءات للإبلاغ عن المرض؟",
  "Do the staffs have separate changing facility & toilet away from the food handling area?":
    "هل يوجد للموظفين غرفة تبديل ودورات مياه منفصلة وبعيدة عن منطقة تداول الغذاء؟",

  "Is there a policy for the control of glass and\nexclusion of glass from production areas?":
    "هل توجد سياسة للتحكم بالزجاج واستبعاد الزجاج من مناطق الإنتاج؟",
  "Is there a glass/brittle material breakage\nprocedure?": "هل توجد إجراءات لكسر الزجاج/المواد الهشة؟",
  "Is there a policy for the control of wood and\nexclusion of wood from production areas?":
    "هل توجد سياسة للتحكم بالخشب واستبعاد الخشب من مناطق الإنتاج؟",
  "Is there a policy for the control of metal and\nexclusion of potential metal contaminants from\nproduction areas?":
    "هل توجد سياسة للتحكم بالمعادن واستبعاد الملوثات المعدنية المحتملة من مناطق الإنتاج؟",
  "Is there a policy for the control of knives and\nexclusion of unauthorized knives from the\nproduction area?":
    "هل توجد سياسة للتحكم بالسكاكين ومنع السكاكين غير المصرح بها في منطقة الإنتاج؟",

  "Do you have documented cleaning schedules that\ninclude frequency of clean, chemicals used step\nby step instructions and the standard required?":
    "هل لديكم جداول تنظيف موثّقة تشمل التكرار والمواد الكيميائية وخطوات العمل والمعيار المطلوب؟",
  "Do you monitor cleaning standards?": "هل تراقبون معايير/نتائج التنظيف؟",
  "Is there a separate area away from food\npreparation & storage available for cleaning\nchemicals & equipment storage?":
    "هل توجد منطقة منفصلة بعيداً عن تحضير/تخزين الغذاء لتخزين مواد ومعدات التنظيف؟",
  "Do you use Sanitizing Chemicals specifically for\nSanitizing or Disinfecting all food contact\nsurfaces?":
    "هل تستخدمون مواد تعقيم مخصصة لتعقيم/تطهير جميع الأسطح الملامسة للغذاء؟",
  "Do you have effective waste disposal system?": "هل لديكم نظام فعّال للتخلص من النفايات؟",

  "Do you have a Contract with Approved Pest\nControl Company?": "هل لديكم عقد مع شركة مكافحة آفات معتمدة؟",
  "Are raw materials, packaging and finished\nproducts stored so as to minimize the risk of\ninfestation?":
    "هل يتم تخزين المواد الخام ومواد التعبئة والمنتجات النهائية بطريقة تقلل خطر الإصابة بالآفات؟",
  "Are all buildings adequately proofed?": "هل جميع المباني محكمة لمنع دخول الآفات؟",

  "Is there a complete inventory of pesticides\ndetailing the location and safe use and\napplication of baits and other materials such as\ninsecticide sprays or fumigants?":
    "هل يوجد سجل/جرد كامل للمبيدات يوضح المواقع والاستخدام الآمن وتطبيق الطعوم ومواد مثل الرش أو التبخير؟",
  "Are flying insect controls in place?": "هل توجد وسائل للتحكم بالحشرات الطائرة؟",

  "Do you have a documented Quality and Food\nSafety Policy & Objectives (eg. HACCP,\nISO, HALAL, GMP)?":
    "هل لديكم سياسة وأهداف موثّقة للجودة وسلامة الغذاء (مثل HACCP/ISO/HALAL/GMP)؟",
  "Do you have a documented food safety & quality\nassurance manual that includes procedures for:":
    "هل لديكم دليل موثّق لضمان الجودة وسلامة الغذاء يتضمن إجراءات لـ:",
  "Resources and Training?": "الموارد والتدريب؟",
  "Purchasing and Verification of Purchased\nMaterials?": "الشراء والتحقق من المواد المشتراة؟",
  "Identification and Traceability?": "التعريف والتتبع؟",
  "Internal Audit?": "التدقيق الداخلي؟",
  "food complaint reporting procedure with\ncorrective action plan?": "إجراءات شكاوى الغذاء مع خطة إجراءات تصحيحية؟",
  "Corrective Action and Preventive Action?": "الإجراءات التصحيحية والوقائية؟",
  "Product Recall?": "استدعاء المنتج؟",
  "Are there maintenance programs for equipment\nand buildings?": "هل توجد برامج صيانة للمعدات والمباني؟",
  "Is there a system for staff training such that all\nkey personnel are trained and have training\nrecords?":
    "هل يوجد نظام تدريب للموظفين بحيث يتم تدريب جميع الأشخاص الرئيسيين وتتوفر سجلات تدريب؟",
  "Do you have facilities and systems for the\ntransportation that protects products and prevent\ncontamination?":
    "هل لديكم مرافق وأنظمة للنقل تحمي المنتجات وتمنع التلوث؟",
  "Do you have laboratory facilities on site and are\nthey accredited?": "هل لديكم مختبرات في الموقع وهل هي معتمدة؟",

  "Do you monitor the quality/safety of your raw\nmaterials and request certificates of\nanalysis/conformity from your suppliers?":
    "هل تراقبون جودة/سلامة المواد الخام وتطلبون شهادات تحليل/مطابقة من الموردين؟",
  "Do you have a traceability system and maintain\nrecords of batch codes of materials used?":
    "هل لديكم نظام تتبع وتحتفظون بسجلات أكواد الدُفعات للمواد المستخدمة؟",
  "Do you hold specifications for all your raw\nmaterials?": "هل لديكم مواصفات لجميع المواد الخام؟",
  "Do you have procedure for dealing with out of\nspecification/non-conforming raw materials and\nfinished products?":
    "هل لديكم إجراءات للتعامل مع المواد الخام/المنتجات غير المطابقة للمواصفات؟",
  "Do you have specifications for your finished\nproducts?": "هل لديكم مواصفات للمنتجات النهائية؟",
  "Do you test all finished product against your\nspecification?": "هل تفحصون جميع المنتجات النهائية مقابل المواصفات؟",
  "Do you have a procedure for dealing with non-conforming raw materials and finished products?":
    "هل لديكم إجراءات للتعامل مع المواد الخام والمنتجات غير المطابقة؟",

  "Have your critical control points (safety and\nquality) been identified for your production\nprocess?":
    "هل تم تحديد نقاط التحكم الحرجة (السلامة والجودة) لعملية الإنتاج؟",
  "Is there a temperature monitoring system in\nplace during chilled or frozen storage, heat\nprocessing, cold processing etc.?":
    "هل يوجد نظام مراقبة درجات الحرارة أثناء التخزين المبرد/المجمد أو المعالجة الحرارية/الباردة…؟",

  "Is the vehicle temperature monitored during\ntransportation?": "هل يتم مراقبة درجة حرارة المركبة أثناء النقل؟",
  "Is there a cleaning schedule for the vehicles &\nverification system available?":
    "هل توجد جداول تنظيف للمركبات ونظام تحقق متاح؟",
  "Are all the vehicles holding valid food control\nregulatory approval?": "هل جميع المركبات لديها موافقات رقابية سارية لنقل الغذاء؟",

  "Are your production methods documented and\navailable on the factory floor?":
    "هل طرق الإنتاج موثّقة ومتاحة على أرض المصنع؟",
  "Are critical measurement devices calibrated to a\nNational Standard?":
    "هل تتم معايرة أجهزة القياس الحرجة وفق معيار وطني؟",
  "Do you metal detect your finished product?": "هل تستخدمون جهاز كشف المعادن للمنتج النهائي؟",
  "Are all points of entry and ventilation protected\nfrom access by birds, insects, rodents, dust and\ndebris?":
    "هل جميع نقاط الدخول والتهوية محمية لمنع دخول الطيور/الحشرات/القوارض/الغبار/المخلفات؟",
  "Do you operate a planned maintenance\nprogramme?": "هل تطبقون برنامج صيانة مخطط؟",

  "Is the equipment used in production fit for\npurpose, easy to clean and in a good state of\nrepair?":
    "هل معدات الإنتاج مناسبة للغرض وسهلة التنظيف وبحالة جيدة؟",

  "All products supplied to Trans Emirates livestock Trading LLC comply with all relevant local and\ninternational legislation. The information supplied in this self-audit questionnaire is a true and\naccurate reflection of the production and control systems applied.":
    "جميع المنتجات المورّدة إلى Trans Emirates livestock Trading LLC مطابقة للتشريعات المحلية والدولية ذات الصلة. المعلومات الواردة في هذا الاستبيان هي انعكاس صحيح ودقيق لأنظمة الإنتاج والتحكم المطبقة.",

  /* ───── Allergen Management (food) ───── */
  "Allergen Management": "إدارة مسببات الحساسية",
  "Allergen Declaration (text)": "بيان مسببات الحساسية (نص)",
  "Production Equipment": "معدات الإنتاج",
  "Do you maintain an allergen register for all raw\nmaterials and finished products?":
    "هل تحتفظون بسجل لمسببات الحساسية لجميع المواد الخام والمنتجات النهائية؟",
  "Are allergen-containing products physically\nsegregated during storage and production?":
    "هل يتم الفصل المادي للمنتجات المحتوية على مسببات الحساسية أثناء التخزين والإنتاج؟",
  "Do you have validated cleaning procedures to\nprevent allergen cross-contamination between\nproducts?":
    "هل لديكم إجراءات تنظيف مُتحقق منها لمنع التلوث المتبادل لمسببات الحساسية بين المنتجات؟",
  "Are all allergens clearly declared on product\nlabels per local / destination country regulation?":
    "هل يتم تصريح جميع مسببات الحساسية بوضوح على ملصقات المنتجات وفق لوائح الدولة المحلية/المستوردة؟",
  "Do you have a documented policy to manage\nallergen cross-contact and staff training?":
    "هل لديكم سياسة موثّقة لإدارة التلامس المتبادل لمسببات الحساسية وتدريب الموظفين عليها؟",
  "List all allergens present in products supplied (e.g. nuts, soy, gluten, dairy, eggs, fish, shellfish, sesame, etc.)":
    "اذكر جميع مسببات الحساسية الموجودة في المنتجات المورّدة (مثل: المكسرات، الصويا، الغلوتين، الألبان، البيض، الأسماك، المحار، السمسم…)",

  /* ───── Chemicals ───── */
  "Safety Data Sheets & Labeling": "بطاقات السلامة والوسم (SDS/GHS)",
  "Attach Sample SDS / Labels": "إرفاق عينة من SDS / الملصقات",
  "Quality, COA & Traceability": "الجودة وشهادة التحليل والتتبع",
  "Attach COA Sample": "إرفاق عينة من شهادة التحليل",
  "Food-Contact Suitability": "ملاءمة ملامسة الغذاء",
  "Storage & Transport": "التخزين والنقل",
  "Do you provide Safety Data Sheets (SDS / MSDS)\nin English/Arabic for every product supplied?":
    "هل تقدمون بطاقات السلامة (SDS / MSDS) بالعربية/الإنجليزية لكل منتج يتم توريده؟",
  "Are your product labels compliant with GHS\n(Globally Harmonized System) hazard\ncommunication?":
    "هل ملصقات المنتجات متوافقة مع نظام GHS العالمي للتصنيف والوسم وتوصيل الأخطار؟",
  "Are hazard pictograms, signal words, H- and\nP-statements shown on primary packaging?":
    "هل رموز الخطر وكلمات الإنذار وبيانات H/P مطبوعة على العبوة الأساسية؟",
  "Is product shelf life / expiry date clearly printed\non every container?":
    "هل فترة الصلاحية / تاريخ الانتهاء مطبوعة بوضوح على كل عبوة؟",
  "Attach Safety Data Sheets (SDS/MSDS) for all products supplied":
    "إرفاق بطاقات السلامة (SDS/MSDS) لجميع المنتجات المورّدة",
  "Attach sample product labels (optional)": "إرفاق عينة من ملصقات المنتجات (اختياري)",
  "Do you issue a Certificate of Analysis (COA) per\nbatch upon request?":
    "هل تُصدرون شهادة تحليل (COA) لكل دُفعة عند الطلب؟",
  "Do you maintain batch traceability from raw\nchemical to finished product delivered?":
    "هل تحتفظون بنظام تتبع للدُفعات من المادة الخام حتى المنتج النهائي المسلَّم؟",
  "Do you operate under a documented Quality\nManagement System (e.g. ISO 9001)?":
    "هل تعملون وفق نظام إدارة جودة موثّق (مثل ISO 9001)؟",
  "Do you have a product recall procedure in place?":
    "هل لديكم إجراء لاستدعاء المنتج؟",
  "Attach a sample Certificate of Analysis (COA)":
    "إرفاق عينة من شهادة التحليل (COA)",
  "Are your sanitizers / disinfectants approved for\nfood-contact surfaces (e.g. EPA / ECHA / FDA /\nESMA approval)?":
    "هل مواد التعقيم/التطهير لديكم معتمدة للأسطح الملامسة للغذاء (EPA / ECHA / FDA / ESMA)؟",
  "Do you provide recommended dilution rates,\ncontact time and rinse requirements in writing?":
    "هل تقدمون نسب التخفيف ومدة التلامس ومتطلبات الشطف مكتوبة؟",
  "Are your products halal-compliant where required\nfor food industry use?":
    "هل منتجاتكم متوافقة مع متطلبات الحلال عند الاستخدام في قطاع الأغذية؟",
  "Are chemicals stored separately from food and\nraw materials in your warehouse?":
    "هل يتم تخزين الكيماويات بمعزل عن المواد الغذائية والخام في المستودع؟",
  "Are transport drivers trained on ADR / hazardous\nmaterial handling for chemical deliveries?":
    "هل سائقو النقل مدربون على التعامل مع المواد الخطرة (ADR) أثناء توصيل الكيماويات؟",
  "Is there a documented emergency / spillage\nresponse procedure available?":
    "هل يوجد إجراء موثّق للاستجابة للطوارئ / الانسكابات؟",

  /* ───── Packaging ───── */
  "Food-Contact Compliance": "مطابقة ملامسة الغذاء",
  "Attach Compliance Documents": "إرفاق وثائق المطابقة",
  "Production Hygiene & Traceability": "نظافة الإنتاج والتتبع",
  "Storage & Delivery": "التخزين والتسليم",
  "Are all materials supplied compliant with\nfood-contact regulations (e.g. EU 10/2011, FDA\n21 CFR, GSO / ESMA)?":
    "هل جميع المواد المورّدة مطابقة للوائح ملامسة الغذاء (EU 10/2011 / FDA 21 CFR / GSO / ESMA)؟",
  "Do you provide a Declaration of Compliance (DOC)\nwith every consignment?":
    "هل ترفقون بيان المطابقة (DOC) مع كل شحنة؟",
  "Have migration tests (overall & specific) been\nperformed and are reports available?":
    "هل تم إجراء اختبارات الهجرة (العامة والنوعية) وهل التقارير متاحة؟",
  "Are inks, adhesives and coatings used certified\nfor food-contact use?":
    "هل الأحبار والمواد اللاصقة والطلاءات المستخدمة معتمدة للاستخدام الغذائي؟",
  "Attach Declaration of Compliance (DOC)": "إرفاق بيان المطابقة (DOC)",
  "Attach migration test reports (if available)": "إرفاق تقارير اختبارات الهجرة (إن وجدت)",
  "Is your production facility certified to BRC\nPackaging, ISO 22000 / 15378 or equivalent?":
    "هل منشأة الإنتاج معتمدة BRC Packaging / ISO 22000 / 15378 أو ما يعادلها؟",
  "Are production areas segregated from sources of\ncontamination (wood, glass, chemicals)?":
    "هل مناطق الإنتاج معزولة عن مصادر التلوث (خشب/زجاج/كيماويات)؟",
  "Do you maintain batch traceability for raw\nmaterials, production and dispatch?":
    "هل تحتفظون بتتبع الدُفعات للمواد الخام والإنتاج والشحن؟",
  "Do you have documented pest control and\nhousekeeping procedures?":
    "هل لديكم إجراءات موثّقة لمكافحة الآفات والنظافة العامة؟",
  "Do you have a non-conformance / recall\nprocedure in place?":
    "هل لديكم إجراء لعدم المطابقة / الاستدعاء؟",
  "Is finished packaging stored off the floor in a\nclean, dry, pest-free environment?":
    "هل يتم تخزين التعبئة النهائية بعيداً عن الأرض في بيئة نظيفة جافة خالية من الآفات؟",
  "Is packaging shrink-wrapped / pallet-protected\nduring transport?":
    "هل يتم حماية التعبئة بالتغليف الانكماشي / البليت أثناء النقل؟",

  /* ───── Services ───── */
  "Scope of Service": "نطاق الخدمة",
  "Licensing, Training & Insurance": "التراخيص والتدريب والتأمين",
  "Attach Licenses & Insurance": "إرفاق التراخيص والتأمين",
  "Service Delivery & Records": "تقديم الخدمة والسجلات",
  "Chemicals / Materials Used (if applicable)": "الكيماويات / المواد المستخدمة (إن وجدت)",
  "Attach Sample Service Report / SDS": "إرفاق عينة تقرير خدمة / SDS",
  "Describe the scope of services you provide (e.g. pest control, calibration, transport, waste, cleaning, maintenance, etc.)":
    "اذكر نطاق الخدمات التي تقدمونها (مكافحة آفات / معايرة / نقل / نفايات / تنظيف / صيانة…)",
  "Do you hold all relevant regulatory licenses /\npermits to operate (e.g. municipality, civil\ndefense, Dubai Municipality PCO)?":
    "هل تمتلكون جميع التراخيص / التصاريح التنظيمية للعمل (البلدية / الدفاع المدني / PCO بلدية دبي)؟",
  "Are all technicians/operators trained and\ncertified for the services they deliver?":
    "هل جميع الفنيين/المشغّلين مدربون ومعتمدون للخدمات التي يقدمونها؟",
  "Do you maintain valid public liability insurance\ncoverage for service operations?":
    "هل لديكم تأمين مسؤولية عامة ساري لتغطية عمليات الخدمة؟",
  "Are staff medically fit (valid health cards where\nrequired)?":
    "هل الموظفون لائقون طبياً (بطاقات صحية سارية حيثما يتطلب الأمر)؟",
  "Attach trade license / municipal permit / professional registration":
    "إرفاق الرخصة التجارية / تصريح البلدية / التسجيل المهني",
  "Attach liability insurance certificate (optional)":
    "إرفاق شهادة تأمين المسؤولية (اختياري)",
  "Do you issue a service report / certificate after\nevery visit, signed by the technician and client?":
    "هل تُصدرون تقرير/شهادة خدمة بعد كل زيارة موقعة من الفني والعميل؟",
  "Do you maintain service records, traceability and\nequipment calibration for at least 2 years?":
    "هل تحتفظون بسجلات الخدمة والتتبع ومعايرة المعدات لمدة سنتين على الأقل؟",
  "Do you follow a documented scope-of-work and\nmethod statement for each service?":
    "هل تتبعون نطاق عمل وبيان طريقة موثّق لكل خدمة؟",
  "Are all chemicals / materials used approved for\nfood-industry use and accompanied by SDS?":
    "هل جميع الكيماويات/المواد المستخدمة معتمدة للاستخدام الغذائي ومرفقة ببطاقات SDS؟",
  "Are equipment and tools used maintained,\ncalibrated and in a good state of repair?":
    "هل المعدات والأدوات المستخدمة تخضع للصيانة والمعايرة وبحالة جيدة؟",
  "Attach a sample service report / certificate (optional)":
    "إرفاق عينة تقرير/شهادة خدمة (اختياري)",
  "Attach SDS for chemicals used (if applicable)":
    "إرفاق بطاقات SDS للكيماويات المستخدمة (إن وجدت)",

  /* ───── Other (misc) ───── */
  "General Quality & Compliance": "الجودة العامة والمطابقة",
  "Attach Specifications": "إرفاق المواصفات",
  "Do you operate under a documented Quality\nManagement System (ISO 9001 or equivalent)?":
    "هل تعملون وفق نظام إدارة جودة موثّق (ISO 9001 أو ما يعادله)؟",
  "Do products comply with relevant local / GCC\nregulations (SASO, ESMA, Emirates Authority)?":
    "هل المنتجات مطابقة للوائح المحلية/الخليجية ذات الصلة (SASO / ESMA / هيئة الإمارات)؟",
  "Do you provide product specifications / datasheets\nwith every shipment?":
    "هل تزوّدون بمواصفات/بطاقات بيانات المنتج مع كل شحنة؟",
  "Do you offer warranty / after-sales support on\nproducts supplied?":
    "هل تقدمون ضماناً/دعماً لما بعد البيع للمنتجات المورّدة؟",
  "Do you maintain batch / lot traceability?":
    "هل تحتفظون بنظام تتبع للدُفعات؟",
  "Do you have a documented non-conformance and\nreturn procedure?":
    "هل لديكم إجراء موثّق لعدم المطابقة والإرجاع؟",
  "Attach product specifications / datasheets":
    "إرفاق مواصفات / بطاقات بيانات المنتج",

  /* ───── Updated / new section titles ───── */
  "Laboratory Tests": "الفحوصات المخبرية",
  "Outside Testing": "الفحص الخارجي",
  "HACCP Plans": "خطط HACCP",
  "Process Controls": "ضوابط العمليات",

  /* ───── Required Documents + Contact ───── */
  "Required Documents & Quality Officer Contact":
    "المستندات المطلوبة وجهة الاتصال بضابط الجودة",
  "Required Documents": "المستندات المطلوبة",
  "Quality Officer Contact": "التواصل مع ضابط الجودة",
  "Trade / Company License (Commercial Registration)":
    "رخصة الشركة / السجل التجاري",
  "Vehicle Registration / Dubai Municipality (DM) Card — if you deliver by your own vehicle":
    "تسجيل المركبة / بطاقة بلدية دبي (DM Card) — في حال كنتم تسلّمون بمركبتكم",
  "MSDS / Safety Data Sheets — if products contain any chemicals / hazardous substances":
    "بطاقات السلامة (MSDS / SDS) — في حال احتواء المنتجات على أي مواد كيميائية أو خطرة",
  "Certificate of Conformity — Packaging Materials (food-contact)":
    "شهادة المطابقة — لمواد التعبئة والتغليف (الملامسة للغذاء)",
};

/* ===== translate helper ===== */
function tr(lang, text) {
  if (lang !== "ar") return text;
  const s = String(text ?? "");
  return AR_TRANSLATIONS[s] || s;
}

/* ===================== Component ===================== */
export default function SupplierEvaluationPublic() {
  const { token } = useParams();

  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem("qcs_public_lang");
      if (saved === "ar" || saved === "en") return saved;
    } catch {}
    return "en";
  });

  const t = UI[lang] || UI.en;
  const isRTL = lang === "ar";

  const submittedKey = useMemo(() => `supplier_public_submitted_${String(token || "")}`, [token]);
  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(submittedKey) === "1";
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [info, setInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);

  // ✅ supplier type — set by admin in Create, or selected by supplier here if missing.
  // Determines which pages/blocks are rendered.
  const [supplierType, setSupplierType] = useState("");
  const [typeLocked, setTypeLocked] = useState(false); // true when admin set the type

  const activeType = String(supplierType || "other").toLowerCase();
  const visiblePages = useMemo(() => filterFormByType(activeType), [activeType]);

  // Build a full init for ALL possible keys across all types (so state is stable when user switches type).
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

  // ✅ per-field attachments stored in map: { [fieldKey]: [{name,url}] }
  const [fieldAttachments, setFieldAttachments] = useState(() => ({}));

  // global attachments (kept)
  const [attachments, setAttachments] = useState([]); // [{name,url}]

  // ✅ declaration
  const [declaration, setDeclaration] = useState({ agreed: false, name: "", position: "", agreedAt: null });
  const [showDeclModal, setShowDeclModal] = useState(false);

  // ✅ dynamic products list: [{id, name, files:[{name,url}]}]
  const [productsList, setProductsList] = useState([{ id: "p1", name: "", files: [] }]);

  const addProduct = () => {
    if (done) return;
    const id = `p${Date.now()}`;
    setProductsList((prev) => [...prev, { id, name: "", files: [] }]);
  };

  const removeProduct = (id) => {
    if (done) return;
    setProductsList((prev) => prev.filter((p) => p.id !== id));
  };

  const updateProductName = (id, name) => {
    if (done) return;
    setProductsList((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const uploadProductFiles = async (id, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || done) return;
    setMsg("");

    // ✅ pre-validate all files
    const valid = [];
    const rejected = [];
    for (const f of files) {
      const err = validateFileForUpload(f);
      if (err) rejected.push(err);
      else valid.push(f);
    }
    if (rejected.length) setMsg(`❌ ${rejected.join(" | ")}`);
    if (!valid.length) return;

    setSaving(true);
    try {
      const uploaded = [];
      for (const f of valid) {
        const url = await uploadViaServer(f);
        uploaded.push({ name: f.name, url });
      }
      setProductsList((prev) =>
        prev.map((p) => (p.id === id ? { ...p, files: [...p.files, ...uploaded] } : p))
      );
      setMsg(rejected.length ? `⚠ ${uploaded.length} uploaded, ${rejected.length} rejected` : t.uploadDone);
    } catch (e) {
      setMsg(`❌ ${e?.message || "Upload failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const removeProductFile = (productId, fileIdx) => {
    if (done) return;
    setProductsList((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, files: p.files.filter((_, i) => i !== fileIdx) } : p
      )
    );
  };

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const u = new URL(window.location.href);
      return `${u.origin}${u.pathname}`;
    } catch {
      return window.location.href;
    }
  }, [token]);

  useEffect(() => {
    try {
      localStorage.setItem("qcs_public_lang", lang);
    } catch {}
  }, [lang]);

  // ✅ block back after done
  useEffect(() => {
    if (!done) return;
    try {
      window.history.replaceState(null, "", window.location.href);
      const block = () => window.history.pushState(null, "", window.location.href);
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", block);
      return () => window.removeEventListener("popstate", block);
    } catch {}
  }, [done]);

  const load = async () => {
    setLoading(true);
    setMsg("");
    setLoadError("");
    try {
      const data = await fetchJson(getInfoEndpoint(token), { method: "GET" });

      const report = data?.report || data?.item || data?.data || data;
      setInfo(report);

      const p = report?.payload || report?.payload_json || report?.data?.payload || report?.item?.payload || {};

      // ✅ Server-side already-submitted check. Block re-submission even if localStorage
      //    was cleared or a different browser/device is used.
      const serverSubmitted =
        !!p?.public?.submittedAt ||
        !!p?.meta?.submitted ||
        !!p?.public?.submission?.submittedAt;
      if (serverSubmitted) {
        try { localStorage.setItem(submittedKey, "1"); } catch {}
        setDone(true);
        return;
      }

      // ✅ Expiry check
      const expiresAt = p?.public?.expiresAt;
      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        setLoadError(
          isRTL
            ? "⏰ انتهت صلاحية هذا الرابط. يرجى التواصل مع الجهة التي أرسلت الرابط لطلب رابط جديد."
            : "⏰ This link has expired. Please contact the sender to request a new link."
        );
        return;
      }

      // ✅ Best-effort: log first-open timestamp (no-op if it fails)
      if (!p?.public?.openedAt) {
        try {
          const reportId = report?.id || report?._id;
          if (reportId) {
            const newPayload = {
              ...p,
              public: { ...(p.public || {}), openedAt: new Date().toISOString() },
            };
            fetch(`${API_BASE}/api/reports/${encodeURIComponent(reportId)}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reporter: report?.reporter || "public",
                type: "supplier_self_assessment_form",
                payload: newPayload,
              }),
            }).catch(() => {});
          }
        } catch {}
      }

      const preFields = p?.fields && typeof p.fields === "object" ? p.fields : {};
      const preAnswers = p?.answers && typeof p.answers === "object" ? p.answers : {};
      const preAttachments = Array.isArray(p?.attachments) ? p.attachments : [];

      // ✅ restore per-field attachments if present
      const preFieldAttachments =
        p?.fieldAttachments && typeof p.fieldAttachments === "object" && !Array.isArray(p.fieldAttachments) ? p.fieldAttachments : {};

      // ✅ resolve supplier type (admin-set > legacy fields fallback)
      //   Type is ALWAYS locked — only the admin decides at creation time.
      //   Legacy tokens (created before this feature) default to "food".
      const adminType =
        p?.public?.supplierType ||
        p?.meta?.supplierType ||
        preFields?.supplier_type ||
        "";
      const normalizedType = String(adminType || "").toLowerCase().trim();
      const validTypes = SUPPLIER_TYPE_OPTIONS.map((o) => o.value);
      const resolvedType = validTypes.includes(normalizedType) ? normalizedType : "food";
      setSupplierType(resolvedType);
      setTypeLocked(true);

      setFields((prev) => {
        const out = { ...prev };
        Object.keys(out).forEach((k) => {
          if (Object.prototype.hasOwnProperty.call(preFields, k)) out[k] = preFields[k];
        });
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

      setFieldAttachments(preFieldAttachments);
      setAttachments(preAttachments);

      // ✅ restore declaration
      if (p?.declaration && typeof p.declaration === "object") {
        setDeclaration({
          agreed: !!p.declaration.agreed,
          name: p.declaration.name || "",
          position: p.declaration.position || "",
          agreedAt: p.declaration.agreedAt || null,
        });
      }

      // ✅ restore productsList — fallback from old string format
      if (Array.isArray(p?.productsList) && p.productsList.length) {
        setProductsList(
          p.productsList.map((item, i) => ({
            id: item.id || `p${i}`,
            name: item.name || "",
            files: Array.isArray(item.files) ? item.files : [],
          }))
        );
      } else if (typeof preFields?.products_to_be_supplied === "string" && preFields.products_to_be_supplied.trim()) {
        // migrate old textarea value: split lines → each becomes a product row
        const lines = preFields.products_to_be_supplied
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        setProductsList(
          lines.length
            ? lines.map((name, i) => ({ id: `p${i}`, name, files: [] }))
            : [{ id: "p0", name: "", files: [] }]
        );
      }
    } catch (e) {
      const errMsg = `${e?.message || "Failed to load"} (token: ${token})`;
      setMsg(`❌ ${errMsg}`);
      setLoadError(errMsg);
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!done) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, done]);

  const onField = (key, value) => setFields((p) => ({ ...p, [key]: value }));
  const onToggle = (key, value) => setAnswers((p) => ({ ...p, [key]: value }));

  const pickFilesGlobal = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || done) return;

    setMsg("");

    // ✅ pre-validate all files
    const valid = [];
    const rejected = [];
    for (const f of files) {
      const err = validateFileForUpload(f);
      if (err) rejected.push(err);
      else valid.push(f);
    }
    if (rejected.length) setMsg(`❌ ${rejected.join(" | ")}`);
    if (!valid.length) return;

    setSaving(true);
    try {
      const uploaded = [];
      for (const f of valid) {
        const url = await uploadViaServer(f);
        uploaded.push({ name: f.name, url });
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      setMsg(rejected.length ? `⚠ ${uploaded.length} uploaded, ${rejected.length} rejected` : t.uploadDone);
    } catch (e) {
      setMsg(`❌ ${e?.message || "Upload failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const removeGlobalAttachment = (idx) => {
    if (done) return;
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const pickFilesForField = async (fieldKey, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || done) return;

    setMsg("");

    // ✅ pre-validate all files
    const valid = [];
    const rejected = [];
    for (const f of files) {
      const err = validateFileForUpload(f);
      if (err) rejected.push(err);
      else valid.push(f);
    }
    if (rejected.length) setMsg(`❌ ${rejected.join(" | ")}`);
    if (!valid.length) return;

    setSaving(true);
    try {
      const uploaded = [];
      for (const f of valid) {
        const url = await uploadViaServer(f);
        uploaded.push({ name: f.name, url });
      }
      setFieldAttachments((prev) => {
        const cur = Array.isArray(prev?.[fieldKey]) ? prev[fieldKey] : [];
        return { ...prev, [fieldKey]: [...cur, ...uploaded] };
      });
      setMsg(rejected.length ? `⚠ ${uploaded.length} uploaded, ${rejected.length} rejected` : t.uploadDone);
    } catch (e) {
      setMsg(`❌ ${e?.message || "Upload failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const removeFieldAttachment = (fieldKey, idx) => {
    if (done) return;
    setFieldAttachments((prev) => {
      const cur = Array.isArray(prev?.[fieldKey]) ? prev[fieldKey] : [];
      return { ...prev, [fieldKey]: cur.filter((_, i) => i !== idx) };
    });
  };

  const clearFieldAttachments = (fieldKey) => {
    if (done) return;
    setFieldAttachments((prev) => ({ ...prev, [fieldKey]: [] }));
  };

  /* ===== Required-field validation ===== */
  const validateBeforeSubmit = () => {
    const errs = [];
    const L = isRTL;

    const companyName = String(fields.company_name || "").trim();
    if (!companyName || !/\S/.test(companyName) || companyName.length < 2) {
      errs.push(L ? "اسم الشركة مطلوب (حرفان على الأقل)" : "Company name is required (at least 2 characters)");
    }

    const address = String(fields.company_address || "").trim();
    if (!address) {
      errs.push(L ? "عنوان الشركة مطلوب" : "Company address is required");
    }

    const contactName = String(fields.tqm_contact_name || "").trim();
    if (!contactName) {
      errs.push(L ? "اسم جهة الاتصال (مسؤول الجودة/الفني) مطلوب" : "Contact person (Technical / Quality Manager) name is required");
    }

    const position = String(fields.tqm_position_held || "").trim();
    if (!position) {
      errs.push(L ? "المنصب الوظيفي لجهة الاتصال مطلوب" : "Position Held is required");
    }

    const tel = String(fields.tqm_telephone || "").trim();
    if (!tel) {
      errs.push(L ? "رقم هاتف جهة الاتصال مطلوب" : "Contact telephone number is required");
    }

    // At least one product/service with a name
    const hasProduct = Array.isArray(productsList) && productsList.some((p) => String(p?.name || "").trim().length > 0);
    if (!hasProduct) {
      errs.push(L ? "يجب إضافة منتج/خدمة واحدة على الأقل (الاسم)" : "At least one product/service must be added (with a name)");
    }

    // Vehicle DM Card — required attachment
    const dmFiles = Array.isArray(fieldAttachments?.att_vehicle_dm_card) ? fieldAttachments.att_vehicle_dm_card : [];
    if (dmFiles.length === 0) {
      errs.push(
        L
          ? "إرفاق تسجيل المركبة / بطاقة بلدية دبي (DM Card) مطلوب"
          : "Vehicle Registration / Dubai Municipality (DM) Card attachment is required"
      );
    }

    // Declaration must be signed
    if (!declaration?.agreed) {
      errs.push(L ? "يجب تأكيد الإقرار قبل الإرسال" : "Declaration must be confirmed before submission");
    }
    if (declaration?.agreed && !String(declaration?.name || "").trim()) {
      errs.push(L ? "اسم الموقِّع على الإقرار مطلوب" : "Declaration signer name is required");
    }

    return errs;
  };

  const submit = async () => {
    if (done) return;
    setMsg("");
    setValidationErrors([]);

    // ✅ required-field validation
    const errs = validateBeforeSubmit();
    if (errs.length) {
      setValidationErrors(errs);
      setMsg(`❌ ${isRTL ? "يوجد " + errs.length + " خطأ في النموذج" : `${errs.length} validation error(s)`}`);
      // scroll to top so user sees errors banner
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
      return;
    }

    setSaving(true);
    try {
      // ✅ re-check server-side if already submitted to avoid double-submit races
      try {
        const check = await fetchJson(getInfoEndpoint(token), { method: "GET" });
        const rep = check?.report || check?.item || check?.data || check;
        const cp = rep?.payload || rep?.payload_json || {};
        const alreadySubmitted =
          !!cp?.public?.submittedAt ||
          !!cp?.meta?.submitted ||
          !!cp?.public?.submission?.submittedAt;
        if (alreadySubmitted) {
          try { localStorage.setItem(submittedKey, "1"); } catch {}
          setDone(true);
          setMsg(isRTL ? "✅ تم استلام النموذج مسبقاً" : "✅ This form was already submitted");
          return;
        }
      } catch {
        // if the check fails, proceed (not a hard block)
      }

      // ✅ Only send data for keys visible in the chosen supplier type.
      // Prevents inflated N/A counts and stale values from other types polluting the submission.
      const { fields: visibleFieldKeys, answers: visibleAnswerKeys } = collectKeysForType(activeType);
      const filteredFields = {};
      visibleFieldKeys.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(fields, k)) filteredFields[k] = fields[k];
      });
      // Preserve identity fields that exist on all types
      ["company_name", "company_address", "company_head_office_address",
       "tqm_contact_name", "tqm_position_held", "tqm_telephone", "total_employees"
      ].forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(fields, k)) filteredFields[k] = fields[k];
      });

      const filteredAnswers = {};
      visibleAnswerKeys.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(answers, k)) filteredAnswers[k] = answers[k];
      });

      const filteredFieldAttachments = {};
      const visibleFieldKeySet = new Set(visibleFieldKeys);
      Object.keys(fieldAttachments || {}).forEach((k) => {
        if (visibleFieldKeySet.has(k)) filteredFieldAttachments[k] = fieldAttachments[k];
      });

      await fetchJson(getSubmitEndpoint(token), {
        method: "POST",
        body: JSON.stringify({
          recordDate: todayISO(),
          fields: {
            ...filteredFields,
            supplier_type: activeType,
          },
          supplierType: activeType,
          answers: filteredAnswers,
          attachments,
          fieldAttachments: filteredFieldAttachments,
          productsList,
          declaration,
        }),
      });

      try {
        localStorage.setItem(submittedKey, "1");
      } catch {}
      setDone(true);
      setMsg(isRTL ? "✅ تم الإرسال بنجاح" : "✅ Submitted successfully");
    } catch (e) {
      setMsg(`❌ ${e?.message || "Submit failed"}`);
    } finally {
      setSaving(false);
    }
  };

  /* ===================== Declaration helpers ===================== */
  const DECL_TEXT_EN =
    "All products supplied to Trans Emirates Livestock Trading LLC comply with all relevant local and international legislation. The information supplied in this self-audit questionnaire is a true and accurate reflection of the production and control systems applied.";
  const DECL_TEXT_AR =
    "جميع المنتجات المورّدة إلى Trans Emirates Livestock Trading LLC مطابقة للتشريعات المحلية والدولية ذات الصلة. المعلومات الواردة في هذا الاستبيان هي انعكاس صحيح ودقيق لأنظمة الإنتاج والتحكم المطبقة.";
  const declText = isRTL ? DECL_TEXT_AR : DECL_TEXT_EN;

  const printDeclaration = () => {
    const companyName = fields?.company_name || declaration.name || "";
    const html = `<!DOCTYPE html><html dir="${isRTL ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8"/>
  <title>${isRTL ? "الإقرار" : "Declaration"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 14px; color: #000; padding: 40px; direction: ${isRTL ? "rtl" : "ltr"}; }
    h2 { font-size: 18px; margin-bottom: 18px; text-align: center; }
    .logo-line { text-align: center; font-size: 13px; color: #555; margin-bottom: 24px; }
    .decl-box { border: 2px solid #000; padding: 18px; border-radius: 4px; font-size: 14px; line-height: 1.8; margin-bottom: 28px; }
    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 40px; margin-top: 18px; }
    .field-row { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 12px; font-weight: bold; color: #444; }
    .field-line { border-bottom: 1px solid #000; min-height: 28px; padding: 2px 0; font-size: 14px; }
    .sign-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 28px; }
    .sign-box { border-bottom: 1px solid #000; min-height: 44px; }
    .sign-label { font-size: 11px; color: #666; margin-top: 4px; }
    .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #888; }
    @page { margin: 20mm; }
  </style>
</head>
<body>
  <h2>${isRTL ? "نموذج تقييم المورد — الإقرار" : "Supplier Evaluation Form — Declaration"}</h2>
  <div class="logo-line">Trans Emirates Livestock Trading LLC — Al Mawashi</div>
  <div class="decl-box">${isRTL ? DECL_TEXT_AR : DECL_TEXT_EN}</div>
  <div class="fields">
    <div class="field-row">
      <span class="field-label">${isRTL ? "اسم الشركة" : "Company Name"}</span>
      <div class="field-line">${companyName}</div>
    </div>
    <div class="field-row">
      <span class="field-label">${isRTL ? "الاسم" : "Name"}</span>
      <div class="field-line">${declaration.name}</div>
    </div>
    <div class="field-row">
      <span class="field-label">${isRTL ? "المنصب" : "Position Held"}</span>
      <div class="field-line">${declaration.position}</div>
    </div>
    <div class="field-row">
      <span class="field-label">${isRTL ? "التاريخ" : "Date"}</span>
      <div class="field-line">${new Date().toLocaleDateString()}</div>
    </div>
  </div>
  <div class="sign-row">
    <div>
      <div class="sign-box"></div>
      <div class="sign-label">${isRTL ? "التوقيع" : "Signature"}</div>
    </div>
    <div>
      <div class="sign-box"></div>
      <div class="sign-label">${isRTL ? "ختم الشركة" : "Company Seal"}</div>
    </div>
    <div>
      <div class="sign-box"></div>
      <div class="sign-label">${isRTL ? "التاريخ" : "Date"}</div>
    </div>
  </div>
  <div class="footer">Al Mawashi — Quality &amp; Food Safety System</div>
</body></html>`;
    const win = window.open("", "_blank", "width=800,height=650");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  /* ===================== styles (magic touch) ===================== */
  const page = {
    minHeight: "100vh",
    padding: "20px 24px",
    direction: isRTL ? "rtl" : "ltr",
    fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Arial",
    background: THEME.bg,
    color: THEME.text,
    boxSizing: "border-box",
  };

  const card = {
    width: "100%",
    maxWidth: "100%",
    margin: "0 auto",
    background: THEME.cardBg,
    border: `1px solid ${THEME.border}`,
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 16px 38px rgba(2,6,23,0.10)",
    backdropFilter: "blur(10px)",
    boxSizing: "border-box",
  };

  const topbar = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  };

  const pill = {
    padding: "9px 14px",
    borderRadius: 999,
    border: `1px solid ${THEME.border}`,
    background: "rgba(255,255,255,0.92)",
    fontWeight: 900,
    fontSize: 15,
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
  };

  const section = {
    marginTop: 18,
    borderTop: `1px solid ${THEME.border}`,
    paddingTop: 16,
  };

  const input = {
    width: "100%",
    borderRadius: 14,
    border: `1px solid ${THEME.border}`,
    padding: "14px 16px",
    outline: "none",
    background: "#fff",
    fontFamily: "inherit",
    fontSize: 19,
    fontWeight: 800,
    boxSizing: "border-box",
    boxShadow: "0 1px 0 rgba(2,6,23,0.04) inset",
  };

  const textarea = {
    ...input,
    minHeight: 110,
    resize: "vertical",
    lineHeight: 1.55,
  };

  const btn = {
    border: `1px solid ${THEME.border}`,
    background: "#fff",
    borderRadius: 12,
    padding: "11px 14px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 16,
  };

  const btnSoft = {
    ...btn,
    background: "rgba(2,6,23,0.03)",
  };

  const btnPrimary = (disabled) => ({
    ...btn,
    padding: "14px 18px",
    fontSize: 17,
    background: disabled ? "#f1f5f9" : "linear-gradient(135deg, rgba(14,165,233,0.18), rgba(34,197,94,0.16))",
    border: disabled ? `1px solid ${THEME.border}` : "1px solid rgba(34,197,94,0.28)",
    cursor: disabled ? "not-allowed" : "pointer",
  });

  const toggleBtn = (active, kind) => {
    const base = { ...btn, minWidth: 108, padding: "12px 16px", fontSize: 16 };
    if (!active) return base;
    if (kind === "yes") return { ...base, background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.30)" };
    if (kind === "no") return { ...base, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)" };
    return { ...base, background: "rgba(148,163,184,0.14)", border: "1px solid rgba(148,163,184,0.30)" };
  };

  const badge = (text) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 12px",
    borderRadius: 999,
    border: `1px solid ${THEME.border}`,
    background: "rgba(2,6,23,0.03)",
    color: THEME.muted,
    fontWeight: 900,
    fontSize: 14,
  });

  const fieldWrap = {
    display: "grid",
    gap: 10,
  };

  const labelStyle = {
    fontSize: 15,
    fontWeight: 900,
    color: "#334155",
    whiteSpace: "pre-wrap",
  };

  const box = (bg) => ({
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${THEME.border}`,
    background: bg || "#fff",
  });

  const panel = (tone) => {
    const tones = {
      blue: "rgba(59,130,246,0.06)",
      green: "rgba(34,197,94,0.06)",
      purple: "rgba(168,85,247,0.06)",
      orange: "rgba(249,115,22,0.06)",
      gray: "rgba(2,6,23,0.02)",
    };
    return {
      ...box(tones[tone] || tones.gray),
    };
  };

  const renderField = (it) => {
    if (it.kind === "readonly") {
      return (
        <div style={{ padding: 12, borderRadius: 14, border: `1px dashed ${THEME.border}`, background: THEME.soft }}>
          <div style={{ whiteSpace: "pre-wrap", fontWeight: 900, color: THEME.text, lineHeight: 1.7, fontSize: 14 }}>
            {tr(lang, it.label)}
          </div>
        </div>
      );
    }

    if (it.kind === "attachment") {
      const list = Array.isArray(fieldAttachments?.[it.key]) ? fieldAttachments[it.key] : [];
      const inputId = `att_${it.key}`;
      return (
        <div style={{ ...box("rgba(255,255,255,0.85)"), padding: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <span style={badge(t.attachHint)}>{t.attachHint}</span>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label htmlFor={inputId} style={{ ...btn, margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
                📎 {t.addFiles}
              </label>
              <input
                id={inputId}
                type="file"
                multiple
                onChange={(e) => pickFilesForField(it.key, e.target.files)}
                disabled={saving || done}
                style={{ display: "none" }}
              />

              <button type="button" style={btnSoft} onClick={() => clearFieldAttachments(it.key)} disabled={saving || done || !list.length}>
                {t.clear}
              </button>
            </div>
          </div>

          {list.length ? (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {list.map((f, i) => (
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
                      maxWidth: "78%",
                      fontSize: 14,
                    }}
                  >
                    📄 {f.name || `File ${i + 1}`}
                  </a>
                  <button
                    type="button"
                    style={{ ...btn, borderColor: "rgba(239,68,68,0.35)", color: "#991b1b" }}
                    onClick={() => removeFieldAttachment(it.key, i)}
                    disabled={saving || done}
                  >
                    {t.remove}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 8, color: THEME.muted, fontWeight: 900, fontSize: 12 }}>{isRTL ? "لا توجد ملفات مرفوعة." : "No files uploaded."}</div>
          )}
        </div>
      );
    }

    if (it.kind === "date") {
      return <input type="date" value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={input} />;
    }
    if (it.kind === "textarea") {
      return <textarea value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={{ ...textarea, minHeight: 150 }} />;
    }
    if (it.kind === "textarea_short") {
      return <textarea value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={textarea} />;
    }
    return <input value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={input} />;
  };

  if (loading) {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "3px solid rgba(14,165,233,0.25)",
                borderTopColor: "rgba(14,165,233,1)",
                animation: "qcs-spin 0.8s linear infinite",
              }}
            />
            <div style={{ fontWeight: 900, fontSize: 15 }}>{t.loading}</div>
          </div>
          <style>{`@keyframes qcs-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ✅ Load error → show Retry button (not stuck)
  if (!loading && loadError && !info) {
    return (
      <div style={page}>
        <div style={card}>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#991b1b", marginBottom: 8 }}>
            {isRTL ? "⚠ تعذّر تحميل النموذج" : "⚠ Failed to load the form"}
          </div>
          <div style={{ color: THEME.muted, fontSize: 13, fontWeight: 800, lineHeight: 1.6, marginBottom: 12 }}>
            {loadError}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={load}
              style={{
                ...btn,
                background: "linear-gradient(135deg, rgba(14,165,233,0.18), rgba(34,197,94,0.16))",
                border: "1px solid rgba(34,197,94,0.28)",
                padding: "12px 18px",
              }}
            >
              {isRTL ? "🔄 إعادة المحاولة" : "🔄 Retry"}
            </button>
            <span style={pill}>
              {t.lang}:
              <button
                onClick={() => setLang("en")}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, opacity: lang === "en" ? 1 : 0.55 }}
              >
                EN
              </button>
              <span style={{ opacity: 0.35 }}>•</span>
              <button
                onClick={() => setLang("ar")}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, opacity: lang === "ar" ? 1 : 0.55 }}
              >
                AR
              </button>
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={page}>
        <div style={card}>
          <div style={topbar}>
            <div style={{ fontWeight: 900, fontSize: 28 }}>{t.thankTitle}</div>

            <span style={pill}>
              {t.lang}:
              <button
                onClick={() => setLang("en")}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, opacity: lang === "en" ? 1 : 0.55 }}
              >
                EN
              </button>
              <span style={{ opacity: 0.35 }}>•</span>
              <button
                onClick={() => setLang("ar")}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, opacity: lang === "ar" ? 1 : 0.55 }}
              >
                AR
              </button>
            </span>
          </div>

          <div style={{ marginTop: 12, color: THEME.muted, fontWeight: 900, fontSize: 17 }}>{t.thankSub}</div>
          <div style={{ marginTop: 6, color: THEME.muted, fontWeight: 900, fontSize: 15 }}>{t.closeNote}</div>

          <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: `1px solid ${THEME.border}`, background: "#fff" }}>
            <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 900 }}>
              {t.token}: <b style={{ color: THEME.text }}>{token}</b>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: THEME.muted, fontWeight: 900 }}>
              {t.link}: <span style={{ wordBreak: "break-word" }}>{shareUrl}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const toneByTitle = (title) => {
    const s = String(title || "").toLowerCase();
    if (s.includes("company") || s.includes("details")) return "blue";
    if (s.includes("cert") || s.includes("hygiene")) return "green";
    if (s.includes("food safety") || s.includes("quality")) return "purple";
    if (s.includes("transport") || s.includes("production")) return "orange";
    return "gray";
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={topbar}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 26, color: THEME.text }}>{t.title}</div>
            <div style={{ marginTop: 6, color: THEME.muted, fontSize: 14, fontWeight: 900 }}>
              {t.token}: <b>{token}</b> • {t.link}: <span style={{ wordBreak: "break-word" }}>{shareUrl}</span>
            </div>
          </div>

          <span style={pill}>
            {t.lang}:
            <button
              onClick={() => setLang("en")}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, opacity: lang === "en" ? 1 : 0.55 }}
            >
              EN
            </button>
            <span style={{ opacity: 0.35 }}>•</span>
            <button
              onClick={() => setLang("ar")}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, opacity: lang === "ar" ? 1 : 0.55 }}
            >
              AR
            </button>
          </span>
        </div>

        {msg ? (
          <div style={{ marginTop: 12, fontWeight: 900, color: msg.startsWith("✅") ? "#065f46" : "#991b1b" }}>{msg}</div>
        ) : null}

        {/* ===== Validation errors banner ===== */}
        {validationErrors.length > 0 ? (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(239,68,68,0.35)",
              background: "rgba(239,68,68,0.05)",
            }}
          >
            <div style={{ fontWeight: 900, color: "#991b1b", marginBottom: 6 }}>
              {isRTL ? "يرجى تصحيح الأخطاء التالية قبل الإرسال:" : "Please fix the following before submission:"}
            </div>
            <ul style={{ margin: 0, paddingInlineStart: 20, color: "#7f1d1d", fontWeight: 700, fontSize: 13, lineHeight: 1.7 }}>
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* ===== Document header — once only ===== */}
        <div style={{
          marginTop: 16,
          padding: "12px 16px",
          borderRadius: 14,
          border: `1px solid ${THEME.border}`,
          background: "rgba(248,250,252,1)",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 24px",
          alignItems: "center",
        }}>
          {[
            isRTL ? "مرجع الوثيقة: نموذج التقييم الذاتي للمورد" : "Document Reference: Supplier Self-Assessment Form",
            isRTL ? "الجهة المالكة: QA" : "Owned by: QA",
            isRTL ? "المعتمد من: المدير" : "Authorised By: Director",
          ].map((item, i) => (
            <span key={i} style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>
              {i > 0 && <span style={{ marginInlineEnd: 24, color: "#cbd5e1" }}>|</span>}
              {item}
            </span>
          ))}
        </div>

        {/* ===== Supplier Type (READ-ONLY — set by admin only) ===== */}
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(34,197,94,0.30)",
            background: "rgba(34,197,94,0.05)",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 17, color: THEME.text, marginBottom: 8 }}>
            {isRTL ? "نوع المورد" : "Supplier Type"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#14532d" }}>
            ✅ {SUPPLIER_TYPE_OPTIONS.find((o) => o.value === activeType)
              ? (isRTL
                  ? SUPPLIER_TYPE_OPTIONS.find((o) => o.value === activeType).labelAr
                  : SUPPLIER_TYPE_OPTIONS.find((o) => o.value === activeType).labelEn)
              : activeType}
            <span style={{ marginInlineStart: 8, fontSize: 13, color: "#64748b", fontWeight: 700 }}>
              ({isRTL ? "محدَّد من قِبل الجهة المُصدِرة — غير قابل للتعديل" : "set by issuer — not editable"})
            </span>
          </div>
        </div>

        <div style={section}>
          {visiblePages.map((p, pIdx) => (
            <div key={pIdx} style={{ marginTop: 16, ...box("#fff") }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900, color: THEME.text, fontSize: 17 }}>{tr(lang, p.pageTitle)}</div>
                <div style={badge("Page")}>{String(pIdx + 1)}/{visiblePages.length}</div>
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                {p.blocks.filter((b) => b.type !== "info").map((b, bIdx) => (
                  <div key={bIdx} style={panel(toneByTitle(b.title))}>
                    <div style={{ fontWeight: 900, color: THEME.text, fontSize: 17 }}>
                      {tr(lang, b.title)}
                      {b.required ? (
                        <span style={{ color: "#dc2626", marginInlineStart: 6, fontSize: 18 }}>*</span>
                      ) : null}
                    </div>

                    {b.type === "fields" ? (
                      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 12 }}>
                        {(b.items || [])
                          .filter((it) => it.kind !== "readonly" || String(it.label || "").trim() !== "-----------")
                          .map((it) => (
                            <div key={it.key} style={fieldWrap}>
                              <div style={labelStyle}>
                                {tr(lang, it.label)}
                                {it.required ? (
                                  <span style={{ color: "#dc2626", marginInlineStart: 6, fontSize: 16 }}>*</span>
                                ) : null}
                              </div>
                              {renderField(it)}
                            </div>
                          ))}
                      </div>
                    ) : null}

                    {b.type === "products_list" ? (
                      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, lineHeight: 1.5 }}>
                          {isRTL
                            ? "أضف كل منتج في سطر مستقل مع إرفاق ورقة مواصفاته."
                            : "Add each product on a separate row and attach its specification sheet."}
                        </div>

                        {productsList.map((prod, idx) => {
                          const inputId = `prod_file_${prod.id}`;
                          return (
                            <div
                              key={prod.id}
                              style={{
                                padding: 14,
                                borderRadius: 14,
                                border: `1px solid ${THEME.border}`,
                                background: "#fff",
                                display: "grid",
                                gap: 10,
                              }}
                            >
                              {/* Row header */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: THEME.muted }}>
                                  {isRTL ? `منتج ${idx + 1}` : `Product ${idx + 1}`}
                                </span>
                                {productsList.length > 1 && (
                                  <button
                                    type="button"
                                    style={{ ...btn, padding: "5px 10px", fontSize: 12, color: "#991b1b", borderColor: "rgba(239,68,68,0.3)" }}
                                    onClick={() => removeProduct(prod.id)}
                                    disabled={saving || done}
                                  >
                                    🗑 {isRTL ? "حذف" : "Remove"}
                                  </button>
                                )}
                              </div>

                              {/* Product name input */}
                              <input
                                value={prod.name}
                                onChange={(e) => updateProductName(prod.id, e.target.value)}
                                placeholder={isRTL ? "اسم المنتج..." : "Product name..."}
                                disabled={saving || done}
                                style={{ ...input, fontWeight: 800 }}
                              />

                              {/* Attachment for this product */}
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                <label
                                  htmlFor={inputId}
                                  style={{
                                    ...btn,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    cursor: saving || done ? "not-allowed" : "pointer",
                                    opacity: saving || done ? 0.55 : 1,
                                  }}
                                >
                                  📎 {isRTL ? "إرفاق مواصفات" : "Attach specs"}
                                </label>
                                <input
                                  id={inputId}
                                  type="file"
                                  multiple
                                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                                  onChange={(e) => uploadProductFiles(prod.id, e.target.files)}
                                  disabled={saving || done}
                                  style={{ display: "none" }}
                                />
                                {prod.files.length > 0 && (
                                  <span style={{ fontSize: 12, color: "#065f46", fontWeight: 700 }}>
                                    ✅ {prod.files.length} {isRTL ? "ملف مرفق" : "file(s)"}
                                  </span>
                                )}
                              </div>

                              {/* Uploaded files list */}
                              {prod.files.length > 0 && (
                                <div style={{ display: "grid", gap: 6 }}>
                                  {prod.files.map((f, fi) => (
                                    <div
                                      key={`${f.url}-${fi}`}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "8px 10px",
                                        borderRadius: 10,
                                        border: `1px solid ${THEME.border}`,
                                        background: "rgba(34,197,94,0.04)",
                                      }}
                                    >
                                      <a
                                        href={f.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 700,
                                          color: THEME.text,
                                          textDecoration: "none",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          maxWidth: "75%",
                                        }}
                                      >
                                        📄 {f.name || `File ${fi + 1}`}
                                      </a>
                                      <button
                                        type="button"
                                        style={{ ...btn, padding: "4px 8px", fontSize: 11, color: "#991b1b", borderColor: "rgba(239,68,68,0.3)" }}
                                        onClick={() => removeProductFile(prod.id, fi)}
                                        disabled={saving || done}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add product button */}
                        {!done && (
                          <button
                            type="button"
                            style={{
                              ...btn,
                              width: "100%",
                              justifyContent: "center",
                              borderStyle: "dashed",
                              background: "rgba(34,197,94,0.04)",
                              borderColor: "rgba(34,197,94,0.35)",
                              color: "#14532d",
                              fontWeight: 800,
                              fontSize: 14,
                              padding: "12px",
                            }}
                            onClick={addProduct}
                            disabled={saving}
                          >
                            + {isRTL ? "إضافة منتج" : "Add Product"}
                          </button>
                        )}
                      </div>
                    ) : null}

                    {b.type === "contact_info" ? (
                      <div
                        style={{
                          marginTop: 14,
                          padding: "18px 20px",
                          borderRadius: 14,
                          background: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(34,197,94,0.08))",
                          border: "1px solid rgba(14,165,233,0.30)",
                        }}
                      >
                        <div style={{ fontSize: 14, color: "#0c4a6e", fontWeight: 800, marginBottom: 12, lineHeight: 1.6 }}>
                          {isRTL
                            ? "في حال وجود أي ملاحظات أو استفسارات حول هذا النموذج، يرجى التواصل مع ضابط الجودة:"
                            : "For any notes, questions or clarification about this form, please contact the Quality Officer:"}
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                            gap: 12,
                          }}
                        >
                          {/* Email */}
                          <a
                            href={`mailto:${b.email}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "14px 16px",
                              borderRadius: 12,
                              border: "1px solid rgba(14,165,233,0.28)",
                              background: "rgba(255,255,255,0.94)",
                              textDecoration: "none",
                              color: THEME.text,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span style={{ fontSize: 24 }}>📧</span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, marginBottom: 2 }}>
                                {isRTL ? "البريد الإلكتروني" : "Email"}
                              </div>
                              <div
                                style={{
                                  fontSize: 15,
                                  fontWeight: 900,
                                  color: "#0c4a6e",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  direction: "ltr",
                                }}
                              >
                                {b.email}
                              </div>
                            </div>
                          </a>

                          {/* Phone (Call) */}
                          <a
                            href={`tel:${b.phone}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "14px 16px",
                              borderRadius: 12,
                              border: "1px solid rgba(34,197,94,0.28)",
                              background: "rgba(255,255,255,0.94)",
                              textDecoration: "none",
                              color: THEME.text,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span style={{ fontSize: 24 }}>📞</span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, marginBottom: 2 }}>
                                {isRTL ? "اتصال" : "Call"}
                              </div>
                              <div
                                style={{
                                  fontSize: 16,
                                  fontWeight: 900,
                                  color: "#14532d",
                                  direction: "ltr",
                                }}
                              >
                                {b.phone}
                              </div>
                            </div>
                          </a>

                          {/* WhatsApp */}
                          <a
                            href={`https://wa.me/${b.whatsapp}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "14px 16px",
                              borderRadius: 12,
                              border: "1px solid rgba(37,211,102,0.35)",
                              background: "rgba(37,211,102,0.06)",
                              textDecoration: "none",
                              color: THEME.text,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span style={{ fontSize: 24 }}>💬</span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, marginBottom: 2 }}>
                                {isRTL ? "واتساب" : "WhatsApp"}
                              </div>
                              <div
                                style={{
                                  fontSize: 16,
                                  fontWeight: 900,
                                  color: "#065f46",
                                  direction: "ltr",
                                }}
                              >
                                {b.phone}
                              </div>
                            </div>
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {b.type === "declaration" ? (
                      <div style={{ marginTop: 14 }}>
                        {/* Status banner when agreed */}
                        {declaration.agreed ? (
                          <div style={{
                            padding: "14px 16px",
                            borderRadius: 14,
                            background: "rgba(34,197,94,0.10)",
                            border: "1px solid rgba(34,197,94,0.35)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 10,
                          }}>
                            <div>
                              <div style={{ fontWeight: 800, color: "#14532d", fontSize: 14 }}>
                                ✅ {isRTL ? "تم الإقرار والموافقة" : "Declaration confirmed"}
                              </div>
                              <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}>
                                {declaration.name && <span>{isRTL ? "الاسم: " : "Name: "}<b>{declaration.name}</b> &nbsp;•&nbsp; </span>}
                                {declaration.position && <span>{isRTL ? "المنصب: " : "Position: "}<b>{declaration.position}</b> &nbsp;•&nbsp; </span>}
                                {declaration.agreedAt && <span>{isRTL ? "وقت الإقرار: " : "Agreed at: "}<b>{new Date(declaration.agreedAt).toLocaleString()}</b></span>}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button type="button" style={{ ...btn, fontSize: 12 }} onClick={printDeclaration}>
                                🖨 {isRTL ? "طباعة" : "Print"}
                              </button>
                              {!done && (
                                <button
                                  type="button"
                                  style={{ ...btn, fontSize: 12, color: "#7c3aed", borderColor: "rgba(124,58,237,0.3)" }}
                                  onClick={() => setShowDeclModal(true)}
                                >
                                  ✏️ {isRTL ? "تعديل" : "Edit"}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            padding: "16px",
                            borderRadius: 14,
                            border: "1px dashed rgba(239,68,68,0.35)",
                            background: "rgba(239,68,68,0.03)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                          }}>
                            <div style={{ fontSize: 13, color: "#7f1d1d", fontWeight: 700 }}>
                              ⚠️ {isRTL ? "لم يتم تأكيد الإقرار بعد" : "Declaration not confirmed yet"}
                            </div>
                            <button
                              type="button"
                              style={{
                                ...btn,
                                background: "linear-gradient(135deg,rgba(14,165,233,0.16),rgba(34,197,94,0.14))",
                                borderColor: "rgba(34,197,94,0.35)",
                                fontWeight: 800,
                                fontSize: 14,
                                padding: "12px 20px",
                              }}
                              onClick={() => setShowDeclModal(true)}
                              disabled={done}
                            >
                              📋 {isRTL ? "فتح الإقرار والموافقة" : "Open & Confirm Declaration"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {b.type === "yesno" ? (
                      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                        {(b.items || []).map((it) => {
                          const v = answers[it.key];
                          return (
                            <div
                              key={it.key}
                              style={{
                                paddingTop: 12,
                                borderTop: `1px dashed ${THEME.border}`,
                              }}
                            >
                              <div style={{ fontWeight: 900, color: THEME.text, whiteSpace: "pre-wrap", fontSize: 17, lineHeight: 1.55 }}>{tr(lang, it.q)}</div>

                              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                <button type="button" style={toggleBtn(v === true, "yes")} onClick={() => onToggle(it.key, true)}>
                                  {t.yes}
                                </button>
                                <button type="button" style={toggleBtn(v === false, "no")} onClick={() => onToggle(it.key, false)}>
                                  {t.no}
                                </button>
                                <button type="button" style={toggleBtn(v === null, "na")} onClick={() => onToggle(it.key, null)}>
                                  {t.na}
                                </button>

                                <div
                                  style={{
                                    marginLeft: isRTL ? 0 : 6,
                                    marginRight: isRTL ? 6 : 0,
                                    fontSize: 14,
                                    fontWeight: 900,
                                    color: THEME.muted,
                                  }}
                                >
                                  {t.selected}:{" "}
                                  <b style={{ color: v === true ? "#065f46" : v === false ? "#991b1b" : THEME.muted }}>
                                    {v === true ? (lang === "ar" ? "نعم" : "YES") : v === false ? (lang === "ar" ? "لا" : "NO") : lang === "ar" ? "غير متاح" : "N/A"}
                                  </b>
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

        {/* Global Attachments (kept) */}
        <div style={section}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 900, color: THEME.text, marginBottom: 2 }}>{t.attach}</div>
            <span style={badge("General")}>{isRTL ? "مرفقات عامة" : "General files"}</span>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label htmlFor="global_files" style={{ ...btn, margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
              📎 {t.addFiles}
            </label>
            <input id="global_files" type="file" multiple onChange={(e) => pickFilesGlobal(e.target.files)} disabled={saving || done} style={{ display: "none" }} />
            <span style={{ color: THEME.muted, fontWeight: 900, fontSize: 12 }}>{saving ? t.saving : ""}</span>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
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
                    maxWidth: "78%",
                    fontSize: 14,
                  }}
                >
                  📎 {f.name || `File ${i + 1}`}
                </a>
                <button
                  type="button"
                  style={{ ...btn, borderColor: "rgba(239,68,68,0.35)", color: "#991b1b" }}
                  onClick={() => removeGlobalAttachment(i)}
                  disabled={saving || done}
                >
                  {t.remove}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: THEME.muted, fontWeight: 900, fontSize: 12 }}>
            {info?.created_at ? `${isRTL ? "تم الإنشاء:" : "Created:"} ${String(info.created_at)}` : ""}
          </div>

          <button
            style={{
              ...btnPrimary(saving),
              opacity: saving ? 0.55 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
            onClick={submit}
            disabled={saving || done}
          >
            {saving ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "2px solid rgba(15,23,42,0.25)",
                    borderTopColor: "rgba(15,23,42,0.75)",
                    display: "inline-block",
                    animation: "qcs-spin-btn 0.8s linear infinite",
                  }}
                />
                {t.submitting}
              </>
            ) : (
              t.submit
            )}
          </button>
          <style>{`@keyframes qcs-spin-btn { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>

      {/* ===== Declaration Modal ===== */}
      {showDeclModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0,
            background: "rgba(2,6,23,0.65)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "24px 16px", overflowY: "auto", zIndex: 11000,
            direction: isRTL ? "rtl" : "ltr",
          }}
          onClick={() => setShowDeclModal(false)}
        >
          <div
            style={{
              width: "min(680px, 100%)", marginTop: 12,
              background: "#fff",
              border: "1px solid rgba(15,23,42,0.18)",
              borderRadius: 20,
              boxShadow: "0 28px 80px rgba(2,6,23,0.32)",
              padding: "24px 22px",
              display: "grid", gap: 18,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>
                📋 {isRTL ? "الإقرار الرسمي" : "Official Declaration"}
              </div>
              <button
                type="button"
                style={{ ...btn, padding: "6px 12px", fontSize: 13 }}
                onClick={() => setShowDeclModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Declaration text box */}
            <div style={{
              padding: "16px 18px",
              borderRadius: 14,
              border: "2px solid rgba(15,23,42,0.18)",
              background: "rgba(248,250,252,1)",
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.9,
              color: "#0f172a",
              whiteSpace: "pre-wrap",
            }}>
              {declText}
            </div>

            {/* Name + Position fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>
                  {isRTL ? "الاسم *" : "Name *"}
                </label>
                <input
                  className="sa-input"
                  value={declaration.name}
                  onChange={(e) => setDeclaration((p) => ({ ...p, name: e.target.value }))}
                  placeholder={isRTL ? "الاسم الكامل..." : "Full name..."}
                />
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>
                  {isRTL ? "المنصب *" : "Position Held *"}
                </label>
                <input
                  className="sa-input"
                  value={declaration.position}
                  onChange={(e) => setDeclaration((p) => ({ ...p, position: e.target.value }))}
                  placeholder={isRTL ? "المنصب الوظيفي..." : "Job position..."}
                />
              </div>
            </div>

            {/* Agree checkbox */}
            <label style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "14px 16px",
              borderRadius: 12,
              border: `2px solid ${declaration.agreed ? "rgba(34,197,94,0.45)" : "rgba(15,23,42,0.16)"}`,
              background: declaration.agreed ? "rgba(34,197,94,0.07)" : "#fff",
              cursor: "pointer",
              transition: "all 0.15s",
            }}>
              <input
                type="checkbox"
                checked={declaration.agreed}
                onChange={(e) => setDeclaration((p) => ({
                  ...p,
                  agreed: e.target.checked,
                  agreedAt: e.target.checked ? new Date().toISOString() : null,
                }))}
                style={{ marginTop: 2, width: 18, height: 18, cursor: "pointer", accentColor: "#16a34a" }}
              />
              <span style={{ fontSize: 13, fontWeight: 800, color: declaration.agreed ? "#14532d" : "#0f172a", lineHeight: 1.6 }}>
                {isRTL
                  ? "أقرّ بأن المعلومات الواردة أعلاه صحيحة ودقيقة، وأوافق على شروط هذا الإقرار."
                  : "I confirm that the information provided above is true and accurate, and I agree to the terms of this declaration."}
              </span>
            </label>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                style={{ ...btn, fontSize: 13 }}
                onClick={printDeclaration}
              >
                🖨 {isRTL ? "طباعة الإقرار" : "Print Declaration"}
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  style={{ ...btn, fontSize: 13 }}
                  onClick={() => setShowDeclModal(false)}
                >
                  {isRTL ? "إغلاق" : "Close"}
                </button>
                <button
                  type="button"
                  style={{
                    ...btn,
                    fontSize: 14,
                    fontWeight: 900,
                    padding: "12px 22px",
                    background: declaration.agreed && declaration.name.trim()
                      ? "linear-gradient(135deg,#16a34a,#15803d)"
                      : "#e2e8f0",
                    color: declaration.agreed && declaration.name.trim() ? "#fff" : "#94a3b8",
                    border: "none",
                    cursor: declaration.agreed && declaration.name.trim() ? "pointer" : "not-allowed",
                    borderRadius: 12,
                  }}
                  disabled={!declaration.agreed || !declaration.name.trim()}
                  onClick={() => setShowDeclModal(false)}
                >
                  ✅ {isRTL ? "تأكيد الإقرار" : "Confirm Declaration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 980px){
          div[style*="gridTemplateColumns: repeat(auto-fit, minmax(360px, 1fr))"]{
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 560px) {
          [data-decl-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
