// src/pages/monitor/branches/_shared/QuickTempPage.jsx
//
// 📱 Temperature quick entry — the phone screen behind the QR sticker on each
// storage unit, for any temperature sheet that plugs in an ADAPTER:
//   QCS coolers (qcs/QcsCoolerQuick.jsx) and the branch sheets
//   POS 10 / 11 / 15 / 19 (qcs/BranchTempQuick.jsx).
//
//   <hubPath>          hub: every unit today, late readings, overdue
//                      rechecks, QR sticker printing
//   <hubPath>/<unit>   one unit: type the reading, save
//
// One reading per save, merged into the day's record by the server. Out of
// range = a corrective action is required before saving, and a recheck is
// asked for RECHECK_AFTER_MIN later.
//
// Adapter A = {
//   label, hubPath, sheetPath, printTitle,
//   allowed()                         → may this account record here
//   slots: [{ key, label, short, hour }]
//   slotForNow(date) → slot key
//   load(date) → { payload, units: [{ key, def }], extra }
//   readingsOf(payload, unitKey) → { slotKey: value }
//   sameUnit(logUnit, unitKey) → bool
//   inRange(def, v), emoji(def), rangeLabel(def)
//   qrUrl(unitKey)
//   save(common, data) → { queued }
// }
// A unit's def: { label, type ("chilled" | "frozen" | …), min, max }.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  CORRECTIVE_ACTIONS,
  LATE_GRACE_MIN,
  RECHECK_AFTER_MIN,
  localDate,
  timeLabel,
  uaeMinutes,
} from "../qcs/coolerQuick";
import { getCurrentUser } from "../../../../utils/perms";
import { uploadImage } from "../../../../utils/imageUpload";
import { notifyOutOfRange } from "../../../../utils/notifications";
import MonthlyTempReport from "./MonthlyTempReport";

