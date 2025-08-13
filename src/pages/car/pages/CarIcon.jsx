import React, { useState } from "react";
import LoadingLog from "./LoadingLog";
import LoadingReports from "./LoadingReports";

/* يدعم نص ثنائي اللغة */
const Bidi = ({ ar, en }) => (
  <span><bdi>{ar}</bdi> / <bdi>{en}</bdi></span>
);

function ThemeStyles() {
  return (
    <style>{`
      /* =============== نظام الألوان والمتغيرات =============== */
      .car-app {
        --primary: #2563eb;          /* أزرق */
        --primary-600: #1d4ed8;
        --accent: #7c3aed;           /* بنفسجي */
        --accent-600: #6d28d9;
        --success: #10b981;          /* أخضر */
        --text: #0f172a;
        --muted: #64748b;

        /* إعدادات الألواح الزجاجية */
        --panel-bg: rgba(255,255,255,0.7);
        --panel-border: rgba(255,255,255,0.55);
        --panel-shadow: 0 10px 30px rgba(2,6,23,0.08), 0 2px 10px rgba(2,6,23,0.06);
        --ring: rgba(37,99,235,0.28);

        /* قصّ مشطوف للزوايا (Chamfer) */
        --ch: 16px;
        --clip-chamfer: polygon(
          var(--ch) 0,
          calc(100% - var(--ch)) 0,
          100% var(--ch),
          100% calc(100% - var(--ch)),
          calc(100% - var(--ch)) 100%,
          var(--ch) 100%,
          0 calc(100% - var(--ch)),
          0 var(--ch)
        );

        color: var(--text);
        -webkit-font-smoothing: antialiased; 
        -moz-osx-font-smoothing: grayscale;
      }

      /* =============== خلفية Aurora احترافية =============== */
      .car-app::before {
        content: "";
        position: fixed;
        inset: -20vmax;
        z-index: 0;
        pointer-events: none;
        background:
          radial-gradient(40vmax 40vmax at 12% 18%, rgba(124,58,237,.20), transparent 60%),
          radial-gradient(45vmax 35vmax at 85% 12%, rgba(37,99,235,.20), transparent 60%),
          radial-gradient(40vmax 35vmax at 20% 90%, rgba(16,185,129,.20), transparent 60%),
          linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        filter: saturate(1.05) blur(0.2px);
        animation: auroraShift 14s ease-in-out infinite alternate;
      }
      @keyframes auroraShift {
        0%   { transform: translate3d(0,0,0) scale(1); }
        100% { transform: translate3d(2%, -2%, 0) scale(1.03); }
      }
      @media (prefers-reduced-motion: reduce) {
        .car-app::before { animation: none; }
      }

      /* =============== شريط علوي بزجاج + تدرج خفيف =============== */
      .topbar {
        position: sticky; top: 0; z-index: 50;
        background: linear-gradient(90deg, rgba(255,255,255,0.65), rgba(255,255,255,0.55));
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(226,232,240,0.8);
        box-shadow: 0 6px 18px rgba(2,6,23,0.06);
      }
      .topbar .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; width: 100%; }
      .topbar .pad { padding: 10px 14px; }
      .spacer { flex: 1 1 auto; min-width: 8px; }

      /* =============== تبويبات فاخرة (Segmented Pills) =============== */
      .tablike {
        position: relative;
        appearance: none;
        border: 1px solid rgba(148,163,184,.35);
        background: linear-gradient(180deg, #ffffff, #f7f9ff);
        color: var(--text);
        font-weight: 800;
        letter-spacing: .2px;
        padding: 10px 18px;
        border-radius: 999px;
        transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
        box-shadow: 0 1px 2px rgba(2,6,23,0.06);
      }
      .tablike:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 22px rgba(2,6,23,0.12);
        border-color: rgba(99,102,241,.5);
        background: linear-gradient(180deg, #f5f7ff, #eef2ff);
      }
      .tablike.active {
        border-color: transparent;
        color: #fff;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        box-shadow: 0 10px 28px rgba(37,99,235,.35), 0 2px 10px rgba(124,58,237,.25);
      }
      .tablike:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px var(--ring);
      }
      .tablike.disabled {
        opacity: .55;
        cursor: not-allowed;
        filter: grayscale(.25);
      }

      /* =============== بطاقات زجاجية بحواف مشطوفة وحدود متدرجة =============== */
      .panel {
        position: relative;
        clip-path: var(--clip-chamfer);
        background: var(--panel-bg);
        border: 1px solid var(--panel-border);
        box-shadow: var(--panel-shadow);
        overflow: clip;
        transition: box-shadow .25s ease, transform .25s ease, background .25s ease, border-color .25s ease;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      /* حدّ متدرّج يطابق شكل القص */
      .panel::before {
        content: "";
        position: absolute; inset: 0;
        clip-path: var(--clip-chamfer);
        padding: 1px;
        background: linear-gradient(135deg, rgba(37,99,235,.55), rgba(124,58,237,.55), rgba(16,185,129,.55));
        -webkit-mask: 
          linear-gradient(#000 0 0) content-box, 
          linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
                mask-composite: exclude;
        pointer-events: none;
        opacity: .6;
      }
      .panel:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(2,6,23,0.12); }
      .panel .panel-body { padding: 12px; }

      /* عنواين أقسام */
      .section-title {
        font-weight: 800; letter-spacing: .3px;
        color: var(--primary-600);
        margin: 6px 0 12px;
      }

      /* =============== جداول وحقول محسّنة =============== */
      .car-app table { width: 100%; border-collapse: separate; border-spacing: 0; }
      .car-app thead th {
        background: linear-gradient(180deg, #eff6ff, #e7f0ff);
        color: #0b1324;
        border-bottom: 1px solid rgba(203,213,225,.8);
        font-weight: 800;
        padding: 10px 12px;
        position: sticky; top: 0; z-index: 1;
        clip-path: var(--clip-chamfer);
      }
      .car-app tbody td {
        background: rgba(255,255,255,0.8);
        color: #0b1324;
        border-top: 1px solid rgba(226,232,240,.7);
        padding: 10px 12px;
      }
      .car-app tbody tr:nth-child(even) td { background: rgba(248,250,252,.9); }
      .car-app tbody tr:hover td { background: #f0f6ff; }

      .car-app :where(input, select, textarea) {
        background: linear-gradient(180deg, #f8fbff, #f1f5ff) !important;
        border: 1.5px solid rgba(203,213,225,.9) !important;
        color: var(--text) !important;
        border-radius: 12px !important;
        padding: 10px 12px !important;
        outline: none !important;
        transition: box-shadow .18s ease, border-color .18s ease, background .18s ease;
      }
      .car-app :where(input, select, textarea):focus {
        border-color: var(--primary) !important;
        box-shadow: 0 0 0 4px rgba(37,99,235,.15) !important;
        background: #ffffff !important;
      }
      .car-app :where(input[type="date"])::-webkit-calendar-picker-indicator { filter: opacity(.9); }

      /* سكروول بار لطيف */
      .car-app *::-webkit-scrollbar { height: 10px; width: 10px; }
      .car-app *::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      .car-app *::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

      /* هوامش لمساحات العمل */
      .layout-pad { padding: 14px 16px; }

      /* تقليل الحركة */
      @media (prefers-reduced-motion: reduce) {
        .tablike, .panel { transition: none; }
      }
    `}</style>
  );
}

