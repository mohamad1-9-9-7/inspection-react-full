// src/pages/butcher/ButcherPerformance.jsx
//
// 🏆 «أدائي» — كرت المقارنة بأعلى شاشة شغلي.
// My performance: score + rank on the always-visible line, the board on demand.
//
// الشكل: **كرت مطويّ بأعلى الصفحة**. السطر الظاهر دايماً بيحمل الخلاصة —
// نتيجتي وترتيبي بملحمتي وعلى مستوى كل الملاحم — وبضغطة بينفتح الباقي:
// المعايير الستّة، وجدولا الترتيب، وشرح المعادلة.
//
// ليش مطوي: الجزار بيفوت على الشاشة عشان شغل يومه، مش عشان جدول ترتيب.
// الخلاصة بتكفيه بنظرة، ومين بدّه يعرف «ليش» بيفتح. والبيانات بتنسحب على أي
// حال (سطر مجمَّع لكل جزار، بضع مئات البايتات) فالطيّ ما بيخبّي كلفة.
//
// الحساب كلّه بـbutcherStats.js — هون العرض وبس.

import React, { useMemo, useState } from "react";
import {
  METRICS, MIN_OPS, STAT_WEIGHTS, buildBoards, groupAvg, useButcherStats,
} from "./butcherStats";

const K = {
  ink: "#0f2740", ink2: "#3c5a75", mut: "#7b93a8", line: "#dde9f5",
  soft: "#f6fafe", raw: "#14507f", good: "#0f766e", yield: "#047857", waste: "#b45309",
};
const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const shiftIso = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const n1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : "—");
const n2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : "—");

/** قيمة معيار بصيغتها المقروءة. */
function fmtMetric(id, v, isAr) {
  if (v === null || !Number.isFinite(v)) return "—";
  if (id === "ops") return String(Math.round(v));
  if (id === "raw") return `${n1(v)} ${isAr ? "كجم" : "kg"}`;
  if (id === "speed") return n2(v);
  if (id === "steady") return `±${n1(v)}`;
  return `${n1(v)}%`;
}

const medal = (rank) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank);

/* ══════════════ الكرت ══════════════ */