/* ══════════════════════════════════════ Language (one per screen) */
const LANG_KEY = "qcs_quick_lang";
const T = {
  en: {
    hubTitle: "Temperatures — today",
    hubSub: (n) => `Scan the QR on a unit to record it. Late = no reading ${n} min after its time.`,
    allGood: "All readings are on time.",
    late: "late",
    lateReadings: "Late readings",
    rechecksDue: "Rechecks overdue",
    recheckPending: "Recheck due",
    outOfRange: "out of range",
    noneYet: "No reading yet",
    last: "Last",
    printQr: "🖨 Print QR stickers",
    monthly: "📊 Monthly report",
    openSheet: "Open full sheet",
    refresh: "↻ Refresh",
    back: "← All units",
    range: "Allowed",
    slot: "Time slot",
    reading: "Temperature °C",
    already: (v) => `Already recorded for this slot: ${v}°C`,
    replace: "Replace it",
    inRange: "In range",
    outRange: "OUT OF RANGE",
    action: "Corrective action (required)",
    note: "Note (optional)",
    photo: "📷 Photo of the display (optional)",
    photoTaken: "📷 Photo attached",
    save: "Save reading",
    saveRecheck: "Save recheck",
    saving: "Saving…",
    needValue: "Type the temperature first.",
    needAction: "Pick the corrective action first.",
    saved: "✅ Saved",
    queued: "📴 No connection — kept on this phone, it will be sent automatically.",
    recheckAsk: (t) => `Out of range — recheck this unit at ${t}.`,
    recheckMode: (v, t) => `Recheck: ${v}°C was out of range (due ${t}). Take a new reading now.`,
    nextUnit: "Next unit",
    another: "Record another",
    slotFilled: (v) => `This slot was just recorded by someone else (${v}°C).`,
    unknownUnit: "Unknown unit.",
    noAccess: "🔒 Your account is not allowed to record this temperature log. Ask an administrator to grant it.",
    stickerHint: "Scan to record the temperature",
    printNow: "Print",
    printHint: "Each unit prints on its own A4 page with a large code. Laminate it or put it in a plastic sleeve before sticking it on the unit.",
    closePrint: "Close",
    recheckWord: "recheck",
    noUnits: "No units yet — fill the full sheet once (or add the units there) and they appear here with their QR.",
  },
  ar: {
    hubTitle: "درجات الحرارة — اليوم",
    hubSub: (n) => `امسح الـQR على الوحدة لتسجيلها. متأخرة = لا قراءة بعد ${n} دقيقة من موعدها.`,
    allGood: "كل القراءات في وقتها.",
    late: "متأخرة",
    lateReadings: "قراءات متأخرة",
    rechecksDue: "إعادة فحص متأخرة",
    recheckPending: "إعادة فحص مطلوبة",
    outOfRange: "خارج الحد",
    noneYet: "لا قراءة بعد",
    last: "آخر قراءة",
    printQr: "🖨 طباعة ملصقات QR",
    monthly: "📊 التقرير الشهري",
    openSheet: "فتح السجل الكامل",
    refresh: "↻ تحديث",
    back: "→ كل الوحدات",
    range: "المسموح",
    slot: "وقت القراءة",
    reading: "درجة الحرارة °م",
    already: (v) => `مسجلة لهذا الوقت: ${v}°م`,
    replace: "استبدالها",
    inRange: "ضمن الحد",
    outRange: "خارج الحد",
    action: "الإجراء التصحيحي (إجباري)",
    note: "ملاحظة (اختياري)",
    photo: "📷 صورة لشاشة الحرارة (اختياري)",
    photoTaken: "📷 تم إرفاق الصورة",
    save: "حفظ القراءة",
    saveRecheck: "حفظ إعادة الفحص",
    saving: "جاري الحفظ…",
    needValue: "اكتب درجة الحرارة أولاً.",
    needAction: "اختر الإجراء التصحيحي أولاً.",
    saved: "✅ تم الحفظ",
    queued: "📴 لا يوجد اتصال — حُفظت على هذا الجوال وستُرسل تلقائياً.",
    recheckAsk: (t) => `خارج الحد — أعد فحص هذه الوحدة الساعة ${t}.`,
    recheckMode: (v, t) => `إعادة فحص: ${v}°م كانت خارج الحد (موعدها ${t}). خذ قراءة جديدة الآن.`,
    nextUnit: "الوحدة التالية",
    another: "تسجيل قراءة أخرى",
    slotFilled: (v) => `سجّلها شخص آخر للتو (${v}°م).`,
    unknownUnit: "وحدة غير معروفة.",
    noAccess: "🔒 حسابك غير مسموح له بتسجيل سجل الحرارة هذا. اطلب من المسؤول منحك الصلاحية.",
    stickerHint: "امسح لتسجيل درجة الحرارة",
    printNow: "طباعة",
    printHint: "كل وحدة تُطبع على صفحة A4 لوحدها برمز كبير. يُفضّل تغليفها بالبلاستيك قبل لصقها على البراد.",
    closePrint: "إغلاق",
    recheckWord: "إعادة فحص",
    noUnits: "لا توجد وحدات بعد — عبّئ السجل الكامل مرة واحدة (أو أضف الوحدات هناك) لتظهر هنا مع رمز QR.",
  },
};

function useLang() {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem(LANG_KEY) === "ar" ? "ar" : "en"; } catch { return "en"; }
  });
  const toggle = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    try { localStorage.setItem(LANG_KEY, next); } catch {}
  };
  return [lang, toggle, T[lang]];
}

/* ══════════════════════════════════════ Styles
   globals.css forces every font size under #root with !important, so sizes
   live in this doubled-class sheet (and follow the Aa text-size slider). */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
