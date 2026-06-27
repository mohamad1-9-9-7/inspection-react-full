// src/pages/training/TrainingHome.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiHome,
  FiSearch,
  FiSettings,
} from "react-icons/fi";
import logo from "../../assets/almawashi-logo.jpg";
import { useGlobalLang } from "./TrainingSessionsList.helpers";

const cards = [
  {
    to: "/training/create",
    Icon: FiClipboard,
    label: "Create New Training",
    ar: "إنشاء تدريب جديد",
    desc: "Create a session, attach the question bank, and save it online.",
    tone: "teal",
    action: "Create",
  },
  {
    to: "/training/sessions",
    Icon: FiBookOpen,
    label: "Training Library",
    ar: "مكتبة التدريب",
    desc: "Browse sessions, add participants, run quizzes, and track KPIs.",
    tone: "blue",
    action: "Browse",
  },
  {
    to: "/training/annual-plan",
    Icon: FiCalendar,
    label: "Annual Training Plan",
    ar: "الخطة السنوية للتدريب",
    desc: "Plan required training per branch and month.",
    tone: "green",
    action: "Plan",
  },
  {
    to: "/training/admin",
    Icon: FiSettings,
    label: "Training Admin",
    ar: "إدارة التدريب",
    desc: "Manage modules, questions, references, and settings.",
    tone: "cyan",
    action: "Admin",
  },
  {
    to: "/training/gap-analysis",
    Icon: FiSearch,
    label: "Training Gap Analysis",
    ar: "تحليل فجوات التدريب",
    desc: "Review missing sessions, participant coverage, and pass rates.",
    tone: "orange",
    action: "Analyze",
  },
];

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

function toneClass(tone) {
  return `tm-tone-${tone || "teal"}`;
}

