// src/pages/training/TrainingSessionsList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from 'qrcode.react';
import TrainingReferenceModal, { MODULE_DETAILS_BI } from './TrainingReferenceModal';

import {
  REPORTS_URL,
  TYPE,
  PASS_MARK,
  QUIZ_BANK,
  fetchJson,
  updateReportOnServer,
  deleteReportOnServer,
  normalizeToArray,
  getId,
  safeDate,
  safeBranch,
  safeModule,
  safeTitle,
  sortByNewest,
  makeBlankParticipant,
  renumberParticipants,
  todayISO,
  Badge,
  KPI,
  Modal,
  PUBLIC_ORIGIN, // ✅ NEW
  useGlobalLang, // ✅ unified language hook
  getModuleName, // ✅ AR/EN module name helper
} from "./TrainingSessionsList.helpers";

/* ===================== Small utils (no helpers edits needed) ===================== */
function makeToken(len = 22) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues)
    crypto.getRandomValues(bytes);
  else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/* ===================== ✅ NEW: ensure quiz exists in report payload ===================== */
function hasQuiz(payload) {
  const q = payload?.quiz || payload?.quizData || payload?.trainingQuiz || null;
  const qs = Array.isArray(q?.questions)
    ? q.questions
    : Array.isArray(payload?.questions)
    ? payload.questions
    : [];
  return Array.isArray(qs) && qs.length > 0;
}

// ✅ Normalize module name for case-insensitive / trimmed lookup
function normMod(s) { return String(s || "").trim().toLowerCase(); }

// ✅ Look up questions in any bank using exact match then case-insensitive fallback
function lookupBank(bank, moduleName) {
  if (!moduleName || !bank) return [];
  // 1. Exact match
  if (Array.isArray(bank[moduleName]) && bank[moduleName].length) return bank[moduleName];
  // 2. Case-insensitive match
  const key = normMod(moduleName);
  const found = Object.keys(bank).find((k) => normMod(k) === key);
  return (found && Array.isArray(bank[found]) && bank[found].length) ? bank[found] : [];
}

function buildQuizFromBank(moduleName, questions, passMark, level = "") {
  const safeQ = Array.isArray(questions) ? questions : [];
  return {
    module: String(moduleName || "").trim(),
    level: String(level || "").trim(), // ✅ NEW: level/difficulty this quiz targets
    passMark: Number(passMark) || 80,
    questions: safeQ.map((qq) => ({
      q_ar: qq?.q_ar || "",
      q_en: qq?.q_en || "",
      options_ar: Array.isArray(qq?.options_ar) ? qq.options_ar : [],
      options_en: Array.isArray(qq?.options_en) ? qq.options_en : [],
      correct: Number.isFinite(Number(qq?.correct)) ? Number(qq.correct) : 0,
    })),
  };
}

/* ✅ NEW: pick up to `count` questions for a given level (difficulty).
   - level "" → return all (no level chosen → backward compatible)
   - else → questions whose `difficulty` matches the level; if fewer than
     `count` exist it fills from the rest so the quiz still reaches `count`.
   Each level needs its own 5 tagged questions in Training Admin to be fully distinct. */
function pickLevelQuestions(all, level, count = 5) {
  const arr = Array.isArray(all) ? all : [];
  const lvl = String(level || "").trim().toLowerCase();
  if (!lvl) return arr;
  const chosen = arr
    .filter((q) => String(q?.difficulty || "").trim().toLowerCase() === lvl)
    .slice(0, count);
  if (chosen.length < count) {
    for (const q of arr) {
      if (chosen.length >= count) break;
      if (!chosen.includes(q)) chosen.push(q);
    }
  }
  return chosen;
}

/* ===================== ✅ NEW: dedupe participants (EmployeeId first, then name) ===================== */
function norm(s) {
  return String(s ?? "").trim();
}

function participantKey(p) {
  const eid = norm(p?.employeeId);
  if (eid) return `eid:${eid}`;
  const name = norm(p?.name).toLowerCase();
  if (name) return `name:${name}`;
  return `row:${Math.random().toString(36).slice(2)}`;
}

function cleanParticipant(p) {
  return {
    slNo: norm(p?.slNo),
    name: norm(p?.name),
    designation: norm(p?.designation),
    employeeId: norm(p?.employeeId),
    result: norm(p?.result),
    score: norm(p?.score),
    lastQuizAt: norm(p?.lastQuizAt),
    quizAttempt: p?.quizAttempt || null,
  };
}

function dedupeParticipants(list) {
  const arr = Array.isArray(list) ? list.map(cleanParticipant) : [];
  const map = new Map();

  const scoreNum = (v) => {
    const n = Number(String(v || "").replace("%", ""));
    return Number.isFinite(n) ? n : -1;
  };
  const rank = (p) => {
    let r = 0;
    if (p?.quizAttempt?.answers?.length) r += 50;
    if (norm(p?.result)) r += 10;
    if (scoreNum(p?.score) >= 0) r += 10;
    if (norm(p?.lastQuizAt)) r += 5;
    if (norm(p?.designation)) r += 2;
    return r;
  };

  for (const p of arr) {
    const k = participantKey(p);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, p);
      continue;
    }
    const prevR = rank(prev);
    const curR = rank(p);
    if (curR > prevR) map.set(k, { ...prev, ...p });
    else map.set(k, { ...p, ...prev });
  }

  return Array.from(map.values()).filter((p) => {
    const hasAny =
      p.name ||
      p.designation ||
      p.employeeId ||
      p.result ||
      p.score ||
      p.lastQuizAt ||
      (p.quizAttempt && p.quizAttempt.answers?.length);
    return hasAny;
  });
}

/* ===================== ✅ NEW: parse details text (A–L) into collapsible sections ===================== */
function parseTrainingDetails(rawText) {
  const t = String(rawText || "").replace(/\r/g, "").trim();
  if (!t) return [];

  const lines = t.split("\n").map((x) => x.trimEnd());
  const isHeader = (line) => /^[A-L]\)\s+/.test(line.trim());

  const sections = [];
  let cur = null;

  for (const line of lines) {
    if (!line) continue;
    if (isHeader(line)) {
      if (cur) sections.push(cur);
      const key = line.trim().slice(0, 1);
      cur = { key, header: line.trim(), body: [] };
    } else {
      if (!cur) {
        cur = { key: "•", header: "Training Details", body: [] };
      }
      cur.body.push(line);
    }
  }
  if (cur) sections.push(cur);

  if (sections.length === 1 && sections[0].key === "•") {
    sections[0].header = "DETAIL OF TRAINING";
  }

  return sections.map((s) => ({
    ...s,
    bodyText: s.body.join("\n").trim(),
  }));
}

/* ✅ Soft pastel tones for details blocks (light, eye-comfortable) */
const DETAIL_TONES = [
  { bd: "#bfdbfe", bg: "linear-gradient(180deg,#f4f9ff,#eaf3ff)", head: "#1e40af", body: "#fbfdff" }, // blue
  { bd: "#ddd6fe", bg: "linear-gradient(180deg,#f8f6ff,#f1eeff)", head: "#5b21b6", body: "#fcfbff" }, // violet
  { bd: "#fed7aa", bg: "linear-gradient(180deg,#fff8f1,#fff1e3)", head: "#9a3412", body: "#fffbf6" }, // orange
  { bd: "#bbf7d0", bg: "linear-gradient(180deg,#f2fcf6,#e9f9ef)", head: "#15803d", body: "#f7fdfa" }, // green
  { bd: "#fecdd3", bg: "linear-gradient(180deg,#fff5f6,#ffedef)", head: "#be123c", body: "#fffafb" }, // rose
  { bd: "#e2e8f0", bg: "linear-gradient(180deg,#f8fafc,#eef2f7)", head: "#334155", body: "#fbfcfe" }, // slate
];

/* ===================== ✅ per-session quick stats (for smart sort/filter) ===================== */
function rowStats(r) {
  const list = Array.isArray(r?.payload?.participants) ? r.payload.participants : [];
  const valid = list.filter((p) => String(p?.name || "").trim());
  const total = valid.length;
  const pass = valid.filter(
    (p) => String(p?.result || "").toUpperCase() === "PASS"
  ).length;
  const rate = total ? Math.round((pass / total) * 100) : 0;
  return { total, pass, rate };
}

/* ===================== Constants ===================== */
const TOTAL_MODULES = 16; // total required training modules per branch

