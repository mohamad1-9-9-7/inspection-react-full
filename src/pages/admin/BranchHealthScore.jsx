import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import "./BranchHealthScore.css";

const LOOKBACK_DAYS = 30;
const COVERAGE_DAYS = 7;
const MAX_RECORDS_PER_TYPE = 700;
// كم نوع نسحبه بنفس اللحظة — نبقيه صغيراً حتى لا نصطدم بحدّ 429 (per-IP) على السيرفر.
const FETCH_CONCURRENCY = 4;

const BRANCHES = [
  {
    key: "QCS",
    name: "QCS",
    group: "Warehouse",
    color: "#0ea5e9",
    types: [
      ["qcs-coolers", "Coolers"],
      ["qcs-ph", "Personal Hygiene"],
      ["qcs-clean", "Daily Cleanliness"],
      ["qcs_raw_material", "Raw Material"],
      ["qcs_non_conformance", "Non-Conformance"],
      ["qcs_corrective_action", "Corrective Action"],
      ["qcs_internal_audit", "Internal Audit"],
    ],
    issueTypes: ["qcs_non_conformance"],
  },
  {
    key: "POS 10",
    name: "POS 10",
    group: "Abu Dhabi Butchery",
    color: "#2563eb",
    types: [
      ["pos10_daily_cleanliness", "Daily Cleaning"],
      ["pos10_personal_hygiene", "Personal Hygiene"],
      ["pos10_temperature", "Temperature"],
      ["pos10_receiving_log_butchery", "Receiving"],
      ["pos10_traceability_log", "Traceability"],
      ["pos10_pest_control", "Pest Control"],
      ["pos10_calibration_log", "Calibration"],
      ["pos10_sanitizer_concentration", "Sanitizer"],
      ["pos10_equipment_inspection", "Equipment"],
    ],
  },
  {
    key: "POS 11",
    name: "POS 11",
    group: "Al Ain Butchery",
    color: "#16a34a",
    types: [
      ["pos11_daily_cleanliness", "Daily Cleaning"],
      ["pos11_personal_hygiene", "Personal Hygiene"],
      ["pos11_temperature", "Temperature"],
      ["pos11_receiving_log_butchery", "Receiving"],
      ["pos11_traceability_log", "Traceability"],
      ["pos11_pest_control", "Pest Control"],
      ["pos11_calibration_log", "Calibration"],
    ],
  },
  {
    key: "POS 15",
    name: "POS 15",
    group: "Al Barsha Butchery",
    color: "#7c3aed",
    types: [
      ["pos15_daily_cleanliness", "Daily Cleaning"],
      ["pos15_personal_hygiene", "Personal Hygiene"],
      ["pos15_temperature", "Temperature"],
      ["pos15_receiving_log_butchery", "Receiving"],
      ["pos15_traceability_log", "Traceability"],
      ["pos15_equipment_inspection", "Equipment"],
      ["pos15_pest_control", "Pest Control"],
      ["pos15_sanitizer_concentration", "Sanitizer"],
    ],
  },
  {
    key: "Al Warqa Kitchen",
    aliases: ["POS 19"],
    name: "Al Warqa Kitchen",
    group: "Kitchen",
    color: "#ea580c",
    types: [
      ["pos19_cleaning_programme_schedule", "Cleaning Programme"],
      ["pos19_daily_cleaning", "Daily Cleaning"],
      ["pos19_equipment_inspection", "Equipment"],
      ["pos19_food_temperature_verification", "Food Temp"],
      ["pos19_glass_items_condition", "Glass Items"],
      ["pos19_hot_holding_temperature", "Hot Holding"],
      ["pos19_oil_quality_monitoring", "Oil Quality"],
      ["pos19_personal_hygiene", "Personal Hygiene"],
      ["pos19_receiving_log_butchery", "Receiving"],
      ["pos19_sanitizer_concentration", "Sanitizer"],
      ["pos19_temperature_monitoring", "Temperature"],
      ["pos19_traceability_log", "Traceability"],
      ["pos19_wooden_items_condition", "Wooden Items"],
    ],
  },
  {
    key: "FTR 1",
    name: "FTR 1",
    group: "Food Truck",
    color: "#dc2626",
    types: [
      ["ftr1_temperature", "Temperature"],
      ["ftr1_daily_cleanliness", "Daily Cleanliness"],
      ["ftr1_oil_calibration", "Oil Calibration"],
      ["ftr1_personal_hygiene", "Personal Hygiene"],
      ["ftr1_receiving_log_butchery", "Receiving"],
      ["ftr1_cooking_temperature_log", "Cooking Temp"],
      ["ftr1_preloading_inspection", "Preloading"],
    ],
  },
  {
    key: "FTR 2",
    name: "FTR 2",
    group: "Food Truck",
    color: "#be185d",
    types: [
      ["ftr2_temperature", "Temperature"],
      ["ftr2_daily_cleanliness", "Daily Cleanliness"],
      ["ftr2_oil_calibration", "Oil Calibration"],
      ["ftr2_personal_hygiene", "Personal Hygiene"],
      ["ftr2_receiving_log_butchery", "Receiving"],
      ["ftr2_cooking_temperature_log", "Cooking Temp"],
      ["ftr2_preloading_inspection", "Preloading"],
    ],
  },
  {
    key: "PRODUCTION",
    name: "Production",
    group: "Processing",
    color: "#0f766e",
    types: [
      ["prod_cleaning_checklist", "Cleaning Checklist"],
      ["prod_personal_hygiene", "Personal Hygiene"],
      ["prod_defrosting_record", "Defrosting"],
      ["prd_traceability_log", "Traceability"],
      ["prd_sanitizer_concentration", "Sanitizer"],
      ["prd_veg_sanitation", "Veg Sanitation"],
      ["prd_online_cutting_record", "Online Cutting"],
      ["prd_dried_meat_process", "Dried Meat"],
    ],
  },
];

