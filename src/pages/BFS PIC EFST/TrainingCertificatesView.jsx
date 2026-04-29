// D:\inspection-react-full\src\pages\BFS PIC EFST\TrainingCertificatesView.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

/* Server report type */
const TYPE = "training_certificate";

/* ========= Helpers ========= */
async function jsonFetch(url, opts = {}) {
  // ندمج الهيدرز ونتأكد من Content-Type إذا في body
  const baseHeaders = { Accept: "application/json" };
  const userHeaders = opts.headers || {};
  const headers = { ...baseHeaders, ...userHeaders };

  const hasBody = opts.body !== undefined && opts.body !== null;
  const hasContentType = Object.keys(headers).some(
    (h) => h.toLowerCase() === "content-type"
  );

  if (hasBody && !hasContentType) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...opts,
    headers,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

// دالة ضغط الصورة (نفس الإدخال)
async function compressImage(file) {
  const dataURL = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataURL;
  });

  const maxSide = 1280;
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const out = canvas.toDataURL("image/jpeg", 0.8);
  return out;
}

// إرجاع لستة السجلات كما هي (مع id + payload)
function extractReportsList(data) {
  let arr = [];
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.items)) arr = data.items;
  else if (Array.isArray(data?.data?.items)) arr = data.data.items;
  else if (Array.isArray(data?.data)) arr = data.data;
  else if (Array.isArray(data?.results)) arr = data.results;
  else if (Array.isArray(data?.rows)) arr = data.rows;
  else if (Array.isArray(data?.list)) arr = data.list;
  return arr.filter((x) => (x?.type ? x.type === TYPE : true));
}

// جلب الـ id من السجل
function getId(r) {
  return (
    r?.id ||
    r?._id ||
    r?.reportId ||
    r?.payload?.id ||
    r?.payload?._id ||
    undefined
  );
}

// أنواع الكورس
const COURSE_OPTIONS = [
  { value: "", label: "-- Select Course Type --" },
  { value: "BFS", label: "Basic Food Safety (BFS)" },
  { value: "PIC", label: "Person In Charge (PIC)" },
  { value: "EFST", label: "EFST" },
  { value: "HACCP", label: "HACCP" },
  { value: "OTHER", label: "Other / Custom" },
];

/* ========= Status helpers (smart sort by expiry) ========= */
// عتبات الإنذار بالأيام
const EXPIRING_SOON_DAYS = 30; // قريب جداً
const EXPIRING_DAYS = 90;      // قريب

// تحويل تاريخ "YYYY-MM-DD" إلى Date في منتصف اليوم لتجنب فروقات التوقيت
function parseDateOnly(s) {
  if (!s) return null;
  const str = String(s).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const da = parseInt(m[3], 10);
  return new Date(y, mo, da, 12, 0, 0, 0);
}

