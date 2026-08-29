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
  canSeeRow, crStatusText, explainError, isCancelled, kg, shiftDays, totalsOf,
  useButcherData, useNormalizedRows,
} from "./butcherReportKit";
import { useRowViewer } from "./butcherViewer";
import CuttingCard, { CARD_CSS, CuttingCardPrint } from "./ButcherCuttingCard";
import { useOutbox } from "./butcherOutbox";
import ButcherPerformance from "./ButcherPerformance";
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

/* سطر المادة الخام — أعمدة على الشاشة الواسعة، وبينكسر لسطرين عالضيّقة.
   كلاس لا نمط سطري: النمط السطري ما بيقبل @media. */
#root .mw-row {
  width: 100%; display: grid; gap: 12px; align-items: center; text-align: start;
  grid-template-columns: 18px minmax(140px, 1.5fr) minmax(300px, 2fr) auto;
  background: none; border: none; padding: 0; cursor: pointer; font-family: inherit;
  color: inherit;
}
#root .mw-row-cells {
  display: grid; grid-template-columns: repeat(5, minmax(54px, 1fr)); gap: 8px;
}
#root .mw-cell {
  background: #f6fafe; border: 1px solid #e6eff8; border-radius: 12px;
  padding: 6px 8px; text-align: center; min-width: 0; overflow: hidden;
}
@media (max-width: 900px) {
  #root .mw-row { grid-template-columns: 18px minmax(0, 1fr) auto; }
  #root .mw-row-cells { grid-column: 1 / -1; }
}
@media (max-width: 520px) {
  #root .mw-row-cells { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

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

/**
 * تجميع تنفيذات اليوم حسب **المادة الخام**.
 *
 * الجزار بيقطّع نفس الرقبة أربع مرّات بنص ساعة، فكانت تطلعله أربع كروت
 * متطابقة بالعنوان وبيدوّر بينهن على الفرق. صار: كرت واحد للمادة الخام،
 * أوزانه مجموع كل تنفيذاتها، والتفاصيل بتنفتح بضغطة.
 *
 * المفتاح = كود الصنف (وإلا اسمه). الملغى بيدخل بالقائمة بس ما بينحسب
 * بأي وزن — نفس قاعدة باقي الشاشات.
 */
function groupByInput(list) {
  const map = new Map();
  (list || []).forEach((r) => {
    const key = r.inputItemId || r.inputName || "—";
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: r.inputName,
        sku: r.inputSku || "",
        rows: [],
      });
    }
    map.get(key).rows.push(r);
  });

  return [...map.values()].map((g) => {
    const live = g.rows.filter((r) => !isCancelled(r));
    const cuts = new Map();
    live.forEach((r) => r.cuts.forEach((c) => {
      const k = c.itemId || c.name;
      if (!cuts.has(k)) cuts.set(k, { name: c.name, isWaste: c.isWaste, weightKg: 0 });
      cuts.get(k).weightKg += c.weightKg;
    }));

    const t = totalsOf(live);
    return {
      ...g,
      rows: g.rows.slice().sort((a, b) => String(b.time).localeCompare(String(a.time))),
      live: live.length,
      cancelled: g.rows.length - live.length,
      pending: live.filter((r) => (r.reviewStatus || "pending") === "pending").length,
      approved: live.filter((r) => r.reviewStatus === "approved").length,
      cutList: [...cuts.values()].sort((a, b) => b.weightKg - a.weightKg),
      durationMin: live.reduce((sum, r) => sum + (Number(r.durationMin) || 0), 0),
      pieces: live.reduce((sum, r) => sum + (Number(r.pieceCount) || 0), 0),
      ...t,
    };
  }).sort((a, b) => String(b.rows[0]?.time || "").localeCompare(String(a.rows[0]?.time || "")));
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
  // سجلات لسّا بصندوق الصادر لن تظهر هنا — نوضّح ذلك بدل ما يستغرب الجزار
  const outbox = useOutbox();

  /* ── 👥 مين مسجّل دخول؟ ──
     الحساب المربوط بموظف من «القوى العاملة» — جزار كان أو مشرف — بيفتح على
     شغله هو مباشرة: بلا بوّابة رقم وبلا زر «تغيير الرقم». هالشاشة بتعرض أوزان
     وتصافي شخص باسمه، فحدا مربوط ما بيجوز يكتب رقم زميله ويتفرّج على شغله.
     (المشرف بيشوف شغل جزارينه من لوحة المشرف، مش من هون.)
     الحساب غير المربوط بيشوف الشاشة القديمة حرفياً. */
  const { wf: workforce, loading: wfLoading } = useWorkforce();
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
  /* نافذة السحب — ٣٠ يوم افتراضياً.
     الشاشة كانت تسحب ٩٠ يوم من **كل الملاحم** (بالـpayload كامل) وتفلتر
     بالمتصفّح على رقم واحد: أثقل طلب بالنظام لأقل فائدة، وعلى كشك بالملحمة.
     صار: نافذة أقصر افتراضياً + الرقم بينمرق للسيرفر + ما في سحب قبل ما
     نعرف الرقم. مين بدّه أبعد بيضغط ٩٠ بنفسه. */
  const [win, setWin] = useState(30);
  const [selDay, setSelDay] = useState("");    // اليوم المعروض
  const [mode, setMode] = useState("list");    // list = تفاصيل ، card = بطاقة التقطيع
  const [printJob, setPrintJob] = useState(null);

  /* الرقم بيتثبّت من السجل — وبيتحدّث لحاله لو المشرف عدّل عليه. */
  useEffect(() => {
    if (!identity) return;
    setEmp(identity.empNo);
    setEmpInput(identity.empNo);
  }, [identity]);

  /* ── السحب ── ما بينطلب إشي قبل ما نعرف الرقم، والرقم بينمرق للسيرفر. */
  const { records, loading, error, reload, cfg, mrpCfg } = useButcherData({
    from: shiftDays(-(win - 1)),
    employeeNo: emp,
    enabled: !!emp,
  });

  /* التطبيع بعد الفلترة لا قبلها: كنّا نطبّع سجلات كل الملاحم عشان نعرض
     واحد. الفلترة هون على السجل الخام (payload.employeeNo) لأنّ الاسم
     المطبَّع ما بينوجد إلا بعد التطبيع نفسه. */
  const mineRecords = useMemo(
    () => (emp
      ? records.filter((r) => String(r?.payload?.employeeNo ?? "").trim() === emp)
      : []),
    [records, emp]
  );
  const all = useNormalizedRows(mineRecords, { cfg, mrpCfg, isAr });

  /* الجزار بيشوف شغله كلّه — حتى الملغى منه، بشارة «ملغاة» واضحة. إخفاء
     عملية بلا أثر بيخلّي الواحد يشك بأرقامه؛ الأنضف إنها تبيّن بحالتها.
     بس **ما بتنحسب**: المجاميع والتصافي من الشغل الحيّ وحده. */
  const viewer = useRowViewer(isAr);
  const mine = useMemo(() => all.filter((r) => canSeeRow(r, viewer)), [all, viewer]);
  const counted = useMemo(() => mine.filter((r) => !isCancelled(r)), [mine]);

  const me = mine[0] || null;
  const totals = useMemo(() => totalsOf(counted), [counted]);

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
        // المجاميع من الحيّ وحده — الملغى بيضل بالقائمة معلّم، برّا الحساب
        ...totalsOf(list.filter((r) => !isCancelled(r))),
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
    // بطاقة التقطيع وثيقة شغل — العملية الملغاة ما إلها مكان عالورق
    rows: d.list.filter((r) => !isCancelled(r)),
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

  const WINDOWS = [
    { d: 7,  ar: "٧ أيام",  en: "7 days" },
    { d: 30, ar: "٣٠ يوم",  en: "30 days" },
    { d: 90, ar: "٩٠ يوم",  en: "90 days" },
  ];

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
              {t({ en: "Back", ar: "رجوع" })}
            </button>
          </div>
        </div>

        {/* ── فحص الحساب ── سجل القوى العاملة بيوصل بعد أول رسمة؛ لولا
            هالانتظار، الجزار المربوط بيشوف بوابة الرقم تلمع بوجهه ثانية
            وبعدين تختفي. */}
        {!emp && wfLoading && (
          <div style={S.card}>
            <div className="mw-sm" style={{ textAlign: "center", color: K.mut, fontWeight: 800 }}>
              {t({ en: "Opening your work…", ar: "جارٍ فتح شغلك…" })}
            </div>
          </div>
        )}

        {/* ── بوّابة الرقم الوظيفي ── */}
        {!emp && !locked && !wfLoading && (
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
                  {isAr ? `آخر ${win} يوم` : `last ${win} days`} · {totals.count}{" "}
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

            {/* ── 🏆 أدائي ── كرت مطويّ بأعلى الشاشة: نتيجتي وترتيبي
                بملحمتي وعلى مستوى كل الملاحم، والتفاصيل بضغطة. أرقام باقي
                الجزارين بتيجي مجمّعة من السيرفر (butcher-stats)، مش بسحب
                سجلاتهم على الكشك. */}
            <ButcherPerformance empNo={emp} t={t} isAr={isAr} KG={KG} />

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
                {/* ── مدى السحب ── الافتراضي أقصر، والتوسيع بضغطة واعية */}
                <div style={S.winBar}>
                  <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
                    {t({ en: "Period", ar: "الفترة" })}
                  </span>
                  {WINDOWS.map((w) => (
                    <button
                      key={w.d}
                      type="button"
                      className="mw-sm mw-press"
                      onClick={() => setWin(w.d)}
                      style={{ ...S.winBtn, ...(win === w.d ? S.winBtnOn : null) }}
                    >
                      {t(w)}
                    </button>
                  ))}
                </div>

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
                    {groupByInput(day.list).map((g) => (
                      <InputGroupCard key={g.key} g={g} t={t} isAr={isAr} KG={KG} />
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

/* ══════════════ كرت المادة الخام (شامل) ══════════════
   عنوان واحد للمادة الخام مهما تكرّر تقطيعها بنفس اليوم: الأوزان مجموعة،
   وأسطر القطع مدموجة على مستوى المنتج. «تفاصيل التنفيذات» بيفتح الكروت
   المفردة لمين بدّه يشوف عملية بعينها. */

function InputGroupCard({ g, t, isAr, KG }) {
  const [open, setOpen] = useState(false);
  const many = g.rows.length > 1;
  const base = g.carcassKg > 0 ? g.carcassKg : g.cutsKg + g.wasteKg;
  const edge = g.cancelled === g.rows.length ? "#dc2626"
    : g.pending > 0 ? K.waitFg : K.okFg;

  return (
    <div style={{
      ...S.groupRow,
      borderInlineStartColor: edge,
      /* «مفتوح» لازم يبيّن بلمحة: إطار كحلي وظلّ، مش نفس الكرت الأبيض */
      ...(open ? S.jobOpen : null),
    }}>
      {/* ── السطر: اسم المادة + أعمدة الأرقام + الحالة ── */}
      <button
        type="button"
        className="mw-row mw-press"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="mw-big" style={{ color: K.mut, fontWeight: 900 }}>
          {open ? "▲" : "▼"}
        </span>

        <span style={{ minWidth: 0 }}>
          <span className="mw-day" style={{ fontWeight: 900, display: "block" }}>
            {g.name}
          </span>
          <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
            {many
              ? `${g.rows.length} ${t({ en: "jobs", ar: "تنفيذ" })}`
              : `🕒 ${g.rows[0]?.time || "—"}`}
            {g.durationMin > 0 ? ` · ⏱️ ${g.durationMin} ${t({ en: "min", ar: "دقيقة" })}` : ""}
            {g.pieces > 0 ? ` · ${t({ en: "pieces", ar: "قطع" })} ${g.pieces}` : ""}
          </span>
        </span>

        <span className="mw-row-cells">
          <Cell label={t({ en: "Jobs", ar: "تنفيذ" })} value={g.rows.length} />
          <Cell label={t({ en: "Raw", ar: "الخام" })} value={kg(g.carcassKg)} tone={K.raw} />
          <Cell label={t({ en: "Products", ar: "النواتج" })} value={kg(g.cutsKg)} tone={K.good} />
          <Cell label={t({ en: "Waste", ar: "الهدر" })} value={kg(g.wasteKg)} tone={K.waste} />
          <Cell label={t({ en: "Yield", ar: "التصافي" })} value={`${g.yieldPct.toFixed(1)}%`} tone={K.yield} />
        </span>

        <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {g.approved > 0 && (
            <span className="mw-lbl" style={S.badgeOk}>
              ✓{many ? ` ${g.approved}` : ""}
            </span>
          )}
          {g.pending > 0 && (
            <span className="mw-lbl" style={S.badgeWait}>
              ⏳{many ? ` ${g.pending}` : ""}
            </span>
          )}
          {g.cancelled > 0 && (
            <span className="mw-lbl" style={S.badgeCancelled}>
              🚫{many ? ` ${g.cancelled}` : ""}
            </span>
          )}
        </span>
      </button>

      {/* ── المطويّ: أسطر القطع، وبعدين التنفيذات ── */}
      {open && (
        <div style={S.groupBody}>
          {g.cutList.length > 0 && (
            <div style={S.detailPanel}>
              <div className="mw-lbl" style={S.detailPanelHead}>
                {t({ en: "Products & waste", ar: "النواتج والهدر" })} · {g.cutList.length}
              </div>
              <div style={{ ...S.cuts, background: "#fff", borderRadius: 12, padding: "4px 10px" }}>
                {g.cutList.map((c, i) => {
                  const share = base > 0 ? (c.weightKg / base) * 100 : 0;
                  return (
                    <div key={`${c.name}_${i}`} style={S.cutRow}>
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
            </div>
          )}

          <div style={S.detailPanel}>
            <div className="mw-lbl" style={S.detailPanelHead}>
              {t({ en: "Jobs in this card", ar: "التنفيذات جوّا هالسطر" })} · {g.rows.length}
            </div>
            {g.rows.map((r, i) => (
              <JobCard
                key={r.id}
                r={r} t={t} isAr={isAr} KG={KG}
                nested n={i + 1} total={g.rows.length}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** خانة رقم بالسطر — قيمة فوق وعنوان صغير تحت. */
function Cell({ label, value, tone }) {
  return (
    <span className="mw-cell" style={S.cell}>
      <span className="mw-sm" style={{ fontWeight: 900, color: tone || K.ink, display: "block" }}>
        {value}
      </span>
      <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>{label}</span>
    </span>
  );
}

/* ══════════════ كرت تنفيذ واحد ══════════════
   ترويسة فيها المادة الخام ورقم العملية والحالة، بعدين جدول القطع بشريط حصّة،
   وبآخره شريط الأرقام. بلا شرائح متراصّة ولا بانرات ملوّنة. */

function JobCard({ r, t, isAr, KG, nested = false, n = 0, total = 0 }) {
  const approved = r.reviewStatus === "approved";
  const rejected = r.reviewStatus === "rejected";   // سجلات قديمة فقط
  const cancelled = isCancelled(r);
  const base = r.carcassKg > 0 ? r.carcassKg : r.cutsKg + r.wasteKg;
  // حدّ التنفيذ بلون حالته — أخضر مقبول · كهرماني مستنّي · أحمر ملغى
  const edge = cancelled ? "#dc2626" : approved ? K.okFg : K.waitFg;

  return (
    <div style={{
      ...S.job,
      borderInlineStartColor: edge,
      ...(nested ? S.jobNested : null),
      ...(cancelled ? { opacity: 0.75 } : null),
    }}>
      {/* الترويسة */}
      <div style={S.jobHead}>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span className="mw-day" style={{ fontWeight: 900, display: "block" }}>
            {nested && n > 0 && (
              <span className="mw-lbl" style={{ ...S.opIndex, background: edge }}>
                {isAr ? `تنفيذ ${n}${total > 1 ? ` من ${total}` : ""}`
                      : `Job ${n}${total > 1 ? ` of ${total}` : ""}`}
              </span>
            )}
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
          {/* طلب إلغاء مرفوع على هالعملية — شغلك لسّا محسوب، بس في طلب
              عند مسؤول المخزون. */}
          {r.crStatus && (
            <span
              className="mw-lbl"
              style={r.crStatus === "approved" ? S.badgeCancelled : S.badgeCr}
            >
              {r.crStatus === "approved" ? "🚫 " : r.crStatus === "open" ? "⏳ " : "↩︎ "}
              {crStatusText(r, isAr)?.label}
            </span>
          )}
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
  winBar: {
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6,
  },
  winBtn: {
    border: `1px solid ${K.line}`, background: "#fff", color: K.ink2,
    borderRadius: 999, padding: "7px 16px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },
  winBtnOn: { background: K.raw, color: "#fff", border: `1px solid ${K.raw}` },
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
  /* الطلب المفتوح: كهرماني قوي — مش خطأ بشغل الجزار، بس لازم ينتبه إله. */
  badgeCr: {
    background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa",
    borderRadius: 999, padding: "5px 12px", fontWeight: 900, whiteSpace: "nowrap",
  },
  /* ملغاة — أحمر هادي: خبر مهم، مش إنذار على شغل الجزار */
  /* سطر المادة الخام — كرت مضغوط: كل شي بسطر، والباقي مطوي تحته */
  groupRow: {
    background: "#fff", border: `1px solid ${K.line}`, borderRadius: 16,
    padding: "12px 14px", borderInlineStartWidth: 6, borderInlineStartStyle: "solid",
    display: "flex", flexDirection: "column", gap: 10,
  },
  groupBody: { display: "flex", flexDirection: "column", gap: 10 },
  cell: {
    background: K.soft, border: `1px solid #e6eff8`, borderRadius: 12,
    padding: "6px 8px", textAlign: "center", minWidth: 0, overflow: "hidden",
  },

  /* زر التفاصيل — زر حقيقي بحدّ، وبيتلوّن لما يكون مفتوح */
  detailBtn: {
    alignSelf: "flex-start", border: `1.5px solid ${K.line}`, background: "#fff",
    color: K.raw, borderRadius: 999, padding: "8px 18px", marginTop: 4,
    fontFamily: FONT, fontWeight: 900, cursor: "pointer", textAlign: "start",
  },
  detailBtnOn: { background: K.raw, color: "#fff", borderColor: K.raw },

  /* «مفتوح»: إطار كحلي وظلّ — الفرق لازم يبان بلمحة */
  jobOpen: {
    border: `2px solid ${K.raw}`,
    boxShadow: "0 14px 34px rgba(20,80,127,.14)",
  },
  /* لوح التفاصيل — أغمق من الكرت الشامل، فالكروت البيضا اللي جوّاه بتنفصل */
  detailPanel: {
    display: "flex", flexDirection: "column", gap: 12,
    background: "#e4edf9", border: "1px solid #c9dcf1", borderRadius: 16,
    padding: 12, marginTop: 6,
  },
  detailPanelHead: {
    color: "#2c4f70", fontWeight: 900, letterSpacing: ".2px",
    textTransform: "uppercase", opacity: 0.85,
  },
  /* كرت تنفيذ جوّا اللوح — أبيض بظلّ وحدّ جانبي أعرض، ما بيذوب بالخلفية */
  jobNested: {
    boxShadow: "0 8px 20px rgba(15,39,64,.12)", borderColor: "#bcd6ef",
    borderInlineStartWidth: 8,
  },
  /* رقم التنفيذ — شارة ملوّنة بحالته قبل اسم المادة */
  opIndex: {
    display: "inline-block", color: "#fff", borderRadius: 999,
    padding: "3px 10px", fontWeight: 900, marginInlineEnd: 8,
    verticalAlign: "middle",
  },
  badgeCancelled: {
    background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca",
    borderRadius: 999, padding: "5px 12px", fontWeight: 900, whiteSpace: "nowrap",
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
