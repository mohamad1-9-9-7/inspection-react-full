// src/pages/hse/HSELocalMigration.jsx
// 📤 Migration tool: scan localStorage for old HSE records and upload them to the server.
// Self-contained component — drop into HSEMenu.

import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { useHSELang } from "./hseShared";

const STORAGE_PREFIX = "hse_";

/** Cached marker indicating migration was completed once for this browser */
const MIGRATED_FLAG = "hse_local_migration_done_v1";

const T = {
  btnIdle:        { ar: "📤 ترحيل السجلات المحلية", en: "📤 Migrate Local Records" },
  btnRunning:     { ar: "⏳ جارٍ الترحيل…",          en: "⏳ Migrating…" },
  btnDone:        { ar: "✅ تم الترحيل",              en: "✅ Migration Done" },
  modalTitle:     { ar: "📤 ترحيل السجلات المحفوظة محلياً إلى السيرفر",
                    en: "📤 Migrate Locally-Stored Records to Server" },
  intro: {
    ar: "هذه الأداة ترفع جميع سجلات HSE الموجودة في ذاكرة المتصفح (localStorage) إلى السيرفر، بحيث تكون متاحة من أي جهاز ومحمية من الفقدان عند مسح cache المتصفح.",
    en: "This tool uploads every HSE record currently kept in this browser's localStorage to the server, so it becomes accessible from any device and protected against cache clearing.",
  },
  scanLabel:      { ar: "ملخص ما سيتم رفعه:", en: "Summary of what will be uploaded:" },
  emptyState:     { ar: "✅ لا توجد سجلات محلية تحتاج للترحيل — كل البيانات موجودة على السيرفر.",
                    en: "✅ No local records to migrate — everything is already on the server." },
  totalRecords:   { ar: "إجمالي السجلات", en: "Total records" },
  totalTypes:     { ar: "أنواع السجلات",   en: "Record types" },
  warningTitle:   { ar: "⚠️ ملاحظات قبل الترحيل", en: "⚠️ Notes Before Migrating" },
  warning: [
    { ar: "السجلات تُنسخ إلى السيرفر — النسخة المحلية تبقى كما هي (لن تُحذف).",
      en: "Records are copied to the server — the local copy remains unchanged (not deleted)." },
    { ar: "إذا كان نفس السجل موجوداً مسبقاً على السيرفر، سيتم رفعه كنسخة منفصلة. تجنّب الضغط على الزر أكثر من مرة لمنع التكرار.",
      en: "If the same record already exists on the server, it will be uploaded as a separate copy. Avoid clicking more than once to prevent duplicates." },
    { ar: "ينصح بإجراء هذه العملية مرة واحدة فقط بعد ترقية النظام للحفظ على السيرفر.",
      en: "This should be done only once after the system upgrade to server-side persistence." },
    { ar: "تأكد من وجود اتصال إنترنت ثابت طوال فترة الترحيل.",
      en: "Make sure the internet connection is stable throughout the migration." },
  ],
  start:          { ar: "🚀 بدء الترحيل", en: "🚀 Start Migration" },
  cancel:         { ar: "إلغاء", en: "Cancel" },
  close:          { ar: "إغلاق", en: "Close" },
  alreadyDone:    { ar: "💡 تم تنفيذ الترحيل من قبل على هذا المتصفح", en: "💡 Migration was already run from this browser" },
  resetFlag:      { ar: "إعادة تفعيل الزر (للاختبار)", en: "Re-enable button (testing)" },
  progress:       { ar: "التقدم", en: "Progress" },
  successCount:   { ar: "نجح", en: "Succeeded" },
  failCount:      { ar: "فشل", en: "Failed" },
  doneSummary:    { ar: "✅ انتهى الترحيل", en: "✅ Migration finished" },
  doneTip:        { ar: "يمكنك الآن إغلاق هذه النافذة والعودة لاستخدام النظام. السجلات أصبحت متاحة من أي جهاز.",
                    en: "You can now close this window and continue using the system. The records are available from any device." },
  retryLabel:     { ar: "إعادة المحاولة على السجلات الفاشلة فقط",
                    en: "Retry failed records only" },
  failedDetails:  { ar: "السجلات الفاشلة:", en: "Failed records:" },
};

