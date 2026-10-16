// src/pages/haccp and iso/Calibration/CalibrationView.jsx
// Calibration Log (HACCP 8.7) — register of externally calibrated equipment.
// Soft Sky light design, urgency-first sort, filters from the data, optional
// grouping by branch, expandable detail row and a full-screen image viewer.
//
// Font sizes live in CV_CSS (doubled class `cv`) because globals.css forces
// `#root * { font-size }` with !important and kills every inline fontSize.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";
import ImageLightbox, { Thumb, isImageUrl } from "../_shared/ImageLightbox";
import { branchLabel } from "./calibrationLink";

const TYPE = "calibration_record";
const PREFS_KEY = "calib_view_prefs";

const BRANCHES = [
  "Al Qusais Warehouse",
  "Al Mamzar Food Truck",
  "Supervisor Food Truck",
  "Al Barsha Butchery",
  "Abu Dhabi Butchery",
  "Al Ain Butchery",
  "Motor City",
];

const DAY = 86400000;
const DUE_SOON_DAYS = 30;

/* ── dates: "YYYY-MM-DD" is read as a LOCAL day so the day count is exact ── */
function parseDay(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function today0() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
function daysUntil(s) {
  const d = parseDay(s);
  return d ? Math.round((d - today0()) / DAY) : null;
}
function fmtDate(s) {
  const d = parseDay(s);
  if (!d) return "—";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
/* share of the calibration interval already used (0..1), for the progress bar */
function usedShare(last, next) {
  const a = parseDay(last), b = parseDay(next);
  if (!a || !b || b <= a) return null;
  return Math.max(0, Math.min(1, (today0() - a) / (b - a)));
}
function arDays(n) {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومان";
  if (n >= 3 && n <= 10) return `${n} أيام`;
  return `${n} يوماً`;
}

const isPdfFile = (url, name) => /\.pdf(\?|$)/i.test(String(name || url || ""));

/* A failed calibration takes the device out of service whatever the due date says. */
function classify(p) {
  if (p.result === "FAIL") return "out";
  const d = daysUntil(p.nextDueDate);
  if (d == null) return "nodate";
  if (d < 0) return "overdue";
  if (d <= DUE_SOON_DAYS) return "due";
  return "ok";
}
const STATUS_RANK = { out: 0, overdue: 1, due: 2, ok: 3, nodate: 4 };
const RESULT_RANK = { FAIL: 0, ADJUSTED: 1, PASS: 2 };

const str = (v) => String(v ?? "").trim();
const byText = (a, b) => str(a).localeCompare(str(b), undefined, { numeric: true, sensitivity: "base" });
const diff = (a, b) => { const d = a - b; return Number.isNaN(d) ? 0 : d; };

function compareRows(a, b, key) {
  switch (key) {
    case "urgency": return STATUS_RANK[a.status] - STATUS_RANK[b.status] || diff(a.days ?? Infinity, b.days ?? Infinity);
    case "next":    return diff(a.days, b.days);
    case "last":    return diff(parseDay(a.p.lastCalibrationDate), parseDay(b.p.lastCalibrationDate));
    case "name":    return byText(a.p.equipmentName, b.p.equipmentName);
    case "id":      return byText(a.p.equipmentId, b.p.equipmentId);
    case "branch":  return byText(a.p.branch, b.p.branch) || diff(a.days ?? Infinity, b.days ?? Infinity);
    case "result":  return (RESULT_RANK[a.p.result] ?? 3) - (RESULT_RANK[b.p.result] ?? 3);
    default:        return 0;
  }
}
/* rows missing the sort field always go to the bottom, in either direction */
function isBlankFor(row, key) {
  if (key === "next") return row.days == null;
  if (key === "last") return !parseDay(row.p.lastCalibrationDate);
  if (key === "id") return !str(row.p.equipmentId);
  return false;
}

function readPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {}; } catch { return {}; }
}
function writePrefs(v) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(v)); } catch { /* storage blocked — prefs last for this visit */ }
}

