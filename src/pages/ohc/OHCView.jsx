// src/pages/ohc/OHCView.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ========= API ========= */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    (process.env?.REACT_APP_API_URL ||
      process.env?.VITE_API_URL ||
      process.env?.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "ohc_certificate";

/* ضغط الصور */
const MAX_IMG_DIM = 1280;
const IMG_QUALITY = 0.8;

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

const BRANCHES = [
  "QCS",
  "POS 6",
  "POS 7",
  "POS 10",
  "POS 11",
  "POS 14",
  "POS 15",
  "POS 16",
  "POS 17",
  "POS 19",
  "POS 21",
  "POS 24",
  "POS 25",
  "POS 37",
  "POS 38",
  "POS 42",
  "POS 44",
  "POS 45",
];

/* ========= Utils ========= */
function toIsoYMD(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // YYYY-MM-DD
  const isoTime = s.match(/^(\d{4})-(\d{2})-(\d{2})T/); // 2025-11-03T..
  if (isoTime) return `${isoTime[1]}-${isoTime[2]}-${isoTime[3]}`;
  const dmY = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+.*)?$/); // DD/MM/YYYY
  if (dmY) return `${dmY[3]}-${dmY[2]}-${dmY[1]}`;
  const yMdSlashes = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/); // YYYY/MM/DD
  if (yMdSlashes) return `${yMdSlashes[1]}-${yMdSlashes[2]}-${yMdSlashes[3]}`;
  return "";
}

// تحويل آمن لتاريخ منتصف اليوم
function parseDateOnly(s) {
  const iso = toIsoYMD(s);
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(
    parseInt(m[1], 10),
    parseInt(m[2], 10) - 1,
    parseInt(m[3], 10),
    12,
    0,
    0,
    0
  );
}

