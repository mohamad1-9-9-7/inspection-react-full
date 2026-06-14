// src/pages/monitor/branches/_shared/branchViewKit.jsx
// 🧰 عدة العرض الموحّدة لكل الفروع (POS / FTR / Production)
// تصميم زجاجي (glassmorphism) بألوان طيفية خفيفة:
//   السنة = بنفسجي باستيل، الشهر = سماوي باستيل، اليوم = زمردي باستيل
// تُستخدم من كل ملفات العرض السبعة لتوحيد شجرة التاريخ والإطار العام.

import React, { useEffect, useMemo, useState } from "react";

/* =========================================================
   Helpers مشتركة
   ========================================================= */
export const safe = (v) => (v ?? "");

export const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

export const btn = (bg) => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
});

export const formatDMY = (iso) => {
  if (!iso) return iso;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

export const isFilledRow = (r = {}) =>
  Object.values(r).some((v) => String(v ?? "").trim() !== "");

export const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const todayDubai = () => {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }
};

// يحوّل Date إلى YYYY-MM-DD (محلي)
export const toISODate = (d) => {
  if (!(d instanceof Date) || isNaN(d)) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export const monthLabel = (mm) => MONTH_NAMES[Number(mm) - 1] || `Month ${mm}`;

/* =========================================================
   🎨 ثيم زجاجي طيفي خفيف
   ========================================================= */
export const SPECTRUM = {
  // طبقات الطيف: سنة → شهر → يوم
  year: {
    bg: "linear-gradient(135deg, rgba(196,181,253,0.35), rgba(221,214,254,0.20))",
    border: "1px solid rgba(139,92,246,0.40)",
    color: "#5b21b6",
    shadow: "0 2px 10px rgba(139,92,246,0.12)",
  },
  month: {
    bg: "linear-gradient(135deg, rgba(125,211,252,0.32), rgba(186,230,253,0.18))",
    border: "1px solid rgba(14,165,233,0.38)",
    color: "#075985",
    shadow: "0 2px 10px rgba(14,165,233,0.10)",
  },
  day: {
    bg: "linear-gradient(135deg, rgba(167,243,208,0.30), rgba(209,250,229,0.16))",
    border: "1px solid rgba(16,185,129,0.35)",
    color: "#065f46",
    shadow: "0 1px 8px rgba(16,185,129,0.10)",
  },
  dayActive: {
    bg: "linear-gradient(135deg, #8b5cf6 0%, #0ea5e9 55%, #10b981 100%)",
    border: "1px solid rgba(255,255,255,0.55)",
    color: "#ffffff",
    shadow: "0 4px 16px rgba(99,102,241,0.35)",
  },
};

export const GLASS = {
  // إطار الصفحة الكامل
  shell: {
    background:
      "linear-gradient(135deg, #f5f3ff 0%, #eff6ff 35%, #ecfeff 70%, #ecfdf5 100%)",
    border: "1px solid rgba(255,255,255,0.7)",
    borderRadius: 18,
    padding: 16,
    color: "#0b1f4d",
    direction: "ltr",
    boxShadow: "0 10px 35px rgba(99,102,241,0.10)",
  },
  // بطاقة زجاجية عامة
  card: {
    background: "rgba(255,255,255,0.55)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.75)",
    borderRadius: 14,
    boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
  },
  // بطاقة المحتوى (يمين)
  content: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: 14,
    boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
    padding: 14,
    minWidth: 0,
    fontSize: 15,
  },
};

/* =========================================================
   🐚 GlassShell — إطار الصفحة: عنوان + أزرار + محتوى
   ========================================================= */