#root .cq.cq { max-width: 560px; margin: 0 auto; padding: 14px 14px 40px; font-family: inherit; color: #0f172a; }
#root .cq.cq * { box-sizing: border-box; }
#root .cq.cq .t1 { font-size: ${fs(21)}; font-weight: 800; margin: 0; }
#root .cq.cq .t2 { font-size: ${fs(16)}; font-weight: 700; }
#root .cq.cq .sm { font-size: ${fs(12.5)}; color: #475569; }
#root .cq.cq .big { font-size: ${fs(40)}; font-weight: 800; }
#root .cq.cq .bar { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 12px; }
#root .cq.cq .btn { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 12px; padding: 9px 13px; font-weight: 700; cursor: pointer; font-size: ${fs(14)}; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
#root .cq.cq .btn.pri { background: #2563eb; border-color: #2563eb; color: #fff; }
#root .cq.cq .btn.full { width: 100%; justify-content: center; padding: 15px; font-size: ${fs(18)}; border-radius: 14px; }
#root .cq.cq .btn:disabled { opacity: .55; cursor: default; }
#root .cq.cq .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(15,23,42,.06); }
#root .cq.cq a.card { display: block; color: inherit; text-decoration: none; }
#root .cq.cq .row { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
#root .cq.cq .pill { display: inline-block; border-radius: 999px; padding: 3px 9px; font-weight: 700; font-size: ${fs(12)}; }
#root .cq.cq .ok { background: #dcfce7; color: #065f46; }
#root .cq.cq .bad { background: #fee2e2; color: #991b1b; }
#root .cq.cq .warn { background: #fef3c7; color: #92400e; }
#root .cq.cq .muted { background: #f1f5f9; color: #475569; }
#root .cq.cq .alert { border-radius: 14px; padding: 12px 14px; margin-bottom: 12px; font-weight: 700; font-size: ${fs(14)}; }
#root .cq.cq .alert.bad { border: 1px solid #fca5a5; }
#root .cq.cq .alert.ok { border: 1px solid #86efac; }
#root .cq.cq .alert.warn { border: 1px solid #fcd34d; }
#root .cq.cq .chips { display: flex; flex-wrap: wrap; gap: 7px; }
#root .cq.cq .slots { display: flex; gap: 7px; overflow-x: auto; padding: 2px 2px 8px; scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
#root .cq.cq .slots::-webkit-scrollbar { display: none; }
#root .cq.cq .slots .chip { flex: 0 0 auto; scroll-snap-align: center; min-height: 44px; }
#root .cq.cq .acts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
#root .cq.cq .acts .chip { border-radius: 12px; min-height: 52px; text-align: start; line-height: 1.3; }
/* Fixed, not sticky: #root has overflow-x:hidden, which kills sticky. The
   70px on the left keeps clear of the app's round buttons (theme, Aa). */
#root .cq.cq.has-dock { padding-bottom: 120px; }
#root .cq.cq .dock { position: fixed; left: 0; right: 0; bottom: 0; z-index: 900;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom)) 70px;
  background: rgba(255,255,255,.96); border-top: 1px solid #e2e8f0; backdrop-filter: blur(6px); box-shadow: 0 -4px 14px rgba(15,23,42,.08); }
