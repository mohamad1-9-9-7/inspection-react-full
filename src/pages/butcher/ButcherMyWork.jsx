// src/pages/butcher/ButcherMyWork.jsx
//
// 👤 شغلي — الجزار يدخّل رقمه الوظيفي ويشوف شو اشتغل كل يوم (EN/AR).
// "My work": the butcher enters their employee number and sees a simple
// day-by-day summary of what they cut.
//
// شاشة كشك: خط كبير، كروت لمس، بلا فلاتر معقّدة. كل يوم كرت فيه المجاميع،
// والضغط عليه بيفتح تفاصيل التنفيذات (الوصفة · المادة الخام · الأوزان).

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
import {
  explainError, kg, shiftDays, totalsOf, useButcherData, useNormalizedRows,
} from "./butcherReportKit";
import CuttingCard, { CARD_CSS, CuttingCardPrint } from "./ButcherCuttingCard";
import { useOutbox } from "./butcherOutbox";

const LAST_EMP_KEY = "butcher_last_emp";   // كاش فقط — نفس مفتاح شاشة التسجيل

/* أحجام الخط — تتغلّب على `#root *{font-size:14px!important}` بكلاس أخصّ */
const CSS = `
#root .mw, #root .mw * { font-size: 20px !important; }
#root .mw-title { font-size: 30px !important; }
#root .mw-num   { font-size: 40px !important; }
#root .mw-day   { font-size: 26px !important; }
#root .mw-big   { font-size: 30px !important; }
#root .mw-lbl   { font-size: 15px !important; }
#root .mw-sm    { font-size: 17px !important; }
#root .mw-press { transition: transform .12s ease, box-shadow .12s ease; }
#root .mw-press:active { transform: scale(.98); }
@keyframes mwRise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
#root .mw-rise { animation: mwRise .26s ease both; }
@media (max-width: 820px) {
  #root .mw, #root .mw * { font-size: 17px !important; }
  #root .mw-title { font-size: 23px !important; }
  #root .mw-num   { font-size: 32px !important; }
  #root .mw-day   { font-size: 21px !important; }
  #root .mw-big   { font-size: 24px !important; }
  #root .mw-lbl   { font-size: 13px !important; }
  #root .mw-sm    { font-size: 15px !important; }
  /* رأس اليوم: العنوان سطر والأرقام سطر تحته بعرض كامل بدل ما تتزاحم */
  #root .mw-dayhead { flex-direction: column; align-items: stretch !important; gap: 8px !important; padding: 14px !important; }
  #root .mw-daynums { gap: 10px !important; justify-content: space-between; }
  #root .mw-caret { display: none; }
}
@media (max-width: 420px) {
  /* الشاشات الضيّقة جداً: عمودان للمؤشّرات وحشو أقل */
  #root .mw-stats { grid-template-columns: repeat(2,1fr) !important; }
  #root .mw-daynums { display: grid !important; grid-template-columns: repeat(2,1fr) !important; }
}
`;

/** اسم اليوم بالّلغة المختارة — يساعد الجزار يتعرّف على يومه بسرعة. */
const weekday = (iso, isAr) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(isAr ? "ar-EG" : "en-GB", { weekday: "long" });
};

