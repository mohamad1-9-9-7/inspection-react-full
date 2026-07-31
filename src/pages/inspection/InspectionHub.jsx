// src/pages/inspection/InspectionHub.jsx
// Landing page for the Inspector icon: instead of jumping straight into the
// entry form, show the module's sections (enter · view · annual schedule).
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiClipboard,
  FiFileText,
  FiHome,
  FiSearch,
  FiCpu,
} from "react-icons/fi";
import logo from "../../assets/almawashi-logo.jpg";
import API_BASE from "../../config/api";
import { parseReportDate, resolveReportBranch } from "./inspectionBranches";

const AUDIT_TYPE = "internal_multi_audit";

const CARDS = [
  {
    to: "/inspection/new",
    Icon: FiClipboard,
    en: "New Inspection Report",
    ar: "إدخال تقرير تفتيش",
    descEn: "Fill the internal audit / CAPA form and save it online with photo evidence.",
    descAr: "تعبئة نموذج التدقيق الداخلي والإجراءات التصحيحية وحفظه مع صور الأدلة.",
    tone: "blue",
    actionEn: "Enter",
    actionAr: "إدخال",
  },
  {
    to: "/monitor/internal-audit",
    Icon: FiFileText,
    en: "View Inspection Reports",
    ar: "عرض تقارير التفتيش",
    descEn: "Browse, filter, print and e-mail saved audit reports per branch and date.",
    descAr: "تصفح وفلترة وطباعة وإرسال التقارير المحفوظة حسب الفرع والتاريخ.",
    tone: "teal",
    actionEn: "Browse",
    actionAr: "تصفح",
  },
  {
    to: "/inspection/annual-plan",
    Icon: FiCalendar,
    en: "Annual Inspection Schedule",
    ar: "جدول التفتيش السنوي",
    descEn: "Branches × months register — every branch needs at least one inspection per month.",
    descAr: "سجل الأفرع × الأشهر — كل فرع يحتاج تفتيشاً واحداً على الأقل شهرياً.",
    tone: "green",
    actionEn: "Register",
    actionAr: "سجل",
  },
  {
    to: "/ai-assistant",
    Icon: FiCpu,
    en: "AI Assistant",
    ar: "المساعد الذكي",
    descEn: "Ask about findings, corrective actions and how to use the system.",
    descAr: "اسأل عن الملاحظات والإجراءات التصحيحية وطريقة استخدام النظام.",
    tone: "purple",
    actionEn: "Ask",
    actionAr: "اسأل",
  },
];

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
}
function unwrapList(data) {
  return Array.isArray(data) ? data
    : Array.isArray(data?.items) ? data.items
    : Array.isArray(data?.data) ? data.data
    : Array.isArray(data?.reports) ? data.reports
    : [];
}

