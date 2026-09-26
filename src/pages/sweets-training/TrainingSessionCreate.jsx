// src/pages/training/TrainingSessionCreate.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "./nav";
import { FiArrowLeft, FiBookOpen, FiSave } from "react-icons/fi";
import { CompanyMark, companyName } from "./brand";
import { SWEETS_MODULES } from "./content";
import { SWEETS_AREAS } from "../monitor/branches/sweets/sweetsAreas";
import TrainingReferenceModal, { MODULE_DETAILS_BI } from './TrainingReferenceModal';
import { QUIZ_BANK } from './TrainingSessionsList.helpers';

/* ===================== API base ===================== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE = "sweets_training_session";

/* ===================== Helpers ===================== */
function pad2(n) { return String(n ?? "").padStart(2, "0"); }
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return text || null; }
}
async function listReportsByType(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}`, {
    method: "GET", headers: { Accept: "application/json" },
  });
  if (!res.ok) { const d = await safeJson(res); throw new Error(d?.message || d?.error || `Failed (${res.status})`); }
  const data = await safeJson(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
async function createReport(body) {
  const res = await fetch(REPORTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const d = await safeJson(res); throw new Error(d?.message || d?.error || `Failed (${res.status})`); }
  return await safeJson(res);
}

/* ===================== الخارق 1 Design Tokens ===================== */
const C = {
  navy:      "#0f172a",
  navyLight: "#6366f1",
  accent:    "#4f46e5",
  accentBg:  "#eef2ff",
  teal:      "#0d9488",
  tealBg:    "#f0fdfa",
  purple:    "#7c3aed",
  purpleBg:  "#f5f3ff",
  red:       "#dc2626",
  green:     "#16a34a",
  gray50:    "#f6f7fb",
  gray100:   "#f1f2f6",
  gray200:   "#e5e7eb",
  gray400:   "#9ca3af",
  gray700:   "#334155",
  white:     "#ffffff",
  border:    "#eceef3",
};

const pageShell = {
  minHeight: "100vh",
  width: "100%",
  background: "linear-gradient(180deg,#f4f8f7 0%,#edf5f3 100%)",
  padding: "14px clamp(12px,2.4vw,28px) 22px",
  boxSizing: "border-box",
  fontFamily: "Cairo, Arial, sans-serif",
  color: "#0f172a",
  direction: "ltr",
};

const glassPanel = {
  background: "#fff",
  border: "1px solid #dbe4e2",
  borderRadius: 6,
  boxShadow: "0 12px 30px rgba(15,23,42,.06)",
};

const actionBtn = (bg, disabled = false) => ({
  background: disabled ? C.gray200 : bg,
  color: disabled ? C.gray400 : C.white,
  border: "none", borderRadius: 5, padding: "9px 12px",
  fontWeight: 900, fontSize: 13, letterSpacing: 0,
  cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
  boxShadow: disabled ? "none" : "0 10px 20px rgba(15,23,42,.14)",
  transition: "transform .12s ease, filter .12s ease",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
});

const inputSt = {
  width: "100%", boxSizing: "border-box",
  border: `1px solid #dbe4e2`, borderRadius: 6,
  padding: "10px 14px", fontSize: 14, color: C.gray700,
  background: C.white, outline: "none",
  fontFamily: "inherit",
  boxShadow: "0 1px 2px rgba(16,24,40,.03)",
  transition: "border-color .12s ease, box-shadow .12s ease",
};

const textareaSt = {
  ...inputSt,
  resize: "vertical", lineHeight: 1.6,
  minHeight: 200,
};

/* ===================== Defaults ===================== */
const DEFAULT_DOC = {
  documentTitle: "Training Record",
  documentNumber: "FS-QM/REC/TR/1",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "QA",
  approvedBy: "Hussam O.Sarhan",
};