// عدد الأيام المتبقية لتاريخ الانتهاء (موجب = صالح، سالب = منتهي)
function daysUntil(expiryDate) {
  const d = parseDateOnly(expiryDate);
  if (!d) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diffMs = d.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// حالة الشهادة
function getCertStatus(expiryDate) {
  const days = daysUntil(expiryDate);
  if (days === null) {
    return {
      key: "no_expiry",
      label: "No Expiry",
      days: null,
      bg: "linear-gradient(135deg,#9ca3af,#6b7280)",
      rowBg: "transparent",
      sortRank: 4,
    };
  }
  if (days < 0) {
    return {
      key: "expired",
      label: "Expired",
      days,
      bg: "linear-gradient(135deg,#ef4444,#b91c1c)",
      rowBg: "rgba(239,68,68,0.10)",
      sortRank: 0,
    };
  }
  if (days <= EXPIRING_SOON_DAYS) {
    return {
      key: "expiring_soon",
      label: "Expiring Soon",
      days,
      bg: "linear-gradient(135deg,#f97316,#c2410c)",
      rowBg: "rgba(249,115,22,0.10)",
      sortRank: 1,
    };
  }
  if (days <= EXPIRING_DAYS) {
    return {
      key: "expiring",
      label: "Expiring",
      days,
      bg: "linear-gradient(135deg,#facc15,#a16207)",
      rowBg: "rgba(250,204,21,0.10)",
      sortRank: 2,
    };
  }
  return {
    key: "valid",
    label: "Valid",
    days,
    bg: "linear-gradient(135deg,#22c55e,#15803d)",
    rowBg: "transparent",
    sortRank: 3,
  };
}

// خيارات الفرز
const SORT_OPTIONS = [
  { value: "expiry_asc",  label: "Expiry: Soonest → Latest (Smart)" },
  { value: "expiry_desc", label: "Expiry: Latest → Soonest" },
  { value: "name_asc",    label: "Name (A → Z)" },
  { value: "name_desc",   label: "Name (Z → A)" },
  { value: "branch_asc",  label: "Branch (A → Z)" },
  { value: "saved_desc",  label: "Saved Date (Newest)" },
  { value: "saved_asc",   label: "Saved Date (Oldest)" },
];

// خيارات تصفية الحالة
const STATUS_FILTERS = [
  { value: "all",           label: "All",            color: "#1d4ed8" },
  { value: "expired",       label: "Expired",        color: "#b91c1c" },
  { value: "expiring_soon", label: "≤ 30 Days",      color: "#c2410c" },
  { value: "expiring",      label: "≤ 90 Days",      color: "#a16207" },
  { value: "valid",         label: "Valid",          color: "#15803d" },
  { value: "no_expiry",     label: "No Expiry",      color: "#6b7280" },
  { value: "left_company",  label: "🚪 Left Company", color: "#7c2d12" },
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
function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TrainingCertificatesView() {
  const navigate = useNavigate();

  const [raw, setRaw] = useState([]); // سجلات السيرفر
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

  // فلاتر وفرز ذكي
  const [statusFilter, setStatusFilter] = useState("all"); // all|expired|expiring_soon|expiring|valid|no_expiry
  const [branchFilter, setBranchFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("");
  const [sortBy, setSortBy] = useState("expiry_asc");
  const [groupByBranch, setGroupByBranch] = useState(false);

  // حالات التعديل/الحذف
  const [editingRid, setEditingRid] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingRid, setDeletingRid] = useState(null);

  // معاينة الصورة بالحجم الكبير
  const [previewImage, setPreviewImage] = useState(null);

  // تحميل السجلات
  async function reload() {
    setLoading(true);
    setMsg("");
    try {
      const { ok, status, data } = await jsonFetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(
          TYPE
        )}&limit=1000&sort=-createdAt`
      );
      if (!ok) {
        setMsg(
          `Failed to load certificates (HTTP ${status}). Please try again.`
        );
        setLoading(false);
        return;
      }
      const list = extractReportsList(data);
      setRaw(list);
      setLoading(false);
    } catch (err) {
      console.error("TrainingCertificatesView reload error:", err);
      setMsg(
        "Network error while loading certificates. Please check your connection and try again."
      );
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // كل السجلات بدون أي فلتر (لأي قائمة dropdown أو إحصاءات أساسية)
  const allRows = useMemo(() => {
    return raw.map((rec, idx) => {
      const p = rec?.payload || rec || {};
      const savedAt =
        p.savedAt || rec?.createdAt || rec?.created_at || "";
      const imageData = p.imageData || "";
      const status = getCertStatus(p.expiryDate || "");

      return {
        idx,
        _rid: getId(rec),
        employeeNo: p.employeeNo || p.appNo || "",
        name: p.name || "",
        nationality: p.nationality || "",
        branch: p.branch || "",
        job: p.job || "",
        courseType: p.courseType || "",
        issueDate: p.issueDate || "",
        expiryDate: p.expiryDate || "",
        savedAt,
        hasImage: !!imageData,
        imageData,
        // علامة "ترك الشركة" - السجل محفوظ ومخفي من العرض الافتراضي
        leftCompany: p.leftCompany === true,
        status,
        _record: rec,
      };
    });
  }, [raw]);

  // قوائم للفلاتر (Branches / Courses / Nationalities)
  const branchList = useMemo(() => {
    const s = new Set();
    allRows.forEach((r) => {
      if (r.branch) s.add(r.branch);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const courseList = useMemo(() => {
    const s = new Set();
    allRows.forEach((r) => {
      if (r.courseType) s.add(r.courseType);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const nationalityList = useMemo(() => {
    const s = new Set();
    allRows.forEach((r) => {
      if (r.nationality) s.add(r.nationality);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  // إحصاءات على الموظفين النشطين فقط (نستثني من ترك الشركة)
  const stats = useMemo(() => {
    const out = {
      total: 0,
      expired: 0,
      expiring_soon: 0,
      expiring: 0,
      valid: 0,
      no_expiry: 0,
      left_company: 0,
      withImage: 0,
    };
    allRows.forEach((r) => {
      if (r.leftCompany) {
        out.left_company += 1;
        return;
      }
      out.total += 1;
      out[r.status.key] = (out[r.status.key] || 0) + 1;
      if (r.hasImage) out.withImage += 1;
    });
    return out;
  }, [allRows]);

  // إحصاءات لكل فرع (نتجاهل من ترك الشركة)
  const branchStats = useMemo(() => {
    const map = new Map();
    allRows.forEach((r) => {
      if (r.leftCompany) return;
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
  }, [allRows]);

  // الصفوف بعد تطبيق كل الفلاتر والفرز
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    let out = allRows.slice();

    // فلتر بحث نصي
    if (q) {
      out = out.filter((r) => {
        return (
          String(r.employeeNo).toLowerCase().includes(q) ||
          String(r.name).toLowerCase().includes(q) ||
          String(r.branch).toLowerCase().includes(q) ||
          String(r.job).toLowerCase().includes(q) ||
          String(r.courseType).toLowerCase().includes(q) ||
          String(r.nationality).toLowerCase().includes(q)
        );
      });
    }

    // Left Company: نخفيها افتراضياً، نظهرها فقط عند اختيار الفلتر "left_company"
    if (statusFilter === "left_company") {
      out = out.filter((r) => r.leftCompany);
    } else {
      out = out.filter((r) => !r.leftCompany);
      // فلتر الحالة العادية
      if (statusFilter !== "all") {
        out = out.filter((r) => r.status.key === statusFilter);
      }
    }

    // فلتر الفرع
    if (branchFilter) {
      out = out.filter((r) => r.branch === branchFilter);
    }

    // فلتر الكورس
    if (courseFilter) {
      out = out.filter((r) => r.courseType === courseFilter);
    }

    // فلتر الجنسية
    if (nationalityFilter) {
      out = out.filter((r) => r.nationality === nationalityFilter);
    }

    // الفرز الذكي
    const cmpStr = (a, b) => String(a || "").localeCompare(String(b || ""));
    const expiryRank = (r) => {
      // المنتهية أولاً، ثم القريبة، ثم الصالحة، ثم بدون انتهاء
      if (r.status.key === "no_expiry") return Number.POSITIVE_INFINITY;
      const d = r.status.days;
      return d === null ? Number.POSITIVE_INFINITY : d;
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
        case "saved_desc":
          return cmpStr(b.savedAt, a.savedAt);
        case "saved_asc":
          return cmpStr(a.savedAt, b.savedAt);
        default:
          return 0;
      }
    });

    return out;
  }, [
    allRows,
    search,
    statusFilter,
    branchFilter,
    courseFilter,
    nationalityFilter,
    sortBy,
  ]);

  // مسح كل الفلاتر
  function clearAllFilters() {
    setSearch("");
    setStatusFilter("all");
    setBranchFilter("");
    setCourseFilter("");
    setNationalityFilter("");
    setSortBy("expiry_asc");
  }

  // تصدير CSV للسجلات الظاهرة حالياً
  function exportCSV() {
    if (!rows.length) {
      alert("No certificates to export.");
      return;
    }
    const header = [
      "#",
      "Employee No",
      "Name",
      "Nationality",
      "Branch",
      "Job Title",
      "Course Type",
      "Issue Date",
      "Expiry Date",
      "Days Left",
      "Status",
      "Left Company",
      "Saved At",
    ];
    const body = rows.map((r, i) => [
      i + 1,
      r.employeeNo,
      r.name,
      r.nationality,
      r.branch,
      r.job,
      r.courseType,
      r.issueDate,
      r.expiryDate,
      r.status.days === null ? "" : r.status.days,
      r.leftCompany ? "Left Company" : r.status.label,
      r.leftCompany ? "Yes" : "No",
      r.savedAt ? String(r.savedAt).slice(0, 10) : "",
    ]);
    const ts = new Date().toISOString().slice(0, 10);
    downloadCSV(`training_certificates_${ts}.csv`, [header, ...body]);
  }

  // طباعة الجدول الحالي
  function printList() {
    if (!rows.length) {
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

    const trs = rows
      .map(
        (r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHTML(r.employeeNo)}</td>
          <td>${escapeHTML(r.name)}</td>
          <td>${escapeHTML(r.branch)}</td>
          <td>${escapeHTML(r.job)}</td>
          <td>${escapeHTML(r.courseType)}</td>
          <td>${escapeHTML(r.issueDate)}</td>
          <td>${escapeHTML(r.expiryDate || "—")}</td>
          <td>${r.status.days === null ? "—" : r.status.days}</td>
          <td style="color:${styleColor(r.status.key)};font-weight:700">${
          r.status.label
        }</td>
        </tr>`
      )
      .join("");

    w.document.write(`
      <html>
        <head>
          <title>Training Certificates Report</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Tahoma, Arial, sans-serif; padding: 16px; }
            h1 { font-size: 18px; margin: 0 0 6px; }
            .meta { font-size: 12px; color: #555; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            thead { background: #111827; color: #fff; }
            tr:nth-child(even) td { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Training Certificates (BFS / EFST / PIC / HACCP)</h1>
          <div class="meta">
            Records: ${rows.length} &nbsp;|&nbsp;
            Status: ${statusFilter} &nbsp;|&nbsp;
            Branch: ${branchFilter || "All"} &nbsp;|&nbsp;
            Course: ${courseFilter || "All"} &nbsp;|&nbsp;
            Generated: ${new Date().toLocaleString()}
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Employee No</th>
                <th>Name</th>
                <th>Branch</th>
                <th>Job</th>
                <th>Course</th>
                <th>Issue</th>
                <th>Expiry</th>
                <th>Days Left</th>
                <th>Status</th>
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

  // بدء تعديل سطر
  function startEdit(row) {
    if (!row._rid) {
      alert("⚠️ Missing record id. Cannot edit this row.");
      return;
    }
    if (
      !window.confirm(
        "Enable edit mode for this certificate?\nهل تريد تعديل هذه الشهادة؟"
      )
    )
      return;

    const origPayload = row._record?.payload || row._record || {};

    setEditDraft({
      employeeNo: row.employeeNo || "",
      name: row.name || "",
      nationality: row.nationality || "",
      branch: row.branch || "",
      job: row.job || "",
      courseType: row.courseType || "",
      issueDate: row.issueDate || "",
      expiryDate: row.expiryDate || "",
      imageData: origPayload.imageData || row.imageData || "",
      imageName: origPayload.imageName || "",
      imageType: origPayload.imageType || "",
    });
    setEditingRid(row._rid);
    setMsg("");
  }

  function cancelEdit() {
    setEditingRid(null);
    setEditDraft(null);
  }

  function updateEditField(key, value) {
    setEditDraft((prev) => ({ ...(prev || {}), [key]: value }));
  }

  // اختيار صورة جديدة أثناء التعديل
  async function handleEditImageSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      alert("Please select an image file.");
      return;
    }

    try {
      const compressed = await compressImage(file);
      setEditDraft((prev) => ({
        ...(prev || {}),
        imageData: compressed,
        imageName: file.name,
        imageType: "image/jpeg",
      }));
    } catch (err) {
      console.error("edit image compress error:", err);
      alert("Image processing failed. Try another image.");
    }
  }

  // حذف الصورة في وضع التعديل
  function handleRemoveEditImage() {
    if (
      !window.confirm(
        "Remove the certificate image for this record?\nحذف صورة الشهادة من هذا السجل؟"
      )
    )
      return;

    setEditDraft((prev) => ({
      ...(prev || {}),
      imageData: "",
      imageName: "",
      imageType: "",
    }));
  }

  // حفظ التعديل (PUT مع fallback POST + حذف القديم عند POST)
  async function saveEdit() {
    if (!editingRid || !editDraft) return;

    if (
      !window.confirm(
        "Save changes for this certificate?\nهل تريد حفظ التعديلات على هذه الشهادة؟"
      )
    )
      return;

    const rid = editingRid;
    const rec = raw.find((r) => getId(r) === rid);
    const origPayload = rec?.payload || rec || {};

    const payload = {
      ...origPayload,
      employeeNo: editDraft.employeeNo,
      name: editDraft.name,
      nationality: editDraft.nationality,
      branch: editDraft.branch,
      job: editDraft.job,
      courseType: editDraft.courseType,
      issueDate: editDraft.issueDate,
      expiryDate: editDraft.expiryDate || undefined,
      savedAt: new Date().toISOString(),
      imageData: editDraft.imageData || undefined,
      imageName: editDraft.imageData
        ? editDraft.imageName || origPayload.imageName || "certificate.jpg"
        : undefined,
      imageType: editDraft.imageData
        ? editDraft.imageType || "image/jpeg"
        : undefined,
    };

    try {
      setSavingEdit(true);
      setMsg("");

      let ok = false;
      let status = 0;
      let data = null;
      let didUsePut = false;

      if (rid) {
        // محاولة تعديل السجل الحالي
        const putRes = await jsonFetch(
          `${API_BASE}/api/reports/${encodeURIComponent(rid)}`,
          {
            method: "PUT",
            body: JSON.stringify({ type: TYPE, payload }),
          }
        );
        didUsePut = true;
        ok = putRes.ok;
        status = putRes.status;
        data = putRes.data;
      }

      if (!ok) {
        // Fallback: POST سجل جديد (لو الـ PUT غير مدعوم أو فشل)
        const postRes = await jsonFetch(`${API_BASE}/api/reports`, {
          method: "POST",
          body: JSON.stringify({
            reporter: "MOHAMAD ABDULLAH",
            type: TYPE,
            payload,
          }),
        });
        ok = postRes.ok;
        status = postRes.status;
        data = postRes.data;

        // لو الـ POST نجح ولدينا rid قديم -> نحذفه
        if (ok && rid) {
          try {
            await fetch(
              `${API_BASE}/api/reports/${encodeURIComponent(rid)}`,
              { method: "DELETE" }
            );
          } catch (e) {
            console.warn("Delete old record after POST failed:", e);
          }
        }
      }

      if (!ok) {
        const serverMsg =
          data?.message ||
          (status >= 500
            ? "Server error. Please try again later."
            : "Failed to save changes. Please check and try again.");
        setMsg(`Failed to save changes (HTTP ${status}). ${serverMsg}`);
        return;
      }

      await reload();
      setMsg(
        didUsePut
          ? "✅ Certificate updated successfully."
          : "✅ Certificate updated successfully (new record, old one removed)."
      );
      setEditingRid(null);
      setEditDraft(null);
    } catch (err) {
      console.error("saveEdit error:", err);
      setMsg(
        "Network error while saving changes. Please check your connection and try again."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // قلب حالة Left Company بسرعة (نفس نمط saveEdit: PUT أولاً ثم POST + DELETE)
  async function toggleLeftCompany(row) {
    if (!row?._rid) {
      alert("⚠️ Missing record id. Cannot update this row.");
      return;
    }
    const newVal = !row.leftCompany;
    const action = newVal
      ? "Mark as Left Company"
      : "Restore (Active Employee)";
    const note = newVal
      ? "This will hide the record from the main view & expiry alerts. Record stays in the database."
      : "This will return the record to the active list.";
    if (!window.confirm(`${action}?\n\n${note}`)) return;

    const rec = raw.find((r) => getId(r) === row._rid);
    const origPayload = rec?.payload || rec || {};
    const payload = {
      ...origPayload,
      leftCompany: newVal,
      savedAt: new Date().toISOString(),
    };

    try {
      setMsg("");
      let ok = false;
      let status = 0;
      let data = null;

      const putRes = await jsonFetch(
        `${API_BASE}/api/reports/${encodeURIComponent(row._rid)}`,
        { method: "PUT", body: JSON.stringify({ type: TYPE, payload }) }
      );
      ok = putRes.ok;
      status = putRes.status;
      data = putRes.data;

      if (!ok) {
        // Fallback: POST سجل جديد ثم حذف القديم
        const postRes = await jsonFetch(`${API_BASE}/api/reports`, {
          method: "POST",
          body: JSON.stringify({
            reporter: "MOHAMAD ABDULLAH",
            type: TYPE,
            payload,
          }),
        });
        ok = postRes.ok;
        status = postRes.status;
        data = postRes.data;
        if (ok) {
          try {
            await fetch(
              `${API_BASE}/api/reports/${encodeURIComponent(row._rid)}`,
              { method: "DELETE" }
            );
          } catch (e) {
            console.warn("Delete old after POST failed:", e);
          }
        }
      }

      if (!ok) {
        setMsg(
          `Failed to update (HTTP ${status}). ${data?.message || ""}`
        );
        return;
      }

      await reload();
      setMsg(
        newVal
          ? "✅ Marked as Left Company (hidden from main view)."
          : "✅ Restored as active employee."
      );
    } catch (err) {
      console.error("toggleLeftCompany error:", err);
      setMsg("❌ Network error while updating. Please try again.");
    }
  }

  // حذف شهادة
  async function handleDeleteCert(row) {
    const rid = row._rid;
    if (!rid) {
      alert("⚠️ Missing record id. Cannot delete this row.");
      return;
    }
    if (
      !window.confirm(
        "Are you sure you want to delete this certificate?\nهل تريد حذف هذه الشهادة؟"
      )
    )
      return;

    try {
      setDeletingRid(rid);
      setMsg("");
      const res = await fetch(
        `${API_BASE}/api/reports/${encodeURIComponent(rid)}`,
        { method: "DELETE" }
      );

      // 404 نعتبرها كأن السجل غير موجود أصلاً
      if (!res.ok && res.status !== 404) {
        throw new Error(`HTTP ${res.status}`);
      }

      await reload();
      setMsg("✅ Certificate deleted successfully.");
    } catch (err) {
      console.error("Delete certificate error:", err);
      setMsg("❌ Delete failed. Please try again.");
    } finally {
      setDeletingRid(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2.5rem 1.5rem",
        background:
          "radial-gradient(circle at top left, #1d4ed8 0%, #020617 50%, #020617 100%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        direction: "ltr",
        boxSizing: "border-box",
        fontFamily: "Inter, Tahoma, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.94))",
          borderRadius: 24,
          padding: 2,
          boxShadow: "0 24px 60px rgba(15,23,42,0.75)",
          border: "1px solid rgba(148,163,184,0.5)",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle at top right, #eff6ff 0%, #f9fafb 40%, #e5e7eb 100%)",
            borderRadius: 22,
            padding: "1.75rem 1.75rem 1.5rem",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "flex-start",
              marginBottom: 18,
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
                    "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(8,47,73,0.08))",
                  color: "#1d4ed8",
                  border: "1px solid rgba(59,130,246,0.6)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "999px",
                    background:
                      "radial-gradient(circle, #3b82f6 0%, #1d4ed8 60%, #1e3a8a 100%)",
                  }}
                />
                Training Certificates Register
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
                📋 All BFS / PIC / EFST / HACCP Certificates
              </h2>
              <div
                style={{
                  fontSize: 13,
                  color: "#4b5563",
                }}
              >
                View, edit, or delete training certificates saved from the BFS /
                PIC / EFST entry screen, per employee.
              </div>
            </div>

            <div
              style={{
                textAlign: "right",
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              <div style={{ fontWeight: 600, color: "#111827" }}>
                Records:{" "}
                <span style={{ color: "#1d4ed8" }}>{rows.length}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/training-certificates")}
                style={{
                  marginTop: 6,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    "linear-gradient(135deg,#0f172a,#1f2937,#020617)",
                  color: "#f9fafb",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 8px 18px rgba(15,23,42,0.55)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ↩ Back to Entry
              </button>
            </div>
          </div>

          {/* Stat cards */}
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
              label="Left Company"
              value={stats.left_company}
              color="#7c2d12"
              icon="🚪"
              active={statusFilter === "left_company"}
              onClick={() => setStatusFilter("left_company")}
            />
          </div>

          {/* Filter row 1: Status chips */}
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

          {/* Filter row 2: dropdowns + sort + actions */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              style={selectStyle}
              title="Filter by Branch"
            >
              <option value="">🏢 All Branches</option>
              {branchList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              style={selectStyle}
              title="Filter by Course Type"
            >
              <option value="">🎓 All Courses</option>
              {courseList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={nationalityFilter}
              onChange={(e) => setNationalityFilter(e.target.value)}
              style={selectStyle}
              title="Filter by Nationality"
            >
              <option value="">🌍 All Nationalities</option>
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
          </div>

          {/* Search + status */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <input
              type="text"
              placeholder="🔎 Search by employee, name, branch, job, course, nationality..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: 220,
                padding: "8px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.9)",
                background:
                  "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <div
              style={{
                fontSize: 12,
                color: "#4b5563",
                fontWeight: 600,
              }}
            >
              Showing <b style={{ color: "#1d4ed8" }}>{rows.length}</b> of{" "}
              {stats.total}
            </div>
            {loading && (
              <div
                style={{
                  fontSize: 12,
                  color: "#4b5563",
                  fontWeight: 600,
                }}
              >
                ⏳ Loading certificates…
              </div>
            )}
            {!loading && msg && (
              <div
                style={{
                  fontSize: 12,
                  color: msg.startsWith("✅") ? "#15803d" : "#b91c1c",
                  fontWeight: 600,
                }}
              >
                {msg}
              </div>
            )}
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
                      branchFilter === b.branch ? "" : b.branch
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

          {/* Table */}
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.7)",
              overflow: "hidden",
              background:
                "linear-gradient(135deg,rgba(248,250,252,0.98),rgba(241,245,249,0.96))",
            }}
          >
            <div
              style={{
                maxHeight: "65vh",
                overflow: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        "linear-gradient(135deg,#111827,#1f2937,#111827)",
                      color: "#e5e7eb",
                    }}
                  >
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Employee No</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Nationality</th>
                    <th style={thStyle}>Branch</th>
                    <th style={thStyle}>Job Title</th>
                    <th style={thStyle}>Course Type</th>
                    <th style={thStyle}>Issue Date</th>
                    <th style={thStyle}>Expiry Date</th>
                    <th style={thStyle}>Days Left</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Saved At</th>
                    <th style={thStyle}>Image</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={14}
                        style={{
                          padding: 16,
                          textAlign: "center",
                          color: "#6b7280",
                          fontWeight: 600,
                        }}
                      >
                        No certificates found.
                      </td>
                    </tr>
                  )}

                  {rows.map((r, idx) => {
                    const isEditing =
                      editingRid && r._rid === editingRid;

                    const stripeBg =
                      idx % 2 === 0 ? "#f9fafb" : "#f3f4f6";
                    const rowBg =
                      r.status.rowBg && r.status.rowBg !== "transparent"
                        ? r.status.rowBg
                        : stripeBg;
                    const showLeftBar =
                      r.status.key === "expired" ||
                      r.status.key === "expiring_soon" ||
                      r.status.key === "expiring";

                    return (
                      <tr
                        key={r._rid || r.idx}
                        style={{
                          backgroundColor: rowBg,
                          borderLeft: showLeftBar
                            ? `4px solid ${
                                r.status.key === "expired"
                                  ? "#b91c1c"
                                  : r.status.key === "expiring_soon"
                                  ? "#c2410c"
                                  : "#a16207"
                              }`
                            : "4px solid transparent",
                        }}
                      >
                        <td style={tdStyle}>{idx + 1}</td>

                        {/* Employee No */}
                        <td style={tdStyle}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDraft?.employeeNo || ""}
                              onChange={(e) =>
                                updateEditField(
                                  "employeeNo",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                borderRadius: 6,
                                border:
                                  "1px solid rgba(148,163,184,0.9)",
                                fontSize: 12,
                              }}
                            />
                          ) : (
                            r.employeeNo
                          )}
                        </td>

                        {/* Name */}
                        <td style={tdStyle}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDraft?.name || ""}
                              onChange={(e) =>
                                updateEditField("name", e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                borderRadius: 6,
                                border:
                                  "1px solid rgba(148,163,184,0.9)",
                                fontSize: 12,
                              }}
                            />
                          ) : (
                            r.name
                          )}
                        </td>

                        {/* Nationality */}
                        <td style={tdStyle}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDraft?.nationality || ""}
                              onChange={(e) =>
                                updateEditField(
                                  "nationality",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                borderRadius: 6,
                                border:
                                  "1px solid rgba(148,163,184,0.9)",
                                fontSize: 12,
                              }}
                            />
                          ) : (
                            r.nationality
                          )}
                        </td>

                        {/* Branch */}
                        <td style={tdStyle}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDraft?.branch || ""}
                              onChange={(e) =>
                                updateEditField(
                                  "branch",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                borderRadius: 6,
                                border:
                                  "1px solid rgba(148,163,184,0.9)",
                                fontSize: 12,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                              }}
                            >
                              <span>{r.branch}</span>
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
                                    width: "fit-content",
                                  }}
                                >
                                  🚪 LEFT COMPANY
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Job */}
                        <td style={tdStyle}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDraft?.job || ""}
                              onChange={(e) =>
                                updateEditField("job", e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                borderRadius: 6,
                                border:
                                  "1px solid rgba(148,163,184,0.9)",
                                fontSize: 12,
                              }}
                            />
                          ) : (
                            r.job
                          )}
                        </td>

                        {/* Course Type */}
                        <td style={tdStyle}>
                          {isEditing ? (
                            <select
                              value={editDraft?.courseType || ""}
                              onChange={(e) =>
                                updateEditField(
                                  "courseType",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                borderRadius: 6,
                                border:
                                  "1px solid rgba(148,163,184,0.9)",
                                fontSize: 12,
                              }}
                            >
                              {COURSE_OPTIONS.map((o) => (
                                <option
                                  key={o.value}
                                  value={o.value}
                                >
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            r.courseType
                          )}
                        </td>

                        {/* Issue Date */}
                        <td style={tdStyle}>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editDraft?.issueDate || ""}
                              onChange={(e) =>
                                updateEditField(
                                  "issueDate",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                borderRadius: 6,
                                border:
                                  "1px solid rgba(148,163,184,0.9)",
                                fontSize: 12,
                              }}
                            />
                          ) : (
                            r.issueDate
                          )}
                        </td>

                        {/* Expiry Date */}
                        <td style={tdStyle}>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editDraft?.expiryDate || ""}
                              onChange={(e) =>
                                updateEditField(
                                  "expiryDate",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px 6px",
                                borderRadius: 6,
                                border:
                                  "1px solid rgba(148,163,184,0.9)",
                                fontSize: 12,
                              }}
                            />
                          ) : (
                            r.expiryDate || "—"
                          )}
                        </td>

                        {/* Days Left */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          {r.status.days === null ? (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          ) : r.status.days < 0 ? (
                            <span
                              style={{
                                fontWeight: 700,
                                color: "#b91c1c",
                              }}
                              title={`Expired ${Math.abs(
                                r.status.days
                              )} day(s) ago`}
                            >
                              -{Math.abs(r.status.days)}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontWeight: 700,
                                color:
                                  r.status.key === "expiring_soon"
                                    ? "#c2410c"
                                    : r.status.key === "expiring"
                                    ? "#a16207"
                                    : "#15803d",
                              }}
                              title={`${r.status.days} day(s) remaining`}
                            >
                              {r.status.days}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 800,
                              color: "#fff",
                              background: r.status.bg,
                              letterSpacing: 0.3,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.status.label}
                          </span>
                        </td>

                        {/* Saved At */}
                        <td style={tdStyle}>
                          {r.savedAt
                            ? String(r.savedAt).slice(0, 10)
                            : "—"}
                        </td>

                        {/* Image */}
                        <td style={tdStyle}>
                          {isEditing ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                                alignItems: "flex-start",
                              }}
                            >
                              {editDraft?.imageData ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage(editDraft.imageData)
                                  }
                                  style={{
                                    border: "none",
                                    padding: 0,
                                    background: "transparent",
                                    cursor: "pointer",
                                  }}
                                >
                                  <img
                                    src={editDraft.imageData}
                                    alt="Certificate"
                                    style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: 8,
                                      objectFit: "cover",
                                      border: "1px solid #d1d5db",
                                      boxShadow:
                                        "0 2px 6px rgba(15,23,42,0.25)",
                                    }}
                                  />
                                </button>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "#9ca3af",
                                  }}
                                >
                                  No image
                                </span>
                              )}

                              <div
                                style={{
                                  display: "flex",
                                  gap: 4,
                                  flexWrap: "wrap",
                                }}
                              >
                                <label
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: 999,
                                    border: "none",
                                    background:
                                      "linear-gradient(135deg,#0ea5e9,#0369a1)",
                                    color: "#f9fafb",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  Change
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleEditImageSelect}
                                    style={{ display: "none" }}
                                  />
                                </label>

                                {editDraft?.imageData && (
                                  <button
                                    type="button"
                                    onClick={handleRemoveEditImage}
                                    style={{
                                      padding: "3px 8px",
                                      borderRadius: 999,
                                      border: "none",
                                      background:
                                        "linear-gradient(135deg,#ef4444,#b91c1c)",
                                      color: "#f9fafb",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : r.hasImage ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage(r.imageData)
                              }
                              style={{
                                border: "none",
                                background: "transparent",
                                padding: 0,
                                cursor: "pointer",
                              }}
                            >
                              <img
                                src={r.imageData}
                                alt="Certificate"
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 8,
                                  objectFit: "cover",
                                  border: "1px solid #d1d5db",
                                  boxShadow:
                                    "0 2px 6px rgba(15,23,42,0.25)",
                                }}
                              />
                            </button>
                          ) : (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#9ca3af",
                              }}
                            >
                              No image
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={tdStyle}>
                          {!r._rid ? (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#9ca3af",
                              }}
                            >
                              —
                            </span>
                          ) : isEditing ? (
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={savingEdit}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  border: "none",
                                  background:
                                    "linear-gradient(135deg,#22c55e,#16a34a,#15803d)",
                                  color: "#fff",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: savingEdit
                                    ? "default"
                                    : "pointer",
                                }}
                              >
                                {savingEdit ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  border: "none",
                                  background:
                                    "linear-gradient(135deg,#e5e7eb,#d1d5db)",
                                  color: "#111827",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => startEdit(r)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  border: "none",
                                  background:
                                    "linear-gradient(135deg,#0ea5e9,#0369a1)",
                                  color: "#f9fafb",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleLeftCompany(r)}
                                title={
                                  r.leftCompany
                                    ? "Restore as active employee"
                                    : "Mark as Left Company (hide from main view)"
                                }
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  border: "none",
                                  background: r.leftCompany
                                    ? "linear-gradient(135deg,#10b981,#047857)"
                                    : "linear-gradient(135deg,#dc2626,#7c2d12)",
                                  color: "#f9fafb",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                {r.leftCompany ? "↩ Restore" : "🚪 Left"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCert(r)}
                                disabled={deletingRid === r._rid}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  border: "none",
                                  background:
                                    "linear-gradient(135deg,#ef4444,#b91c1c)",
                                  color: "#f9fafb",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor:
                                    deletingRid === r._rid
                                      ? "default"
                                      : "pointer",
                                }}
                              >
                                {deletingRid === r._rid
                                  ? "Deleting…"
                                  : "Delete"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Overlay */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90%",
              maxHeight: "90%",
            }}
          >
            <img
              src={previewImage}
              alt="Certificate full"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                borderRadius: 16,
                boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
                border: "2px solid #e5e7eb",
              }}
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                width: 32,
                height: 32,
                borderRadius: "999px",
                border: "none",
                background:
                  "linear-gradient(135deg,#111827,#1f2937,#111827)",
                color: "#f9fafb",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: "8px 10px",
  textAlign: "left",
  borderBottom: "1px solid rgba(31,41,55,0.8)",
  position: "sticky",
  top: 0,
  zIndex: 1,
  fontWeight: 700,
  fontSize: 11,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "6px 8px",
  borderBottom: "1px solid rgba(209,213,219,0.8)",
  color: "#111827",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

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