const CV_CSS = `
#root .cv.cv{
  --bg:#f3f7fc; --card:#ffffff; --line:#e3ebf5; --line2:#eef3f9;
  --ink:#1e293b; --ink2:#475569; --mute:#5b6b80;
  --pri:#3b82f6; --pri-ink:#1d4ed8; --pri-soft:#eaf2fe;
  --red:#dc2626; --red-soft:#fdecec; --red-ink:#b91c1c;
  --amb:#d97706; --amb-soft:#fff4e0; --amb-ink:#9a5b05;
  --grn:#16a34a; --grn-soft:#e7f7ee; --grn-ink:#15803d;
  --out:#9f1239; --out-soft:#fde7ef;
  --gry-soft:#f1f5f9;
  width:100%; min-height:100vh; padding:22px 24px 48px; background:var(--bg); color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;
}
#root .cv.cv, #root .cv.cv *{ font-size:calc(16px * var(--app-fs,1)) !important; box-sizing:border-box; }
#root .cv.cv .fs-xl, #root .cv.cv .fs-xl *{ font-size:calc(28px * var(--app-fs,1)) !important; }
#root .cv.cv .fs-kpi{ font-size:calc(36px * var(--app-fs,1)) !important; }
#root .cv.cv .fs-md, #root .cv.cv .fs-md *{ font-size:calc(17.5px * var(--app-fs,1)) !important; }
#root .cv.cv .fs-sm, #root .cv.cv .fs-sm *{ font-size:calc(15px * var(--app-fs,1)) !important; }
#root .cv.cv .fs-xs, #root .cv.cv .fs-xs *{ font-size:calc(14px * var(--app-fs,1)) !important; }

.cv .cv-wrap{ width:100%; max-width:none; margin:0; }
.cv .cv-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap;
  background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px 18px; margin-bottom:14px;
  box-shadow:0 4px 18px rgba(59,130,246,.06); }
.cv .cv-title{ font-weight:800; color:var(--ink); line-height:1.25; }
.cv .cv-sub{ color:var(--mute); font-weight:600; margin:4px 0 8px; }
.cv .cv-actions{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.cv .cv-btn{ border:1px solid var(--line); background:#fff; color:var(--ink2); border-radius:10px; padding:10px 18px;
  font-weight:700; cursor:pointer; white-space:nowrap; font-family:inherit; transition:background .15s,border-color .15s; }
.cv .cv-btn:hover{ background:var(--pri-soft); border-color:#c9dcfb; }
.cv .cv-btn:disabled{ opacity:.55; cursor:default; }
.cv .cv-btn.pri{ background:var(--pri); border-color:var(--pri); color:#fff; }
.cv .cv-btn.pri:hover{ background:var(--pri-ink); }
.cv .cv-btn.ico{ padding:8px 12px; border-radius:9px; }
.cv .cv-btn.del:hover{ background:var(--red-soft); border-color:#f6c4c4; }

.cv .cv-kpis{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-bottom:14px; }
.cv .cv-kpi{ text-align:start; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px 20px;
  cursor:pointer; font-family:inherit; display:flex; flex-direction:column; gap:2px; position:relative; overflow:hidden;
  transition:box-shadow .15s,border-color .15s,transform .15s; }
.cv .cv-kpi::before{ content:""; position:absolute; inset-inline-start:0; top:0; bottom:0; width:4px; background:var(--k); }
.cv .cv-kpi:hover{ transform:translateY(-1px); box-shadow:0 6px 16px rgba(15,23,42,.06); }
.cv .cv-kpi.on{ border-color:var(--k); box-shadow:0 0 0 3px var(--ks); background:var(--ks); }
.cv .cv-kpi b{ color:var(--k); font-weight:800; line-height:1.1; }
.cv .cv-kpi span{ color:var(--ink2); font-weight:700; }

.cv .cv-bar{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; background:var(--card); border:1px solid var(--line);
  border-radius:14px; padding:10px 12px; margin-bottom:12px; }
.cv .cv-in{ border:1px solid var(--line); background:#fbfdff; border-radius:10px; padding:10px 13px; color:var(--ink);
  font-family:inherit; font-weight:600; min-width:0; }
.cv .cv-in:focus{ outline:none; border-color:var(--pri); box-shadow:0 0 0 3px var(--pri-soft); }
.cv .cv-search{ flex:1 1 240px; }
.cv .cv-check{ display:inline-flex; align-items:center; gap:6px; font-weight:700; color:var(--ink2); cursor:pointer;
  padding:7px 10px; border:1px solid var(--line); border-radius:10px; background:#fbfdff; user-select:none; }
.cv .cv-count{ margin-inline-start:auto; color:var(--mute); font-weight:700; white-space:nowrap; }
.cv .cv-count strong{ color:var(--pri-ink); }
.cv .cv-clear{ background:none; border:none; color:var(--red-ink); font-weight:700; cursor:pointer; font-family:inherit; padding:6px 4px; }

.cv .cv-note{ background:var(--red-soft); color:var(--red-ink); border:1px solid #f6c4c4; border-radius:12px;
  padding:10px 14px; margin-bottom:12px; font-weight:700; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.cv .cv-empty{ background:var(--card); border:1px dashed #cbd8e8; border-radius:14px; padding:44px 16px; text-align:center;
  color:var(--mute); font-weight:700; display:flex; flex-direction:column; gap:12px; align-items:center; }

.cv .cv-table{ background:var(--card); border:1px solid var(--line); border-radius:14px; overflow:hidden; }
.cv .cv-scroll{ overflow-x:auto; }
.cv .cv-grid{ display:grid; align-items:center; column-gap:12px;
  grid-template-columns:minmax(250px,2.4fr) minmax(190px,1.3fr) 130px minmax(200px,1.4fr) 110px minmax(190px,1.1fr) minmax(140px,1fr) 104px; }
.cv .cv-thead{ min-width:1360px; padding:14px 20px; background:#f6f9fd; border-bottom:1px solid var(--line); }
.cv .cv-th{ color:var(--ink); font-weight:800; background:none; border:none; padding:0; text-align:start; cursor:pointer;
  font-family:inherit; display:inline-flex; gap:4px; align-items:center; white-space:nowrap; }
.cv .cv-th.static{ cursor:default; }
.cv .cv-th .arr{ color:var(--pri); }
.cv .cv-group{ min-width:1360px; display:flex; gap:10px; align-items:center; padding:12px 20px; background:#f9fbfe;
  border-bottom:1px solid var(--line); color:var(--ink); font-weight:800; }
.cv .cv-group .tag{ font-weight:700; border-radius:999px; padding:2px 9px; }
.cv .cv-row{ min-width:1360px; padding:15px 20px; border-bottom:1px solid var(--line2); cursor:pointer;
  border-inline-start:3px solid transparent; transition:background .12s; }
.cv .cv-row:hover{ background:#f7faff; }
.cv .cv-row.open{ background:#f3f8ff; }
.cv .cv-row.s-out{ border-inline-start-color:var(--out); }
.cv .cv-row.s-overdue{ border-inline-start-color:var(--red); }
.cv .cv-row.s-due{ border-inline-start-color:var(--amb); }
.cv .cv-cell{ min-width:0; }
.cv .cv-name{ font-weight:800; color:var(--ink); overflow-wrap:anywhere; }
.cv .cv-meta{ color:var(--mute); font-weight:600; margin-top:2px; overflow-wrap:anywhere; }
.cv .cv-date{ font-weight:700; color:var(--ink2); white-space:nowrap; }
.cv .cv-track{ height:8px; background:#edf2f8; border-radius:99px; margin-top:6px; overflow:hidden; max-width:240px; }
.cv .cv-track i{ display:block; height:100%; border-radius:99px; }
.cv .cv-pill{ display:inline-flex; align-items:center; gap:5px; border-radius:999px; padding:5px 13px; font-weight:800;
  white-space:nowrap; border:1px solid transparent; }
.cv .cv-pill .dot{ width:7px; height:7px; border-radius:50%; background:currentColor; }
.cv .t-out{ background:var(--out-soft); color:var(--out); border-color:#f7c3d5; }
.cv .t-overdue{ background:var(--red-soft); color:var(--red-ink); border-color:#f6c9c9; }
.cv .t-due{ background:var(--amb-soft); color:var(--amb-ink); border-color:#f7dcae; }
.cv .t-ok{ background:var(--grn-soft); color:var(--grn-ink); border-color:#bfe8cf; }
.cv .t-nodate{ background:var(--gry-soft); color:var(--ink2); border-color:var(--line); }
.cv .cv-thumbs{ display:flex; gap:4px; align-items:center; flex-wrap:wrap; }
.cv .cv-view{ display:inline-flex; align-items:center; gap:8px; padding:4px; padding-inline-end:10px; border-radius:10px;
  border:1px solid #cfe0fb; background:var(--pri-soft); color:var(--pri-ink); font-weight:800; cursor:zoom-in;
  font-family:inherit; transition:background .15s, box-shadow .15s; }
.cv .cv-view:hover{ background:#dceafd; box-shadow:0 2px 8px rgba(59,130,246,.18); }
.cv .cv-view-img{ position:relative; width:46px; height:46px; flex:0 0 46px; border-radius:8px; overflow:hidden; background:#e8eef6; }
.cv .cv-view-img img{ width:100%; height:100%; object-fit:cover; display:block; }
.cv .cv-view-n{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(15,23,42,.45); color:#fff; font-weight:800; }
.cv .cv-doc{ display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:7px; background:#fff7e8;
  border:1px solid #f6dfb1; color:#8a5a00; text-decoration:none; font-weight:800; }
.cv .cv-tools{ display:flex; gap:6px; justify-content:flex-end; }

.cv .cv-detail{ min-width:1360px; background:#f8fbff; border-bottom:1px solid var(--line); padding:14px 16px 18px; }
.cv .cv-dgrid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:10px; }
.cv .cv-field{ background:#fff; border:1px solid var(--line); border-radius:10px; padding:8px 11px; }
.cv .cv-field .k{ color:var(--mute); font-weight:700; }
.cv .cv-field .v{ color:var(--ink); font-weight:700; margin-top:2px; overflow-wrap:anywhere; white-space:pre-wrap; }
.cv .cv-field.wide{ grid-column:1 / -1; }
.cv .cv-gallery{ display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
.cv .cv-gimg{ width:104px; height:104px; padding:0; border-radius:12px; overflow:hidden; border:1px solid var(--line);
  background:#e8eef6; cursor:zoom-in; transition:transform .15s, box-shadow .15s; }
.cv .cv-gimg:hover{ transform:translateY(-2px); box-shadow:0 6px 16px rgba(15,23,42,.12); }
.cv .cv-gimg img{ width:100%; height:100%; object-fit:cover; display:block; }

/* phones / narrow windows: every row becomes a card */
@media (max-width: 1100px){
  .cv .cv-thead{ display:none; }
  .cv .cv-thead, .cv .cv-row, .cv .cv-group, .cv .cv-detail{ min-width:0; }
  .cv .cv-row.cv-grid{ grid-template-columns:1fr 1fr; row-gap:10px; padding:14px; }
  .cv .cv-row .c-eq, .cv .cv-row .c-next{ grid-column:1 / -1; }
  .cv .cv-row .c-tools{ grid-column:1 / -1; }
  .cv .cv-row .cv-cell[data-label]::before{ content:attr(data-label); display:block; color:var(--mute); font-weight:700;
    font-size:calc(13.5px * var(--app-fs,1)) !important; margin-bottom:3px; }
  .cv .cv-tools{ justify-content:flex-start; }
  .cv .cv-head{ padding:14px; }
  .cv .cv-count{ margin-inline-start:0; width:100%; }
}
`;

