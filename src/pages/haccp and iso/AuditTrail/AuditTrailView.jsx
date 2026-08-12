// src/pages/haccp and iso/AuditTrail/AuditTrailView.jsx
// 🕵️ Audit Trail — ADMIN ONLY.
// Every edit & delete across the whole system (all report types):
// who did it, when, and a field-level old → new diff.
// Data comes from GET /api/audit (server routes/audit.cjs), which itself
// requires an admin token — the client guard here is just UX.
//
// Design language matches the ISO 22000 & HACCP Command Center hub
// (dark teal hero, 8px radii, white cards, teal accents) at a larger
// base type scale for comfortable reading.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";
import API_BASE from "../../../config/api";
import { getPerms } from "../../../utils/perms";
import { describeReportType } from "../../settings/reportTypeCatalog";

/* ============================ diff engine ============================ */
/** Recursively compare two payloads and return flat rows:
 *  [{ path: "rows[2].tempCheck", oldVal, newVal }] */
function diffPayloads(oldV, newV, path = "", out = [], depth = 0) {
  if (out.length >= 400 || depth > 8) return out; // hard safety caps

  const isObjA = oldV !== null && typeof oldV === "object";
  const isObjB = newV !== null && typeof newV === "object";

  if (!isObjA && !isObjB) {
    if (!Object.is(oldV ?? "", newV ?? "")) out.push({ path, oldVal: oldV, newVal: newV });
    return out;
  }

  if (isObjA !== isObjB || Array.isArray(oldV) !== Array.isArray(newV)) {
    out.push({ path, oldVal: oldV, newVal: newV });
    return out;
  }

  if (Array.isArray(oldV)) {
    const len = Math.max(oldV.length, newV.length);
    for (let i = 0; i < len; i++) {
      diffPayloads(oldV[i], newV[i], `${path}[${i}]`, out, depth + 1);
    }
    return out;
  }

  const keys = new Set([...Object.keys(oldV || {}), ...Object.keys(newV || {})]);
  keys.forEach((k) => {
    diffPayloads(oldV?.[k], newV?.[k], path ? `${path}.${k}` : k, out, depth + 1);
  });
  return out;
}

function fmtVal(v) {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "object") {
    const s = JSON.stringify(v);
    return s.length > 200 ? s.slice(0, 200) + "…" : s;
  }
  const s = String(v);
  return s.length > 200 ? s.slice(0, 200) + "…" : s || '""';
}

/* ============================ date helpers ============================ */
function fmtWhen(ts) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).format(new Date(ts));
  } catch {
    return String(ts || "—");
  }
}

/** describeReportType, memoized — the table calls it once per rendered cell. */
const TYPE_META_CACHE = new Map();
function typeMeta(type) {
  let m = TYPE_META_CACHE.get(type);
  if (!m) { m = describeReportType(type); TYPE_META_CACHE.set(type, m); }
  return m;
}

/** Elapsed time between two instants, spelled out: "6 h 13 min", "2 days 4 h".
 *  Returns "" when either side is missing or the gap is negative/nonsensical. */
function fmtElapsed(fromTs, toTs) {
  const a = new Date(fromTs).getTime();
  const b = new Date(toTs).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "";
  const ms = b - a;
  if (ms < 0) return "";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec} sec`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ${min % 60} min`;
  const day = Math.floor(hr / 24);
  if (day < 31) return `${day} day${day > 1 ? "s" : ""} ${hr % 24} h`;
  const mon = Math.floor(day / 30);
  return `${mon} month${mon > 1 ? "s" : ""} ${day % 30} day${day % 30 === 1 ? "" : "s"}`;
}

const PAGE = 100;

/* ============================ shared helpers ============================ */
const BORDER = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

function truncate(s, n = 600) {
  const t = String(s ?? "");
  return t.length > n ? t.slice(0, n) + "…" : t;
}

/** Human labels for the suspicion flags the server computed. */
const FLAG_META = {
  deleted:   { label: "Deletion",       ar: "حذف",            icon: "🗑️", color: "#b91c1c", bg: "#fee2e2", bd: "#fecaca" },
  backdated: { label: "Back-dated",     ar: "تعديل بأثر رجعي", icon: "⏳", color: "#9a3412", bg: "#ffedd5", bd: "#fed7aa" },
  offHours:  { label: "Outside hours",  ar: "خارج الدوام",     icon: "🌙", color: "#6d28d9", bg: "#ede9fe", bd: "#ddd6fe" },
  bulk:      { label: "Bulk activity",  ar: "نشاط جماعي",      icon: "⚡", color: "#b45309", bg: "#fef3c7", bd: "#fcd34d" },
};
const FLAG_ORDER = ["deleted", "backdated", "offHours", "bulk"];

/** Plain-language reason shown when a row is expanded. */
const FLAG_WHY = {
  deleted: "A record was permanently removed. Every deletion is flagged — the payload above is the only remaining copy.",
  backdated: "Changed more than 7 days after the date the record itself covers. Late edits to closed periods are the strongest audit red flag.",
  offHours: "Performed outside working hours (before 06:00, after 20:00, or on a weekend), Dubai time.",
  bulk: "Part of a burst — the same account made more than 10 changes within 5 minutes.",
};