const DEFAULT_OBJECTIVES = `Training objectives: Ensure staff knowledge and compliance with food safety & hygiene requirements.
Training frequency: Induction (new joiners) + Bi-monthly refresher (every 2 months) + As needed (NCs, complaints/incidents, audit findings, or any change in procedures/requirements).
Evaluation: Quiz/Observation/Verbal Q&A • Passing: ≥80% or Satisfactory.
Training records must be reviewed & approved by QA / Food Safety Team Leader.`;

/* ===================== Modules & Branches ===================== */
/* This company's modules — see ./content/modules.js. */
export const MODULES = SWEETS_MODULES;

/* The confectionery factory's own areas (not the other company's branches). */
const BRANCHES = SWEETS_AREAS.map((a) => a.labelEn);

/* ===================== Levels (difficulty) ===================== */
// Reuses the per-question "difficulty" field managed in Training Admin
// (labelled "المستوى" there). "" = all levels.
export const LEVELS = [
  { value: "",       en: "All Levels",   ar: "كل المستويات" },
  { value: "Easy",   en: "Easy",         ar: "سهل / مبتدئ" },
  { value: "Medium", en: "Medium",       ar: "متوسط" },
  { value: "Hard",   en: "Hard",         ar: "صعب / متقدم" },
];

/* ===================== Training Details Templates ===================== */
function getDetailsTemplate(moduleName) {
  return MODULE_DETAILS_BI[moduleName] || MODULE_DETAILS_BI.__DEFAULT__;
}