const TYPE_TO_BRANCH = BRANCHES.reduce((acc, branch) => {
  branch.types.forEach(([type, label]) => {
    acc[type] = { branchKey: branch.key, label, issueType: branch.issueTypes?.includes(type) };
  });
  return acc;
}, {});

const ALL_TYPES = Object.keys(TYPE_TO_BRANCH);

function parseDate(value) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const s = String(value);
  if (/^[a-f0-9]{24}$/i.test(s)) return new Date(parseInt(s.slice(0, 8), 16) * 1000);
  return null;
}

function pickDate(record) {
  const p = record?.payload || record || {};
  const candidates = [
    p.reportDate,
    p.date,
    p.inspectionDate,
    p.checkDate,
    p.createdAt,
    p.updatedAt,
    p._clientSavedAt,
    record?.created_at,
    record?.createdAt,
    record?.updated_at,
    record?.updatedAt,
    record?._id,
    record?.id,
  ];
  for (const candidate of candidates) {
    const parsed = parseDate(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function normalizeItems(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.reports)) return json.reports;
  return [];
}

async function fetchType(type, since, signal) {
  // نطلب آخر شهر فقط من السيرفر (from=). الخوادم الأقدم تتجاهلها وترجّع الكل،
  // والحساب يفلتر بالتاريخ محلياً على أي حال — فالنتيجة صحيحة قبل النشر وبعده.
  const range = since ? `&from=${encodeURIComponent(since)}` : "";
  const url = `${API_BASE}/api/reports?type=${encodeURIComponent(type)}&limit=${MAX_RECORDS_PER_TYPE}${range}`;
  const res = await fetch(url, { cache: "no-store", signal });
  if (!res.ok) return [];
  const json = await res.json().catch(() => []);
  return normalizeItems(json);
}

// نشغّل الطلبات على دفعات صغيرة بدل إطلاق 60+ طلب سوا (يمنع 429).
async function runThrottled(items, worker, concurrency, signal) {
  const results = new Array(items.length);
  let cursor = 0;
  async function pump() {
    while (cursor < items.length) {
      if (signal?.aborted) return;
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  const lanes = Array.from({ length: Math.min(concurrency, items.length) }, pump);
  await Promise.all(lanes);
  return results;
}

// آخر LOOKBACK_DAYS يوماً بصيغة YYYY-MM-DD لتمريرها كـ from= للسيرفر.
function lookbackSince() {
  const d = new Date();
  d.setDate(d.getDate() - LOOKBACK_DAYS);
  return d.toISOString().slice(0, 10);
}

function flattenValues(value, out = []) {
  if (value === null || value === undefined) return out;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    out.push(String(value));
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => flattenValues(item, out));
    return out;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => flattenValues(item, out));
  }
  return out;
}

function detectIssue(record, meta) {
  if (meta?.issueType) return true;
  const p = record?.payload || record || {};
  const values = flattenValues(p).join(" ").toLowerCase();
  const badWords = [
    "not ok",
    "not acceptable",
    "unacceptable",
    "deviation",
    "non-conformance",
    "non conformance",
    "failed",
    "fail",
    "rejected",
    "out of range",
    "unsafe",
  ];
  if (badWords.some((word) => values.includes(word))) return true;

  const answers = p.answers || p.checks || p.results || null;
  if (answers && typeof answers === "object") {
    const answerValues = flattenValues(answers).map((v) => v.trim().toLowerCase());
    if (answerValues.includes("no") || answerValues.includes("false")) return true;
  }
  return false;
}