function flagList(row) {
  return FLAG_ORDER.filter((k) => row?.flags?.[k]).map((k) => FLAG_META[k].label);
}
function flagKeys(row) {
  return FLAG_ORDER.filter((k) => row?.flags?.[k]);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const ACTION_META = {
  create: { label: "➕ CREATE", bg: "#dcfce7", fg: "#15803d", bd: "#bbf7d0" },
  update: { label: "✏️ EDIT",   bg: "#ffedd5", fg: "#9a3412", bd: "#fed7aa" },
  delete: { label: "🗑️ DELETE", bg: "#fee2e2", fg: "#b91c1c", bd: "#fecaca" },
};

/* ================================ page ================================ */
export default function AuditTrailView() {
  const navigate = useNavigate();
  const perms = getPerms();
  const isAdmin = perms.isAdmin || !!perms.user?.isSuperAdmin;

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [types, setTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null); // row id
  const [showCharts, setShowCharts] = useState(true);

  // filters
  const [action, setAction] = useState("");
  const [type, setType] = useState("");
  const [username, setUsername] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");                 // free-text search inside values
  const [suspicious, setSuspicious] = useState(false);

  /** Filters currently APPLIED (not what's typed in the boxes) — so exports,
   *  charts and "load more" always agree with the table on screen. */
  const [applied, setApplied] = useState({
    action: "", type: "", username: "", from: "", to: "", q: "", suspicious: false,
  });

  const buildQuery = (f, extra = {}) => {
    const p = new URLSearchParams();
    if (f.action) p.set("action", f.action);
    if (f.type) p.set("type", f.type);
    if (f.username?.trim()) p.set("username", f.username.trim());
    if (f.from) p.set("from", f.from);
    if (f.to) p.set("to", f.to);
    if (f.q?.trim()) p.set("q", f.q.trim());
    if (f.suspicious) p.set("suspicious", "1");
    Object.entries(extra).forEach(([k, v]) => p.set(k, String(v)));
    return p.toString();
  };

  async function load(f, offset = 0, append = false) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/audit?${buildQuery(f, { limit: PAGE, offset })}`,
        { cache: "no-store" }
      );
      if (res.status === 401) throw new Error("Session expired — please log in again.");
      if (res.status === 403) throw new Error("Admins only.");
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.rows) ? json.rows : [];
      setTotal(Number(json?.total) || 0);
      setRows((prev) => (append ? [...prev, ...list] : list));
    } catch (e) {
      console.error(e);
      setError(String(e?.message || e));
      if (!append) setRows([]);
    } finally {
      setLoading(false);
    }
  }

  /** Charts describe the WHOLE filtered set, not just the loaded page. */
  async function loadStats(f) {
    try {
      const res = await fetch(`${API_BASE}/api/audit/stats?${buildQuery(f)}`, { cache: "no-store" });
      if (!res.ok) return;
      setStats(await res.json());
    } catch { /* charts are optional — never block the table */ }
  }

  function run(f) {
    setApplied(f);
    setExpanded(null);
    load(f, 0, false);
    loadStats(f);
  }

  useEffect(() => {
    if (!isAdmin) return;
    run(applied);
    fetch(`${API_BASE}/api/audit/types`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setTypes(Array.isArray(j?.types) ? j.types : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const applyFilters = (e) => {
    e?.preventDefault?.();
    run({ action, type, username, from, to, q, suspicious });
  };

  const clearFilters = () => {
    setAction(""); setType(""); setUsername(""); setFrom(""); setTo(""); setQ(""); setSuspicious(false);
    run({ action: "", type: "", username: "", from: "", to: "", q: "", suspicious: false });
  };

  /** One-click: show only flagged entries (what an auditor opens first). */
  const showSuspiciousOnly = () => {
    setSuspicious(true);
    run({ action, type, username, from, to, q, suspicious: true });
  };

  const kpis = useMemo(() => {
    const creates = rows.filter((r) => r.action === "create").length;
    const edits = rows.filter((r) => r.action === "update").length;
    const dels = rows.filter((r) => r.action === "delete").length;
    const users = new Set(rows.map((r) => r.username)).size;
    return { creates, edits, dels, users };
  }, [rows]);

  const flaggedTotal = Number(stats?.flags?.any_flag) || 0;

  /* ===================== Exports (auditor evidence) ===================== */

  /** Pull the ENTIRE filtered set (not just the loaded page) for export —
   *  an auditor's copy must be complete, in pages of 500. */
  async function fetchAllForExport(f, cap = 20000) {
    const out = [];
    for (let offset = 0; offset < cap; offset += 500) {
      const res = await fetch(
        `${API_BASE}/api/audit?${buildQuery(f, { limit: 500, offset })}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.rows) ? json.rows : [];
      out.push(...list);
      if (list.length < 500 || out.length >= (Number(json?.total) || 0)) break;
    }
    return out;
  }

  async function handleExportExcel() {
    setExporting(true);
    setError("");
    try {
      const [ExcelJSModule, all] = await Promise.all([
        import("exceljs"),
        fetchAllForExport(applied),
      ]);
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;

      const wb = new ExcelJS.Workbook();
      wb.creator = "Al Mawashi — Audit Trail";
      wb.created = new Date();

      /* ---- Sheet 1: the change log ---- */
      const ws = wb.addWorksheet("Audit Trail", { views: [{ state: "frozen", ySplit: 6 }] });
      ws.columns = [
        { width: 22 }, { width: 18 }, { width: 12 }, { width: 32 },
        { width: 26 }, { width: 12 }, { width: 14 }, { width: 30 },
        { width: 44 }, { width: 44 }, { width: 20 }, { width: 18 },
      ];

      const NC = 12;
      ws.mergeCells(1, 1, 1, NC);
      const t = ws.getCell(1, 1);
      t.value = "TRANS EMIRATES LIVESTOCK TRADING L.L.C. — AL MAWASHI";
      t.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      t.alignment = { horizontal: "center", vertical: "middle" };
      t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      ws.getRow(1).height = 26;

      ws.mergeCells(2, 1, 2, NC);
      const t2 = ws.getCell(2, 1);
      t2.value = "AUDIT TRAIL — RECORD OF ALL CREATIONS, EDITS & DELETIONS";
      t2.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      t2.alignment = { horizontal: "center", vertical: "middle" };
      t2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
      ws.getRow(2).height = 22;

      ws.mergeCells(3, 1, 3, NC);
      ws.getCell(3, 1).value = "ISO 22000:2018 §7.5 Documented Information · FDA 21 CFR Part 11 (electronic records)";
      ws.getCell(3, 1).font = { italic: true, size: 10, color: { argb: "FF475569" } };
      ws.getCell(3, 1).alignment = { horizontal: "center" };

      const fDesc = [
        applied.action && `action=${applied.action}`,
        applied.type && `type=${applied.type}`,
        applied.username && `user=${applied.username}`,
        applied.from && `from=${applied.from}`,
        applied.to && `to=${applied.to}`,
        applied.q && `search="${applied.q}"`,
        applied.suspicious && "SUSPICIOUS ONLY",
      ].filter(Boolean).join("  |  ") || "no filter — full trail";

      ws.mergeCells(4, 1, 4, NC);
      ws.getCell(4, 1).value = `Filter: ${fDesc}`;
      ws.getCell(4, 1).font = { bold: true, size: 10, color: { argb: "FF0F766E" } };

      ws.mergeCells(5, 1, 5, NC);
      ws.getCell(5, 1).value =
        `Exported ${new Date().toLocaleString("en-GB")} by ${perms.user?.username || "admin"} — ${all.length} entries`;
      ws.getCell(5, 1).font = { size: 10, color: { argb: "FF475569" } };

      const HEAD = [
        "When", "Account", "Action", "Report name", "Report type", "Report ID", "Report date",
        "Field changed", "Old value", "New value", "Flags", "IP address",
      ];
      const hr = ws.getRow(6);
      HEAD.forEach((h, i) => {
        const c = hr.getCell(i + 1);
        c.value = h;
        c.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        c.border = BORDER;
      });
      hr.height = 26;

      let r = 7;
      all.forEach((row) => {
        const flags = flagList(row).join(", ");
        const reportDate =
          row.new_payload?.reportDate || row.old_payload?.reportDate || "";
        const diff = row.action === "update" ? diffPayloads(row.old_payload, row.new_payload) : [];

        // One spreadsheet line per changed field, so the log is filterable
        // and sortable in Excel — that is what an auditor actually does with it.
        const lines = diff.length
          ? diff.map((d) => [d.path, fmtVal(d.oldVal), fmtVal(d.newVal)])
          : [[
              row.action === "delete" ? "(whole record deleted)"
                : row.action === "create" ? "(record created)"
                : "(payload replaced)",
              row.action === "delete" ? truncate(JSON.stringify(row.old_payload)) : "",
              row.action === "create" ? truncate(JSON.stringify(row.new_payload)) : "",
            ]];

        lines.forEach(([field, oldV, newV], idx) => {
          const tm = typeMeta(row.report_type);
          const vals = [
            idx === 0 ? fmtWhen(row.created_at) : "",
            idx === 0 ? row.username : "",
            idx === 0 ? row.action.toUpperCase() : "",
            idx === 0 ? (tm.branch ? `${tm.branch} — ${tm.label}` : tm.label) : "",
            idx === 0 ? row.report_type : "",
            idx === 0 ? (row.report_id ?? "") : "",
            idx === 0 ? reportDate : "",
            field, oldV, newV,
            idx === 0 ? flags : "",
            idx === 0 ? (row.ip_addr || "") : "",
          ];
          const rr = ws.getRow(r);
          vals.forEach((v, i) => {
            const c = rr.getCell(i + 1);
            c.value = v;
            c.font = { size: 10 };
            c.alignment = { vertical: "top", wrapText: i >= 7 && i <= 9 };
            c.border = BORDER;
            if (i === 2 && v === "DELETE") c.font = { size: 10, bold: true, color: { argb: "FFB91C1C" } };
            if (i === 2 && v === "CREATE") c.font = { size: 10, bold: true, color: { argb: "FF15803D" } };
            if (i === 8 && v) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
            if (i === 9 && v) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
            if (i === 10 && v) c.font = { size: 10, bold: true, color: { argb: "FFB45309" } };
          });
          r++;
        });
      });

      ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: Math.max(6, r - 1), column: NC } };

      /* ---- Sheet 2: summary for the auditor's cover page ---- */
      const sum = wb.addWorksheet("Summary");
      sum.columns = [{ width: 34 }, { width: 18 }];
      const put = (label, value, bold) => {
        const row = sum.addRow([label, value]);
        row.getCell(1).font = { bold: !!bold, size: 11 };
        row.getCell(2).font = { bold: true, size: 11 };
        row.getCell(1).border = BORDER;
        row.getCell(2).border = BORDER;
      };
      put("AUDIT TRAIL SUMMARY", "", true);
      put("Filter", fDesc);
      put("Exported at", new Date().toLocaleString("en-GB"));
      put("Exported by", perms.user?.username || "admin");
      sum.addRow([]);
      put("Total entries", all.length, true);
      put("Creations", all.filter((x) => x.action === "create").length);
      put("Edits", all.filter((x) => x.action === "update").length);
      put("Deletions", all.filter((x) => x.action === "delete").length);
      put("Distinct accounts", new Set(all.map((x) => x.username)).size);
      sum.addRow([]);
      put("⚠ FLAGGED ENTRIES", all.filter((x) => flagList(x).length).length, true);
      put("• Deletions", all.filter((x) => x.flags?.deleted).length);
      put("• Back-dated changes", all.filter((x) => x.flags?.backdated).length);
      put("• Outside working hours", all.filter((x) => x.flags?.offHours).length);
      put("• Bulk activity bursts", all.filter((x) => x.flags?.bulk).length);

      const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
      downloadBlob(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `AlMawashi_AuditTrail_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (e) {
      console.error(e);
      setError("Excel export failed: " + String(e?.message || e));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPDF() {
    setExporting(true);
    setError("");
    try {
      const all = await fetchAllForExport(applied, 3000); // print-sane cap
      const esc = (s) =>
        String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const fDesc = [
        applied.action && `action = ${applied.action}`,
        applied.type && `type = ${applied.type}`,
        applied.username && `user = ${applied.username}`,
        applied.from && `from ${applied.from}`,
        applied.to && `to ${applied.to}`,
        applied.q && `search "${applied.q}"`,
        applied.suspicious && "SUSPICIOUS ONLY",
      ].filter(Boolean).join(" &nbsp;|&nbsp; ") || "no filter — full trail";

      const body = all.map((row) => {
        const diff = row.action === "update" ? diffPayloads(row.old_payload, row.new_payload) : [];
        const flags = flagList(row);
        const changes = diff.length
          ? `<table class="inner">${diff.slice(0, 25).map((d) => `
              <tr><td class="f">${esc(d.path)}</td>
                  <td class="o">${esc(fmtVal(d.oldVal))}</td>
                  <td class="n">${esc(fmtVal(d.newVal))}</td></tr>`).join("")}
             ${diff.length > 25 ? `<tr><td colspan="3" class="more">+ ${diff.length - 25} more field(s)</td></tr>` : ""}
             </table>`
          : row.action === "delete"
          ? `<div class="del">Whole record deleted</div>`
          : row.action === "create"
          ? `<div class="crt">Record created</div>`
          : `<div>Payload replaced</div>`;

        const tm = typeMeta(row.report_type);
        return `<tr class="${flags.length ? "flagged" : ""}">
          <td class="nw">${esc(fmtWhen(row.created_at))}</td>
          <td class="b">${esc(row.username)}</td>
          <td class="nw">${row.action.toUpperCase()}</td>
          <td><div class="b">${esc(tm.label)}</div>
              <div class="mono sub">${esc(tm.branch ? `${tm.branch} · ` : "")}${esc(row.report_type)}</div></td>
          <td>${esc(row.report_id)}</td>
          <td>${changes}</td>
          <td class="fl">${flags.map((f) => `<span>${esc(f)}</span>`).join(" ")}</td>
        </tr>`;
      }).join("");

      const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Audit Trail — Al Mawashi</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; font-family: Inter, Arial, sans-serif; }
  body { margin: 0; color: #0f172a; }
  .hdr { background: #0f172a; color: #fff; padding: 12px 16px; }
  .hdr h1 { margin: 0; font-size: 16px; }
  .hdr .sub { font-size: 11px; opacity: .85; margin-top: 4px; }
  .meta { background: #ccfbf1; border: 1px solid #99f6e4; padding: 8px 12px;
          font-size: 10.5px; font-weight: 700; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #334155; color: #fff; font-size: 9.5px; text-transform: uppercase;
             padding: 6px 5px; border: 1px solid #94a3b8; }
  tbody td { border: 1px solid #cbd5e1; padding: 5px; font-size: 9.5px; vertical-align: top; }
  tbody tr.flagged td { background: #fffbeb; }
  .nw { white-space: nowrap; } .b { font-weight: 800; }
  .mono { font-family: ui-monospace, Menlo, monospace; font-size: 9px; }
  .sub { color: #94a3b8; margin-top: 2px; }
  table.inner { width: 100%; }
  table.inner td { border: none; border-bottom: 1px dotted #e2e8f0; padding: 2px 3px; font-size: 9px; }
  .inner .f { font-family: ui-monospace, Menlo, monospace; color: #334155; width: 34%; }
  .inner .o { background: #fef2f2; color: #991b1b; font-weight: 700; width: 33%; }
  .inner .n { background: #f0fdf4; color: #166534; font-weight: 700; width: 33%; }
  .more { color: #64748b; font-style: italic; }
  .del { color: #b91c1c; font-weight: 800; } .crt { color: #15803d; font-weight: 800; }
  .fl span { display: inline-block; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d;
             border-radius: 8px; padding: 1px 5px; font-size: 8.5px; font-weight: 800; margin: 1px; }
  thead { display: table-header-group; } tr, td, th { break-inside: avoid; }
  .foot { margin-top: 10px; font-size: 9px; color: #64748b; text-align: center; }
</style></head><body>
  <div class="hdr">
    <h1>AUDIT TRAIL — TRANS EMIRATES LIVESTOCK TRADING L.L.C. (AL MAWASHI)</h1>
    <div class="sub">ISO 22000:2018 §7.5 Documented Information · FDA 21 CFR Part 11 — record of all creations, edits &amp; deletions</div>
  </div>
  <div class="meta">Filter: ${fDesc} &nbsp;·&nbsp; ${all.length} entries &nbsp;·&nbsp;
       Exported ${esc(new Date().toLocaleString("en-GB"))} by ${esc(perms.user?.username || "admin")}</div>
  <table>
    <thead><tr>
      <th style="width:11%">When</th><th style="width:8%">Account</th><th style="width:6%">Action</th>
      <th style="width:16%">Report</th><th style="width:5%">ID</th>
      <th style="width:47%">Change (field · old → new)</th><th style="width:11%">Flags</th>
    </tr></thead>
    <tbody>${body || `<tr><td colspan="7" style="text-align:center;padding:20px">No entries.</td></tr>`}</tbody>
  </table>
  <div class="foot">This document is a system-generated extract of the electronic audit trail. Entries cannot be edited from the application.</div>
  <script>window.onload = () => setTimeout(() => { window.focus(); window.print(); }, 250);</script>
</body></html>`;

      const w = window.open("", "_blank");
      if (!w) { setError("Popup blocked — allow popups for this site to export PDF."); return; }
      w.document.open(); w.document.write(html); w.document.close();
    } catch (e) {
      console.error(e);
      setError("PDF export failed: " + String(e?.message || e));
    } finally {
      setExporting(false);
    }
  }

  /* ---------------- non-admin guard ---------------- */
  if (!isAdmin) {
    return (
      <main style={S.shell}>
        <div style={{ ...S.card, maxWidth: 620, margin: "90px auto", textAlign: "center", padding: 44 }}>
          <div style={{ fontSize: 68 }}>🔒</div>
          <h2 style={{ margin: "16px 0 12px", fontSize: 34, fontWeight: 1000 }}>Admins only</h2>
          <p style={{ color: "#475569", fontWeight: 700, fontSize: 22, lineHeight: 1.6 }}>
            The audit trail is restricted to administrator accounts.
            <br />
            سجل التدقيق متاح لحسابات المدير فقط.
          </p>
          <button style={{ ...S.btnPrimary, marginTop: 18 }} onClick={() => navigate(-1)}>← Back</button>
        </div>
      </main>
    );
  }

  return (
    <main style={S.shell}>
      <style>{`
        @media (max-width: 1100px) {
          .audit-hero-inner { grid-template-columns: 1fr !important; }
          .audit-hero-stats { min-width: 0 !important; grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 720px) {
          .audit-hero-stats { grid-template-columns: 1fr !important; }
          .audit-raw-grid { grid-template-columns: 1fr !important; }
        }
        .audit-row:hover td { background: #f0fdfa; }
      `}</style>

      <div style={S.layout}>
        {/* ============ Hero ============ */}
        <section style={S.hero}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(820px 260px at 12% 0%, rgba(45,212,191,0.28), transparent 62%)," +
                "radial-gradient(760px 300px at 90% 20%, rgba(125,211,252,0.22), transparent 60%)",
            }}
          />
          <div className="audit-hero-inner" style={S.heroInner}>
            <div style={S.brand}>
              <img src={mawashiLogo} alt="Al Mawashi Logo" style={S.logo} />
              <div style={{ minWidth: 0 }}>
                <p style={S.eyebrow}>TRANS EMIRATES LIVESTOCK TRADING L.L.C.</p>
                <h1 style={S.heroTitle}>🕵️ Audit Trail — سجل التعديلات والحذف</h1>
                <p style={S.heroSub}>
                  ISO 22000 §7.5 · FDA 21 CFR Part 11 — every edit &amp; delete across the system:
                  which account, when, and the old value → the new value.
                </p>
              </div>
            </div>

            <div className="audit-hero-stats" style={S.heroStats}>
              <div style={S.stat}>
                <div style={S.statValue}>{total}</div>
                <div style={S.statLabel}>Total entries</div>
              </div>
              <div style={S.stat}>
                <div style={S.statValue}>{kpis.users}</div>
                <div style={S.statLabel}>Accounts</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ Action bar ============ */}
        <div style={S.actionBar}>
          <button style={S.btnPrimary} onClick={() => run(applied)} disabled={loading}>
            {loading ? "Loading…" : "🔄 Refresh"}
          </button>
          <button style={S.btnGhost} onClick={handleExportExcel} disabled={exporting || loading}>
            {exporting ? "Exporting…" : "📊 Export Excel"}
          </button>
          <button style={S.btnGhost} onClick={handleExportPDF} disabled={exporting || loading}>
            {exporting ? "Exporting…" : "🖨️ Export PDF"}
          </button>
          <button style={S.btnGhost} onClick={() => setShowCharts((v) => !v)}>
            {showCharts ? "📈 Hide charts" : "📈 Show charts"}
          </button>
          <button style={S.btnGhost} onClick={() => navigate(-1)}>← Back to hub</button>
        </div>

        {/* ============ Suspicious banner ============ */}
        {flaggedTotal > 0 && !applied.suspicious && (
          <div style={S.alertBanner}>
            <span style={{ fontSize: 30 }}>🚩</span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 1000, fontSize: 21 }}>
                {flaggedTotal} entr{flaggedTotal === 1 ? "y" : "ies"} flagged for review
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, marginTop: 6, opacity: 0.9 }}>
                Deletions, back-dated changes, activity outside working hours, or bulk bursts —
                the patterns an external auditor looks for first.
              </div>
            </div>
            <button style={S.btnWarn} onClick={showSuspiciousOnly}>Show flagged only →</button>
          </div>
        )}

        {/* ============ KPIs ============ */}
        <div style={S.kpiRow}>
          <KPI label="Total entries (filtered)" value={total} icon="🗂️" tone="teal" />
          <KPI label="Creations (this page)" value={kpis.creates} icon="➕" tone="green" />
          <KPI label="Edits (this page)" value={kpis.edits} icon="✏️" tone="amber" />
          <KPI label="Deletes (this page)" value={kpis.dels} icon="🗑️" tone="red" />
          <KPI label="Flagged (all filtered)" value={flaggedTotal} icon="🚩" tone="violet" />
        </div>

        {/* ============ Charts ============ */}
        {showCharts && stats && <Charts stats={stats} />}

        {/* ============ Filters ============ */}
        <form onSubmit={applyFilters} style={S.filterCard}>
          {/* Value search — the question an auditor actually asks:
              "who changed a temperature to 9.4?" */}
          <Field label="Search inside values (old &amp; new)">
            <input
              style={{ ...S.input, fontSize: 22 }}
              placeholder='e.g.  9.4   ·   "AM-RET-000087"   ·   Ahmad   ·   rejected'
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Field>

          <div style={{ ...S.filterGrid, marginTop: 18 }}>
            <Field label="Action">
              <select style={S.input} value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="">All actions</option>
                <option value="create">➕ Creations only</option>
                <option value="update">✏️ Edits only</option>
                <option value="delete">🗑️ Deletes only</option>
              </select>
            </Field>

            <Field label="Report type">
              <select style={S.input} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All report types</option>
                {types.map((t) => (
                  <option key={t.report_type} value={t.report_type}>
                    {t.report_type} ({t.n})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Account">
              <input
                style={S.input}
                placeholder="Username…"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>

            <Field label="From date">
              <input type="date" style={S.input} value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>

            <Field label="To date">
              <input type="date" style={S.input} value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18, alignItems: "center" }}>
            <button type="submit" style={S.btnPrimary} disabled={loading}>Apply filters</button>
            <button type="button" style={S.btnGhost} onClick={clearFilters}>Clear</button>

            <label style={{ ...S.toggle, ...(suspicious ? S.toggleOn : null) }}>
              <input
                type="checkbox"
                checked={suspicious}
                onChange={(e) => setSuspicious(e.target.checked)}
                style={{ width: 22, height: 22, accentColor: "#b45309" }}
              />
              🚩 Suspicious entries only
            </label>
          </div>
        </form>

        {error && <div style={S.errorBox}>⚠️ {error}</div>}

        {/* ============ Table ============ */}
        <section style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={S.tableHead}>
            <span>Change log</span>
            <span style={S.tableHeadCount}>
              {rows.length} of {total}
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>When</th>
                  <th style={S.th}>Account</th>
                  <th style={S.th}>Action</th>
                  <th style={S.th}>Report</th>
                  <th style={S.th}>Report ID</th>
                  <th style={S.th}>Changes</th>
                  <th style={S.th}>Flags</th>
                  <th style={{ ...S.th, width: 60 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOpen = expanded === r.id;
                  const diff = r.action === "update" ? diffPayloads(r.old_payload, r.new_payload) : [];
                  const fk = flagKeys(r);
                  const am = ACTION_META[r.action] || ACTION_META.update;
                  // Flagged rows get an amber wash so they stand out while scrolling.
                  const cell = {
                    ...S.td,
                    ...(fk.length ? S.tdFlagged : null),
                    ...(isOpen ? S.tdOpen : null),
                  };
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        className="audit-row"
                        style={{ cursor: "pointer" }}
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                      >
                        <td style={{ ...cell, whiteSpace: "nowrap" }}>{fmtWhen(r.created_at)}</td>
                        <td style={{ ...cell, fontWeight: 900 }}>{r.username}</td>
                        <td style={cell}>
                          <span style={{
                            display: "inline-block", borderRadius: 999, padding: "8px 18px",
                            fontWeight: 950, fontSize: 18, whiteSpace: "nowrap",
                            background: am.bg, color: am.fg, border: `1px solid ${am.bd}`,
                          }}>
                            {am.label}
                          </span>
                        </td>
                        <td style={cell}>
                          <div style={{ fontWeight: 900, fontSize: 19, color: "#0f172a" }}>
                            {typeMeta(r.report_type).emoji} {typeMeta(r.report_type).label}
                          </div>
                          <div style={{
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 14, color: "#94a3b8", fontWeight: 700, marginTop: 3,
                          }}>
                            {typeMeta(r.report_type).branch ? `${typeMeta(r.report_type).branch} · ` : ""}{r.report_type}
                          </div>
                        </td>
                        <td style={cell}>{r.report_id ?? "—"}</td>
                        <td style={cell}>
                          {r.action === "delete"
                            ? "record removed"
                            : r.action === "create"
                            ? "record created"
                            : diff.length
                            ? `${diff.length} field${diff.length > 1 ? "s" : ""} changed`
                            : "payload replaced"}
                        </td>
                        <td style={cell}>
                          {fk.length ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {fk.map((k) => {
                                const m = FLAG_META[k];
                                return (
                                  <span key={k} title={m.ar} style={{
                                    background: m.bg, color: m.color, border: `1px solid ${m.bd}`,
                                    borderRadius: 999, padding: "6px 12px",
                                    fontSize: 15, fontWeight: 950, whiteSpace: "nowrap",
                                  }}>
                                    {m.icon} {m.label}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontWeight: 800 }}>—</span>
                          )}
                        </td>
                        <td style={{ ...cell, color: "#0f766e", fontWeight: 1000, fontSize: 24, textAlign: "center" }}>
                          {isOpen ? "▲" : "▼"}
                        </td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0, border: "none" }}>
                            <DetailPanel row={r} diff={diff} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {!rows.length && !loading && (
                  <tr>
                    <td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#64748b", padding: 48, fontWeight: 700 }}>
                      No audit entries match the current filter.
                      <div style={{ fontSize: 19, marginTop: 12, opacity: 0.85 }}>
                        Entries are recorded from the moment this feature was deployed — earlier history does not exist.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {rows.length < total && (
            <div style={{ textAlign: "center", padding: 20, borderTop: "1px solid rgba(15,23,42,0.09)" }}>
              <button style={S.btnPrimary} disabled={loading} onClick={() => load(applied, rows.length, true)}>
                {loading ? "Loading…" : `Load more (${rows.length} / ${total})`}
              </button>
            </div>
          )}
        </section>

        <footer style={S.footer}>
          © Al Mawashi — Audit Trail · records retained per ISO 22000 §7.5 documented-information requirements
        </footer>
      </div>
    </main>
  );
}

/* ============================ sub-components ============================ */
function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 8, minWidth: 0 }}>
      <span style={S.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

const TONES = {
  teal:   { fg: "#0f766e", bg: "#ccfbf1", bd: "#99f6e4" },
  green:  { fg: "#15803d", bg: "#dcfce7", bd: "#bbf7d0" },
  amber:  { fg: "#b45309", bg: "#ffedd5", bd: "#fed7aa" },
  red:    { fg: "#b91c1c", bg: "#fee2e2", bd: "#fecaca" },
  violet: { fg: "#6d28d9", bg: "#ede9fe", bd: "#ddd6fe" },
  slate:  { fg: "#334155", bg: "#f1f5f9", bd: "#e2e8f0" },
};

function KPI({ label, value, icon, tone }) {
  const t = TONES[tone] || TONES.slate;
  return (
    <div style={{ ...S.card, padding: "24px 26px", display: "flex", alignItems: "center", gap: 20 }}>
      <div style={{
        width: 68, height: 68, borderRadius: 8, display: "grid", placeItems: "center",
        fontSize: 34, background: t.bg, border: `1px solid ${t.bd}`, color: t.fg, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 42, fontWeight: 1000, color: "#0f172a", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#64748b", marginTop: 10 }}>{label}</div>
      </div>
    </div>
  );
}

/* ------------------------------ charts ------------------------------ */
/* Hand-rolled inline SVG — no chart library, consistent with the rest of
   the app, and nothing extra in the bundle. */

const C_CREATE = "#15803d";
const C_UPDATE = "#d97706";
const C_DELETE = "#dc2626";

function DailyActivityChart({ daily }) {
  const data = Array.isArray(daily) ? daily : [];
  if (!data.length) return <ChartEmpty text="No activity in this period." />;

  const W = 900, H = 260, PAD_L = 54, PAD_B = 54, PAD_T = 16, PAD_R = 12;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const totals = data.map((d) => (d.creates || 0) + (d.updates || 0) + (d.deletes || 0));
  const max = Math.max(...totals, 1);
  const niceMax = Math.ceil(max / 5) * 5 || 5;

  const slot = plotW / data.length;
  const barW = Math.max(6, Math.min(46, slot * 0.62));

  const yOf = (v) => PAD_T + plotH - (v / niceMax) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));

  // Label every Nth day so the axis never collides on long ranges.
  const step = Math.ceil(data.length / 12);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={yOf(t)} x2={W - PAD_R} y2={yOf(t)} stroke="#e2e8f0" strokeWidth="1" />
          <text x={PAD_L - 10} y={yOf(t) + 5} textAnchor="end" fontSize="15" fontWeight="800" fill="#64748b">{t}</text>
        </g>
      ))}

      {data.map((d, i) => {
        const x = PAD_L + i * slot + (slot - barW) / 2;
        const c = d.creates || 0, u = d.updates || 0, del = d.deletes || 0;
        const hC = (c / niceMax) * plotH, hU = (u / niceMax) * plotH, hD = (del / niceMax) * plotH;
        let y = PAD_T + plotH;
        const segs = [];
        [[c, hC, C_CREATE], [u, hU, C_UPDATE], [del, hD, C_DELETE]].forEach(([val, h, col], k) => {
          if (val > 0) { y -= h; segs.push(<rect key={k} x={x} y={y} width={barW} height={Math.max(2, h)} fill={col} rx="2" />); }
        });
        const day = String(d.day || "").slice(5, 10); // "YYYY-MM-DD" → "MM-DD"
        return (
          <g key={i}>
            {segs}
            <title>{`${String(d.day).slice(0, 10)} — created ${c}, edited ${u}, deleted ${del}`}</title>
            {i % step === 0 && (
              <text x={x + barW / 2} y={H - PAD_B + 24} textAnchor="middle" fontSize="14" fontWeight="800" fill="#64748b">
                {day}
              </text>
            )}
          </g>
        );
      })}

      <line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} stroke="#94a3b8" strokeWidth="1.5" />
    </svg>
  );
}

