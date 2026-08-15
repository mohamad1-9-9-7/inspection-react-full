// src/pages/mrp/mrpUi.jsx
//
// 🏭 وحدة التصنيع — الهيكل والمكوّنات المشتركة لكل شاشات الـ BOM.
// Shared shell + UI kit for the manufacturing (MRP) screens.
//
// نفس لغة التصميم بكل الشاشات: ترويسة ثابتة + شريط أقسام جانبي + بطاقات
// + شريط حفظ عائم. كل شاشة بتستورد من هون فقط.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { isItemAllowed } from "../../utils/sectionItems";
import { can } from "../../utils/perms";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { ITEM_TYPES, UOMS, displayNameOf, itemById, nameOf, num, rolesOf } from "./mrpApi";

/* ══════════════ الصفحات والصلاحيات ══════════════ */

export const MRP_PAGES = [
  {
    id: "mrp.items", to: "/mrp/items", icon: "📦",
    ar: "الأصناف والمواد", en: "Items & materials",
    arSub: "المواد الخام والأكواد والتكاليف", enSub: "Raw materials, SKUs & costs",
  },
  {
    id: "mrp.bom", to: "/mrp/bom", icon: "🔪",
    ar: "قوائم التفكيك (BOM)", en: "Cutting BOMs",
    arSub: "منتج داخل → قطع ناتجة + هدر", enSub: "One input → outputs + waste",
  },
  {
    id: "mrp.tree", to: "/mrp/tree", icon: "🌳",
    ar: "الشجرة والتفكيك", en: "Multi-level tree",
    arSub: "المستويات وتفكيك المواد الخام", enSub: "Sub-assemblies & explosion",
  },
  {
    id: "mrp.orders", to: "/mrp/orders", icon: "🏭",
    ar: "أوامر التصنيع", en: "Work orders",
    arSub: "الإنتاج والخصم الآلي من المخزن", enSub: "Production & backflushing",
  },
  {
    id: "mrp.reports", to: "/mrp/reports", icon: "📊",
    ar: "التقارير والتحليل", en: "Reports & analytics",
    arSub: "التكلفة المخطّطة مقابل الفعلية", enSub: "Planned vs actual, where-used",
  },
];

export const canOpenMrp = (pageId) => isItemAllowed("mrp", pageId);
export const canEditMrp = () => can("mrp", "edit") || can("mrp", "write");
export const canDeleteMrp = () => can("mrp", "delete") || can("mrp", "edit");

/* ══════════════ الأنماط ══════════════ */

export const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

export const CSS = `
#root .mrp, #root .mrp * { font-size: 17px !important; }
#root .mrp-title { font-size: 30px !important; }
#root .mrp-sub   { font-size: 14px !important; }
#root .mrp-sec   { font-size: 20px !important; }
#root .mrp-kpi   { font-size: 30px !important; }
#root .mrp table, #root .mrp table * { font-size: 16px !important; }

#root .mrp-shell {
  display: grid; grid-template-columns: 264px minmax(0, 1fr); gap: 18px; align-items: start;
}
#root .mrp-rail { position: sticky; top: 96px; }
#root .mrp-rail a:hover { background: #f2f8ff; }
#root .mrp table tbody tr:nth-child(even) { background: #fafcff; }
#root .mrp table tbody tr:hover { background: #f2f8ff; }
#root .mrp table thead th { position: sticky; top: 0; z-index: 4; }
#root .mrp input:focus, #root .mrp select:focus, #root .mrp textarea:focus {
  border-color: #1f6fd0 !important; box-shadow: 0 0 0 3px rgba(31,111,208,.15);
}
#root .mrp button { transition: filter .15s ease, transform .12s ease; }
#root .mrp button:hover:not(:disabled) { filter: brightness(.97); }
#root .mrp button:active:not(:disabled) { transform: translateY(1px); }

#root .mrp-sw {
  position: relative; width: 50px; height: 28px; border-radius: 999px;
  border: none; background: #cbd9e8; cursor: pointer; padding: 0; flex-shrink: 0;
  transition: background .18s ease;
}
#root .mrp-sw.on { background: #1f6fd0; }
#root .mrp-sw:disabled { opacity: .5; cursor: not-allowed; }
#root .mrp-knob {
  position: absolute; top: 3px; inset-inline-start: 3px; width: 22px; height: 22px;
  border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(15,39,64,.28);
  transition: inset-inline-start .18s ease;
}
#root .mrp-sw.on .mrp-knob { inset-inline-start: 25px; }

@media (max-width: 1040px) {
  #root .mrp-shell { grid-template-columns: 1fr; }
  #root .mrp-rail {
    position: static; display: flex; flex-direction: row; gap: 8px; overflow-x: auto;
    background: transparent !important; border: 0 !important; box-shadow: none !important;
    padding: 0 0 6px !important;
  }
  #root .mrp-rail > a { flex: 0 0 auto; }
  #root .mrp-navhint { display: none; }
}
@media (max-width: 820px) {
  #root .mrp, #root .mrp * { font-size: 15px !important; }
  #root .mrp table, #root .mrp table * { font-size: 14px !important; }
  #root .mrp-title { font-size: 23px !important; }
  #root .mrp-kpi   { font-size: 25px !important; }
}
`;

