// src/pages/settings/BackupTab.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = String(
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ============================================================
   تصنيف أنواع التقارير حسب الفرع/الفئة
   ============================================================ */
const REPORT_GROUPS = {
  "QCS": [
    "qcs-coolers", "qcs-ph", "qcs-clean",
    "qcs_raw_material", "qcs_fresh_chicken",
    "qcs_internal_audit", "qcs_non_conformance", "qcs_corrective_action",
    "qcs_meat_inspection", "qcs_rm_packaging", "qcs_rm_ingredients",
  ],
  "FTR1": [
    "ftr1_temperature", "ftr1_personal_hygiene", "ftr1_oil_calibration",
    "ftr1_daily_cleanliness", "ftr1_cooking_temperature_log", "ftr1_receiving_log",
  ],
  "FTR2": [
    "ftr2_temperature", "ftr2_personal_hygiene", "ftr2_oil_calibration",
    "ftr2_daily_cleanliness", "ftr2_cooking_temperature_log", "ftr2_receiving_log",
  ],
  "POS 10": [
    "pos10_temperature", "pos10_daily_cleanliness", "pos10_personal_hygiene",
    "pos10_calibration", "pos10_pest_control", "pos10_receiving_log", "pos10_traceability",
  ],
  "POS 11": [
    "pos11_temperature", "pos11_daily_cleanliness", "pos11_personal_hygiene",
    "pos11_calibration", "pos11_pest_control", "pos11_receiving_log",
  ],
  "POS 15": [
    "pos15_temperature", "pos15_daily_cleanliness", "pos15_personal_hygiene",
    "pos15_pest_control", "pos15_receiving_log", "pos15_traceability",
    "pos15_equipment_inspection_sanitizing",
  ],
  "POS 19": [
    "pos19_temperature_monitoring", "pos19_hot_holding_temperature",
    "pos19_food_temperature_verification", "pos19_cooking_temperature",
  ],
  "Production": [
    "prod_personal_hygiene", "prod_cleaning_checklist", "prod_defrosting_record",
  ],
  "Returns": [
    "returns", "returns_changes",
    "returns_customers", "returns_customers_changes",
    "enoc_returns",
  ],
  "Training & Compliance": [
    "training_certificate", "training_session", "training_quiz",
    "supplier_evaluation", "supplier_approval",
    "municipality_inspection", "licenses_contracts",
    "product_details", "sop_ssop", "haccp_iso", "internal_audit",
  ],
  "Other": [
    "meat_daily", "inventory_daily_grouped",
    "car_approval", "maintenance_request",
    "finished_product", "ohc_upload",
    "users", "admin_notification_config",
  ],
};

const ALL_TYPES = Object.values(REPORT_GROUPS).flat();

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

