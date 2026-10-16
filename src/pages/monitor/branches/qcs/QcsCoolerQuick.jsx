// src/pages/monitor/branches/qcs/QcsCoolerQuick.jsx
//
// 📱 QCS cooler quick entry — the phone screen behind the QR sticker on each
// storage unit.
//
//   /monitor/qcs/coolers/quick            hub: every unit today, late readings,
//                                         overdue rechecks, QR sticker printing
//   /monitor/qcs/coolers/quick/:unit      one unit: type the reading, save
//
// One reading per save, merged into the day's QCS Temperature Control record
// by the server (see coolerQuick.js). Out of range = a corrective action is
// required before saving, and a recheck is asked for RECHECK_AFTER_MIN later.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  emojiOf,
  fetchCoolerConfig,
  inRange,
  loadDefsCache,
  makeDefaultCoolerDefs,
  defaultLoadingDef,
  rangeLabel,
} from "./coolerDefs";
import {
  CORRECTIVE_ACTIONS,
  COOLER_TIMES,
  LATE_GRACE_MIN,
  QUICK_HUB_PATH,
  RECHECK_AFTER_MIN,
  UNIT_KEYS,
  dayStatus,
  fetchDay,
  localDate,
  quickUrl,
  saveQuickReading,
  slotForNow,
  timeLabel,
  unitDef,
} from "./coolerQuick";
import { getCurrentUser } from "../../../../utils/perms";
import { uploadImage } from "../../../../utils/imageUpload";
import { notifyOutOfRange } from "../../../../utils/notifications";