#root .cq.cq .dock .btn { max-width: 560px; margin: 0 auto; }
#root .cq.cq .temp input, #root .cq.cq .temp .sign { min-height: 76px; }
#root .cq.cq .chk { display: inline-flex; align-items: center; gap: 8px; margin-top: 8px; font-weight: 800; }
#root .cq.cq .chk input { width: 22px; height: 22px; }
@media (max-width: 420px) {
  #root .cq.cq { padding: 10px 10px 30px; }
  #root .cq.cq .t1 { font-size: ${fs(19)}; }
  #root .cq.cq .card { padding: 12px; border-radius: 14px; }
  #root .cq.cq .grid { gap: 2px; }
  #root .cq.cq .cell { font-size: ${fs(9.5)}; padding: 4px 0; }
}
#root .cq.cq .chip { border: 1px solid #cbd5e1; background: #fff; border-radius: 999px; padding: 8px 12px; font-weight: 700; cursor: pointer; font-size: ${fs(13)}; color: #0f172a; }
#root .cq.cq .chip.on { background: #0f172a; color: #fff; border-color: #0f172a; }
#root .cq.cq .chip.done { background: #ecfdf5; border-color: #86efac; }
#root .cq.cq .temp { display: flex; gap: 8px; align-items: stretch; }
#root .cq.cq .temp input { flex: 1; min-width: 0; text-align: center; font-size: ${fs(42)}; font-weight: 800; border: 2px solid #cbd5e1; border-radius: 16px; padding: 10px; }
#root .cq.cq .temp .sign { width: 74px; font-size: ${fs(28)}; font-weight: 800; border-radius: 16px; border: 2px solid #cbd5e1; background: #f8fafc; cursor: pointer; }
#root .cq.cq textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 12px; padding: 10px; font-size: ${fs(15)}; }
#root .cq.cq .lbl { display: block; font-weight: 700; margin: 14px 0 6px; font-size: ${fs(14)}; }
#root .cq.cq .grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 3px; margin-top: 8px; }
#root .cq.cq .cell { text-align: center; border-radius: 6px; padding: 3px 0; font-size: ${fs(10.5)}; font-weight: 700; }
#root .cq.cq .qrs { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
#root .cq.cq .qr { border: 2px dashed #94a3b8; border-radius: 14px; padding: 14px; text-align: center; background: #fff; break-inside: avoid; }
#root .cq.cq .qr .name { font-size: ${fs(18)}; font-weight: 800; margin: 8px 0 2px; }
`;

/* ══════════════════════════════════════ QR stickers — one unit per A4 page
   Rendered into <body>, outside #root: the forced #root font sizes don't
   reach it, and print can hide the whole app with one rule. Large code with
   high error correction, so a scratched or wet sticker still scans; the link
   is printed under it as a fallback to type by hand. */
const PRINT_CSS = `
@media screen { .cq-print { display: none !important; } }
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  body > *:not(.cq-print) { display: none !important; }
  .cq-print { display: block !important; font-family: Arial, Helvetica, sans-serif; color: #000; }
  .cq-print .pg { height: 268mm; display: flex; flex-direction: column; align-items: center; justify-content: center;
                  text-align: center; break-after: page; page-break-after: always; border: 3px dashed #64748b; border-radius: 10mm; }
  .cq-print .pg:last-child { break-after: auto; page-break-after: auto; }
  .cq-print .ttl { font-size: 15pt; font-weight: 700; letter-spacing: .5pt; margin-bottom: 6mm; }
  .cq-print .qrbox svg { width: 150mm !important; height: 150mm !important; }
  .cq-print .nm { font-size: 40pt; font-weight: 800; margin-top: 6mm; }
  .cq-print .rg { font-size: 22pt; font-weight: 700; margin-top: 3mm; }
  .cq-print .hint { font-size: 16pt; margin-top: 6mm; }
  .cq-print .url { font-size: 10pt; margin-top: 4mm; color: #334155; word-break: break-all; }
}
`;

function QrPrintPages({ A, units }) {
  return createPortal(
    <div className="cq-print">
      <style>{PRINT_CSS}</style>
      {units.map(({ key, def }) => {
        const url = A.qrUrl(key);
        return (
          <div className="pg" key={key}>
            <div className="ttl">TEMPERATURE CHECK · {A.printTitle || A.label}</div>
            <div className="qrbox"><QRCodeSVG value={url} size={600} level="H" includeMargin /></div>
            <div className="nm">{A.emoji(def)} {def.label}</div>
            <div className="rg">Allowed: {A.rangeLabel(def)}</div>
            <div className="hint">Scan with your phone camera to record the temperature</div>
            <div className="url">{url}</div>
          </div>
        );
      })}
    </div>,
    document.body
  );
}

/* ══════════════════════════════════════ Day status (any adapter)
   Late = a slot whose time (UAE) + LATE_GRACE_MIN passed with no reading.
   Recheck = the newest out-of-range reading of the unit with no newer
   in-range one; overdue once its recheck time has passed. */
function computeStatus(A, units, payload, now) {
  const mins = uaeMinutes(now);
  const log = Array.isArray(payload?.quickReadings) ? payload.quickReadings : [];
  return units.map(({ key, def }) => {
    const readings = A.readingsOf(payload, key) || {};
    const late = [];
    const out = [];
    A.slots.forEach((sl) => {
      const v = readings[sl.key];
      if (v !== "" && v != null && !Number.isNaN(Number(v))) {
        if (!A.inRange(def, v)) out.push(sl.key);
      } else if (sl.hour * 60 + LATE_GRACE_MIN <= mins) {
        late.push(sl.key);
      }
    });
    let recheck = null;
    const mine = log.filter((r) => r && A.sameUnit(r.unit, key));
    for (let i = mine.length - 1; i >= 0; i -= 1) {
      const r = mine[i];
      if (!r.outOfRange || !r.recheckDue) break; // a newer in-range reading closed it
      recheck = { due: r.recheckDue, value: r.value, slot: r.slot, overdue: new Date(r.recheckDue).getTime() <= now.getTime() };
      break;
    }
    return { unit: key, def, readings, late, out, recheck };
  });
}

function useDayData(A) {
  const date = localDate();
  const [data, setData] = useState({ payload: null, units: [], extra: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await A.load(date));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setNow(new Date());
      setLoading(false);
    }
  }, [A, date]);

  useEffect(() => { reload(); }, [reload]);

  /* Keep the late list honest while the screen is open. Every 5 minutes and
     only while the tab is visible — a tighter poll keeps the database awake. */
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) reload(); }, 5 * 60 * 1000);
    const onVis = () => { if (!document.hidden) setNow(new Date()); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [reload]);

  const status = useMemo(() => computeStatus(A, data.units, data.payload, now), [A, data, now]);
  return { date, data, payload: data.payload, units: data.units, status, loading, error, reload };
}

const userName = () => {
  const u = getCurrentUser() || {};
  return String(u.displayName || u.name || u.username || "").trim();
};

/* ══════════════════════════════════════ Hub */
const slotLabel = (A, key) => A.slots.find((sl) => sl.key === key)?.label || key;

function Hub({ A, t, lang, toggleLang }) {
  const { date, units, status, loading, error, reload } = useDayData(A);
  const [printing, setPrinting] = useState(false);
  const [monthly, setMonthly] = useState(false);

  const late = status.filter((s) => s.late.length);
  const overdue = status.filter((s) => s.recheck?.overdue);

  if (monthly) return <MonthlyTempReport A={A} units={units} t={t} onClose={() => setMonthly(false)} />;

  if (printing) {
    return (
      <div>
        <div className="bar">
          <button className="btn" onClick={() => setPrinting(false)}>{t.closePrint}</button>
          <button className="btn pri" onClick={() => window.print()}>{t.printNow}</button>
        </div>
        <div className="sm" style={{ marginBottom: 10 }}>{t.printHint}</div>
        <div className="qrs">
          {units.map(({ key, def }) => (
            <div className="qr" key={key}>
              <QRCodeSVG value={A.qrUrl(key)} size={170} level="H" includeMargin />
              <div className="name">{A.emoji(def)} {def.label}</div>
              <div className="sm">{t.range}: {A.rangeLabel(def)}</div>
            </div>
          ))}
        </div>
        <QrPrintPages A={A} units={units} />
      </div>
    );
  }

  return (
    <div>
      <div className="bar">
        <div>
          <h1 className="t1">🌡️ {A.label} · {t.hubTitle}</h1>
          <div className="sm">{date} · {t.hubSub(LATE_GRACE_MIN)}</div>
        </div>
        <button className="btn" onClick={toggleLang}>{lang === "ar" ? "EN" : "عربي"}</button>
      </div>

      <div className="bar">
        <button className="btn" onClick={reload} disabled={loading}>{t.refresh}</button>
        <button className="btn" onClick={() => setPrinting(true)}>{t.printQr}</button>
        <button className="btn" onClick={() => setMonthly(true)}>{t.monthly}</button>
        <Link className="btn" to={A.sheetPath}>{t.openSheet}</Link>
      </div>

      {error && <div className="alert bad">{error}</div>}
      {overdue.length > 0 && (
        <div className="alert bad">
          ⏰ {t.rechecksDue}: {overdue.map((s) => s.def.label).join(" · ")}
        </div>
      )}
      {late.length > 0 ? (
        <div className="alert warn">
          ⚠️ {t.lateReadings}: {late.map((s) => `${s.def.label} (${s.late.length})`).join(" · ")}
        </div>
      ) : (
        !loading && !overdue.length && <div className="alert ok">✅ {t.allGood}</div>
      )}

      {!loading && !units.length && <div className="alert warn">{t.noUnits}</div>}

      {status.map((s) => {
        const filledSlots = A.slots.filter((sl) => String(s.readings[sl.key] ?? "").trim() !== "").map((sl) => sl.key);
        const lastSlot = filledSlots[filledSlots.length - 1];
        return (
          <Link key={s.unit} className="card" to={`${A.hubPath}/${encodeURIComponent(s.unit)}`}>
            <div className="row">
              <div>
                <div className="t2">{A.emoji(s.def)} {s.def.label}</div>
                <div className="sm">
                  {t.range}: {A.rangeLabel(s.def)} ·{" "}
                  {lastSlot ? `${t.last}: ${s.readings[lastSlot]}°C @ ${slotLabel(A, lastSlot)}` : t.noneYet}
                </div>
              </div>
              <div style={{ textAlign: "end" }}>
                {s.recheck && (
                  <div className={`pill ${s.recheck.overdue ? "bad" : "warn"}`}>⏰ {t.recheckPending}</div>
                )}
                {s.late.length > 0 && <div className="pill warn">{s.late.length} {t.late}</div>}
                {s.out.length > 0 && <div className="pill bad">{s.out.length} {t.outOfRange}</div>}
                {!s.late.length && !s.out.length && !s.recheck && filledSlots.length > 0 && (
                  <div className="pill ok">✓</div>
                )}
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${A.slots.length}, 1fr)` }}>
              {A.slots.map((sl) => {
                const v = String(s.readings[sl.key] ?? "").trim();
                const cls = v ? (A.inRange(s.def, v) ? "ok" : "bad") : s.late.includes(sl.key) ? "warn" : "muted";
                return (
                  <div key={sl.key} className={`cell ${cls}`} title={sl.label}>
                    {v || sl.short}
                  </div>
                );
              })}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════ One unit */