export default function CarIcon() {
  const [activeTab, setActiveTab] = useState("loading");

  /* تخطيط أساسي */
  const wrap = {
    direction: "rtl",
    fontFamily: "Cairo, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji','Segoe UI Emoji'",
    background: "transparent",
    minHeight: "100vh",
    width: "100%",
    position: "relative",
    zIndex: 1,           // المحتوى فوق خلفية aurora
  };

  const row = { width: "100%", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
  const groupRight = { display: "flex", gap: 8, flexWrap: "wrap" };
  const groupLeft  = { display: "flex", gap: 8, flexWrap: "wrap" };
  const spacer = { flex: 1, minWidth: 8 };

  /* محتوى */
  const content = { width: "100%", maxWidth: "100%" };
  const cardBox = { marginBottom: 16 };

  const tabBtnClass = (on, disabled) =>
    `tablike ${on ? "active" : ""}` + (disabled ? " disabled" : "");

  return (
    <div className="car-app" style={wrap}>
      <ThemeStyles />

      {/* الشريط العلوي */}
      <div className="topbar">
        <div className="pad">
          <div className="row" style={row}>
            {/* يمين: إدخال */}
            <div style={groupRight}>
              <button
                type="button"
                className={tabBtnClass(activeTab === "loading", false)}
                onClick={() => setActiveTab("loading")}
                title="إدخال أوقات التحميل / Loading times input"
                aria-label="Loading input"
              >
                🕐 <Bidi ar="أوقات التحميل" en="Loading" />
              </button>

              <button
                type="button"
                className={tabBtnClass(activeTab === "cleaning", true)}
                onClick={() => {}}
                disabled
                title="قريباً / Coming soon"
                aria-label="Cleaning (coming soon)"
              >
                🧼 <Bidi ar="تنظيف السيارات" en="Cleaning" />
              </button>
            </div>

            <div className="spacer" style={spacer} />

            {/* يسار: عرض */}
            <div style={groupLeft}>
              <button
                type="button"
                className={tabBtnClass(activeTab === "loadReports", false)}
                onClick={() => setActiveTab("loadReports")}
                title="عرض/تصدير تقارير الأوقات / View/Export loading reports"
                aria-label="Loading reports"
              >
                📄 <Bidi ar="تقارير الأوقات" en="Loading Reports" />
              </button>

              <button
                type="button"
                className={tabBtnClass(activeTab === "approvals", true)}
                onClick={() => {}}
                disabled
                title="قريباً / Coming soon"
                aria-label="Approvals (coming soon)"
              >
                ✅ <Bidi ar="الموافقات/المعايرة" en="Approvals" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* المحتوى */}
      <div className="layout-pad" style={content}>
        {activeTab === "loading" && (
          <div className="panel" style={cardBox}>
            <div className="panel-body">
              <LoadingLog />
            </div>
          </div>
        )}

        {activeTab === "loadReports" && (
          <div className="panel" style={cardBox}>
            <div className="panel-body">
              <LoadingReports />
            </div>
          </div>
        )}

        {activeTab === "cleaning" && (
          <div className="panel" style={cardBox}>
            <div className="panel-body">
              🚧 <Bidi ar="سيُضاف تبويب التنظيف قريباً" en="Cleaning tab coming soon" />
            </div>
          </div>
        )}

        {activeTab === "approvals" && (
          <div className="panel" style={cardBox}>
            <div className="panel-body">
              🚧 <Bidi ar="سيُضاف تبويب الموافقات/المعايرة قريباً" en="Approvals tab coming soon" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