export default function InspectionHub() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("internal_audit_lang") || "en"; } catch { return "en"; }
  });
  const isAr = lang === "ar";
  const [query, setQuery] = useState("");
  const [coverage, setCoverage] = useState(null); // { done, total, month, year }
  const currentUser = getCurrentUser();
  const displayName = currentUser.displayName || currentUser.username || "User";

  const toggleLang = () => {
    const next = isAr ? "en" : "ar";
    setLang(next);
    try { localStorage.setItem("internal_audit_lang", next); } catch {}
  };

  /* This month's coverage — reinforces the "1 inspection per branch per month" rule */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(AUDIT_TYPE)}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const list = unwrapList(await res.json());
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const active = new Set();  // branches that have any report this year
        const covered = new Set(); // branches inspected this month
        for (const r of list) {
          const header = r?.payload?.header || {};
          const d = parseReportDate(header.date || r?.reportDate || r?.created_at || r?.createdAt);
          if (!d || d.getFullYear() !== y) continue;
          const { code } = resolveReportBranch(r);
          if (!code) continue;
          active.add(code);
          if (d.getMonth() + 1 === m) covered.add(code);
        }
        if (!alive) return;
        setCoverage({ done: covered.size, total: active.size, month: m, year: y });
      } catch { /* stat is optional — never block the hub */ }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CARDS;
    return CARDS.filter((c) =>
      `${c.en} ${c.ar} ${c.descEn} ${c.descAr}`.toLowerCase().includes(q)
    );
  }, [query]);

  const coverageText = !coverage
    ? (isAr ? "جارٍ حساب تغطية الشهر…" : "Loading this month's coverage…")
    : coverage.total === 0
    ? (isAr ? "لا توجد تقارير تفتيش هذه السنة" : "No inspection reports this year")
    : isAr
    ? `${coverage.done}/${coverage.total} فرع تم تفتيشه هذا الشهر`
    : `${coverage.done}/${coverage.total} branches inspected this month`;
  const coverageOk = coverage && coverage.total > 0 && coverage.done >= coverage.total;
  const coverageWarn = coverage && coverage.total > 0 && coverage.done < coverage.total;

  return (
    <main className="ih-page" dir={isAr ? "rtl" : "ltr"}>
      <style>{`
        .ih-page{
          min-height:100vh;
          padding:14px clamp(12px,2.4vw,28px) 22px;
          background:linear-gradient(180deg,#f4f8f7 0%,#edf5f3 100%);
          color:#0f172a;font-family:Cairo,Arial,sans-serif;box-sizing:border-box;
        }
        .ih-shell{width:min(1180px,100%);margin:0 auto}
        .ih-hero{
          display:flex;align-items:center;justify-content:space-between;gap:18px;
          padding:18px clamp(16px,2vw,26px);border-radius:6px;
          background:linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%);
          color:#fff;box-shadow:0 22px 50px rgba(15,23,42,.16);
        }
        .ih-brand{display:flex;align-items:center;gap:14px;min-width:0}
        .ih-logo{width:58px;height:58px;object-fit:cover;border-radius:6px;
          border:1px solid rgba(255,255,255,.5);background:#fff;flex:0 0 auto}
        .ih-kicker{font-size:12px;line-height:1.3;font-weight:900;opacity:.85;margin-bottom:4px}
        .ih-title{margin:0;font-size:16px;line-height:1.35;font-weight:1000}
        .ih-sub{margin:4px 0 0;color:rgba(255,255,255,.88);font-size:14px;line-height:1.45;font-weight:700}
        .ih-actions{display:flex;gap:8px;align-items:stretch;flex-wrap:wrap;justify-content:flex-end}
        .ih-topBtn,.ih-userBox{
          min-height:38px;border:1px solid rgba(255,255,255,.26);
          background:rgba(255,255,255,.12);color:#fff;border-radius:5px;
          display:flex;align-items:center;gap:8px;padding:8px 10px;
          font-size:14px;font-weight:900;text-decoration:none;box-sizing:border-box;
          cursor:pointer;font-family:inherit;
        }
        .ih-avatar{width:30px;height:30px;border-radius:5px;display:grid;place-items:center;
          background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.25);font-weight:1000}
        .ih-toolbar{margin:14px 0;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center}
        .ih-search,.ih-stat{
          min-height:38px;background:#fff;border:1px solid #dbe4e2;border-radius:6px;
          box-shadow:0 10px 24px rgba(15,23,42,.05);box-sizing:border-box;
        }
        .ih-search{display:flex;align-items:center;gap:8px;padding:9px 12px}
        .ih-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;
          color:#0f172a;font-family:inherit;font-size:14px}
        .ih-stat{padding:9px 12px;font-size:14px;font-weight:900;white-space:nowrap;display:flex;align-items:center;gap:6px}
        .ih-stat.ok{border-color:#a7f3d0;background:#ecfdf5;color:#065f46}
        .ih-stat.warn{border-color:#fecaca;background:#fef2f2;color:#991b1b}
        .ih-sectionHead{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:0 0 10px}
        .ih-sectionHead h2{margin:0;font-size:16px;line-height:1.35;font-weight:1000;color:#0f172a}
        .ih-sectionHead span{color:#64748b;font-size:14px;font-weight:800}
        .ih-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        .ih-card{
          min-height:156px;display:flex;flex-direction:column;gap:12px;padding:14px;
          border:1px solid #dbe4e2;background:#fff;border-radius:6px;text-decoration:none;color:#0f172a;
          box-shadow:0 12px 30px rgba(15,23,42,.06);
          transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;
          cursor:pointer;text-align:left;font-family:inherit;
        }
        [dir="rtl"] .ih-card{text-align:right}
        .ih-card:hover{transform:translateY(-2px);border-color:#93c5bd;box-shadow:0 18px 36px rgba(15,23,42,.1)}
        .ih-cardIcon{width:38px;height:38px;border-radius:6px;display:grid;place-items:center;color:#fff;
          box-shadow:0 10px 20px rgba(15,23,42,.14)}
        .ih-tone-blue{background:linear-gradient(135deg,#2563eb,#1d4ed8)}
        .ih-tone-teal{background:linear-gradient(135deg,#0f766e,#14b8a6)}
        .ih-tone-green{background:linear-gradient(135deg,#10b981,#059669)}
        .ih-tone-purple{background:linear-gradient(135deg,#8b5cf6,#6d28d9)}
        .ih-cardBody{flex:1}
        .ih-cardTop{display:flex;justify-content:flex-end;margin-top:-42px;pointer-events:none}
        [dir="rtl"] .ih-cardTop{justify-content:flex-start}
        .ih-chip{background:#f1f5f9;color:#334155;border-radius:999px;padding:5px 9px;
          font-size:12px;line-height:1;font-weight:1000}
        .ih-card h3{margin:10px 0 6px;font-size:16px;line-height:1.35;font-weight:1000;color:#0f172a}
        .ih-card p{margin:0;color:#475569;font-size:14px;line-height:1.5;font-weight:700}
        .ih-cardFoot{border-top:1px solid #e5ecea;padding-top:10px;display:flex;justify-content:space-between;
          align-items:center;gap:8px;color:#0f766e;font-size:14px;font-weight:1000}
        .ih-rule{
          margin:14px 0 0;padding:12px 14px;border-radius:6px;background:#fff;
          border:1px solid #dbe4e2;border-left:5px solid #0f766e;
          font-size:14px;font-weight:800;color:#334155;box-shadow:0 10px 24px rgba(15,23,42,.05);
        }
        [dir="rtl"] .ih-rule{border-left:1px solid #dbe4e2;border-right:5px solid #0f766e}
        .ih-empty{background:#fff;border:1px dashed #cbd5e1;border-radius:6px;padding:18px;
          color:#475569;font-size:14px;font-weight:800;text-align:center}
        .ih-footer{margin:18px 0 0;text-align:center;color:#64748b;font-size:12px;font-weight:800}
        @media (max-width:900px){
          .ih-hero{align-items:flex-start;flex-direction:column}
          .ih-actions{justify-content:flex-start}
          .ih-toolbar{grid-template-columns:1fr 1fr}
          .ih-search{grid-column:1 / -1}
          .ih-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
        @media (max-width:560px){
          .ih-page{padding:10px 10px 18px}
          .ih-logo{width:48px;height:48px}
          .ih-actions,.ih-topBtn,.ih-userBox{width:100%}
          .ih-toolbar{grid-template-columns:1fr}
          .ih-stat{white-space:normal}
          .ih-grid{grid-template-columns:1fr}
        }
      `}</style>

      <div className="ih-shell">
        <header className="ih-hero">
          <div className="ih-brand">
            <img className="ih-logo" src={logo} alt="Al Mawashi" />
            <div>
              <div className="ih-kicker">AL MAWASHI QMS</div>
              <h1 className="ih-title">{isAr ? "التفتيش / التدقيق الداخلي" : "Inspection / Internal Audit"}</h1>
              <p className="ih-sub">
                {isAr
                  ? "إدخال تقارير التفتيش، عرضها، ومتابعة الجدول السنوي لكل فرع"
                  : "Record inspections, browse reports, and track the annual schedule per branch"}
              </p>
            </div>
          </div>

          <div className="ih-actions">
            <div className="ih-userBox">
              <span className="ih-avatar">{String(displayName || "U").slice(0, 1).toUpperCase()}</span>
              <span>{displayName}</span>
            </div>
            <button className="ih-topBtn" onClick={toggleLang}>{isAr ? "EN" : "ع"}</button>
            <button className="ih-topBtn" onClick={() => navigate("/named-dashboard")}>
              <FiHome size={15} />
              <span>{isAr ? "الرئيسية" : "Dashboard Home"}</span>
            </button>
            <button className="ih-topBtn" onClick={() => navigate(-1)}>
              <FiArrowLeft size={15} />
              <span>{isAr ? "رجوع" : "Back"}</span>
            </button>
          </div>
        </header>

        <div className="ih-toolbar">
          <label className="ih-search">
            <FiSearch size={16} color="#64748b" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? "ابحث في أقسام التفتيش..." : "Find an inspection section..."}
            />
          </label>
          <div className="ih-stat">{CARDS.length} {isAr ? "أقسام" : "Sections"}</div>
          <button
            type="button"
            className={`ih-stat ${coverageOk ? "ok" : coverageWarn ? "warn" : ""}`}
            onClick={() => navigate("/inspection/annual-plan")}
            title={isAr ? "افتح الجدول السنوي" : "Open the annual schedule"}
            style={{ cursor: "pointer", fontFamily: "inherit" }}
          >
            📅 {coverageText}
          </button>
        </div>

        <section aria-label="Inspection pages">
          <div className="ih-sectionHead">
            <h2>{isAr ? "أقسام التفتيش" : "Inspection Pages"}</h2>
            <span>{isAr ? "إدخال، عرض، وجدولة سنوية" : "Enter, browse, and schedule"}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="ih-empty">{isAr ? "لا يوجد قسم مطابق." : "No matching section found."}</div>
          ) : (
            <div className="ih-grid">
              {filtered.map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.to}
                    type="button"
                    className="ih-card"
                    onClick={() => navigate(item.to)}
                    aria-label={isAr ? item.ar : item.en}
                  >
                    <div className={`ih-cardIcon ih-tone-${item.tone}`}>
                      <Icon size={18} />
                    </div>
                    <div className="ih-cardBody">
                      <div className="ih-cardTop">
                        <span className="ih-chip">{isAr ? item.actionAr : item.actionEn}</span>
                      </div>
                      <h3>{isAr ? item.ar : item.en}</h3>
                      <p>{isAr ? item.descAr : item.descEn}</p>
                    </div>
                    <div className="ih-cardFoot">
                      <span>{isAr ? "فتح القسم" : "Open section"}</span>
                      <FiArrowRight size={14} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="ih-rule">
          {isAr
            ? "📌 القاعدة: كل فرع يجب أن يخضع لتفتيش واحد على الأقل شهرياً — الجدول السنوي يعرض الأشهر الناقصة باللون الأحمر."
            : "📌 Rule: every branch must be inspected at least once per month — the annual schedule flags uncovered months in red."}
        </div>

        <div className="ih-footer">Built by Eng. Mohammed Abdullah</div>
      </div>
    </main>
  );
}
