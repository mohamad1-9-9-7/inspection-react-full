// src/pages/monitor/branches/_shared/CollapsibleDateTree.jsx
// شجرة تواريخ قابلة للطيّ (سنة → شهر → يوم → وقت)
// تُستخدم في FTR1/FTR2 Preloading Viewers وغيرها.
//
// props:
//   groupedNav: [{ year, months: [{ ym, days: [{ date, items: [...] }] }] }]
//   activeId: id العنصر المختار حالياً
//   onSelectItem: callback(item)
//   onRefresh: callback()
//   storageKey: مفتاح اختياري لحفظ حالة التوسيع في localStorage

import React, { useEffect, useMemo, useState } from "react";

const COLORS = {
  ink: "#0b1f4d",
  sub: "#475569",
  primary: "#1d4ed8",
  border: "#e5e7eb",
};

function loadCollapsed(key) {
  if (!key) return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveCollapsed(key, set) {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
}

export default function CollapsibleDateTree({
  groupedNav = [],
  activeId,
  activeDate,
  onSelectItem,
  onRefresh,
  storageKey,
}) {
  // عناصر مطويّة (افتراضياً: كل شي مفتوح، إلا اللي محفوظ مطوي في localStorage)
  const [collapsed, setCollapsed] = useState(() => loadCollapsed(storageKey));

  useEffect(() => { saveCollapsed(storageKey, collapsed); }, [collapsed, storageKey]);

  // عند أول mount: لو ما في حالة محفوظة، اطوِ كل السنوات/الشهور القديمة
  // وأبقِ السنة والشهر الحاليين مفتوحين
  useEffect(() => {
    if (!groupedNav.length) return;
    const saved = loadCollapsed(storageKey);
    if (saved.size) return; // المستخدم سبق وحفظ تفضيلاته
    if (!groupedNav[0]) return;
    const initial = new Set();
    // اطوِ كل السنوات ما عدا الأولى (الأحدث)
    for (let i = 1; i < groupedNav.length; i++) {
      initial.add(`y:${groupedNav[i].year}`);
    }
    // داخل السنة الأحدث، اطوِ كل الشهور ما عدا الأول (الأحدث)
    const firstYear = groupedNav[0];
    if (firstYear?.months) {
      for (let i = 1; i < firstYear.months.length; i++) {
        initial.add(`m:${firstYear.months[i].ym}`);
      }
    }
    setCollapsed(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedNav.length]);

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

  const totals = useMemo(() => {
    let dCount = 0, iCount = 0;
    for (const y of groupedNav) {
      for (const m of y.months) {
        for (const d of m.days) {
          dCount++;
          iCount += d.items.length;
        }
      }
    }
    return { days: dCount, items: iCount };
  }, [groupedNav]);

  return (
    <aside style={S.shell}>
      <div style={S.header}>
        <div style={{ fontWeight: 900, color: COLORS.ink, fontSize: 14 }}>
          🗓️ All Reports
        </div>
        <button onClick={onRefresh} style={S.refreshBtn} title="Refresh">
          ⟳
        </button>
      </div>
      <div style={S.totals}>
        {totals.items} تقرير · {totals.days} يوم
      </div>

      {groupedNav.length === 0 && (
        <div style={{ fontSize: 12, color: COLORS.sub, padding: 8 }}>
          لا توجد تقارير.
        </div>
      )}

      <div style={{ overflowY: "auto", flex: 1 }}>
        {groupedNav.map((y) => {
          const yKey = `y:${y.year}`;
          const yCollapsed = isCollapsed(yKey);
          const yItems = y.months.reduce(
            (s, m) => s + m.days.reduce((s2, d) => s2 + d.items.length, 0),
            0
          );
          return (
            <div key={y.year} style={{ marginTop: 4 }}>
              <button
                style={S.yearRow(yCollapsed)}
                onClick={() => toggle(yKey)}
                type="button"
              >
                <span style={S.chev(yCollapsed)}>▾</span>
                <span style={{ flex: 1, textAlign: "start" }}>📅 {y.year}</span>
                <span style={S.count}>{yItems}</span>
              </button>

              {!yCollapsed && y.months.map((m) => {
                const mKey = `m:${m.ym}`;
                const mCollapsed = isCollapsed(mKey);
                const mItems = m.days.reduce((s, d) => s + d.items.length, 0);
                return (
                  <div key={m.ym} style={{ marginInlineStart: 10 }}>
                    <button
                      style={S.monthRow(mCollapsed)}
                      onClick={() => toggle(mKey)}
                      type="button"
                    >
                      <span style={S.chev(mCollapsed)}>▾</span>
                      <span style={{ flex: 1, textAlign: "start" }}>
                        🗂️ {monthName(m.ym)}
                      </span>
                      <span style={S.count}>{mItems}</span>
                    </button>

                    {!mCollapsed && m.days.map((d) => {
                      const dKey = `d:${d.date}`;
                      const dCollapsed = isCollapsed(dKey);
                      const isActiveDay = d.date === activeDate;
                      return (
                        <div key={d.date} style={{ marginInlineStart: 10 }}>
                          <button
                            style={S.dayRow(dCollapsed, isActiveDay)}
                            onClick={() => toggle(dKey)}
                            type="button"
                          >
                            <span style={S.chev(dCollapsed)}>▾</span>
                            <span style={{ flex: 1, textAlign: "start" }}>
                              {d.date}
                            </span>
                            <span style={S.count}>{d.items.length}</span>
                          </button>

                          {!dCollapsed && (
                            <div style={{ marginInlineStart: 18, paddingBottom: 4 }}>
                              {d.items.map((it) => {
                                const tm = (it?.createdAt || "").slice(11, 16);
                                const isActive =
                                  (it.id || it._id) === activeId;
                                return (
                                  <button
                                    key={it.id || it._id}
                                    onClick={() => onSelectItem?.(it)}
                                    style={S.timeBtn(isActive)}
                                    title={`Open ${d.date} ${tm || ""}`}
                                  >
                                    🕓 {tm || "—"}
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
      </div>
    </aside>
  );
}

/* ===== Styles ===== */
const S = {
  shell: {
    background: "#fff",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,.06)",
    maxHeight: "78vh",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  refreshBtn: {
    background: "#eef2ff",
    border: `1px solid ${COLORS.primary}`,
    color: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 14,
  },
  totals: {
    fontSize: 11,
    color: COLORS.sub,
    fontWeight: 700,
    paddingBottom: 4,
  },
  chev: (collapsed) => ({
    display: "inline-block",
    transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
    transition: "transform .12s ease",
    width: 14,
    fontSize: 10,
    color: COLORS.sub,
  }),
  count: {
    fontSize: 11,
    fontWeight: 900,
    background: "#f1f5f9",
    color: COLORS.ink,
    padding: "1px 7px",
    borderRadius: 999,
    minWidth: 22,
    textAlign: "center",
  },
  yearRow: (collapsed) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "8px 10px",
    background: "#f8fafc",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    fontWeight: 900,
    color: COLORS.ink,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "start",
  }),
  monthRow: (collapsed) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "6px 10px",
    background: "#fbfdff",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    fontWeight: 800,
    color: COLORS.ink,
    fontSize: 12.5,
    marginTop: 4,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "start",
  }),
  dayRow: (collapsed, active) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "6px 10px",
    background: active ? "#e0e7ff" : "#ffffff",
    border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
    borderRadius: 8,
    fontWeight: 700,
    color: COLORS.ink,
    fontSize: 12,
    marginTop: 4,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "start",
  }),
  timeBtn: (active) => ({
    display: "block",
    width: "100%",
    textAlign: "start",
    padding: "6px 10px",
    marginTop: 4,
    borderRadius: 8,
    border: active
      ? `1px solid ${COLORS.primary}`
      : `1px dashed ${COLORS.border}`,
    background: active ? "#eef2ff" : "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
    color: COLORS.ink,
    fontFamily: "inherit",
  }),
};