function BarList({ items, labelKey, valueKey, subKey, subLabel, color }) {
  const data = Array.isArray(items) ? items : [];
  if (!data.length) return <ChartEmpty text="No data." />;
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        const sub = subKey ? Number(d[subKey]) || 0 : 0;
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
              <span style={{
                fontWeight: 900, fontSize: 18, color: "#0f172a",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {String(d[labelKey] ?? "—")}
              </span>
              <span style={{ fontWeight: 1000, fontSize: 18, color, whiteSpace: "nowrap" }}>
                {v}
                {sub > 0 && (
                  <span style={{ color: C_DELETE, fontSize: 15, marginInlineStart: 8 }}>
                    ({sub} {subLabel})
                  </span>
                )}
              </span>
            </div>
            <div style={{ background: "#f1f5f9", borderRadius: 999, height: 14, overflow: "hidden" }}>
              <div style={{
                width: `${(v / max) * 100}%`, height: "100%",
                background: color, borderRadius: 999, transition: "width .3s ease",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChartEmpty({ text }) {
  return (
    <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontWeight: 800, fontSize: 18 }}>
      {text}
    </div>
  );
}

function Charts({ stats }) {
  const f = stats?.flags || {};
  const riskItems = [
    { k: "Deletions", n: Number(f.deletes) || 0, m: FLAG_META.deleted },
    { k: "Back-dated changes", n: Number(f.backdated) || 0, m: FLAG_META.backdated },
    { k: "Outside working hours", n: Number(f.offhours) || 0, m: FLAG_META.offHours },
    { k: "Bulk activity bursts", n: Number(f.bulk) || 0, m: FLAG_META.bulk },
  ];

  return (
    <div style={{ display: "grid", gap: 18, marginBottom: 22 }}>
      <section style={S.card}>
        <div style={S.tableHead}>
          <span>📈 Activity per day — last {stats?.days ?? 30} days</span>
          <span style={{ display: "flex", gap: 18, fontSize: 16, fontWeight: 900 }}>
            <Legend color={C_CREATE} label="Created" />
            <Legend color={C_UPDATE} label="Edited" />
            <Legend color={C_DELETE} label="Deleted" />
          </span>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <DailyActivityChart daily={stats?.daily} />
        </div>
      </section>

      <div style={S.chartRow}>
        <section style={S.card}>
          <div style={S.tableHead}><span>👤 Most active accounts</span></div>
          <div style={{ padding: "20px 24px" }}>
            <BarList
              items={stats?.topUsers} labelKey="username" valueKey="n"
              subKey="deletes" subLabel="deleted" color="#0f766e"
            />
          </div>
        </section>

        <section style={S.card}>
          <div style={S.tableHead}><span>📄 Most-changed report types</span></div>
          <div style={{ padding: "20px 24px" }}>
            <BarList items={stats?.topTypes} labelKey="report_type" valueKey="n" color="#7c3aed" />
          </div>
        </section>

        <section style={S.card}>
          <div style={S.tableHead}><span>🚩 Risk breakdown</span></div>
          <div style={{ padding: "20px 24px", display: "grid", gap: 14 }}>
            {riskItems.map((r) => (
              <div key={r.k} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
                background: r.n > 0 ? r.m.bg : "#f8fafc",
                border: `1px solid ${r.n > 0 ? r.m.bd : "#e2e8f0"}`,
                borderRadius: 8, padding: "14px 18px",
              }}>
                <span style={{ fontWeight: 900, fontSize: 18, color: r.n > 0 ? r.m.color : "#64748b" }}>
                  {r.m.icon} {r.k}
                </span>
                <span style={{ fontWeight: 1000, fontSize: 26, color: r.n > 0 ? r.m.color : "#94a3b8" }}>
                  {r.n}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#475569" }}>
      <span style={{ width: 15, height: 15, borderRadius: 3, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

/** Resolve, for one audit row, when the underlying REPORT was first created and
 *  how many changes it has seen — the two facts the audit row itself can't tell
 *  you. Creation time comes from the reports table (authoritative, survives
 *  records that predate the audit log); if the record was since deleted, we fall
 *  back to the `create` entry in the audit log. */
function useRecordTimeline(row) {
  const reportId = row?.report_id;
  const [state, setState] = useState({ loading: false, createdAt: null, createdBy: "", source: "", history: null });

  useEffect(() => {
    if (!reportId) { setState({ loading: false, createdAt: null, createdBy: "", source: "", history: null }); return; }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    (async () => {
      let createdAt = null;
      let createdBy = "";
      let source = "";
      let history = null;

      /* Full audit history for this one report — gives the change count, this
         row's position in it, and a creation fallback. */
      try {
        const res = await fetch(
          `${API_BASE}/api/audit?reportId=${encodeURIComponent(reportId)}&limit=500`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json?.rows) ? json.rows : [];
          // Server returns newest-first; walk oldest-first for a timeline.
          history = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          const createRow = history.find((h) => h.action === "create");
          if (createRow) { createdAt = createRow.created_at; createdBy = createRow.username || ""; source = "audit"; }
        }
      } catch { /* history is a bonus — never block the panel */ }

      /* Reports table wins when available: it knows the true creation time even
         for records created before the audit log existed. */
      try {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(reportId)}`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const rep = json?.report || json;
          if (rep?.created_at) {
            createdAt = rep.created_at;
            source = "reports";
            if (!createdBy) createdBy = rep.reporter || "";
          }
        } else if (res.status === 404) {
          source = source || "deleted";
        }
      } catch { /* keep whatever the audit log gave us */ }

      if (!cancelled) setState({ loading: false, createdAt, createdBy, source, history });
    })();

    return () => { cancelled = true; };
  }, [reportId]);

  return state;
}

function TimelineLine({ icon, label, value, sub, color }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
      <span style={{ fontSize: 21, width: 30, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontWeight: 900, fontSize: 18, color: "#475569", minWidth: 150 }}>{label}</span>
      <span style={{ fontWeight: 1000, fontSize: 20, color: color || "#0f172a" }}>{value}</span>
      {sub ? <span style={{ fontSize: 17, fontWeight: 750, color: "#64748b" }}>{sub}</span> : null}
    </div>
  );
}

function DetailPanel({ row, diff }) {
  const [showRaw, setShowRaw] = useState(false);
  const meta = typeMeta(row.report_type);
  const tl = useRecordTimeline(row);

  const reportDate = row.new_payload?.reportDate || row.old_payload?.reportDate || "";
  const gap = tl.createdAt ? fmtElapsed(tl.createdAt, row.created_at) : "";
  const changeIdx = tl.history
    ? tl.history.findIndex((h) => h.id === row.id) + 1
    : 0;
  const changeTotal = tl.history ? tl.history.length : 0;

  return (
    <div style={S.detail}>
      {/* ── WHICH record is this, and what happened to it, in plain terms ── */}
      <div style={S.identityCard}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <span style={{ fontSize: 30 }}>{meta.emoji}</span>
          <div>
            <div style={{ fontWeight: 1000, fontSize: 26, color: "#0f172a", lineHeight: 1.2 }}>
              {meta.label}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#64748b", marginTop: 4 }}>
              {meta.branch ? `${meta.branch} · ` : ""}Report #{row.report_id ?? "—"}
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", marginInlineStart: 10 }}>
                {row.report_type}
              </span>
            </div>
          </div>
          {reportDate && (
            <span style={{ ...S.metaChip, marginInlineStart: "auto" }}>
              📅 Covers: {reportDate}
            </span>
          )}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <TimelineLine
            icon="➕"
            label="Record created"
            value={
              tl.loading ? "checking…"
                : tl.createdAt ? fmtWhen(tl.createdAt)
                : "unknown"
            }
            sub={
              tl.loading ? ""
                : tl.createdAt
                ? `${tl.createdBy ? `by ${tl.createdBy}` : ""}${tl.source === "audit" ? " (from audit log)" : ""}`
                : tl.source === "deleted"
                ? "record no longer exists and no creation entry was logged"
                : "predates the audit log"
            }
            color="#15803d"
          />
          <TimelineLine
            icon={row.action === "delete" ? "🗑️" : row.action === "create" ? "➕" : "✏️"}
            label={row.action === "delete" ? "Deleted" : row.action === "create" ? "This entry" : "This edit"}
            value={fmtWhen(row.created_at)}
            sub={`by ${row.username || "—"}`}
            color={row.action === "delete" ? "#b91c1c" : "#0f766e"}
          />
          {gap && row.action !== "create" && (
            <TimelineLine
              icon="⏱️"
              label="Time since creation"
              value={gap}
              sub="between the record being created and this change"
              color="#b45309"
            />
          )}
          {changeTotal > 0 && (
            <TimelineLine
              icon="🔁"
              label="Change history"
              value={`${changeTotal} logged change${changeTotal > 1 ? "s" : ""}`}
              sub={changeIdx > 0 ? `this is #${changeIdx} of ${changeTotal}` : ""}
              color="#7c3aed"
            />
          )}
        </div>
      </div>

      <div style={S.metaRow}>
        <span style={S.metaChip}>🌐 {row.route || "—"}</span>
        <span style={S.metaChip}>📍 IP: {row.ip_addr || "—"}</span>
        <span style={S.metaChip}>🆔 Audit #{row.id}</span>
        {(row.new_payload?.reportDate || row.old_payload?.reportDate) && (
          <span style={S.metaChip}>
            📅 Report date: {row.new_payload?.reportDate || row.old_payload?.reportDate}
          </span>
        )}
        {(row.new_payload?.refNo || row.old_payload?.refNo) && (
          <span style={S.metaChip}>
            🔖 {row.new_payload?.refNo || row.old_payload?.refNo}
          </span>
        )}
      </div>

      {/* Why this row was flagged — spelled out, not just a badge */}
      {flagKeys(row).length > 0 && (
        <div style={S.flagPanel}>
          <div style={{ fontWeight: 1000, fontSize: 20, color: "#92400e", marginBottom: 12 }}>
            🚩 Flagged for review
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {flagKeys(row).map((k) => {
              const m = FLAG_META[k];
              return (
                <div key={k} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontWeight: 950, fontSize: 18, color: m.color }}>
                      {m.label} — {m.ar}
                    </div>
                    <div style={{ fontSize: 16.5, color: "#78350f", fontWeight: 700, marginTop: 3 }}>
                      {FLAG_WHY[k]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {row.action === "create" && (
        <div style={{ fontWeight: 900, color: "#15803d", fontSize: 21, marginBottom: 14 }}>
          ➕ Record created{row.new_payload?.reportDate ? ` for ${row.new_payload.reportDate}` : ""}.
          <div style={{ fontSize: 17, color: "#475569", fontWeight: 700, marginTop: 8 }}>
            Creation entries store metadata only — the created record itself still lives in the
            reports table, so it is never duplicated here. Any later edit or deletion carries the
            full before-state.
          </div>
        </div>
      )}

      {row.action === "delete" ? (
        <>
          <div style={{ fontWeight: 1000, color: "#b91c1c", marginBottom: 14, fontSize: 23 }}>
            🗑️ Deleted record — full payload at the moment of deletion:
          </div>
          <pre style={S.pre}>{JSON.stringify(row.old_payload, null, 2)}</pre>
        </>
      ) : diff.length ? (
        <>
          <div style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: "34%" }}>Field</th>
                  <th style={{ ...S.th, width: "33%", color: "#b91c1c" }}>Old value</th>
                  <th style={{ ...S.th, width: "33%", color: "#15803d" }}>New value</th>
                </tr>
              </thead>
              <tbody>
                {diff.map((d, i) => (
                  <tr key={i}>
                    <td style={{ ...S.td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 19, fontWeight: 700 }}>
                      {d.path || "(root)"}
                    </td>
                    <td style={{ ...S.td, background: "#fef2f2", color: "#991b1b", fontWeight: 900, fontSize: 24 }}>{fmtVal(d.oldVal)}</td>
                    <td style={{ ...S.td, background: "#f0fdf4", color: "#166534", fontWeight: 900, fontSize: 24 }}>{fmtVal(d.newVal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button style={S.btnGhost} onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? "Hide raw payloads" : "Show raw payloads (old / new)"}
          </button>

          {showRaw && (
            <div className="audit-raw-grid" style={S.rawGrid}>
              <div>
                <div style={{ ...S.rawLabel, color: "#b91c1c" }}>OLD</div>
                <pre style={S.pre}>{JSON.stringify(row.old_payload, null, 2)}</pre>
              </div>
              <div>
                <div style={{ ...S.rawLabel, color: "#15803d" }}>NEW</div>
                <pre style={S.pre}>{JSON.stringify(row.new_payload, null, 2)}</pre>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ color: "#475569", fontWeight: 800, marginBottom: 14, fontSize: 21 }}>
            Payload was replaced (no field-level diff available — e.g. the old snapshot is missing).
          </div>
          <div className="audit-raw-grid" style={S.rawGrid}>
            <div>
              <div style={{ ...S.rawLabel, color: "#b91c1c" }}>OLD</div>
              <pre style={S.pre}>{JSON.stringify(row.old_payload, null, 2)}</pre>
            </div>
            <div>
              <div style={{ ...S.rawLabel, color: "#15803d" }}>NEW</div>
              <pre style={S.pre}>{JSON.stringify(row.new_payload, null, 2)}</pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================ styles ================================ */
const S = {
  shell: {
    minHeight: "100vh",
    padding: "24px clamp(18px, 3vw, 48px) 48px",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#0f172a",
  },
  // `zoom` scales text AND spacing together, so every size below stays in
  // proportion. 1.2 bakes in the comfortable reading size (was the font stepper).
  layout: { width: "min(1760px, 100%)", margin: "0 auto", zoom: 1.2 },

  /* Hero */
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
    padding: "30px clamp(22px, 4vw, 56px)",
    background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,118,110,0.94) 52%, rgba(8,145,178,0.92))",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.20)",
    boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
  },
  heroInner: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 26,
  },
  brand: { display: "flex", alignItems: "center", gap: 18, minWidth: 0 },
  logo: {
    width: 82, height: 82, borderRadius: 8, objectFit: "cover",
    border: "1px solid rgba(255,255,255,0.34)", background: "#fff",
    boxShadow: "0 16px 30px rgba(0,0,0,0.25)", flexShrink: 0,
  },
  eyebrow: {
    margin: 0, fontSize: 16, fontWeight: 900,
    color: "rgba(255,255,255,0.78)", letterSpacing: "0.08em", textTransform: "uppercase",
  },
  heroTitle: { margin: "12px 0 0", fontSize: 40, fontWeight: 1000, lineHeight: 1.12 },
  heroSub: {
    margin: "16px 0 0", maxWidth: 1040, fontSize: 21,
    color: "rgba(255,255,255,0.85)", lineHeight: 1.55, fontWeight: 700,
  },
  heroStats: {
    display: "grid", gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
    gap: 14, minWidth: 400,
  },
  stat: {
    borderRadius: 8, padding: "22px 24px",
    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)",
    backdropFilter: "blur(12px)",
  },
  statValue: { fontSize: 48, fontWeight: 1000, lineHeight: 1 },
  statLabel: { marginTop: 12, fontSize: 18, color: "rgba(255,255,255,0.78)", fontWeight: 800 },

  /* Action bar */
  actionBar: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "22px 0" },

  /* KPI grid */
  kpiRow: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18, marginBottom: 22,
  },

  /* Cards */
  card: {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
  },

  /* Filters */
  filterCard: {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    padding: "24px 26px",
    marginBottom: 22,
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 16,
  },
  fieldLabel: {
    fontSize: 16, fontWeight: 950, color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.06em",
  },
  input: {
    width: "100%", minWidth: 0, minHeight: 60,
    padding: "14px 18px", borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    fontWeight: 800, fontSize: 21, background: "#fff",
    color: "#0f172a", fontFamily: "inherit", outline: "none",
  },

  /* Buttons */
  btnPrimary: {
    minHeight: 60, padding: "14px 30px", borderRadius: 8,
    border: "1px solid #0f766e", background: "#0f766e", color: "#fff",
    fontWeight: 950, fontSize: 21, cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 14px 28px rgba(15,118,110,0.22)",
  },
  btnGhost: {
    minHeight: 60, padding: "14px 26px", borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)", background: "#fff", color: "#334155",
    fontWeight: 950, fontSize: 21, cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 10px 20px rgba(15,23,42,0.07)",
  },

  errorBox: {
    background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b",
    borderRadius: 8, padding: "18px 22px", fontWeight: 900, fontSize: 21, marginBottom: 22,
  },

  /* Table */
  tableHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 26px", borderBottom: "1px solid rgba(15,23,42,0.09)",
    fontSize: 24, fontWeight: 1000, color: "#0f172a",
  },
  tableHeadCount: { fontSize: 19, fontWeight: 900, color: "#0f766e" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    background: "#f1f5f9", color: "#334155", fontWeight: 950, fontSize: 18,
    textTransform: "uppercase", letterSpacing: ".05em",
    padding: "18px 22px", borderBottom: "1px solid rgba(15,23,42,0.10)", textAlign: "left",
  },
  td: {
    padding: "20px 22px", borderBottom: "1px solid rgba(15,23,42,0.07)",
    fontSize: 22, verticalAlign: "top", color: "#0f172a", lineHeight: 1.45,
  },
  tdOpen: { background: "#f0fdfa" },
  tdFlagged: { background: "#fffbeb" },

  /* Suspicious banner */
  alertBanner: {
    display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
    background: "linear-gradient(135deg, #fef3c7, #fffbeb)",
    border: "1px solid #fcd34d", borderLeft: "6px solid #d97706",
    borderRadius: 8, padding: "20px 24px", marginBottom: 22,
    color: "#78350f", boxShadow: "0 12px 30px rgba(217,119,6,0.14)",
  },
  btnWarn: {
    minHeight: 60, padding: "14px 26px", borderRadius: 8,
    border: "1px solid #b45309", background: "#b45309", color: "#fff",
    fontWeight: 950, fontSize: 19, cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 14px 28px rgba(180,83,9,0.24)", whiteSpace: "nowrap",
  },

  /* Suspicious-only toggle */
  toggle: {
    display: "inline-flex", alignItems: "center", gap: 12,
    minHeight: 60, padding: "12px 22px", borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)", background: "#fff",
    fontWeight: 950, fontSize: 19, color: "#334155", cursor: "pointer",
  },
  toggleOn: {
    background: "#fef3c7", borderColor: "#d97706", color: "#92400e",
    boxShadow: "0 10px 20px rgba(217,119,6,0.16)",
  },

  /* Charts */
  chartRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: 18,
  },

  /* Flag explanation inside the expanded row */
  flagPanel: {
    background: "#fffbeb", border: "1px solid #fcd34d", borderLeft: "6px solid #d97706",
    borderRadius: 8, padding: "18px 22px", marginBottom: 20,
  },


  /* Expanded detail */
  detail: {
    background: "#f8fafc",
    borderBottom: "2px solid #99f6e4",
    padding: "24px clamp(18px, 3vw, 32px)",
  },
  /* "What record is this and when did it happen" — first thing in the panel. */
  identityCard: {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    borderLeft: "6px solid #0f766e",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    padding: "20px 24px",
    marginBottom: 20,
  },
  metaRow: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 },
  metaChip: {
    background: "#fff", border: "1px solid rgba(15,23,42,0.12)", borderRadius: 999,
    padding: "10px 20px", fontSize: 18, fontWeight: 850, color: "#475569",
  },
  rawGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 },
  rawLabel: { fontWeight: 1000, fontSize: 20, marginBottom: 10, letterSpacing: "0.06em" },
  pre: {
    background: "#0f172a", color: "#e2e8f0", borderRadius: 8,
    padding: 22, fontSize: 17, lineHeight: 1.7, overflow: "auto",
    maxHeight: 500, margin: 0,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },

  footer: {
    marginTop: 32, textAlign: "center",
    color: "#64748b", fontWeight: 800, fontSize: 17,
  },
};