function daysBetween(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

function scoreStatus(score, hasData) {
  if (!hasData) return { label: "No data", className: "unknown" };
  if (score >= 90) return { label: "Excellent", className: "excellent" };
  if (score >= 78) return { label: "Healthy", className: "healthy" };
  if (score >= 62) return { label: "Watch", className: "watch" };
  return { label: "Critical", className: "critical" };
}

function calculateBranch(branch, recordsByType, now) {
  const since30 = new Date(now);
  since30.setDate(since30.getDate() - LOOKBACK_DAYS);
  const since7 = new Date(now);
  since7.setDate(since7.getDate() - COVERAGE_DAYS);

  let latestDate = null;
  let recentCount = 0;
  let issueCount = 0;
  const typeHealth = branch.types.map(([type, label]) => {
    const records = (recordsByType[type] || [])
      .map((record) => ({ record, date: pickDate(record) }))
      .filter((item) => item.date);
    const recent = records.filter((item) => item.date >= since30);
    const covered = records.some((item) => item.date >= since7);
    recentCount += recent.length;
    recent.forEach(({ record }) => {
      if (detectIssue(record, TYPE_TO_BRANCH[type])) issueCount += 1;
    });
    records.forEach(({ date }) => {
      if (!latestDate || date > latestDate) latestDate = date;
    });
    return { type, label, covered, count30: recent.length };
  });

  const coveredTypes = typeHealth.filter((item) => item.covered).length;
  const coverage = branch.types.length > 0 ? Math.round((coveredTypes / branch.types.length) * 100) : 0;
  const hasData = recentCount > 0 || Boolean(latestDate);
  const staleDays = latestDate ? Math.max(0, daysBetween(now, latestDate)) : null;
  const stalePenalty = latestDate ? Math.min(32, Math.max(0, staleDays - 1) * 4) : 35;
  const coveragePenalty = Math.round((100 - coverage) * 0.35);
  const issuePenalty = Math.min(30, issueCount * 4);
  const volumePenalty = recentCount === 0 ? 18 : recentCount < Math.max(3, Math.ceil(branch.types.length / 2)) ? 8 : 0;
  const score = hasData
    ? Math.max(0, Math.min(100, 100 - stalePenalty - coveragePenalty - issuePenalty - volumePenalty))
    : 0;
  const status = scoreStatus(score, hasData);
  const missingTypes = typeHealth.filter((item) => !item.covered).map((item) => item.label);

  return {
    ...branch,
    score,
    status,
    coverage,
    recentCount,
    issueCount,
    staleDays,
    latestDate,
    missingTypes,
    trackedTypes: branch.types.length,
    coveredTypes,
  };
}

function formatLastActivity(date) {
  if (!date) return "No activity";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeVisibleBranch(branch) {
  return branch === "POS 19" ? "Al Warqa Kitchen" : branch;
}

export default function BranchHealthScore({ visibleBranches = [] }) {
  const [recordsByType, setRecordsByType] = useState({});
  const [loading, setLoading] = useState(false);
  const [computed, setComputed] = useState(false);
  const [error, setError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState(null);

  const visibleSet = useMemo(
    () => new Set((visibleBranches || []).map(normalizeVisibleBranch)),
    [visibleBranches]
  );

  const trackedBranches = useMemo(() => {
    if (!visibleSet.size) return BRANCHES;
    return BRANCHES.filter((branch) => {
      if (visibleSet.has(branch.key)) return true;
      return (branch.aliases || []).some((alias) => visibleSet.has(alias));
    });
  }, [visibleSet]);

  // مرجع للإلغاء عند تفكيك المكوّن أو بدء تحميل جديد.
  const abortRef = React.useRef(null);

  async function load() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setError("");
    try {
      const since = lookbackSince();
      // دفعات صغيرة (FETCH_CONCURRENCY) لآخر شهر فقط — لا رشقة 60+ طلب سوا.
      const pairs = await runThrottled(
        ALL_TYPES,
        (type) => fetchType(type, since, signal).then((items) => [type, items]),
        FETCH_CONCURRENCY,
        signal
      );
      if (signal.aborted) return;
      const next = {};
      pairs.forEach((pair) => {
        if (!pair) return;
        const [type, items] = pair;
        next[type] = items;
      });
      setRecordsByType(next);
      setComputed(true);
      setRefreshedAt(new Date());
    } catch (e) {
      if (e?.name !== "AbortError") setError(e?.message || "Unable to load branch score data.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }

  // لا نسحب شيئاً عند فتح الصفحة — فقط ننظّف أي طلب معلّق عند التفكيك.
  useEffect(() => () => abortRef.current?.abort(), []);

  const rows = useMemo(() => {
    const now = new Date();
    return trackedBranches
      .map((branch) => calculateBranch(branch, recordsByType, now))
      .sort((a, b) => b.score - a.score || b.recentCount - a.recentCount || a.name.localeCompare(b.name));
  }, [recordsByType, trackedBranches]);

  const summary = useMemo(() => {
    const tracked = rows.filter((row) => row.recentCount > 0 || row.latestDate);
    const avg = tracked.length
      ? Math.round(tracked.reduce((sum, row) => sum + row.score, 0) / tracked.length)
      : 0;
    const critical = rows.filter((row) => row.status.className === "critical").length;
    const issues = rows.reduce((sum, row) => sum + row.issueCount, 0);
    return { avg, critical, issues, tracked: rows.length };
  }, [rows]);

  return (
    <section className="bhs-panel" aria-label="Branch Health Score">
      <div className="bhs-head">
        <div>
          <span className="bhs-kicker">Operational risk monitor</span>
          <h3>Branch Health Score</h3>
          <p>
            Calculated from live report activity, 7-day form coverage, detected issues,
            and latest branch activity.
          </p>
        </div>
        <div className="bhs-actions">
          {refreshedAt && (
            <span className="bhs-refreshed">
              Updated {refreshedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button type="button" onClick={() => load()} disabled={loading}>
            {loading ? "Loading…" : computed ? "Refresh score" : `Compute score (last ${LOOKBACK_DAYS}d)`}
          </button>
        </div>
      </div>

      <div className="bhs-summary">
        <article>
          <span>Average score</span>
          <strong>{computed ? `${summary.avg}%` : "—"}</strong>
        </article>
        <article>
          <span>Tracked branches</span>
          <strong>{computed ? summary.tracked : "—"}</strong>
        </article>
        <article>
          <span>Critical branches</span>
          <strong>{computed ? summary.critical : "—"}</strong>
        </article>
        <article>
          <span>Detected issues</span>
          <strong>{computed ? summary.issues : "—"}</strong>
        </article>
      </div>

      {error && <div className="bhs-error">{error}</div>}

      {!computed && !loading ? (
        <div className="bhs-idle">
          Scores aren’t loaded yet — to save bandwidth nothing is pulled from the server automatically.
          Press <b>Compute score (last {LOOKBACK_DAYS}d)</b> to load and rank the branches.
        </div>
      ) : (
      <div className="bhs-grid" aria-busy={loading}>
        {loading && rows.length === 0
          ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="bhs-card bhs-skeleton" />)
          : rows.map((row) => (
              <article key={row.key} className="bhs-card" style={{ "--bhs-accent": row.color }}>
                <div className="bhs-card-top">
                  <div>
                    <h4>{row.name}</h4>
                    <span>{row.group}</span>
                  </div>
                  <span className={`bhs-status ${row.status.className}`}>{row.status.label}</span>
                </div>

                <div className="bhs-score-row">
                  <div className="bhs-score-ring" style={{ "--bhs-score": `${row.score * 3.6}deg` }}>
                    <strong>{row.score}</strong>
                    <span>/100</span>
                  </div>
                  <div className="bhs-score-facts">
                    <div><b>{row.recentCount}</b><span>reports in {LOOKBACK_DAYS}d</span></div>
                    <div><b>{row.coverage}%</b><span>{COVERAGE_DAYS}d coverage</span></div>
                    <div><b>{row.issueCount}</b><span>issue signals</span></div>
                  </div>
                </div>

                <div className="bhs-progress">
                  <span style={{ width: `${row.coverage}%` }} />
                </div>

                <div className="bhs-meta">
                  <span>Last activity</span>
                  <strong>{formatLastActivity(row.latestDate)}</strong>
                </div>

                {row.missingTypes.length > 0 ? (
                  <div className="bhs-missing" title={row.missingTypes.join(", ")}>
                    Missing recent forms: {row.missingTypes.slice(0, 3).join(", ")}
                    {row.missingTypes.length > 3 ? ` +${row.missingTypes.length - 3}` : ""}
                  </div>
                ) : (
                  <div className="bhs-clear">All tracked forms have recent activity.</div>
                )}
              </article>
            ))}
      </div>
      )}
    </section>
  );
}
