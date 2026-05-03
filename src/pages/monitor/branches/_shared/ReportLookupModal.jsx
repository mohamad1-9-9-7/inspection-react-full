// src/pages/monitor/branches/_shared/ReportLookupModal.jsx
// مودال بحث ذكي عام: يجلب تقارير من السيرفر حسب type، يفلتر بنص بحث متعدّد الحقول،
// يعرض النتائج كقائمة قابلة للضغط.
//
// يدعم وضعَين:
//  1) Default: كل تقرير = صف واحد (للشحنات مثلاً).
//  2) Flatten: كل صف داخلي بالتقرير = صف منفصل (للسيارات/المنتجات داخل تقرير يومي).
//
// الاستخدام (flatten):
//   <ReportLookupModal
//     ...
//     flatten={(report) => {
//       const vehicles = report?.payload?.vehicles || [];
//       return vehicles.map((v, idx) => ({ report, sub: v, subIdx: idx }));
//     }}
//     searchFields={({ report, sub }) => [sub?.vehicleNo, sub?.driverName]}
//     displayItem={({ report, sub }) => ({ primary: ..., secondary: ... })}
//     onPick={({ report, sub, subIdx }) => {...}}
//   />

import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../../../config/api";

export default function ReportLookupModal({
  open,
  onClose,
  onPick,
  type,
  title = "🔍 Search Reports",
  searchPlaceholder = "Search...",
  searchFields = () => [],
  displayItem = () => ({ primary: "—", secondary: "" }),
  emptyText = "لا توجد تقارير.",
  flatten = null, // (report) => [{ report, sub, subIdx }]
  treeMode = false, // عرض شجرة سنة > شهر > يوم
  getDate = null,   // (ctx) => "YYYY-MM-DD" — مطلوب مع treeMode
  initialSearch = "", // نص بحث افتراضي عند الفتح
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState(initialSearch || "");

  // عند فتح المودال، استخدم initialSearch
  useEffect(() => {
    if (open) setQ(initialSearch || "");
  }, [open, initialSearch]);

  // دعم type واحد أو مصفوفة types[] لجلب من أنواع متعدّدة
  const typeKey = Array.isArray(type) ? type.join("|") : (type || "");

  useEffect(() => {
    if (!open || !typeKey) return;
    let cancelled = false;
    setLoading(true);
    setErr("");
    const types = Array.isArray(type) ? type : [type];
    Promise.all(
      types.map((t) =>
        fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(t)}`, {
          cache: "no-store",
        })
          .then((r) => (r.ok ? r.json() : []))
          .then((json) => {
            const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
            // وسم كل عنصر بنوعه (مفيد عند الجلب من أنواع متعدّدة)
            return arr.map((it) => ({ ...it, _sourceType: t }));
          })
          .catch(() => [])
      )
    )
      .then((results) => {
        if (cancelled) return;
        const merged = results.flat();
        merged.sort((a, b) => {
          const da = a?.createdAt || a?.payload?.savedAt || "";
          const db = b?.createdAt || b?.payload?.savedAt || "";
          return da < db ? 1 : -1;
        });
        setItems(merged);
      })
      .catch((e) => !cancelled && setErr(String(e?.message || e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open, typeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // إذا كان flatten موجود، نوسّع كل تقرير إلى صفوف داخلية متعدّدة
  const expanded = useMemo(() => {
    if (typeof flatten !== "function") {
      // وضع افتراضي: كل تقرير صف واحد، الـ context = payload
      // نُضيف _sourceType إلى ctx ليعرف العارض من أين جاء التقرير
      return items.map((it) => {
        const payload = it?.payload || {};
        // نُمرّر payload كما هو، لكن نضيف خاصية مخفية للنوع
        const enrichedPayload = it?._sourceType
          ? Object.assign({}, payload, { __sourceType: it._sourceType })
          : payload;
        return {
          key: it?.id || it?._id || Math.random(),
          ctx: enrichedPayload,
          report: it,
        };
      });
    }
    const out = [];
    for (const it of items) {
      try {
        const subs = flatten(it) || [];
        if (!Array.isArray(subs) || subs.length === 0) {
          // تقرير بدون صفوف داخلية — أعرضه كما هو
          out.push({
            key: it?.id || it?._id || Math.random(),
            ctx: { report: it, payload: it?.payload || {}, sub: null, subIdx: -1, sourceType: it?._sourceType },
            report: it,
          });
        } else {
          subs.forEach((s, i) => {
            out.push({
              key: `${it?.id || it?._id || "r"}-${s?.subIdx ?? i}`,
              ctx: { report: it, payload: it?.payload || {}, sub: s?.sub, subIdx: s?.subIdx ?? i, sourceType: it?._sourceType, ...s },
              report: it,
            });
          });
        }
      } catch {
        // تجاهل التقرير المعطوب
      }
    }
    return out;
  }, [items, flatten]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return expanded;
    return expanded.filter((row) => {
      const fields = searchFields(row.ctx) || [];
      const hay = fields
        .filter(Boolean)
        .map((x) => String(x).toLowerCase())
        .join(" | ");
      return hay.includes(needle);
    });
  }, [expanded, q, searchFields]);

  /* ====== شجرة سنة > شهر > يوم ====== */
  const tree = useMemo(() => {
    if (!treeMode || typeof getDate !== "function") return null;
    const byYear = new Map();
    for (const row of filtered) {
      const dateStr = String(getDate(row.ctx) || "").slice(0, 10);
      if (!dateStr) continue;
      const [y, m] = dateStr.split("-");
      if (!y || !m) continue;
      if (!byYear.has(y)) byYear.set(y, new Map());
      const mm = byYear.get(y);
      if (!mm.has(m)) mm.set(m, new Map());
      const dd = mm.get(m);
      const arr = dd.get(dateStr) || [];
      arr.push(row);
      dd.set(dateStr, arr);
    }
    const years = Array.from(byYear.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([y, mm]) => ({
        year: y,
        months: Array.from(mm.entries())
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .map(([m, dd]) => ({
            ym: `${y}-${m}`,
            days: Array.from(dd.entries())
              .sort((a, b) => (a[0] < b[0] ? 1 : -1))
              .map(([date, rows]) => ({ date, rows })),
          })),
      }));
    return years;
  }, [filtered, treeMode, getDate]);

  // العقد المطويّة (مفعّل فقط في tree mode)
  const [collapsed, setCollapsed] = useState(new Set());

  // افتراضياً: كل العقد مطويّة (المستخدم يفتح ما يريد فقط)
  useEffect(() => {
    if (!tree || !tree.length) return;
    const initial = new Set();
    for (const y of tree) {
      initial.add(`y:${y.year}`);
      for (const m of y.months) initial.add(`m:${m.ym}`);
      for (const m of y.months) {
        for (const d of m.days) initial.add(`d:${d.date}`);
      }
    }
    setCollapsed(initial);
  }, [tree?.length]); // eslint-disable-line

  // عند الكتابة في البحث، افتح كل شي ليظهر النتائج
  useEffect(() => {
    if (q.trim() && tree) setCollapsed(new Set());
  }, [q, tree]);

  function toggle(key) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  const isCollapsed = (key) => collapsed.has(key);
  const monthName = (ym) => {
    const [y, m] = ym.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return `${date.toLocaleString("en", { month: "long" })} ${y}`;
  };

  const handlePick = (row) => {
    const arg = typeof flatten === "function" ? row.ctx : row.report;
    onPick?.(arg);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.box} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <h3 style={S.title}>{title}</h3>
          <button onClick={onClose} style={S.closeBtn}>✖</button>
        </div>

        <div style={S.searchBar}>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`🔎 ${searchPlaceholder}`}
            style={S.searchInput}
            autoFocus
          />
          <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 700 }}>
            {filtered.length} / {items.length}
          </span>
        </div>

        <div style={S.body}>
          {loading && <div style={S.empty}>⏳ جارٍ التحميل...</div>}
          {err && <div style={{ ...S.empty, color: "#b91c1c" }}>❌ {err}</div>}
          {!loading && !err && filtered.length === 0 && (
            <div style={S.empty}>{q ? "لا نتائج لهذا البحث." : emptyText}</div>
          )}

          {/* === Tree Mode === */}
          {!loading && !err && tree && tree.length > 0 && tree.map((y) => {
            const yKey = `y:${y.year}`;
            const yCollapsed = isCollapsed(yKey);
            const yCount = y.months.reduce(
              (s, m) => s + m.days.reduce((s2, d) => s2 + d.rows.length, 0),
              0
            );
            return (
              <div key={y.year}>
                <button type="button" onClick={() => toggle(yKey)} style={S.yearBtn}>
                  <span style={S.chev(yCollapsed)}>▾</span>
                  <span style={{ flex: 1, textAlign: "start" }}>📅 {y.year}</span>
                  <span style={S.count}>{yCount}</span>
                </button>

                {!yCollapsed && y.months.map((m) => {
                  const mKey = `m:${m.ym}`;
                  const mCollapsed = isCollapsed(mKey);
                  const mCount = m.days.reduce((s, d) => s + d.rows.length, 0);
                  return (
                    <div key={m.ym} style={{ marginInlineStart: 12 }}>
                      <button type="button" onClick={() => toggle(mKey)} style={S.monthBtn}>
                        <span style={S.chev(mCollapsed)}>▾</span>
                        <span style={{ flex: 1, textAlign: "start" }}>🗂️ {monthName(m.ym)}</span>
                        <span style={S.count}>{mCount}</span>
                      </button>

                      {!mCollapsed && m.days.map((d) => {
                        const dKey = `d:${d.date}`;
                        const dCollapsed = isCollapsed(dKey);
                        return (
                          <div key={d.date} style={{ marginInlineStart: 12 }}>
                            <button type="button" onClick={() => toggle(dKey)} style={S.dayBtn}>
                              <span style={S.chev(dCollapsed)}>▾</span>
                              <span style={{ flex: 1, textAlign: "start" }}>📅 {d.date}</span>
                              <span style={S.count}>{d.rows.length}</span>
                            </button>

                            {!dCollapsed && (
                              <div style={{ marginInlineStart: 14, marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                                {d.rows.map((row) => {
                                  const display = displayItem(row.ctx) || {};
                                  return (
                                    <button
                                      key={row.key}
                                      type="button"
                                      onClick={() => handlePick(row)}
                                      style={S.item}
                                    >
                                      <div style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
                                        <div style={S.primary}>{display.primary || "—"}</div>
                                        {display.secondary && (
                                          <div style={S.secondary}>{display.secondary}</div>
                                        )}
                                        {Array.isArray(display.chips) && display.chips.length > 0 && (
                                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                            {display.chips.map((c, i) => (
                                              <span key={i} style={S.chip}>{c}</span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <span style={S.pickBtn}>اختيار ←</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* === Flat Mode (الافتراضي) === */}
          {!loading && !err && !tree && filtered.map((row) => {
            const display = displayItem(row.ctx) || {};
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => handlePick(row)}
                style={S.item}
              >
                <div style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
                  <div style={S.primary}>{display.primary || "—"}</div>
                  {display.secondary && (
                    <div style={S.secondary}>{display.secondary}</div>
                  )}
                  {Array.isArray(display.chips) && display.chips.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {display.chips.map((c, i) => (
                        <span key={i} style={S.chip}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={S.pickBtn}>اختيار ←</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  box: {
    background: "#fff",
    borderRadius: 14,
    width: "100%",
    maxWidth: 720,
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
    overflow: "hidden",
    direction: "rtl",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  header: {
    background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
    color: "#fff",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { margin: 0, fontSize: "1.1rem", fontWeight: 800 },
  closeBtn: {
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "#fff",
    width: 30,
    height: 30,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
  },
  searchBar: {
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    padding: "10px 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: "0.95rem",
    outline: "none",
  },
  body: {
    overflowY: "auto",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    flex: 1,
  },
  empty: {
    padding: 30,
    textAlign: "center",
    color: "#64748b",
    fontWeight: 700,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "12px 14px",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "start",
    transition: "all .12s ease",
  },
  primary: {
    fontWeight: 800,
    color: "#0b1f4d",
    fontSize: "1rem",
  },
  secondary: {
    fontSize: "0.85rem",
    color: "#64748b",
    fontWeight: 600,
    marginTop: 2,
  },
  chip: {
    background: "#f1f5f9",
    color: "#0b1f4d",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: "0.75rem",
    fontWeight: 800,
  },
  pickBtn: {
    background: "#eef2ff",
    color: "#1e40af",
    padding: "6px 12px",
    borderRadius: 8,
    fontWeight: 800,
    fontSize: "0.85rem",
    flexShrink: 0,
  },
  yearBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "10px 12px",
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontWeight: 900,
    color: "#0b1f4d",
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 4,
  },
  monthBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "8px 12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontWeight: 800,
    color: "#0b1f4d",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 4,
  },
  dayBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "7px 12px",
    background: "#fff",
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    fontWeight: 700,
    color: "#0b1f4d",
    fontSize: 12.5,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 4,
  },
  chev: (collapsed) => ({
    display: "inline-block",
    transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
    transition: "transform .12s ease",
    width: 14,
    fontSize: 10,
    color: "#64748b",
  }),
  count: {
    fontSize: 11,
    fontWeight: 900,
    background: "#e0e7ff",
    color: "#1e40af",
    padding: "1px 8px",
    borderRadius: 999,
    minWidth: 24,
    textAlign: "center",
  },
};