export const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "0 clamp(12px, 2.2vw, 26px) 120px", overflowX: "hidden",
  },
  top: {
    position: "sticky", top: 0, zIndex: 40,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 14,
    background: "rgba(255,255,255,.93)", borderBottom: "1px solid #dbe6f2",
    padding: "13px clamp(4px, 1vw, 14px)", marginBottom: 18,
    backdropFilter: "blur(8px)",
  },
  topStart: { display: "flex", alignItems: "center", gap: 13, minWidth: 0, flexWrap: "wrap" },
  topIcon: {
    width: 50, height: 50, borderRadius: 15, flexShrink: 0,
    display: "grid", placeItems: "center", fontSize: 25,
    background: "linear-gradient(135deg,#0f766e,#115e59)", color: "#fff",
    boxShadow: "0 8px 20px rgba(15,118,110,.28)",
  },
  title: { fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1.2 },
  sub: { color: "#6b8299", fontWeight: 700, marginTop: 2 },
  topActions: { display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0" },

  btn: {
    border: "1.5px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 12, padding: "10px 18px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  btnPrimary: { background: "#0f766e", color: "#fff", border: "1.5px solid #0f766e" },
  btnBlue: { background: "#1f6fd0", color: "#fff", border: "1.5px solid #1f6fd0" },
  btnDanger: { border: "1.5px solid #f5c2c2", background: "#fff", color: "#a12626" },
  btnOff: { opacity: 0.55, cursor: "not-allowed" },
  btnSm: { padding: "7px 14px", borderRadius: 10 },

  rail: {
    display: "flex", flexDirection: "column", gap: 5,
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 18,
    padding: 9, boxShadow: "0 10px 26px rgba(15,39,64,.05)",
  },
  navBtn: {
    display: "flex", alignItems: "center", gap: 11, width: "100%",
    border: "1px solid transparent", background: "transparent", borderRadius: 13,
    padding: "10px 11px", cursor: "pointer", fontFamily: FONT, color: "#0f2740",
    textAlign: "start", minWidth: 0, textDecoration: "none",
  },
  navBtnOn: { background: "#e7f5f3", border: "1px solid #a7d9d3" },
  navIcon: {
    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
    display: "grid", placeItems: "center", background: "#f2f7fc", fontSize: 19,
  },
  navIconOn: { background: "#0f766e", color: "#fff" },
  navText: { display: "flex", flexDirection: "column", minWidth: 0 },
  navName: { fontWeight: 900, whiteSpace: "nowrap" },
  navHint: {
    color: "#8aa3b8", fontWeight: 700, whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis", fontSize: 13,
  },

  main: { minWidth: 0, display: "flex", flexDirection: "column", gap: 16 },
  card: {
    background: "#fff", border: "1px solid #e3edf7", borderRadius: 20,
    padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14,
    boxShadow: "0 10px 26px rgba(15,39,64,.05)", minWidth: 0,
  },
  cardHead: {
    display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap",
    paddingBottom: 13, borderBottom: "1px solid #eef4fb",
  },
  cardIcon: {
    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
    display: "grid", placeItems: "center", background: "#eef4fb", fontSize: 20,
  },
  cardTitle: { margin: 0, fontWeight: 900, color: "#14507f", lineHeight: 1.3 },
  cardSub: { color: "#8aa3b8", fontWeight: 700, marginTop: 2, lineHeight: 1.5 },
  headRight: { marginInlineStart: "auto", display: "flex", gap: 8, flexWrap: "wrap" },

  tableWrap: {
    overflowX: "auto", WebkitOverflowScrolling: "touch",
    border: "1px solid #e3edf7", borderRadius: 14, background: "#fff",
    maxHeight: "70vh", overflowY: "auto",
  },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: {
    background: "#f2f7fc", color: "#14507f", fontWeight: 900,
    padding: "12px 10px", textAlign: "center", whiteSpace: "nowrap",
    borderBottom: "1px solid #dbe6f2",
  },
  td: {
    padding: "11px 9px", borderTop: "1px solid #eef4fa",
    textAlign: "center", verticalAlign: "middle",
  },
  tdStart: { textAlign: "start" },

  input: {
    border: "1.5px solid #cfe0f0", borderRadius: 10, padding: "10px 12px",
    fontWeight: 700, fontFamily: FONT, color: "#0f2740", background: "#fff",
    outline: "none", width: "100%", boxSizing: "border-box", minWidth: 0,
  },
  inputSm: {
    border: "1.5px solid #cfe0f0", borderRadius: 9, padding: "8px 8px", width: 96,
    fontWeight: 800, fontFamily: FONT, color: "#0f2740", background: "#fff",
    outline: "none", textAlign: "center",
  },
  label: { color: "#6b8299", fontWeight: 800, marginBottom: 5, display: "block" },
  field: { display: "flex", flexDirection: "column", minWidth: 0 },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(230px,100%),1fr))", gap: 14,
  },
  hint: { color: "#8aa3b8", fontWeight: 700, lineHeight: 1.6 },
  note: {
    color: "#5c7a94", fontWeight: 700, lineHeight: 1.7,
    background: "#f7fbff", border: "1px solid #e6eff8", borderRadius: 12, padding: "11px 13px",
  },
  empty: {
    background: "#f7fbff", border: "2px dashed #cfe0f0", borderRadius: 14,
    padding: "26px 18px", textAlign: "center", fontWeight: 800, color: "#6b8299",
  },
  err: {
    background: "#fff1f1", border: "1px solid #f5c2c2", color: "#a12626",
    borderRadius: 12, padding: "11px 14px", fontWeight: 800,
  },
  ok: {
    background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857",
    borderRadius: 12, padding: "11px 14px", fontWeight: 800,
  },

  badge: {
    borderRadius: 999, padding: "4px 13px", fontWeight: 900, whiteSpace: "nowrap",
    display: "inline-block", border: "1px solid transparent",
  },
  chipRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },

  kpiRow: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(190px,100%),1fr))", gap: 12,
  },
  kpi: {
    background: "#fff", border: "1px solid #e3edf7", borderRadius: 16,
    padding: "15px 16px", display: "flex", flexDirection: "column", gap: 3,
    boxShadow: "0 8px 20px rgba(15,39,64,.04)",
  },
  kpiLabel: { color: "#8aa3b8", fontWeight: 800 },
  kpiValue: { fontWeight: 900, color: "#14507f", lineHeight: 1.1 },
  kpiFoot: { color: "#6b8299", fontWeight: 700 },

  searchRow: {
    display: "flex", alignItems: "center", gap: 9,
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 12,
    padding: "3px 12px", minWidth: 220, flex: 1,
  },
  search: {
    flex: 1, border: "none", outline: "none", background: "transparent",
    padding: "9px 0", fontWeight: 700, fontFamily: FONT, color: "#0f2740", minWidth: 0,
  },

  saveDock: {
    position: "fixed", insetInlineStart: 0, insetInlineEnd: 0, bottom: 18,
    display: "flex", justifyContent: "center", zIndex: 60, pointerEvents: "none", padding: "0 14px",
  },
  saveBar: {
    pointerEvents: "auto", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
    background: "#14507f", color: "#fff", borderRadius: 16, padding: "11px 15px",
    boxShadow: "0 18px 40px rgba(15,39,64,.32)", maxWidth: "min(760px,100%)",
  },
  saveGhost: {
    border: "1.5px solid rgba(255,255,255,.35)", background: "transparent", color: "#fff",
    borderRadius: 12, padding: "10px 18px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },

  /* نافذة منبثقة */
  modalBack: {
    position: "fixed", inset: 0, background: "rgba(15,39,64,.45)", zIndex: 70,
    display: "grid", placeItems: "center", padding: 16,
  },
  modal: {
    background: "#fff", borderRadius: 20, width: "min(920px, 100%)",
    maxHeight: "92vh", overflowY: "auto", padding: "20px 18px",
    display: "flex", flexDirection: "column", gap: 14,
    boxShadow: "0 30px 60px rgba(15,39,64,.35)",
  },
  modalHead: {
    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    paddingBottom: 12, borderBottom: "1px solid #eef4fb",
  },
  modalFoot: {
    display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end",
    paddingTop: 12, borderTop: "1px solid #eef4fb",
  },

  pickList: {
    position: "absolute", zIndex: 50, insetInlineStart: 0, top: "100%", marginTop: 4,
    background: "#fff", border: "1px solid #cfe0f0", borderRadius: 12,
    boxShadow: "0 16px 34px rgba(15,39,64,.18)", minWidth: 300, maxHeight: 300,
    overflowY: "auto", textAlign: "start", width: "100%",
  },
  pickOpt: {
    display: "block", width: "100%", textAlign: "start", border: "none",
    background: "transparent", padding: "10px 12px", cursor: "pointer",
    fontFamily: FONT, color: "#0f2740", borderBottom: "1px solid #f2f7fc",
    fontWeight: 700, lineHeight: 1.45,
  },
};