async function fetchByType(type) {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    return Array.isArray(json) ? json : json?.data || [];
  } catch {
    return [];
  }
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
  const [selectedLocalCats, setSelectedLocalCats] = useState(() => new Set(LOCAL_CATEGORIES.map((c) => c.id)));
  const [includeServerReports, setIncludeServerReports] = useState(true);
  const [includeLocalData, setIncludeLocalData] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  /* --- استرجاع --- */
  const [restorePreview, setRestorePreview] = useState(null);
  const [restoreServerToo, setRestoreServerToo] = useState(false);

  /* --- حالة --- */
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [estimate, setEstimate] = useState(null); // {types: {...}, totalCount, sizeBytes}
  const [msg, setMsg] = useState({ kind: "", text: "" });

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
      REPORT_GROUPS[group].forEach((t) => (on ? next.add(t) : next.delete(t)));
      return next;
    });
  }
  function selectAllTypes(on) {
    setSelectedTypes(on ? new Set(ALL_TYPES) : new Set());
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
      setSelectedTypes(new Set(ALL_TYPES));
      setSelectedLocalCats(new Set(LOCAL_CATEGORIES.map((c) => c.id)));
      setDateFrom(""); setDateTo("");
    } else if (id === "drafts-only") {
      setIncludeServerReports(false);
      setIncludeLocalData(true);
      setSelectedLocalCats(new Set(["drafts"]));
    } else if (id === "server-only") {
      setIncludeServerReports(true);
      setIncludeLocalData(false);
      setSelectedTypes(new Set(ALL_TYPES));
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
  async function fetchSelectedReports(onProgress) {
    if (!includeServerReports || selectedTypes.size === 0) return [];
    const types = Array.from(selectedTypes);
    const all = [];
    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      if (onProgress) onProgress(i + 1, types.length, t);
      const arr = await fetchByType(t);
      arr.forEach((r) => {
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
      const reports = await fetchSelectedReports((cur, total, label) => {
        setProgress({ current: cur, total, label });
      });

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
        localStorage: localData,
        serverReports: reports,
      };

      // اسم الملف
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      let suffix = "full";
      if (!includeServerReports) suffix = "local-only";
      else if (!includeLocalData) suffix = "server-only";
      else if (selectedTypes.size < ALL_TYPES.length) suffix = "partial";
      if (dateFrom || dateTo) suffix += "-dated";

      downloadJSON(`inspection-backup-${suffix}-${ts}.json`, backup);

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
        reportsCount: (json.serverReports || []).length,
        data: json,
      });
    } catch (err) {
      setMsg({ kind: "err", text: `❌ فشل قراءة الملف: ${err?.message || err}` });
      setRestorePreview(null);
    }
  }

  /* ===== استرجاع: تنفيذ ===== */
  async function handleRestore() {
    if (!restorePreview) return;
    const { data } = restorePreview;

    const confirmMsg =
      `⚠️ سيتم استبدال بيانات localStorage الحالية ببيانات النسخة الاحتياطية.\n` +
      (restoreServerToo
        ? `وسيتم رفع ${data.serverReports?.length || 0} تقرير للسيرفر (قد ينتج تقارير مكرّرة).\n`
        : `لن يتم رفع التقارير للسيرفر (الخيار غير مفعّل).\n`) +
      `\nهل أنت متأكد؟`;
    if (!window.confirm(confirmMsg)) return;

    setBusy(true);
    setMsg({ kind: "info", text: "⏳ جارٍ الاسترجاع..." });

    try {
      if (data.localStorage && typeof data.localStorage === "object") {
        try { localStorage.clear(); } catch {}
        Object.entries(data.localStorage).forEach(([k, v]) => {
          try { localStorage.setItem(k, String(v)); } catch {}
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
          `تم استرجاع ${Object.keys(data.localStorage || {}).length} مفتاح محلي. ` +
          (restoreServerToo
            ? `تم رفع ${uploaded} تقرير${failed ? ` (${failed} فشل)` : ""}.`
            : ""),
      });
      setRestorePreview(null);

      setTimeout(() => {
        if (window.confirm("هل تريد إعادة تحميل الصفحة الآن لتفعيل البيانات المسترجعة؟")) {
          window.location.reload();
        }
      }, 500);
    } catch (e) {
      setMsg({ kind: "err", text: `❌ فشل الاسترجاع: ${e?.message || e}` });
    } finally {
      setBusy(false);
      setProgress({ current: 0, total: 0, label: "" });
    }
  }

  /* ===== UI styles ===== */
  const card = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "1.1rem",
    marginBottom: 14,
  };
  const btnPrimary = {
    background: "linear-gradient(180deg,#1e3a5f,#2d5a8e)",
    color: "#fff",
    border: "none",
    padding: "11px 20px",
    borderRadius: 10,
    cursor: busy ? "not-allowed" : "pointer",
    fontWeight: 800,
    fontSize: "0.92rem",
    opacity: busy ? 0.6 : 1,
  };
  const btnSecondary = {
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.85rem",
  };
  const btnDanger = {
    ...btnPrimary,
    background: "linear-gradient(180deg,#b91c1c,#dc2626)",
  };
  const presetBtn = {
    background: "#eff6ff",
    color: "#1e40af",
    border: "1px solid #bfdbfe",
    padding: "8px 14px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.85rem",
  };

  const allTypesOn = selectedTypes.size === ALL_TYPES.length;
  const noTypesOn = selectedTypes.size === 0;

  return (
    <div>
      {/* مقدمة */}
      <div style={{ ...card, background: "linear-gradient(135deg,#eff6ff,#f0f9ff)", borderColor: "#bfdbfe" }}>
        <div style={{ fontWeight: 800, color: "#1e3a5f", marginBottom: 6 }}>
          💾 النسخ الاحتياطي والاسترجاع المتقدّم
        </div>
        <div style={{ color: "#374151", lineHeight: 1.6, fontSize: "0.9rem" }}>
          اختر بدقة شو بدّك تنسخ: نوع التقارير، الفروع، الفترة الزمنية، أو حتى نوع البيانات المحلية.
        </div>
      </div>

      {/* ========== Quick Presets ========== */}
      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 10, color: "#0b1f4d" }}>⚡ خيارات سريعة</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => applyPreset("full")} style={presetBtn}>📦 نسخة كاملة</button>
          <button onClick={() => applyPreset("server-only")} style={presetBtn}>🗄️ تقارير السيرفر فقط</button>
          <button onClick={() => applyPreset("drafts-only")} style={presetBtn}>📝 المسودّات فقط</button>
          <button onClick={() => applyPreset("last-30")} style={presetBtn}>📅 آخر 30 يوم</button>
          <button onClick={() => applyPreset("last-90")} style={presetBtn}>📅 آخر 90 يوم</button>
          <button onClick={() => applyPreset("this-year")} style={presetBtn}>📅 السنة الحالية</button>
        </div>
      </div>

      {/* ========== المصادر ========== */}
      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 10, color: "#0b1f4d" }}>📂 المصادر المُضمَّنة</div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeServerReports}
            onChange={(e) => setIncludeServerReports(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <div>
            <div style={{ fontWeight: 700 }}>🗄️ تقارير السيرفر</div>
            <div style={{ fontSize: "0.83rem", color: "#6b7280" }}>كل التقارير المخزّنة على السيرفر (حسب الأنواع المختارة)</div>
          </div>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeLocalData}
            onChange={(e) => setIncludeLocalData(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <div>
            <div style={{ fontWeight: 700 }}>💻 بيانات المتصفح المحلية</div>
            <div style={{ fontSize: "0.83rem", color: "#6b7280" }}>المسودّات، الإعدادات، إلخ.</div>
          </div>
        </label>
      </div>

      {/* ========== فلتر التاريخ ========== */}
      {includeServerReports && (
        <div style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10, color: "#0b1f4d" }}>📅 الفترة الزمنية (اختياري)</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>من:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>إلى:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
              />
            </label>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={btnSecondary}>
                مسح
              </button>
            )}
          </div>
          <div style={{ fontSize: "0.83rem", color: "#6b7280", marginTop: 8 }}>
            يطبَّق الفلتر على حقل <code>reportDate</code> أو <code>date</code> داخل التقرير. التقارير بدون تاريخ تُستثنى عند تحديد فترة.
          </div>
        </div>
      )}

      {/* ========== اختيار أنواع التقارير ========== */}
      {includeServerReports && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontWeight: 800, color: "#0b1f4d" }}>
              📋 أنواع التقارير ({selectedTypes.size}/{ALL_TYPES.length})
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => selectAllTypes(true)} disabled={allTypesOn} style={btnSecondary}>تحديد الكل</button>
              <button onClick={() => selectAllTypes(false)} disabled={noTypesOn} style={btnSecondary}>إلغاء الكل</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 10 }}>
            {Object.entries(REPORT_GROUPS).map(([group, types]) => {
              const onCount = types.filter((t) => selectedTypes.has(t)).length;
              const allOn = onCount === types.length;
              const noneOn = onCount === 0;
              return (
                <div
                  key={group}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: noneOn ? "#fafafa" : "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 800, color: "#0b1f4d" }}>
                      <input
                        type="checkbox"
                        checked={allOn}
                        ref={(el) => { if (el) el.indeterminate = !allOn && !noneOn; }}
                        onChange={() => toggleGroup(group, !allOn)}
                        style={{ width: 16, height: 16 }}
                      />
                      {group}
                    </label>
                    <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>{onCount}/{types.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginInlineStart: 22 }}>
                    {types.map((t) => (
                      <label
                        key={t}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          fontSize: "0.82rem", color: "#374151",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTypes.has(t)}
                          onChange={() => toggleType(t)}
                          style={{ width: 14, height: 14 }}
                        />
                        <code style={{ fontSize: "0.78rem" }}>{t}</code>
                        {estimate?.counts?.[t] !== undefined && (
                          <span style={{ marginInlineStart: "auto", color: "#16a34a", fontWeight: 700 }}>
                            {estimate.counts[t]}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== اختيار البيانات المحلية ========== */}
      {includeLocalData && (
        <div style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10, color: "#0b1f4d" }}>
            💻 فئات البيانات المحلية ({selectedLocalCats.size}/{LOCAL_CATEGORIES.length})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {LOCAL_CATEGORIES.map((c) => {
              const items = localPreview[c.id] || [];
              const totalSize = items.reduce((acc, x) => acc + (x.size || 0), 0);
              const on = selectedLocalCats.has(c.id);
              return (
                <label
                  key={c.id}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: on ? "#fff" : "#fafafa",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleLocalCat(c.id)}
                    style={{ width: 16, height: 16, marginTop: 3 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#0b1f4d" }}>{c.label}</div>
                    <div style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: 2 }}>
                      {items.length} مفتاح · {fmtBytes(totalSize)}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== أزرار التصدير ========== */}
      <div style={card}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={handleEstimate} disabled={busy} style={btnSecondary}>
            🔍 تقدير الحجم قبل التصدير
          </button>
          <button onClick={handleExport} disabled={busy} style={btnPrimary}>
            {busy && progress.total > 0
              ? `⏳ ${progress.current}/${progress.total}`
              : "⬇️ تحميل النسخة الاحتياطية"}
          </button>
        </div>
        {busy && progress.label && (
          <div style={{ marginTop: 10, fontSize: "0.83rem", color: "#6b7280" }}>
            النوع الحالي: <code>{progress.label}</code>
          </div>
        )}
        {estimate && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 8,
              fontSize: "0.9rem",
              color: "#065f46",
            }}
          >
            📊 <strong>التقدير:</strong> {estimate.totalReports} تقرير من السيرفر · {estimate.localKeysCount} مفتاح محلي
          </div>
        )}
      </div>

      {/* ========== الاسترجاع ========== */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: 8, color: "#0b1f4d" }}>
          ♻️ استرجاع من ملف
        </div>
        <div style={{ color: "#6b7280", marginBottom: 12, fontSize: "0.9rem" }}>
          اختر ملف JSON الذي تم تنزيله سابقًا. سيتم عرض ملخّص قبل التأكيد.
        </div>

        <label style={{ ...btnSecondary, display: "inline-block" }}>
          📂 اختيار ملف...
          <input type="file" accept="application/json,.json" onChange={handleFilePick} style={{ display: "none" }} />
        </label>

        {restorePreview && (
          <div
            style={{
              marginTop: 14,
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "12px 14px",
              background: "#f9fafb",
              fontSize: "0.9rem",
              lineHeight: 1.8,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 8, color: "#0b1f4d" }}>📋 ملخّص الملف:</div>
            <div>📄 <strong>الملف:</strong> {restorePreview.file} ({fmtBytes(restorePreview.size)})</div>
            <div>🏷️ <strong>الإصدار:</strong> {restorePreview.version}</div>
            <div>🕒 <strong>تاريخ الإنشاء:</strong> {restorePreview.exportedAt}</div>
            <div>👤 <strong>أُنشئ بواسطة:</strong> {restorePreview.exportedBy}</div>
            <div>💾 <strong>عناصر محلية:</strong> {restorePreview.localCount}</div>
            <div>🗄️ <strong>تقارير السيرفر:</strong> {restorePreview.reportsCount}</div>
            {restorePreview.scope && (
              <div style={{ marginTop: 8, fontSize: "0.82rem", color: "#6b7280" }}>
                <strong>نطاق النسخة:</strong>{" "}
                {restorePreview.scope.includeServerReports && `${restorePreview.scope.selectedTypes?.length || 0} نوع تقرير`}
                {restorePreview.scope.dateFrom && ` · من ${restorePreview.scope.dateFrom}`}
                {restorePreview.scope.dateTo && ` إلى ${restorePreview.scope.dateTo}`}
              </div>
            )}

            <label
              style={{
                display: "flex", alignItems: "center", gap: 8,
                marginTop: 12, padding: "8px 12px",
                background: "#fef3c7", border: "1px solid #fcd34d",
                borderRadius: 8, cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={restoreServerToo}
                onChange={(e) => setRestoreServerToo(e.target.checked)}
              />
              <span style={{ fontWeight: 700, color: "#92400e" }}>
                ⚠️ رفع تقارير السيرفر أيضًا (قد يسبّب تكرار)
              </span>
            </label>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={handleRestore} disabled={busy} style={btnDanger}>
                {busy ? "⏳ جارٍ الاسترجاع..." : "♻️ تأكيد الاسترجاع"}
              </button>
              <button onClick={() => setRestorePreview(null)} disabled={busy} style={btnSecondary}>
                إلغاء
              </button>
            </div>
            {busy && progress.total > 0 && (
              <div style={{ marginTop: 10, fontSize: "0.83rem", color: "#6b7280" }}>
                {progress.current}/{progress.total} — <code>{progress.label}</code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* رسالة */}
      {msg.text && (
        <div
          style={{
            ...card,
            marginBottom: 0,
            background: msg.kind === "ok" ? "#ecfdf5" : msg.kind === "err" ? "#fef2f2" : "#eff6ff",
            borderColor: msg.kind === "ok" ? "#86efac" : msg.kind === "err" ? "#fca5a5" : "#bfdbfe",
            color: msg.kind === "ok" ? "#065f46" : msg.kind === "err" ? "#991b1b" : "#1e40af",
            fontWeight: 600,
          }}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