export default function ButcherPerformance({ empNo, t, isAr, KG }) {
  const [open, setOpen] = useState(false);        // مطويّ افتراضياً
  const [days, setDays] = useState(30);
  const [board, setBoard] = useState("branch");   // branch | all
  const [openWhy, setOpenWhy] = useState(false);

  const from = useMemo(() => shiftIso(days - 1), [days]);
  const { rows, loading, error, reload } = useButcherStats({ from, enabled: !!empNo });

  const { myBranch, branchBoard, allBoard } = useMemo(
    () => buildBoards(rows, empNo),
    [rows, empNo]
  );

  const list = board === "branch" ? branchBoard : allBoard;
  const meAll = allBoard.find((x) => x.empNo === String(empNo)) || null;
  const meBranch = branchBoard.find((x) => x.empNo === String(empNo)) || null;
  const ranked = (l) => l.filter((x) => x.score !== null).length;

  const score = meAll && meAll.score !== null ? meAll.score : null;
  const tone = score === null ? K.mut : score >= 75 ? K.yield : score >= 50 ? K.raw : K.waste;

  const TABS = [
    { id: "branch", ar: `ملحمتي${myBranch ? ` · ${myBranch}` : ""}`,
      en: `My butchery${myBranch ? ` · ${myBranch}` : ""}`, n: branchBoard.length },
    { id: "all", ar: "كل الملاحم", en: "All butcheries", n: allBoard.length },
  ];

  return (
    <div style={S.wrap}>
      {/* ── السطر الدائم: الخلاصة ── */}
      <button
        type="button"
        className="mw-press"
        style={S.head}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span style={S.headMain}>
          <span style={{ ...S.scorePill, borderColor: tone, color: tone }}>
            <b className="mw-big">{score === null ? "—" : score}</b>
            <span className="mw-lbl" style={{ opacity: 0.75 }}>/100</span>
          </span>
          <span style={{ minWidth: 0, textAlign: "start" }}>
            <span className="mw-day" style={{ fontWeight: 900, display: "block" }}>
              🏆 {t({ en: "My performance", ar: "أدائي" })}
            </span>
            <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
              {loading
                ? t({ en: "loading…", ar: "جارٍ التحميل…" })
                : error
                  ? t({ en: "could not load", ar: "تعذّر التحميل" })
                  : t({ en: "compared with the other butchers", ar: "مقارنةً بباقي الجزارين" })}
            </span>
          </span>
        </span>

        <span style={S.headSide}>
          <RankChip
            icon="🏪"
            label={myBranch || t({ en: "my butchery", ar: "ملحمتي" })}
            rank={meBranch?.rank}
            total={ranked(branchBoard)}
          />
          <RankChip
            icon="🌍"
            label={t({ en: "all", ar: "الكل" })}
            rank={meAll?.rank}
            total={ranked(allBoard)}
          />
          <span className="mw-big" style={{ color: K.mut, fontWeight: 900 }}>
            {open ? "▲" : "▼"}
          </span>
        </span>
      </button>

      {/* ── التفاصيل ── */}
      {open && (
        <div style={S.body}>
          <div style={S.barRow}>
            <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
              {t({ en: "Period", ar: "الفترة" })}
            </span>
            {[30, 90].map((d) => (
              <button
                key={d}
                type="button"
                className="mw-sm mw-press"
                onClick={() => setDays(d)}
                style={{ ...S.chip, ...(days === d ? S.chipOn : null) }}
              >
                {isAr ? `${d} يوم` : `${d} days`}
              </button>
            ))}
          </div>

          {loading && (
            <div className="mw-sm" style={S.note}>
              {t({ en: "Loading the board…", ar: "جارٍ تحميل الترتيب…" })}
            </div>
          )}

          {!loading && error && (
            <div className="mw-sm" style={{ ...S.note, color: "#a12626" }}>
              ⚠️ {t({ en: "Could not load the performance board.", ar: "تعذّر تحميل لوحة الأداء." })}{" "}
              <button type="button" style={S.linkBtn} onClick={reload}>
                ↻ {t({ en: "Try again", ar: "إعادة المحاولة" })}
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {meAll && !meAll.eligible && (
                <div className="mw-lbl" style={S.warn}>
                  {t({
                    en: `Not enough data yet — ${MIN_OPS} operations are needed for a score; you have ${meAll.ops}.`,
                    ar: `البيانات لسّا ما بتكفي — بدها ${MIN_OPS} عمليات حتى تطلع نتيجة، وعندك ${meAll.ops}.`,
                  })}
                </div>
              )}
              {!meAll && (
                <div className="mw-lbl" style={S.warn}>
                  {t({
                    en: "No operations recorded for you in this period.",
                    ar: "ما في عمليات مسجّلة إلك بهالفترة.",
                  })}
                </div>
              )}

              {/* معاييري مقابل متوسّط المجموعة */}
              {meAll && (
                <div style={S.metricGrid}>
                  {METRICS.map((m) => {
                    const mine = meAll.values[m.id];
                    const avg = groupAvg(list, m.id);
                    const pts = meAll.parts?.[m.id];
                    const better = mine !== null && avg !== null
                      ? (m.higherBetter ? mine >= avg : mine <= avg)
                      : null;
                    return (
                      <div key={m.id} style={S.metricBox}>
                        <div className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
                          {isAr ? m.ar : m.en}
                          <span style={{ opacity: 0.7 }}> · {STAT_WEIGHTS[m.id]}%</span>
                        </div>
                        <div className="mw-big" style={{ fontWeight: 900, color: K.ink }}>
                          {fmtMetric(m.id, mine, isAr)}
                          {better !== null && (
                            <span style={{ fontSize: ".55em", marginInlineStart: 6, color: better ? K.yield : K.waste }}>
                              {better ? "▲" : "▼"}
                            </span>
                          )}
                        </div>
                        <div className="mw-lbl" style={{ color: K.mut, fontWeight: 700 }}>
                          {t({ en: "group avg", ar: "متوسّط المجموعة" })}: {fmtMetric(m.id, avg, isAr)}
                          {Number.isFinite(pts) ? ` · ${pts}/100` : ""}
                        </div>
                        {m.id === "std" && meAll.coverage.std === 0 && (
                          <div className="mw-lbl" style={{ color: K.waste, fontWeight: 800 }}>
                            {t({ en: "no standard on your recipes", ar: "ما في نسب معيارية على وصفاتك" })}
                          </div>
                        )}
                        {m.id === "speed" && meAll.coverage.speed < meAll.ops && (
                          <div className="mw-lbl" style={{ color: K.mut, fontWeight: 700 }}>
                            {isAr
                              ? `محسوب من ${meAll.coverage.speed} من ${meAll.ops} عمليات`
                              : `from ${meAll.coverage.speed} of ${meAll.ops} jobs`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* الجدولان */}
              <div style={S.barRow}>
                {TABS.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className="mw-sm mw-press"
                    onClick={() => setBoard(x.id)}
                    style={{ ...S.chip, ...(board === x.id ? S.chipOn : null) }}
                  >
                    {isAr ? x.ar : x.en} · {x.n}
                  </button>
                ))}
              </div>

              {/* مجموعة صغيرة: التعيير بين طرفين بيطلّع ١٠٠ و٠ وبس */}
              {ranked(list) > 0 && ranked(list) < 3 && (
                <div className="mw-lbl" style={S.warn}>
                  {isAr
                    ? `المقارنة على ${ranked(list)} جزار بس بهالمجموعة — النتيجة نسبية بينهم، وبتتغيّر لما يزيد العدد.`
                    : `Only ${ranked(list)} butcher(s) qualify in this group — the score is relative between them and shifts as more join.`}
                </div>
              )}

              {list.length === 0 ? (
                <div className="mw-sm" style={S.note}>
                  {t({ en: "No butchers in this group yet.", ar: "ما في جزارين بهالمجموعة بعد." })}
                </div>
              ) : (
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>#</th>
                        <th style={{ ...S.th, textAlign: "start" }}>{t({ en: "Butcher", ar: "الجزار" })}</th>
                        <th style={S.th}>{t({ en: "Score", ar: "النتيجة" })}</th>
                        <th style={S.th}>{t({ en: "Jobs", ar: "عمليات" })}</th>
                        <th style={S.th}>{t({ en: "Raw", ar: "الخام" })} ({KG})</th>
                        <th style={S.th}>{t({ en: "Waste", ar: "الهدر" })}</th>
                        <th style={S.th}>{t({ en: "Standard", ar: "المعياري" })}</th>
                        <th style={S.th}>{t({ en: "Steady", ar: "الثبات" })}</th>
                        <th style={S.th}>{t({ en: "min/kg", ar: "د/كجم" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((x) => {
                        const mineRow = x.empNo === String(empNo);
                        return (
                          <tr key={x.empNo} style={mineRow ? S.trMine : null}>
                            <td style={{ ...S.td, fontWeight: 900 }}>{x.rank ? medal(x.rank) : "—"}</td>
                            <td style={{ ...S.td, textAlign: "start", fontWeight: mineRow ? 900 : 800 }}>
                              {x.name}
                              <div className="mw-lbl" style={{ color: K.mut, fontWeight: 700 }}>
                                #{x.empNo}{x.branch ? ` · ${x.branch}` : ""}
                              </div>
                            </td>
                            <td style={{ ...S.td, fontWeight: 900, color: x.score === null ? K.mut : K.yield }}>
                              {x.score === null ? "—" : x.score}
                            </td>
                            <td style={S.td}>{x.ops}</td>
                            <td style={S.td}>{n1(x.values.raw)}</td>
                            <td style={S.td}>{fmtMetric("waste", x.values.waste, isAr)}</td>
                            <td style={S.td}>
                              {fmtMetric("std", x.values.std, isAr)}
                              {x.coverage.std > 0 && (
                                <div className="mw-lbl" style={{ color: K.mut }}>{x.coverage.std}</div>
                              )}
                            </td>
                            <td style={S.td}>{fmtMetric("steady", x.values.steady, isAr)}</td>
                            <td style={S.td}>{fmtMetric("speed", x.values.speed, isAr)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {list.some((x) => x.score === null) && (
                <div className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
                  {isAr
                    ? `الجزار اللي عندو أقل من ${MIN_OPS} عمليات بالفترة بيطلع بلا نتيجة — الرقم تحت هالحد صدفة مش أداء.`
                    : `Fewer than ${MIN_OPS} jobs in the period means no score — below that the number is luck, not performance.`}
                </div>
              )}

              {/* ليش هالنتيجة */}
              <button type="button" style={S.linkBtn} onClick={() => setOpenWhy((v) => !v)}>
                {openWhy ? "▲" : "▼"} ❓ {t({ en: "How is the score calculated?", ar: "كيف بتنحسب النتيجة؟" })}
              </button>
              {openWhy && (
                <div style={S.why}>
                  <div className="mw-sm" style={{ fontWeight: 800, marginBottom: 6 }}>
                    {t({
                      en: "Each metric is scored 0–100 inside the group you are compared with, then weighted:",
                      ar: "كل معيار بينعاير من ٠ لـ١٠٠ جوّا نفس المجموعة اللي عم تنقارن فيها، وبعدين بينوزَن:",
                    })}
                  </div>
                  {METRICS.map((m) => (
                    <div key={m.id} className="mw-lbl" style={S.whyRow}>
                      <b style={{ minWidth: 130 }}>{isAr ? m.ar : m.en}</b>
                      <span style={{ color: K.raw, fontWeight: 900 }}>{STAT_WEIGHTS[m.id]}%</span>
                      <span style={{ color: K.mut }}>{isAr ? m.hintAr : m.hintEn}</span>
                    </div>
                  ))}
                  <div className="mw-lbl" style={{ color: K.mut, marginTop: 8, lineHeight: 1.7 }}>
                    {t({
                      en: "A metric you have no data for (no time entered, or a recipe with no standard) is left out of your score and its weight is spread over the rest — it neither helps nor hurts. Cancelled operations are excluded from every number.",
                      ar: "المعيار اللي ما إلك فيه بيانات (ما كتبت وقت، أو وصفة بلا نسب معيارية) بينشال من حسابك ووزنه بينوزّع على الباقي — لا بيفيدك ولا بيضرّك. والعمليات الملغاة برّا كل رقم.",
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** شارة ترتيب مضغوطة للسطر الدائم. */
function RankChip({ icon, label, rank, total }) {
  return (
    <span style={S.rankChip}>
      <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
        {icon} {label}
      </span>
      <b className="mw-sm" style={{ color: rank ? K.raw : K.mut }}>
        {rank ? `${rank} / ${total}` : "—"}
      </b>
    </span>
  );
}

/* ============================ الأنماط ============================ */

const S = {
  wrap: {
    background: "#fff", border: `1px solid ${K.line}`, borderRadius: 22,
    fontFamily: FONT, color: K.ink, overflow: "hidden", marginBottom: 14,
  },
  head: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 12, flexWrap: "wrap", padding: 14, background: "none",
    border: "none", cursor: "pointer", fontFamily: FONT, color: K.ink, textAlign: "start",
  },
  headMain: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
  headSide: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  scorePill: {
    display: "inline-flex", alignItems: "baseline", gap: 3, flexShrink: 0,
    border: "2px solid", borderRadius: 16, padding: "6px 12px", fontWeight: 900,
    background: K.soft,
  },
  rankChip: {
    display: "inline-flex", alignItems: "center", gap: 7,
    background: K.soft, border: `1px solid ${K.line}`, borderRadius: 999,
    padding: "6px 13px", whiteSpace: "nowrap",
  },

  body: {
    borderTop: `1px solid ${K.line}`, padding: 14,
    display: "flex", flexDirection: "column", gap: 12,
  },
  barRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  chip: {
    border: `1px solid ${K.line}`, background: "#fff", color: K.ink2,
    borderRadius: 999, padding: "7px 16px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },
  chipOn: { background: K.raw, color: "#fff", border: `1px solid ${K.raw}` },
  note: {
    background: K.soft, border: `1px solid ${K.line}`, borderRadius: 14,
    padding: "12px 14px", fontWeight: 800, color: K.ink2,
  },
  warn: {
    background: "#fff7ed", border: "1px solid #fcd9a4", color: "#8a5a12",
    borderRadius: 12, padding: "8px 12px", fontWeight: 800, lineHeight: 1.6,
  },
  linkBtn: {
    border: "none", background: "transparent", color: K.raw, padding: 0,
    fontFamily: FONT, fontWeight: 900, cursor: "pointer", textAlign: "start",
  },

  metricGrid: {
    display: "grid", gap: 10,
    gridTemplateColumns: "repeat(auto-fit,minmax(min(190px,100%),1fr))",
  },
  metricBox: {
    background: K.soft, border: `1px solid ${K.line}`, borderRadius: 14,
    padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2, minWidth: 0,
  },

  tableWrap: { overflowX: "auto", border: `1px solid ${K.line}`, borderRadius: 14 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 720 },
  th: {
    background: K.soft, color: K.ink2, fontWeight: 900, textAlign: "center",
    padding: "10px 8px", borderBottom: `1px solid ${K.line}`, whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 8px", textAlign: "center", borderBottom: `1px solid ${K.line}`,
    fontWeight: 800, whiteSpace: "nowrap",
  },
  trMine: { background: "#eef7ff", outline: `2px solid ${K.raw}`, outlineOffset: "-2px" },

  why: {
    background: K.soft, border: `1px solid ${K.line}`, borderRadius: 14,
    padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5,
  },
  whyRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" },
};