export default function TrainingHome() {
  const navigate = useNavigate();
  const [lang, setLang] = useGlobalLang();
  const [query, setQuery] = useState("");
  const isAr = lang === "ar";
  const currentUser = getCurrentUser();
  const displayName = currentUser.displayName || currentUser.username || "User";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((item) =>
      `${item.label} ${item.ar} ${item.desc}`.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <main className="tm-page" dir={isAr ? "rtl" : "ltr"}>
      <style>{`
        .tm-page{
          min-height:100vh;
          padding:14px clamp(12px,2.4vw,28px) 22px;
          background:linear-gradient(180deg,#f4f8f7 0%,#edf5f3 100%);
          color:#0f172a;
          font-family:Cairo,Arial,sans-serif;
          box-sizing:border-box;
        }
        .tm-shell{width:min(1180px,100%);margin:0 auto}
        .tm-hero{
          display:flex;align-items:center;justify-content:space-between;gap:18px;
          padding:18px clamp(16px,2vw,26px);
          border-radius:6px;
          background:linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%);
          color:#fff;
          box-shadow:0 22px 50px rgba(15,23,42,.16);
        }
        .tm-brand{display:flex;align-items:center;gap:14px;min-width:0}
        .tm-logo{
          width:58px;height:58px;object-fit:cover;border-radius:6px;
          border:1px solid rgba(255,255,255,.5);background:#fff;flex:0 0 auto;
        }
        .tm-kicker{font-size:12px;line-height:1.3;font-weight:900;opacity:.85;margin-bottom:4px}
        .tm-title{margin:0;font-size:16px;line-height:1.35;font-weight:1000}
        .tm-sub{margin:4px 0 0;color:rgba(255,255,255,.88);font-size:14px;line-height:1.45;font-weight:700}
        .tm-actions{display:flex;gap:8px;align-items:stretch;flex-wrap:wrap;justify-content:flex-end}
        .tm-topBtn,.tm-userBox{
          min-height:38px;border:1px solid rgba(255,255,255,.26);
          background:rgba(255,255,255,.12);color:#fff;border-radius:5px;
          display:flex;align-items:center;gap:8px;padding:8px 10px;
          font-size:14px;font-weight:900;text-decoration:none;box-sizing:border-box;cursor:pointer;
          font-family:inherit;
        }
        .tm-avatar{
          width:30px;height:30px;border-radius:5px;display:grid;place-items:center;
          background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.25);font-weight:1000;
        }
        .tm-toolbar{
          margin:14px 0;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;
        }
        .tm-search,.tm-stat{
          min-height:38px;background:#fff;border:1px solid #dbe4e2;border-radius:6px;
          box-shadow:0 10px 24px rgba(15,23,42,.05);box-sizing:border-box;
        }
        .tm-search{display:flex;align-items:center;gap:8px;padding:9px 12px}
        .tm-search input{
          width:100%;min-width:0;border:0;outline:0;background:transparent;
          color:#0f172a;font-family:inherit;font-size:14px;
        }
        .tm-stat{padding:9px 12px;font-size:14px;font-weight:900;white-space:nowrap}
        .tm-sectionHead{
          display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:0 0 10px;
        }
        .tm-sectionHead h2{margin:0;font-size:16px;line-height:1.35;font-weight:1000;color:#0f172a}
        .tm-sectionHead span{color:#64748b;font-size:14px;font-weight:800}
        .tm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        .tm-card{
          min-height:156px;display:flex;flex-direction:column;gap:12px;padding:14px;
          border:1px solid #dbe4e2;background:#fff;border-radius:6px;text-decoration:none;color:#0f172a;
          box-shadow:0 12px 30px rgba(15,23,42,.06);
          transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;
          cursor:pointer;text-align:left;
        }
        [dir="rtl"] .tm-card{text-align:right}
        .tm-card:hover{transform:translateY(-2px);border-color:#93c5bd;box-shadow:0 18px 36px rgba(15,23,42,.1)}
        .tm-cardIcon{
          width:38px;height:38px;border-radius:6px;display:grid;place-items:center;color:#fff;
          box-shadow:0 10px 20px rgba(15,23,42,.14);
        }
        .tm-tone-teal{background:linear-gradient(135deg,#0f766e,#14b8a6)}
        .tm-tone-blue{background:linear-gradient(135deg,#2563eb,#1d4ed8)}
        .tm-tone-green{background:linear-gradient(135deg,#10b981,#059669)}
        .tm-tone-cyan{background:linear-gradient(135deg,#0891b2,#06b6d4)}
        .tm-tone-orange{background:linear-gradient(135deg,#f97316,#ea580c)}
        .tm-cardBody{flex:1}
        .tm-cardTop{display:flex;justify-content:flex-end;margin-top:-42px;pointer-events:none}
        [dir="rtl"] .tm-cardTop{justify-content:flex-start}
        .tm-chip{
          background:#f1f5f9;color:#334155;border-radius:999px;padding:5px 9px;
          font-size:12px;line-height:1;font-weight:1000;
        }
        .tm-card h3{margin:10px 0 6px;font-size:16px;line-height:1.35;font-weight:1000;color:#0f172a}
        .tm-card p{margin:0;color:#475569;font-size:14px;line-height:1.5;font-weight:700}
        .tm-cardFoot{
          border-top:1px solid #e5ecea;padding-top:10px;display:flex;justify-content:space-between;
          align-items:center;gap:8px;color:#0f766e;font-size:14px;font-weight:1000;
        }
        .tm-empty{
          background:#fff;border:1px dashed #cbd5e1;border-radius:6px;padding:18px;
          color:#475569;font-size:14px;font-weight:800;text-align:center;
        }
        .tm-footer{margin:18px 0 0;text-align:center;color:#64748b;font-size:12px;font-weight:800}
        @media (max-width:900px){
          .tm-hero{align-items:flex-start;flex-direction:column}
          .tm-actions{justify-content:flex-start}
          .tm-toolbar{grid-template-columns:1fr 1fr}
          .tm-search{grid-column:1 / -1}
          .tm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
        @media (max-width:560px){
          .tm-page{padding:10px 10px 18px}
          .tm-brand{align-items:flex-start}
          .tm-logo{width:48px;height:48px}
          .tm-actions,.tm-topBtn,.tm-userBox{width:100%}
          .tm-toolbar{grid-template-columns:1fr}
          .tm-stat{white-space:normal}
          .tm-sectionHead{align-items:flex-start;flex-direction:column}
          .tm-grid{grid-template-columns:1fr}
          .tm-card{min-height:142px}
        }
      `}</style>

      <div className="tm-shell">
        <header className="tm-hero">
          <div className="tm-brand">
            <img className="tm-logo" src={logo} alt="Al Mawashi" />
            <div>
              <div className="tm-kicker">AL MAWASHI QMS</div>
              <h1 className="tm-title">{isAr ? "التدريب الداخلي" : "Internal Training"}</h1>
              <p className="tm-sub">
                {isAr
                  ? "إدارة جلسات التدريب، الاختبارات، الخطة السنوية، والمراجع"
                  : "Training sessions, quizzes, annual plan, references, and administration"}
              </p>
            </div>
          </div>

          <div className="tm-actions">
            <div className="tm-userBox">
              <span className="tm-avatar">{String(displayName || "U").slice(0, 1).toUpperCase()}</span>
              <span>{displayName}</span>
            </div>
            <button className="tm-topBtn" onClick={() => setLang(isAr ? "en" : "ar")}>
              {isAr ? "EN" : "ع"}
            </button>
            <button className="tm-topBtn" onClick={() => navigate("/named-dashboard")}>
              <FiHome size={15} />
              <span>{isAr ? "الرئيسية" : "Dashboard Home"}</span>
            </button>
            <button className="tm-topBtn" onClick={() => navigate(-1)}>
              <FiArrowLeft size={15} />
              <span>{isAr ? "رجوع" : "Back"}</span>
            </button>
          </div>
        </header>

        <div className="tm-toolbar">
          <label className="tm-search">
            <FiSearch size={16} color="#64748b" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? "ابحث في صفحات التدريب..." : "Find a training section..."}
            />
          </label>
          <div className="tm-stat">{cards.length} Sections</div>
          <div className="tm-stat">{isAr ? "وصول التدريب" : "Training Access"}</div>
        </div>

        <section aria-label="Training pages">
          <div className="tm-sectionHead">
            <h2>{isAr ? "صفحات التدريب" : "Training Pages"}</h2>
            <span>{isAr ? "إنشاء، عرض، تخطيط، وإدارة" : "Create, browse, plan, and manage"}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="tm-empty">{isAr ? "لا توجد صفحة مطابقة." : "No matching training section found."}</div>
          ) : (
            <div className="tm-grid">
              {filtered.map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.to}
                    type="button"
                    className="tm-card"
                    onClick={() => navigate(item.to)}
                    aria-label={item.label}
                  >
                    <div className={`tm-cardIcon ${toneClass(item.tone)}`}>
                      <Icon size={18} />
                    </div>
                    <div className="tm-cardBody">
                      <div className="tm-cardTop">
                        <span className="tm-chip">{item.action}</span>
                      </div>
                      <h3>{isAr ? item.ar : item.label}</h3>
                      <p>{item.desc}</p>
                    </div>
                    <div className="tm-cardFoot">
                      <span>{item.action === "Browse" ? "Open reports" : "Open section"}</span>
                      <FiArrowRight size={14} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="tm-footer">Built by Eng. Mohammed Abdullah</div>
      </div>
    </main>
  );
}
