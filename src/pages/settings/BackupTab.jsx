// src/pages/settings/BackupTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { ConfirmModal } from "./_shared/SettingsUIKit";
import {
  DEV, DevStyles, Terminal, Prompt, DevButton, DevChip, DevCheck, LogLine, AsciiProgress, devInput,
} from "./_shared/devConsole";
import { logSettingsAudit } from "../../utils/settingsAudit";
import { BRANCHES } from "./reportTypeCatalog";
import { fetchAllOfType, visibilityWarningText } from "./_shared/reportBackupFetch";
import { fetchUnlistedTypes } from "./_shared/unlistedTypes";
import NeonBackupCard from "./_shared/NeonBackupCard";


/* ============================================================
   أنواع التقارير — مشتقّة من الكتالوج الموحّد
   ============================================================
   كانت هون قائمة مكتوبة يدوياً انفصلت عن الواقع: 68 نوع ناقص
   (وحدة HSE كاملة، POS 6، معظم POS 19، OHC، الأسطول) وإحدى عشر
   مفتاح ميت بيرجّع صفر دايماً (pos10_calibration، ftr1_receiving_log،
   car_approval...). الحل إن BRANCHES في reportTypeCatalog.js صارت
   المصدر الوحيد، فأي نوع جديد بينضاف مرّة وحدة وبيوصل للنسختين. */
const REPORT_GROUPS = BRANCHES.reduce((acc, b) => {
  acc[`${b.emoji} ${b.label}`] = b.types.map(([type]) => type);
  return acc;
}, {});

/** type slug → اسمه المقروء، لعرضه جنب المفتاح في قائمة الاختيار. */
const TYPE_LABELS = BRANCHES.reduce((acc, b) => {
  b.types.forEach(([type, label]) => { if (!acc[type]) acc[type] = label; });
  return acc;
}, {});

const ALL_TYPES = [...new Set(Object.values(REPORT_GROUPS).flat())];

const RESTORE_PROTECTED_LOCAL_KEYS = new Set(["currentUser", "subscription_cache"]);

function defaultLocalCategories() {
  return LOCAL_CATEGORIES.map((c) => c.id).filter((id) => id !== "user");
}

/* ============================================================
   تصنيف مفاتيح localStorage
   ============================================================ */
function classifyLocalKey(key) {
  if (!key) return "other";
  if (/_draft(_v\d+)?$/i.test(key) || key.startsWith("returns_draft")) return "drafts";
  if (key.startsWith("app_notification_") || key.startsWith("app_settings_")) return "settings";
  if (key === "currentUser") return "user";
  return "other";
}

const LOCAL_CATEGORIES = [
  { id: "drafts",   label: "📝 المسودّات (drafts) للنماذج" },
  { id: "settings", label: "⚙️ إعدادات التطبيق" },
  { id: "user",     label: "👤 معلومات تسجيل الدخول" },
  { id: "other",    label: "📦 بيانات محلية أخرى" },
];

/* ============================================================
   Helpers
   ============================================================ */
function fmtBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0)} ${units[i]}`;
}

function readAllLocalStorage() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k != null) out[k] = localStorage.getItem(k);
    }
  } catch {}
  return out;
}

function filterLocalByCategories(allLocal, allowedCats) {
  const out = {};
  Object.entries(allLocal).forEach(([k, v]) => {
    if (allowedCats.includes(classifyLocalKey(k))) out[k] = v;
  });
  return out;
}

function reportDateOf(report) {
  const p = report?.payload || {};
  return p.reportDate || p.date || report?.created_at || null;
}

function inDateRange(report, from, to) {
  if (!from && !to) return true;
  const raw = reportDateOf(report);
  if (!raw) return !from && !to; // ما عنده تاريخ → بنسمح فقط لو ما في فلتر
  const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  const d = m ? m[1] : new Date(raw).toISOString().slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/* كان طلب واحد بيرجّع 5000 صف كحدّ أقصى (سقف السيرفر) وبيسكت عن الباقي.
   fetchAllOfType بتقسّم المدة لما تضرب بالسقف — شوف _shared/reportBackupFetch.js. */
async function fetchByType(type) {
  const page = await fetchAllOfType(type);
  return page.rows;
}

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/* ============================================================
   Component
   ============================================================ */
export default function BackupTab() {
  /* --- خيارات الاختيار --- */
  const [selectedTypes, setSelectedTypes] = useState(() => new Set(ALL_TYPES));

  /* شبكة أمان: أي نوع إله بيانات على السيرفر ومش مسجّل بالكتالوج بينضاف
     كمجموعة «Other (unlisted types)» ومحدّد افتراضياً — فالنسخة بتغطي
     القاعدة كلها حتى لو حدا نسي يضيف النوع لـ reportTypeCatalog.js. */
  const [unlisted, setUnlisted] = useState([]);
  useEffect(() => {
    let alive = true;
    fetchUnlistedTypes().then((list) => {
      if (!alive || !list.length) return;
      setUnlisted(list);
      setSelectedTypes((prev) => new Set([...prev, ...list.map((u) => u.type)]));
    });
    return () => { alive = false; };
  }, []);
  const reportGroups = useMemo(
    () => (unlisted.length
      ? { ...REPORT_GROUPS, "🗃️ Other (unlisted types)": unlisted.map((u) => u.type) }
      : REPORT_GROUPS),
    [unlisted]
  );
  const allTypes = useMemo(() => [...new Set(Object.values(reportGroups).flat())], [reportGroups]);
  const typeLabels = useMemo(() => {
    const out = { ...TYPE_LABELS };
    unlisted.forEach((u) => { out[u.type] = u.label; });
    return out;
  }, [unlisted]);
  const [selectedLocalCats, setSelectedLocalCats] = useState(() => new Set(defaultLocalCategories()));
  const [includeServerReports, setIncludeServerReports] = useState(true);
  const [includeLocalData, setIncludeLocalData] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  /* --- استرجاع --- */
  const [restorePreview, setRestorePreview] = useState(null);
  const [restoreServerToo, setRestoreServerToo] = useState(false);
  const [restoreReason, setRestoreReason] = useState("");

  /* --- حالة --- */
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [estimate, setEstimate] = useState(null); // {types: {...}, totalCount, sizeBytes}
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);

  /* نافذة الرؤية: حساب بلا صلاحية «history» بياخد آخر ٣٠ يوم لفروع POS
     وشهرين للمرتجعات، والقصّ بيصير مركزياً في authFetch.js. بدون تحذير بتطلع
     نسخة ناقصة واسمها كاملة — وهاي بالذات نسخة بتنستعمل للاستعادة. */
  const windowWarning = useMemo(
    () => visibilityWarningText(Array.from(selectedTypes)),
    [selectedTypes]
  );

  /* --- localStorage live preview --- */
  const localPreview = useMemo(() => {
    const all = readAllLocalStorage();
    const groups = { drafts: [], settings: [], user: [], other: [] };
    Object.entries(all).forEach(([k, v]) => {
      const cat = classifyLocalKey(k);
      groups[cat].push({ key: k, size: (v || "").length });
    });
    return groups;
  }, []);

  /* ===== Helpers تحكم ===== */
  function toggleType(t) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }
  function toggleGroup(group, on) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      reportGroups[group].forEach((t) => (on ? next.add(t) : next.delete(t)));
      return next;
    });
  }
  function selectAllTypes(on) {
    setSelectedTypes(on ? new Set(allTypes) : new Set());
  }
  function toggleLocalCat(cat) {
    setSelectedLocalCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  /* ===== Presets ===== */
  function applyPreset(id) {
    if (id === "full") {
      setIncludeServerReports(true);
      setIncludeLocalData(true);
      setSelectedTypes(new Set(allTypes));
      setSelectedLocalCats(new Set(defaultLocalCategories()));
      setDateFrom(""); setDateTo("");
    } else if (id === "drafts-only") {
      setIncludeServerReports(false);
      setIncludeLocalData(true);
      setSelectedLocalCats(new Set(["drafts"]));
    } else if (id === "server-only") {
      setIncludeServerReports(true);
      setIncludeLocalData(false);
      setSelectedTypes(new Set(allTypes));
    } else if (id === "last-30") {
      setIncludeServerReports(true);
      setIncludeLocalData(true);
      setDateFrom(daysAgoISO(30));
      setDateTo(todayISO());
    } else if (id === "last-90") {
      setIncludeServerReports(true);
      setIncludeLocalData(true);
      setDateFrom(daysAgoISO(90));
      setDateTo(todayISO());
    } else if (id === "this-year") {
      setIncludeServerReports(true);
      setIncludeLocalData(true);
      const y = new Date().getFullYear();
      setDateFrom(`${y}-01-01`);
      setDateTo(todayISO());
    }
    setEstimate(null);
    setMsg({ kind: "", text: "" });
  }

  /* ===== جلب التقارير حسب التحديد ===== */
  async function fetchSelectedReports(onProgress, notes) {
    if (!includeServerReports || selectedTypes.size === 0) return [];
    const types = Array.from(selectedTypes);
    const all = [];
    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      if (onProgress) onProgress(i + 1, types.length, t);
      const page = await fetchAllOfType(t);
      if (notes) {
        if (page.paged) notes.paged.push(t);
        if (page.truncated) notes.truncated.push(t);
      }
      page.rows.forEach((r) => {
        if (inDateRange(r, dateFrom, dateTo)) all.push(r);
      });
    }
    return all;
  }

  /* ===== تقدير الحجم قبل التصدير ===== */
  async function handleEstimate() {
    setBusy(true);
    setMsg({ kind: "", text: "" });
    setEstimate(null);
    setProgress({ current: 0, total: selectedTypes.size, label: "" });
    try {
      const counts = {};
      let totalReports = 0;
      if (includeServerReports) {
        const types = Array.from(selectedTypes);
        for (let i = 0; i < types.length; i++) {
          const t = types[i];
          setProgress({ current: i + 1, total: types.length, label: t });
          const arr = await fetchByType(t);
          const n = arr.filter((r) => inDateRange(r, dateFrom, dateTo)).length;
          counts[t] = n;
          totalReports += n;
        }
      }

      let localKeysCount = 0;
      if (includeLocalData) {
        const cats = Array.from(selectedLocalCats);
        cats.forEach((c) => {
          localKeysCount += (localPreview[c] || []).length;
        });
      }

      setEstimate({ counts, totalReports, localKeysCount });
      setMsg({
        kind: "info",
        text: `📊 التقدير: ${totalReports} تقرير من السيرفر + ${localKeysCount} مفتاح محلي`,
      });
    } catch (e) {
      setMsg({ kind: "err", text: `❌ فشل التقدير: ${e?.message || e}` });
    } finally {
      setBusy(false);
      setProgress({ current: 0, total: 0, label: "" });
    }
  }

  /* ===== التصدير ===== */
  async function handleExport() {
    if (!includeServerReports && !includeLocalData) {
      setMsg({ kind: "err", text: "⚠️ يجب اختيار قسم واحد على الأقل (سيرفر أو محلي)" });
      return;
    }
    setBusy(true);
    setMsg({ kind: "info", text: "⏳ جارٍ جمع البيانات..." });
    setProgress({ current: 0, total: selectedTypes.size, label: "" });

    try {
      const notes = { paged: [], truncated: [] };
      const reports = await fetchSelectedReports((cur, total, label) => {
        setProgress({ current: cur, total, label });
      }, notes);

      let localData = {};
      if (includeLocalData) {
        const all = readAllLocalStorage();
        localData = filterLocalByCategories(all, Array.from(selectedLocalCats));
      }

      let exportedBy = "anonymous";
      try {
        const u = localData.currentUser
          ? JSON.parse(localData.currentUser)
          : JSON.parse(localStorage.getItem("currentUser") || "null");
        exportedBy = u?.username || u?.email || "anonymous";
      } catch {}

      const backup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        exportedBy,
        scope: {
          includeServerReports,
          includeLocalData,
          selectedTypes: Array.from(selectedTypes),
          selectedLocalCats: Array.from(selectedLocalCats),
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        },
        counts: {
          serverReports: reports.length,
          localStorageKeys: Object.keys(localData).length,
        },
        /* سلامة النسخة — بينقرا وقت الاستعادة بدل ما نخمّن إذا كانت كاملة. */
        completeness: {
          pagedTypes: notes.paged,
          truncatedTypes: notes.truncated,
          visibilityWindowWarning: windowWarning || null,
        },
        localStorage: localData,
        serverReports: reports,
      };

      // اسم الملف
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      let suffix = "full";
      if (!includeServerReports) suffix = "local-only";
      else if (!includeLocalData) suffix = "server-only";
      else if (selectedTypes.size < allTypes.length) suffix = "partial";
      if (dateFrom || dateTo) suffix += "-dated";

      downloadJSON(`inspection-backup-${suffix}-${ts}.json`, backup);

      await logSettingsAudit({
        area: "backup_restore",
        action: "export_backup",
        target: `inspection-backup-${suffix}`,
        before: null,
        after: backup.counts,
        reason: "Backup exported",
        meta: backup.scope,
      });

      setMsg({
        kind: "ok",
        text: `✅ تم إنشاء النسخة الاحتياطية. ${reports.length} تقرير + ${Object.keys(localData).length} مفتاح محلي.`,
      });
    } catch (e) {
      console.error(e);
      setMsg({ kind: "err", text: `❌ فشل الإنشاء: ${e?.message || e}` });
    } finally {
      setBusy(false);
      setProgress({ current: 0, total: 0, label: "" });
    }
  }

  /* ===== استرجاع: قراءة الملف ===== */
  async function handleFilePick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg({ kind: "", text: "" });
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json || typeof json !== "object" || (!json.localStorage && !json.serverReports)) {
        throw new Error("ملف غير صالح: لا يحتوي على بيانات نسخة احتياطية معروفة");
      }
      setRestorePreview({
        file: file.name,
        size: file.size,
        version: json.version ?? "?",
        exportedAt: json.exportedAt || "—",
        exportedBy: json.exportedBy || "—",
        scope: json.scope || null,
        localCount: Object.keys(json.localStorage || {}).length,
        protectedLocalCount: Object.keys(json.localStorage || {}).filter((key) => RESTORE_PROTECTED_LOCAL_KEYS.has(key)).length,
        reportsCount: (json.serverReports || []).length,
        data: json,
      });
      setRestoreReason("");
    } catch (err) {
      setMsg({ kind: "err", text: `❌ فشل قراءة الملف: ${err?.message || err}` });
      setRestorePreview(null);
    }
  }

  /* ===== استرجاع: تنفيذ ===== */
  async function handleRestore() {
    if (!restorePreview) return;
    setConfirmRestore(true);
  }

  async function doRestore() {
    if (!restorePreview) return;
    if (restoreReason.trim().length < 8) {
      setConfirmRestore(false);
      setMsg({ kind: "err", text: "Please enter a clear restore reason before continuing." });
      return;
    }
    const { data } = restorePreview;

    setBusy(true);
    setConfirmRestore(false);
    setMsg({ kind: "info", text: "⏳ جارٍ الاسترجاع..." });

    try {
      const beforeLocalKeys = readAllLocalStorage();
      let restoredLocal = 0;
      let skippedProtected = 0;
      if (data.localStorage && typeof data.localStorage === "object") {
        Object.entries(data.localStorage).forEach(([k, v]) => {
          if (RESTORE_PROTECTED_LOCAL_KEYS.has(k)) {
            skippedProtected++;
            return;
          }
          try { localStorage.setItem(k, String(v)); } catch {}
          restoredLocal++;
        });
      }

      let uploaded = 0;
      let failed = 0;
      if (restoreServerToo && Array.isArray(data.serverReports)) {
        const reports = data.serverReports;
        for (let i = 0; i < reports.length; i++) {
          const r = reports[i];
          setProgress({ current: i + 1, total: reports.length, label: r?.type || "" });
          try {
            const res = await fetch(`${API_BASE}/api/reports`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reporter: r?.reporter || "restore",
                type: r?.type,
                payload: r?.payload || {},
              }),
            });
            if (res.ok) uploaded++; else failed++;
          } catch {
            failed++;
          }
        }
      }

      setMsg({
        kind: "ok",
        text:
          `✅ اكتمل الاسترجاع. ` +
          `تم استرجاع ${restoredLocal} مفتاح محلي. ` +
          (skippedProtected ? `تم تجاهل ${skippedProtected} مفتاح محمي. ` : "") +
          (restoreServerToo
            ? `تم رفع ${uploaded} تقرير${failed ? ` (${failed} فشل)` : ""}.`
            : ""),
      });
      await logSettingsAudit({
        area: "backup_restore",
        action: "restore_backup",
        target: restorePreview.file,
        before: {
          localStorageKeys: Object.keys(beforeLocalKeys).length,
          serverUploadRequested: restoreServerToo,
        },
        after: {
          restoredLocal,
          skippedProtected,
          uploaded,
          failed,
        },
        reason: restoreReason,
        meta: {
          exportedAt: restorePreview.exportedAt,
          exportedBy: restorePreview.exportedBy,
          reportsCount: restorePreview.reportsCount,
        },
      });
      setRestorePreview(null);
      setRestoreReason("");
      setTimeout(() => setConfirmReload(true), 500);
    } catch (e) {
      setMsg({ kind: "err", text: `❌ فشل الاسترجاع: ${e?.message || e}` });
    } finally {
      setBusy(false);
      setProgress({ current: 0, total: 0, label: "" });
    }
  }

  /* ===== UI ===== */
  const allTypesOn = selectedTypes.size === allTypes.length;
  const noTypesOn = selectedTypes.size === 0;
  const localKeyCount = Object.values(localPreview).reduce((s, arr) => s + arr.length, 0);
  const msgKind = msg.kind === "ok" ? "ok" : msg.kind === "err" ? "err" : "info";
  const sectionNote = { color: DEV.muted, marginBottom: 10 };

  return (
    <div className="devc" dir="rtl" style={{ background: DEV.bg, color: DEV.text, borderRadius: 14, padding: 18, minHeight: "100%" }}>
      <DevStyles />

      {/* ========== Hero: status in a terminal ========== */}
      <Terminal file="inspectpro@backup:~" right={new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" })} accent={DEV.green}>
        <div className="devc-h1" style={{ fontWeight: 800, color: "#fff", marginBottom: 4 }}>
          Backup &amp; Restore<span className="devc-cursor" />
        </div>
        <div style={{ color: DEV.muted, marginBottom: 12 }}>
          نسخ احتياطي واسترجاع — اختر بالضبط شو بدك تنسخ: الأنواع، الفترة، والبيانات المحلية.
        </div>
        <Prompt cmd="backup status" />
        <div dir="ltr" style={{ display: "flex", gap: 18, flexWrap: "wrap", paddingInlineStart: 18, lineHeight: 1.9 }}>
          <code><span style={{ color: DEV.purple }}>catalog</span>  = <span style={{ color: DEV.orange }}>{allTypes.length - unlisted.length}</span> types</code>
          <code><span style={{ color: DEV.purple }}>unlisted</span> = <span style={{ color: unlisted.length ? DEV.yellow : DEV.orange }}>{unlisted.length}</span></code>
          <code><span style={{ color: DEV.purple }}>selected</span> = <span style={{ color: DEV.green }}>{selectedTypes.size}</span>/{allTypes.length}</code>
          <code><span style={{ color: DEV.purple }}>local</span>    = <span style={{ color: DEV.orange }}>{localKeyCount}</span> keys</code>
          <code><span style={{ color: DEV.purple }}>range</span>    = <span style={{ color: DEV.cyan }}>{dateFrom || "∞"} → {dateTo || "now"}</span></code>
        </div>
        {windowWarning && <div style={{ marginTop: 10 }}><LogLine kind="warn">{windowWarning}</LogLine></div>}
      </Terminal>

      <NeonBackupCard />

      {/* ========== Quick presets ========== */}
      <Terminal file="presets.sh" title="خيارات سريعة">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <DevChip flag="--full" onClick={() => applyPreset("full")}>نسخة كاملة</DevChip>
          <DevChip flag="--server-only" onClick={() => applyPreset("server-only")}>تقارير السيرفر فقط</DevChip>
          <DevChip flag="--drafts-only" onClick={() => applyPreset("drafts-only")}>المسودّات فقط</DevChip>
          <DevChip flag="--since=30d" onClick={() => applyPreset("last-30")}>آخر 30 يوم</DevChip>
          <DevChip flag="--since=90d" onClick={() => applyPreset("last-90")}>آخر 90 يوم</DevChip>
          <DevChip flag="--year" onClick={() => applyPreset("this-year")}>السنة الحالية</DevChip>
        </div>
      </Terminal>

      {/* ========== Sources + date range ========== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <Terminal file="sources.json" title="المصادر المُضمَّنة" style={{ marginBottom: 0 }}>
          <DevCheck checked={includeServerReports} onChange={(e) => setIncludeServerReports(e.target.checked)} style={{ padding: "6px 4px" }}>
            <div>
              <div style={{ fontWeight: 700 }}>تقارير السيرفر <code dir="ltr" className="devc-xs" style={{ color: DEV.muted }}>reports</code></div>
              <div className="devc-sm" style={{ color: DEV.muted }}>كل التقارير المخزّنة على السيرفر (حسب الأنواع المختارة)</div>
            </div>
          </DevCheck>
          <DevCheck checked={includeLocalData} onChange={(e) => setIncludeLocalData(e.target.checked)} style={{ padding: "6px 4px" }}>
            <div>
              <div style={{ fontWeight: 700 }}>بيانات المتصفح المحلية <code dir="ltr" className="devc-xs" style={{ color: DEV.muted }}>localStorage</code></div>
              <div className="devc-sm" style={{ color: DEV.muted }}>المسودّات، الإعدادات، إلخ.</div>
            </div>
          </DevCheck>
        </Terminal>

        {includeServerReports && (
          <Terminal file="range.cfg" title="الفترة الزمنية (اختياري)" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <code dir="ltr" style={{ color: DEV.purple }}>from</code>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={devInput} />
              <code dir="ltr" style={{ color: DEV.purple }}>to</code>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={devInput} />
              {(dateFrom || dateTo) && (
                <DevButton onClick={() => { setDateFrom(""); setDateTo(""); }}>✕ مسح</DevButton>
              )}
            </div>
            <div className="devc-sm" style={{ color: DEV.muted, marginTop: 10 }}>
              <span dir="ltr" style={{ color: DEV.line }}>{"// "}</span>
              يطبَّق على <code style={{ color: DEV.orange }}>reportDate</code> أو <code style={{ color: DEV.orange }}>date</code> داخل التقرير. التقارير بدون تاريخ تُستثنى عند تحديد فترة.
            </div>
          </Terminal>
        )}
      </div>
      <div style={{ height: 16 }} />

      {/* ========== Report types ========== */}
      {includeServerReports && (
        <Terminal
          file="report-types/"
          title="أنواع التقارير"
          right={<code dir="ltr">{selectedTypes.size}/{allTypes.length} selected</code>}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <DevButton onClick={() => selectAllTypes(true)} disabled={allTypesOn}>[x] تحديد الكل</DevButton>
            <DevButton onClick={() => selectAllTypes(false)} disabled={noTypesOn}>[ ] إلغاء الكل</DevButton>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 10 }}>
            {Object.entries(reportGroups).map(([group, types]) => {
              const onCount = types.filter((t) => selectedTypes.has(t)).length;
              const allOn = onCount === types.length;
              const noneOn = onCount === 0;
              const isOther = group.includes("unlisted");
              return (
                <div
                  key={group}
                  style={{
                    border: `1px solid ${isOther ? DEV.yellow : DEV.line}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    background: noneOn ? "transparent" : "rgba(63,185,80,.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <DevCheck checked={allOn} indeterminate={!allOn && !noneOn} onChange={() => toggleGroup(group, !allOn)}>
                      <span style={{ fontWeight: 800, color: isOther ? DEV.yellow : "#fff" }}>{group}/</span>
                    </DevCheck>
                    <code dir="ltr" className="devc-xs" style={{ color: DEV.muted }}>{onCount}/{types.length}</code>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, borderInlineStart: `1px dashed ${DEV.line}`, marginInlineStart: 10, paddingInlineStart: 8 }}>
                    {types.map((t) => (
                      <DevCheck key={t} checked={selectedTypes.has(t)} onChange={() => toggleType(t)}>
                        <span className="devc-sm" style={{ color: DEV.text }}>{typeLabels[t] || t}</span>
                        <code dir="ltr" className="devc-xs" style={{ color: DEV.muted }}>{t}</code>
                        {estimate?.counts?.[t] !== undefined && (
                          <code dir="ltr" className="devc-xs" style={{ marginInlineStart: "auto", color: estimate.counts[t] ? DEV.green : DEV.muted, fontWeight: 700 }}>
                            {estimate.counts[t]}
                          </code>
                        )}
                      </DevCheck>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Terminal>
      )}

      {/* ========== Local data ========== */}
      {includeLocalData && (
        <Terminal file="localStorage/" title="فئات البيانات المحلية" right={<code dir="ltr">{selectedLocalCats.size}/{LOCAL_CATEGORIES.length}</code>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            {LOCAL_CATEGORIES.map((c) => {
              const items = localPreview[c.id] || [];
              const totalSize = items.reduce((acc, x) => acc + (x.size || 0), 0);
              const on = selectedLocalCats.has(c.id);
              return (
                <DevCheck
                  key={c.id}
                  checked={on}
                  onChange={() => toggleLocalCat(c.id)}
                  style={{ border: `1px solid ${on ? DEV.green : DEV.line}`, borderRadius: 8, padding: "10px 12px", alignItems: "flex-start" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{c.label}</div>
                    <code dir="ltr" className="devc-xs" style={{ color: DEV.muted }}>{items.length} keys · {fmtBytes(totalSize)}</code>
                  </div>
                </DevCheck>
              );
            })}
          </div>
        </Terminal>
      )}

      {/* ========== Export ========== */}
      <Terminal file="export.run" title="التصدير" accent={DEV.green}>
        <Prompt cmd={`backup export --types=${selectedTypes.size}${dateFrom ? ` --from=${dateFrom}` : ""}${dateTo ? ` --to=${dateTo}` : ""}${includeLocalData ? " --local" : ""}`} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <DevButton onClick={handleEstimate} disabled={busy}>🔍 تقدير الحجم</DevButton>
          <DevButton tone="run" onClick={handleExport} disabled={busy}>
            {busy && progress.total > 0 ? `⏳ ${progress.current}/${progress.total}` : "▶ تحميل النسخة الاحتياطية"}
          </DevButton>
        </div>
        {busy && progress.total > 0 && (
          <div style={{ marginTop: 12 }}>
            <AsciiProgress current={progress.current} total={progress.total} />
            {progress.label && <div className="devc-sm" style={{ color: DEV.muted, marginTop: 4 }}>› <code dir="ltr">{progress.label}</code></div>}
          </div>
        )}
        {estimate && (
          <div style={{ marginTop: 12 }}>
            <LogLine kind="ok">
              التقدير: <code style={{ color: DEV.green }}>{estimate.totalReports}</code> تقرير من السيرفر ·{" "}
              <code style={{ color: DEV.orange }}>{estimate.localKeysCount}</code> مفتاح محلي
            </LogLine>
          </div>
        )}
      </Terminal>

      {/* ========== Restore ========== */}
      <Terminal file="restore.sh" title="استرجاع من ملف" accent={DEV.orange}>
        <div style={sectionNote}>اختر ملف JSON الذي تم تنزيله سابقًا. سيتم عرض ملخّص قبل التأكيد.</div>

        <label className="devc-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 6, border: `1px dashed ${DEV.orange}`, color: DEV.orange, cursor: "pointer", fontWeight: 700 }}>
          📂 اختيار ملف… <code dir="ltr" className="devc-xs" style={{ color: DEV.muted }}>*.json</code>
          <input type="file" accept="application/json,.json" onChange={handleFilePick} style={{ display: "none" }} />
        </label>

        {restorePreview && (
          <div style={{ marginTop: 14, border: `1px solid ${DEV.line}`, borderRadius: 8, padding: "12px 14px", background: DEV.bg }}>
            <Prompt cmd={`cat ${restorePreview.file}`}>({fmtBytes(restorePreview.size)})</Prompt>
            <div dir="ltr" style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "2px 14px", paddingInlineStart: 18, margin: "6px 0 10px" }}>
              {[
                ["version", restorePreview.version],
                ["exportedAt", restorePreview.exportedAt],
                ["exportedBy", restorePreview.exportedBy],
                ["localKeys", restorePreview.localCount],
                ["serverReports", restorePreview.reportsCount],
                ...(restorePreview.protectedLocalCount > 0 ? [["protectedKeys", `${restorePreview.protectedLocalCount} (won't be replaced)`]] : []),
                ...(restorePreview.scope ? [["scope", [
                  restorePreview.scope.includeServerReports && `${restorePreview.scope.selectedTypes?.length || 0} types`,
                  restorePreview.scope.dateFrom && `from ${restorePreview.scope.dateFrom}`,
                  restorePreview.scope.dateTo && `to ${restorePreview.scope.dateTo}`,
                ].filter(Boolean).join(" · ") || "—"]] : []),
              ].map(([k, v]) => (
                <React.Fragment key={k}>
                  <code style={{ color: DEV.purple }}>{k}:</code>
                  <code style={{ color: DEV.text }}>{String(v ?? "—")}</code>
                </React.Fragment>
              ))}
            </div>

            <label style={{ display: "block", marginTop: 8 }}>
              <span style={{ display: "block", fontWeight: 700, color: DEV.yellow, marginBottom: 6 }}>
                Restore reason / سبب الاسترجاع *
              </span>
              <textarea
                value={restoreReason}
                onChange={(e) => setRestoreReason(e.target.value)}
                rows={2}
                placeholder="Example: Recover settings after accidental change"
                style={{ ...devInput, width: "100%", resize: "vertical", boxSizing: "border-box" }}
              />
            </label>

            <DevCheck
              checked={restoreServerToo}
              onChange={(e) => setRestoreServerToo(e.target.checked)}
              style={{ marginTop: 10, padding: "8px 12px", border: `1px solid ${DEV.yellow}`, borderRadius: 8 }}
            >
              <span style={{ fontWeight: 700, color: DEV.yellow }}>⚠️ رفع تقارير السيرفر أيضًا (قد يسبّب تكرار)</span>
            </DevCheck>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <DevButton tone="danger" onClick={handleRestore} disabled={busy || restoreReason.trim().length < 8}>
                {busy ? "⏳ جارٍ الاسترجاع..." : "♻️ تأكيد الاسترجاع"}
              </DevButton>
              <DevButton onClick={() => setRestorePreview(null)} disabled={busy}>إلغاء</DevButton>
            </div>
            {busy && progress.total > 0 && (
              <div style={{ marginTop: 10 }}>
                <AsciiProgress current={progress.current} total={progress.total} />
                {progress.label && <div className="devc-sm" style={{ color: DEV.muted }}>› <code dir="ltr">{progress.label}</code></div>}
              </div>
            )}
          </div>
        )}
      </Terminal>

      {/* ========== Log ========== */}
      {msg.text && (
        <Terminal file="output.log" accent={msgKind === "err" ? DEV.red : msgKind === "ok" ? DEV.green : DEV.cyan}>
          <LogLine kind={msgKind}>{msg.text}</LogLine>
        </Terminal>
      )}

      <ConfirmModal
        open={confirmRestore}
        title="تأكيد الاسترجاع"
        body={
          restorePreview
            ? `سيتم دمج مفاتيح النسخة الاحتياطية مع بيانات المتصفح الحالية. لن يتم استبدال مفاتيح الجلسة المحمية مثل currentUser. السبب: ${restoreReason.trim()}. ${
                restoreServerToo
                  ? `وسيتم رفع ${restorePreview.data.serverReports?.length || 0} تقرير للسيرفر، وقد ينتج عنها تكرار.`
                  : "لن يتم رفع التقارير للسيرفر لأن الخيار غير مفعّل."
              }`
            : ""
        }
        confirmText="تأكيد الاسترجاع"
        cancelText="إلغاء"
        onConfirm={doRestore}
        onCancel={() => setConfirmRestore(false)}
      />
      <ConfirmModal
        open={confirmReload}
        title="إعادة تحميل الصفحة؟"
        body="إعادة التحميل تساعد على تفعيل البيانات المسترجعة فوراً."
        confirmText="إعادة تحميل"
        cancelText="لاحقاً"
        tone="primary"
        onConfirm={() => window.location.reload()}
        onCancel={() => setConfirmReload(false)}
      />
    </div>
  );
}
