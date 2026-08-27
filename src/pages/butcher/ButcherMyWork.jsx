// src/pages/butcher/ButcherMyWork.jsx
//
// 👤 شغلي — الجزار يدخّل رقمه الوظيفي ويشوف شو اشتغل، بشاشة كشك بسيطة (EN/AR).
// "My work": a kiosk-simple, one-glance view of what this butcher cut.
//
// ── فلسفة التصميم (أعيد بناؤها من الصفر) ──
// • الجزار مش محلّل بيانات: رقم كبير واحد بالوسط (التصافي) وثلاثة أرقام حوله.
// • ألوان بثلاثة أدوار فقط: كحلي = الداخل ، أخضر = النواتج والتصافي ،
//   كهرماني = الهدر. ما في بنفسجي/أحمر/أزرق متفرّقين متل قبل.
// • اليوم يُختار من شريط أيام أفقي (اليوم · أمس · …) بدل أكورديون طويل.
// • تفاصيل التنفيذ = جدول قطع نظيف بشريط حصّة لكل قطعة، مش «شرائح» متراصّة.
// • بطاقة التقطيع الرسمية (CuttingCard) تبقى العرض البديل + الطباعة.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
import {
  canSeeRow, explainError, kg, shiftDays, totalsOf, useButcherData, useNormalizedRows,
} from "./butcherReportKit";
import { useRowViewer } from "./butcherViewer";
import CuttingCard, { CARD_CSS, CuttingCardPrint } from "./ButcherCuttingCard";
import { useOutbox } from "./butcherOutbox";
// 👥 القوى العاملة — الحساب المربوط (جزار أو مشرف) بيشوف شغله هو وبس.
import { accountIdentity, useWorkforce } from "../workforce/workforceConfig";
import { getCurrentUser } from "../../utils/perms";

const LAST_EMP_KEY = "butcher_last_emp";   // كاش فقط — نفس مفتاح شاشة التسجيل

/* ══════════════ اللوحة ══════════════
   ثلاثة أدوار لونيّة لا أكثر — كل شي غيرها حبر أو رمادي. */
const K = {
  ink: "#0f2740",
  ink2: "#3c5a75",
  mut: "#7b93a8",
  line: "#dde9f5",
  soft: "#f6fafe",
  page: "#eef4fb",
  raw: "#14507f",      // المادة الخام الداخلة
  good: "#0f766e",     // النواتج
  yield: "#047857",    // التصافي
  waste: "#b45309",    // الهدر
  okBg: "#ecfdf5", okBd: "#a7f3d0", okFg: "#047857",
  waitBg: "#fff7ed", waitBd: "#fcd9a4", waitFg: "#8a5a12",
};

/* أحجام الخط — تتغلّب على `#root *{font-size:14px!important}` بكلاس أخصّ */
const CSS = `
#root .mw, #root .mw * { font-size: 19px !important; }
#root .mw-title { font-size: 28px !important; }
#root .mw-hero  { font-size: 46px !important; }
#root .mw-num   { font-size: 38px !important; }
#root .mw-big   { font-size: 27px !important; }
#root .mw-day   { font-size: 22px !important; }
#root .mw-sm    { font-size: 16px !important; }
#root .mw-lbl   { font-size: 14px !important; }

#root .mw-press { transition: transform .12s ease, box-shadow .16s ease, border-color .16s ease; }
#root .mw-press:active { transform: scale(.985); }
#root .mw-press:hover { border-color: #bcd6ef; }
@keyframes mwRise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
#root .mw-rise { animation: mwRise .24s ease both; }

/* شريط الأيام — تمرير أفقي بلا شريط تمرير مرئي */
#root .mw-days { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scrollbar-width: none; }
#root .mw-days::-webkit-scrollbar { display: none; }

@media (max-width: 820px) {
  #root .mw, #root .mw * { font-size: 17px !important; }
  #root .mw-title { font-size: 23px !important; }
  #root .mw-hero  { font-size: 38px !important; }
  #root .mw-num   { font-size: 30px !important; }
  #root .mw-big   { font-size: 22px !important; }
  #root .mw-day   { font-size: 19px !important; }
  #root .mw-sm    { font-size: 15px !important; }
  #root .mw-lbl   { font-size: 13px !important; }
  #root .mw-heroGrid { grid-template-columns: 1fr !important; }
}
@media (max-width: 460px) {
  #root .mw-trio { grid-template-columns: 1fr !important; }
}
`;