export default function ButcherMyWork() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  // آخر ٩٠ يوماً — الجزار يهمّه شغله القريب، وسحب كل التاريخ بلا فائدة
  const { records, loading, error, reload, cfg, mrpCfg } =
    useButcherData({ from: shiftDays(-89) });
  const all = useNormalizedRows(records, { cfg, mrpCfg, isAr });
  // سجلات لسّا بصندوق الصادر لن تظهر هنا — نوضّح ذلك بدل ما يستغرب الجزار
  const outbox = useOutbox();

  const [empInput, setEmpInput] = useState(() => {
    try { return localStorage.getItem(LAST_EMP_KEY) || ""; } catch { return ""; }
  });
  const [emp, setEmp] = useState("");        // الرقم المعتمد بعد الضغط
  const [openDay, setOpenDay] = useState("");
  // شكل العرض: بطاقة التقطيع (نموذج الملحمة الورقي) هي الأصل، والتفاصيل بديل سريع
  const [mode, setMode] = useState("card");
  const [printJob, setPrintJob] = useState(null);   // بطاقة قيد الطباعة (بوّابة)

  /* سجلات هذا الجزار فقط */
  const mine = useMemo(
    () => (emp ? all.filter((r) => r.employeeNoRaw === emp) : []),
    [all, emp]
  );

  const me = mine[0] || null;
  const totals = useMemo(() => totalsOf(mine), [mine]);

  /* تجميع حسب اليوم — الأحدث أولاً */
  const days = useMemo(() => {
    const map = new Map();
    mine.forEach((r) => {
      if (!map.has(r.day)) map.set(r.day, []);
      map.get(r.day).push(r);
    });
    return [...map.entries()]
      .map(([day, list]) => ({ day, list, ...totalsOf(list) }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [mine]);

  /* افتح آخر يوم تلقائياً — الجزار يدخل فيلقى بطاقته أمامه بلا ضغطة زائدة */
  useEffect(() => {
    setOpenDay((cur) =>
      cur && days.some((d) => d.day === cur) ? cur : (days[0]?.day || "")
    );
  }, [days]);

  /* خصائص البطاقة ليوم واحد — للعرض وللطباعة معاً */
  const cardProps = (d) => ({
    rows: d.list,
    day: d.day,
    isAr,
    butcherName: me?.butcherName || "",
    employeeNo: emp,
    branchName: me?.branchName || "",
  });

  const start = () => {
    const v = empInput.trim();
    if (!v) return;
    try { localStorage.setItem(LAST_EMP_KEY, v); } catch { /* ignore */ }
    setEmp(v);
    setOpenDay("");
  };

  const KG = t({ en: "kg", ar: "كجم" });

  if (!canOpenButcherPage("butcher.mywork")) return <NoAccess page="butcher.mywork" />;

  return (
    <div dir={dir} className="mw" style={S.page}>
      <style>{CSS + CARD_CSS}</style>
      <CuttingCardPrint job={printJob} onDone={() => setPrintJob(null)} />
      {/* بطاقة التقطيع ورقة عريضة — نوسّع الحاوية لما تكون هي المعروضة */}
      <div style={{ ...S.wrap, maxWidth: mode === "card" ? 1280 : 1000 }}>
        <div style={S.header}>
          <div className="mw-title" style={{ fontWeight: 900 }}>
            👤 {t({ en: "My work", ar: "شغلي" })}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <LangToggle lang={lang} toggle={toggle} style={S.smallBtn} />
            {emp && (
              <button className="mw-sm" style={S.smallBtn} onClick={() => { setEmp(""); setOpenDay(""); }}>
                {t({ en: "Change number", ar: "تغيير الرقم" })}
              </button>
            )}
            <button className="mw-sm" style={S.smallBtn} onClick={() => navigate("/butcher", { replace: true })}>
              ← {t({ en: "Back", ar: "رجوع" })}
            </button>
          </div>
        </div>

        {/* ── إدخال الرقم الوظيفي ── */}
        {!emp && (
          <div style={S.card}>
            <div className="mw-day" style={S.q}>
              {t({ en: "Enter your employee number", ar: "أدخل رقمك الوظيفي" })}
            </div>
            <input
              className="mw-num"
              value={empInput}
              onChange={(e) => setEmpInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && start()}
              inputMode="numeric"
              autoFocus
              placeholder="0000"
              style={S.input}
            />
            <button
              className="mw-big"
              onClick={start}
              disabled={!empInput.trim()}
              style={{ ...S.primary, ...(empInput.trim() ? null : S.disabled) }}
            >
              {t({ en: "Show my work", ar: "اعرض شغلي" })}
            </button>
          </div>
        )}

        {/* ── النتائج ── */}
        {emp && (
          <>
            <div className="mw-rise" style={S.who}>
              <span style={S.avatar}>👤</span>
              <span style={{ minWidth: 0 }}>
                <span className="mw-day" style={{ fontWeight: 900, display: "block" }}>
                  {me?.butcherName || `#${emp}`}
                </span>
                <span className="mw-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                  #{emp}{me?.branchName ? ` · ${me.branchName}` : ""}
                </span>
              </span>
            </div>

            {outbox.pending > 0 && (
              <div className="mw-sm" style={S.pendingNote}>
                📤 {outbox.pending}{" "}
                {t({
                  en: "record(s) still on this device — not uploaded yet, so they are not shown below.",
                  ar: "سجل لسّا على الجهاز — ما ترفع بعد، فما بيبيّن تحت.",
                })}{" "}
                {outbox.online && (
                  <button type="button" style={S.linkBtn} onClick={outbox.sync} disabled={outbox.syncing}>
                    {outbox.syncing
                      ? t({ en: "Syncing…", ar: "جارٍ المزامنة…" })
                      : t({ en: "Sync now", ar: "زامن الآن" })}
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div style={S.card}>
                <div className="mw-sm" style={{ textAlign: "center", color: "#6b8299", fontWeight: 800 }}>
                  {t({ en: "Loading…", ar: "جارٍ التحميل…" })}
                </div>
              </div>
            ) : error ? (
              /* لا نقول «ما في سجلات» والتحميل فشل — السجلات موجودة ولم تصل */
              <div style={S.errorBox}>
                <div>⚠️ {explainError(error, t)}</div>
                <code style={{ opacity: 0.65, fontWeight: 700, fontSize: ".85em" }}>
                  {String(error)}
                </code>
                <button type="button" className="mw-sm" style={S.smallBtn} onClick={reload}>
                  ↻ {t({ en: "Try again", ar: "إعادة المحاولة" })}
                </button>
              </div>
            ) : !mine.length ? (
              <div style={S.empty}>
                {t({
                  en: "No cutting records found for this number yet.",
                  ar: "ما في سجلات تقطيع لهذا الرقم بعد.",
                })}
              </div>
            ) : (
              <>
                {/* ملخّص عام بسيط */}
                <div className="mw-stats" style={S.statRow}>
                  <Stat lbl={t({ en: "Days worked", ar: "أيام الشغل" })} val={days.length} color="#1f6fd0" />
                  <Stat lbl={t({ en: "Jobs", ar: "التنفيذات" })} val={totals.count} color="#6d28d9" />
                  <Stat lbl={t({ en: "Raw material", ar: "المادة الخام" })} val={`${kg(totals.carcassKg)}`} unit={KG} color="#14507f" />
                  <Stat lbl={t({ en: "Products", ar: "النواتج" })} val={`${kg(totals.cutsKg)}`} unit={KG} color="#0f766e" />
                  <Stat lbl={t({ en: "Net yield", ar: "نسبة التصافي" })} val={`${totals.yieldPct.toFixed(1)}%`} color="#047857" />
                </div>

                <div style={S.sectionBar}>
                  <span className="mw-lbl" style={S.sectionLbl}>
                    {t({ en: "Day by day — newest first", ar: "يوم بيوم — الأحدث أولاً" })}
                  </span>
                  <span style={S.seg}>
                    <button
                      type="button"
                      className="mw-sm"
                      onClick={() => setMode("card")}
                      style={{ ...S.segBtn, ...(mode === "card" ? S.segOn : null) }}
                    >
                      🧾 {t({ en: "Cutting card", ar: "بطاقة التقطيع" })}
                    </button>
                    <button
                      type="button"
                      className="mw-sm"
                      onClick={() => setMode("list")}
                      style={{ ...S.segBtn, ...(mode === "list" ? S.segOn : null) }}
                    >
                      📋 {t({ en: "Details", ar: "تفاصيل" })}
                    </button>
                  </span>
                </div>

                {days.map((d) => {
                  const open = openDay === d.day;
                  return (
                    <div key={d.day} style={S.dayBox}>
                      <button
                        className="mw-press mw-dayhead"
                        onClick={() => setOpenDay(open ? "" : d.day)}
                        style={S.dayHead}
                      >
                        <span style={{ minWidth: 0, textAlign: "start" }}>
                          <span className="mw-day" style={{ fontWeight: 900, display: "block" }}>
                            {d.day}
                          </span>
                          <span className="mw-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                            {weekday(d.day, isAr)} · {d.count} {t({ en: "jobs", ar: "تنفيذ" })}
                          </span>
                        </span>
                        <span className="mw-daynums" style={S.dayNums}>
                          <span className="mw-sm">
                            {t({ en: "Raw", ar: "الخام" })}: <b>{kg(d.carcassKg)}</b>
                          </span>
                          <span className="mw-sm" style={{ color: "#0f766e" }}>
                            {t({ en: "Products", ar: "النواتج" })}: <b>{kg(d.cutsKg)}</b>
                          </span>
                          <span className="mw-sm" style={{ color: "#b45309" }}>
                            {t({ en: "Waste", ar: "الهدر" })}: <b>{kg(d.wasteKg)}</b>
                          </span>
                          <span className="mw-sm" style={{ color: "#047857", fontWeight: 900 }}>
                            {d.yieldPct.toFixed(1)}%
                          </span>
                        </span>
                        <span className="mw-day mw-caret" style={{ color: "#8aa3b8" }}>{open ? "▲" : "▼"}</span>
                      </button>

                      {open && (
                        <div className="mw-rise" style={S.dayBody}>
                          {mode === "card" ? (
                            <>
                              <div style={S.cardBar}>
                                <button
                                  type="button"
                                  className="mw-sm"
                                  style={S.printBtn}
                                  onClick={() => setPrintJob(cardProps(d))}
                                >
                                  🖨️ {t({ en: "Print card", ar: "طباعة البطاقة" })}
                                </button>
                              </div>
                              <CuttingCard {...cardProps(d)} />
                            </>
                          ) : (
                          d.list.map((r) => {
                            const hasPath = !!(r.pathwayCode || r.pathwayName);
                            return (
                            <div
                              key={r.id}
                              style={{
                                ...S.job,
                                ...(r.reviewStatus === "rejected" ? S.jobRejected : null),
                                ...(r.reviewStatus === "approved" ? S.jobApproved : null),
                              }}
                            >
                              <div style={S.jobHead}>
                                <span className="mw-sm" style={{ fontWeight: 900, minWidth: 0 }}>
                                  {r.inputName}
                                  {r.bomRef ? <span style={{ color: "#6b8299" }}> · {r.bomRef}</span> : null}
                                  {r.bomKindName ? <span style={{ color: "#6b8299" }}> · 🐑 {r.bomKindName}</span> : null}
                                  {r.bomOriginName ? <span style={{ color: "#6b8299" }}> · 🌍 {r.bomOriginName}</span> : null}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  {r.opNo && (
                                    <span className="mw-lbl" style={S.opNoChip}>{r.opNo}</span>
                                  )}
                                  {r.reviewStatus === "approved" && (
                                    <span className="mw-lbl" style={S.badgeOk}>✓ {t({ en: "Approved", ar: "معتمد" })}</span>
                                  )}
                                  {r.reviewStatus === "rejected" && (
                                    <span className="mw-lbl" style={S.badgeNo}>✕ {t({ en: "Rejected", ar: "مرفوض" })}</span>
                                  )}
                                  <span className="mw-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                                    {r.time}
                                  </span>
                                </span>
                              </div>

                              {/* شريط المسار — بارز لأنه محور هالشاشة */}
                              {hasPath && (
                                <div className="mw-sm" style={S.pathBar}>
                                  <span style={S.pathIcon}>🛤️</span>
                                  <span style={{ color: "#6366f1", fontWeight: 800 }}>
                                    {t({ en: "Pathway", ar: "المسار" })}
                                  </span>
                                  {r.pathwayCode && <span style={S.pathCode}>{r.pathwayCode}</span>}
                                  {r.pathwayName && (
                                    <span style={{ fontWeight: 800, color: "#3730a3", minWidth: 0 }}>
                                      {r.pathwayName}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div style={S.jobStats}>
                                <span className="mw-lbl">
                                  {t({ en: "Raw", ar: "الخام" })}: <b>{kg(r.carcassKg)}</b> {KG}
                                </span>
                                {r.pieceCount !== null && (
                                  <span className="mw-lbl">
                                    {t({ en: "Pieces", ar: "القطع" })}: <b>{r.pieceCount}</b>
                                  </span>
                                )}
                                <span className="mw-lbl" style={{ color: "#0f766e" }}>
                                  {t({ en: "Products", ar: "النواتج" })}: <b>{kg(r.cutsKg)}</b>
                                </span>
                                <span className="mw-lbl" style={{ color: "#b45309" }}>
                                  {t({ en: "Waste", ar: "الهدر" })}: <b>{kg(r.wasteKg)}</b>
                                </span>
                                <span className="mw-lbl" style={{ color: "#047857", fontWeight: 900 }}>
                                  {t({ en: "Yield", ar: "التصافي" })}: {r.yieldPct.toFixed(1)}%
                                </span>
                              </div>
                              {/* القطع كشرائح — عرض سريع بلا جدول */}
                              <div style={S.pills}>
                                {r.cuts.map((c, i) => (
                                  <span
                                    key={`${c.itemId}_${i}`}
                                    style={{ ...S.pill, ...(c.isWaste ? S.pillWaste : null) }}
                                  >
                                    {c.name} — <b>{kg(c.weightKg)}</b>
                                  </span>
                                ))}
                              </div>
                              {r.reviewStatus === "rejected" && r.review?.reason && (
                                <div className="mw-lbl" style={S.rejected}>
                                  ✕ {r.review.reason}
                                </div>
                              )}
                            </div>
                          );
                          })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ lbl, val, unit, color }) {
  return (
    <div style={S.stat}>
      <span className="mw-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>{lbl}</span>
      <span className="mw-big" style={{ color, fontWeight: 900 }}>
        {val}{unit ? <span style={{ fontSize: ".6em", marginInlineStart: 4 }}>{unit}</span> : null}
      </span>
    </div>
  );
}

/* ============================ الأنماط ============================ */

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "18px 14px 44px",
  },
  wrap: { maxWidth: 1000, margin: "0 auto" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 10, marginBottom: 16,
  },
  smallBtn: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#1f6fd0", borderRadius: 12,
    padding: "9px 16px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },
  card: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 20,
    padding: 22, display: "flex", flexDirection: "column", gap: 14,
  },
  q: { fontWeight: 900, textAlign: "center" },
  input: {
    width: "100%", boxSizing: "border-box", border: "2px solid #cfe0f0", borderRadius: 16,
    padding: "16px 14px", fontWeight: 900, textAlign: "center", fontFamily: FONT,
    color: "#0f2740", outline: "none",
  },
  primary: {
    border: "none", background: "#1f6fd0", color: "#fff", borderRadius: 16,
    padding: "16px 22px", fontWeight: 900, fontFamily: FONT, cursor: "pointer", width: "100%",
  },
  disabled: { background: "#c9d8e8", cursor: "not-allowed" },

  who: {
    display: "flex", alignItems: "center", gap: 14, background: "#fff",
    border: "1px solid #dbe6f2", borderRadius: 18, padding: "14px 18px", marginBottom: 14,
  },
  avatar: {
    width: 54, height: 54, borderRadius: "50%", display: "grid", placeItems: "center",
    background: "#eaf2fc", fontSize: 28, flexShrink: 0,
  },

  statRow: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(160px,100%),1fr))",
    gap: 12, marginBottom: 18,
  },
  stat: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16,
    padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4,
  },

  sectionLbl: { fontWeight: 900, color: "#6b8299" },
  sectionBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, flexWrap: "wrap", margin: "4px 0 10px",
  },
  // مبدّل شكل العرض — بطاقة التقطيع أو التفاصيل
  seg: {
    display: "inline-flex", background: "#fff", border: "1px solid #cfe0f0",
    borderRadius: 12, padding: 3, gap: 3,
  },
  segBtn: {
    border: "none", background: "transparent", color: "#3c5a75", borderRadius: 10,
    padding: "7px 14px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
    whiteSpace: "nowrap",
  },
  segOn: { background: "#1f6fd0", color: "#fff" },
  cardBar: { display: "flex", justifyContent: "flex-end", marginBottom: 8 },
  printBtn: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#1f6fd0", borderRadius: 12,
    padding: "8px 16px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },

  dayBox: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 18,
    marginBottom: 12, overflow: "hidden",
  },
  dayHead: {
    width: "100%", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    justifyContent: "space-between", background: "transparent", border: "none",
    padding: "16px 18px", cursor: "pointer", fontFamily: FONT, color: "#0f2740",
    textAlign: "start",
  },
  dayNums: { display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" },
  dayBody: { borderTop: "1px solid #eef4fb", padding: "12px 16px 16px", background: "#f9fcff" },

  job: {
    background: "#fff", border: "1px solid #e3edf7", borderRadius: 14,
    padding: "12px 14px", marginBottom: 10,
    borderInlineStart: "4px solid #dbe6f2",
  },
  jobApproved: { borderInlineStartColor: "#34d399" },
  jobRejected: { borderInlineStartColor: "#f87171", background: "#fffafa" },
  jobHead: {
    display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
    alignItems: "center", marginBottom: 6,
  },
  jobStats: { display: "flex", gap: 14, flexWrap: "wrap", color: "#3c5a75", fontWeight: 800 },
  pills: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 },
  pill: {
    background: "#f1f7fd", border: "1px solid #dbe6f2", borderRadius: 999,
    padding: "4px 12px", fontWeight: 700, color: "#14507f",
  },
  pillWaste: { background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" },

  // شريط المسار — بانر أفقي بلون بنفسجي هادئ يفصل نفسه عن باقي الكرت
  pathBar: {
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
    background: "linear-gradient(90deg,#eef2ff,#f5f3ff)",
    border: "1px solid #c7d2fe", borderRadius: 12,
    padding: "7px 12px", margin: "8px 0 2px",
  },
  pathIcon: { fontSize: "1.1em", lineHeight: 1 },
  // رقم العملية المميّز — «POS 10 — 00001»
  opNoChip: {
    background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3",
    borderRadius: 8, padding: "2px 8px", fontWeight: 800, whiteSpace: "nowrap",
  },
  pathCode: {
    background: "#4f46e5", color: "#fff", borderRadius: 8,
    padding: "2px 10px", fontWeight: 900, letterSpacing: ".3px", whiteSpace: "nowrap",
  },

  // شارات الاعتماد الصغيرة برأس الكرت
  badgeOk: {
    background: "#dcfce7", border: "1px solid #86efac", color: "#166534",
    borderRadius: 999, padding: "2px 10px", fontWeight: 900, whiteSpace: "nowrap",
  },
  badgeNo: {
    background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b",
    borderRadius: 999, padding: "2px 10px", fontWeight: 900, whiteSpace: "nowrap",
  },

  rejected: { color: "#b91c1c", fontWeight: 800, marginTop: 8 },

  empty: {
    background: "#fff", border: "2px dashed #cfe0f0", borderRadius: 18,
    padding: "36px 20px", textAlign: "center", fontWeight: 800, color: "#6b8299",
  },
  errorBox: {
    background: "#fff5f5", border: "1px solid #f3c9c9", color: "#a12626",
    borderRadius: 18, padding: "22px 18px", fontWeight: 800, lineHeight: 1.7,
    display: "flex", flexDirection: "column", gap: 10, alignItems: "center",
    textAlign: "center",
  },
  pendingNote: {
    background: "#fff7ed", border: "1px solid #fcd9a4", color: "#8a5a12",
    borderRadius: 14, padding: "12px 16px", fontWeight: 800, lineHeight: 1.6,
    marginBottom: 14,
  },
  linkBtn: {
    border: "none", background: "transparent", color: "#1f6fd0",
    fontFamily: FONT, fontWeight: 900, cursor: "pointer", textDecoration: "underline",
    padding: 0,
  },
};