export default function CalibrationView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";
  const L = useCallback((ar, en) => (isAr ? ar : en), [isAr]);

  const [prefs] = useState(readPrefs);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [branchF, setBranchF] = useState("all");
  const [typeF, setTypeF] = useState("all");
  const [resultF, setResultF] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(prefs.sort?.key ? prefs.sort : { key: "urgency", dir: 1 });
  const [grouped, setGrouped] = useState(!!prefs.grouped);
  const [openId, setOpenId] = useState(null);
  /* Lightbox state: { images: [{url,name}, ...], index: 0 } */
  const [preview, setPreview] = useState(null);

  useEffect(() => { writePrefs({ sort, grouped }); }, [sort, grouped]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItems(Array.isArray(json) ? json : json?.data || json?.items || []);
    } catch (e) {
      setLoadError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => items.map((rec) => {
    const p = rec?.payload || {};
    const urls = Array.isArray(p.fileUrls) ? p.fileUrls : [];
    const names = Array.isArray(p.fileNames) ? p.fileNames : [];
    const files = urls.filter(Boolean).map((url, i) => ({ url, name: names[i] || "" }));
    const images = files.filter((f) => isImageUrl(f.url, f.name));
    return {
      id: rec.id,
      p,
      status: classify(p),
      days: daysUntil(p.nextDueDate),
      images,
      docs: files.filter((f) => !images.includes(f)),
    };
  }), [items]);

  const branchOptions = useMemo(() => {
    const set = new Set(BRANCHES);
    rows.forEach((r) => str(r.p.branch) && set.add(str(r.p.branch)));
    return [...set].sort(byText);
  }, [rows]);
  const typeOptions = useMemo(
    () => [...new Set(rows.map((r) => str(r.p.equipmentType)).filter(Boolean))].sort(byText),
    [rows]
  );

  /* every filter except the status tiles — the tiles count inside this set */
  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(({ p }) => {
      if (branchF !== "all" && str(p.branch) !== branchF) return false;
      if (typeF !== "all" && str(p.equipmentType) !== typeF) return false;
      if (resultF !== "all" && str(p.result) !== resultF) return false;
      if (q) {
        const hay = [
          p.equipmentId, p.equipmentName, p.equipmentType, p.serialNumber, p.manufacturer,
          p.branch, p.location, p.calibratedBy, p.calibrationCertNo, p.notes,
        ].map((v) => str(v).toLowerCase()).join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, branchF, typeF, resultF, search]);

  const kpis = useMemo(() => {
    const k = { all: scoped.length, out: 0, overdue: 0, due: 0, ok: 0, nodate: 0 };
    scoped.forEach((r) => { k[r.status]++; });
    return k;
  }, [scoped]);

  const visible = useMemo(() => {
    const list = statusF === "all" ? scoped : scoped.filter((r) => r.status === statusF);
    return [...list].sort((a, b) => {
      const ab = isBlankFor(a, sort.key), bb = isBlankFor(b, sort.key);
      if (ab !== bb) return ab ? 1 : -1;
      return compareRows(a, b, sort.key) * sort.dir || byText(a.p.equipmentName, b.p.equipmentName);
    });
  }, [scoped, statusF, sort]);

  const groups = useMemo(() => {
    if (!grouped) return [{ key: "", rows: visible }];
    const map = new Map();
    visible.forEach((r) => {
      const k = str(r.p.branch) || "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return [...map.entries()].sort((a, b) => byText(a[0], b[0])).map(([key, list]) => ({ key, rows: list }));
  }, [visible, grouped]);

  const filtersOn = statusF !== "all" || branchF !== "all" || typeF !== "all" || resultF !== "all" || search.trim() !== "";
  function clearFilters() {
    setStatusF("all"); setBranchF("all"); setTypeF("all"); setResultF("all"); setSearch("");
  }

  function sortBy(key) {
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === "last" ? -1 : 1 }));
  }

  async function del(id) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((list) => list.filter((r) => r.id !== id));
    } catch (e) {
      alert(t("deleteError") + ": " + (e?.message || e));
    }
  }

  const closePreview = useCallback(() => setPreview(null), []);

  function openLightbox(images, index, title) {
    if (!images?.length) return;
    setPreview({ images, title, index: Math.max(0, Math.min(index, images.length - 1)) });
  }

  const statusText = (r) => {
    const d = r.days;
    switch (r.status) {
      case "out":     return L("خارج الخدمة", "Out of service");
      case "overdue": return L(`متأخرة ${arDays(-d)}`, `Overdue ${-d}d`);
      case "due":     return d === 0 ? L("مستحقة اليوم", "Due today") : L(`باقي ${arDays(d)}`, `Due in ${d}d`);
      case "ok":      return L(`سارية · ${arDays(d)}`, `Valid · ${d}d`);
      default:        return L("بلا تاريخ استحقاق", "No due date");
    }
  };
  const resultText = (v) => ({
    PASS: L("ناجح", "Pass"),
    ADJUSTED: L("تم الضبط", "Adjusted"),
    FAIL: L("فاشل", "Fail"),
  }[v] || "—");
  const resultTone = (v) => (v === "PASS" ? "t-ok" : v === "ADJUSTED" ? "t-due" : v === "FAIL" ? "t-overdue" : "t-nodate");
  const barColor = { out: "var(--out)", overdue: "var(--red)", due: "var(--amb)", ok: "var(--grn)", nodate: "#cbd5e1" };

  const KPI_TILES = [
    { id: "all",     label: L("كل الأجهزة", "All equipment"),          k: "#3b82f6", ks: "#eaf2fe" },
    { id: "overdue", label: L("متأخرة المعايرة", "Overdue"),            k: "#dc2626", ks: "#fdecec" },
    { id: "due",     label: L(`مستحقة خلال ${DUE_SOON_DAYS} يوماً`, `Due within ${DUE_SOON_DAYS} days`), k: "#d97706", ks: "#fff4e0" },
    { id: "ok",      label: L("سارية", "Valid"),                         k: "#16a34a", ks: "#e7f7ee" },
    { id: "out",     label: L("خارج الخدمة (فاشل)", "Out of service (fail)"), k: "#9f1239", ks: "#fde7ef" },
    { id: "nodate",  label: L("بلا تاريخ استحقاق", "No due date"),      k: "#64748b", ks: "#f1f5f9" },
  ].filter((x) => x.id === "all" || x.id === "overdue" || x.id === "due" || x.id === "ok" || kpis[x.id] > 0);

  const SORTS = [
    ["urgency:1", L("الأكثر إلحاحاً أولاً", "Most urgent first")],
    ["next:1",    L("الاستحقاق: الأقرب أولاً", "Next due: soonest")],
    ["next:-1",   L("الاستحقاق: الأبعد أولاً", "Next due: latest")],
    ["last:-1",   L("آخر معايرة: الأحدث", "Last calibrated: newest")],
    ["last:1",    L("آخر معايرة: الأقدم", "Last calibrated: oldest")],
    ["name:1",    L("اسم الجهاز (أ ← ي)", "Equipment name (A → Z)")],
    ["name:-1",   L("اسم الجهاز (ي ← أ)", "Equipment name (Z → A)")],
    ["id:1",      L("رقم الجهاز", "Equipment ID")],
    ["branch:1",  L("الفرع", "Branch")],
    ["result:1",  L("النتيجة (الفاشل أولاً)", "Result (fail first)")],
  ];
  const sortValue = `${sort.key}:${sort.dir}`;
  const sortKnown = SORTS.some(([v]) => v === sortValue);

  const Th = ({ k, children }) => (
    <button type="button" className="cv-th fs-sm" onClick={() => sortBy(k)}>
      {children}
      {sort.key === k && <span className="arr">{sort.dir === 1 ? "▲" : "▼"}</span>}
    </button>
  );

  function renderRow(r) {
    const { p } = r;
    const open = openId === r.id;
    const share = usedShare(p.lastCalibrationDate, p.nextDueDate);
    return (
      <React.Fragment key={r.id}>
        <div
          className={`cv-row cv-grid s-${r.status}${open ? " open" : ""}`}
          onClick={() => setOpenId(open ? null : r.id)}
          role="button"
          aria-expanded={open}
        >
          <div className="cv-cell c-eq">
            <div className="cv-name fs-md">{p.equipmentName || "—"}</div>
            <div className="cv-meta fs-xs">
              {[p.linkedUnit?.label && `🔗 ${L("سجل الحرارة", "Temp log")}: ${p.linkedUnit.label}`, p.equipmentId, p.equipmentType, p.serialNumber && `S/N ${p.serialNumber}`].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
          <div className="cv-cell" data-label={L("الفرع", "Branch")}>
            <div style={{ fontWeight: 700 }}>{p.branch ? branchLabel(p.branch) : "—"}</div>
            {p.location && <div className="cv-meta fs-xs">{p.location}</div>}
          </div>
          <div className="cv-cell" data-label={L("آخر معايرة", "Last calibrated")}>
            <span className="cv-date">{fmtDate(p.lastCalibrationDate)}</span>
          </div>
          <div className="cv-cell c-next" data-label={L("الاستحقاق التالي", "Next due")}>
            <span className="cv-date" style={{ color: "var(--ink)" }}>{fmtDate(p.nextDueDate)}</span>
            {p.intervalMonths ? <span className="cv-meta fs-xs"> · {p.intervalMonths} {L("شهر", "mo")}</span> : null}
            {share != null && (
              <div className="cv-track"><i style={{ width: `${Math.round(share * 100)}%`, background: barColor[r.status] }} /></div>
            )}
          </div>
          <div className="cv-cell" data-label={L("النتيجة", "Result")}>
            <span className={`cv-pill fs-xs ${resultTone(p.result)}`}>{resultText(p.result)}</span>
          </div>
          <div className="cv-cell" data-label={L("الحالة", "Status")}>
            <span className={`cv-pill fs-xs t-${r.status}`}><span className="dot" />{statusText(r)}</span>
          </div>
          <div className="cv-cell" data-label={L("المرفقات", "Attachments")} onClick={(e) => e.stopPropagation()}>
            {r.images.length === 0 && r.docs.length === 0 ? (
              <span className="cv-meta">—</span>
            ) : (
              <div className="cv-thumbs">
                {r.images.length > 0 && (
                  <button
                    type="button"
                    className="cv-view"
                    onClick={() => openLightbox(r.images, 0, p.equipmentName)}
                    title={L("عرض الصور", "View photos")}
                  >
                    <span className="cv-view-img">
                      <Thumb url={r.images[0].url} alt={r.images[0].name} />
                      {r.images.length > 1 && <span className="cv-view-n fs-xs">+{r.images.length - 1}</span>}
                    </span>
                    <span className="fs-xs">🖼 {L("عرض", "View")} {r.images.length}</span>
                  </button>
                )}
                {r.docs.map((f, i) => (
                  <a key={f.url + i} href={f.url} target="_blank" rel="noreferrer" className="cv-doc fs-xs" title={f.name}>
                    {isPdfFile(f.url, f.name) ? "📄 PDF" : `📎 ${str(f.name).slice(0, 10) || L("ملف", "File")}`}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="cv-cell c-tools" onClick={(e) => e.stopPropagation()}>
            <div className="cv-tools">
              <button
                type="button"
                className="cv-btn ico"
                title={L("تعديل", "Edit")}
                onClick={() => navigate(`/haccp-iso/calibration?edit=${encodeURIComponent(r.id)}`)}
              >✏️</button>
              <button
                type="button"
                className="cv-btn ico del"
                title={L("حذف", "Delete")}
                onClick={() => del(r.id)}
                data-delete-action="true"
              >🗑️</button>
            </div>
          </div>
        </div>
        {open && <DetailPanel r={r} L={L} onImage={(i) => openLightbox(r.images, i, p.equipmentName)} />}
      </React.Fragment>
    );
  }

  return (
    <main className="cv" style={{ direction: dir }}>
      <style>{CV_CSS}</style>
      <div className="cv-wrap">
        <header className="cv-head">
          <div>
            <div className="cv-title fs-xl">{t("calibListTitle")}</div>
            <div className="cv-sub fs-sm">
              {L("سجل الأجهزة المعايرة خارجياً لدى جهة معتمدة — المعايرة السنوية ومواعيد الاستحقاق",
                 "Equipment calibrated by an accredited external lab — annual calibration and due dates")}
            </div>
            <HaccpLinkBadge clauses={["8.7"]} label={L("ضبط المراقبة والقياس", "Control of Monitoring & Measuring")} />
          </div>
          <div className="cv-actions">
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button type="button" className="cv-btn" onClick={load} disabled={loading}>
              {loading ? "⏳" : "↻"} {L("تحديث", "Refresh")}
            </button>
            <button type="button" className="cv-btn pri" onClick={() => navigate("/haccp-iso/calibration")}>
              ＋ {L("جهاز جديد", "New record")}
            </button>
            <button type="button" className="cv-btn" onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </header>

        {loadError && (
          <div className="cv-note">
            ⚠ {L("تعذّر تحميل السجلات", "Could not load the records")} ({loadError})
            <button type="button" className="cv-btn" onClick={load}>{L("إعادة المحاولة", "Retry")}</button>
          </div>
        )}

        <div className="cv-kpis">
          {KPI_TILES.map((x) => (
            <button
              key={x.id}
              type="button"
              className={`cv-kpi${statusF === x.id ? " on" : ""}`}
              style={{ "--k": x.k, "--ks": x.ks }}
              onClick={() => setStatusF(statusF === x.id || x.id === "all" ? "all" : x.id)}
            >
              <b className="fs-kpi">{kpis[x.id]}</b>
              <span className="fs-sm">{x.label}</span>
            </button>
          ))}
        </div>

        <div className="cv-bar">
          <input
            type="search"
            className="cv-in cv-search"
            placeholder={L("🔍 بحث: الجهاز، الرقم، التسلسلي، الشهادة، الجهة…", "🔍 Search: equipment, ID, serial, certificate, lab…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="cv-in" value={branchF} onChange={(e) => setBranchF(e.target.value)} aria-label={L("الفرع", "Branch")}>
            <option value="all">{L("كل الفروع", "All branches")}</option>
            {branchOptions.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
          </select>
          <select className="cv-in" value={typeF} onChange={(e) => setTypeF(e.target.value)} aria-label={L("نوع الجهاز", "Equipment type")}>
            <option value="all">{L("كل الأنواع", "All types")}</option>
            {typeOptions.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select className="cv-in" value={resultF} onChange={(e) => setResultF(e.target.value)} aria-label={L("النتيجة", "Result")}>
            <option value="all">{L("كل النتائج", "All results")}</option>
            <option value="PASS">{resultText("PASS")}</option>
            <option value="ADJUSTED">{resultText("ADJUSTED")}</option>
            <option value="FAIL">{resultText("FAIL")}</option>
          </select>
          <select
            className="cv-in"
            value={sortValue}
            onChange={(e) => { const [key, d] = e.target.value.split(":"); setSort({ key, dir: Number(d) }); }}
            aria-label={L("الترتيب", "Sort")}
          >
            {!sortKnown && <option value={sortValue}>{L("ترتيب مخصص", "Custom order")}</option>}
            {SORTS.map(([v, label]) => <option key={v} value={v}>↕ {label}</option>)}
          </select>
          <label className="cv-check">
            <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
            {L("تجميع حسب الفرع", "Group by branch")}
          </label>
          {filtersOn && (
            <button type="button" className="cv-clear" onClick={clearFilters}>✕ {L("مسح الفلاتر", "Clear filters")}</button>
          )}
          <span className="cv-count fs-sm">
            {L("المعروض", "Showing")} <strong>{visible.length}</strong> {L("من", "of")} {rows.length}
          </span>
        </div>

        {loading && rows.length === 0 && <div className="cv-empty">⏳ {t("loading")}</div>}

        {!loading && !loadError && rows.length === 0 && (
          <div className="cv-empty">
            <div className="fs-md">{L("لا توجد أجهزة مسجلة بعد", "No equipment recorded yet")}</div>
            <button type="button" className="cv-btn pri" onClick={() => navigate("/haccp-iso/calibration")}>
              ＋ {L("أضف أول جهاز", "Add the first record")}
            </button>
          </div>
        )}

        {rows.length > 0 && visible.length === 0 && (
          <div className="cv-empty">
            <div className="fs-md">{L("لا توجد نتائج مطابقة للفلاتر", "Nothing matches these filters")}</div>
            <button type="button" className="cv-btn" onClick={clearFilters}>{L("مسح الفلاتر", "Clear filters")}</button>
          </div>
        )}

        {visible.length > 0 && (
          <div className="cv-table">
            <div className="cv-scroll">
              <div className="cv-thead cv-grid">
                <Th k="name">{L("الجهاز", "Equipment")}</Th>
                <Th k="branch">{L("الفرع / الموقع", "Branch / location")}</Th>
                <Th k="last">{L("آخر معايرة", "Last calibrated")}</Th>
                <Th k="next">{L("الاستحقاق التالي", "Next due")}</Th>
                <Th k="result">{L("النتيجة", "Result")}</Th>
                <Th k="urgency">{L("الحالة", "Status")}</Th>
                <span className="cv-th static fs-sm">{L("المرفقات", "Attachments")}</span>
                <span className="cv-th static fs-sm" />
              </div>
              {groups.map((g) => (
                <React.Fragment key={g.key || "_all"}>
                  {grouped && (
                    <div className="cv-group fs-md">
                      🏬 {branchLabel(g.key)}
                      <span className="tag fs-xs t-nodate">{g.rows.length}</span>
                      {g.rows.filter((r) => r.status === "overdue" || r.status === "out").length > 0 && (
                        <span className="tag fs-xs t-overdue">
                          {g.rows.filter((r) => r.status === "overdue" || r.status === "out").length} {L("متأخر/خارج الخدمة", "overdue / out")}
                        </span>
                      )}
                      {g.rows.filter((r) => r.status === "due").length > 0 && (
                        <span className="tag fs-xs t-due">
                          {g.rows.filter((r) => r.status === "due").length} {L("مستحق قريباً", "due soon")}
                        </span>
                      )}
                    </div>
                  )}
                  {g.rows.map(renderRow)}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {preview && (
        <ImageLightbox
          images={preview.images}
          index={preview.index}
          title={preview.title}
          isAr={isAr}
          onClose={closePreview}
        />
      )}
    </main>
  );
}

/* Expanded row: everything the input form captured that the table hides. */
function DetailPanel({ r, L, onImage }) {
  const { p } = r;
  const fields = [
    [L("رقم الجهاز", "Equipment ID"), p.equipmentId],
    [L("نوع الجهاز", "Equipment type"), p.equipmentType],
    [L("الرقم التسلسلي", "Serial no."), p.serialNumber],
    [L("الشركة المصنّعة", "Manufacturer"), p.manufacturer],
    [L("الموقع", "Location"), p.location],
    [L("نطاق القياس", "Range"), p.range],
    [L("الدقة", "Accuracy"), p.accuracy],
    [L("فترة المعايرة", "Interval"), p.intervalMonths ? `${p.intervalMonths} ${L("شهر", "months")}` : ""],
    [L("آخر معايرة", "Last calibrated"), fmtDate(p.lastCalibrationDate)],
    [L("الاستحقاق التالي", "Next due"), fmtDate(p.nextDueDate)],
    [L("جهة المعايرة", "Calibrated by"), p.calibratedBy],
    [L("رقم الشهادة", "Certificate no."), p.calibrationCertNo],
  ];
  return (
    <div className="cv-detail">
      <div className="cv-dgrid">
        {fields.map(([k, v]) => (
          <div key={k} className="cv-field">
            <div className="k fs-xs">{k}</div>
            <div className="v">{str(v) && v !== "—" ? v : "—"}</div>
          </div>
        ))}
        {str(p.calibrationMethod) && (
          <div className="cv-field wide">
            <div className="k fs-xs">{L("طريقة المعايرة", "Calibration method")}</div>
            <div className="v">{p.calibrationMethod}</div>
          </div>
        )}
        {str(p.notes) && (
          <div className="cv-field wide">
            <div className="k fs-xs">{L("ملاحظات", "Notes")}</div>
            <div className="v">{p.notes}</div>
          </div>
        )}
      </div>
      {(r.images.length > 0 || r.docs.length > 0) && (
        <div className="cv-gallery">
          {r.images.map((f, i) => (
            <button key={f.url + i} type="button" className="cv-gimg" title={f.name} onClick={() => onImage(i)}>
              <Thumb url={f.url} alt={f.name || `image-${i + 1}`} />
            </button>
          ))}
          {r.docs.map((f, i) => (
            <a key={f.url + i} href={f.url} target="_blank" rel="noreferrer" className="cv-doc fs-sm" title={f.name}>
              {isPdfFile(f.url, f.name) ? "📄" : "📎"} {f.name || L("فتح الملف", "Open file")}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