export function GlassShell({ icon = "📄", title, actions, children }) {
  return (
    <div style={GLASS.shell}>
      <div
        style={{
          ...GLASS.card,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 16px",
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 21, display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 25,
              filter: "drop-shadow(0 2px 4px rgba(99,102,241,0.35))",
            }}
          >
            {icon}
          </span>
          <span
            style={{
              background: "linear-gradient(90deg,#6d28d9,#0284c7,#059669)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {title}
          </span>
        </div>
        {actions && (
          <div
            style={{
              marginInlineStart: "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/* =========================================================
   🔍 SearchBar — شريط بحث زجاجي موحّد
   ========================================================= */
export function SearchBar({ value, onChange, placeholder, count = null, hint = "🔎 Search (ALL days)" }) {
  return (
    <div
      style={{
        ...GLASS.card,
        padding: 10,
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontWeight: 900, color: "#5b21b6" }}>{hint}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: "1 1 480px",
          minWidth: 240,
          border: "1px solid rgba(139,92,246,0.35)",
          background: "rgba(255,255,255,0.8)",
          borderRadius: 10,
          padding: "10px 13px",
          outline: "none",
          fontSize: 15,
        }}
      />
      <button
        onClick={() => onChange("")}
        disabled={!value}
        style={{
          ...btn(value ? "#6b7280" : "#9ca3af"),
          opacity: value ? 1 : 0.55,
          cursor: value ? "pointer" : "not-allowed",
        }}
        title="Clear search"
      >
        Clear
      </button>
      {count !== null && (
        <div style={{ marginInlineStart: "auto", fontSize: 14, color: "#374151", fontWeight: 800 }}>
          {norm(value) ? (
            <>
              Matches (all days):{" "}
              <span
                style={{
                  background: "linear-gradient(90deg,#6d28d9,#0284c7)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {count}
              </span>
            </>
          ) : (
            <>Search is empty</>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   🧭 GlobalResults — نتائج البحث عبر كل الأيام
   items: [{ key, date (ISO), title, subtitle }]
   ========================================================= */
export function GlobalResults({ searchActive, items, activeDate, onJump, maxShown = 200 }) {
  const shown = items.slice(0, maxShown);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 6, color: "#075985", fontSize: 16 }}>🧭 Global Results</div>
      {!searchActive ? (
        <div style={{ color: "#6b7280", fontSize: 13.5 }}>
          Type in the search box to see matches across all saved days.
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: "#b91c1c", fontSize: 13.5 }}>No matches across all days.</div>
      ) : (
        <div
          style={{
            maxHeight: 210,
            overflowY: "auto",
            ...GLASS.card,
            borderRadius: 10,
          }}
        >
          {shown.map((g, idx) => (
            <button
              key={`${g.key || idx}`}
              onClick={() => onJump(g.date)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                border: "none",
                borderBottom: "1px solid rgba(139,92,246,0.12)",
                background:
                  g.date === activeDate
                    ? "linear-gradient(90deg, rgba(196,181,253,0.30), rgba(125,211,252,0.22))"
                    : "transparent",
                cursor: "pointer",
              }}
              title="Open this date"
            >
              <div style={{ fontWeight: 900, fontSize: 13.5, color: "#111827" }}>
                {formatDMY(g.date)}
                {g.tag && (
                  <span style={{ marginLeft: 8, fontWeight: 700, color: "#6b7280" }}>• {g.tag}</span>
                )}
              </div>
              {g.label && (
                <div style={{ fontSize: 13.5, color: "#0b1f4d", marginTop: 2 }}>{g.label}</div>
              )}
            </button>
          ))}
          {items.length > maxShown && (
            <div style={{ padding: 8, fontSize: 13.5, color: "#6b7280" }}>
              Showing first {maxShown} results (refine search to narrow).
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   🌈 DateTreeSidebar — شجرة التاريخ الزجاجية الطيفية
   واجهة موحّدة للنموذجين:
     - نموذج التواريخ:   items = [{ key: "2026-06-01", dateISO: "2026-06-01", label }]
     - نموذج التقارير:   items = [{ key: id, dateISO, label, data: report }]
   props:
     items, activeKey, onPick(item), title, loading, emptyText, topSlot
   ========================================================= */
export function DateTreeSidebar({
  items = [],
  activeKey = null,
  onPick,
  title = "📅 Date Tree",
  loading = false,
  emptyText = "No available dates.",
  topSlot = null,
  maxHeight = 420,
}) {
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});

  // تجميع سنة → شهر → أيام (الأحدث أولاً)
  const grouped = useMemo(() => {
    const acc = {};
    for (const it of items) {
      const m = String(it.dateISO || "").match(/^(\d{4})-(\d{2})/);
      if (!m) continue;
      const [, y, mo] = m;
      (acc[y] ||= {});
      (acc[y][mo] ||= []).push(it);
    }
    const out = {};
    for (const y of Object.keys(acc).sort((a, b) => Number(b) - Number(a))) {
      out[y] = {};
      for (const mo of Object.keys(acc[y]).sort((a, b) => Number(b) - Number(a))) {
        out[y][mo] = acc[y][mo]
          .slice()
          .sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
      }
    }
    return out;
  }, [items]);

  // كشف موقع العنصر النشط تلقائياً (يفتح سنته وشهره)
  const activeISO = useMemo(() => {
    const it = items.find((x) => x.key === activeKey);
    return it?.dateISO || "";
  }, [items, activeKey]);

  useEffect(() => {
    const m = String(activeISO).match(/^(\d{4})-(\d{2})/);
    if (!m) return;
    const [, y, mo] = m;
    setOpenYears((p) => (p[y] ? p : { ...p, [y]: true }));
    setOpenMonths((p) => (p[`${y}-${mo}`] ? p : { ...p, [`${y}-${mo}`]: true }));
  }, [activeISO]);

  const toggleYear = (y) => setOpenYears((p) => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, mo) =>
    setOpenMonths((p) => ({ ...p, [`${y}-${mo}`]: !p[`${y}-${mo}`] }));

  const rowBtn = (layer, extra = {}) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    background: layer.bg,
    border: layer.border,
    color: layer.color,
    boxShadow: layer.shadow,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 15.5,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    transition: "transform .12s ease, box-shadow .12s ease",
    ...extra,
  });

  const badge = (n, color) => (
    <span
      style={{
        fontSize: 13,
        fontWeight: 800,
        background: "rgba(255,255,255,0.65)",
        border: `1px solid ${color}33`,
        color,
        borderRadius: 999,
        padding: "1px 9px",
        marginInlineStart: 6,
      }}
    >
      {n}
    </span>
  );

  return (
    <div style={{ ...GLASS.card, padding: 12, height: "fit-content" }}>
      {topSlot}
      <div
        style={{
          fontWeight: 900,
          fontSize: 17,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "linear-gradient(90deg,#6d28d9,#0284c7,#059669)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {title}
      </div>

      <div style={{ maxHeight, overflowY: "auto", paddingRight: 2 }}>
        {loading ? (
          <div style={{ color: "#6b7280", fontSize: 14.5 }}>⏳ Loading…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 14.5 }}>{emptyText}</div>
        ) : (
          Object.entries(grouped).map(([year, months]) => {
            const yOpen = !!openYears[year];
            const daysInYear = Object.values(months).reduce((s, arr) => s + arr.length, 0);
            return (
              <div key={year} style={{ marginBottom: 8 }}>
                {/* 🟪 سنة */}
                <button onClick={() => toggleYear(year)} style={rowBtn(SPECTRUM.year)} title={yOpen ? "Collapse" : "Expand"}>
                  <span>
                    📅 {year}
                    {badge(daysInYear, SPECTRUM.year.color)}
                  </span>
                  <span aria-hidden="true">{yOpen ? "▾" : "▸"}</span>
                </button>

                {yOpen && (
                  <div
                    style={{
                      marginTop: 6,
                      marginInlineStart: 10,
                      paddingInlineStart: 8,
                      borderInlineStart: "2px solid rgba(139,92,246,0.25)",
                    }}
                  >
                    {Object.entries(months).map(([month, days]) => {
                      const mKey = `${year}-${month}`;
                      const mOpen = !!openMonths[mKey];
                      return (
                        <div key={mKey} style={{ marginBottom: 6 }}>
                          {/* 🟦 شهر */}
                          <button
                            onClick={() => toggleMonth(year, month)}
                            style={rowBtn(SPECTRUM.month, { fontWeight: 700, padding: "9px 13px" })}
                            title={mOpen ? "Collapse" : "Expand"}
                          >
                            <span>
                              {monthLabel(month)}
                              {badge(days.length, SPECTRUM.month.color)}
                            </span>
                            <span aria-hidden="true">{mOpen ? "▾" : "▸"}</span>
                          </button>

                          {mOpen && (
                            <ul
                              style={{
                                listStyle: "none",
                                padding: "6px 0 0 0",
                                margin: 0,
                                marginInlineStart: 10,
                                paddingInlineStart: 8,
                                borderInlineStart: "2px solid rgba(14,165,233,0.22)",
                              }}
                            >
                              {days.map((it) => {
                                const active = it.key === activeKey;
                                const layer = active ? SPECTRUM.dayActive : SPECTRUM.day;
                                return (
                                  <li key={it.key} style={{ marginBottom: 5 }}>
                                    {/* 🟩 يوم */}
                                    <button
                                      onClick={() => onPick(it)}
                                      style={rowBtn(layer, {
                                        fontWeight: active ? 900 : 700,
                                        padding: "9px 13px",
                                        justifyContent: "flex-start",
                                        gap: 6,
                                      })}
                                      title={it.label}
                                    >
                                      <span aria-hidden="true">{active ? "📍" : "•"}</span>
                                      <span>{it.label}</span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
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
    </div>
  );
}

/* =========================================================
   📐 SidebarLayout — تخطيط: شجرة يسار + محتوى يمين
   ========================================================= */
export function SidebarLayout({ sidebar, children, sidebarWidth = 330 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `${sidebarWidth}px 1fr`, gap: 12 }}>
      {sidebar}
      <div style={GLASS.content}>{children}</div>
    </div>
  );
}

/* =========================================================
   🖼️ Lightbox — عرض الصور بنافذة منبثقة
   الاستخدام:
     const { openImage, lightbox } = useLightbox();
     <img ... style={{ cursor: "zoom-in" }} onClick={() => openImage(src)} />
     {lightbox}  // ضعه مرة واحدة في الجذر
   ========================================================= */
export function useLightbox() {
  const [items, setItems] = useState(null); // [src,...] | null
  const [idx, setIdx] = useState(0);

  const openImage = (src, gallery) => {
    if (!src) return;
    const list = Array.isArray(gallery) && gallery.length ? gallery : [src];
    const start = Math.max(0, list.indexOf(src));
    setItems(list);
    setIdx(start === -1 ? 0 : start);
  };
  const close = () => setItems(null);

  useEffect(() => {
    if (!items) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") setIdx((i) => Math.min(items.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items]);

  const navBtn = (extra) => ({
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.92)",
    color: "#0f172a",
    fontSize: 26,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...extra,
  });

  const lightbox = items ? (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15,23,42,0.88)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        cursor: "zoom-out",
      }}
    >
      <button
        onClick={close}
        title="Close (Esc)"
        style={{
          position: "absolute",
          top: 18,
          right: 22,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.92)",
          color: "#0f172a",
          fontSize: 24,
          fontWeight: 900,
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
        }}
      >
        ×
      </button>

      {items.length > 1 && idx > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.max(0, i - 1)); }}
          style={navBtn({ left: 22 })}
          title="Previous (←)"
        >
          ‹
        </button>
      )}

      <img
        src={items[idx]}
        alt="preview"
        crossOrigin="anonymous"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "92vw",
          maxHeight: "90vh",
          objectFit: "contain",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          cursor: "default",
          background: "#fff",
        }}
      />

      {items.length > 1 && idx < items.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.min(items.length - 1, i + 1)); }}
          style={navBtn({ right: 22 })}
          title="Next (→)"
        >
          ›
        </button>
      )}

      {items.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.9)",
            color: "#0f172a",
            borderRadius: 999,
            padding: "5px 14px",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {idx + 1} / {items.length}
        </div>
      )}
    </div>
  ) : null;

  return { openImage, lightbox };
}

/* =========================================================
   حالات عرض جاهزة
   ========================================================= */
export function EmptyState({ text = "No report for this date." }) {
  return (
    <div
      style={{
        padding: 18,
        border: "1.5px dashed rgba(139,92,246,0.45)",
        borderRadius: 12,
        textAlign: "center",
        color: "#5b21b6",
        fontWeight: 700,
        fontSize: 16,
        background: "rgba(245,243,255,0.5)",
      }}
    >
      {text}
    </div>
  );
}
