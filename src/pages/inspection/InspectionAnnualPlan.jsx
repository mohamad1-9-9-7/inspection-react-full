// src/pages/inspection/InspectionAnnualPlan.jsx
// Annual Inspection Schedule — Branches × Months.
// Rule: every branch must be inspected AT LEAST ONCE PER MONTH.
// Actual data comes from saved internal audit reports (type "internal_multi_audit").
// The per-cell target (how many inspections are required that month) is saved
// online as type "inspection_annual_plan".
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import EmailSendModal from "../shared/EmailSendModal";
import { inspectionScheduleEmailConfig } from "./inspectionScheduleEmailConfig";
import {
  INSPECTION_BRANCHES,
  MONTHS,
  getInspectionBranchLabel,
  inspectionBranchIcon,
  isKnownInspectionBranch,
  parseReportDate,
  resolveReportBranch,
} from "./inspectionBranches";

const REPORTS_URL = `${API_BASE}/api/reports`;
const PLAN_TYPE = "inspection_annual_plan";
const AUDIT_TYPE = "internal_multi_audit";
const DEFAULT_TARGET = 1; // at least one inspection per branch per month

/* ===================== Fetch helpers ===================== */
async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return text || null; }
}
function unwrapList(data) {
  return Array.isArray(data) ? data
    : Array.isArray(data?.items) ? data.items
    : Array.isArray(data?.data) ? data.data
    : Array.isArray(data?.reports) ? data.reports
    : [];
}
async function listByType(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}`, {
    method: "GET", headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const d = await safeJson(res);
    throw new Error(d?.message || d?.error || `Failed (${res.status})`);
  }
  return unwrapList(await safeJson(res));
}
function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id;
}
function planTimestamp(r) {
  const t = r?.payload?.updatedAt || r?.updated_at || r?.updatedAt || r?.created_at || r?.createdAt || r?.timestamp;
  const ms = t ? new Date(t).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

/* ===================== Audit report normalizer ===================== */
function auditDate(r) {
  const header = r?.payload?.header || {};
  return parseReportDate(
    header.date || r?.reportDate || r?.payload?.createdAt || r?.created_at || r?.createdAt || r?.timestamp
  );
}
function ymd(d) {
  if (!d) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function normalizeAudit(r) {
  const p = r?.payload || {};
  const header = p.header || {};
  const rows = Array.isArray(p.table) ? p.table : [];
  const closed = rows.filter((x) => String(x?.status || "").toLowerCase() === "closed").length;
  const high = rows.filter((x) => String(x?.risk || "").toLowerCase() === "high").length;
  const d = auditDate(r);
  const resolved = resolveReportBranch(r);
  return {
    id: getId(r),
    date: d,
    dateStr: ymd(d),
    branch: resolved.code,
    branchRaw: resolved.raw,
    branchKnown: resolved.known,
    reportNo: header.reportNo || "",
    auditBy: header.auditConductedBy || "",
    findings: rows.length,
    closed,
    high,
    closurePct: rows.length ? Math.round((closed / rows.length) * 100) : 0,
  };
}

/* ===================== Design tokens ===================== */
const C = {
  card: "#ffffff",
  navy: "#0f172a",
  ink: "#0f172a",
  sub: "#475569",
  line: "#e2e8f0",
  line2: "#cbd5e1",
  band: "#f8fafc",
  band2: "#f1f5f9",
  blue: "#2563eb",
  blueBg: "#dbeafe",
  green: "#059669",
  red: "#dc2626",
  purple: "#7c3aed",
};
const btn = (bg, color = "#fff", disabled = false) => ({
  background: disabled ? "#e5e7eb" : bg,
  color: disabled ? "#94a3b8" : color,
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
  letterSpacing: 0.2,
  fontFamily: "inherit",
  boxShadow: disabled ? "none" : "0 4px 12px rgba(15,23,42,0.10)",
});
const inputSt = {
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 13,
  color: C.ink,
  background: "#fff",
  outline: "none",
  fontFamily: "inherit",
  fontWeight: 700,
};
/* KPI columns appended after December — turns the register into a
   performance sheet, not just an attendance sheet. */
const KPI_COLS = [
  { key: "visits",   en: "Visits",   ar: "الزيارات",  hintEn: "this year",  hintAr: "هذه السنة", w: 92 },
  { key: "findings", en: "Findings", ar: "الملاحظات", hintEn: "closed",     hintAr: "المغلقة",   w: 104 },
  { key: "closure",  en: "Closure",  ar: "الإغلاق",   hintEn: "last visit", hintAr: "آخر زيارة", w: 104 },
];

/* Column widths as percentages — they add up to 100 so the table stretches to
   fill the panel on any screen instead of leaving dead space on one side.
   The `w` values above are only used for the min-width scroll threshold. */
const COL_PCT = { month: 5.5, kpi: 6.1, branch: 100 - 12 * 5.5 - 3 * 6.1 };

const thBase = { color: "#fff", fontWeight: 1000, fontSize: 12, padding: "10px 6px", textAlign: "center", letterSpacing: 0.3 };
const tdBase = { padding: 6, borderBottom: `1px solid ${C.line}`, verticalAlign: "middle" };

/* ===================== Component ===================== */
export default function InspectionAnnualPlan() {
  const navigate = useNavigate();

  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("internal_audit_lang") || "en"; } catch { return "en"; }
  });
  const isAr = lang === "ar";
  const tt = (en, ar) => (isAr ? ar : en);
  const toggleLang = () => {
    const next = isAr ? "en" : "ar";
    setLang(next);
    try { localStorage.setItem("internal_audit_lang", next); } catch {}
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [targets, setTargets] = useState({});   // { branchCode: { month: n } }
  const [planId, setPlanId] = useState(null);
  const [allAudits, setAllAudits] = useState([]); // every year — for diagnostics
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [editor, setEditor] = useState(null);   // { branch, month }
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  /* ---------- Load ---------- */
  async function loadAll(y) {
    setLoading(true); setErr(""); setInfo("");
    try {
      const [plans, auditRows] = await Promise.all([
        listByType(PLAN_TYPE).catch(() => []),
        listByType(AUDIT_TYPE).catch(() => []),
      ]);

      const normalized = auditRows.map(normalizeAudit);
      setAllAudits(normalized);
      const thisYear = normalized.filter((a) => a.date && a.date.getFullYear() === Number(y));

      const mine = plans
        .filter((r) => Number(r?.payload?.year) === Number(y))
        .sort((a, b) => planTimestamp(b) - planTimestamp(a));

      if (mine.length > 0 && mine[0]?.payload?.targets) {
        setTargets(sanitizeTargets(mine[0].payload.targets));
        setPlanId(getId(mine[0]));
        setInfo(tt(
          `Loaded schedule for ${y} · ${thisYear.length} inspection(s) found`,
          `تم تحميل جدول ${y} · ${thisYear.length} تفتيش`
        ));
      } else {
        setTargets({});
        setPlanId(null);
        setInfo(tt(
          `No saved schedule for ${y} — using the default rule (1 inspection / branch / month) · ${thisYear.length} inspection(s) found`,
          `لا يوجد جدول محفوظ لسنة ${y} — يتم تطبيق القاعدة الافتراضية (تفتيش واحد لكل فرع شهرياً) · ${thisYear.length} تفتيش`
        ));
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  function sanitizeTargets(raw) {
    const out = {};
    for (const [branch, months] of Object.entries(raw || {})) {
      if (!months || typeof months !== "object") continue;
      out[branch] = {};
      for (const mo of MONTHS) {
        const v = months[mo.i] ?? months[String(mo.i)];
        if (v == null) continue;
        const n = Number(v);
        if (Number.isFinite(n) && n >= 0) out[branch][mo.i] = n;
      }
    }
    return out;
  }

  useEffect(() => {
    loadAll(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  /* ---------- Reports for the selected year ---------- */
  const audits = useMemo(
    () => allAudits.filter((a) => a.date && a.date.getFullYear() === Number(year)),
    [allAudits, year]
  );

  /* ---------- Data-quality diagnostics ----------
   * Reports that silently drop out of the matrix are the #1 source of
   * "I have 2 reports but the table shows 1", so make them visible. */
  const diagnostics = useMemo(() => {
    const otherYears = new Map(); // year → count
    let noDate = 0;
    const unknownBranch = new Map(); // raw text → count
    for (const a of allAudits) {
      if (!a.date) { noDate += 1; continue; }
      const y = a.date.getFullYear();
      if (y !== Number(year)) {
        otherYears.set(y, (otherYears.get(y) || 0) + 1);
        continue;
      }
      if (!a.branchKnown) {
        const key = a.branchRaw || "(empty)";
        unknownBranch.set(key, (unknownBranch.get(key) || 0) + 1);
      }
    }
    return {
      total: allAudits.length,
      inYear: audits.length,
      noDate,
      otherYears: Array.from(otherYears.entries()).sort((a, b) => b[0] - a[0]),
      unknownBranch: Array.from(unknownBranch.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [allAudits, audits, year]);

  /* ---------- Branch rows ----------
   * Default: ONLY branches that actually have inspection reports this year
   * (plus any branch the user explicitly gave a target to). "Show all
   * branches" falls back to the full master list. */
  const branches = useMemo(() => {
    const order = new Map(INSPECTION_BRANCHES.map((b, i) => [b.code, i]));
    const map = new Map();
    const add = (code) => {
      if (!code || map.has(code)) return;
      map.set(code, {
        code,
        icon: inspectionBranchIcon(code),
        known: isKnownInspectionBranch(code),
      });
    };

    if (showAllBranches) {
      for (const b of INSPECTION_BRANCHES) add(b.code);
    }
    for (const a of audits) add(a.branch);
    for (const code of Object.keys(targets || {})) add(code);

    return Array.from(map.values()).sort((a, b) => {
      const ia = order.has(a.code) ? order.get(a.code) : 999;
      const ib = order.has(b.code) ? order.get(b.code) : 999;
      if (ia !== ib) return ia - ib;
      return a.code.localeCompare(b.code);
    });
  }, [audits, targets, showAllBranches]);

  /* ---------- Actual index: branch → month → inspections ---------- */
  const actualIndex = useMemo(() => {
    const idx = {};
    for (const a of audits) {
      if (!a.branch || !a.date) continue;
      const m = a.date.getMonth() + 1;
      if (!idx[a.branch]) idx[a.branch] = {};
      if (!idx[a.branch][m]) idx[a.branch][m] = [];
      idx[a.branch][m].push(a);
    }
    for (const b of Object.keys(idx)) {
      for (const m of Object.keys(idx[b])) {
        idx[b][m].sort((x, y) => (x.date?.getTime() || 0) - (y.date?.getTime() || 0));
      }
    }
    return idx;
  }, [audits]);

  const targetOf = (branch, month) => {
    const v = targets?.[branch]?.[month];
    return v == null ? DEFAULT_TARGET : Number(v);
  };
  const doneOf = (branch, month) => (actualIndex?.[branch]?.[month] || []).length;
  const isPastOrCurrent = (month) =>
    Number(year) < currentYear || (Number(year) === currentYear && month <= currentMonth);

  function cellStatus(branch, month) {
    const target = targetOf(branch, month);
    const list = actualIndex?.[branch]?.[month] || [];
    const done = list.length;
    let state = "future";
    if (target === 0) state = "na";
    else if (done >= target) state = "ok";
    else if (done > 0) state = "partial";
    else if (isPastOrCurrent(month)) state = "missing";
    return { target, done, list, state };
  }

  function setTarget(branch, month, value) {
    setTargets((prev) => {
      const next = { ...prev, [branch]: { ...(prev?.[branch] || {}) } };
      next[branch][month] = Math.max(0, Number(value) || 0);
      return next;
    });
  }
  function setBranchTargetAll(branch, value) {
    setTargets((prev) => {
      const next = { ...prev, [branch]: { ...(prev?.[branch] || {}) } };
      for (const mo of MONTHS) next[branch][mo.i] = Math.max(0, Number(value) || 0);
      return next;
    });
  }
  function resetToRule() {
    if (!window.confirm(tt(
      "Reset every cell back to the standard rule (1 inspection per branch per month)?",
      "إعادة كل الخلايا إلى القاعدة القياسية (تفتيش واحد لكل فرع شهرياً)؟"
    ))) return;
    setTargets({});
  }

  /* ---------- Per-branch KPIs + consecutive-gap detection ----------
   * `currentStreak` is the run of missed months ending at the most recent
   * evaluated month — that's the urgent one. Months that are not required
   * (target 0) neither extend nor break a streak. */
  const branchSummary = useMemo(() => {
    const out = {};
    for (const b of branches) {
      let visits = 0, findings = 0, closed = 0, high = 0;
      let lastVisit = "";
      const missingMonths = [];
      let run = 0, maxStreak = 0;

      for (const mo of MONTHS) {
        const st = cellStatus(b.code, mo.i);
        visits += st.done;
        for (const a of st.list) {
          findings += a.findings;
          closed += a.closed;
          high += a.high;
          if (a.dateStr > lastVisit) lastVisit = a.dateStr;
        }
        if (st.target > 0 && isPastOrCurrent(mo.i)) {
          if (st.done === 0) {
            run += 1;
            missingMonths.push(mo.i);
            if (run > maxStreak) maxStreak = run;
          } else {
            run = 0;
          }
        }
      }

      out[b.code] = {
        code: b.code,
        label: getInspectionBranchLabel(b.code, "en"),
        visits, findings, closed, high, lastVisit,
        closurePct: findings ? Math.round((closed / findings) * 100) : 0,
        missingMonths,
        maxStreak,
        currentStreak: run,
        overdue: maxStreak >= 2,
      };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, actualIndex, targets, year]);

  const overdueBranches = useMemo(
    () => branches.map((b) => branchSummary[b.code]).filter((s) => s && s.overdue),
    [branches, branchSummary]
  );

  /* ---------- Stats ---------- */
  const stats = useMemo(() => {
    let required = 0, done = 0, missing = 0, extra = 0, branchesAtRisk = 0;
    for (const b of branches) {
      let branchMissing = 0;
      for (const mo of MONTHS) {
        const st = cellStatus(b.code, mo.i);
        if (st.target > 0 && isPastOrCurrent(mo.i)) {
          required += st.target;
          missing += Math.max(0, st.target - st.done);
          if (st.done < st.target) branchMissing += 1;
        }
        done += st.done;
        if (st.target > 0 && st.done > st.target) extra += st.done - st.target;
        if (st.target === 0 && st.done > 0) extra += st.done;
      }
      if (branchMissing > 0) branchesAtRisk += 1;
    }
    const covered = Math.max(0, required - missing);
    const compliance = required ? Math.round((covered / required) * 100) : 0;
    return { required, done, missing, extra, compliance, branchesAtRisk, totalBranches: branches.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, actualIndex, targets, year]);

  /* Payload handed to the shared EmailSendModal */
  const emailPayload = useMemo(() => ({
    year: Number(year),
    generatedAt: ymd(new Date()),
    stats: {
      required: stats.required,
      done: stats.done,
      missing: stats.missing,
      compliance: stats.compliance,
      totalBranches: stats.totalBranches,
    },
    overdue: overdueBranches
      .slice()
      .sort((a, b) => (b.currentStreak || b.maxStreak) - (a.currentStreak || a.maxStreak)),
    all: branches.map((b) => branchSummary[b.code]).filter(Boolean),
  }), [year, stats, overdueBranches, branches, branchSummary]);

  const visibleBranches = useMemo(() => {
    if (!onlyGaps) return branches;
    return branches.filter((b) =>
      MONTHS.some((mo) => cellStatus(b.code, mo.i).state === "missing")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, onlyGaps, actualIndex, targets, year]);

  /* ---------- Save ---------- */
  async function handleSave() {
    setSaving(true); setErr(""); setInfo("");
    try {
      const payload = {
        year: Number(year),
        rule: "min_1_inspection_per_branch_per_month",
        defaultTarget: DEFAULT_TARGET,
        targets,
        updatedAt: new Date().toISOString(),
      };
      const body = {
        type: PLAN_TYPE,
        title: `Annual Inspection Schedule ${year}`,
        branch: "ALL",
        reportDate: `${year}-01-01`,
        payload,
      };

      let res;
      if (planId) {
        // ✅ update by id — never the generic PUT /api/reports (it upserts by date)
        res = await fetch(`${REPORTS_URL}/${encodeURIComponent(planId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          res = await fetch(`${REPORTS_URL}/${encodeURIComponent(planId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }
      } else {
        res = await fetch(REPORTS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const d = await safeJson(res);
        throw new Error(d?.message || d?.error || `Failed (${res.status})`);
      }
      const saved = await safeJson(res);
      let newId = getId(saved) || planId;
      if (!newId) {
        // Server didn't echo an id — look it up so the next save updates
        // this record instead of creating a duplicate for the same year.
        const plans = await listByType(PLAN_TYPE).catch(() => []);
        const mine = plans
          .filter((r) => Number(r?.payload?.year) === Number(year))
          .sort((a, b) => planTimestamp(b) - planTimestamp(a));
        newId = mine.length ? getId(mine[0]) : null;
      }
      if (newId) setPlanId(newId);
      setInfo(tt("Schedule saved online ✓", "تم حفظ الجدول على السيرفر ✓"));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Excel export (mirrors the on-screen matrix) ---------- */
  async function loadExcelJS() {
    try { const m = await import("exceljs/dist/exceljs.min.js"); const E = m?.default ?? m; if (E?.Workbook) return E; } catch (_) {}
    try { const m2 = await import("exceljs/dist/exceljs.min"); const E2 = m2?.default ?? m2; if (E2?.Workbook) return E2; } catch (_) {}
    const m3 = await import("exceljs"); const E3 = m3?.default ?? m3; if (E3?.Workbook) return E3;
    throw new Error("Failed to load ExcelJS");
  }
  async function resolveSaveAs() {
    const mod = await import("file-saver");
    return mod?.saveAs || mod?.default?.saveAs || mod?.default || mod;
  }

  async function exportXLSX() {
    setErr("");
    try {
      const ExcelJS = await loadExcelJS();
      const saveAs = await resolveSaveAs();
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`Schedule ${year}`, {
        views: [{ state: "frozen", xSplit: 1, ySplit: 5 }],
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      });

      const thin = { style: "thin", color: { argb: "FF94A3B8" } };
      const allBorders = { top: thin, left: thin, bottom: thin, right: thin };
      const FILL = {
        ok:      { bg: "FFC6EFCE", fg: "FF006100" },
        partial: { bg: "FFFFEB9C", fg: "FF9C5700" },
        missing: { bg: "FFFFC7CE", fg: "FF9C0006" },
        future:  { bg: "FFFFFFFF", fg: "FF94A3B8" },
        na:      { bg: "FFF2F2F2", fg: "FF64748B" },
      };
      const LAST_COL = 21; // Branch + 12 months + Visits + Gaps + Compliance + Findings + Closed + Closure% + High + Last + Streak

      // Title
      ws.mergeCells(1, 1, 1, LAST_COL);
      const t = ws.getCell(1, 1);
      t.value = `AL MAWASHI — ANNUAL INSPECTION SCHEDULE  ·  ${year}`;
      t.font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      t.alignment = { horizontal: "center", vertical: "middle" };
      t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      ws.getRow(1).height = 26;

      // Rule + stats
      ws.mergeCells(2, 1, 2, LAST_COL);
      const r2 = ws.getCell(2, 1);
      r2.value = "Rule: every branch must be inspected at least once per month  |  القاعدة: كل فرع يحتاج تفتيشاً واحداً على الأقل شهرياً";
      r2.font = { size: 10, bold: true, color: { argb: "FF334155" } };
      r2.alignment = { horizontal: "center", vertical: "middle" };
      r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

      ws.mergeCells(3, 1, 3, LAST_COL);
      const r3 = ws.getCell(3, 1);
      r3.value =
        `Required: ${stats.required}   ·   Done: ${stats.done}   ·   Missing: ${stats.missing}   ·   ` +
        `Compliance: ${stats.compliance}%   ·   Branches: ${visibleBranches.length}` +
        (showAllBranches ? "" : " (with reports only)") +
        `   ·   Generated: ${ymd(new Date())}`;
      r3.font = { size: 10, bold: true, color: { argb: "FF0F172A" } };
      r3.alignment = { horizontal: "center", vertical: "middle" };

      // Header row
      ws.columns = [
        { width: 34 },
        ...MONTHS.map(() => ({ width: 9 })),
        { width: 11 }, { width: 8 }, { width: 12 },
        { width: 10 }, { width: 9 }, { width: 11 }, { width: 10 },
        { width: 13 }, { width: 10 },
      ];
      const hr = ws.getRow(5);
      hr.values = [
        "Branch", ...MONTHS.map((m) => m.short),
        "Total visits", "Gaps", "Schedule %",
        "Findings", "Closed", "Closure %", "High risk",
        "Last inspection", "Worst streak",
      ];
      hr.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
        cell.border = allBorders;
      });
      hr.height = 24;
      ws.getCell(5, 1).alignment = { horizontal: "left", vertical: "middle" };

      // Branch rows
      let rowIdx = 6;
      for (const b of visibleBranches) {
        const row = ws.getRow(rowIdx);
        let visits = 0, gaps = 0, req = 0, met = 0;
        const cells = [getInspectionBranchLabel(b.code, "en")];

        for (const mo of MONTHS) {
          const st = cellStatus(b.code, mo.i);
          visits += st.done;
          if (st.target > 0 && isPastOrCurrent(mo.i)) {
            req += 1;
            if (st.done >= st.target) met += 1; else gaps += 1;
          }
          cells.push(
            st.state === "ok" || st.state === "partial" ? `${st.done}/${st.target}`
            : st.state === "missing" ? "✗"
            : st.state === "na" ? "N/A"
            : "-"
          );
        }
        const k = branchSummary[b.code] || {};
        cells.push(
          visits,
          gaps,
          req ? Math.round((met / req) * 100) / 100 : "",
          k.findings ?? 0,
          k.closed ?? 0,
          k.findings ? Math.round((k.closed / k.findings) * 100) / 100 : "",
          k.high ?? 0,
          k.lastVisit || "—",
          k.maxStreak ? `${k.maxStreak} mo` : "—"
        );
        row.values = cells;

        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cell.border = allBorders;
          cell.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle" };
          if (col === 1) {
            cell.font = { bold: true, color: { argb: k.overdue ? "FF9C0006" : "FF0F172A" } };
            if (k.overdue) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
          } else if (col >= 2 && col <= 13) {
            const st = cellStatus(b.code, MONTHS[col - 2].i);
            const f = FILL[st.state];
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: f.bg } };
            cell.font = { bold: true, color: { argb: f.fg } };
          } else if (col === 15 && gaps > 0) {
            cell.font = { bold: true, color: { argb: "FF9C0006" } };
          } else if (col === 16) {
            cell.numFmt = "0%";
            cell.font = { bold: true };
          } else if (col === 19) {
            cell.numFmt = "0%";
            const p = k.findings ? k.closed / k.findings : null;
            if (p != null) {
              const tone = p >= 0.8 ? FILL.ok : p >= 0.5 ? FILL.partial : FILL.missing;
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tone.bg } };
              cell.font = { bold: true, color: { argb: tone.fg } };
            }
          } else if (col === 21 && k.maxStreak >= 2) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
            cell.font = { bold: true, color: { argb: "FF9C0006" } };
          }
        });
        row.height = 19;
        rowIdx += 1;
      }

      // Legend
      const legendRow = rowIdx + 1;
      ws.mergeCells(legendRow, 1, legendRow, LAST_COL);
      const lg = ws.getCell(legendRow, 1);
      lg.value = "Legend:  done/target = inspected   ·   ✗ = required but no visit   ·   - = upcoming month   ·   N/A = not required";
      lg.font = { size: 10, bold: true, color: { argb: "FF475569" } };
      lg.alignment = { horizontal: "left", vertical: "middle" };

      /* ---- Sheet 2: the underlying inspections ---- */
      const ws2 = wb.addWorksheet(`Inspections ${year}`, {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      ws2.columns = [
        { header: "Branch",       key: "b",  width: 30 },
        { header: "Date",         key: "d",  width: 13 },
        { header: "Month",        key: "m",  width: 9 },
        { header: "Report No",    key: "n",  width: 16 },
        { header: "Audited by",   key: "a",  width: 26 },
        { header: "Findings",     key: "f",  width: 10 },
        { header: "Closed",       key: "c",  width: 10 },
        { header: "High risk",    key: "h",  width: 11 },
        { header: "Closure %",    key: "p",  width: 11 },
        { header: "Branch (as written)", key: "raw", width: 34 },
      ];
      ws2.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = allBorders;
      });
      const sorted = [...audits].sort(
        (x, y) => (x.date?.getTime() || 0) - (y.date?.getTime() || 0)
      );
      for (const a of sorted) {
        const row = ws2.addRow({
          b: getInspectionBranchLabel(a.branch, "en"),
          d: a.dateStr,
          m: a.date ? MONTHS[a.date.getMonth()].short : "",
          n: a.reportNo || "",
          a: a.auditBy || "",
          f: a.findings,
          c: a.closed,
          h: a.high,
          p: a.findings ? Math.round((a.closed / a.findings) * 100) / 100 : "",
          raw: a.branchRaw || "",
        });
        row.eachCell((cell, col) => {
          cell.border = allBorders;
          cell.alignment = { horizontal: col === 1 || col === 5 || col === 10 ? "left" : "center", vertical: "middle" };
          if (col === 9) cell.numFmt = "0%";
        });
      }

      const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Annual_Inspection_Schedule_${year}.xlsx`
      );
      setInfo(tt("Excel file exported ✓", "تم تصدير ملف Excel ✓"));
    } catch (e) {
      console.error("[Annual schedule XLSX export]", e);
      setErr(tt("Excel export failed: ", "فشل تصدير Excel: ") + String(e?.message || e));
    }
  }

  /* ---------- Styles ---------- */
  const pageStyle = {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(180deg,#f4f8f7 0%,#edf5f3 100%)",
    padding: "14px clamp(12px,2.4vw,28px) 22px",
    boxSizing: "border-box",
    direction: "ltr",
    fontFamily: "Cairo, Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
  const branchColWidth = 252;
  const monthColWidth = 88;
  const rowHeight = 64;
  const tableMinWidth =
    branchColWidth + MONTHS.length * monthColWidth + KPI_COLS.reduce((s, k) => s + k.w, 0);
  const monthIsCurrent = (mi) => mi === currentMonth && Number(year) === currentYear;

  const STATE_STYLE = {
    ok:      { border: "2px solid #10b981", bg: "#ecfdf5", badgeBg: "#10b981", label: "✓" },
    partial: { border: "2px solid #f59e0b", bg: "#fffbeb", badgeBg: "#f59e0b", label: "!" },
    missing: { border: "2px solid #dc2626", bg: "#fef2f2", badgeBg: "#dc2626", label: "✗" },
    future:  { border: `1px dashed ${C.line2}`, bg: "transparent", badgeBg: "#94a3b8", label: "·" },
    na:      { border: `1px solid ${C.line}`, bg: "#f8fafc", badgeBg: "#cbd5e1", label: "–" },
  };

  return (
    <div className="inspection-annual-plan" style={pageStyle}>
      <style>{`
        @media print {
          body { background:#fff !important; }
          .no-print { display:none !important; }
          .print-area { box-shadow:none !important; border:none !important; }
          @page { size: A3 landscape; margin: 8mm; }
        }
        .iap-cell:hover { outline:2px solid rgba(56,189,248,.55); outline-offset:-3px; filter:brightness(1.02); }
        .iap-row:hover .iap-rowbtn { opacity:1 !important; }
        @keyframes iapSpin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ===== Top bar ===== */}
      <div className="no-print" style={{
        background: "linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%)",
        border: "1px solid rgba(255,255,255,.25)",
        borderRadius: 6,
        padding: "10px 14px",
        boxShadow: "0 22px 50px rgba(15,23,42,.16)",
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg,#06b6d4,#6366f1)",
            display: "grid", placeItems: "center", fontSize: 22,
            boxShadow: "0 8px 20px rgba(99,102,241,.45)",
          }}>🗓️</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 1000, letterSpacing: .3 }}>
              {tt("Annual Inspection Schedule", "جدول التفتيش السنوي")}
            </div>
            <div style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 700 }}>
              {tt(
                "Branches × Months · every branch needs at least 1 inspection per month",
                "الأفرع × الأشهر · كل فرع يحتاج تفتيشاً واحداً على الأقل شهرياً"
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Year selector */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "rgba(255,255,255,.10)", padding: 4, borderRadius: 12,
          border: "1px solid rgba(255,255,255,.15)",
        }}>
          <button onClick={() => setYear((y) => y - 1)} style={{ ...btn("rgba(255,255,255,.10)", "#fff"), padding: "6px 10px", boxShadow: "none" }}>‹</button>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ ...inputSt, fontWeight: 1000, fontSize: 14, padding: "6px 8px", minWidth: 92 }}
          >
            {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={() => setYear((y) => y + 1)} style={{ ...btn("rgba(255,255,255,.10)", "#fff"), padding: "6px 10px", boxShadow: "none" }}>›</button>
        </div>

        {/* Stats */}
        <div style={{
          display: "flex", alignItems: "stretch",
          background: "rgba(255,255,255,.08)",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12, overflow: "hidden",
        }}>
          <StatBlock label={tt("Required", "مطلوب")} value={stats.required} color="#bfdbfe" />
          <StatBlock label={tt("Done", "منفذ")} value={stats.done} color="#a7f3d0" />
          <StatBlock label={tt("Missing", "ناقص")} value={stats.missing} color="#fecaca" highlight={stats.missing > 0} />
          <StatBlock label={tt("Extra", "إضافي")} value={stats.extra} color="#fde68a" />
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            background: stats.compliance >= 90
              ? "linear-gradient(135deg,#10b981,#059669)"
              : stats.compliance >= 60
              ? "linear-gradient(135deg,#f59e0b,#d97706)"
              : "linear-gradient(135deg,#ef4444,#dc2626)",
            color: "#fff", fontWeight: 1000, fontSize: 13,
          }}>
            <span style={{ fontSize: 10, opacity: .85, letterSpacing: .5 }}>{tt("COMPLIANCE", "الالتزام")}</span>
            <span>{stats.compliance}%</span>
          </div>
        </div>

        <label className="no-print" style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
          background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12, fontSize: 11, fontWeight: 800, cursor: "pointer",
        }}>
          <input type="checkbox" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} style={{ accentColor: "#ef4444" }} />
          <span>{tt("Only branches with gaps", "الأفرع الناقصة فقط")}</span>
        </label>

        <label className="no-print" style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
          background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12, fontSize: 11, fontWeight: 800, cursor: "pointer",
        }} title={tt(
          "Off = only branches that have inspection reports this year",
          "مغلق = تظهر فقط الأفرع التي لديها تقارير هذه السنة"
        )}>
          <input type="checkbox" checked={showAllBranches} onChange={(e) => setShowAllBranches(e.target.checked)} style={{ accentColor: "#0ea5e9" }} />
          <span>{tt("Show all branches", "إظهار كل الأفرع")}</span>
        </label>

        <button onClick={toggleLang} style={btn("rgba(255,255,255,.14)", "#fff")}>🌐 {isAr ? "EN" : "ع"}</button>
        <button onClick={resetToRule} style={btn("#f59e0b")} title={tt("Back to 1 / month everywhere", "العودة إلى تفتيش شهري لكل فرع")}>♻ {tt("Reset rule", "إعادة القاعدة")}</button>
        <button onClick={() => loadAll(year)} style={btn("rgba(255,255,255,.14)", "#fff")}>🔄 {tt("Refresh", "تحديث")}</button>
        <button onClick={exportXLSX} style={btn("linear-gradient(135deg,#16a34a,#15803d)")} title={tt("Export the matrix + the underlying reports", "تصدير الجدول مع تفاصيل التقارير")}>
          📊 {tt("Excel", "إكسل")}
        </button>
        <button onClick={() => setTimeout(() => window.print(), 80)} style={btn(C.purple)}>🖨 {tt("Print", "طباعة")}</button>
        <button onClick={handleSave} disabled={saving || loading} style={btn("linear-gradient(135deg,#10b981,#059669)", "#fff", saving || loading)}>
          {saving ? tt("Saving…", "جارٍ الحفظ…") : planId ? `💾 ${tt("Update", "تحديث")}` : `💾 ${tt("Save", "حفظ")}`}
        </button>
        <button onClick={() => navigate("/inspection")} style={btn("rgba(255,255,255,.14)", "#fff")}>↩ {tt("Back", "رجوع")}</button>
      </div>

      {/* ===== Status line ===== */}
      {(info || err || loading) && (
        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {loading && <div style={pill("rgba(59,130,246,.18)")}>⏳ {tt("Loading from server…", "جارٍ التحميل من السيرفر…")}</div>}
          {info && !err && <div style={pill("rgba(16,185,129,.18)")}>✓ {info}</div>}
          {err && <div style={pill("rgba(220,38,38,.18)")}>✗ {err}</div>}
          {stats.branchesAtRisk > 0 && !loading && (
            <div style={pill("rgba(245,158,11,.22)")}>
              ⚠ {stats.branchesAtRisk} / {stats.totalBranches} {tt("branch(es) have at least one uncovered month", "فرع لديه شهر واحد على الأقل بدون تفتيش")}
            </div>
          )}
        </div>
      )}

      {/* ===== Where every saved report went ===== */}
      {!loading && diagnostics.total > 0 && (
        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={pill("rgba(148,163,184,.22)")}>
            📦 {diagnostics.total} {tt("report(s) on the server", "تقرير على السيرفر")}
            {" · "}
            <b>{diagnostics.inYear}</b> {tt(`in ${year}`, `في ${year}`)}
          </div>
          {diagnostics.otherYears.map(([y, n]) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              style={{ ...pill("rgba(59,130,246,.16)"), cursor: "pointer", fontFamily: "inherit" }}
              title={tt(`Switch to ${y}`, `الانتقال إلى ${y}`)}
            >
              🗂 {n} {tt(`report(s) in ${y}`, `تقرير في ${y}`)} →
            </button>
          ))}
          {diagnostics.noDate > 0 && (
            <div style={pill("rgba(220,38,38,.18)")}>
              ⛔ {diagnostics.noDate} {tt("report(s) with no readable date", "تقرير بدون تاريخ صالح")}
            </div>
          )}
          {diagnostics.unknownBranch.length > 0 && (
            <div
              style={pill("rgba(245,158,11,.22)")}
              title={tt(
                "These branch values didn't match any official branch — they get their own row. They come from older reports; re-save them with the Branch dropdown to fix.",
                "قيم الفرع هذه لم تطابق أي فرع رسمي — تظهر بصف مستقل. غالباً من تقارير قديمة؛ أعد حفظها باختيار الفرع من القائمة."
              )}
            >
              ⚠ {tt("Unrecognised branch text", "نص فرع غير معروف")}:{" "}
              {diagnostics.unknownBranch.slice(0, 4).map(([raw, n]) => `“${raw}”${n > 1 ? ` ×${n}` : ""}`).join(" · ")}
              {diagnostics.unknownBranch.length > 4 ? ` +${diagnostics.unknownBranch.length - 4}` : ""}
            </div>
          )}
        </div>
      )}

      {/* ===== Consecutive-gap alert ===== */}
      {!loading && overdueBranches.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg,#b91c1c,#dc2626)",
          color: "#fff", borderRadius: 14, padding: "12px 16px",
          boxShadow: "0 14px 34px rgba(220,38,38,.30)",
          display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
        }}>
          <div style={{ fontSize: 26, lineHeight: 1 }}>🚨</div>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 1000 }}>
              {tt(
                `${overdueBranches.length} branch(es) missed 2 or more consecutive months`,
                `${overdueBranches.length} فرع فاته شهران متتاليان أو أكثر`
              )}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.92)", marginTop: 3 }}>
              {overdueBranches
                .slice()
                .sort((a, b) => (b.currentStreak || b.maxStreak) - (a.currentStreak || a.maxStreak))
                .slice(0, 6)
                .map((s) =>
                  `${getInspectionBranchLabel(s.code, lang)} (${s.currentStreak || s.maxStreak}${tt("m", "ش")})`
                )
                .join("  ·  ")}
              {overdueBranches.length > 6 ? `  +${overdueBranches.length - 6}` : ""}
            </div>
          </div>
          <button
            className="no-print"
            onClick={() => setOnlyGaps(true)}
            style={{ ...btn("rgba(255,255,255,.16)", "#fff"), boxShadow: "none" }}
          >🔎 {tt("Show only these", "عرضها فقط")}</button>
          <button
            className="no-print"
            onClick={() => setEmailOpen(true)}
            style={{ ...btn("#ffffff", "#b91c1c") }}
          >📧 {tt("Send reminder e-mail", "إرسال تذكير بالإيميل")}</button>
        </div>
      )}

      {/* ===== Matrix ===== */}
      <div className="print-area" style={{
        flex: 1, minHeight: 0, position: "relative",
        background: C.card, borderRadius: 16,
        boxShadow: "0 20px 60px rgba(2,6,23,.20)",
        border: `1px solid ${C.line}`,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {loading && (
          <div className="no-print" style={{
            position: "absolute", inset: 0, background: "rgba(255,255,255,.85)",
            zIndex: 50, display: "grid", placeItems: "center", color: C.navy, fontWeight: 1000,
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.line}`, borderTopColor: C.blue, animation: "iapSpin .7s linear infinite" }} />
              <div>{tt("Loading schedule & inspections…", "جارٍ تحميل الجدول والتفتيشات…")}</div>
            </div>
          </div>
        )}

        {/* Panel header */}
        <div style={{
          padding: "10px 14px", background: "linear-gradient(135deg,#0f172a,#1e293b)",
          color: "#fff", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
        }}>
          <div style={{ fontWeight: 1000, fontSize: 15 }}>{tt("Annual Inspection Schedule", "جدول التفتيش السنوي")}</div>
          <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 800 }}>
            · {year} · {visibleBranches.length} {tt("branch(es)", "فرع")}
            {!showAllBranches && ` · ${tt("with reports only", "التي لديها تقارير فقط")}`}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={legend("#10b981", "#ecfdf5")}>✓ {tt("Done", "منفذ")}</span>
            <span style={legend("#f59e0b", "#fffbeb")}>! {tt("Below target", "أقل من المطلوب")}</span>
            <span style={legend("#dc2626", "#fef2f2")}>✗ {tt("Missing", "لم يُنفذ")}</span>
            <span style={legend("#94a3b8", "#fff", true)}>· {tt("Upcoming", "قادم")}</span>
            <span style={legend("#cbd5e1", "#f8fafc")}>– {tt("Not required", "غير مطلوب")}</span>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <table style={{ width: "100%", minWidth: tableMinWidth, borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" }}>
            {/* Percentage widths so the table always fills the panel and the
                columns keep their proportions; `minWidth` below turns on
                horizontal scrolling instead of crushing them on small screens. */}
            <colgroup>
              <col style={{ width: `${COL_PCT.branch}%` }} />
              {MONTHS.map((mo) => <col key={mo.i} style={{ width: `${COL_PCT.month}%` }} />)}
              {KPI_COLS.map((k) => <col key={k.key} style={{ width: `${COL_PCT.kpi}%` }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{
                  ...thBase, position: "sticky", left: 0, top: 0, zIndex: 4,
                  textAlign: "left", paddingLeft: 14,
                  background: "linear-gradient(180deg,#0f172a,#1e293b)",
                  borderRight: `2px solid ${C.line2}`,
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 1000 }}>{tt("Branch", "الفرع")}</span>
                    <span style={{ fontSize: 9, opacity: .65, fontWeight: 800 }}>
                      {visibleBranches.length} {tt("row(s)", "صف")}
                    </span>
                  </div>
                </th>
                {MONTHS.map((mo) => (
                  <th key={mo.i} style={{
                    ...thBase, position: "sticky", top: 0, zIndex: 3,
                    boxSizing: "border-box", padding: "8px 4px",
                    background: monthIsCurrent(mo.i)
                      ? "linear-gradient(180deg,#1d4ed8,#1e3a8a)"
                      : "linear-gradient(180deg,#0f172a,#1e293b)",
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 1000 }}>{isAr ? mo.ar : mo.short}</span>
                      <span style={{ fontSize: 9, opacity: .68, fontWeight: 800 }}>
                        {monthCoverage(mo.i)}
                      </span>
                    </div>
                  </th>
                ))}
                {KPI_COLS.map((k, i) => (
                  <th key={k.key} style={{
                    ...thBase, position: "sticky", top: 0, zIndex: 3, boxSizing: "border-box",
                    background: "linear-gradient(180deg,#134e4a,#0f766e)",
                    borderLeft: i === 0 ? `3px solid #0d9488` : undefined,
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 1000 }}>{isAr ? k.ar : k.en}</span>
                      <span style={{ fontSize: 9, opacity: .72, fontWeight: 800 }}>{isAr ? k.hintAr : k.hintEn}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleBranches.map((b, idx) => {
                const sum = branchSummary[b.code] || {};
                const isOverdue = !!sum.overdue;
                return (
                <tr
                  key={b.code}
                  className={`iap-row${isOverdue ? " iap-overdue" : ""}`}
                  style={{
                    background: isOverdue ? "#fff5f5" : idx % 2 ? C.band : "#fff",
                    height: rowHeight,
                  }}
                >
                  <td style={{
                    ...tdBase, position: "sticky", left: 0, zIndex: 2,
                    background: isOverdue ? "#fee2e2" : idx % 2 ? C.band2 : "#fff",
                    borderRight: `2px solid ${C.line2}`,
                    borderLeft: isOverdue ? "4px solid #dc2626" : undefined,
                    height: rowHeight, boxSizing: "border-box",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, position: "relative" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 9,
                        background: isOverdue
                          ? "linear-gradient(135deg,#ef4444,#b91c1c)"
                          : "linear-gradient(135deg,#0ea5e9,#6366f1)",
                        display: "grid", placeItems: "center", color: "#fff", fontSize: 14, flexShrink: 0,
                      }}>{b.icon}</div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          title={getInspectionBranchLabel(b.code, lang)}
                          style={{
                            fontWeight: 1000, color: isOverdue ? "#991b1b" : C.navy,
                            fontSize: 12, lineHeight: 1.25,
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                            overflow: "hidden", wordBreak: "break-word",
                          }}
                        >
                          {getInspectionBranchLabel(b.code, lang)}
                          {!b.known && (
                            <span
                              title={tt(
                                "This row comes from free text that doesn't match any official branch.",
                                "هذا الصف ناتج عن نص حر لا يطابق أي فرع رسمي."
                              )}
                              style={{ marginInlineStart: 4, color: "#b45309" }}
                            >⚠</span>
                          )}
                        </div>

                        {isOverdue && (
                          <span
                            style={{
                              display: "inline-block", marginTop: 3, whiteSpace: "nowrap",
                              background: "#dc2626", color: "#fff", borderRadius: 999,
                              padding: "1px 8px", fontSize: 9.5, fontWeight: 1000, lineHeight: 1.6,
                            }}
                            title={tt(
                              `Missed: ${(sum.missingMonths || []).map((i) => MONTHS[i - 1].full).join(", ")}`,
                              `الأشهر الناقصة: ${(sum.missingMonths || []).map((i) => MONTHS[i - 1].ar).join("، ")}`
                            )}
                          >
                            🚨 {sum.currentStreak >= 2 ? sum.currentStreak : sum.maxStreak}
                            {tt(" months missed", " أشهر ناقصة")}
                          </span>
                        )}
                      </div>

                      <button
                        className="iap-rowbtn no-print"
                        onClick={() => {
                          const v = window.prompt(tt(
                            "Required inspections per month for this branch (0 = not required):",
                            "عدد التفتيشات المطلوبة شهرياً لهذا الفرع (0 = غير مطلوب):"
                          ), String(targetOf(b.code, 1)));
                          if (v == null) return;
                          setBranchTargetAll(b.code, v);
                        }}
                        title={tt("Set the monthly target for all 12 months", "تعيين المطلوب الشهري لكل الأشهر")}
                        style={{
                          position: "absolute", insetInlineEnd: 0, top: "50%", transform: "translateY(-50%)",
                          width: 24, height: 24, padding: 0, borderRadius: 8,
                          border: `1px solid ${C.line2}`, background: "#fff", color: C.sub,
                          fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                          opacity: 0, transition: "opacity .15s", boxShadow: "0 2px 6px rgba(2,6,23,.10)",
                        }}
                      >⚙</button>
                    </div>
                  </td>

                  {MONTHS.map((mo) => {
                    const st = cellStatus(b.code, mo.i);
                    const s = STATE_STYLE[st.state];
                    const isEditing = editor && editor.branch === b.code && editor.month === mo.i;
                    return (
                      <td key={mo.i} style={{
                        ...tdBase,
                        height: rowHeight, padding: 3, boxSizing: "border-box",
                        background: monthIsCurrent(mo.i) ? "rgba(59,130,246,.05)" : "transparent",
                      }}>
                        <button
                          className="iap-cell"
                          onClick={() => setEditor({ branch: b.code, month: mo.i })}
                          style={{
                            position: "relative", width: "100%", height: rowHeight - 10,
                            boxSizing: "border-box",
                            border: isEditing ? `2px solid ${C.blue}` : s.border,
                            background: isEditing ? C.blueBg : s.bg,
                            borderRadius: 9, cursor: "pointer", padding: "2px 3px",
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", gap: 2, fontFamily: "inherit", overflow: "hidden",
                          }}
                          title={cellTitle(b.code, mo.i, st)}
                        >
                          <span style={{
                            minWidth: 20, height: 19, borderRadius: 999, padding: "0 6px",
                            background: s.badgeBg, color: "#fff", fontWeight: 1000, fontSize: 10.5,
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {st.state === "ok" || st.state === "partial" ? `${st.done}/${st.target}` : s.label}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 800, lineHeight: 1.2, textAlign: "center",
                            color: st.list.length ? C.sub : "#a3adba",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
                          }}>
                            {st.list.length > 0
                              ? st.list.slice(0, 2).map((a) => (a.dateStr || "").slice(8) || "•").join("·")
                                + (st.list.length > 2 ? `+${st.list.length - 2}` : "")
                              : st.target === 0 ? tt("n/a", "—")
                              : st.state === "missing" ? tt("none", "لا يوجد")
                              : tt("planned", "مخطط")}
                          </span>
                        </button>
                      </td>
                    );
                  })}

                  {/* ===== KPI columns — the register doubles as a performance sheet ===== */}
                  {(() => {
                    const k = branchSummary[b.code] || {};
                    const pct = k.closurePct || 0;
                    const pctTone = pct >= 80
                      ? { bg: "#d1fae5", fg: "#065f46" }
                      : pct >= 50
                      ? { bg: "#fef3c7", fg: "#92400e" }
                      : { bg: "#fee2e2", fg: "#991b1b" };
                    const kpiTd = (extra = {}) => ({
                      ...tdBase, height: rowHeight, padding: "4px 6px", textAlign: "center",
                      boxSizing: "border-box",
                      background: isOverdue ? "rgba(220,38,38,.05)" : "rgba(15,118,110,.045)",
                      ...extra,
                    });
                    const gaps = k.missingMonths?.length || 0;
                    return (
                      <>
                        <td style={kpiTd({ borderLeft: "3px solid #0d9488" })}>
                          <div style={{ fontSize: 16, fontWeight: 1000, color: C.navy, lineHeight: 1.1 }}>{k.visits ?? 0}</div>
                          <div style={{
                            fontSize: 9, fontWeight: 900, marginTop: 2,
                            color: gaps > 0 ? "#b91c1c" : "#059669",
                          }}>
                            {gaps > 0 ? `${gaps} ${tt("gap", "نقص")}` : tt("full", "مكتمل")}
                          </div>
                        </td>

                        <td style={kpiTd()}>
                          <div style={{ fontSize: 16, fontWeight: 1000, color: C.navy, lineHeight: 1.1 }}>{k.findings ?? 0}</div>
                          <div style={{ fontSize: 9, fontWeight: 800, color: C.sub, marginTop: 2, whiteSpace: "nowrap" }}>
                            {k.closed ?? 0} {tt("closed", "مغلق")}
                            {(k.high || 0) > 0 && <span style={{ color: "#b91c1c", fontWeight: 1000 }}> · {k.high}⚠</span>}
                          </div>
                        </td>

                        <td style={kpiTd()}>
                          {k.findings ? (
                            <span style={{
                              display: "inline-block", minWidth: 44, padding: "2px 8px", borderRadius: 999,
                              background: pctTone.bg, color: pctTone.fg, fontWeight: 1000, fontSize: 12,
                            }}>{pct}%</span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontWeight: 900, fontSize: 12 }}>—</span>
                          )}
                          <div style={{ fontSize: 9, fontWeight: 800, color: C.sub, marginTop: 3, whiteSpace: "nowrap" }}>
                            {k.lastVisit || tt("no visit", "لا يوجد")}
                          </div>
                        </td>
                      </>
                    );
                  })()}
                </tr>
                );
              })}
              {visibleBranches.length === 0 && (
                <tr>
                  <td colSpan={MONTHS.length + 1 + KPI_COLS.length} style={{ padding: 26, textAlign: "center", color: C.sub, fontWeight: 800 }}>
                    {branches.length === 0
                      ? tt(
                          `No inspection report saved for ${year} yet — tick "Show all branches" to plan ahead.`,
                          `لا يوجد أي تقرير تفتيش محفوظ لسنة ${year} — فعّل «إظهار كل الأفرع» للتخطيط مسبقاً.`
                        )
                      : onlyGaps
                      ? tt("🎉 No branch has a missing month.", "🎉 لا يوجد فرع لديه شهر ناقص.")
                      : tt("No branches to show.", "لا توجد أفرع للعرض.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Reminder e-mail ===== */}
      <EmailSendModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        payload={emailPayload}
        config={inspectionScheduleEmailConfig}
      />

      {/* ===== Cell editor / drill-down ===== */}
      {editor && (
        <CellModal
          branch={editor.branch}
          month={editor.month}
          year={year}
          lang={lang}
          status={cellStatus(editor.branch, editor.month)}
          onTarget={(v) => setTarget(editor.branch, editor.month, v)}
          onClose={() => setEditor(null)}
          onOpenReports={() => navigate("/monitor/internal-audit")}
          onNewInspection={() => navigate("/inspection/new")}
        />
      )}
    </div>
  );

  /* ---------- small local helpers (need component state) ---------- */
  function monthCoverage(month) {
    if (!isPastOrCurrent(month)) return "—";
    let req = 0, ok = 0;
    for (const b of branches) {
      const st = cellStatus(b.code, month);
      if (st.target === 0) continue;
      req += 1;
      if (st.done >= st.target) ok += 1;
    }
    return req ? `${ok}/${req}` : "—";
  }
  function cellTitle(code, month, st) {
    const mo = MONTHS.find((m) => m.i === month);
    return `${getInspectionBranchLabel(code, lang)} · ${isAr ? mo.ar : mo.full} ${year}\n` +
      tt(`Required: ${st.target} · Done: ${st.done}`, `المطلوب: ${st.target} · المنفذ: ${st.done}`);
  }
}

/* ===================== Cell modal ===================== */
function CellModal({ branch, month, year, lang, status, onTarget, onClose, onOpenReports, onNewInspection }) {
  const isAr = lang === "ar";
  const tt = (en, ar) => (isAr ? ar : en);
  const mo = MONTHS.find((m) => m.i === month);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(2,6,23,.55)",
        display: "grid", placeItems: "center", zIndex: 9999, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? "rtl" : "ltr"}
        style={{
          width: "min(720px,100%)", maxHeight: "85vh", background: "#fff",
          borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column",
          boxShadow: "0 30px 80px rgba(2,6,23,.45)", fontFamily: "Cairo, Arial, sans-serif",
        }}
      >
        <div style={{ padding: "14px 18px", background: "linear-gradient(135deg,#0f172a,#1e293b)", color: "#fff" }}>
          <div style={{ fontSize: 16, fontWeight: 1000 }}>
            {inspectionBranchIcon(branch)} {getInspectionBranchLabel(branch, lang)}
          </div>
          <div style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 800 }}>
            {isAr ? mo.ar : mo.full} · {year}
          </div>
        </div>

        <div style={{ padding: 18, overflow: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Target editor */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            background: C.band, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px",
          }}>
            <span style={{ fontWeight: 1000, fontSize: 13, color: C.ink }}>
              {tt("Required inspections this month", "التفتيشات المطلوبة هذا الشهر")}
            </span>
            <div style={{ flex: 1 }} />
            {[0, 1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => onTarget(n)}
                style={{
                  width: 36, height: 34, borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
                  fontWeight: 1000, fontSize: 13,
                  border: status.target === n ? `2px solid ${C.blue}` : `1px solid ${C.line2}`,
                  background: status.target === n ? C.blueBg : "#fff",
                  color: status.target === n ? "#1e3a8a" : C.sub,
                }}
              >{n}</button>
            ))}
          </div>

          {/* Summary */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <MiniStat label={tt("Required", "مطلوب")} value={status.target} bg="#dbeafe" fg="#1e3a8a" />
            <MiniStat label={tt("Done", "منفذ")} value={status.done} bg="#d1fae5" fg="#065f46" />
            <MiniStat
              label={tt("Missing", "ناقص")}
              value={Math.max(0, status.target - status.done)}
              bg={status.done >= status.target ? "#e2e8f0" : "#fee2e2"}
              fg={status.done >= status.target ? "#475569" : "#991b1b"}
            />
          </div>

          {/* Inspections list */}
          <div>
            <div style={{ fontWeight: 1000, fontSize: 13, color: C.ink, marginBottom: 8 }}>
              {tt("Inspections recorded", "التفتيشات المسجلة")} ({status.list.length})
            </div>
            {status.list.length === 0 ? (
              <div style={{
                border: `1px dashed ${C.line2}`, borderRadius: 12, padding: 18,
                textAlign: "center", color: C.sub, fontWeight: 800, fontSize: 13,
              }}>
                {tt("No inspection report saved for this branch in this month.",
                    "لا يوجد تقرير تفتيش محفوظ لهذا الفرع في هذا الشهر.")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {status.list.map((a, i) => (
                  <div key={a.id || i} style={{
                    border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px",
                    background: "#fff", display: "flex", flexDirection: "column", gap: 4,
                  }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{
                        background: "#eef2ff", color: "#3730a3", borderRadius: 999,
                        padding: "2px 10px", fontSize: 11, fontWeight: 1000,
                      }}>📅 {a.dateStr || "—"}</span>
                      {a.reportNo && (
                        <span style={{ fontSize: 11, fontWeight: 900, color: C.sub }}>#{a.reportNo}</span>
                      )}
                      <div style={{ flex: 1 }} />
                      <span style={{
                        fontSize: 11, fontWeight: 1000,
                        color: a.closurePct >= 80 ? "#065f46" : a.closurePct >= 50 ? "#92400e" : "#991b1b",
                        background: a.closurePct >= 80 ? "#d1fae5" : a.closurePct >= 50 ? "#fef3c7" : "#fee2e2",
                        borderRadius: 999, padding: "2px 10px",
                      }}>{a.closurePct}% {tt("closed", "مغلق")}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.sub }}>
                      {tt("Findings", "الملاحظات")}: {a.findings} · {tt("High risk", "خطر عالي")}: {a.high}
                      {a.auditBy ? ` · ${tt("By", "بواسطة")}: ${a.auditBy}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{
          padding: "12px 18px", borderTop: `1px solid ${C.line}`, background: C.band,
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
        }}>
          <button onClick={onNewInspection} style={btn("linear-gradient(135deg,#2563eb,#1d4ed8)")}>
            ➕ {tt("New inspection", "تفتيش جديد")}
          </button>
          <button onClick={onOpenReports} style={btn(C.purple)}>
            📄 {tt("Open reports", "عرض التقارير")}
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={btn("#e2e8f0", "#334155")}>{tt("Close", "إغلاق")}</button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Small pieces ===================== */
function StatBlock({ label, value, color, highlight }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "6px 12px", borderRight: "1px solid rgba(255,255,255,.10)",
      background: highlight ? "rgba(220,38,38,.18)" : "transparent", minWidth: 62,
    }}>
      <span style={{ fontSize: 16, fontWeight: 1000, color, lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: 9, fontWeight: 800, color: "#cbd5e1", letterSpacing: .4, textTransform: "uppercase", marginTop: 2 }}>
        {label}
      </span>
    </div>
  );
}
function MiniStat({ label, value, bg, fg }) {
  return (
    <div style={{
      background: bg, color: fg, padding: "6px 12px", borderRadius: 10,
      fontSize: 12, fontWeight: 1000, display: "flex", gap: 8, alignItems: "center",
    }}>
      <span style={{ fontSize: 15 }}>{value}</span>
      <span style={{ fontSize: 10, opacity: .85, textTransform: "uppercase", letterSpacing: .3 }}>{label}</span>
    </div>
  );
}
function pill(bg) {
  return {
    background: bg, color: "#0f172a", border: "1px solid rgba(15,23,42,.10)",
    padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800,
  };
}
function legend(color, bg, dashed = false) {
  return {
    display: "inline-flex", gap: 6, alignItems: "center", padding: "3px 10px",
    borderRadius: 8, border: `${dashed ? "1.5px dashed" : "1.5px solid"} ${color}`,
    background: bg, color: color === "#cbd5e1" ? "#64748b" : color, fontWeight: 800, fontSize: 11,
  };
}