/** Scan localStorage for hse_<type> arrays. Returns map { type -> array } */
function scanLocal() {
  const map = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    // Skip non-record keys (language preference, migration flag, etc.)
    if (key === "hse_lang" || key === MIGRATED_FLAG) continue;
    let arr;
    try {
      arr = JSON.parse(localStorage.getItem(key));
    } catch {
      continue;
    }
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const type = key.slice(STORAGE_PREFIX.length);
    map[type] = arr;
  }
  return map;
}

async function uploadOne(type, item, reporter) {
  const fullType = type.startsWith("hse_") ? type : `hse_${type}`;
  const payload = { ...item, createdAt: item.createdAt || new Date().toISOString(), _migratedFromLocal: true };
  delete payload.id; // server assigns a new id
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: fullType, reporter: reporter || "HSE_migration", payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => null);
}

export default function HSELocalMigration() {
  const { lang, dir, pick } = useHSELang();
  const isAr = lang === "ar";
  const [open, setOpen] = useState(false);
  const [scan, setScan] = useState({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ total: 0, done: 0, ok: 0, fail: 0 });
  const [failures, setFailures] = useState([]);
  const [finished, setFinished] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  function rescan() {
    setScan(scanLocal());
    setAlreadyDone(localStorage.getItem(MIGRATED_FLAG) === "1");
    setFinished(false);
    setFailures([]);
    setProgress({ total: 0, done: 0, ok: 0, fail: 0 });
  }
  useEffect(() => { rescan(); }, []);

  const totals = useMemo(() => {
    const types = Object.keys(scan);
    const totalRecords = types.reduce((a, t) => a + scan[t].length, 0);
    return { types, totalRecords };
  }, [scan]);

  async function startMigration(itemsToUpload) {
    setRunning(true);
    setFinished(false);
    const fails = [];
    let okCount = 0;
    let doneCount = 0;
    setProgress({ total: itemsToUpload.length, done: 0, ok: 0, fail: 0 });

    for (const { type, item } of itemsToUpload) {
      try {
        await uploadOne(type, item, item.reporter || item.preparedBy || item.inspector || "HSE_migration");
        okCount++;
      } catch (e) {
        fails.push({ type, item, error: e?.message || String(e) });
      }
      doneCount++;
      setProgress({ total: itemsToUpload.length, done: doneCount, ok: okCount, fail: fails.length });
    }

    setFailures(fails);
    setFinished(true);
    setRunning(false);
    if (fails.length === 0) {
      try { localStorage.setItem(MIGRATED_FLAG, "1"); } catch {}
      setAlreadyDone(true);
    }
  }

  function handleStart() {
    const all = [];
    for (const [type, arr] of Object.entries(scan)) {
      for (const item of arr) all.push({ type, item });
    }
    startMigration(all);
  }

  function handleRetryFailures() {
    startMigration(failures.map(({ type, item }) => ({ type, item })));
  }

  function resetFlag() {
    try { localStorage.removeItem(MIGRATED_FLAG); } catch {}
    setAlreadyDone(false);
  }

  const btnLabel = running ? pick(T.btnRunning) : alreadyDone ? pick(T.btnDone) : pick(T.btnIdle);
  const buttonStyle = {
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    cursor: running ? "wait" : "pointer",
    background: alreadyDone
      ? "linear-gradient(135deg, #dcfce7, #f0fdf4)"
      : "linear-gradient(135deg, #fef3c7, #fef9c3)",
    color: alreadyDone ? "#166534" : "#92400e",
    border: `1px solid ${alreadyDone ? "rgba(22,101,52,0.30)" : "rgba(146,64,14,0.30)"}`,
    boxShadow: "0 4px 12px rgba(146,64,14,0.18)",
    whiteSpace: "nowrap",
    opacity: running ? 0.7 : 1,
    position: "relative",
  };

  const badge = totals.totalRecords > 0 && !alreadyDone && (
    <span style={{
      position: "absolute", top: -6, insetInlineEnd: -6,
      minWidth: 18, height: 18, padding: "0 5px",
      borderRadius: 999, background: "#dc2626", color: "#fff",
      fontSize: 10, fontWeight: 950, display: "inline-flex",
      alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 6px rgba(220,38,38,0.4)",
    }}>{totals.totalRecords}</span>
  );

  return (
    <>
      <button
        type="button"
        style={buttonStyle}
        onClick={() => { rescan(); setOpen(true); }}
        disabled={running}
        title={isAr ? "ترحيل البيانات المحلية للسيرفر" : "Migrate local data to server"}
      >
        {btnLabel}
        {badge}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          dir={dir}
          style={{
            position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !running) setOpen(false); }}
        >
          <div style={{
            background: "#fff", borderRadius: 18, maxWidth: 640, width: "100%",
            maxHeight: "92vh", overflow: "auto", padding: "20px 22px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.30)",
            fontFamily: 'Cairo, system-ui, -apple-system, "Segoe UI", sans-serif',
          }}>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#7c2d12", marginBottom: 8 }}>
              {pick(T.modalTitle)}
            </div>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, margin: "0 0 14px" }}>
              {pick(T.intro)}
            </p>

            {alreadyDone && (
              <div style={{
                padding: "10px 12px", borderRadius: 10, marginBottom: 12,
                background: "#dcfce7", border: "1px solid #86efac",
                color: "#166534", fontSize: 13, fontWeight: 700,
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
              }}>
                <span>{pick(T.alreadyDone)}</span>
                <button
                  type="button"
                  onClick={resetFlag}
                  style={{
                    background: "#fff", color: "#166534", border: "1px solid rgba(22,101,52,0.30)",
                    borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer",
                  }}
                >{pick(T.resetFlag)}</button>
              </div>
            )}

            {totals.totalRecords === 0 ? (
              <div style={{
                padding: 16, borderRadius: 12, marginBottom: 14,
                background: "#f0fdf4", border: "1px solid #86efac",
                color: "#166534", fontSize: 14, fontWeight: 800, textAlign: "center",
              }}>
                {pick(T.emptyState)}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#7c2d12", marginBottom: 6 }}>
                  {pick(T.scanLabel)}
                </div>
                <div style={{
                  display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap",
                }}>
                  <div style={statBox("#7c2d12", "#fed7aa")}>
                    <span style={{ fontSize: 18, fontWeight: 950 }}>{totals.totalRecords}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>{pick(T.totalRecords)}</span>
                  </div>
                  <div style={statBox("#1e40af", "#dbeafe")}>
                    <span style={{ fontSize: 18, fontWeight: 950 }}>{totals.types.length}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>{pick(T.totalTypes)}</span>
                  </div>
                </div>

                <div style={{
                  border: "1px solid #fed7aa", borderRadius: 12, padding: 10,
                  background: "#fffbeb", marginBottom: 12,
                  maxHeight: 200, overflow: "auto",
                }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "start", color: "#7c2d12", fontWeight: 900 }}>
                        <th style={{ padding: "4px 6px", textAlign: "start" }}>Type</th>
                        <th style={{ padding: "4px 6px", textAlign: "end" }}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {totals.types.map((t) => (
                        <tr key={t} style={{ borderTop: "1px solid #fef3c7" }}>
                          <td style={{ padding: "5px 6px", fontFamily: "monospace", color: "#1f0f00" }}>{t}</td>
                          <td style={{ padding: "5px 6px", textAlign: "end", fontWeight: 800, color: "#9a3412" }}>{scan[t].length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!running && !finished && (
                  <div style={{
                    background: "#fef9c3", border: "1px solid #fde047", borderRadius: 12,
                    padding: 12, marginBottom: 14,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#854d0e", marginBottom: 6 }}>
                      {pick(T.warningTitle)}
                    </div>
                    <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
                      {T.warning.map((w, i) => <li key={i}>{pick(w)}</li>)}
                    </ul>
                  </div>
                )}

                {(running || finished) && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", marginBottom: 6,
                      fontSize: 12, fontWeight: 800, color: "#7c2d12",
                    }}>
                      <span>{pick(T.progress)}: {progress.done} / {progress.total}</span>
                      <span>
                        <span style={{ color: "#166534" }}>{pick(T.successCount)}: {progress.ok}</span>
                        {" · "}
                        <span style={{ color: "#7f1d1d" }}>{pick(T.failCount)}: {progress.fail}</span>
                      </span>
                    </div>
                    <div style={{
                      width: "100%", height: 10, background: "#fef3c7",
                      borderRadius: 999, overflow: "hidden", border: "1px solid #fde047",
                    }}>
                      <div style={{
                        width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : "0%",
                        height: "100%",
                        background: "linear-gradient(to inline-end, #f59e0b, #ea580c)",
                        transition: "width .25s ease",
                      }} />
                    </div>
                  </div>
                )}

                {finished && (
                  <div style={{
                    padding: 12, borderRadius: 12, marginBottom: 12,
                    background: progress.fail === 0 ? "#dcfce7" : "#fef9c3",
                    border: `1px solid ${progress.fail === 0 ? "#86efac" : "#fde047"}`,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 950, color: progress.fail === 0 ? "#166534" : "#92400e", marginBottom: 4 }}>
                      {pick(T.doneSummary)}
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                      {pick(T.doneTip)}
                    </div>

                    {failures.length > 0 && (
                      <details style={{ marginTop: 10 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 800, color: "#7f1d1d" }}>
                          {pick(T.failedDetails)} ({failures.length})
                        </summary>
                        <div style={{
                          marginTop: 8, padding: 8, borderRadius: 8,
                          background: "#fff", border: "1px solid #fecaca",
                          maxHeight: 180, overflow: "auto",
                          fontFamily: "monospace", fontSize: 11, color: "#7f1d1d",
                        }}>
                          {failures.map((f, i) => (
                            <div key={i} style={{ marginBottom: 4 }}>
                              <b>{f.type}</b> · {f.item?.reportNo || f.item?.id || `#${i}`} → {f.error}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </>
            )}

            <div style={{
              display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6, flexWrap: "wrap",
            }}>
              {!running && !finished && totals.totalRecords > 0 && (
                <button
                  type="button"
                  onClick={handleStart}
                  style={primaryBtn}
                >{pick(T.start)}</button>
              )}
              {!running && finished && failures.length > 0 && (
                <button
                  type="button"
                  onClick={handleRetryFailures}
                  style={primaryBtn}
                >{pick(T.retryLabel)}</button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={running}
                style={{
                  ...ghostBtn,
                  opacity: running ? 0.5 : 1,
                  cursor: running ? "not-allowed" : "pointer",
                }}
              >{finished ? pick(T.close) : pick(T.cancel)}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function statBox(textColor, bg) {
  return {
    display: "inline-flex", flexDirection: "column", alignItems: "center",
    padding: "8px 14px", borderRadius: 12, minWidth: 92,
    background: bg, color: textColor,
    border: `1px solid ${textColor}33`,
  };
}

const primaryBtn = {
  padding: "9px 18px", borderRadius: 999,
  background: "linear-gradient(135deg, #f97316, #ea580c)",
  color: "#fff", border: "none", cursor: "pointer",
  fontWeight: 900, fontSize: 13,
  boxShadow: "0 8px 18px rgba(234,88,12,0.30)",
};

const ghostBtn = {
  padding: "8px 16px", borderRadius: 999,
  background: "#fff", color: "#7c2d12",
  border: "1px solid rgba(120, 53, 15, 0.20)",
  fontWeight: 800, fontSize: 13,
  cursor: "pointer",
};