/* ══════════════ أدوات صغيرة ══════════════ */

const todayIso = () => new Date().toISOString().slice(0, 10);

/** اسم اليوم بالّلغة المختارة — يساعد الجزار يتعرّف على يومه بسرعة. */
const weekday = (iso, isAr) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(isAr ? "ar-EG" : "en-GB", { weekday: "long" });
};

/** «اليوم» / «أمس» / اسم اليوم — تسمية بشرية لشريط الأيام. */
function dayTag(iso, isAr, t) {
  if (iso === todayIso()) return t({ en: "Today", ar: "اليوم" });
  if (iso === shiftDays(-1)) return t({ en: "Yesterday", ar: "أمس" });
  return weekday(iso, isAr);
}

/** حلقة التصافي — الرقم الوحيد اللي لازم الجزار يشوفه من بعيد. */
function YieldRing({ pct, label, size = 168 }) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ display: "grid", placeItems: "center", position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6f0f8" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={K.yield} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center", lineHeight: 1.1 }}>
        <div className="mw-hero" style={{ fontWeight: 900, color: K.yield }}>
          {v.toFixed(0)}<span style={{ fontSize: ".45em" }}>%</span>
        </div>
        <div className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>{label}</div>
      </div>
    </div>
  );
}

/** رقم كبير بخلفية هادئة — الخام / النواتج / الهدر. */
function Fact({ icon, label, value, unit, color }) {
  return (
    <div style={{ ...S.fact, borderTop: `4px solid ${color}` }}>
      <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
        {icon} {label}
      </span>
      <span className="mw-num" style={{ color, fontWeight: 900, lineHeight: 1.1 }}>
        {value}
        {unit ? <span style={{ fontSize: ".45em", marginInlineStart: 5 }}>{unit}</span> : null}
      </span>
    </div>
  );
}

/** شريط حصّة قطعة من وزن الخام. */
function ShareBar({ pct, tone }) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <span style={S.bar}>
      <i style={{ ...S.barFill, width: `${v}%`, background: tone }} />
    </span>
  );
}

/* ══════════════ الصفحة ══════════════ */