/* ══════════════ الهيكل ══════════════ */

/** شاشة كاملة: ترويسة + شريط أقسام + محتوى. */
export function MrpShell({ pageId, icon, title, sub, actions, children }) {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const pages = MRP_PAGES.filter((p) => canOpenMrp(p.id));

  return (
    <div dir={dir} className="mrp" style={S.page}>
      <style>{CSS}</style>

      <header style={S.top}>
        <div style={S.topStart}>
          <span style={S.topIcon}>{icon || "🏭"}</span>
          <div style={{ minWidth: 0 }}>
            <div className="mrp-title" style={S.title}>{title}</div>
            {sub && <div className="mrp-sub" style={S.sub}>{sub}</div>}
          </div>
        </div>
        <div style={S.topActions}>
          {actions}
          <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
          <button type="button" style={S.btn} onClick={() => navigate("/mrp")}>
            ← {t({ en: "Manufacturing", ar: "التصنيع" })}
          </button>
        </div>
      </header>

      <div className="mrp-shell">
        <nav className="mrp-rail" style={S.rail}>
          {pages.map((p) => {
            const on = p.id === pageId;
            return (
              <Link
                key={p.id}
                to={p.to}
                style={{ ...S.navBtn, ...(on ? S.navBtnOn : null) }}
              >
                <span style={{ ...S.navIcon, ...(on ? S.navIconOn : null) }}>{p.icon}</span>
                <span style={S.navText}>
                  <span style={S.navName}>{isAr ? p.ar : p.en}</span>
                  <span className="mrp-navhint" style={S.navHint}>
                    {isAr ? p.arSub : p.enSub}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <main style={S.main}>{children}</main>
      </div>
    </div>
  );
}

/** شاشة «لا صلاحية» موحّدة للوحدة. */
export function MrpNoAccess({ page }) {
  const navigate = useNavigate();
  const { t, dir } = useSettingsLang();
  return (
    <div dir={dir} className="mrp" style={{ ...S.page, display: "grid", placeItems: "center" }}>
      <style>{CSS}</style>
      <div style={{ ...S.card, maxWidth: 520, textAlign: "center", alignItems: "center" }}>
        <div style={{ fontSize: 44 }}>🔒</div>
        <div style={{ fontWeight: 900, fontSize: 21 }}>
          {t({ en: "No access to this page", ar: "لا توجد صلاحية لهذه الصفحة" })}
        </div>
        <div style={S.hint}>
          {t({
            en: "Ask an administrator to grant it from Settings → Accounts.",
            ar: "راجع المدير لمنحك الصلاحية من الإعدادات ← الحسابات.",
          })}
        </div>
        {page && <div style={{ ...S.badge, background: "#f5f9fd", color: "#8aa3b8" }}>{page}</div>}
        <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={() => navigate("/mrp")}>
          {t({ en: "Back", ar: "رجوع" })}
        </button>
      </div>
    </div>
  );
}

/* ══════════════ مكوّنات ══════════════ */

export function Card({ icon, title, sub, right, children, style }) {
  return (
    <section style={{ ...S.card, ...style }}>
      {(title || right) && (
        <div style={S.cardHead}>
          {icon && <span style={S.cardIcon}>{icon}</span>}
          <div style={{ minWidth: 0 }}>
            <h2 className="mrp-sec" style={S.cardTitle}>{title}</h2>
            {sub && <div className="mrp-sub" style={S.cardSub}>{sub}</div>}
          </div>
          {right && <div style={S.headRight}>{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, style }) {
  return (
    <label style={{ ...S.field, ...style }}>
      <span style={S.label}>{label}</span>
      {children}
    </label>
  );
}

export function TextInput({ value, onChange, ...rest }) {
  return (
    <input style={S.input} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
  );
}

/**
 * حقل رقمي بيحتفظ بالنص وأنت عم تكتب — فتقدر تكتب «12.5» بلا ما ينقص عند النقطة.
 * (num("12.") = 12، فلو حوّلنا كل ضغطة زر ما بتقدر تكتب فاصلة عشرية.)
 */
export function NumInput({ value, onChange, style, onBlur, ...rest }) {
  const [buf, setBuf] = useState(null);          // نص مؤقّت أثناء الكتابة
  const shown = buf !== null ? buf : (value ?? "");

  return (
    <input
      style={{ ...S.input, ...style }}
      value={shown}
      inputMode="decimal"
      onChange={(e) => {
        const raw = e.target.value;
        if (!/^-?\d*[.,]?\d*$/.test(raw)) return;  // أرقام وفاصلة واحدة فقط
        setBuf(raw);
        onChange(raw === "" ? "" : num(raw, ""));
      }}
      onBlur={(e) => { setBuf(null); onBlur?.(e); }}
      {...rest}
    />
  );
}

export function Select({ value, onChange, options, placeholder, isAr, style, disabled }) {
  return (
    <select
      style={{ ...S.input, ...style }}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label || nameOf(o, isAr) || o.id}</option>
      ))}
    </select>
  );
}

export function UomSelect({ value, onChange, isAr }) {
  return <Select value={value} onChange={onChange} options={UOMS} isAr={isAr} />;
}

export function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      disabled={disabled}
      className={`mrp-sw${checked ? " on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="mrp-knob" />
    </button>
  );
}

export function Badge({ children, color = "#14507f", bg = "#eef4fb", border }) {
  return (
    <span style={{ ...S.badge, color, background: bg, borderColor: border || bg }}>
      {children}
    </span>
  );
}

export function Kpi({ label, value, foot, color }) {
  return (
    <div style={S.kpi}>
      <span style={S.kpiLabel}>{label}</span>
      <span className="mrp-kpi" style={{ ...S.kpiValue, ...(color ? { color } : null) }}>{value}</span>
      {foot && <span style={S.kpiFoot}>{foot}</span>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={S.searchRow}>
      <span style={{ color: "#8aa3b8" }}>🔎</span>
      <input
        style={S.search}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          style={{ ...S.btn, ...S.btnSm, border: "none", background: "#eef4fb" }}
          onClick={() => onChange("")}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function EmptyBox({ children }) {
  return <div style={S.empty}>{children}</div>;
}

/** إشعار حفظ عائم أعلى الصفحة — بديل شريط الحفظ السفلي. */
export function Toast({ toast, busy, t }) {
  if (!toast && !busy) return null;
  const bad = toast?.bad;
  return (
    <div
      style={{
        position: "sticky", top: 78, zIndex: 55, display: "flex", justifyContent: "center",
        pointerEvents: "none", marginBottom: -8,
      }}
    >
      <div
        style={{
          ...(bad ? S.err : S.ok),
          boxShadow: "0 12px 30px rgba(15,39,64,.18)",
          display: "flex", alignItems: "center", gap: 10,
        }}
      >
        <span>{busy ? "⏳" : bad ? "⚠️" : "✔"}</span>
        <span>{busy ? t({ en: "Saving…", ar: "جارٍ الحفظ…" }) : toast?.text}</span>
      </div>
    </div>
  );
}

/** نافذة منبثقة — Esc يقفلها والنقر على الخلفية كذلك. */
export function Modal({ title, icon, onClose, footer, children, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="mrp"
      style={S.modalBack}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{CSS}</style>
      <div style={{ ...S.modal, ...(wide ? { width: "min(1180px, 100%)" } : null) }}>
        <div style={S.modalHead}>
          {icon && <span style={S.cardIcon}>{icon}</span>}
          <h2 className="mrp-sec" style={S.cardTitle}>{title}</h2>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnSm, marginInlineStart: "auto" }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {children}
        {footer && <div style={S.modalFoot}>{footer}</div>}
      </div>
    </div>
  );
}

/** شريط الحفظ العائم. */
export function SaveDock({ dirty, saving, onSave, onDiscard, blocker, t }) {
  if (!dirty && !saving) return null;
  return (
    <div style={S.saveDock}>
      <div style={{ ...S.saveBar, ...(blocker ? { background: "#8e1f1f" } : null) }}>
        <span style={{ fontWeight: 900 }}>
          {blocker ? `⚠️ ${blocker}` : `● ${t({ en: "Unsaved changes", ar: "تعديلات غير محفوظة" })}`}
        </span>
        <span style={{ display: "flex", gap: 10, marginInlineStart: "auto", flexWrap: "wrap" }}>
          <button type="button" style={S.saveGhost} onClick={onDiscard}>
            {t({ en: "Discard", ar: "تراجع" })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnBlue, ...(saving || blocker ? S.btnOff : null) }}
            onClick={onSave}
            disabled={saving || !!blocker}
          >
            {saving ? t({ en: "Saving…", ar: "جارٍ الحفظ…" }) : `💾 ${t({ en: "Save", ar: "حفظ" })}`}
          </button>
        </span>
      </div>
    </div>
  );
}

/**
 * اختيار صنف بالبحث — بالكود أو الاسم، مربوط بسجل الأصناف (Item master).
 * `prefer`: أدوار بتطلع أول القائمة (توجيه بلا منع) — الباقي بيضل ظاهر.
 * `disabledFor(item) → string|null`: بيخلي الصنف ظاهر بالقائمة بس ما بيسمح باختياره،
 *   وبيرجّع نص السبب اللي بيظهر على السطر وبيمرّر لـ`onBlocked(item, reason)`.
 *
 * القائمة المنسدلة تُرسم بـ portal بموضع ثابت (fixed) محسوب من الحقل،
 * فما بتنقص أو بتنقصّ داخل الجداول ذات التمرير — تطفو فوق كل شي.
 */
export function ItemPicker({
  cfg, value, onPick, isAr, t, filter, prefer, placeholder, disabledFor, onBlocked,
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState(null);     // {left, top, width, up}
  const [hi, setHi] = useState(0);          // السطر المميّز للوحة المفاتيح
  const inputRef = useRef(null);
  const popRef = useRef(null);

  const chosen = itemById(cfg, value);
  const label = chosen ? displayNameOf(chosen) || nameOf(chosen, isAr) || chosen.id : "";

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = (cfg?.items || []).filter((i) => i.active !== false && (!filter || filter(i)));
    if (s) {
      list = list.filter((i) =>
        [i.sku, i.ar, i.en, i.id].some((v) => String(v || "").toLowerCase().includes(s))
      );
    }
    if (prefer?.length) {
      // الأدوار المقترحة أولاً، وبعدين الباقي — بلا ما نخفي إشي (يراعي الأدوار المتعددة)
      const wanted = (i) => (rolesOf(i).some((r) => prefer.includes(r)) ? 1 : 0);
      list = [...list].sort((a, b) => wanted(b) - wanted(a));
    }
    return list.slice(0, 40);
  }, [cfg, q, filter, prefer]);

  const place = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 340);
    const spaceBelow = window.innerHeight - r.bottom;
    const up = spaceBelow < 280 && r.top > spaceBelow;   // افتح للأعلى إذا الأسفل ضيّق
    let left = r.left;
    left = Math.min(left, window.innerWidth - width - 8); // ما يطلع بره اليمين
    left = Math.max(8, left);
    setBox({ left, top: up ? r.top : r.bottom + 4, width, up });
  };

  const openList = () => { setQ(""); setHi(0); place(); setOpen(true); };
  const close = () => setOpen(false);

  /** الصنف الممنوع بيضل ظاهر — بس اختياره بيوقف وبيطلع سبب واضح. */
  const choose = (i) => {
    const reason = disabledFor?.(i);
    if (reason) { onBlocked?.(i, reason); return; }
    onPick(i.id);
    setOpen(false);
    setQ("");
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (inputRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const reflow = () => place();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", reflow, true);
    window.addEventListener("resize", reflow);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", reflow, true);
      window.removeEventListener("resize", reflow);
    };
  }, [open]);

  const onKey = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { openList(); return; }
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[hi]) choose(results[hi]); }
    else if (e.key === "Escape") { close(); }
  };

  const list = open && box && createPortal(
    <div
      ref={popRef}
      className="mrp"
      style={{
        position: "fixed",
        left: box.left,
        [box.up ? "bottom" : "top"]: box.up ? window.innerHeight - box.top + 4 : box.top,
        width: box.width,
        maxHeight: 300, overflowY: "auto",
        background: "#fff", border: "1px solid #cfe0f0", borderRadius: 12,
        boxShadow: "0 18px 40px rgba(15,39,64,.22)", zIndex: 9999,
        fontFamily: FONT,
      }}
    >
      {results.length === 0 ? (
        <div style={{ ...S.pickOpt, color: "#8aa3b8" }}>
          {t({ en: "No item matches", ar: "لا يوجد صنف مطابق" })}
        </div>
      ) : (
        results.map((i, idx) => {
          const role = ITEM_TYPES.find((x) => x.id === (i.type || "raw"));
          const blocked = disabledFor?.(i) || "";
          return (
            <button
              key={i.id}
              type="button"
              onMouseEnter={() => setHi(idx)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              title={blocked || undefined}
              aria-disabled={blocked ? true : undefined}
              style={{
                ...S.pickOpt,
                display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                background: idx === hi ? (blocked ? "#fff1f1" : "#eef4fb") : "transparent",
                cursor: blocked ? "not-allowed" : "pointer",
                opacity: blocked ? 0.62 : 1,
              }}
            >
              <b style={{ color: blocked ? "#a12626" : "#14507f", minWidth: 54 }}>{i.sku || "—"}</b>
              <span style={{ fontWeight: 700, textDecoration: blocked ? "line-through" : "none" }}>
                {nameOf(i, isAr) || i.id}
              </span>
              <span style={{ color: "#8aa3b8" }}>· {i.uom || ""}</span>
              {blocked ? (
                <span style={{ ...S.badge, background: "#fff1f1", color: "#a12626", padding: "2px 9px", marginInlineStart: "auto" }}>
                  ⛔ {blocked}
                </span>
              ) : role ? (
                <span style={{ ...S.badge, background: "#f2f7fc", color: "#6b8299", padding: "2px 9px", marginInlineStart: "auto" }}>
                  {nameOf(role, isAr)}
                </span>
              ) : null}
            </button>
          );
        })
      )}
    </div>,
    document.body
  );

  return (
    <span style={{ display: "block", minWidth: 0 }}>
      <input
        ref={inputRef}
        style={{ ...S.input, ...(open ? { borderColor: "#1f6fd0", boxShadow: "0 0 0 3px rgba(31,111,208,.15)" } : null) }}
        value={open ? q : label}
        placeholder={placeholder || t({ en: "code or name…", ar: "كود أو اسم…" })}
        onFocus={openList}
        onKeyDown={onKey}
        onChange={(e) => { setQ(e.target.value); setHi(0); place(); setOpen(true); }}
      />
      {list}
    </span>
  );
}