function UnitEntry({ A, unit, t, lang, toggleLang }) {
  const navigate = useNavigate();
  const { date, data, units, payload, status, loading, reload } = useDayData(A);
  const def = units.find((u) => u.key === unit)?.def || null;
  const st = status.find((s) => s.unit === unit);

  const [slot, setSlot] = useState(() => A.slotForNow(new Date()));
  const [neg, setNeg] = useState(() => def?.type === "frozen");
  const [raw, setRaw] = useState("");
  const [action, setAction] = useState("");
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [replace, setReplace] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { kind: ok|bad|warn, text }
  const [done, setDone] = useState(false);
  const slotsRef = useRef(null);

  // Keep the chosen time slot visible in the swipeable row.
  useEffect(() => {
    const el = slotsRef.current?.querySelector('[data-on="1"]');
    if (el) el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [slot, st]);

  useEffect(() => { setNeg(def?.type === "frozen"); }, [def?.type]);

  const recheck = st?.recheck || null;
  const isRecheck = !!recheck;
  const existing = String(st?.readings?.[slot] ?? "").trim();
  const value = raw === "" ? null : Number(`${neg ? "-" : ""}${raw}`);
  const valid = value !== null && Number.isFinite(value);
  const out = valid && def ? !A.inRange(def, value) : false;

  if (!def) return loading ? <div className="sm" style={{ padding: 20 }}>…</div> : <div className="alert bad">{t.unknownUnit}</div>;

  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setPhotoBusy(true);
    try { setPhotoUrl(await uploadImage(f, "cooler_reading")); }
    catch (err) { setMsg({ kind: "bad", text: String(err?.message || err) }); }
    finally { setPhotoBusy(false); }
  };

  const save = async () => {
    setMsg(null);
    if (!valid) return setMsg({ kind: "bad", text: t.needValue });
    if (out && !action) return setMsg({ kind: "bad", text: t.needAction });

    const at = new Date();
    const by = userName();
    const actionText = action ? (CORRECTIVE_ACTIONS.find((a) => a.key === action)?.en || action) : "";
    const actionFull = [actionText, note.trim()].filter(Boolean).join(" — ");
    const recheckDue = out ? new Date(at.getTime() + RECHECK_AFTER_MIN * 60000).toISOString() : "";
    // Remarks on the sheet stay English (the sheet and its PDF are English).
    const remarkLine = isRecheck
      ? `📱 ${timeLabel(at.toISOString())} recheck ${value}°C ${out ? "✗" : "✓"}${actionFull ? ` → ${actionFull}` : ""}${by ? ` (${by})` : ""}`
      : out
        ? `📱 ${slotLabel(A, slot)} ${value}°C ✗ → ${actionFull}${by ? ` (${by})` : ""}`
        : "";

    setSaving(true);
    try {
      const { queued } = await A.save({
        reportDate: date,
        unit,
        slot: isRecheck ? A.slotForNow(at) : slot,
        value,
        kind: isRecheck ? "recheck" : "reading",
        at: at.toISOString(),
        by,
        byName: by,
        outOfRange: out,
        correctiveAction: actionFull,
        remarkLine,
        photoUrl,
        recheckDue,
        replace: !isRecheck && !!existing && replace,
      }, data);
      if (out) notifyOutOfRange({ location: def.label, value, min: def.min, max: def.max });
      const parts = [queued ? t.queued : t.saved];
      if (out) parts.push(t.recheckAsk(timeLabel(recheckDue)));
      setMsg({ kind: out ? "warn" : "ok", text: parts.join(" ") });
      setDone(true);
      try { navigator.vibrate?.(out ? [120, 80, 120] : 60); } catch {}
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (!queued) reload();
    } catch (e) {
      if (e?.code === "SLOT_FILLED") {
        setMsg({ kind: "warn", text: t.slotFilled(e.value) });
        reload();
      } else {
        setMsg({ kind: "bad", text: String(e?.message || e) });
      }
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setRaw(""); setAction(""); setNote(""); setPhotoUrl(""); setReplace(false);
    setMsg(null); setDone(false); setSlot(A.slotForNow(new Date()));
  };

  const idx = units.findIndex((u) => u.key === unit);
  const next = units[(idx + 1) % Math.max(units.length, 1)] || null;

  return (
    <div>
      <div className="bar">
        <Link className="btn" to={A.hubPath}>{t.back}</Link>
        <button className="btn" onClick={toggleLang}>{lang === "ar" ? "EN" : "عربي"}</button>
      </div>

      <div className="card">
        <div className="t1">{A.emoji(def)} {def.label}</div>
        <div className="sm">{A.label} · {date} · {t.range}: {A.rangeLabel(def)}</div>
      </div>

      {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}

      {done ? (
        <div>
          {next && next.key !== unit && (
            <button className="btn pri full" onClick={() => { resetForm(); navigate(`${A.hubPath}/${encodeURIComponent(next.key)}`); }}>
              {t.nextUnit}: {next.def.label} →
            </button>
          )}
          <div style={{ height: 10 }} />
          <button className="btn full" onClick={resetForm}>{t.another}</button>
        </div>
      ) : (
        <div className="card">
          {isRecheck ? (
            <div className={`alert ${recheck.overdue ? "bad" : "warn"}`}>
              ⏰ {t.recheckMode(recheck.value, timeLabel(recheck.due))}
            </div>
          ) : (
            <>
              <span className="lbl">{t.slot}</span>
              <div className="slots" ref={slotsRef}>
                {A.slots.map(({ key: s, label }) => {
                  const has = String(st?.readings?.[s] ?? "").trim() !== "";
                  return (
                    <button
                      key={s}
                      type="button"
                      data-on={s === slot ? "1" : undefined}
                      className={`chip ${s === slot ? "on" : has ? "done" : ""}`}
                      onClick={() => { setSlot(s); setReplace(false); }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {existing && (
                <div className="alert warn" style={{ marginTop: 10 }}>
                  <div>{t.already(existing)}</div>
                  <label className="chk">
                    <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> {t.replace}
                  </label>
                </div>
              )}
            </>
          )}

          <span className="lbl">{t.reading}</span>
          <div className="temp">
            <button type="button" className="sign" onClick={() => setNeg((v) => !v)}>{neg ? "−" : "+"}</button>
            <input
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              aria-label={t.reading}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); save(); } }}
              value={raw}
              placeholder="0.0"
              onChange={(e) => setRaw(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
              style={valid ? { borderColor: out ? "#ef4444" : "#22c55e", background: out ? "#fef2f2" : "#f0fdf4" } : undefined}
            />
          </div>
          {valid && (
            <div style={{ marginTop: 8 }}>
              <span className={`pill ${out ? "bad" : "ok"}`}>{out ? `✗ ${t.outRange}` : `✓ ${t.inRange}`}</span>
            </div>
          )}

          {out && (
            <>
              <span className="lbl">{t.action}</span>
              <div className="acts">
                {CORRECTIVE_ACTIONS.map((a) => (
                  <button key={a.key} type="button" className={`chip ${action === a.key ? "on" : ""}`} onClick={() => setAction(a.key)}>
                    {lang === "ar" ? a.ar : a.en}
                  </button>
                ))}
              </div>
              <span className="lbl">{t.note}</span>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            </>
          )}

          <span className="lbl" />
          <label className="btn" style={{ width: "100%", justifyContent: "center" }}>
            {photoBusy ? "…" : photoUrl ? t.photoTaken : t.photo}
            <input type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
          </label>

        </div>
      )}
      {!done && (
        <div className="dock">
          <button
            className="btn pri full"
            onClick={save}
            disabled={saving || photoBusy || (!!existing && !replace && !isRecheck)}
            style={valid && out ? { background: "#dc2626", borderColor: "#dc2626" } : undefined}
          >
            {saving ? t.saving : isRecheck ? t.saveRecheck : t.save}
            {valid ? ` · ${value}°C` : ""}
          </button>
        </div>
      )}

      {payload && Array.isArray(payload.quickReadings) && (
        <div className="card">
          {payload.quickReadings
            .filter((r) => r && A.sameUnit(r.unit, unit))
            .slice(-6)
            .reverse()
            .map((r) => (
              <div key={r.id} className="sm" style={{ padding: "3px 0" }}>
                {timeLabel(r.at)} · {r.kind === "recheck" ? `${t.recheckWord} · ` : `${slotLabel(A, r.slot)} · `}
                <b style={{ color: r.outOfRange ? "#b91c1c" : "#047857" }}>{r.value}°C</b>
                {r.byName ? ` · ${r.byName}` : ""}
                {r.correctiveAction ? ` · ${r.correctiveAction}` : ""}
                {r.photoUrl ? " · 📷" : ""}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════ Page */
export default function QuickTempPage({ A, unit }) {
  const [lang, toggleLang, t] = useLang();
  return (
    <div className={`cq cq${unit ? " has-dock" : ""}`} dir={lang === "ar" ? "rtl" : "ltr"}>
      <style>{CSS}</style>
      {!A.allowed() ? (
        <div className="alert bad" style={{ marginTop: 30 }}>{t.noAccess}</div>
      ) : unit ? (
        <UnitEntry key={unit} A={A} unit={unit} t={t} lang={lang} toggleLang={toggleLang} />
      ) : (
        <Hub A={A} t={t} lang={lang} toggleLang={toggleLang} />
      )}
    </div>
  );
}