export default function ButcherMyWork() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  // آخر ٩٠ يوماً — الجزار يهمّه شغله القريب، وسحب كل التاريخ بلا فائدة
  const { records, loading, error, reload, cfg, mrpCfg } =
    useButcherData({ from: shiftDays(-89) });
  const all = useNormalizedRows(records, { cfg, mrpCfg, isAr });
  // سجلات لسّا بصندوق الصادر لن تظهر هنا — نوضّح ذلك بدل ما يستغرب الجزار
  const outbox = useOutbox();

  /* ── 👥 مين مسجّل دخول؟ ──
     الحساب المربوط بموظف من «القوى العاملة» — جزار كان أو مشرف — بيفتح على
     شغله هو مباشرة: بلا بوّابة رقم وبلا زر «تغيير الرقم». هالشاشة بتعرض أوزان
     وتصافي شخص باسمه، فحدا مربوط ما بيجوز يكتب رقم زميله ويتفرّج على شغله.
     (المشرف بيشوف شغل جزارينه من لوحة المشرف، مش من هون.)
     الحساب غير المربوط بيشوف الشاشة القديمة حرفياً. */
  const { wf: workforce } = useWorkforce();
  const account = useMemo(() => getCurrentUser(), []);
  const identity = useMemo(
    () => accountIdentity(workforce, account?.username, isAr),
    [workforce, account, isAr]
  );
  const locked = !!identity;

  const [empInput, setEmpInput] = useState(() => {
    try { return localStorage.getItem(LAST_EMP_KEY) || ""; } catch { return ""; }
  });
  const [emp, setEmp] = useState("");          // الرقم المعتمد بعد الضغط
  const [selDay, setSelDay] = useState("");    // اليوم المعروض
  const [mode, setMode] = useState("list");    // list = تفاصيل ، card = بطاقة التقطيع
  const [printJob, setPrintJob] = useState(null);

  /* الرقم بيتثبّت من السجل — وبيتحدّث لحاله لو المشرف عدّل عليه. */
  useEffect(() => {
    if (!identity) return;
    setEmp(identity.empNo);
    setEmpInput(identity.empNo);
  }, [identity]);

  /* سجلات هذا الجزار فقط */
  /* العمليات المحجورة (طلب تعديل مرفوع) والملغاة ما بتبيّن هون ولا بتنحسب —
     شغلي لازم يعرض الشغل المعتمد، مش عملية موقوفة عم تنتظر قرار. */
  const viewer = useRowViewer(isAr);
  const mine = useMemo(
    () => (emp ? all.filter((r) => r.employeeNoRaw === emp && canSeeRow(r, viewer)) : []),
    [all, emp, viewer]
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
      .map(([day, list]) => ({
        day,
        list: list.slice().sort((a, b) => String(b.time).localeCompare(String(a.time))),
        ...totalsOf(list),
      }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [mine]);

  /* افتح آخر يوم تلقائياً — الجزار يدخل فيلقى يومه أمامه بلا ضغطة زائدة */
  useEffect(() => {
    setSelDay((cur) =>
      cur && days.some((d) => d.day === cur) ? cur : (days[0]?.day || "")
    );
  }, [days]);

  const day = days.find((d) => d.day === selDay) || days[0] || null;

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
    setSelDay("");
  };

  const KG = t({ en: "kg", ar: "كجم" });

  if (!canOpenButcherPage("butcher.mywork")) return <NoAccess page="butcher.mywork" />;

  return (
    <div dir={dir} className="mw" style={S.page}>
      <style>{CSS + CARD_CSS}</style>
      <CuttingCardPrint job={printJob} onDone={() => setPrintJob(null)} />

      {/* بطاقة التقطيع ورقة عريضة — نوسّع الحاوية لما تكون هي المعروضة */}
      <div style={{ ...S.wrap, maxWidth: mode === "card" ? 1280 : 1040 }}>

        {/* ── الترويسة ── */}
        <div style={S.header}>
          <div className="mw-title" style={{ fontWeight: 900 }}>
            👤 {t({ en: "My work", ar: "شغلي" })}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <LangToggle lang={lang} toggle={toggle} style={S.smallBtn} />
            {emp && !locked && (
              <button className="mw-sm" style={S.smallBtn} onClick={() => { setEmp(""); setSelDay(""); }}>
                {t({ en: "Change number", ar: "تغيير الرقم" })}
              </button>
            )}
            <button className="mw-sm" style={S.smallBtn} onClick={() => navigate("/butcher", { replace: true })}>
              ← {t({ en: "Back", ar: "رجوع" })}
            </button>
          </div>
        </div>

        {/* ── بوّابة الرقم الوظيفي ── */}
        {!emp && !locked && (
          <div style={S.gate}>
            <div style={S.gateIcon}>🔪</div>
            <div className="mw-day" style={{ fontWeight: 900, textAlign: "center" }}>
              {t({ en: "Enter your employee number", ar: "أدخل رقمك الوظيفي" })}
            </div>
            <input
              className="mw-num"
              value={empInput}
              onChange={(e) => setEmpInput(e.target.value.replace(/\D/g, ""))}
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

        {emp && (
          <>
            {/* ── هويّة الجزار ── */}
            <div className="mw-rise" style={S.who}>
              <span style={S.avatar}>👤</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="mw-day" style={{ fontWeight: 900, display: "block" }}>
                  {me?.butcherName || identity?.name || `#${emp}`}
                </span>
                <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
                  #{emp}{me?.branchName ? ` · ${me.branchName}` : ""}
                </span>
              </span>
              {mine.length > 0 && (
                <span className="mw-lbl" style={S.periodChip}>
                  {t({ en: "last 90 days", ar: "آخر ٩٠ يوم" })} · {totals.count}{" "}
                  {t({ en: "jobs", ar: "تنفيذ" })}
                </span>
              )}
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
                <div className="mw-sm" style={{ textAlign: "center", color: K.mut, fontWeight: 800 }}>
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
                <div style={{ fontSize: "2.2em", marginBottom: 8 }}>🗒️</div>
                {t({
                  en: "No cutting records found for this number yet.",
                  ar: "ما في سجلات تقطيع لهذا الرقم بعد.",
                })}
              </div>
            ) : (
              <>
                {/* ── شريط الأيام ── */}
                <div className="mw-lbl" style={S.sectionLbl}>
                  {t({ en: "Pick a day", ar: "اختر اليوم" })}
                </div>
                <div className="mw-days">
                  {days.map((d) => {
                    const on = d.day === selDay;
                    return (
                      <button
                        key={d.day}
                        type="button"
                        className="mw-press"
                        onClick={() => setSelDay(d.day)}
                        style={{ ...S.dayChip, ...(on ? S.dayChipOn : null) }}
                      >
                        <span className="mw-sm" style={{ fontWeight: 900 }}>
                          {dayTag(d.day, isAr, t)}
                        </span>
                        <span className="mw-lbl" style={{ opacity: on ? 0.85 : 0.7, fontWeight: 800 }}>
                          {d.day}
                        </span>
                        <span className="mw-lbl" style={{ fontWeight: 900 }}>
                          {d.count} {t({ en: "jobs", ar: "تنفيذ" })} · {kg(d.carcassKg)} {KG}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ── لوحة اليوم: التصافي بالوسط وثلاثة أرقام حوله ── */}
                {day && (
                  <div className="mw-rise" style={S.hero}>
                    <div className="mw-heroGrid" style={S.heroGrid}>
                      <YieldRing
                        pct={day.yieldPct}
                        label={t({ en: "Net yield", ar: "نسبة التصافي" })}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div className="mw-day" style={{ fontWeight: 900 }}>
                          {dayTag(day.day, isAr, t)} · {day.day}
                        </div>
                        <div className="mw-lbl" style={{ color: K.mut, fontWeight: 800, marginBottom: 12 }}>
                          {weekday(day.day, isAr)} · {day.count} {t({ en: "jobs", ar: "تنفيذ" })}
                        </div>
                        <div className="mw-trio" style={S.trio}>
                          <Fact icon="🥩" color={K.raw} label={t({ en: "Raw", ar: "الخام" })}
                            value={kg(day.carcassKg)} unit={KG} />
                          <Fact icon="✅" color={K.good} label={t({ en: "Products", ar: "النواتج" })}
                            value={kg(day.cutsKg)} unit={KG} />
                          <Fact icon="🦴" color={K.waste} label={t({ en: "Waste", ar: "الهدر" })}
                            value={kg(day.wasteKg)} unit={KG} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── شكل العرض + الطباعة ── */}
                {day && (
                  <div style={S.viewBar}>
                    <span style={S.seg}>
                      <button
                        type="button"
                        className="mw-sm"
                        onClick={() => setMode("list")}
                        style={{ ...S.segBtn, ...(mode === "list" ? S.segOn : null) }}
                      >
                        📋 {t({ en: "My jobs", ar: "تنفيذاتي" })}
                      </button>
                      <button
                        type="button"
                        className="mw-sm"
                        onClick={() => setMode("card")}
                        style={{ ...S.segBtn, ...(mode === "card" ? S.segOn : null) }}
                      >
                        🧾 {t({ en: "Cutting card", ar: "بطاقة التقطيع" })}
                      </button>
                    </span>
                    <button
                      type="button"
                      className="mw-sm"
                      style={S.printBtn}
                      onClick={() => setPrintJob(cardProps(day))}
                    >
                      🖨️ {t({ en: "Print card", ar: "طباعة البطاقة" })}
                    </button>
                  </div>
                )}

                {/* ── المحتوى ── */}
                {day && mode === "card" && (
                  <div className="mw-rise"><CuttingCard {...cardProps(day)} /></div>
                )}

                {day && mode === "list" && (
                  <div className="mw-rise" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {day.list.map((r) => (
                      <JobCard key={r.id} r={r} t={t} KG={KG} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════ كرت تنفيذ واحد ══════════════
   ترويسة فيها المادة الخام ورقم العملية والحالة، بعدين جدول القطع بشريط حصّة،
   وبآخره شريط الأرقام. بلا شرائح متراصّة ولا بانرات ملوّنة. */

function JobCard({ r, t, KG }) {
  const approved = r.reviewStatus === "approved";
  const rejected = r.reviewStatus === "rejected";   // سجلات قديمة فقط
  const base = r.carcassKg > 0 ? r.carcassKg : r.cutsKg + r.wasteKg;

  return (
    <div style={{ ...S.job, borderInlineStartColor: approved ? K.okFg : K.line }}>
      {/* الترويسة */}
      <div style={S.jobHead}>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span className="mw-day" style={{ fontWeight: 900, display: "block" }}>
            {r.inputName}
          </span>
          <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
            🕒 {r.time || "—"}
            {r.bomRef ? ` · ${r.bomRef}` : ""}
            {r.pathwayCode ? ` · 🛤️ ${r.pathwayCode}` : ""}
            {r.durationMin > 0 ? ` · ⏱️ ${r.durationMin} ${t({ en: "min", ar: "دقيقة" })}` : ""}
            {r.rawExpiry ? ` · 📅 ${t({ en: "exp", ar: "ينتهي" })} ${r.rawExpiry}` : ""}
          </span>
        </span>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {r.opNo && <span className="mw-lbl" style={S.opNoChip}>{r.opNo}</span>}
          <span className="mw-lbl" style={approved ? S.badgeOk : rejected ? S.badgeOld : S.badgeWait}>
            {approved
              ? `✓ ${t({ en: "Approved", ar: "معتمد" })}`
              : rejected
                ? `✕ ${t({ en: "Rejected", ar: "مرفوض" })}`
                : `⏳ ${t({ en: "Waiting", ar: "بانتظار المشرف" })}`}
          </span>
        </span>
      </div>

      {/* أرقام التنفيذ */}
      <div style={S.jobNums}>
        <span><span style={S.numLbl}>{t({ en: "Raw", ar: "الخام" })}</span>
          <b style={{ color: K.raw }}>{kg(r.carcassKg)}</b> {KG}</span>
        <span><span style={S.numLbl}>{t({ en: "Products", ar: "النواتج" })}</span>
          <b style={{ color: K.good }}>{kg(r.cutsKg)}</b> {KG}</span>
        <span><span style={S.numLbl}>{t({ en: "Waste", ar: "الهدر" })}</span>
          <b style={{ color: K.waste }}>{kg(r.wasteKg)}</b> {KG}</span>
        <span><span style={S.numLbl}>{t({ en: "Yield", ar: "التصافي" })}</span>
          <b style={{ color: K.yield }}>{r.yieldPct.toFixed(1)}%</b></span>
        {r.pieceCount !== null && (
          <span><span style={S.numLbl}>{t({ en: "Pieces", ar: "القطع" })}</span>
            <b>{r.pieceCount}</b></span>
        )}
        {r.partialPiece && (
          <span><span style={S.numLbl}>{t({ en: "Pieces", ar: "القطع" })}</span>
            <b>{t({ en: "not a whole piece", ar: "ليست قطعة كاملة" })}</b></span>
        )}
      </div>

      {/* القطع */}
      {r.cuts.length > 0 && (
        <div style={S.cuts}>
          {r.cuts.map((c, i) => {
            const share = base > 0 ? (c.weightKg / base) * 100 : 0;
            return (
              <div key={`${c.itemId}_${i}`} style={S.cutRow}>
                <span className="mw-sm" style={{ fontWeight: 800, minWidth: 0 }}>
                  {c.isWaste ? "🦴 " : "✅ "}{c.name}
                </span>
                <span className="mw-sm" style={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                  {kg(c.weightKg)} <span style={{ color: K.mut, fontWeight: 800 }}>{KG}</span>
                </span>
                <ShareBar pct={share} tone={c.isWaste ? K.waste : K.good} />
                <span className="mw-lbl" style={{ color: K.mut, fontWeight: 900, minWidth: 52, textAlign: "end" }}>
                  {share.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ملاحظة المشرف (قبول استثنائي أو رفض قديم) */}
      {r.review?.reason && (
        <div className="mw-lbl" style={r.review.override ? S.noteWarn : S.noteOld}>
          {r.review.override
            ? `⚠️ ${t({ en: "Supervisor note", ar: "ملاحظة المشرف" })}: ${r.review.reason}`
            : `✕ ${r.review.reason}`}
        </div>
      )}
    </div>
  );
}

/* ============================ الأنماط ============================ */

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: K.page, fontFamily: FONT, color: K.ink,
    padding: "18px 14px 48px",
  },
  wrap: { margin: "0 auto" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 10, marginBottom: 16,
  },
  smallBtn: {
    border: `1px solid ${K.line}`, background: "#fff", color: K.raw, borderRadius: 12,
    padding: "9px 16px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },
  linkBtn: {
    border: "none", background: "transparent", color: K.raw,
    fontFamily: FONT, fontWeight: 900, cursor: "pointer", textDecoration: "underline", padding: 0,
  },

  /* بوّابة الرقم */
  gate: {
    background: "#fff", border: `1px solid ${K.line}`, borderRadius: 22,
    padding: "28px 22px", display: "flex", flexDirection: "column", gap: 16,
    maxWidth: 520, margin: "6vh auto 0",
    boxShadow: "0 14px 34px rgba(15,39,64,.07)",
  },
  gateIcon: { fontSize: 44, textAlign: "center", lineHeight: 1 },
  input: {
    width: "100%", boxSizing: "border-box", border: `2px solid ${K.line}`, borderRadius: 16,
    padding: "16px 14px", fontWeight: 900, textAlign: "center", fontFamily: FONT,
    color: K.ink, outline: "none", letterSpacing: 2,
  },
  primary: {
    border: "none", background: K.raw, color: "#fff", borderRadius: 16,
    padding: "16px 22px", fontWeight: 900, fontFamily: FONT, cursor: "pointer", width: "100%",
  },
  disabled: { background: "#c9d8e8", cursor: "not-allowed" },

  card: {
    background: "#fff", border: `1px solid ${K.line}`, borderRadius: 20, padding: 22,
  },

  /* هويّة الجزار */
  who: {
    display: "flex", alignItems: "center", gap: 14, background: "#fff",
    border: `1px solid ${K.line}`, borderRadius: 18, padding: "14px 18px", marginBottom: 14,
    flexWrap: "wrap",
  },
  avatar: {
    width: 54, height: 54, borderRadius: "50%", display: "grid", placeItems: "center",
    background: "#eaf2fc", fontSize: 28, flexShrink: 0,
  },
  periodChip: {
    background: K.soft, border: `1px solid ${K.line}`, color: K.ink2,
    borderRadius: 999, padding: "6px 14px", fontWeight: 900, whiteSpace: "nowrap",
  },

  sectionLbl: { fontWeight: 900, color: K.mut, margin: "6px 2px 2px" },

  /* شريط الأيام */
  dayChip: {
    flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 2,
    background: "#fff", border: `2px solid ${K.line}`, borderRadius: 16,
    padding: "10px 16px", cursor: "pointer", fontFamily: FONT, color: K.ink,
    textAlign: "start", minWidth: 150,
  },
  dayChipOn: {
    background: K.raw, borderColor: K.raw, color: "#fff",
    boxShadow: "0 10px 22px rgba(20,80,127,.25)",
  },

  /* لوحة اليوم */
  hero: {
    background: "#fff", border: `1px solid ${K.line}`, borderRadius: 22,
    padding: "18px 20px", marginBottom: 14,
    boxShadow: "0 10px 26px rgba(15,39,64,.05)",
  },
  heroGrid: {
    display: "grid", gridTemplateColumns: "auto 1fr", gap: 22, alignItems: "center",
  },
  trio: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 },
  fact: {
    background: K.soft, border: `1px solid ${K.line}`, borderRadius: 14,
    padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2, minWidth: 0,
  },

  /* شكل العرض */
  viewBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, flexWrap: "wrap", margin: "2px 0 12px",
  },
  seg: {
    display: "inline-flex", background: "#fff", border: `1px solid ${K.line}`,
    borderRadius: 14, padding: 4, gap: 4,
  },
  segBtn: {
    border: "none", background: "transparent", color: K.ink2, borderRadius: 11,
    padding: "9px 18px", fontFamily: FONT, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap",
  },
  segOn: { background: K.raw, color: "#fff" },
  printBtn: {
    border: `1px solid ${K.line}`, background: "#fff", color: K.raw, borderRadius: 14,
    padding: "10px 18px", fontFamily: FONT, fontWeight: 900, cursor: "pointer",
  },

  /* كرت التنفيذ */
  job: {
    background: "#fff", border: `1px solid ${K.line}`, borderRadius: 18,
    padding: "14px 16px", borderInlineStartWidth: 5, borderInlineStartStyle: "solid",
    display: "flex", flexDirection: "column", gap: 10,
  },
  jobHead: {
    display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
    alignItems: "flex-start",
  },
  jobNums: {
    display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center",
    background: K.soft, border: `1px solid ${K.line}`, borderRadius: 14, padding: "10px 14px",
    fontWeight: 800, color: K.ink2,
  },
  numLbl: { color: K.mut, fontWeight: 800, marginInlineEnd: 6 },

  cuts: { display: "flex", flexDirection: "column", gap: 2 },
  cutRow: {
    display: "grid", gridTemplateColumns: "1fr auto 120px 52px", gap: 12,
    alignItems: "center", padding: "7px 4px", borderBottom: `1px solid ${K.soft}`,
  },
  bar: {
    display: "block", height: 10, borderRadius: 999, background: "#eaf1f8", overflow: "hidden",
  },
  barFill: { display: "block", height: "100%", borderRadius: 999 },

  opNoChip: {
    background: K.soft, border: `1px solid ${K.line}`, color: K.ink2,
    borderRadius: 9, padding: "3px 10px", fontWeight: 900, whiteSpace: "nowrap",
  },
  badgeOk: {
    background: K.okBg, border: `1px solid ${K.okBd}`, color: K.okFg,
    borderRadius: 999, padding: "3px 12px", fontWeight: 900, whiteSpace: "nowrap",
  },
  badgeWait: {
    background: K.waitBg, border: `1px solid ${K.waitBd}`, color: K.waitFg,
    borderRadius: 999, padding: "3px 12px", fontWeight: 900, whiteSpace: "nowrap",
  },
  badgeOld: {
    background: "#f3f5f7", border: "1px solid #dfe5ea", color: "#6b7785",
    borderRadius: 999, padding: "3px 12px", fontWeight: 900, whiteSpace: "nowrap",
  },
  noteWarn: {
    background: K.waitBg, border: `1px solid ${K.waitBd}`, color: K.waitFg,
    borderRadius: 12, padding: "9px 12px", fontWeight: 800, lineHeight: 1.6,
  },
  noteOld: {
    background: "#f7f8fa", border: "1px solid #e3e8ee", color: "#6b7785",
    borderRadius: 12, padding: "9px 12px", fontWeight: 800, lineHeight: 1.6,
  },

  empty: {
    background: "#fff", border: `2px dashed ${K.line}`, borderRadius: 20,
    padding: "40px 20px", textAlign: "center", fontWeight: 800, color: K.mut,
  },
  errorBox: {
    background: "#fff5f5", border: "1px solid #f3c9c9", color: "#a12626",
    borderRadius: 18, padding: "22px 18px", fontWeight: 800, lineHeight: 1.7,
    display: "flex", flexDirection: "column", gap: 10, alignItems: "center", textAlign: "center",
  },
  pendingNote: {
    background: K.waitBg, border: `1px solid ${K.waitBd}`, color: K.waitFg,
    borderRadius: 14, padding: "12px 16px", fontWeight: 800, lineHeight: 1.6, marginBottom: 14,
  },
};