/* ===================== Certificate Modal ===================== */
function CertificateModal({ open, onClose, participant, moduleName, branch, date, conductedBy, lang = "en" }) {
  if (!open || !participant) return null;

  const name     = String(participant.name        || '').trim();
  const empId    = String(participant.employeeId  || '').trim();
  const desig    = String(participant.designation || '').trim();
  const scoreNum = parseInt(String(participant.score || '0').replace('%',''), 10) || 0;
  const certNo   = `AM-FS-${(date||'').replace(/-/g,'')}-${String(participant.slNo||'01').padStart(3,'0')}`;

  // Expiry = training date + 1 year
  const expiryDate = (() => {
    if (!date) return '';
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  })();
  const daysLeft = expiryDate
    ? Math.ceil((new Date(expiryDate) - new Date()) / 86400000)
    : null;
  const expiryColor = daysLeft === null ? '#94a3b8'
    : daysLeft < 0 ? '#ef4444' : daysLeft < 30 ? '#f59e0b' : '#22c55e';

  // QR verify URL — works with both BrowserRouter (web) and HashRouter (Electron)
  const verifyUrl = (() => {
    const origin = window.location.origin;
    const isHash = window.location.hash.startsWith('#/');
    const base   = isHash ? `${origin}/#/training/verify` : `${origin}/training/verify`;
    const qs = [
      `cert=${encodeURIComponent(certNo)}`,
      `n=${encodeURIComponent(name)}`,
      `id=${encodeURIComponent(empId)}`,
      `mod=${encodeURIComponent(moduleName||'')}`,
      `date=${encodeURIComponent(date||'')}`,
      `score=${scoreNum}`,
      `by=${encodeURIComponent(conductedBy||'')}`,
      `branch=${encodeURIComponent(branch||'')}`,
      `exp=${encodeURIComponent(expiryDate)}`,
    ].join('&');
    return `${base}?${qs}`;
  })();

  const doPrint = () => {
    // Set filename: browser uses document.title as the PDF filename
    const safeName = name.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_') || 'Participant';
    const prevTitle = document.title;
    document.title = `Training_Certificate_${safeName}`;

    const s = document.createElement('style');
    s.id = '_cert_ps_';
    s.textContent = `
      @media print {
        @page { size: A4 landscape; margin: 0; }
        body > * { display: none !important; }
        body > #root { display: block !important; }
        #cert-overlay {
          display: flex !important;
          position: fixed !important; inset: 0 !important;
          background: #fff !important;
          backdrop-filter: none !important;
          align-items: flex-start !important;
          justify-content: center !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        .cert-noprint { display: none !important; }
        #cert-print {
          display: flex !important;
          width: 100% !important;
          max-width: none !important;
          min-height: 100vh !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          margin: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        #cert-print * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        #cert-left-panel {
          background: linear-gradient(160deg,#0f172a 0%,#1e3a8a 55%,#312e81 100%) !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(s);
    window.print();
    setTimeout(() => {
      document.getElementById('_cert_ps_')?.remove();
      document.title = prevTitle;
    }, 1500);
  };

  return (
    <div
      id="cert-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:'fixed', inset:0, zIndex:10000,
        background:'rgba(6,9,22,0.92)', backdropFilter:'blur(14px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'20px 16px', overflowY:'auto',
      }}
    >
      {/* Floating action bar */}
      <div className="cert-noprint" style={{
        position:'fixed', top:20, right:20,
        display:'flex', gap:10, zIndex:1,
      }}>
        <button onClick={doPrint} style={{
          background:'linear-gradient(135deg,#4338ca,#6366f1)',
          color:'#fff', border:'none', borderRadius:12,
          padding:'11px 22px', fontWeight:700, fontSize:13, cursor:'pointer',
          boxShadow:'0 4px 18px rgba(99,102,241,.5)',
          display:'flex', alignItems:'center', gap:7,
        }}>🖨️ Print / طباعة</button>
        <button onClick={onClose} style={{
          background:'rgba(255,255,255,.08)', color:'#fff',
          border:'1px solid rgba(255,255,255,.18)',
          borderRadius:12, padding:'11px 15px', fontWeight:700, fontSize:14, cursor:'pointer',
        }}>✕</button>
      </div>

      {/* ── Certificate Card — split layout (×1.5 larger) ── */}
      <div id="cert-print" style={{
        width:'100%', maxWidth:1500,
        display:'flex', minHeight:880,
        borderRadius:24,
        boxShadow:'0 50px 140px rgba(0,0,0,.8)',
        overflow:'hidden',
        fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",
      }}>

        {/* ── LEFT PANEL (dark gradient) ── */}
        <div id="cert-left-panel" style={{
          width:420, flexShrink:0,
          background:'linear-gradient(160deg,#0f172a 0%,#1e3a8a 55%,#312e81 100%)',
          display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'space-between', padding:'36px 26px 22px', position:'relative',
          overflow:'hidden',
        }}>
          {/* Decorative arcs */}
          <div style={{
            position:'absolute', width:360, height:360, borderRadius:'50%',
            border:'1px solid rgba(255,255,255,.06)',
            top:-80, left:-80, pointerEvents:'none',
          }}/>
          <div style={{
            position:'absolute', width:260, height:260, borderRadius:'50%',
            border:'1px solid rgba(255,255,255,.04)',
            bottom:100, right:-80, pointerEvents:'none',
          }}/>

          {/* ── TOP GROUP ── */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            {/* Logo */}
            <div style={{
              background:'#fff', borderRadius:22, padding:9,
              boxShadow:'0 10px 40px rgba(0,0,0,.5)', marginBottom:26,
            }}>
              <img src="/mawashi-logo.jpg" alt="" style={{ height:90, width:90, objectFit:'contain', display:'block', borderRadius:16 }} />
            </div>

            {/* Company */}
            <div style={{ textAlign:'center', marginBottom:30 }}>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:11, letterSpacing:2.5, textTransform:'uppercase', marginBottom:6 }}>
                شركة المواشي
              </div>
              <div style={{ color:'rgba(255,255,255,.9)', fontSize:15, fontWeight:700, letterSpacing:.5 }}>
                Al Mawashi Company
              </div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, marginTop:5 }}>
                قسم الجودة
              </div>
            </div>

            {/* Score ring — 148×148, r=63 */}
            <div style={{ position:'relative', width:148, height:148, marginBottom:20 }}>
              <svg viewBox="0 0 148 148" style={{ position:'absolute', inset:0, transform:'rotate(-90deg)' }}>
                <circle cx={74} cy={74} r={63} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={10}/>
                <circle cx={74} cy={74} r={63} fill="none"
                  stroke={scoreNum >= 90 ? '#34d399' : '#22c55e'}
                  strokeWidth={10} strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*63 * scoreNum/100} ${2*Math.PI*63}`}
                />
              </svg>
              <div style={{
                position:'absolute', inset:0,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              }}>
                <div style={{ fontSize:36, fontWeight:900, color:'#fff', lineHeight:1 }}>{scoreNum}%</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.55)', letterSpacing:1.5, marginTop:5 }}>SCORE</div>
              </div>
            </div>

            {/* PASS badge */}
            <div style={{
              background:'linear-gradient(135deg,#16a34a,#22c55e)',
              color:'#fff', padding:'11px 34px', borderRadius:999,
              fontSize:15, fontWeight:800, letterSpacing:2,
              boxShadow:'0 5px 20px rgba(22,163,74,.5)',
              marginBottom:9,
            }}>PASSED ✓</div>
            <div style={{ color:'rgba(255,255,255,.55)', fontSize:13, letterSpacing:.5 }}>نجح — اجتاز التقييم</div>
          </div>

          {/* ── BOTTOM GROUP: QR + cert number ── */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{
              background:'#fff', borderRadius:10, padding:6,
              boxShadow:'0 4px 16px rgba(0,0,0,.4)',
            }}>
              <QRCodeSVG value={verifyUrl} size={112} level="M" />
            </div>
            <div style={{ color:'rgba(255,255,255,.3)', fontSize:9, letterSpacing:1.8, textTransform:'uppercase', marginTop:2 }}>
              Scan to Verify
            </div>
            <div style={{ color:'rgba(255,255,255,.2)', fontSize:8.5, letterSpacing:.8 }}>{certNo}</div>
          </div>
        </div>

        {/* ── RIGHT PANEL (white) ── */}
        <div style={{
          flex:1, background:'#ffffff',
          display:'flex', flexDirection:'column',
          padding:'38px 48px 28px',
        }}>
          {/* Header label */}
          <div style={{ marginBottom:22 }}>
            <div style={{
              fontSize:13, fontWeight:800, letterSpacing:5,
              color:'#6366f1', textTransform:'uppercase', marginBottom:6,
            }}>Certificate of Achievement</div>
            <div style={{
              fontSize:28, fontWeight:900, color:'#0f172a', letterSpacing:'-0.03em', lineHeight:1.1,
            }}>شهادة إتمام التدريب بنجاح</div>
            <div style={{ height:4, width:72, background:'linear-gradient(90deg,#4338ca,#6366f1)', borderRadius:99, marginTop:11 }}/>
          </div>

          {/* Intro */}
          <div style={{ fontSize:15, color:'#94a3b8', marginBottom:9, fontStyle:'italic' }}>
            This is to certify that — يُشهد بأن
          </div>

          {/* Name */}
          <div style={{
            fontSize:42, fontWeight:900, color:'#0f172a',
            letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:12,
          }}>{name || '— —'}</div>

          {/* ID + Designation chips */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
            {empId && (
              <span style={{
                fontSize:14, fontWeight:700, color:'#4338ca',
                background:'#eef2ff', border:'1px solid #c7d2fe',
                padding:'6px 18px', borderRadius:999,
              }}>ID: {empId}</span>
            )}
            {desig && (
              <span style={{
                fontSize:14, fontWeight:600, color:'#475569',
                background:'#f8fafc', border:'1px solid #e2e8f0',
                padding:'6px 18px', borderRadius:999,
              }}>{desig}</span>
            )}
          </div>

          {/* Statement */}
          <div style={{ fontSize:15, color:'#475569', marginBottom:14, lineHeight:1.7 }}>
            has successfully completed and <span style={{ fontWeight:700, color:'#15803d' }}>PASSED</span> the training module:
            <br/>
            <span style={{ fontSize:14, color:'#92400e' }}>أتمّ بنجاح وحدة التدريب التالية واجتاز التقييم بتفوق</span>
          </div>

          {/* Module name */}
          <div style={{
            background:'linear-gradient(135deg,#eef2ff,#e0e7ff)',
            border:'2px solid #c7d2fe',
            borderLeft:'5px solid #4338ca',
            borderRadius:13, padding:'16px 24px',
            fontSize:20, fontWeight:800, color:'#1e3a8a',
            marginBottom:22, letterSpacing:'-0.01em',
          }}>{getModuleName(moduleName, lang)}</div>

          {/* Meta row */}
          <div style={{
            display:'flex', gap:22, flexWrap:'wrap',
            fontSize:14, color:'#64748b', marginBottom:'auto', paddingBottom:16,
          }}>
            <span>📅 <strong style={{color:'#0f172a'}}>{date || '—'}</strong></span>
            <span>🏢 <strong style={{color:'#0f172a'}}>{branch || '—'}</strong></span>
            <span>Pass mark: <strong style={{color:'#15803d'}}>80%</strong></span>
            {expiryDate && (
              <span>⏳ Valid until: <strong style={{color: expiryColor}}>{expiryDate}</strong>
                {daysLeft !== null && daysLeft < 60 && (
                  <span style={{fontSize:12, color:expiryColor, marginLeft:5}}>
                    ({daysLeft < 0 ? 'EXPIRED' : `${daysLeft}d left`})
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Divider */}
          <div style={{ height:1, background:'#f1f5f9', margin:'12px 0' }}/>

          {/* Signature row */}
          <div style={{ display:'flex', gap:30, justifyContent:'space-between' }}>
            {/* Trainer */}
            <div style={{ flex:1 }}>
              <div style={{
                height:36, borderBottom:'1.5px solid #334155',
                marginBottom:6, display:'flex', alignItems:'flex-end',
                paddingBottom:5,
              }}>
                {conductedBy && (
                  <span style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>{conductedBy}</span>
                )}
              </div>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>Trainer / المدرب</div>
            </div>

            {/* QA Manager */}
            <div style={{ flex:1 }}>
              <div style={{
                height:36, borderBottom:'1.5px solid #334155', marginBottom:6,
              }}/>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>Quality Manager / مدير الجودة</div>
              <div style={{ fontSize:10, color:'#cbd5e1', marginTop:3 }}>شركة المواشي — قسم الجودة</div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{
            marginTop:16, paddingTop:12, borderTop:'1px solid #f1f5f9',
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <span style={{ fontSize:11, color:'#cbd5e1', letterSpacing:.5 }}>Al Mawashi Company — Quality Department</span>
            <span style={{ fontSize:11, color:'#cbd5e1' }}>ISO 22000:2018</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Component ===================== */
export default function TrainingSessionsList() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  // ✅ Live question bank fetched from DB (training_questions records from admin)
  const [liveQuizBank, setLiveQuizBank] = useState({});

  // ✅ Smart filter / sort tools
  const [sortBy, setSortBy] = useState("newest");
  const [fBranch, setFBranch] = useState("");
  const [fModule, setFModule] = useState("");
  const [fQuiz, setFQuiz] = useState("all"); // all | with | without
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selected, setSelected] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [savingParticipants, setSavingParticipants] = useState(false);

  const [refOpen, setRefOpen] = useState(false);
  const [certData, setCertData] = useState(null);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizIndex, setQuizIndex] = useState(-1);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSaving, setQuizSaving] = useState(false);
  // ✅ Unified language (qcs_training_lang) shared across all training pages
  const [globalLang, setGlobalLang] = useGlobalLang(); // "en" | "ar"
  const quizLang = globalLang === "ar" ? "AR" : "EN";
  const setQuizLang = (v) => setGlobalLang(v === "AR" || v === "ar" ? "ar" : "en");

  // ✅ View Answers modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewIndex, setViewIndex] = useState(-1);
  const viewLang = globalLang === "ar" ? "AR" : "EN";
  const setViewLang = setQuizLang;

  const [rightTab, setRightTab] = useState("SESSIONS");

  const [openYears, setOpenYears] = useState(() => ({}));
  const [openMonths, setOpenMonths] = useState(() => ({}));
  const [openDays, setOpenDays] = useState(() => ({}));

  // ✅ delete training session
  const [deletingSession, setDeletingSession] = useState(false);

  // ✅ Session Link
  const [linkBusy, setLinkBusy] = useState(false);

  // ✅ NEW: collapsible details state (A–L)
  const [detailOpen, setDetailOpen] = useState(() => ({}));

  const moduleName = selected ? safeModule(selected) : "";
  // ✅ Level (difficulty) this session targets — "" means all levels
  const sessionLevel = selected ? String(selected?.payload?.level || "").trim() : "";

  const questions = useMemo(() => {
    if (!moduleName) return [];
    // ✅ DB questions (from admin) take priority; hardcoded bank is the fallback.
    // IMPORTANT: lookupBank returns [] (truthy) when empty, so `a || b` never
    // fell through to the fallback — check .length explicitly so HACCP & others
    // correctly use the built-in QUIZ_BANK.
    const live = lookupBank(liveQuizBank, moduleName);
    const all = live.length ? live : lookupBank(QUIZ_BANK, moduleName);
    // ✅ If the session targets a level, return that level's 5 questions
    return pickLevelQuestions(all, sessionLevel, 5);
  }, [moduleName, liveQuizBank, sessionLevel]);

  const sessionStats = useMemo(() => {
    if (!selected) return null;
    const list = Array.isArray(participants) ? participants : [];
    const valid = list.filter((p) => String(p?.name || "").trim());
    const total = valid.length;

    const pass = valid.filter(
      (p) => String(p?.result || "").toUpperCase() === "PASS"
    ).length;
    const fail = valid.filter(
      (p) => String(p?.result || "").toUpperCase() === "FAIL"
    ).length;

    const scores = valid
      .map((p) => Number(String(p?.score || "").replace("%", "")))
      .filter((n) => Number.isFinite(n));

    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const rate = total ? Math.round((pass / total) * 100) : 0;

    return { total, pass, fail, avg, rate };
  }, [selected, participants]);

  const load = async () => {
    setLoading(true);
    setInfo("");
    try {
      // ✅ Fetch sessions AND the admin's question bank in parallel
      const [data, qData] = await Promise.all([
        fetchJson(`${REPORTS_URL}?type=${encodeURIComponent(TYPE)}`),
        fetchJson(`${REPORTS_URL}?type=training_questions`).catch(() => []),
      ]);

      // Build live question bank map: { [moduleName]: questions[] }
      const qArr = normalizeToArray(qData);
      const bankMap = {};
      qArr.forEach((rec) => {
        const mod = rec?.payload?.module;
        const qs = rec?.payload?.questions;
        if (mod && Array.isArray(qs) && qs.length > 0) {
          bankMap[mod] = qs;
        }
      });
      setLiveQuizBank(bankMap);

      const arr = normalizeToArray(data).slice().sort(sortByNewest);
      setRows(arr);

      const meta = Array.isArray(data)
        ? "API returned Array"
        : `API returned Object keys: ${Object.keys(data || {}).join(", ") || "none"}`;
      setInfo(`${meta} — Loaded: ${arr.length}`);

      if (selected) {
        const sid = getId(selected);
        const fresh = arr.find((r) => getId(r) === sid);
        if (fresh) {
          setSelected(fresh);
          const raw = fresh?.payload?.participants || [];
          const cleaned = dedupeParticipants(raw);
          setParticipants(renumberParticipants(cleaned));
        }
      }
    } catch (e) {
      console.error(e);
      setInfo(`ERROR: ${String(e?.message || e)}`);
      alert(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const branchOptions = useMemo(() => {
    const s = new Set();
    for (const r of rows) {
      const b = safeBranch(r);
      if (b) s.add(b);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const moduleOptions = useMemo(() => {
    const s = new Set();
    for (const r of rows) {
      const m = safeModule(r);
      if (m) s.add(m);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (s) {
        const blob = `${safeTitle(r)} ${safeBranch(r)} ${safeModule(r)} ${safeDate(r)}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      if (fBranch && safeBranch(r) !== fBranch) return false;
      if (fModule && safeModule(r) !== fModule) return false;
      const quiz = hasQuiz(r?.payload);
      if (fQuiz === "with" && !quiz) return false;
      if (fQuiz === "without" && quiz) return false;
      const d = safeDate(r);
      if (dateFrom && (!d || d < dateFrom)) return false;
      if (dateTo && (!d || d > dateTo)) return false;
      return true;
    });
  }, [rows, q, fBranch, fModule, fQuiz, dateFrom, dateTo]);

  const visible = useMemo(() => {
    const arr = filtered.slice();
    const byStr = (fn) => (a, b) =>
      String(fn(a) || "").localeCompare(String(fn(b) || ""));
    switch (sortBy) {
      case "oldest":
        arr.sort((a, b) => sortByNewest(a, b) * -1);
        break;
      case "title":
        arr.sort(byStr(safeTitle));
        break;
      case "branch":
        arr.sort(byStr(safeBranch));
        break;
      case "module":
        arr.sort(byStr(safeModule));
        break;
      case "participants":
        arr.sort((a, b) => rowStats(b).total - rowStats(a).total);
        break;
      case "passrate":
        arr.sort((a, b) => rowStats(b).rate - rowStats(a).rate);
        break;
      case "newest":
      default:
        arr.sort(sortByNewest);
        break;
    }
    return arr;
  }, [filtered, sortBy]);

  const activeFilterCount =
    (q.trim() ? 1 : 0) +
    (fBranch ? 1 : 0) +
    (fModule ? 1 : 0) +
    (fQuiz !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const clearAllFilters = () => {
    setQ("");
    setFBranch("");
    setFModule("");
    setFQuiz("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
  };

  const dateTree = useMemo(() => {
    const tree = {};
    for (const r of filtered) {
      const d = safeDate(r) || "Unknown";
      const y = d !== "Unknown" ? d.slice(0, 4) : "Unknown";
      const m = d !== "Unknown" ? d.slice(0, 7) : "Unknown";
      const day = d;

      tree[y] = tree[y] || {};
      tree[y][m] = tree[y][m] || {};
      tree[y][m][day] = tree[y][m][day] || [];
      tree[y][m][day].push(r);
    }
    return tree;
  }, [filtered]);

  const openSession = (r) => {
    setSelected(r);
    const raw = r?.payload?.participants || [];
    const cleaned = dedupeParticipants(raw);
    setParticipants(renumberParticipants(cleaned));

    const det = parseTrainingDetails(String(r?.payload?.details || ""));
    const nextOpen = {};
    det.forEach((s) => (nextOpen[s.key] = false));
    setDetailOpen(nextOpen);

    setQuizOpen(false);
    setQuizIndex(-1);
    setQuizAnswers({});
    setViewOpen(false);
    setViewIndex(-1);
  };

  const closeSession = () => {
    setSelected(null);
    setParticipants([]);
    setQuizOpen(false);
    setQuizIndex(-1);
    setQuizAnswers({});
    setViewOpen(false);
    setViewIndex(-1);
    setDetailOpen({});
  };

  const addRow = () => {
    setParticipants((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];
      base.push(makeBlankParticipant());
      return renumberParticipants(base);
    });
  };

  const add5Rows = () => {
    setParticipants((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];
      for (let i = 0; i < 5; i++) base.push(makeBlankParticipant());
      return renumberParticipants(base);
    });
  };

  const removeRow = (idx) =>
    setParticipants((prev) =>
      renumberParticipants((prev || []).filter((_, i) => i !== idx))
    );

  const updateCell = (idx, key, value) => {
    setParticipants((prev) => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      copy[idx] = { ...(copy[idx] || {}), [key]: value };
      return renumberParticipants(copy);
    });
  };

  /* ===================== ✅ ONE SESSION LINK (token-based) ===================== */
  const getSessionToken = () => String(selected?.payload?.quizToken || "").trim();

  const buildSessionLink = (token) => {
    const origin = String(PUBLIC_ORIGIN || "").replace(/\/$/, "");
    if (!origin || !token) return "";
    return `${origin}/t/${encodeURIComponent(token)}`;
  };

  // Returns: url string on success, null if already showed its own error, "" on silent failure
  const ensureTokenAndGetLink = async () => {
    if (!selected) return "";
    const id = getId(selected);
    if (!id) return "";

    setLinkBusy(true);
    try {
      const existingToken = getSessionToken();
      const payload0 = selected.payload || {};
      // ✅ Regenerate quiz if: no quiz yet, OR DB has fresh questions for this module
      const dbQs = lookupBank(liveQuizBank, moduleName);
      const hasDBQuestions = dbQs.length > 0;
      const needQuiz = !hasQuiz(payload0) || hasDBQuestions;

      const nextPayload = { ...payload0 };

      if (!existingToken) {
        nextPayload.quizToken = makeToken(26);
      }

      if (needQuiz) {
        if (!moduleName || !questions.length) {
          const available = Object.keys(liveQuizBank);
          const hint = available.length
            ? `\n\nModules with questions in DB: ${available.join(", ")}\nSession module: "${moduleName}"`
            : "\n\n(No question records found in DB — add questions in Training Admin first.)";
          alert(`No question bank for this module yet.\nCannot generate trainee link.${hint}`);
          return null; // ← null = already alerted, callers should NOT add another alert
        }
        nextPayload.quiz = buildQuizFromBank(moduleName, questions, PASS_MARK, sessionLevel);
      }

      const finalToken = existingToken || nextPayload.quizToken;
      if (!finalToken) return "";

      const changed = (!existingToken && !!nextPayload.quizToken) || needQuiz;

      if (changed) {
        const updated = { ...selected, payload: nextPayload };
        await updateReportOnServer(id, updated);
        await load();
      }

      return buildSessionLink(finalToken);
    } catch (e) {
      console.error(e);
      alert(`Failed to generate link: ${String(e?.message || e)}`);
      return null; // already alerted
    } finally {
      setLinkBusy(false);
    }
  };

  const copySessionLink = async () => {
    const url = await ensureTokenAndGetLink();
    if (url === null) return; // already showed its own error
    if (!url) return alert("Cannot generate link — missing session ID or origin.");
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        alert(`✅ Session link copied:\n${url}`);
      } else {
        window.prompt("Copy this link:", url);
      }
    } catch (e) {
      console.error(e);
      window.prompt("Copy this link:", url);
    }
  };

  const openSessionLink = async () => {
    const url = await ensureTokenAndGetLink();
    if (url === null) return; // already showed its own error
    if (!url) return alert("Cannot open link — missing session ID or origin.");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const saveParticipants = async () => {
    if (!selected) return;

    const clean = renumberParticipants(dedupeParticipants(participants)).map(
      (p) => ({
        slNo: String(p.slNo || "").trim(),
        name: String(p.name || "").trim(),
        designation: String(p.designation || "").trim(),
        employeeId: String(p.employeeId || "").trim(),
        result: String(p.result || "").trim(),
        score: String(p.score || "").trim(),
        lastQuizAt: String(p.lastQuizAt || "").trim(),
        quizAttempt: p?.quizAttempt || null,
      })
    );

    const hasAny = clean.some(
      (p) => p.name || p.designation || p.employeeId || p.result || p.score
    );
    if (!hasAny) {
      alert("Please add at least one participant before saving.");
      return;
    }

    for (const p of clean) {
      const rowHasData =
        p.name || p.designation || p.employeeId || p.result || p.score;
      if (rowHasData && !p.name) {
        alert(
          "A row contains data but participant name is empty. Please fill the name."
        );
        return;
      }
    }

    setSavingParticipants(true);
    try {
      const id = getId(selected);
      if (!id) throw new Error("Missing report id");

      const updated = {
        ...selected,
        payload: {
          ...(selected.payload || {}),
          participants: clean,
        },
      };

      await updateReportOnServer(id, updated);
      alert("Participants saved successfully ✅");
      await load();
    } catch (e) {
      console.error(e);
      alert(`Save failed: ${String(e?.message || e)}`);
    } finally {
      setSavingParticipants(false);
    }
  };

  const startQuiz = (pIdx) => {
    if (!selected) return;
    const p = participants[pIdx];
    if (!p || !String(p.name || "").trim()) {
      alert("Please enter the participant name before starting the quiz.");
      return;
    }
    if (!moduleName || questions.length === 0) {
      alert("No question bank for this module yet.");
      return;
    }
    setQuizIndex(pIdx);
    setQuizAnswers({});
    setQuizLang("EN");
    setQuizOpen(true);
  };

  const closeQuiz = () => {
    setQuizOpen(false);
    setQuizIndex(-1);
    setQuizAnswers({});
  };

  const openAnswers = (pIdx) => {
    const p = participants[pIdx];
    if (!p?.quizAttempt?.answers?.length) {
      alert("No saved answers for this participant yet.");
      return;
    }
    setViewIndex(pIdx);
    setViewLang("EN");
    setViewOpen(true);
  };
  const closeAnswers = () => {
    setViewOpen(false);
    setViewIndex(-1);
  };

  const submitQuiz = async () => {
    if (!selected) return;
    if (quizIndex < 0) return;

    for (let i = 0; i < questions.length; i++) {
      if (typeof quizAnswers[i] !== "number") {
        alert(`Please answer question #${i + 1} before submitting.`);
        return;
      }
    }

    let correctCount = 0;
    for (let i = 0; i < questions.length; i++) {
      if (quizAnswers[i] === questions[i].correct) correctCount++;
    }
    const score = Math.round((correctCount / questions.length) * 100);
    const result = score >= PASS_MARK ? "PASS" : "FAIL";

    const attemptSnapshot = {
      module: moduleName || "",
      submittedAt: new Date().toISOString(),
      passMark: PASS_MARK,
      score,
      result,
      answers: questions.map((qq, i) => ({
        q_ar: qq.q_ar,
        q_en: qq.q_en,
        options_ar: qq.options_ar,
        options_en: qq.options_en,
        correct: qq.correct,
        chosen: quizAnswers[i],
      })),
    };

    setQuizSaving(true);
    try {
      const updatedParticipants = renumberParticipants(
        dedupeParticipants(
          renumberParticipants(participants).map((p, idx) => {
            if (idx !== quizIndex) return p;
            return {
              ...p,
              score: String(score),
              result,
              lastQuizAt: todayISO(),
              quizAttempt: attemptSnapshot,
            };
          })
        )
      );

      const id = getId(selected);
      if (!id) throw new Error("Missing report id");

      const updated = {
        ...selected,
        payload: {
          ...(selected.payload || {}),
          participants: updatedParticipants.map((p) => ({
            slNo: String(p.slNo || "").trim(),
            name: String(p.name || "").trim(),
            designation: String(p.designation || "").trim(),
            employeeId: String(p.employeeId || "").trim(),
            result: String(p.result || "").trim(),
            score: String(p.score || "").trim(),
            lastQuizAt: String(p.lastQuizAt || "").trim(),
            quizAttempt: p?.quizAttempt || null,
          })),
        },
      };

      await updateReportOnServer(id, updated);

      alert(
        `Saved ✅\n${participants[quizIndex]?.name}\nScore: ${score}% — ${result}`
      );

      setParticipants(updatedParticipants);
      closeQuiz();
      await load();
    } catch (e) {
      console.error(e);
      alert(`Quiz save failed: ${String(e?.message || e)}`);
    } finally {
      setQuizSaving(false);
    }
  };

  const deleteTrainingSession = async () => {
    if (!selected) return;
    const id = getId(selected);
    if (!id) {
      alert("Missing report id");
      return;
    }

    const ok = window.confirm(
      `⚠️ Delete this training session permanently?\n\nTitle: ${
        safeTitle(selected) || "-"
      }\nDate: ${safeDate(selected) || "-"}\nBranch: ${
        safeBranch(selected) || "-"
      }\nModule: ${safeModule(selected) || "-"}`
    );
    if (!ok) return;

    setDeletingSession(true);
    try {
      await deleteReportOnServer(id);
      alert("Training session deleted ✅");
      closeSession();
      await load();
    } catch (e) {
      console.error(e);
      alert(`Delete failed: ${String(e?.message || e)}`);
    } finally {
      setDeletingSession(false);
    }
  };

  const activeParticipant = quizIndex >= 0 ? participants[quizIndex] : null;
  const viewParticipant = viewIndex >= 0 ? participants[viewIndex] : null;

  /* ===================== ✅ THEME (Mock Recall View Style) ===================== */
  const THEME = {
    text: "#475569",
    textStrong: "#1e293b",
    muted: "#64748b",
    muted2: "#94a3b8",
    line: "#e8eef6",
    lineStrong: "#dbe3ef",
    glassBg: "#ffffff",
    glassBd: "#e6ecf5",
    glassShadow: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.05)",
    surfaceBg: "#ffffff",
    surfaceBd: "#e6ecf5",
    surfaceShadow: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.05)",
    inputBg: "#ffffff",
    inputBd: "#d6e0ef",
    inputPh: "#94a3b8",
    // ✅ Soft Sky header — light gradient, slate-blue text (no harsh dark)
    headerBg: "linear-gradient(135deg,#eef4ff 0%,#e3edff 50%,#dbeafe 100%)",
    headerText: "#1e3a8a",
    headerSub: "#496397",
    headerLine: "#cdddf5",
    // ✅ soft sub-surface tints (replace old dark navy fills)
    subBg: "#f6f9ff",
    subBg2: "#eef4fc",
    tableHeadBg: "#eef4fc",
  };

  const pageStyle = {
    minHeight: "100vh",
    width: "100%",
    padding: "22px 20px 32px",
    background:
      "radial-gradient(1100px 520px at 100% -8%, #eaf1ff 0%, transparent 55%)," +
      "radial-gradient(900px 480px at -5% 0%, #eef6ff 0%, transparent 50%)," +
      "#f7f9fc",
    boxSizing: "border-box",
    direction: "ltr",
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
    color: THEME.text,
  };

  const glass = {
    background: THEME.glassBg,
    border: `1px solid ${THEME.glassBd}`,
    borderRadius: 16,
    boxShadow: THEME.glassShadow,
  };

  const surface = {
    background: THEME.surfaceBg,
    border: `1px solid ${THEME.surfaceBd}`,
    borderRadius: 16,
    boxShadow: THEME.surfaceShadow,
  };

  const btn = (kind = "light") => {
    const m = {
      dark:    { bg: "#3b82f6",                fg: "#fff",    bd: "transparent" },
      light:   { bg: "#ffffff",                fg: "#1e3a8a", bd: "#cdddf5" },
      blue:    { bg: "#3b82f6",                fg: "#fff",    bd: "transparent" },
      red:     { bg: "#fef2f2",                fg: "#b91c1c", bd: "#fecaca" },
      violet:  { bg: "#f5f3ff",                fg: "#6d28d9", bd: "#e9d5ff" },
      green:   { bg: "#16a34a",                fg: "#fff",    bd: "transparent" },
      gray:    { bg: "#f1f5f9",                fg: "#475569", bd: "#e5e7eb" },
      warning: { bg: "#fffbeb",                fg: "#b45309", bd: "#fde68a" },
    };
    const c = m[kind] || m.light;
    return {
      padding: "9px 16px",
      borderRadius: 10,
      border: `1px solid ${c.bd}`,
      background: c.bg,
      color: c.fg,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: "0.875rem",
      letterSpacing: "0.01em",
      whiteSpace: "nowrap",
      transition: "transform .12s ease, box-shadow .12s ease, filter .12s ease",
    };
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${THEME.inputBd}`,
    outline: "none",
    fontWeight: 600,
    fontSize: "0.92rem",
    color: THEME.textStrong,
    background: THEME.inputBg,
    fontFamily: "inherit",
    boxShadow: "0 1px 2px rgba(16,24,40,.03)",
    transition: "border-color .12s ease, box-shadow .12s ease",
  };

  const selectStyle = {
    padding: "9px 12px",
    borderRadius: 10,
    border: `1px solid ${THEME.inputBd}`,
    outline: "none",
    fontWeight: 700,
    fontSize: "0.85rem",
    color: THEME.textStrong,
    background: THEME.inputBg,
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(16,24,40,.03)",
  };
  const fieldLabel = {
    fontSize: "0.68rem",
    fontWeight: 800,
    color: THEME.muted,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 4,
    display: "block",
  };

  const TOP_EST = 372; // header + KPI row + smart toolbar + margins
  const rightPanelHeight = `calc(100vh - ${TOP_EST}px)`;

  const token = selected ? getSessionToken() : "";
  const sessionLink = token ? buildSessionLink(token) : "";

  const detailsText = selected ? String(selected?.payload?.details || "") : "";
  const objectivesText = selected ? String(selected?.payload?.objectives || "") : "";

  const detailsSections = useMemo(
    () => parseTrainingDetails(detailsText),
    [detailsText]
  );

  const toggleDetail = (k) => setDetailOpen((p) => ({ ...p, [k]: !p[k] }));

  const expandAllDetails = () => {
    const next = {};
    detailsSections.forEach((s) => (next[s.key] = true));
    setDetailOpen(next);
  };

  const collapseAllDetails = () => {
    const next = {};
    detailsSections.forEach((s) => (next[s.key] = false));
    setDetailOpen(next);
  };

  /* ====== KPI calculations (matches Mock Recall View style) ====== */
  const kpis = (() => {
    const total = filtered.length;
    const branches = new Set();
    const modules = new Set();
    let withQuiz = 0;
    let lastDate = null;
    for (const r of filtered) {
      const b = safeBranch(r); if (b) branches.add(b);
      const m = safeModule(r); if (m) modules.add(m);
      if (hasQuiz(r?.payload)) withQuiz += 1;
      const d = safeDate(r);
      if (d && (!lastDate || d > lastDate)) lastDate = d;
    }
    const days = (() => {
      if (!lastDate) return null;
      const dt = new Date(lastDate);
      if (isNaN(dt.getTime())) return null;
      return Math.floor((Date.now() - dt.getTime()) / 86400000);
    })();
    return {
      total,
      branches: branches.size,
      modules: modules.size,
      withQuiz,
      lastDate,
      daysSinceLast: days,
    };
  })();

  /* ── Branch Compliance (all-time, uses full rows not filtered) ── */
  const branchCompliance = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const br = safeBranch(r);
      const mo = safeModule(r);
      if (!br) continue;
      if (!map[br]) map[br] = { modules: new Set(), pass: 0, total: 0, sessions: 0, lastDate: null };
      const b = map[br];
      b.sessions++;
      if (mo) b.modules.add(mo);
      const st = rowStats(r);
      b.pass  += st.pass;
      b.total += st.total;
      const d = safeDate(r);
      if (d && (!b.lastDate || d > b.lastDate)) b.lastDate = d;
    }
    return Object.entries(map).map(([branch, data]) => {
      const coverage = Math.round((data.modules.size / TOTAL_MODULES) * 100);
      const passRate  = data.total > 0 ? Math.round((data.pass / data.total) * 100) : 0;
      const score     = Math.round((coverage + passRate) / 2);
      return { branch, coverage, passRate, score, modules: data.modules.size, sessions: data.sessions, lastDate: data.lastDate };
    }).sort((a, b) => b.score - a.score);
  }, [rows]);

  /* ── Renewal Alerts: PASS participants expiring within 90 days ── */
  const renewalAlerts = useMemo(() => {
    const today = new Date();
    const alerts = [];
    for (const r of rows) {
      const d = safeDate(r);
      if (!d) continue;
      const expiry = new Date(d);
      expiry.setFullYear(expiry.getFullYear() + 1);
      const daysLeft = Math.ceil((expiry - today) / 86400000);
      if (daysLeft > 90) continue; // only show within 90 days
      const parts = normalizeToArray(r.payload?.participants || r.participants || []);
      for (const p of parts) {
        if (String(p.result || '').toLowerCase() !== 'pass') continue;
        alerts.push({
          name: String(p.name || '').trim(),
          empId: String(p.employeeId || '').trim(),
          desig: String(p.designation || '').trim(),
          module: safeModule(r),
          branch: safeBranch(r),
          trainedDate: d,
          expiryDate: expiry.toISOString().split('T')[0],
          daysLeft,
        });
      }
    }
    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [rows]);
  const [renewalOpen, setRenewalOpen] = useState(false);

  return (
    <div style={pageStyle}>
      {/* ========= TOP HEADER (navy gradient, like Mock Recall) ========= */}
      <div
        style={{
          background: THEME.headerBg,
          color: THEME.headerText,
          border: `1px solid ${THEME.headerLine}`,
          padding: "22px 26px",
          borderRadius: 18,
          boxShadow: "0 6px 22px rgba(59,130,246,0.10)",
          marginBottom: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            🎓 Training Sessions
          </h1>
          <div style={{ color: THEME.headerSub, marginTop: 6, fontSize: "0.9rem", fontWeight: 600 }}>
            {loading ? "Loading…" : (info || `Browse, view participants, run quizzes, and track KPIs.`)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={load} disabled={loading} style={btn("light")}>
            {loading ? "Refreshing…" : "🔄 Refresh"}
          </button>
          <button onClick={() => nav("/training/create")} style={btn("dark")}>
            ➕ New Training
          </button>
          <button onClick={() => nav("/training/gap-analysis")} style={btn("light")}>
            📊 Gap Analysis
          </button>
          <button onClick={() => nav("/training")} style={btn("light")}>
            ↩ Back
          </button>
        </div>
      </div>

      {/* ========= KPI ROW ========= */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <KPICardLocal icon="📋" label="Total Sessions" value={kpis.total} sub={activeFilterCount ? `Filtered from ${rows.length}` : "All sessions"} accent="#1e40af" />
        <KPICardLocal icon="🏢" label="Branches Covered" value={kpis.branches} sub="distinct branches" accent="#0891b2" />
        <KPICardLocal icon="📚" label="Modules Covered" value={kpis.modules} sub="distinct modules" accent="#7c3aed" />
        <KPICardLocal icon="📝" label="With Quiz" value={`${kpis.withQuiz}/${kpis.total || 0}`} sub={kpis.total ? `${Math.round((kpis.withQuiz / kpis.total) * 100)}% have quiz` : "—"} accent="#15803d" />
        <KPICardLocal
          icon={kpis.daysSinceLast !== null && kpis.daysSinceLast > 60 ? "⏳" : "📅"}
          label="Since Last Training"
          value={kpis.daysSinceLast !== null ? `${kpis.daysSinceLast} days` : "—"}
          sub={kpis.lastDate || "—"}
          accent="#a16207"
          bad={kpis.daysSinceLast !== null && kpis.daysSinceLast > 90}
        />
      </div>

      {/* ========= BRANCH COMPLIANCE ========= */}
      <div style={{
        background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
        marginBottom:14, overflow:'hidden',
        boxShadow:'0 1px 4px rgba(15,23,42,.06)',
      }}>
        <button
          onClick={() => setComplianceOpen(p => !p)}
          style={{
            width:'100%', background:'transparent', border:'none', cursor:'pointer',
            padding:'12px 18px', display:'flex', alignItems:'center', gap:10,
            justifyContent:'space-between',
          }}
        >
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:16 }}>🏆</span>
            <span style={{ fontWeight:800, color:'#0f172a', fontSize:13 }}>Branch Compliance — امتثال الفروع</span>
            <span style={{
              fontSize:10, fontWeight:700, color:'#64748b',
              background:'#f1f5f9', borderRadius:999, padding:'2px 8px',
            }}>{branchCompliance.length} branches</span>
          </div>
          <span style={{ color:'#94a3b8', fontSize:12, transition:'transform .2s',
            display:'inline-block', transform: complianceOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
        </button>

        {complianceOpen && (
          <div style={{ padding:'4px 14px 16px', borderTop:'1px solid #f1f5f9' }}>
            <div style={{ fontSize:10, color:'#64748b', marginBottom:10, padding:'0 4px' }}>
              Score = (Modules Covered / {TOTAL_MODULES} total × 50%) + (Pass Rate × 50%)
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:10 }}>
              {branchCompliance.length === 0 ? (
                <div style={{ color:'#94a3b8', padding:12, fontSize:13 }}>No data yet.</div>
              ) : branchCompliance.map(bc => {
                const col  = bc.score >= 80 ? '#16a34a' : bc.score >= 60 ? '#d97706' : '#dc2626';
                const bg   = bc.score >= 80 ? '#f0fdf4' : bc.score >= 60 ? '#fffbeb' : '#fef2f2';
                const bd   = bc.score >= 80 ? '#bbf7d0' : bc.score >= 60 ? '#fde68a' : '#fecaca';
                const label= bc.score >= 80 ? 'Good'    : bc.score >= 60 ? 'Fair'    : 'Needs Work';
                return (
                  <div key={bc.branch} style={{
                    background: bg, border:`1.5px solid ${bd}`, borderRadius:12,
                    padding:'12px 14px',
                  }}>
                    {/* Branch name + badge */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <div style={{ fontWeight:800, fontSize:12, color:'#0f172a', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        🏢 {bc.branch}
                      </div>
                      <div style={{
                        flexShrink:0, marginLeft:6,
                        background: col, color:'#fff',
                        fontSize:9, fontWeight:800,
                        padding:'2px 7px', borderRadius:999,
                      }}>{label}</div>
                    </div>

                    {/* Big score */}
                    <div style={{ display:'flex', alignItems:'flex-end', gap:6, marginBottom:10 }}>
                      <div style={{ fontSize:36, fontWeight:900, color: col, lineHeight:1 }}>{bc.score}</div>
                      <div style={{ fontSize:14, fontWeight:700, color: col, marginBottom:4 }}>%</div>
                      <div style={{ fontSize:10, color:'#64748b', marginBottom:5 }}>compliance</div>
                    </div>

                    {/* Coverage bar */}
                    <div style={{ marginBottom:6 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9.5, fontWeight:700, color:'#475569', marginBottom:3 }}>
                        <span>📚 Coverage ({bc.modules}/{TOTAL_MODULES} modules)</span>
                        <span style={{ color: col }}>{bc.coverage}%</span>
                      </div>
                      <div style={{ height:5, background:'#e2e8f0', borderRadius:99 }}>
                        <div style={{ height:5, width:`${bc.coverage}%`, background: col, borderRadius:99, transition:'width .4s' }}/>
                      </div>
                    </div>

                    {/* Pass rate bar */}
                    <div style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9.5, fontWeight:700, color:'#475569', marginBottom:3 }}>
                        <span>✅ Pass Rate</span>
                        <span style={{ color: col }}>{bc.passRate}%</span>
                      </div>
                      <div style={{ height:5, background:'#e2e8f0', borderRadius:99 }}>
                        <div style={{ height:5, width:`${bc.passRate}%`, background:'#3b82f6', borderRadius:99, transition:'width .4s' }}/>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#94a3b8' }}>
                      <span>{bc.sessions} sessions</span>
                      <span>Last: {bc.lastDate || '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========= RENEWAL ALERTS ========= */}
      {renewalAlerts.length > 0 && (
        <div style={{
          background:'#fff', border:'1.5px solid #fde68a',
          borderRadius:14, marginBottom:14,
          boxShadow:'0 2px 10px rgba(245,158,11,.08)',
        }}>
          <button
            onClick={() => setRenewalOpen(o => !o)}
            style={{
              width:'100%', background:'none', border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'12px 16px', borderRadius:14,
            }}
          >
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>🔔</span>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>
                  Renewals Due / تجديدات مستحقة
                </div>
                <div style={{ fontSize:11, color:'#b45309', marginTop:1 }}>
                  {renewalAlerts.filter(a => a.daysLeft < 0).length > 0 && (
                    <span style={{ color:'#dc2626', fontWeight:700 }}>
                      {renewalAlerts.filter(a => a.daysLeft < 0).length} expired •{' '}
                    </span>
                  )}
                  {renewalAlerts.filter(a => a.daysLeft >= 0).length} expiring within 90 days
                </div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{
                fontSize:10, fontWeight:700, color:'#92400e',
                background:'#fef3c7', borderRadius:999, padding:'2px 8px',
                border:'1px solid #fde68a',
              }}>{renewalAlerts.length} employees</span>
              <span style={{ color:'#d97706', fontSize:12, display:'inline-block',
                transform: renewalOpen ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>▼</span>
            </div>
          </button>

          {renewalOpen && (
            <div style={{ padding:'0 14px 14px', borderTop:'1px solid #fef3c7' }}>
              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
                gap:8, marginTop:10,
              }}>
                {renewalAlerts.map((a, i) => {
                  const expired = a.daysLeft < 0;
                  const urgent  = !expired && a.daysLeft < 30;
                  const col = expired ? '#dc2626' : urgent ? '#d97706' : '#16a34a';
                  const bg  = expired ? '#fef2f2' : urgent ? '#fffbeb' : '#f0fdf4';
                  const bd  = expired ? '#fecaca' : urgent ? '#fde68a' : '#bbf7d0';
                  return (
                    <div key={i} style={{
                      background: bg, border:`1px solid ${bd}`,
                      borderRadius:10, padding:'10px 13px',
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:12, color:'#0f172a' }}>{a.name || '—'}</div>
                          <div style={{ fontSize:10, color:'#64748b', marginTop:1 }}>
                            {a.empId && <span style={{ marginRight:6 }}>ID: {a.empId}</span>}
                            {a.desig && <span>{a.desig}</span>}
                          </div>
                        </div>
                        <span style={{
                          fontSize:10, fontWeight:800, color: col,
                          background:'#fff', border:`1px solid ${bd}`,
                          borderRadius:999, padding:'2px 7px', whiteSpace:'nowrap',
                        }}>
                          {expired ? `Expired ${Math.abs(a.daysLeft)}d ago` : `${a.daysLeft}d left`}
                        </span>
                      </div>
                      <div style={{ marginTop:7, fontSize:10, color:'#475569', display:'flex', gap:8, flexWrap:'wrap' }}>
                        <span>📚 {a.module || '—'}</span>
                        <span>🏢 {a.branch || '—'}</span>
                      </div>
                      <div style={{ marginTop:4, fontSize:9.5, color:'#94a3b8' }}>
                        Trained: {a.trainedDate} → Expires: <strong style={{color: col}}>{a.expiryDate}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========= SMART FILTER / SORT TOOLBAR ========= */}
      <div
        style={{
          background: "#fff",
          border: `1px solid ${THEME.glassBd}`,
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
          boxShadow: THEME.glassShadow,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Row 1: search + count + clear all */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔎 Search by Branch / Module / Title / Date…"
            style={{ ...inputStyle, flex: 1, minWidth: 240 }}
          />
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 800,
              color: "#1e40af",
              background: "#eef4fc",
              border: "1px solid #cdddf5",
              padding: "8px 12px",
              borderRadius: 999,
              whiteSpace: "nowrap",
            }}
          >
            {visible.length} / {rows.length} session(s)
          </span>
          <button
            onClick={clearAllFilters}
            disabled={activeFilterCount === 0 && sortBy === "newest"}
            style={{
              ...btn("gray"),
              opacity: activeFilterCount === 0 && sortBy === "newest" ? 0.5 : 1,
              cursor:
                activeFilterCount === 0 && sortBy === "newest"
                  ? "not-allowed"
                  : "pointer",
            }}
            title="Reset all filters & sorting"
          >
            ✕ Clear all{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </button>
        </div>

        {/* Row 2: smart controls */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label style={fieldLabel}>↕ Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={selectStyle}
            >
              <option value="newest">📅 Newest first</option>
              <option value="oldest">📅 Oldest first</option>
              <option value="title">🔤 Title (A→Z)</option>
              <option value="branch">🏢 Branch (A→Z)</option>
              <option value="module">📚 Module (A→Z)</option>
              <option value="participants">👥 Most participants</option>
              <option value="passrate">✅ Best pass rate</option>
            </select>
          </div>

          <div>
            <label style={fieldLabel}>🏢 Branch</label>
            <select
              value={fBranch}
              onChange={(e) => setFBranch(e.target.value)}
              style={selectStyle}
            >
              <option value="">All branches</option>
              {branchOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabel}>📚 Module</label>
            <select
              value={fModule}
              onChange={(e) => setFModule(e.target.value)}
              style={selectStyle}
            >
              <option value="">All modules</option>
              {moduleOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabel}>📝 Quiz</label>
            <div
              style={{
                display: "flex",
                background: "#f1f5f9",
                border: `1px solid ${THEME.inputBd}`,
                borderRadius: 10,
                padding: 3,
                gap: 2,
              }}
            >
              {[
                { k: "all", t: "All" },
                { k: "with", t: "With" },
                { k: "without", t: "Without" },
              ].map((o) => (
                <button
                  key={o.k}
                  onClick={() => setFQuiz(o.k)}
                  style={{
                    border: "none",
                    background: fQuiz === o.k ? "#fff" : "transparent",
                    color: fQuiz === o.k ? "#1e3a8a" : THEME.muted,
                    boxShadow:
                      fQuiz === o.k ? "0 1px 3px rgba(30,58,138,0.16)" : "none",
                    fontWeight: 900,
                    fontSize: 12,
                    padding: "6px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all .12s",
                  }}
                >
                  {o.t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={fieldLabel}>📆 From date</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              style={selectStyle}
            />
          </div>

          <div>
            <label style={fieldLabel}>📆 To date</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              style={selectStyle}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          flexDirection: "row-reverse",
        }}
      >
        {/* RIGHT: Library */}
        <div
          style={{
            width: 460,
            minWidth: 380,
            maxWidth: 520,
            position: "sticky",
            top: 14,
            height: rightPanelHeight,
            overflow: "hidden",
            ...glass,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${THEME.headerLine}`,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              background: THEME.headerBg,
              color: THEME.headerText,
            }}
          >
            <div style={{ fontWeight: 1000, fontSize: 14, letterSpacing: 0.3 }}>📚 Library</div>
            <div style={{
              display: "flex",
              background: "rgba(255,255,255,0.6)",
              border: `1px solid ${THEME.headerLine}`,
              borderRadius: 10,
              padding: 3,
              gap: 2,
            }}>
              <button
                onClick={() => setRightTab("SESSIONS")}
                style={{
                  border: "none",
                  background: rightTab === "SESSIONS" ? "#fff" : "transparent",
                  color: rightTab === "SESSIONS" ? "#1e3a8a" : THEME.headerSub,
                  boxShadow: rightTab === "SESSIONS" ? "0 1px 3px rgba(30,58,138,0.18)" : "none",
                  fontWeight: 1000,
                  fontSize: 11,
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  letterSpacing: 0.3,
                  transition: "all .12s",
                }}
              >
                Sessions
              </button>
              <button
                onClick={() => setRightTab("TREE")}
                style={{
                  border: "none",
                  background: rightTab === "TREE" ? "#fff" : "transparent",
                  color: rightTab === "TREE" ? "#1e3a8a" : THEME.headerSub,
                  boxShadow: rightTab === "TREE" ? "0 1px 3px rgba(30,58,138,0.18)" : "none",
                  fontWeight: 1000,
                  fontSize: 11,
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  letterSpacing: 0.3,
                  transition: "all .12s",
                }}
              >
                Date Tree
              </button>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              background: "#f8fafc",
            }}
          >
            {rightTab === "SESSIONS" ? (
              <div style={{ display: "grid", gap: 8 }}>
                {loading ? (
                  <div style={{
                    padding: 24, textAlign: "center",
                    color: THEME.muted, fontWeight: 800, fontSize: 13,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      border: "3px solid #e2e8f0", borderTopColor: "#3b82f6",
                      margin: "0 auto 10px",
                      animation: "tspin 0.7s linear infinite",
                    }} />
                    <style>{`@keyframes tspin { to { transform: rotate(360deg); } }`}</style>
                    Loading sessions…
                  </div>
                ) : visible.length === 0 ? (
                  <div style={{
                    padding: "40px 16px", textAlign: "center",
                    color: THEME.muted, fontWeight: 700, fontSize: 13,
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>📭</div>
                    {activeFilterCount
                      ? "No sessions match your filters."
                      : "No sessions found yet."}
                  </div>
                ) : (
                  visible.map((r, idx) => {
                    const active = selected && getId(selected) === getId(r);
                    return (
                      <button
                        key={getId(r) || idx}
                        onClick={() => openSession(r)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          borderRadius: 12,
                          border: active
                            ? "2px solid #6366f1"
                            : `1px solid ${THEME.line}`,
                          background: active ? "#eef2ff" : "#ffffff",
                          padding: "10px 12px",
                          cursor: "pointer",
                          boxShadow: active
                            ? "0 8px 20px rgba(99,102,241,0.18)"
                            : "0 1px 3px rgba(15,23,42,0.05)",
                          color: THEME.text,
                          transition: "all .12s",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                        title="Open"
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            alignItems: "flex-start",
                          }}
                        >
                          <div style={{
                            fontWeight: 900, color: THEME.textStrong,
                            fontSize: 13, lineHeight: 1.35,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            flex: 1,
                          }}>
                            {safeTitle(r) || "Training Session"}
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 1000,
                            color: "#1e40af",
                            background: "#dbeafe",
                            padding: "3px 8px",
                            borderRadius: 999,
                            whiteSpace: "nowrap",
                            border: "1px solid #bfdbfe",
                          }}>
                            📅 {safeDate(r) || "-"}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <span style={{
                            fontSize: 10, fontWeight: 800,
                            color: "#5b21b6",
                            background: "#ede9fe",
                            padding: "3px 8px",
                            borderRadius: 999,
                            border: "1px solid #ddd6fe",
                          }}>
                            📚 {getModuleName(safeModule(r), globalLang) || "—"}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 800,
                            color: "#334155",
                            background: "#f1f5f9",
                            padding: "3px 8px",
                            borderRadius: 999,
                            border: "1px solid #e2e8f0",
                          }}>
                            🏢 {safeBranch(r) || "—"}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {Object.keys(dateTree).length === 0 ? (
                  <div style={{
                    padding: "40px 16px", textAlign: "center",
                    color: THEME.muted, fontWeight: 700, fontSize: 13,
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>🗂</div>
                    No data.
                  </div>
                ) : (
                  Object.keys(dateTree)
                    .sort((a, b) => String(b).localeCompare(String(a)))
                    .map((year) => {
                      const isYearOpen = !!openYears[year];
                      const monthsObj = dateTree[year] || {};
                      const months = Object.keys(monthsObj).sort((a, b) =>
                        String(b).localeCompare(String(a))
                      );

                      return (
                        <div
                          key={year}
                          style={{
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 12,
                            background: "#ffffff",
                            overflow: "hidden",
                            boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
                          }}
                        >
                          <button
                            onClick={() =>
                              setOpenYears((p) => ({ ...p, [year]: !p[year] }))
                            }
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "10px 12px",
                              cursor: "pointer",
                              border: "none",
                              background: isYearOpen ? "linear-gradient(135deg,#e0edff,#eef5ff)" : THEME.subBg2,
                              fontWeight: 1000,
                              fontSize: 13,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              color: isYearOpen ? "#1e40af" : THEME.textStrong,
                              transition: "all .15s",
                            }}
                          >
                            <span>📁 {year}</span>
                            <span style={{ color: isYearOpen ? "#3b82f6" : THEME.muted }}>
                              {isYearOpen ? "▾" : "▸"}
                            </span>
                          </button>

                          {isYearOpen && (
                            <div style={{ padding: 10, display: "grid", gap: 8 }}>
                              {months.map((month) => {
                                const mKey = `${year}_${month}`;
                                const isMonthOpen = !!openMonths[mKey];
                                const daysObj = monthsObj[month] || {};
                                const days = Object.keys(daysObj).sort((a, b) =>
                                  String(b).localeCompare(String(a))
                                );

                                return (
                                  <div
                                    key={mKey}
                                    style={{
                                      border: `1px solid ${THEME.line}`,
                                      borderRadius: 10,
                                      overflow: "hidden",
                                      background: "#fff",
                                    }}
                                  >
                                    <button
                                      onClick={() =>
                                        setOpenMonths((p) => ({
                                          ...p,
                                          [mKey]: !p[mKey],
                                        }))
                                      }
                                      style={{
                                        width: "100%",
                                        textAlign: "left",
                                        padding: "8px 10px",
                                        cursor: "pointer",
                                        border: "none",
                                        background: isMonthOpen ? "#dbeafe" : "#f8fafc",
                                        fontWeight: 900,
                                        fontSize: 12,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        color: isMonthOpen ? "#1e40af" : THEME.textStrong,
                                        transition: "all .12s",
                                      }}
                                    >
                                      <span>📂 {month}</span>
                                      <span style={{ color: isMonthOpen ? "#3b82f6" : THEME.muted }}>
                                        {isMonthOpen ? "▾" : "▸"}
                                      </span>
                                    </button>

                                    {isMonthOpen && (
                                      <div
                                        style={{
                                          padding: 8,
                                          display: "grid",
                                          gap: 6,
                                          background: "#f8fafc",
                                        }}
                                      >
                                        {days.map((day) => {
                                          const dKey = `${year}_${month}_${day}`;
                                          const isDayOpen = !!openDays[dKey];
                                          const list = daysObj[day] || [];
                                          return (
                                            <div
                                              key={dKey}
                                              style={{
                                                border: `1px solid ${THEME.line}`,
                                                borderRadius: 8,
                                                overflow: "hidden",
                                                background: "#fff",
                                              }}
                                            >
                                              <button
                                                onClick={() =>
                                                  setOpenDays((p) => ({
                                                    ...p,
                                                    [dKey]: !p[dKey],
                                                  }))
                                                }
                                                style={{
                                                  width: "100%",
                                                  textAlign: "left",
                                                  padding: "8px 10px",
                                                  cursor: "pointer",
                                                  border: "none",
                                                  background: isDayOpen ? "#ede9fe" : "#fff",
                                                  fontWeight: 900,
                                                  fontSize: 12,
                                                  display: "flex",
                                                  justifyContent: "space-between",
                                                  alignItems: "center",
                                                  color: isDayOpen ? "#5b21b6" : THEME.textStrong,
                                                  transition: "all .12s",
                                                }}
                                              >
                                                <span>📅 {day}</span>
                                                <span style={{
                                                  display: "flex", gap: 6, alignItems: "center",
                                                  color: isDayOpen ? "#7c3aed" : THEME.muted,
                                                }}>
                                                  <span style={{
                                                    background: "#dbeafe",
                                                    color: "#1e40af",
                                                    padding: "1px 7px",
                                                    borderRadius: 999,
                                                    fontSize: 10,
                                                    fontWeight: 1000,
                                                  }}>{list.length}</span>
                                                  {isDayOpen ? "▾" : "▸"}
                                                </span>
                                              </button>

                                              {isDayOpen && (
                                                <div
                                                  style={{
                                                    padding: 8,
                                                    display: "grid",
                                                    gap: 6,
                                                    background: "#f8fafc",
                                                  }}
                                                >
                                                  {list.map((r, i) => {
                                                    const active =
                                                      selected && getId(selected) === getId(r);
                                                    return (
                                                      <button
                                                        key={getId(r) || i}
                                                        onClick={() => openSession(r)}
                                                        style={{
                                                          width: "100%",
                                                          textAlign: "left",
                                                          borderRadius: 8,
                                                          border: active
                                                            ? "2px solid #6366f1"
                                                            : `1px solid ${THEME.line}`,
                                                          background: active ? "#eef2ff" : "#fff",
                                                          padding: "8px 10px",
                                                          cursor: "pointer",
                                                          boxShadow: active
                                                            ? "0 4px 10px rgba(99,102,241,0.15)"
                                                            : "0 1px 2px rgba(15,23,42,0.04)",
                                                          color: THEME.text,
                                                          transition: "all .12s",
                                                        }}
                                                      >
                                                        <div style={{
                                                          fontWeight: 900, color: THEME.textStrong,
                                                          fontSize: 12, lineHeight: 1.3,
                                                          overflow: "hidden",
                                                          display: "-webkit-box",
                                                          WebkitLineClamp: 2,
                                                          WebkitBoxOrient: "vertical",
                                                        }}>
                                                          {safeTitle(r) || "Training Session"}
                                                        </div>
                                                        <div
                                                          style={{
                                                            marginTop: 4,
                                                            display: "flex",
                                                            gap: 4,
                                                            flexWrap: "wrap",
                                                          }}
                                                        >
                                                          <span style={{
                                                            fontSize: 9, fontWeight: 800,
                                                            color: "#5b21b6",
                                                            background: "#ede9fe",
                                                            padding: "2px 6px",
                                                            borderRadius: 999,
                                                          }}>
                                                            📚 {getModuleName(safeModule(r), globalLang) || "—"}
                                                          </span>
                                                          <span style={{
                                                            fontSize: 9, fontWeight: 800,
                                                            color: "#334155",
                                                            background: "#f1f5f9",
                                                            padding: "2px 6px",
                                                            borderRadius: 999,
                                                          }}>
                                                            🏢 {safeBranch(r) || "—"}
                                                          </span>
                                                        </div>
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        </div>

        {/* LEFT: Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            <div style={{ ...glass, padding: 18, minHeight: "calc(100vh - 220px)" }}>
              <div style={{ fontWeight: 1100, color: THEME.textStrong, fontSize: 16 }}>
                📌 Session Details
              </div>
              <div style={{ marginTop: 10, color: THEME.muted, fontWeight: 900 }}>
                Select a training session from the right panel to view details here.
              </div>
            </div>
          ) : (
            <div style={{ ...glass, padding: 14, minHeight: "calc(100vh - 220px)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 1100, fontSize: 16, color: THEME.textStrong }}>
                    📌 Session Details
                  </div>
                  <div style={{ marginTop: 6, color: THEME.textStrong, fontWeight: 1000 }}>
                    {safeTitle(selected)}
                  </div>
                  <div style={{ marginTop: 6, color: THEME.muted, fontSize: 13, fontWeight: 800 }}>
                    Date: {safeDate(selected)} — Branch: {safeBranch(selected)} — Module:{" "}
                    {getModuleName(safeModule(selected), globalLang)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setRefOpen(true)}
                    disabled={deletingSession}
                    style={{
                      ...btn("violet"),
                      background: 'linear-gradient(135deg,#4338ca,#6366f1)',
                      boxShadow: '0 2px 8px rgba(99,102,241,.35)',
                    }}
                    title="Open trainer reference card for this module"
                  >
                    📖 References
                  </button>

                  <button
                    onClick={deleteTrainingSession}
                    disabled={deletingSession || loading}
                    style={{
                      ...btn("red"),
                      opacity: deletingSession ? 0.75 : 1,
                      cursor: deletingSession ? "not-allowed" : "pointer",
                    }}
                    title="Delete training session"
                   data-delete-action="true">
                    {deletingSession ? "Deleting..." : "🗑 Delete Training"}
                  </button>

                  <button onClick={closeSession} style={btn("light")} disabled={deletingSession}>
                    ✖ Close
                  </button>
                </div>
              </div>

              {/* ✅ ONE LINK BAR */}
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid #bae6fd",
                  background: "linear-gradient(180deg,#f0f9ff,#e6f4ff)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge text="Trainee Link (One for all)" tone="violet" />
                    <Badge text={`Module: ${moduleName || "-"}`} tone="gray" />
                    {sessionLevel ? <Badge text={`Level: ${sessionLevel}`} tone="blue" /> : null}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={copySessionLink}
                      disabled={linkBusy || deletingSession}
                      style={{ ...btn("violet"), opacity: linkBusy ? 0.75 : 1 }}
                    >
                      {linkBusy ? "Working..." : "🔗 Generate & Copy Link"}
                    </button>
                    <button
                      onClick={openSessionLink}
                      disabled={linkBusy || deletingSession}
                      style={btn("light")}
                    >
                      ↗ Open
                    </button>
                  </div>
                </div>

                {sessionLink ? (
                  <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted, fontWeight: 900 }}>
                    Link: <span style={{ userSelect: "all", color: THEME.textStrong }}>{sessionLink}</span>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted, fontWeight: 900 }}>
                    Click “Generate & Copy Link” to create the session link.
                  </div>
                )}
              </div>

              {/* ✅ Objectives */}
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid #ddd6fe",
                  background: "linear-gradient(180deg,#f8f6ff,#f1eeff)",
                }}
              >
                <div style={{ fontWeight: 1100, color: THEME.textStrong }}>
                  🎯 Objectives / Frequency / Evaluation
                </div>

                {objectivesText.trim() ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid #e9e5ff",
                      background: "#fcfbff",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.7,
                      fontWeight: 700,
                      color: THEME.text,
                    }}
                  >
                    {objectivesText}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: THEME.muted, fontWeight: 900 }}>
                    No objectives found for this session.
                  </div>
                )}
              </div>

              {sessionStats && (
                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10,
                  }}
                >
                  <KPI label="Participants" value={sessionStats.total} tone="violet" />
                  <KPI label="PASS" value={sessionStats.pass} tone="green" />
                  <KPI label="FAIL" value={sessionStats.fail} tone="red" />
                  <KPI label="Pass Rate" value={`${sessionStats.rate}%`} tone="blue" />
                  <KPI label="Average Score" value={`${sessionStats.avg}%`} tone="gray" />
                </div>
              )}

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Badge text={`Questions: ${questions.length}`} tone="blue" />
                  <Badge text={`Pass Mark: ${PASS_MARK}%`} tone="green" />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={addRow} style={btn("light")} disabled={deletingSession}>
                    ➕ Add Row
                  </button>
                  <button onClick={add5Rows} style={btn("light")} disabled={deletingSession}>
                    ➕ Add 5 Rows
                  </button>
                  <button
                    onClick={saveParticipants}
                    disabled={savingParticipants || deletingSession}
                    style={{
                      ...btn("dark"),
                      opacity: savingParticipants ? 0.7 : 1,
                      cursor: savingParticipants ? "not-allowed" : "pointer",
                    }}
                  >
                    {savingParticipants ? "Saving..." : "💾 Save Participants"}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      {["SL", "NAME", "DESIGNATION", "EMP ID", "SCORE", "RESULT", "LAST QUIZ", "CERT", ""].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: 12,
                              background: THEME.tableHeadBg,
                              borderTop: `1px solid ${THEME.lineStrong}`,
                              borderBottom: `1px solid ${THEME.lineStrong}`,
                              fontWeight: 1100,
                              whiteSpace: "nowrap",
                              position: "sticky",
                              top: 0,
                              zIndex: 1,
                              color: THEME.textStrong,
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 14, color: THEME.muted, fontWeight: 900 }}>
                          No participants yet. Anyone who submits the session link will appear here automatically ✅
                        </td>
                      </tr>
                    ) : (
                      participants.map((p, idx) => {
                        const res = String(p.result || "").toUpperCase();
                        const hasAnswers = !!p?.quizAttempt?.answers?.length;
                        return (
                          <tr key={idx}>
                            <td
                              style={{
                                padding: 12,
                                borderBottom: `1px solid rgba(148,163,184,0.14)`,
                                whiteSpace: "nowrap",
                                fontWeight: 900,
                                color: THEME.text,
                              }}
                            >
                              {p.slNo}
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, minWidth: 240 }}>
                              <input
                                value={p.name || ""}
                                onChange={(e) => updateCell(idx, "name", e.target.value)}
                                placeholder="Participant name"
                                style={inputStyle}
                              />
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, minWidth: 220 }}>
                              <input
                                value={p.designation || ""}
                                onChange={(e) => updateCell(idx, "designation", e.target.value)}
                                placeholder="Designation"
                                style={inputStyle}
                              />
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, minWidth: 160 }}>
                              <input
                                value={p.employeeId || ""}
                                onChange={(e) => updateCell(idx, "employeeId", e.target.value)}
                                placeholder="Employee ID"
                                style={inputStyle}
                              />
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                              <Badge text={`${String(p.score || "").replace("%", "") || "-"}%`} tone="blue" />
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                              {res === "PASS" ? (
                                <Badge text="PASS" tone="green" />
                              ) : res === "FAIL" ? (
                                <Badge text="FAIL" tone="red" />
                              ) : (
                                <Badge text="-" tone="gray" />
                              )}
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <Badge text={p.lastQuizAt || "-"} tone="gray" />
                                {hasAnswers ? <Badge text="Answers Saved" tone="amber" /> : null}
                              </div>
                            </td>

                            {/* Certificate column */}
                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                              {res === "PASS" ? (
                                <button
                                  onClick={() => setCertData({ participant: p, idx })}
                                  style={{
                                    padding:'7px 12px', borderRadius:10, border:'1.5px solid #fde68a',
                                    background:'linear-gradient(135deg,#fef9c3,#fef3c7)',
                                    color:'#92400e', fontWeight:800, fontSize:11.5,
                                    cursor:'pointer', whiteSpace:'nowrap',
                                    boxShadow:'0 1px 4px rgba(245,158,11,.2)',
                                  }}
                                  title="Print achievement certificate"
                                >
                                  🏆 Certificate
                                </button>
                              ) : (
                                <span style={{ fontSize:11, color:'#cbd5e1' }}>—</span>
                              )}
                            </td>

                            <td style={{ padding: 12, borderBottom: `1px solid rgba(148,163,184,0.14)`, whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button onClick={() => startQuiz(idx)} style={btn("blue")} disabled={deletingSession}>
                                  🧪 Start Quiz (Admin)
                                </button>

                                <button
                                  onClick={() => openAnswers(idx)}
                                  disabled={!hasAnswers || deletingSession}
                                  style={{
                                    ...btn("light"),
                                    opacity: hasAnswers ? 1 : 0.5,
                                    cursor: hasAnswers ? "pointer" : "not-allowed",
                                  }}
                                  title={hasAnswers ? "View saved answers" : "No saved answers yet"}
                                >
                                  👁 View Answers
                                </button>

                                <button
                                  onClick={() => removeRow(idx)}
                                  disabled={deletingSession}
                                  style={{
                                    padding: "10px 12px",
                                    borderRadius: 12,
                                    border: "1px solid #fecaca",
                                    background: "#fef2f2",
                                    color: "#b91c1c",
                                    cursor: "pointer",
                                    fontWeight: 1000,
                                    opacity: deletingSession ? 0.6 : 1,
                                  }}
                                 data-delete-action="true">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 10, color: THEME.muted, fontSize: 13, fontWeight: 900 }}>
                ✅ Anyone submits the session link → saved on server → appears here automatically.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================== QUIZ MODAL (Admin manual) ===================== */}
      <Modal
        show={quizOpen && !!activeParticipant}
        title={`🧪 Quiz: ${activeParticipant?.name || ""} — ${moduleName || ""}`}
        onClose={() => (quizSaving ? null : closeQuiz())}
        footer={[
          <button
            key="close"
            onClick={() => (quizSaving ? null : closeQuiz())}
            style={btn("light")}
            disabled={quizSaving}
          >
            Close
          </button>,
          <button
            key="submit"
            onClick={submitQuiz}
            style={{
              ...btn("dark"),
              opacity: quizSaving ? 0.75 : 1,
              cursor: quizSaving ? "not-allowed" : "pointer",
            }}
            disabled={quizSaving}
          >
            {quizSaving ? "Saving..." : "✅ Submit & Save"}
          </button>,
        ]}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge text={`Questions: ${questions.length}`} tone="blue" />
            <Badge text={`Pass Mark: ${PASS_MARK}%`} tone="green" />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setQuizLang("EN")}
              style={{
                ...btn(quizLang === "EN" ? "dark" : "light"),
                padding: "8px 10px",
              }}
            >
              EN
            </button>
            <button
              onClick={() => setQuizLang("AR")}
              style={{
                ...btn(quizLang === "AR" ? "dark" : "light"),
                padding: "8px 10px",
              }}
            >
              عربي
            </button>
          </div>
        </div>

        {!moduleName || questions.length === 0 ? (
          <div style={{ color: "#b91c1c", fontWeight: 1000 }}>
            No question bank for this module yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {questions.map((qq, i) => {
              const qText = quizLang === "AR" ? (qq.q_ar || qq.q_en) : (qq.q_en || qq.q_ar);
              const opts = quizLang === "AR"
                ? (qq.options_ar?.length ? qq.options_ar : (qq.options_en || []))
                : (qq.options_en?.length ? qq.options_en : (qq.options_ar || []));

              return (
                <div
                  key={i}
                  style={{
                    ...surface,
                    padding: 14,
                    direction: quizLang === "AR" ? "rtl" : "ltr",
                  }}
                >
                  <div style={{ fontWeight: 1100, marginBottom: 10, color: THEME.textStrong }}>
                    {i + 1}) {qText}
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {opts.map((opt, oi) => {
                      const checked = quizAnswers[i] === oi;
                      return (
                        <label
                          key={oi}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 14,
                            border: `1px solid ${
                              checked ? "#818cf8" : THEME.line
                            }`,
                            cursor: "pointer",
                            background: checked ? "#eef2ff" : "#f8fafc",
                            fontWeight: 700,
                            color: THEME.textStrong,
                          }}
                        >
                          <input
                            type="radio"
                            name={`q_${i}`}
                            checked={checked}
                            onChange={() => setQuizAnswers((prev) => ({ ...prev, [i]: oi }))}
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ===================== VIEW ANSWERS MODAL ===================== */}
      <Modal
        show={viewOpen && !!viewParticipant}
        title={`👁 Answers: ${viewParticipant?.name || ""} — ${
          viewParticipant?.quizAttempt?.module || moduleName || ""
        }`}
        onClose={closeAnswers}
        footer={[
          <button key="close" onClick={closeAnswers} style={btn("dark")}>
            Close
          </button>,
        ]}
      >
        {!(viewParticipant?.quizAttempt?.answers?.length) ? (
          <div style={{ color: "#b91c1c", fontWeight: 1000 }}>No saved answers.</div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Badge text={`Score: ${viewParticipant.quizAttempt.score}%`} tone="blue" />
                <Badge
                  text={`Result: ${viewParticipant.quizAttempt.result}`}
                  tone={String(viewParticipant.quizAttempt.result).toUpperCase() === "PASS" ? "green" : "red"}
                />
                <Badge
                  text={`Saved: ${String(viewParticipant.quizAttempt.submittedAt || "").slice(0, 10) || "-"}`}
                  tone="gray"
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setViewLang("EN")}
                  style={{
                    ...btn(viewLang === "EN" ? "dark" : "light"),
                    padding: "8px 10px",
                  }}
                >
                  EN
                </button>
                <button
                  onClick={() => setViewLang("AR")}
                  style={{
                    ...btn(viewLang === "AR" ? "dark" : "light"),
                    padding: "8px 10px",
                  }}
                >
                  عربي
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {viewParticipant.quizAttempt.answers.map((a, i) => {
                const qText = viewLang === "AR" ? (a.q_ar || a.q_en) : (a.q_en || a.q_ar);
                const opts = viewLang === "AR"
                  ? (a.options_ar?.length ? a.options_ar : (a.options_en || []))
                  : (a.options_en?.length ? a.options_en : (a.options_ar || []));

                const chosen = typeof a.chosen === "number" ? a.chosen : -1;
                const correct = typeof a.correct === "number" ? a.correct : -1;

                return (
                  <div
                    key={i}
                    style={{
                      ...surface,
                      padding: 14,
                      direction: viewLang === "AR" ? "rtl" : "ltr",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontWeight: 1100, color: THEME.textStrong }}>
                        {i + 1}) {qText}
                      </div>
                      {chosen === correct ? (
                        <Badge text="Correct" tone="green" />
                      ) : (
                        <Badge text="Wrong" tone="red" />
                      )}
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {opts.map((opt, oi) => {
                        const isChosen = oi === chosen;
                        const isCorrect = oi === correct;

                        let border = THEME.line;
                        let bg = "#f8fafc";
                        if (isCorrect) {
                          border = "#bbf7d0";
                          bg = "#f0fdf4";
                        }
                        if (isChosen && !isCorrect) {
                          border = "#fecaca";
                          bg = "#fef2f2";
                        }

                        return (
                          <div
                            key={oi}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 14,
                              border: `1px solid ${border}`,
                              background: bg,
                              fontWeight: 900,
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              alignItems: "center",
                              color: THEME.text,
                            }}
                          >
                            <div>{opt}</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {isChosen ? <Badge text="Chosen" tone="blue" /> : null}
                              {isCorrect ? <Badge text="Correct" tone="green" /> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>

      <div style={{ marginTop: 14, textAlign: "center", color: "#64748b", fontWeight: 700, fontSize: "0.85rem" }}>
        Built by Eng. Mohammed Abdullah
      </div>

      {/* ── Certificate Modal ── */}
      {certData && selected && (
        <CertificateModal
          open={!!certData}
          onClose={() => setCertData(null)}
          participant={certData.participant}
          session={selected}
          moduleName={moduleName}
          branch={safeBranch(selected)}
          date={safeDate(selected)}
          conductedBy={selected?.payload?.conductedBy || ''}
          lang={globalLang}
        />
      )}

      {/* ── Trainer Reference Card Modal ── */}
      {selected && (
        <TrainingReferenceModal
          open={refOpen}
          onClose={() => setRefOpen(false)}
          moduleName={moduleName}
          branch={safeBranch(selected)}
          date={safeDate(selected)}
          details={MODULE_DETAILS_BI[moduleName] || selected?.payload?.details || ''}
          objectives={selected?.payload?.objectives || ''}
          conductedBy={selected?.payload?.conductedBy || ''}
          quickCheckQuestions={(() => {
            const live = lookupBank(liveQuizBank, moduleName);
            return (live.length ? live : lookupBank(QUIZ_BANK, moduleName)).slice(0, 5);
          })()}
        />
      )}
    </div>
  );
}

/* ============== KPI Card (matches Mock Recall View style) ============== */
function KPICardLocal({ icon, label, value, sub, accent = "#1e40af", bad }) {
  return (
    <div
      style={{
        flex: "1 1 180px",
        minWidth: 180,
        background: "#fff",
        border: "1px solid #eceef3",
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 10px 28px rgba(16,24,40,.05)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 4,
          background: bad ? "#ef4444" : accent,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: 10, fontSize: 17,
            background: bad ? "#fef2f2" : `${accent}14`,
          }}
        >
          {icon}
        </span>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: "1.9rem",
          fontWeight: 800,
          color: bad ? "#b91c1c" : "#1e293b",
          lineHeight: 1.1,
          marginTop: 10,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}