// عدد الأيام حتى تاريخ الانتهاء (سالب = منتهي بالفعل، 0 = اليوم، موجب = صالح)
function daysUntil(dateStr) {
  const d = parseDateOnly(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/* ========= Status helpers (smart sort by expiry) ========= */
const EXPIRING_SOON_DAYS = 30;
const EXPIRING_DAYS = 90;

function getCertStatus(expiryDate) {
  const days = daysUntil(expiryDate);
  if (days === null) {
    return {
      key: "no_expiry",
      label: "No Expiry",
      days: null,
      bg: "linear-gradient(135deg,#9ca3af,#6b7280)",
      rowBg: "transparent",
    };
  }
  if (days < 0) {
    return {
      key: "expired",
      label: "Expired",
      days,
      bg: "linear-gradient(135deg,#ef4444,#b91c1c)",
      rowBg: "rgba(239,68,68,0.10)",
    };
  }
  if (days <= EXPIRING_SOON_DAYS) {
    return {
      key: "expiring_soon",
      label: "Expiring Soon",
      days,
      bg: "linear-gradient(135deg,#f97316,#c2410c)",
      rowBg: "rgba(249,115,22,0.10)",
    };
  }
  if (days <= EXPIRING_DAYS) {
    return {
      key: "expiring",
      label: "Expiring",
      days,
      bg: "linear-gradient(135deg,#facc15,#a16207)",
      rowBg: "rgba(250,204,21,0.10)",
    };
  }
  return {
    key: "valid",
    label: "Valid",
    days,
    bg: "linear-gradient(135deg,#22c55e,#15803d)",
    rowBg: "transparent",
  };
}

const SORT_OPTIONS = [
  { value: "expiry_asc",  label: "Expiry: Soonest → Latest (Smart)" },
  { value: "expiry_desc", label: "Expiry: Latest → Soonest" },
  { value: "name_asc",    label: "Name (A → Z)" },
  { value: "name_desc",   label: "Name (Z → A)" },
  { value: "branch_asc",  label: "Branch (A → Z)" },
  { value: "appno_asc",   label: "Employee No (Asc)" },
  { value: "appno_desc",  label: "Employee No (Desc)" },
];

const STATUS_FILTERS = [
  { value: "all",           label: "All",            color: "#1d4ed8" },
  { value: "expired",       label: "Expired",        color: "#b91c1c" },
  { value: "expiring_soon", label: "≤ 30 Days",      color: "#c2410c" },
  { value: "expiring",      label: "≤ 90 Days",      color: "#a16207" },
  { value: "valid",         label: "Valid",          color: "#15803d" },
  { value: "no_expiry",     label: "No Expiry",      color: "#6b7280" },
  { value: "outside_dubai", label: "📍 Outside Dubai", color: "#0369a1" },
  { value: "left_company",  label: "🚪 Left Company",  color: "#7c2d12" },
];

// HTML escape (للطباعة)
function escapeHTML(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// CSV helpers
function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadCSV(filename, rowsArr) {
  const csv = rowsArr.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const getId = (r) =>
  r?.id ||
  r?._id ||
  r?.reportId ||
  r?.payload?.id ||
  r?.payload?._id ||
  r?.payload?.reportId;

/* server list -> flat rows (aligned with latest entry fields) */
function extractReportsList(data) {
  let arr = [];
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.items)) arr = data.items;
  else if (Array.isArray(data?.data?.items)) arr = data.data.items;
  else if (Array.isArray(data?.data)) arr = data.data;
  else if (Array.isArray(data?.results)) arr = data.results;
  else if (Array.isArray(data?.rows)) arr = data.rows;
  else if (Array.isArray(data?.list)) arr = data.list;

  arr = arr.filter((x) => (x?.type ? x.type === TYPE : true));

  return arr.map((x) => {
    const p = x.payload || {};
    const image = p.imageData || p.imageUrl || "";
    return {
      _server: {
        id: getId(x) || x?.id || x?._id,
        rawPayload: p,
      },
      appNo: p.appNo || "", // used as Employee Number
      name: p.name || "",
      nationality: p.nationality || "",
      job: p.job || "",
      issueDate: toIsoYMD(p.issueDate) || "",
      expiryDate: toIsoYMD(p.expiryDate) || "",
      result: p.result || "",
      branch: p.branch || "",
      // علامة "خارج دبي - معفى من OHC". موظف ممكن ينتقل للداخل لاحقاً.
      outsideDubai: p.outsideDubai === true,
      // علامة "ترك الشركة" - السجل محفوظ ومخفي من العرض الافتراضي
      leftCompany: p.leftCompany === true,
      image,
    };
  });
}

/* ========= Component ========= */
export default function OHCView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // فلاتر وفرز ذكي
  const [statusFilter, setStatusFilter] = useState("all"); // all|expired|expiring_soon|expiring|valid|no_expiry
  const [branchFilter, setBranchFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all"); // all | FIT | UNFIT
  const [nationalityFilter, setNationalityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("expiry_asc");
  const [groupByBranch, setGroupByBranch] = useState(false);
  const [search, setSearch] = useState(""); // search by employeeNo/name/nationality/job/branch

  // editing (بدون تغيير رقم الموظف أو الصورة، وبدون Issue Date)
  const [editingIndex, setEditingIndex] = useState(null);
  const [edit, setEdit] = useState({
    name: "",
    nationality: "",
    job: "",
    expiryDate: "",
    result: "",
    branch: "",
    outsideDubai: false,
    leftCompany: false,
  });

  // صورة جديدة للتعديل
  const [editImage, setEditImage] = useState(null); // { dataUrl, name, type }

  // image modal
  const [modalImage, setModalImage] = useState(null); // { src, appNo, name, serverId }

  // Load from server
  async function load() {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      const { ok, status, data } = await jsonFetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(
          TYPE
        )}&limit=1000&sort=-createdAt`
      );
      if (!ok) {
        setMsg({
          type: "error",
          text: `Failed to load (HTTP ${status}). ${data?.message || ""}`,
        });
        setRows([]);
        return;
      }
      setRows(extractReportsList(data));
    } catch (err) {
      console.error("OHC load error:", err);
      setMsg({
        type: "error",
        text:
          "Network error while loading data. Please check your connection and try again.",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // كل السجلات بعد إضافة الـ status
  const enriched = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      status: getCertStatus(r.expiryDate),
    }));
  }, [rows]);

  // قوائم الفلاتر من البيانات
  const branchList = useMemo(() => {
    const s = new Set();
    enriched.forEach((r) => {
      if (r.branch) s.add(r.branch);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [enriched]);

  const nationalityList = useMemo(() => {
    const s = new Set();
    enriched.forEach((r) => {
      if (r.nationality) s.add(r.nationality);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [enriched]);

  // إحصاءات على الموظفين النشطين داخل دبي فقط
  const stats = useMemo(() => {
    const out = {
      total: 0,
      expired: 0,
      expiring_soon: 0,
      expiring: 0,
      valid: 0,
      no_expiry: 0,
      outside_dubai: 0,
      left_company: 0,
      fit: 0,
      unfit: 0,
    };
    enriched.forEach((r) => {
      if (r.leftCompany) {
        out.left_company += 1;
        return; // الموظف ترك الشركة - لا يدخل في إحصاءات الانتهاء
      }
      if (r.outsideDubai) {
        out.outside_dubai += 1;
        return; // خارج دبي - لا يدخل في إحصاءات الانتهاء
      }
      out.total += 1;
      out[r.status.key] = (out[r.status.key] || 0) + 1;
      if (r.result === "FIT") out.fit += 1;
      else if (r.result === "UNFIT") out.unfit += 1;
    });
    return out;
  }, [enriched]);

  // إحصاءات لكل فرع (نتجاهل خارج دبي ومن ترك الشركة)
  const branchStats = useMemo(() => {
    const map = new Map();
    enriched.forEach((r) => {
      if (r.outsideDubai || r.leftCompany) return;
      const b = r.branch || "—";
      const cur = map.get(b) || {
        branch: b,
        total: 0,
        expired: 0,
        expiring_soon: 0,
        expiring: 0,
        valid: 0,
        no_expiry: 0,
      };
      cur.total += 1;
      cur[r.status.key] = (cur[r.status.key] || 0) + 1;
      map.set(b, cur);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.branch.localeCompare(b.branch)
    );
  }, [enriched]);

  // الصفوف بعد كل الفلاتر والفرز
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let out = enriched.slice();

    // Outside Dubai / Left Company: نخفيها افتراضياً، نظهرها فقط عند اختيار الفلتر المقابل
    if (statusFilter === "outside_dubai") {
      out = out.filter((r) => r.outsideDubai && !r.leftCompany);
    } else if (statusFilter === "left_company") {
      out = out.filter((r) => r.leftCompany);
    } else {
      out = out.filter((r) => !r.outsideDubai && !r.leftCompany);
      if (statusFilter !== "all") {
        out = out.filter((r) => r.status.key === statusFilter);
      }
    }

    if (branchFilter !== "all") {
      out = out.filter((r) => r.branch === branchFilter);
    }
    if (resultFilter !== "all") {
      out = out.filter((r) => r.result === resultFilter);
    }
    if (nationalityFilter !== "all") {
      out = out.filter((r) => r.nationality === nationalityFilter);
    }
    if (term) {
      out = out.filter((r) => {
        const haystack = `${r.appNo} ${r.name} ${r.nationality} ${r.job} ${r.branch}`.toLowerCase();
        return haystack.includes(term);
      });
    }

    // الفرز الذكي
    const cmpStr = (a, b) =>
      String(a || "").localeCompare(String(b || ""));
    const expiryRank = (r) => {
      if (r.status.key === "no_expiry") return Number.POSITIVE_INFINITY;
      const d = r.status.days;
      return d === null ? Number.POSITIVE_INFINITY : d;
    };
    const numAppNo = (r) => {
      const n = parseInt(String(r.appNo || "").replace(/\D/g, ""), 10);
      return isNaN(n) ? Number.POSITIVE_INFINITY : n;
    };

    out.sort((a, b) => {
      switch (sortBy) {
        case "expiry_asc":
          return expiryRank(a) - expiryRank(b);
        case "expiry_desc":
          return expiryRank(b) - expiryRank(a);
        case "name_asc":
          return cmpStr(a.name, b.name);
        case "name_desc":
          return cmpStr(b.name, a.name);
        case "branch_asc":
          return (
            cmpStr(a.branch, b.branch) || expiryRank(a) - expiryRank(b)
          );
        case "appno_asc":
          return numAppNo(a) - numAppNo(b);
        case "appno_desc":
          return numAppNo(b) - numAppNo(a);
        default:
          return 0;
      }
    });

    return out;
  }, [
    enriched,
    statusFilter,
    branchFilter,
    resultFilter,
    nationalityFilter,
    search,
    sortBy,
  ]);

  // مسح كل الفلاتر
  function clearAllFilters() {
    setSearch("");
    setStatusFilter("all");
    setBranchFilter("all");
    setResultFilter("all");
    setNationalityFilter("all");
    setSortBy("expiry_asc");
  }

  // تصدير CSV للسجلات الظاهرة
  function exportCSV() {
    if (!filtered.length) {
      alert("No certificates to export.");
      return;
    }
    const header = [
      "#",
      "Employee Number",
      "Name",
      "Nationality",
      "Occupation",
      "Branch",
      "Issue Date",
      "Expiry Date",
      "Days Left",
      "Status",
      "Result",
      "Outside Dubai",
      "Left Company",
    ];
    const overallStatus = (r) =>
      r.leftCompany
        ? "Left Company"
        : r.outsideDubai
        ? "Outside Dubai (Exempt)"
        : r.status.label;
    const body = filtered.map((r, i) => [
      i + 1,
      r.appNo,
      r.name,
      r.nationality,
      r.job,
      r.branch,
      r.issueDate,
      r.expiryDate,
      r.status.days === null ? "" : r.status.days,
      overallStatus(r),
      r.result,
      r.outsideDubai ? "Yes" : "No",
      r.leftCompany ? "Yes" : "No",
    ]);
    const ts = new Date().toISOString().slice(0, 10);
    downloadCSV(`ohc_certificates_${ts}.csv`, [header, ...body]);
  }

  // طباعة
  function printList() {
    if (!filtered.length) {
      alert("No certificates to print.");
      return;
    }
    const w = window.open("", "_blank");
    if (!w) {
      alert("Please allow pop-ups to print.");
      return;
    }
    const styleColor = (key) =>
      key === "expired"
        ? "#b91c1c"
        : key === "expiring_soon"
        ? "#c2410c"
        : key === "expiring"
        ? "#a16207"
        : key === "valid"
        ? "#15803d"
        : "#6b7280";

    const trs = filtered
      .map(
        (r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHTML(r.appNo)}</td>
          <td>${escapeHTML(r.name)}</td>
          <td>${escapeHTML(r.branch)}</td>
          <td>${escapeHTML(r.job)}</td>
          <td>${escapeHTML(r.expiryDate || "—")}</td>
          <td>${r.status.days === null ? "—" : r.status.days}</td>
          <td style="color:${styleColor(r.status.key)};font-weight:700">${
          r.status.label
        }</td>
          <td>${escapeHTML(r.result)}</td>
        </tr>`
      )
      .join("");

    w.document.write(`
      <html>
        <head>
          <title>OHC Certificates Report</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Tahoma, Arial, sans-serif; padding: 16px; }
            h1 { font-size: 18px; margin: 0 0 6px; }
            .meta { font-size: 12px; color: #555; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            thead { background: #0f172a; color: #fff; }
            tr:nth-child(even) td { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>OHC Certificates</h1>
          <div class="meta">
            Records: ${filtered.length} &nbsp;|&nbsp;
            Status: ${statusFilter} &nbsp;|&nbsp;
            Branch: ${branchFilter} &nbsp;|&nbsp;
            Result: ${resultFilter} &nbsp;|&nbsp;
            Generated: ${new Date().toLocaleString()}
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Employee No</th>
                <th>Name</th>
                <th>Branch</th>
                <th>Occupation</th>
                <th>Expiry</th>
                <th>Days Left</th>
                <th>Status</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>${trs}</tbody>
          </table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    w.document.close();
  }

  // قلب حالة Outside Dubai بسرعة (POST سجل جديد + DELETE القديم)
  async function toggleOutsideDubai(idx) {
    const row = filtered[idx];
    if (!row?._server?.id) return;

    const newVal = !row.outsideDubai;
    const action = newVal ? "Mark as Outside Dubai" : "Move back to Dubai";
    const note = newVal
      ? "This will hide the record from the main view and exempt it from expiry alerts."
      : "This will return the record to the active Dubai view.";

    if (!window.confirm(`${action}?\n\n${note}`)) return;

    setMsg({ type: "", text: "" });

    const base = row._server.rawPayload || {};
    const payload = {
      ...base,
      outsideDubai: newVal,
      // عند الانتقال خارج دبي نمسح حقول الشهادة (سترجع عند العودة)
      ...(newVal
        ? { expiryDate: "", result: "" }
        : {}),
      savedAt: new Date().toISOString(),
    };

    try {
      const createRes = await jsonFetch(`${API_BASE}/api/reports`, {
        method: "POST",
        body: JSON.stringify({
          reporter: "MOHAMAD ABDULLAH",
          type: TYPE,
          payload,
        }),
      });
      if (!createRes.ok) {
        setMsg({
          type: "error",
          text: `Update failed (HTTP ${createRes.status}). ${
            createRes.data?.message || ""
          }`,
        });
        return;
      }
      await jsonFetch(`${API_BASE}/api/reports/${row._server.id}`, {
        method: "DELETE",
      });
      setMsg({
        type: "ok",
        text: newVal
          ? "Marked as Outside Dubai (hidden from main view)."
          : "Moved back to Dubai (visible in main view).",
      });
      await load();
    } catch (err) {
      console.error("toggleOutsideDubai error:", err);
      setMsg({
        type: "error",
        text: "Network error while updating. Please try again.",
      });
    }
  }

  // قلب حالة Left Company بسرعة
  async function toggleLeftCompany(idx) {
    const row = filtered[idx];
    if (!row?._server?.id) return;

    const newVal = !row.leftCompany;
    const action = newVal ? "Mark as Left Company" : "Restore (Active Employee)";
    const note = newVal
      ? "This will hide the record from the main view & exempt it from expiry alerts. The record stays in the database."
      : "This will return the record to the active list.";

    if (!window.confirm(`${action}?\n\n${note}`)) return;

    setMsg({ type: "", text: "" });

    const base = row._server.rawPayload || {};
    const payload = {
      ...base,
      leftCompany: newVal,
      ...(newVal ? { expiryDate: "", result: "" } : {}),
      savedAt: new Date().toISOString(),
    };

    try {
      const createRes = await jsonFetch(`${API_BASE}/api/reports`, {
        method: "POST",
        body: JSON.stringify({
          reporter: "MOHAMAD ABDULLAH",
          type: TYPE,
          payload,
        }),
      });
      if (!createRes.ok) {
        setMsg({
          type: "error",
          text: `Update failed (HTTP ${createRes.status}). ${
            createRes.data?.message || ""
          }`,
        });
        return;
      }
      await jsonFetch(`${API_BASE}/api/reports/${row._server.id}`, {
        method: "DELETE",
      });
      setMsg({
        type: "ok",
        text: newVal
          ? "Marked as Left Company (hidden from main view)."
          : "Restored as active employee.",
      });
      await load();
    } catch (err) {
      console.error("toggleLeftCompany error:", err);
      setMsg({
        type: "error",
        text: "Network error while updating. Please try again.",
      });
    }
  }

  // Delete record
  async function handleDelete(idx) {
    const row = filtered[idx];
    if (!row?._server?.id) return;
    if (!window.confirm(`Delete certificate for "${row.name}"?`)) return;

    setMsg({ type: "", text: "" });
    try {
      const { ok, status, data } = await jsonFetch(
        `${API_BASE}/api/reports/${row._server.id}`,
        { method: "DELETE" }
      );
      if (!ok) {
        setMsg({
          type: "error",
          text: `Delete failed (HTTP ${status}). ${data?.message || ""}`,
        });
        return;
      }
      setMsg({ type: "ok", text: "Deleted successfully." });
      await load();
    } catch (err) {
      console.error("OHC delete error:", err);
      setMsg({
        type: "error",
        text: "Network error while deleting. Please try again.",
      });
    }
  }

  // Edit record
  function startEdit(idx) {
    const row = filtered[idx];
    setEditingIndex(idx);
    setEdit({
      name: row.name || "",
      nationality: row.nationality || "",
      job: row.job || "",
      expiryDate: row.expiryDate || "",
      result: row.result || "",
      branch: row.branch || "",
      outsideDubai: !!row.outsideDubai,
      leftCompany: !!row.leftCompany,
    });
    setEditImage(null);
    setMsg({ type: "", text: "" });
  }
  function cancelEdit() {
    setEditingIndex(null);
    setEditImage(null);
  }
  function setEditField(k, v) {
    setEdit((p) => ({ ...p, [k]: v }));
  }

  // اختيار صورة جديدة مع ضغط
  async function handleEditImageSelect(e) {
    const file = e.target.files && e.target.files[0];
    // تنظيف قيمة المدخل بحيث يمكن اختيار نفس الملف مرة أخرى لاحقاً
    e.target.value = "";
    if (!file) return;

    if (!file.type || !file.type.startsWith("image/")) {
      setMsg({
        type: "error",
        text: "Selected file is not an image.",
      });
      return;
    }

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            let { width, height } = img;
            if (width > height && width > MAX_IMG_DIM) {
              height = (height * MAX_IMG_DIM) / width;
              width = MAX_IMG_DIM;
            } else if (height >= width && height > MAX_IMG_DIM) {
              width = (width * MAX_IMG_DIM) / height;
              height = MAX_IMG_DIM;
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              // لو صار خطأ في الكانفا، نستعمل الداتا الأصلية
              resolve(ev.target.result);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const out = canvas.toDataURL("image/jpeg", IMG_QUALITY);
            resolve(out);
          };
          img.onerror = reject;
          img.src = ev.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setEditImage({
        dataUrl,
        name: file.name,
        type: file.type || "image/jpeg",
      });
      setMsg({
        type: "ok",
        text: "Image loaded for update. Please click Save to apply changes.",
      });
    } catch (err) {
      console.error("Image compress error:", err);
      setMsg({
        type: "error",
        text: "Failed to process image. Please try another file.",
      });
    }
  }

  // ==== تعديل: إنشاء سجل جديد ثم حذف القديم بدل PUT (مع دعم صورة جديدة) ====
  async function saveEdit() {
    const row = filtered[editingIndex];
    if (!row?._server?.id) return;

    // لو الموظف خارج دبي أو ترك الشركة: ما لازم expiryDate ولا result
    const exempt = edit.outsideDubai || edit.leftCompany;
    const required = exempt
      ? ["name", "nationality", "job", "branch"]
      : ["name", "nationality", "job", "expiryDate", "result", "branch"];
    for (const k of required) {
      if (!String(edit[k] || "").trim()) {
        setMsg({
          type: "error",
          text: "Please complete all required fields.",
        });
        return;
      }
    }

    let expiryIso = "";
    if (!exempt) {
      expiryIso = toIsoYMD(edit.expiryDate);
      if (!expiryIso) {
        setMsg({
          type: "error",
          text: "Invalid expiry date format. Please re-select the date.",
        });
        return;
      }
      const todayStr = new Date().toISOString().slice(0, 10);
      if (expiryIso < todayStr) {
        const cont = window.confirm(
          "This OHC certificate appears to be expired already.\nDo you still want to save these changes?"
        );
        if (!cont) return;
      }
    }

    // نحافظ على الـ payload الأصلي (يشمل الصورة الحالية) ونحدّث الحقول فقط
    const base = row._server.rawPayload || {};
    const payload = {
      ...base,
      appNo: row.appNo, // رقم الموظف ثابت
      name: edit.name,
      nationality: edit.nationality,
      job: edit.job,
      expiryDate: exempt ? "" : expiryIso,
      result: exempt ? "" : edit.result,
      branch: edit.branch,
      outsideDubai: !!edit.outsideDubai,
      leftCompany: !!edit.leftCompany,
      savedAt: new Date().toISOString(),
    };

    // لو تم اختيار صورة جديدة نستبدل حقول الصورة
    if (editImage && editImage.dataUrl) {
      payload.imageData = editImage.dataUrl;
      payload.imageUrl = ""; // نفضّل data URL
      payload.imageName = editImage.name;
      payload.imageType = editImage.type;
    }

    try {
      // 1) إنشاء سجل جديد
      const createRes = await jsonFetch(`${API_BASE}/api/reports`, {
        method: "POST",
        body: JSON.stringify({
          reporter: "MOHAMAD ABDULLAH",
          type: TYPE,
          payload,
        }),
      });

      if (!createRes.ok) {
        setMsg({
          type: "error",
          text: `Update failed (create) (HTTP ${createRes.status}). ${
            createRes.data?.message || ""
          }`,
        });
        return;
      }

      // 2) حذف السجل القديم
      if (row._server.id) {
        await jsonFetch(`${API_BASE}/api/reports/${row._server.id}`, {
          method: "DELETE",
        });
      }

      setMsg({ type: "ok", text: "Updated successfully." });
      setEditingIndex(null);
      setEditImage(null);
      await load();
    } catch (err) {
      console.error("OHC update error:", err);
      setMsg({
        type: "error",
        text: "Network error while updating. Please try again.",
      });
    }
  }

  // ======= Image modal + remove image + download =======
  function openImage(r) {
    if (!r?.image) return;
    setModalImage({
      src: r.image,
      appNo: r.appNo || "",
      name: r.name || "",
      serverId: r._server?.id || null,
    });
  }

  function closeModal() {
    setModalImage(null);
  }

  async function handleDeleteImage(modal) {
    if (!modal?.serverId) return;
    const row = rows.find((r) => r._server?.id === modal.serverId);
    if (!row) return;

    if (
      !window.confirm(
        `Remove image for "${row.name}" (Employee Number: ${
          row.appNo || "N/A"
        })? This will keep the certificate data but delete the attached image.`
      )
    ) {
      return;
    }

    setMsg({ type: "", text: "" });

    const base = row._server.rawPayload || {};
    const payload = {
      ...base,
      imageData: "",
      imageUrl: "",
      imageName: "",
      imageType: "",
    };

    try {
      const { ok, status, data } = await jsonFetch(
        `${API_BASE}/api/reports/${row._server.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ payload }),
        }
      );

      if (!ok) {
        setMsg({
          type: "error",
          text: `Image remove failed (HTTP ${status}). ${data?.message || ""}`,
        });
        return;
      }

      setMsg({ type: "ok", text: "Image removed successfully." });
      setModalImage(null);
      await load();
    } catch (err) {
      console.error("OHC image delete error:", err);
      setMsg({
        type: "error",
        text: "Network error while removing image. Please try again.",
      });
    }
  }

  const total = rows.length;
  const showing = filtered.length;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2.5rem 1.5rem",
        background:
          "radial-gradient(circle at top left, #0f766e 0%, #0f172a 40%, #020617 80%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        boxSizing: "border-box",
        fontFamily: "Inter, Tahoma, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1300,
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.94))",
          borderRadius: 26,
          padding: 2,
          boxShadow: "0 28px 70px rgba(15,23,42,0.8)",
          border: "1px solid rgba(148,163,184,0.55)",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle at top right, #ecfeff 0%, #f9fafb 40%, #e5e7eb 100%)",
            borderRadius: 24,
            padding: "1.75rem 1.75rem 1.75rem",
          }}
        >
          {/* Header */}
          <div
            style={{
              marginBottom: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  background:
                    "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(8,47,73,0.08))",
                  color: "#0369a1",
                  border: "1px solid rgba(56,189,248,0.7)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "999px",
                    background:
                      "radial-gradient(circle, #22c55e 0%, #15803d 60%, #052e16 100%)",
                  }}
                />
                OHC Certificates Register
              </div>
              <h2
                style={{
                  margin: "8px 0 4px",
                  color: "#0f172a",
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: 0.2,
                }}
              >
                📋 OHC Certificates Overview
              </h2>
              <div
                style={{
                  fontSize: 13,
                  color: "#4b5563",
                }}
              >
                Centralized view of employee OHC certificates with expiry
                tracking, branch filter and image attachments.
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  fontSize: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(37,99,235,0.06)",
                    color: "#1d4ed8",
                    fontWeight: 700,
                    border: "1px solid rgba(129,140,248,0.6)",
                  }}
                >
                  Showing: {showing} / {total}
                </span>
                {stats.fit > 0 && (
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "rgba(22,163,74,0.08)",
                      color: "#166534",
                      fontWeight: 700,
                      border: "1px solid rgba(74,222,128,0.6)",
                    }}
                  >
                    FIT: {stats.fit}
                  </span>
                )}
                {stats.unfit > 0 && (
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "rgba(239,68,68,0.08)",
                      color: "#b91c1c",
                      fontWeight: 700,
                      border: "1px solid rgba(248,113,113,0.6)",
                    }}
                  >
                    UNFIT: {stats.unfit}
                  </span>
                )}
              </div>
            </div>

            {/* Search box */}
            <div
              style={{
                minWidth: 260,
                maxWidth: 360,
                marginLeft: "auto",
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Search
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.9)",
                    background:
                      "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
                  }}
                >
                  <span style={{ fontSize: 14, opacity: 0.8 }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Employee No, Name, Nationality, Branch..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: 13,
                    }}
                  />
                </div>
              </label>
            </div>
          </div>

          {msg.text && (
            <div
              style={{
                margin: "10px 0 16px",
                padding: "10px 12px",
                borderRadius: 12,
                background:
                  msg.type === "ok"
                    ? "linear-gradient(135deg,#ecfdf5,#dcfce7)"
                    : "linear-gradient(135deg,#fef2f2,#fee2e2)",
                color: msg.type === "ok" ? "#065f46" : "#991b1b",
                border: `1px solid ${
                  msg.type === "ok" ? "#22c55e" : "#fca5a5"
                }`,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    msg.type === "ok" ? "#16a34a" : "rgba(220,38,38,0.9)",
                  boxShadow:
                    msg.type === "ok"
                      ? "0 0 0 4px rgba(34,197,94,0.18)"
                      : "0 0 0 4px rgba(248,113,113,0.2)",
                }}
              />
              <span>{msg.text}</span>
            </div>
          )}

          {/* Stat cards (clickable to filter) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <StatCard
              label="Total"
              value={stats.total}
              color="#1d4ed8"
              icon="📋"
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
            <StatCard
              label="Expired"
              value={stats.expired}
              color="#b91c1c"
              icon="⛔"
              active={statusFilter === "expired"}
              onClick={() => setStatusFilter("expired")}
            />
            <StatCard
              label="Expiring ≤ 30d"
              value={stats.expiring_soon}
              color="#c2410c"
              icon="⚠️"
              active={statusFilter === "expiring_soon"}
              onClick={() => setStatusFilter("expiring_soon")}
            />
            <StatCard
              label="Expiring ≤ 90d"
              value={stats.expiring}
              color="#a16207"
              icon="⏳"
              active={statusFilter === "expiring"}
              onClick={() => setStatusFilter("expiring")}
            />
            <StatCard
              label="Valid"
              value={stats.valid}
              color="#15803d"
              icon="✅"
              active={statusFilter === "valid"}
              onClick={() => setStatusFilter("valid")}
            />
            <StatCard
              label="No Expiry"
              value={stats.no_expiry}
              color="#6b7280"
              icon="∞"
              active={statusFilter === "no_expiry"}
              onClick={() => setStatusFilter("no_expiry")}
            />
            <StatCard
              label="Outside Dubai"
              value={stats.outside_dubai}
              color="#0369a1"
              icon="📍"
              active={statusFilter === "outside_dubai"}
              onClick={() => setStatusFilter("outside_dubai")}
            />
            <StatCard
              label="Left Company"
              value={stats.left_company}
              color="#7c2d12"
              icon="🚪"
              active={statusFilter === "left_company"}
              onClick={() => setStatusFilter("left_company")}
            />
          </div>

          {/* Status chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 10,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#374151",
                marginRight: 4,
              }}
            >
              STATUS:
            </span>
            {STATUS_FILTERS.map((s) => {
              const isActive = statusFilter === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatusFilter(s.value)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: `1px solid ${s.color}`,
                    background: isActive ? s.color : "transparent",
                    color: isActive ? "#fff" : s.color,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Filters row */}
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              background:
                "linear-gradient(135deg,rgba(15,23,42,0.02),rgba(8,47,73,0.03))",
              padding: 10,
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.5)",
            }}
          >
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              style={selectStyle}
              title="Filter by Branch"
            >
              <option value="all">🏢 All Branches</option>
              {(branchList.length
                ? branchList
                : BRANCHES
              ).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              style={selectStyle}
              title="Filter by Result"
            >
              <option value="all">🩺 All Results</option>
              <option value="FIT">FIT</option>
              <option value="UNFIT">UNFIT</option>
            </select>

            <select
              value={nationalityFilter}
              onChange={(e) => setNationalityFilter(e.target.value)}
              style={selectStyle}
              title="Filter by Nationality"
            >
              <option value="all">🌍 All Nationalities</option>
              {nationalityList.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={selectStyle}
              title="Sort By"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  ↕ {o.label}
                </option>
              ))}
            </select>

            <label
              style={{
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "#374151",
                padding: "4px 10px",
                borderRadius: 999,
                background: groupByBranch
                  ? "linear-gradient(135deg,#dbeafe,#bfdbfe)"
                  : "transparent",
                border: "1px solid rgba(148,163,184,0.7)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={groupByBranch}
                onChange={(e) => setGroupByBranch(e.target.checked)}
                style={{ margin: 0 }}
              />
              Group by Branch
            </label>

            <button
              type="button"
              onClick={clearAllFilters}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid rgba(107,114,128,0.7)",
                background: "linear-gradient(135deg,#f3f4f6,#e5e7eb)",
                color: "#111827",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕ Clear Filters
            </button>

            <div style={{ flex: 1 }} />

            <button
              type="button"
              onClick={exportCSV}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(135deg,#10b981,#047857)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(16,185,129,0.35)",
              }}
            >
              ⬇ Export CSV
            </button>

            <button
              type="button"
              onClick={printList}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(135deg,#6366f1,#4338ca)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(99,102,241,0.35)",
              }}
            >
              🖨 Print
            </button>

            <button
              onClick={load}
              disabled={loading}
              style={{
                padding: "6px 14px",
                background: loading
                  ? "linear-gradient(135deg,#38bdf8,#0ea5e9)"
                  : "linear-gradient(135deg,#38bdf8,#0ea5e9,#0369a1)",
                color: "#f9fafb",
                border: 0,
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(14,165,233,0.45)",
                opacity: loading ? 0.9 : 1,
              }}
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {/* Group by Branch summary (when active) */}
          {groupByBranch && (
            <div
              style={{
                marginBottom: 10,
                padding: 8,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.6)",
                background:
                  "linear-gradient(135deg,#f8fafc,#eef2ff,#e0e7ff)",
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#374151",
                  width: "100%",
                }}
              >
                BRANCH BREAKDOWN ({branchStats.length} branches)
              </div>
              {branchStats.map((b) => (
                <button
                  key={b.branch}
                  type="button"
                  onClick={() =>
                    setBranchFilter(
                      branchFilter === b.branch ? "all" : b.branch
                    )
                  }
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border:
                      branchFilter === b.branch
                        ? "2px solid #1d4ed8"
                        : "1px solid rgba(148,163,184,0.7)",
                    background:
                      branchFilter === b.branch
                        ? "linear-gradient(135deg,#dbeafe,#bfdbfe)"
                        : "#ffffff",
                    cursor: "pointer",
                    fontSize: 11,
                    textAlign: "left",
                    minWidth: 180,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: 2,
                    }}
                  >
                    {b.branch}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      fontSize: 10,
                    }}
                  >
                    <span style={{ color: "#1d4ed8", fontWeight: 700 }}>
                      Total: {b.total}
                    </span>
                    {b.expired > 0 && (
                      <span style={{ color: "#b91c1c", fontWeight: 700 }}>
                        ⛔ {b.expired}
                      </span>
                    )}
                    {b.expiring_soon > 0 && (
                      <span style={{ color: "#c2410c", fontWeight: 700 }}>
                        ⚠ {b.expiring_soon}
                      </span>
                    )}
                    {b.expiring > 0 && (
                      <span style={{ color: "#a16207", fontWeight: 700 }}>
                        ⏳ {b.expiring}
                      </span>
                    )}
                    {b.valid > 0 && (
                      <span style={{ color: "#15803d", fontWeight: 700 }}>
                        ✓ {b.valid}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Edit Panel */}
          {editingIndex !== null && (
            <div
              style={{
                marginBottom: 24,
                padding: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background:
                  "linear-gradient(135deg,#f9fafb,#f3f4f6,#e5e7eb)",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 10,
                  fontSize: 16,
                  color: "#0f172a",
                }}
              >
                Edit Certificate{" "}
                <span
                  style={{
                    fontWeight: 400,
                    fontSize: 13,
                    color: "#4b5563",
                  }}
                >
                  {`(Employee Number: ${
                    filtered[editingIndex]?.appNo || "N/A"
                  })`}
                </span>
              </h3>

              {/* Status flags row (Outside Dubai + Left Company) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {/* Outside Dubai toggle */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: edit.outsideDubai
                      ? "linear-gradient(135deg,#e0f2fe,#bae6fd)"
                      : "linear-gradient(135deg,#ffffff,#f1f5f9)",
                    border: `1px solid ${
                      edit.outsideDubai ? "#0369a1" : "rgba(148,163,184,0.7)"
                    }`,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!edit.outsideDubai}
                    onChange={(e) =>
                      setEditField("outsideDubai", e.target.checked)
                    }
                    style={{ width: 18, height: 18, margin: 0 }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      📍 Outside Dubai (Exempt from OHC)
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#475569",
                        marginTop: 2,
                      }}
                    >
                      Hidden from main view & expiry alerts. Useful when an
                      employee may transfer to Dubai later.
                    </div>
                  </div>
                </label>

                {/* Left Company toggle */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: edit.leftCompany
                      ? "linear-gradient(135deg,#fef2f2,#fecaca)"
                      : "linear-gradient(135deg,#ffffff,#f1f5f9)",
                    border: `1px solid ${
                      edit.leftCompany ? "#7c2d12" : "rgba(148,163,184,0.7)"
                    }`,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!edit.leftCompany}
                    onChange={(e) =>
                      setEditField("leftCompany", e.target.checked)
                    }
                    style={{ width: 18, height: 18, margin: 0 }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      🚪 Left Company (Former Employee)
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#475569",
                        marginTop: 2,
                      }}
                    >
                      Record is kept but hidden from main view & expiry
                      alerts. Restore anytime if the employee returns.
                    </div>
                  </div>
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                  opacity:
                    edit.outsideDubai || edit.leftCompany ? 0.6 : 1,
                }}
              >
                <Field
                  label="Name"
                  value={edit.name}
                  onChange={(v) => setEditField("name", v)}
                />
                <Field
                  label="Nationality"
                  value={edit.nationality}
                  onChange={(v) => setEditField("nationality", v)}
                />
                <Field
                  label="Occupation"
                  value={edit.job}
                  onChange={(v) => setEditField("job", v)}
                />
                <DateField
                  label="Certificate Expiry Date"
                  value={edit.expiryDate}
                  onChange={(v) => setEditField("expiryDate", v)}
                />
                <Select
                  label="Result"
                  value={edit.result}
                  onChange={(v) => setEditField("result", v)}
                  options={[
                    { value: "", label: "-- Select --" },
                    { value: "FIT", label: "FIT" },
                    { value: "UNFIT", label: "UNFIT" },
                  ]}
                />
                {/* Branch text field */}
                <Field
                  label="Branch"
                  value={edit.branch}
                  onChange={(v) => setEditField("branch", v)}
                />
              </div>

              {/* Image edit block */}
              <div
                style={{
                  marginTop: 16,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background:
                    "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: "#111827",
                    minWidth: 120,
                  }}
                >
                  Certificate Image
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    {(editImage?.dataUrl ||
                      filtered[editingIndex]?.image) && (
                      <img
                        src={
                          editImage?.dataUrl ||
                          filtered[editingIndex]?.image
                        }
                        alt="preview"
                        style={{
                          height: 60,
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          objectFit: "cover",
                          boxShadow:
                            "0 6px 14px rgba(15,23,42,0.35)",
                        }}
                      />
                    )}
                    {!editImage?.dataUrl &&
                      !filtered[editingIndex]?.image && (
                        <span
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                          }}
                        >
                          No image attached.
                        </span>
                      )}
                  </div>

                  <label
                    style={{
                      padding: "7px 14px",
                      borderRadius: 999,
                      background:
                        "linear-gradient(135deg,#0ea5e9,#0369a1)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    Change / Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageSelect}
                      style={{ display: "none" }}
                    />
                  </label>

                  {editImage && (
                    <button
                      type="button"
                      onClick={() => setEditImage(null)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 999,
                        background:
                          "linear-gradient(135deg,#94a3b8,#64748b)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 12,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Reset Image
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <button
                  onClick={saveEdit}
                  style={{
                    padding: "8px 16px",
                    background:
                      "linear-gradient(135deg,#22c55e,#16a34a,#15803d)",
                    color: "#fff",
                    border: 0,
                    borderRadius: 999,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                    boxShadow: "0 10px 24px rgba(22,163,74,0.55)",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    padding: "8px 16px",
                    background:
                      "linear-gradient(135deg,#94a3b8,#64748b,#475569)",
                    color: "#fff",
                    border: 0,
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div
            style={{
              overflowX: "auto",
              borderRadius: 18,
              border: "1px solid #e5e7eb",
              background:
                "linear-gradient(135deg,#ffffff,#f9fafb,#f3f4f6)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                minWidth: 1100,
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      "linear-gradient(135deg,#0f172a,#020617,#0f172a)",
                    color: "#e5e7eb",
                  }}
                >
                  {[
                    "#",
                    "Employee Number",
                    "Name",
                    "Nationality",
                    "Occupation",
                    "Expiry Date",
                    "Result",
                    "Days Left",
                    "Status",
                    "Branch",
                    "Image",
                    "Actions",
                    "Edit",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #1f2937",
                        textAlign: "center",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      style={{
                        textAlign: "center",
                        padding: 20,
                        color: "#6b7280",
                      }}
                    >
                      No certificates match the current filters/search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const st = r.status;
                    const stripeBg = i % 2 === 0 ? "#ffffff" : "#f9fafb";
                    const rowBg =
                      st.rowBg && st.rowBg !== "transparent"
                        ? st.rowBg
                        : stripeBg;
                    const showLeftBar =
                      st.key === "expired" ||
                      st.key === "expiring_soon" ||
                      st.key === "expiring";
                    const leftBarColor =
                      st.key === "expired"
                        ? "#b91c1c"
                        : st.key === "expiring_soon"
                        ? "#c2410c"
                        : "#a16207";

                    const resultBadgeStyle =
                      r.result === "FIT"
                        ? {
                            background: "#dcfce7",
                            color: "#166534",
                            borderColor: "#bbf7d0",
                          }
                        : r.result === "UNFIT"
                        ? {
                            background: "#fee2e2",
                            color: "#b91c1c",
                            borderColor: "#fecaca",
                          }
                        : {
                            background: "#e5e7eb",
                            color: "#374151",
                            borderColor: "#d1d5db",
                          };

                    return (
                      <tr
                        key={i}
                        style={{
                          textAlign: "center",
                          background: rowBg,
                          borderLeft: showLeftBar
                            ? `4px solid ${leftBarColor}`
                            : "4px solid transparent",
                        }}
                      >
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {i + 1}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.appNo || "—"}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          {r.name}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          {r.nationality}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          {r.job}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              color:
                                st.key === "expired" ||
                                st.key === "expiring_soon"
                                  ? "#b91c1c"
                                  : "#111827",
                              fontWeight:
                                st.key === "expired" ||
                                st.key === "expiring_soon"
                                  ? 700
                                  : 500,
                            }}
                          >
                            {toIsoYMD(r.expiryDate) || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 60,
                              padding: "2px 8px",
                              borderRadius: 999,
                              borderWidth: 1,
                              borderStyle: "solid",
                              fontSize: 11,
                              fontWeight: 700,
                              ...resultBadgeStyle,
                            }}
                          >
                            {r.result || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {st.days === null ? (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          ) : st.days < 0 ? (
                            <span
                              style={{
                                fontWeight: 700,
                                color: "#b91c1c",
                              }}
                              title={`Expired ${Math.abs(
                                st.days
                              )} day(s) ago`}
                            >
                              -{Math.abs(st.days)}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontWeight: 700,
                                color:
                                  st.key === "expiring_soon"
                                    ? "#c2410c"
                                    : st.key === "expiring"
                                    ? "#a16207"
                                    : "#15803d",
                              }}
                              title={`${st.days} day(s) remaining`}
                            >
                              {st.days}
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 10px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 800,
                              color: "#fff",
                              background: st.bg,
                              letterSpacing: 0.3,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              alignItems: "center",
                            }}
                          >
                            <span>{r.branch || "-"}</span>
                            {r.outsideDubai && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  color: "#fff",
                                  background:
                                    "linear-gradient(135deg,#0ea5e9,#0369a1)",
                                  padding: "1px 6px",
                                  borderRadius: 999,
                                  letterSpacing: 0.3,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                📍 OUTSIDE DUBAI
                              </span>
                            )}
                            {r.leftCompany && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  color: "#fff",
                                  background:
                                    "linear-gradient(135deg,#dc2626,#7c2d12)",
                                  padding: "1px 6px",
                                  borderRadius: 999,
                                  letterSpacing: 0.3,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                🚪 LEFT COMPANY
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          {r.image ? (
                            <img
                              src={r.image}
                              alt="certificate"
                              onClick={() => openImage(r)}
                              title="Click to view"
                              style={{
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 6,
                                border: "1px solid #e5e7eb",
                                cursor: "pointer",
                                boxShadow:
                                  "0 6px 16px rgba(15,23,42,0.35)",
                              }}
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <button
                            onClick={() => handleDelete(i)}
                            style={{
                              padding: "6px 12px",
                              background:
                                "linear-gradient(135deg,#ef4444,#b91c1c)",
                              color: "#fff",
                              border: 0,
                              borderRadius: 999,
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            Delete
                          </button>
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              justifyContent: "center",
                              flexWrap: "wrap",
                            }}
                          >
                          <button
                            onClick={() => toggleOutsideDubai(i)}
                            title={
                              r.outsideDubai
                                ? "Move back to Dubai"
                                : "Mark as Outside Dubai (hide from main view)"
                            }
                            style={{
                              padding: "6px 10px",
                              background: r.outsideDubai
                                ? "linear-gradient(135deg,#10b981,#047857)"
                                : "linear-gradient(135deg,#0ea5e9,#0369a1)",
                              color: "#fff",
                              border: 0,
                              borderRadius: 999,
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {r.outsideDubai ? "🏙️ To Dubai" : "📍 Outside"}
                          </button>
                          <button
                            onClick={() => toggleLeftCompany(i)}
                            title={
                              r.leftCompany
                                ? "Restore as active employee"
                                : "Mark as Left Company (hide from main view)"
                            }
                            style={{
                              padding: "6px 10px",
                              background: r.leftCompany
                                ? "linear-gradient(135deg,#10b981,#047857)"
                                : "linear-gradient(135deg,#dc2626,#7c2d12)",
                              color: "#fff",
                              border: 0,
                              borderRadius: 999,
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {r.leftCompany ? "↩ Restore" : "🚪 Left"}
                          </button>
                          <button
                            onClick={() => startEdit(i)}
                            style={{
                              padding: "6px 12px",
                              background:
                                "linear-gradient(135deg,#2563eb,#1d4ed8)",
                              color: "#fff",
                              border: 0,
                              borderRadius: 999,
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            Edit
                          </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ===== Image modal ===== */}
          {modalImage && (
            <div
              onClick={closeModal}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(15,23,42,0.82)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background:
                    "linear-gradient(135deg,#f9fafb,#e5e7eb,#d1d5db)",
                  borderRadius: 16,
                  padding: 16,
                  maxWidth: "90%",
                  maxHeight: "90%",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 24px 60px rgba(15,23,42,0.85)",
                  border: "1px solid rgba(148,163,184,0.9)",
                }}
              >
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#0f172a",
                    }}
                  >
                    {modalImage.name || "OHC Certificate"}{" "}
                    {modalImage.appNo
                      ? ` (Employee Number: ${modalImage.appNo})`
                      : ""}
                  </div>
                  <button
                    onClick={closeModal}
                    style={{
                      border: 0,
                      background: "transparent",
                      fontSize: 20,
                      fontWeight: 700,
                      cursor: "pointer",
                      lineHeight: 1,
                      color: "#111827",
                    }}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#020617",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                  }}
                >
                  <img
                    src={modalImage.src}
                    alt="OHC certificate"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      borderRadius: 8,
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                  }}
                >
                  <a
                    href={modalImage.src}
                    download={`OHC-${modalImage.appNo || "certificate"}.jpg`}
                    style={{
                      textDecoration: "none",
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: 0,
                      background:
                        "linear-gradient(135deg,#0ea5e9,#0369a1)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    Download
                  </a>
                  <button
                    onClick={() => handleDeleteImage(modalImage)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: 0,
                      background:
                        "linear-gradient(135deg,#ef4444,#b91c1c)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Remove Image
                  </button>
                  <button
                    onClick={closeModal}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: 0,
                      background:
                        "linear-gradient(135deg,#94a3b8,#64748b)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========= Small UI helpers ========= */
function Field({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontWeight: 600,
        color: "#1f2937",
        fontSize: 13,
      }}
    >
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 8,
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          fontSize: 13,
          background:
            "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
        }}
      />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontWeight: 600,
        color: "#1f2937",
        fontSize: 13,
      }}
    >
      {label}
      <input
        type="date"
        value={toIsoYMD(value)}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 8,
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          fontSize: 13,
          background:
            "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontWeight: 600,
        color: "#1f2937",
        fontSize: 13,
      }}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 8,
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          fontSize: 13,
          background:
            "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const selectStyle = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.9)",
  background: "linear-gradient(135deg,#ffffff,#f1f5f9)",
  fontSize: 12,
  fontWeight: 600,
  color: "#0f172a",
  cursor: "pointer",
  outline: "none",
  minWidth: 200,
  maxWidth: 360,
  textOverflow: "ellipsis",
};

function StatCard({ label, value, color, icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 14,
        border: active
          ? `2px solid ${color}`
          : "1px solid rgba(148,163,184,0.6)",
        background: active
          ? `linear-gradient(135deg, ${color}15, ${color}30)`
          : "linear-gradient(135deg,#ffffff,#f8fafc)",
        cursor: "pointer",
        boxShadow: active
          ? `0 6px 18px ${color}55`
          : "0 2px 6px rgba(15,23,42,0.08)",
        transition: "all 0.15s ease",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color,
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </button>
  );
}