/* ══════════════════════════════════════ Language (one per screen) */
const LANG_KEY = "qcs_quick_lang";
const T = {
  en: {
    hubTitle: "Cooler temperatures — today",
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
    stickerHint: "Scan to record the temperature",
    printNow: "Print",
    closePrint: "Close",
    recheckWord: "recheck",
  },
  ar: {
    hubTitle: "حرارة البرادات — اليوم",
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
    stickerHint: "امسح لتسجيل درجة الحرارة",
    printNow: "طباعة",
    closePrint: "إغلاق",
    recheckWord: "إعادة فحص",
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
@media print {
  body * { visibility: hidden !important; }
  #root .cq.cq .print-area, #root .cq.cq .print-area * { visibility: visible !important; }
  #root .cq.cq .print-area { position: absolute; inset: 0; padding: 8mm; }
  #root .cq.cq .no-print { display: none !important; }
  #root .cq.cq .qrs { grid-template-columns: repeat(3, 1fr); }
}
`;

/* ══════════════════════════════════════ Shared data hook */
function useCoolersToday() {
  const date = localDate();
  const [defs, setDefs] = useState(
    () => loadDefsCache() || { coolerDefs: makeDefaultCoolerDefs(), loadingDef: defaultLoadingDef() }
  );
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cfg, day] = await Promise.all([fetchCoolerConfig(), fetchDay(date)]);
      if (cfg) setDefs(cfg);
      setPayload(day);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setNow(new Date());
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { reload(); }, [reload]);

  /* Keep the late list honest while the screen is open. Every 5 minutes and
     only while the tab is visible — a tighter poll keeps the database awake. */
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) reload(); }, 5 * 60 * 1000);
    const onVis = () => { if (!document.hidden) setNow(new Date()); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [reload]);

  const status = useMemo(
    () => dayStatus(payload, defs.coolerDefs, defs.loadingDef, now, true),
    [payload, defs, now]
  );
  return { date, defs, payload, status, loading, error, reload };
}

const userName = () => {
  const u = getCurrentUser() || {};
  return String(u.displayName || u.name || u.username || "").trim();
};

/* ══════════════════════════════════════ Hub */
function Hub({ t, lang, toggleLang }) {
  const { date, defs, status, loading, error, reload } = useCoolersToday();
  const [printing, setPrinting] = useState(false);

  const late = status.filter((s) => s.late.length);
  const overdue = status.filter((s) => s.recheck?.overdue);

  if (printing) {
    return (
      <div>
        <div className="bar no-print">
          <button className="btn" onClick={() => setPrinting(false)}>{t.closePrint}</button>
          <button className="btn pri" onClick={() => window.print()}>{t.printNow}</button>
        </div>
        <div className="print-area">
          <div className="qrs">
            {UNIT_KEYS.map((unit) => {
              const def = unitDef(unit, defs.coolerDefs, defs.loadingDef);
              return (
                <div className="qr" key={unit}>
                  <QRCodeSVG value={quickUrl(unit)} size={170} level="M" includeMargin />
                  <div className="name">{emojiOf(def)} {def.label}</div>
                  <div className="sm">{t.range}: {rangeLabel(def)}</div>
                  <div className="sm" style={{ marginTop: 4 }}>{t.stickerHint}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bar">
        <div>
          <h1 className="t1">🌡️ {t.hubTitle}</h1>
          <div className="sm">{date} · {t.hubSub(LATE_GRACE_MIN)}</div>
        </div>
        <button className="btn" onClick={toggleLang}>{lang === "ar" ? "EN" : "عربي"}</button>
      </div>

      <div className="bar">
        <button className="btn" onClick={reload} disabled={loading}>{t.refresh}</button>
        <button className="btn" onClick={() => setPrinting(true)}>{t.printQr}</button>
        <Link className="btn" to="/monitor/qcs">{t.openSheet}</Link>
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

      {status.map((s) => {
        const filledSlots = COOLER_TIMES.filter((slot) => String(s.readings[slot] ?? "").trim() !== "");
        const lastSlot = filledSlots[filledSlots.length - 1];
        return (
          <Link key={s.unit} className="card" to={`${QUICK_HUB_PATH}/${s.unit}`}>
            <div className="row">
              <div>
                <div className="t2">{emojiOf(s.def)} {s.def.label}</div>
                <div className="sm">
                  {t.range}: {rangeLabel(s.def)} ·{" "}
                  {lastSlot ? `${t.last}: ${s.readings[lastSlot]}°C @ ${lastSlot}` : t.noneYet}
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
            <div className="grid">
              {COOLER_TIMES.map((slot) => {
                const v = String(s.readings[slot] ?? "").trim();
                const cls = v ? (inRange(s.def, v) ? "ok" : "bad") : s.late.includes(slot) ? "warn" : "muted";
                return (
                  <div key={slot} className={`cell ${cls}`} title={slot}>
                    {v || slot.replace(":00 ", "").toLowerCase()}
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
function UnitEntry({ unit, t, lang, toggleLang }) {
  const navigate = useNavigate();
  const { date, defs, payload, status, reload } = useCoolersToday();
  const def = unitDef(unit, defs.coolerDefs, defs.loadingDef);
  const st = status.find((s) => s.unit === unit);

  const [slot, setSlot] = useState(() => slotForNow());
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

  useEffect(() => { setNeg(def?.type === "frozen"); }, [def?.type]);

  const recheck = st?.recheck || null;
  const isRecheck = !!recheck;
  const existing = String(st?.readings?.[slot] ?? "").trim();
  const value = raw === "" ? null : Number(`${neg ? "-" : ""}${raw}`);
  const valid = value !== null && Number.isFinite(value);
  const out = valid && def ? !inRange(def, value) : false;

  if (!def) return <div className="alert bad">{t.unknownUnit}</div>;

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
        ? `📱 ${slot} ${value}°C ✗ → ${actionFull}${by ? ` (${by})` : ""}`
        : "";

    setSaving(true);
    try {
      const { queued } = await saveQuickReading({
        reportDate: date,
        unit,
        slot: isRecheck ? slotForNow(at) : slot,
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
        coolerDefs: defs.coolerDefs,
        loadingDef: defs.loadingDef,
      });
      if (out) notifyOutOfRange({ location: def.label, value, min: def.min, max: def.max });
      const parts = [queued ? t.queued : t.saved];
      if (out) parts.push(t.recheckAsk(timeLabel(recheckDue)));
      setMsg({ kind: out ? "warn" : "ok", text: parts.join(" ") });
      setDone(true);
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
    setMsg(null); setDone(false); setSlot(slotForNow());
  };

  const idx = UNIT_KEYS.indexOf(unit);
  const nextUnit = UNIT_KEYS[(idx + 1) % UNIT_KEYS.length];

  return (
    <div>
      <div className="bar">
        <Link className="btn" to={QUICK_HUB_PATH}>{t.back}</Link>
        <button className="btn" onClick={toggleLang}>{lang === "ar" ? "EN" : "عربي"}</button>
      </div>

      <div className="card">
        <div className="t1">{emojiOf(def)} {def.label}</div>
        <div className="sm">{date} · {t.range}: {rangeLabel(def)}</div>
      </div>

      {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}

      {done ? (
        <div>
          <button className="btn pri full" onClick={() => { resetForm(); navigate(`${QUICK_HUB_PATH}/${nextUnit}`); }}>
            {t.nextUnit}: {unitDef(nextUnit, defs.coolerDefs, defs.loadingDef)?.label} →
          </button>
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
              <div className="chips">
                {COOLER_TIMES.map((s) => {
                  const has = String(st?.readings?.[s] ?? "").trim() !== "";
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`chip ${s === slot ? "on" : has ? "done" : ""}`}
                      onClick={() => { setSlot(s); setReplace(false); }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {existing && (
                <div className="alert warn" style={{ marginTop: 10 }}>
                  {t.already(existing)}{" "}
                  <label style={{ marginInlineStart: 8 }}>
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
              autoFocus
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
              <div className="chips">
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

          <div style={{ height: 14 }} />
          <button
            className="btn pri full"
            onClick={save}
            disabled={saving || photoBusy || (!!existing && !replace && !isRecheck)}
          >
            {saving ? t.saving : isRecheck ? t.saveRecheck : t.save}
          </button>
        </div>
      )}

      {payload && Array.isArray(payload.quickReadings) && (
        <div className="card">
          {payload.quickReadings
            .filter((r) => r && r.unit === unit)
            .slice(-6)
            .reverse()
            .map((r) => (
              <div key={r.id} className="sm" style={{ padding: "3px 0" }}>
                {timeLabel(r.at)} · {r.kind === "recheck" ? `${t.recheckWord} · ` : `${r.slot} · `}
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
export default function QcsCoolerQuick() {
  const { unit } = useParams();
  const [lang, toggleLang, t] = useLang();
  return (
    <div className="cq cq" dir={lang === "ar" ? "rtl" : "ltr"}>
      <style>{CSS}</style>
      {unit ? (
        <UnitEntry key={unit} unit={unit} t={t} lang={lang} toggleLang={toggleLang} />
      ) : (
        <Hub t={t} lang={lang} toggleLang={toggleLang} />
      )}
    </div>
  );
}