function normalizeReports(data) {
  if (Array.isArray(data)) return data;
  const candidates = [data?.items, data?.reports, data?.data, data?.result, data?.rows];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

function uniqueStrings(list) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const value = String(item || "").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function questionsToBilingualPack(questions) {
  const arr = Array.isArray(questions) ? questions : [];
  return {
    en: arr.map((q) => ({
      q: q?.q_en || q?.q || "",
      options: Array.isArray(q?.options_en) ? q.options_en : (Array.isArray(q?.options) ? q.options : []),
      correct: Number.isFinite(Number(q?.correct)) ? Number(q.correct) : 0,
      difficulty: q?.difficulty || "",
    })),
    ar: arr.map((q) => ({
      q: q?.q_ar || q?.q || "",
      options: Array.isArray(q?.options_ar) ? q.options_ar : (Array.isArray(q?.options) ? q.options : []),
      correct: Number.isFinite(Number(q?.correct)) ? Number(q.correct) : 0,
      difficulty: q?.difficulty || "",
    })),
  };
}

async function loadAdminTrainingConfig() {
  const [configData, questionsData, refsData] = await Promise.all([
    listReportsByType("sweets_training_config").catch(() => []),
    listReportsByType("sweets_training_questions").catch(() => []),
    listReportsByType("sweets_training_reference").catch(() => []),
  ]);

  const config = normalizeReports(configData)[0]?.payload || {};
  const modules = uniqueStrings([...(config.modules || []), ...MODULES]);

  const questionBank = {};
  // Rows arrive newest-first; keep the NEWEST record per module so that any
  // duplicate rows don't shadow freshly added questions.
  normalizeReports(questionsData).forEach((rec) => {
    const mod = String(rec?.payload?.module || "").trim();
    const qs = rec?.payload?.questions;
    if (mod && Array.isArray(qs) && qs.length && !questionBank[mod]) {
      questionBank[mod] = questionsToBilingualPack(qs);
    }
  });

  const detailsByModule = {};
  normalizeReports(refsData).forEach((rec) => {
    const payload = rec?.payload || {};
    const mod = String(payload.module || "").trim();
    const content = String(payload.content || "").trim();
    if (mod && content && !detailsByModule[mod]) detailsByModule[mod] = content;
  });

  return { modules: modules.length ? modules : MODULES, questionBank, detailsByModule };
}

/* ===================== Question Bank ===================== */
/* No separate session-sheet pack: packFromQuizBank() builds it from the
   trainee quiz bank (./content), so both always show the same questions. */
export const QUESTION_BANK = {};

// Convert a QUIZ_BANK module (flat, bilingual, difficulty-tagged) into the
// { en, ar } shape this page uses. QUIZ_BANK covers every module, QUESTION_BANK
// does not — without this fallback those modules saved a placeholder bank.
function packFromQuizBank(moduleName) {
  const arr = QUIZ_BANK?.[moduleName];
  if (!Array.isArray(arr) || !arr.length) return null;
  const toSide = (qKey, oKey) => arr.map((q) => ({
    q: q[qKey] || "",
    options: Array.isArray(q[oKey]) ? q[oKey] : [],
    correct: typeof q.correct === "number" ? q.correct : 0,
  }));
  return { en: toSide("q_en", "options_en"), ar: toSide("q_ar", "options_ar") };
}

function pickQuestionsForModule(moduleName, liveBank = {}) {
  const pack = liveBank[moduleName] || QUESTION_BANK[moduleName];
  if (pack?.en?.length) return pack;
  const fromQuiz = packFromQuizBank(moduleName);
  if (fromQuiz) return fromQuiz;
  return {
    en: [{ q: "This training module requires QA-defined questions.", options: ["OK"], correct: 0 }],
    ar: [{ q: "هذا القسم يحتاج أسئلة من QA.", options: ["موافق"], correct: 0 }],
  };
}



/* ===================== Sub-components (defined OUTSIDE to preserve focus) ===================== */
const InfoCard = ({ label, value, children }) => (
  <div style={{ background:"#fff", border:"1px solid #dbe4e2", borderRadius:6, padding:"12px 14px", boxShadow:"0 12px 30px rgba(15,23,42,.06)" }}>
    <div style={{ fontSize:10, color:"#0f766e", fontWeight:1000, letterSpacing:.5, textTransform:"uppercase", marginBottom:5 }}>{label}</div>
    {children || <div style={{ fontSize:13, fontWeight:700, color:"#1e3a5f" }}>{value || "—"}</div>}
  </div>
);

const Section = ({ children, style = {} }) => (
  <div style={{ background:"#ffffff", border:"1px solid #dbe4e2", borderRadius:6, padding:18, boxShadow:"0 12px 30px rgba(15,23,42,.06)", ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontWeight:1000, fontSize:15, color:"#0f172a", marginBottom:12, letterSpacing:.2 }}>{children}</div>
);

const FieldLabel = ({ children }) => (
  <div style={{ fontSize:12, fontWeight:900, color:"#334155", marginBottom:5, letterSpacing:.3, textTransform:"uppercase" }}>{children}</div>
);

/* ===================== Component ===================== */
export default function TrainingSessionCreate() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [availableModules, setAvailableModules] = useState(MODULES);
  const [liveQuestionBank, setLiveQuestionBank] = useState({});
  const [liveDetailsByModule, setLiveDetailsByModule] = useState({});

  const DEFAULT_MODULE = SWEETS_MODULES[0];

  const [date, setDate]                       = useState(todayISO());
  const [branch, setBranch]                   = useState(BRANCHES[0]);
  const [moduleName, setModuleName]           = useState(DEFAULT_MODULE);
  const [customModule, setCustomModule]       = useState("");
  const [useCustomModule, setUseCustomModule] = useState(false);
  const [details, setDetails]                 = useState(getDetailsTemplate(DEFAULT_MODULE));
  const [detailsTouched, setDetailsTouched]   = useState(false);
  const [objectives, setObjectives]           = useState(DEFAULT_OBJECTIVES);
  const [conductedBy, setConductedBy]         = useState("");
  const [verifiedBy, setVerifiedBy]           = useState("");
  const [level, setLevel]                     = useState(""); // all levels unless a difficulty is selected

  useEffect(() => {
    let alive = true;
    setLoadingConfig(true);
    loadAdminTrainingConfig()
      .then(({ modules, questionBank, detailsByModule }) => {
        if (!alive) return;
        setAvailableModules(modules);
        setLiveQuestionBank(questionBank);
        setLiveDetailsByModule(detailsByModule);

        if (!modules.some((m) => m === moduleName)) {
          const next = modules[0] || DEFAULT_MODULE;
          setModuleName(next);
          if (!detailsTouched) setDetails(detailsByModule[next] || getDetailsTemplate(next));
        } else if (!detailsTouched && detailsByModule[moduleName]) {
          setDetails(detailsByModule[moduleName]);
        }
      })
      .catch((e) => console.warn("Failed to load training admin config", e))
      .finally(() => {
        if (alive) setLoadingConfig(false);
      });
    return () => { alive = false; };
    // Load once; do not overwrite user edits after the initial sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveModule = useCustomModule && customModule.trim()
    ? customModule.trim()
    : moduleName;

  const uniqueKey = useMemo(
    () => `${branch}__${date}__${effectiveModule}`.toLowerCase(),
    [branch, date, effectiveModule]
  );
  const title = useMemo(
    () => `Training Record • ${effectiveModule} • ${branch} • ${date}`,
    [effectiveModule, branch, date]
  );
  const questionsPack = useMemo(
    () => pickQuestionsForModule(effectiveModule, liveQuestionBank),
    [effectiveModule, liveQuestionBank]
  );

  const validate = () => {
    if (!date)            return "Please select a Date.";
    if (!branch)          return "Please select a Branch.";
    if (!effectiveModule) return "Please select or enter a Training Module.";
    if (!details || String(details).trim().length < 10)    return "Training details are required.";
    if (!objectives || String(objectives).trim().length < 10) return "Training objectives are required.";
    return "";
  };

  const onSave = async () => {
    const err = validate();
    if (err) return alert(err);
    setSaving(true);
    try {
      const existing = await listReportsByType(TYPE);
      const found = Array.isArray(existing)
        ? existing.find((r) => (r?.payload?.uniqueKey || "").toLowerCase() === uniqueKey)
        : null;
      if (found) {
        alert("Duplicate session found for the same Branch + Date + Module ✅\nPlease change date/branch/module.");
        setSaving(false);
        return;
      }
      const payload = {
        ...DEFAULT_DOC,
        date, branch,
        moduleName: effectiveModule,
        level, // ✅ NEW: target level/difficulty for this session's quiz
        title, uniqueKey, details, objectives,
        conductedBy, verifiedBy,
        participants: [],
        approvals: { qaVerifiedAt: null, approvedAt: null },
        questionsBank: questionsPack,
      };
      await createReport({ type: TYPE, title, branch, payload });
      alert("Saved successfully ✅");
      nav("/training");
    } catch (e) {
      console.error(e);
      alert(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={pageShell}>

      {/* ── Top bar ── */}
      <div style={{ maxWidth:1180, margin:"0 auto", padding:"18px clamp(16px,2vw,26px)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:18, flexWrap:"wrap", borderRadius:6, background:"linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%)", color:"#fff", boxShadow:"0 22px 50px rgba(15,23,42,.16)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, minWidth:0 }}>
          <CompanyMark size={58} />
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, lineHeight:1.3, fontWeight:900, opacity:.85, marginBottom:4 }}>{(companyName() || "Training").toUpperCase()}</div>
            <h1 style={{ margin:0, color:"#fff", fontWeight:1000, fontSize:16, lineHeight:1.35 }}>Create Training Session</h1>
            <div style={{ color:"rgba(255,255,255,.88)", fontSize:14, marginTop:4, fontWeight:700, lineHeight:1.45 }}>
              {loadingConfig ? "Loading Training Admin modules..." : "Training modules, question banks, references, and session records"}
            </div>
          </div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap", alignItems:"stretch", justifyContent:"flex-end" }}>
          <button onClick={() => nav("/training")} style={{ ...actionBtn("rgba(255,255,255,.12)"), border:"1px solid rgba(255,255,255,.26)", boxShadow:"none" }}><FiArrowLeft size={15} /> Back</button>
          <button onClick={() => setShowReference(true)} style={{ ...actionBtn("rgba(255,255,255,.12)"), border:"1px solid rgba(255,255,255,.26)", boxShadow:"none" }}><FiBookOpen size={15} /> Reference</button>
          <button onClick={onSave} disabled={saving} style={actionBtn(saving ? C.gray400 : "#10b981", saving)}>
            <><FiSave size={15} /> {saving ? "Saving..." : "Save Session"}</>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ ...glassPanel, maxWidth:1180, margin:"14px auto 0", padding:18, display:"grid", gap:16 }}>

        {/* ── KPI cards ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10 }}>
          <InfoCard label="📋 Session Title"       value={title} />
          <InfoCard label="🔑 Unique Key"          value={uniqueKey} />
          <InfoCard label="❓ Questions EN"        value={`${questionsPack?.en?.length || 0} questions`} />
          <InfoCard label="❓ Questions AR"        value={`${questionsPack?.ar?.length || 0} questions`} />
        </div>

        {/* ── Meta fields ── */}
        <Section>
          <SectionTitle>Session Details</SectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:14 }}>

            {/* Date */}
            <div>
              <FieldLabel>📅 Date</FieldLabel>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputSt} />
            </div>

            {/* Branch */}
            <div>
              <FieldLabel>🏢 Branch</FieldLabel>
              <select value={branch} onChange={e=>setBranch(e.target.value)} style={inputSt}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Module */}
            <div>
              <FieldLabel>📚 Module</FieldLabel>
              {!useCustomModule ? (
                <select
                  value={moduleName}
                  onChange={e => {
                    const next = e.target.value;
                    setModuleName(next);
                    if (!detailsTouched) setDetails(liveDetailsByModule[next] || getDetailsTemplate(next));
                  }}
                  style={inputSt}
                >
                  {availableModules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input
                  value={customModule}
                  onChange={e => {
                    setCustomModule(e.target.value);
                    if (!detailsTouched) setDetails(getDetailsTemplate("__DEFAULT__"));
                  }}
                  placeholder="اكتب اسم التدريب الجديد…"
                  style={{ ...inputSt, borderColor:C.purple, outline:`2px solid ${C.purpleBg}` }}
                />
              )}
              <button
                onClick={() => {
                  setUseCustomModule(p => !p);
                  setCustomModule("");
                  if (!detailsTouched) setDetails(liveDetailsByModule[moduleName] || getDetailsTemplate(moduleName));
                }}
                style={{
                  marginTop:8, padding:"7px 12px", borderRadius:8,
                  border:`1px dashed ${C.purple}`,
                  background: useCustomModule ? C.purpleBg : "#faf5ff",
                  color:C.purple, fontWeight:700, fontSize:12,
                  cursor:"pointer", width:"100%", textAlign:"left",
                }}
              >
                {useCustomModule ? "← الرجوع للقائمة الأصلية" : "+ إضافة تدريب مخصص جديد"}
              </button>
            </div>

            {/* Level / Difficulty */}
            <div>
              <FieldLabel>📊 Level / المستوى</FieldLabel>
              <select value={level} onChange={e => setLevel(e.target.value)} style={inputSt}>
                {LEVELS.map(l => (
                  <option key={l.value || "all"} value={l.value}>{l.en} — {l.ar}</option>
                ))}
              </select>
              <div style={{ marginTop:6, fontSize:11, color:C.gray400 }}>
                {level
                  ? "سيظهر للمتدرّب 5 أسئلة من هذا المستوى."
                  : "كل المستويات — تظهر كل أسئلة الوحدة."}
              </div>
            </div>

            {/* Conducted By */}
            <div>
              <FieldLabel>👤 Conducted By</FieldLabel>
              <input value={conductedBy} onChange={e=>setConductedBy(e.target.value)} placeholder="Trainer name" style={inputSt} />
            </div>

            {/* Verified By */}
            <div>
              <FieldLabel>✅ Verified By</FieldLabel>
              <input value={verifiedBy} onChange={e=>setVerifiedBy(e.target.value)} placeholder="QA / Food Safety Team Leader" style={inputSt} />
            </div>
          </div>

          {/* Unique key pill */}
          <div style={{ marginTop:14, padding:"10px 14px", background:C.accentBg, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12 }}>
            <span style={{ color:C.accent, fontWeight:700 }}>Duplicate Key: </span>
            <span style={{ fontFamily:"ui-monospace,monospace", color:C.navy }}>{uniqueKey}</span>
          </div>
        </Section>

        {/* ── Training Details ── */}
        <Section>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
            <SectionTitle>📝 Detail of Training (A–L) — EN / AR</SectionTitle>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:11, color:C.gray400 }}>
                {useCustomModule ? "• custom module" : detailsTouched ? "• edited" : "• auto-filled"}
              </span>
              <button
                onClick={() => {
                  setDetails(useCustomModule ? getDetailsTemplate("__DEFAULT__") : (liveDetailsByModule[moduleName] || getDetailsTemplate(moduleName)));
                  setDetailsTouched(false);
                }}
                style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:C.gray50, color:C.navy, fontWeight:700, fontSize:12, cursor:"pointer" }}
              >
                ♻ Reset to Template
              </button>
            </div>
          </div>
          <textarea
            value={details}
            onChange={e => { setDetailsTouched(true); setDetails(e.target.value); }}
            style={{ ...textareaSt, minHeight:420 }}
          />
        </Section>

        {/* ── Objectives + Metadata ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))", gap:16 }}>

          <Section>
            <SectionTitle>🎯 Objectives / Frequency / Evaluation</SectionTitle>
            <textarea
              value={objectives}
              onChange={e => setObjectives(e.target.value)}
              style={{ ...textareaSt, minHeight:240 }}
            />
          </Section>

          <Section>
            <SectionTitle>📄 Document Metadata</SectionTitle>
            <div style={{ display:"grid", gap:10 }}>
              {[
                ["Document Number", DEFAULT_DOC.documentNumber],
                ["Issue Date",      DEFAULT_DOC.issueDate],
                ["Revision No.",    DEFAULT_DOC.revisionNo],
                ["Issued By",       DEFAULT_DOC.issuedBy],
                ["Approved By",     DEFAULT_DOC.approvedBy],
              ].map(([k, v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.gray100}`, fontSize:13 }}>
                  <span style={{ color:C.gray400, fontWeight:600 }}>{k}</span>
                  <span style={{ color:C.navy, fontWeight:700 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:14, padding:"10px 12px", background:C.tealBg, border:`1px solid #99f6e4`, borderRadius:8, fontSize:12, color:C.teal, fontWeight:600 }}>
              ✅ Questions (AR/EN) attached automatically per module. Quiz page will use them.
            </div>
          </Section>
        </div>

        {/* ── Footer ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, paddingTop:4 }}>
          <span style={{ fontSize:12, color:C.gray400 }}>Built by Eng. Mohammed Abdullah</span>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => nav("/training")} style={{ ...actionBtn(C.gray700), background:"transparent", color:C.gray700, border:`1px solid ${C.gray200}` }}>
              Cancel
            </button>
            <button onClick={() => setShowReference(true)} style={{ ...actionBtn("#0f766e"), boxShadow:"0 10px 20px rgba(15,118,110,.18)" }}><FiBookOpen size={15} /> Reference</button>
            <button onClick={onSave} disabled={saving} style={actionBtn(saving ? C.gray400 : "#10b981", saving)}>
              <><FiSave size={15} /> {saving ? "Saving..." : "Save Session"}</>
            </button>
          </div>
        </div>

      </div>

      <TrainingReferenceModal
        open={showReference}
        onClose={() => setShowReference(false)}
        moduleName={effectiveModule}
        branch={branch}
        date={date}
        details={details}
        objectives={objectives}
        conductedBy={conductedBy}
        quickCheckQuestions={(questionsPack?.en || []).slice(0, 5).map((q, i) => ({
          q_en: q.q, options_en: q.options, correct: q.correct,
          q_ar: questionsPack?.ar?.[i]?.q || "",
          options_ar: questionsPack?.ar?.[i]?.options || [],
        }))}
      />
    </div>
  );
}
