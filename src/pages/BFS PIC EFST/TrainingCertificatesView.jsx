// D:\inspection-react-full\src\pages\BFS PIC EFST\TrainingCertificatesView.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import { uploadImage } from "../../utils/imageUpload";

/* ========= API ========= */


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

/* الصور تُرفع على Cloudinary (نفس مسار صفحة الإدخال) — الضغط 1280px/جودة 80
   يتم على السيرفر، والسجل يحفظ الرابط فقط في imageUrl. */

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
// نفس مدد صفحة الإدخال (TrainingCertificatesUpload)
const COURSE_DURATION_YEARS = { BFS: 2, PIC: 5, EFST: 5 };

// الحقول التي تتابعها نافذة التعديل لمعرفة ما تغيّر
const EDIT_TRACKED_KEYS = [
  "employeeNo",
  "name",
  "nationality",
  "branch",
  "job",
  "courseType",
  "issueDate",
  "expiryDate",
  "imageData",
  "instituteImage",
];

const COURSE_OPTIONS = [
  { value: "", label: "-- Select Course Type --" },
  { value: "BFS", label: "Basic Food Safety (BFS)" },
  { value: "PIC", label: "Person In Charge (PIC)" },
  { value: "EFST", label: "EFST" },
  { value: "HACCP", label: "HACCP" },
  { value: "HALAL", label: "شهادة الحلال" },
  { value: "FIRST_AID", label: "الإسعافات الأولية" },
  { value: "EMERGENCY", label: "الطوارئ" },
  { value: "ISO22000_AUDIT", label: "التدقيق الداخلي ايزو 22000" },
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
  const [editUploading, setEditUploading] = useState(""); // slot قيد الرفع
  const [editOriginal, setEditOriginal] = useState(null); // نسخة قبل التعديل
  const [dragSlot, setDragSlot] = useState(""); // بطاقة الصورة تحت السحب
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
      const imageData = p.imageUrl || p.imageData || "";
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
        // EFST: imageUrl القديم = شهادة البلدية، والثانية = شهادة المعهد
        instituteImage: p.instituteImageUrl || "",
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
    const origPayload = row._record?.payload || row._record || {};

    const draft = {
      employeeNo: row.employeeNo || "",
      name: row.name || "",
      nationality: row.nationality || "",
      branch: row.branch || "",
      job: row.job || "",
      courseType: row.courseType || "",
      issueDate: row.issueDate || "",
      expiryDate: row.expiryDate || "",
      imageData: origPayload.imageUrl || origPayload.imageData || row.imageData || "",
      imageName: origPayload.imageName || "",
      imageType: origPayload.imageType || "",
      instituteImage: origPayload.instituteImageUrl || "",
      instituteImageName: origPayload.instituteImageName || "",
    };
    setEditDraft(draft);
    setEditOriginal(draft);
    setEditingRid(row._rid);
    setMsg("");
  }

  function cancelEdit() {
    setEditingRid(null);
    setEditDraft(null);
    setEditOriginal(null);
    setDragSlot("");
  }

  // الحقول التي تغيّرت عن القيم الأصلية (لإبرازها + عدّاد التغييرات)
  const editChanged = useMemo(() => {
    if (!editDraft || !editOriginal) return new Set();
    return new Set(
      EDIT_TRACKED_KEYS.filter(
        (k) => String(editDraft[k] || "") !== String(editOriginal[k] || "")
      )
    );
  }, [editDraft, editOriginal]);

  const editDateError =
    editDraft?.issueDate &&
    editDraft?.expiryDate &&
    editDraft.expiryDate < editDraft.issueDate
      ? "Expiry date is before the issue date."
      : "";

  // إغلاق النافذة — يسأل فقط لو في تغييرات غير محفوظة
  function requestCloseEdit() {
    if (savingEdit) return;
    if (
      editChanged.size &&
      !window.confirm("Discard unsaved changes?\nتجاهل التعديلات غير المحفوظة؟")
    )
      return;
    cancelEdit();
  }

  function resetEdit() {
    if (editOriginal) setEditDraft(editOriginal);
  }

  // Esc = إغلاق، Ctrl/Cmd + S = حفظ
  useEffect(() => {
    if (!editingRid) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !previewImage) {
        e.preventDefault();
        requestCloseEdit();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (editChanged.size && !editDateError && !editUploading && !savingEdit) saveEdit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function updateEditField(key, value) {
    setEditDraft((prev) => {
      const next = { ...(prev || {}), [key]: value };
      // BFS / PIC / EFST: الانتهاء يُحسب تلقائياً مثل صفحة الإدخال
      if (key === "courseType" || key === "issueDate") {
        const years = COURSE_DURATION_YEARS[next.courseType];
        if (years && /^\d{4}-\d{2}-\d{2}$/.test(next.issueDate || "")) {
          const [y, m, d] = next.issueDate.split("-").map(Number);
          next.expiryDate = new Date(Date.UTC(y + years, m - 1, d))
            .toISOString()
            .slice(0, 10);
        }
      }
      return next;
    });
  }

  // اختيار صورة جديدة أثناء التعديل (slot "institute" = صورة المعهد لـ EFST)
  function handleEditImageSelect(e, slot = "main") {
    const file = e.target.files?.[0];
    e.target.value = "";
    handleEditImageFile(file, slot);
  }

  // مشترك بين اختيار الملف والسحب والإفلات
  async function handleEditImageFile(file, slot) {
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      alert("Please select an image file.");
      return;
    }

    setEditUploading(slot);
    try {
      const compressed = await uploadImage(file, TYPE);
      setEditDraft((prev) => ({
        ...(prev || {}),
        ...(slot === "institute"
          ? { instituteImage: compressed, instituteImageName: file.name }
          : { imageData: compressed, imageName: file.name, imageType: "image/jpeg" }),
      }));
    } catch (err) {
      console.error("edit image compress error:", err);
      alert("Image processing failed. Try another image.");
    } finally {
      setEditUploading("");
    }
  }

  // حذف الصورة في وضع التعديل
  // بدون تأكيد: Reset يرجّع الصورة، ولا شيء يُحفظ قبل Save
  function handleRemoveEditImage(slot = "main") {
    setEditDraft((prev) => ({
      ...(prev || {}),
      ...(slot === "institute"
        ? { instituteImage: "", instituteImageName: "" }
        : { imageData: "", imageName: "", imageType: "" }),
    }));
  }

  const isEfst = (t) => String(t || "").trim().toUpperCase() === "EFST";

  const thumbCaptionStyle = {
    fontSize: 10,
    fontWeight: 700,
    color: "#475569",
    lineHeight: 1.1,
  };

  // صورة مصغّرة في الجدول؛ مع caption (EFST) تظهر خانة فارغة منقّطة إذا الصورة ناقصة
  function renderViewThumb(src, caption) {
    if (!src && !caption) {
      return <span style={{ fontSize: 11, color: "#9ca3af" }}>No image</span>;
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
        }}
      >
        {src ? (
          <button
            type="button"
            title={caption || "Certificate"}
            onClick={() => setPreviewImage(src)}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <img
              src={src}
              alt={caption || "Certificate"}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                objectFit: "cover",
                border: "1px solid #d1d5db",
                boxShadow: "0 2px 6px rgba(15,23,42,0.25)",
              }}
            />
          </button>
        ) : (
          <span
            title={`${caption} certificate missing`}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px dashed #f59e0b",
              background: "#fffbeb",
              color: "#b45309",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            !
          </span>
        )}
        {caption && <span style={thumbCaptionStyle}>{caption}</span>}
      </div>
    );
  }

  // بطاقة صورة داخل نافذة التعديل — رفع / استبدال / حذف + سحب وإفلات
  function renderEditImageSlot(slot, caption, required) {
    const srcKey = slot === "institute" ? "instituteImage" : "imageData";
    const nameKey = slot === "institute" ? "instituteImageName" : "imageName";
    const src = editDraft?.[srcKey] || "";
    const fileName = editDraft?.[nameKey] || "";
    const uploading = editUploading === slot;
    const missing = required && !src;
    const changed = editChanged.has(srcKey);
    const dragging = dragSlot === slot;

    const onDrop = (e) => {
      e.preventDefault();
      setDragSlot("");
      handleEditImageFile(e.dataTransfer.files?.[0], slot);
    };

    return (
      <div
        key={slot}
        onDragOver={(e) => {
          e.preventDefault();
          if (dragSlot !== slot) setDragSlot(slot);
        }}
        onDragLeave={() => setDragSlot("")}
        onDrop={onDrop}
        style={{
          flex: "1 1 220px",
          minWidth: 0,
          border: `${dragging ? 2 : 1}px ${dragging ? "dashed" : "solid"} ${
            dragging ? "#0284c7" : missing ? "#fcd34d" : changed ? "#fbbf24" : "#e2e8f0"
          }`,
          borderRadius: 14,
          background: dragging ? "#e0f2fe" : missing ? "#fffbeb" : "#f8fafc",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          transition: "background .15s, border-color .15s",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
            {caption}
            {changed && <span style={changedDotStyle} title="Changed" />}
          </span>
          {required && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: 999,
                color: src ? "#166534" : "#b45309",
                background: src ? "#dcfce7" : "#fef3c7",
              }}
            >
              {src ? "Attached" : "Required"}
            </span>
          )}
        </div>

        <div
          style={{
            position: "relative",
            height: 150,
            borderRadius: 10,
            border: src ? "1px solid #e2e8f0" : "1px dashed #cbd5e1",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {uploading ? (
            <div style={{ textAlign: "center", color: "#0369a1" }}>
              <div style={spinnerStyle} />
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>
                Uploading…
              </div>
            </div>
          ) : src ? (
            <button
              type="button"
              title="Open full size"
              onClick={() => setPreviewImage(src)}
              style={{
                border: "none",
                padding: 0,
                background: "transparent",
                cursor: "zoom-in",
                width: "100%",
                height: "100%",
              }}
            >
              <img
                src={src}
                alt={caption}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </button>
          ) : (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 8 }}>
              <div style={{ fontSize: 22 }}>⬆</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>
                {dragging ? "Drop the image here" : "Drag an image here"}
              </div>
              <div style={{ fontSize: 11 }}>or use Upload below</div>
            </div>
          )}
        </div>

        {fileName && src && (
          <div
            title={fileName}
            style={{
              fontSize: 11,
              color: "#64748b",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            📎 {fileName}
          </div>
        )}

        <div style={{ display: "flex", gap: 6 }}>
          <label
            style={{
              ...editBtnStyle,
              flex: 1,
              justifyContent: "center",
              border: "1px solid #7dd3fc",
              background: "#f0f9ff",
              color: "#0369a1",
              opacity: uploading ? 0.6 : 1,
              pointerEvents: uploading ? "none" : "auto",
            }}
          >
            {src ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleEditImageSelect(e, slot)}
              style={{ display: "none" }}
            />
          </label>
          {src && !uploading && (
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in a new tab"
              style={{
                ...editBtnStyle,
                textDecoration: "none",
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#334155",
              }}
            >
              ↗
            </a>
          )}
          {src && !uploading && (
            <button
              type="button"
              onClick={() => handleRemoveEditImage(slot)}
              style={{
                ...editBtnStyle,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  // حفظ التعديل (PUT مع fallback POST + حذف القديم عند POST)
  async function saveEdit() {
    if (!editingRid || !editDraft) return;

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
      // editDraft.imageData now carries a Cloudinary URL, so it is written to
      // imageUrl; imageData is blanked so no record keeps an embedded file.
      imageUrl: editDraft.imageData || undefined,
      imageData: "",
      imageName: editDraft.imageData
        ? editDraft.imageName || origPayload.imageName || "certificate.jpg"
        : undefined,
      imageType: editDraft.imageData
        ? editDraft.imageType || "image/jpeg"
        : undefined,
      instituteImageUrl:
        editDraft.courseType === "EFST"
          ? editDraft.instituteImage || undefined
          : undefined,
      instituteImageName:
        editDraft.courseType === "EFST" && editDraft.instituteImage
          ? editDraft.instituteImageName || "institute.jpg"
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
      cancelEdit();
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
                          {r.employeeNo}
                        </td>

                        {/* Name */}
                        <td style={tdStyle}>
                          {r.name}
                        </td>

                        {/* Nationality */}
                        <td style={tdStyle}>
                          {r.nationality}
                        </td>

                        {/* Branch */}
                        <td style={tdStyle}>
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
                        </td>

                        {/* Job */}
                        <td style={tdStyle}>
                          {r.job}
                        </td>

                        {/* Course Type */}
                        <td style={tdStyle}>
                          {r.courseType}
                        </td>

                        {/* Issue Date */}
                        <td style={tdStyle}>
                          {r.issueDate}
                        </td>

                        {/* Expiry Date */}
                        <td style={tdStyle}>
                          {r.expiryDate || "—"}
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
                          {isEfst(r.courseType) ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              {renderViewThumb(r.instituteImage, "Institute")}
                              {renderViewThumb(r.imageData, "Municipality")}
                            </div>
                          ) : (
                            renderViewThumb(r.imageData, "")
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
                                title="Edit certificate"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "4px 11px",
                                  borderRadius: 999,
                                  border: "1px solid #7dd3fc",
                                  background: "#f0f9ff",
                                  color: "#0369a1",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
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
                               data-delete-action="true">
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

      {/* Edit Certificate Dialog */}
      {editingRid && editDraft && (() => {
        const st = getCertStatus(editDraft.expiryDate);
        const years = COURSE_DURATION_YEARS[String(editDraft.courseType || "").toUpperCase()];
        const initials =
          String(editDraft.name || "?")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase() || "?";
        // نسبة المدة المنقضية من الإصدار حتى الانتهاء (للشريط الزمني)
        const issueD = parseDateOnly(editDraft.issueDate);
        const expD = parseDateOnly(editDraft.expiryDate);
        let elapsedPct = null;
        if (issueD && expD && expD > issueD) {
          elapsedPct = Math.min(
            100,
            Math.max(0, ((Date.now() - issueD) / (expD - issueD)) * 100)
          );
        }
        const otherCerts = allRows.filter(
          (x) =>
            x._rid !== editingRid &&
            String(x.employeeNo || "").trim() &&
            String(x.employeeNo).trim() === String(editOriginal?.employeeNo || "").trim()
        );
        const canSave =
          editChanged.size > 0 && !editDateError && !editUploading && !savingEdit;
        const saveError = msg && !String(msg).startsWith("✅") ? msg : "";

        const field = (k, label, input) => (
          <label key={k} style={editLabelStyle}>
            <span>
              {label}
              {editChanged.has(k) && <span style={changedDotStyle} title="Changed" />}
            </span>
            {input}
          </label>
        );
        const inputStyleFor = (k, extra) => ({
          ...editInputStyle,
          ...(editChanged.has(k)
            ? { borderColor: "#fbbf24", background: "#fffbeb" }
            : null),
          ...extra,
        });

        return (
          <div
            onClick={requestCloseEdit}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.55)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 9000,
            }}
          >
            <style>{"@keyframes tcSpin{to{transform:rotate(360deg)}}"}</style>
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Edit certificate"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(980px, 100%)",
                maxHeight: "94vh",
                display: "flex",
                flexDirection: "column",
                background: "#fff",
                borderRadius: 20,
                boxShadow: "0 30px 80px rgba(15,23,42,0.45)",
                overflow: "hidden",
                direction: "ltr",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #e2e8f0",
                  background: "linear-gradient(135deg,#e0f2fe,#f8fafc 60%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    flex: "0 0 46px",
                    borderRadius: 14,
                    background: "linear-gradient(135deg,#0ea5e9,#0369a1)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 16,
                    boxShadow: "0 6px 16px rgba(3,105,161,0.35)",
                  }}
                >
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#0f172a",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {editDraft.name || "Unnamed employee"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 5,
                      alignItems: "center",
                    }}
                  >
                    <span style={headerChipStyle}>#{editDraft.employeeNo || "—"}</span>
                    {editDraft.branch && (
                      <span style={headerChipStyle}>{editDraft.branch}</span>
                    )}
                    {editDraft.courseType && (
                      <span
                        style={{
                          ...headerChipStyle,
                          background: "#0369a1",
                          color: "#fff",
                          borderColor: "#0369a1",
                        }}
                      >
                        {editDraft.courseType}
                      </span>
                    )}
                    <span
                      style={{
                        ...headerChipStyle,
                        background: st.bg,
                        color: "#fff",
                        border: "none",
                      }}
                    >
                      {st.label}
                      {st.days !== null &&
                        (st.days < 0
                          ? ` · ${Math.abs(st.days)}d ago`
                          : ` · ${st.days}d left`)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={requestCloseEdit}
                  disabled={savingEdit}
                  aria-label="Close"
                  title="Close (Esc)"
                  style={{
                    width: 34,
                    height: 34,
                    flex: "0 0 34px",
                    borderRadius: 999,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    color: "#475569",
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {/* Main column */}
                <div style={{ flex: "999 1 520px", minWidth: 0, padding: 20 }}>
                  <div style={editCardStyle}>
                    <div style={editSectionTitle}>👤 Employee</div>
                    <div style={editGrid}>
                      {[
                        ["employeeNo", "Employee No"],
                        ["name", "Name"],
                        ["nationality", "Nationality"],
                        ["branch", "Branch"],
                        ["job", "Job"],
                      ].map(([k, label]) =>
                        field(
                          k,
                          label,
                          <input
                            type="text"
                            value={editDraft[k] || ""}
                            onChange={(e) => updateEditField(k, e.target.value)}
                            style={inputStyleFor(k)}
                          />
                        )
                      )}
                    </div>
                  </div>

                  <div style={editCardStyle}>
                    <div style={editSectionTitle}>🎓 Certificate</div>
                    <div style={editGrid}>
                      {field(
                        "courseType",
                        "Course Type",
                        <select
                          value={editDraft.courseType || ""}
                          onChange={(e) => updateEditField("courseType", e.target.value)}
                          style={inputStyleFor("courseType")}
                        >
                          {!COURSE_OPTIONS.some((o) => o.value === editDraft.courseType) &&
                            editDraft.courseType && (
                              <option value={editDraft.courseType}>
                                {editDraft.courseType}
                              </option>
                            )}
                          {COURSE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {field(
                        "issueDate",
                        "Issue Date",
                        <input
                          type="date"
                          value={editDraft.issueDate || ""}
                          onChange={(e) => updateEditField("issueDate", e.target.value)}
                          style={inputStyleFor("issueDate")}
                        />
                      )}
                      {field(
                        "expiryDate",
                        "Expiry Date",
                        <input
                          type="date"
                          value={editDraft.expiryDate || ""}
                          onChange={(e) => updateEditField("expiryDate", e.target.value)}
                          style={inputStyleFor(
                            "expiryDate",
                            editDateError ? { borderColor: "#ef4444", background: "#fef2f2" } : null
                          )}
                        />
                      )}
                    </div>

                    {/* Validity timeline */}
                    <div style={{ marginTop: 14 }}>
                      {editDateError ? (
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>
                          ⚠ {editDateError}
                        </div>
                      ) : elapsedPct !== null ? (
                        <>
                          <div
                            style={{
                              position: "relative",
                              height: 8,
                              borderRadius: 999,
                              background: "#e2e8f0",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${elapsedPct}%`,
                                height: "100%",
                                borderRadius: 999,
                                background: st.bg,
                                transition: "width .3s",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 11,
                              color: "#64748b",
                              marginTop: 6,
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span>Issued {editDraft.issueDate}</span>
                            <span style={{ fontWeight: 700, color: "#334155" }}>
                              {Math.round(elapsedPct)}% of validity used
                            </span>
                            <span>Expires {editDraft.expiryDate}</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {editDraft.expiryDate
                            ? "Set an issue date to see the validity timeline."
                            : "No expiry date — this certificate does not expire."}
                        </div>
                      )}
                      {years && (
                        <div style={{ fontSize: 11, color: "#0369a1", marginTop: 6 }}>
                          ⓘ {String(editDraft.courseType).toUpperCase()} is valid for {years} years
                          — the expiry date is calculated from the issue date.
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ ...editCardStyle, marginBottom: 0 }}>
                    <div style={editSectionTitle}>
                      🖼 {isEfst(editDraft.courseType) ? "Certificate Images" : "Certificate Image"}
                    </div>
                    {isEfst(editDraft.courseType) && (
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: -4, marginBottom: 10 }}>
                        EFST needs both: the Institute certificate and the Municipality certificate.
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {isEfst(editDraft.courseType) ? (
                        <>
                          {renderEditImageSlot("institute", "Institute Certificate", true)}
                          {renderEditImageSlot("main", "Municipality Certificate", true)}
                        </>
                      ) : (
                        renderEditImageSlot("main", "Certificate", false)
                      )}
                    </div>
                  </div>
                </div>

                {/* Side column: the employee's other certificates */}
                <div
                  style={{
                    flex: "1 1 250px",
                    minWidth: 0,
                    padding: 20,
                    background: "#f8fafc",
                    borderLeft: "1px solid #e2e8f0",
                  }}
                >
                  <div style={editSectionTitle}>
                    📋 Other certificates ({otherCerts.length})
                  </div>
                  {otherCerts.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      No other certificates for this employee.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {otherCerts.map((x) => (
                        <div
                          key={x._rid || x.idx}
                          style={{
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderLeft: `4px solid ${
                              x.status.key === "expired"
                                ? "#b91c1c"
                                : x.status.key === "valid"
                                ? "#15803d"
                                : x.status.key === "no_expiry"
                                ? "#9ca3af"
                                : "#c2410c"
                            }`,
                            borderRadius: 10,
                            padding: "8px 10px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 6,
                              alignItems: "center",
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
                              {x.courseType || "—"}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: "#fff",
                                background: x.status.bg,
                                padding: "1px 7px",
                                borderRadius: 999,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {x.status.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                            {x.issueDate || "—"} → {x.expiryDate || "no expiry"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 18,
                      fontSize: 11,
                      color: "#94a3b8",
                      lineHeight: 1.7,
                    }}
                  >
                    <div>
                      <kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>S</kbd> save
                    </div>
                    <div>
                      <kbd style={kbdStyle}>Esc</kbd> close
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "12px 20px",
                  borderTop: "1px solid #e2e8f0",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 160, fontSize: 12 }}>
                  {saveError ? (
                    <span style={{ color: "#b91c1c", fontWeight: 700 }}>⚠ {saveError}</span>
                  ) : editChanged.size ? (
                    <span style={{ color: "#b45309", fontWeight: 700 }}>
                      <span style={{ ...changedDotStyle, marginLeft: 0, marginRight: 6 }} />
                      {editChanged.size} unsaved change{editChanged.size > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>No changes yet</span>
                  )}
                </div>
                {editChanged.size > 0 && (
                  <button
                    type="button"
                    onClick={resetEdit}
                    disabled={savingEdit}
                    title="Undo all changes"
                    style={{
                      ...editBtnStyle,
                      border: "1px solid transparent",
                      background: "transparent",
                      color: "#475569",
                    }}
                  >
                    ↺ Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={requestCloseEdit}
                  disabled={savingEdit}
                  style={{
                    ...editBtnStyle,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#334155",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={!canSave}
                  title="Save (Ctrl + S)"
                  style={{
                    ...editBtnStyle,
                    border: `1px solid ${canSave ? "#0369a1" : "#94a3b8"}`,
                    background: canSave
                      ? "linear-gradient(135deg,#0ea5e9,#0369a1)"
                      : "#94a3b8",
                    color: "#fff",
                    cursor: canSave ? "pointer" : "default",
                    boxShadow: canSave ? "0 6px 16px rgba(3,105,161,0.3)" : "none",
                  }}
                >
                  {savingEdit ? (
                    <>
                      <span
                        style={{
                          ...spinnerStyle,
                          width: 12,
                          height: 12,
                          borderWidth: 2,
                          borderColor: "rgba(255,255,255,.4)",
                          borderTopColor: "#fff",
                          margin: 0,
                        }}
                      />
                      Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

const editBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 14px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const editInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 13,
  color: "#0f172a",
};

const editCardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 16,
  marginBottom: 14,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
};

const headerChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 9px",
  borderRadius: 999,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

// نقطة "تم التعديل" بجانب الحقل
const changedDotStyle = {
  display: "inline-block",
  width: 7,
  height: 7,
  borderRadius: 999,
  background: "#f59e0b",
  marginLeft: 6,
  verticalAlign: "middle",
};

// الحركة معرّفة في <style> داخل نافذة التعديل (tcSpin)
const spinnerStyle = {
  display: "inline-block",
  width: 22,
  height: 22,
  margin: "0 auto",
  borderRadius: 999,
  border: "3px solid #bae6fd",
  borderTopColor: "#0369a1",
  animation: "tcSpin .8s linear infinite",
};

const kbdStyle = {
  display: "inline-block",
  padding: "0 5px",
  borderRadius: 5,
  border: "1px solid #cbd5e1",
  borderBottomWidth: 2,
  background: "#fff",
  color: "#475569",
  fontFamily: "inherit",
  fontSize: 10,
  fontWeight: 700,
};

const editSectionTitle = {
  fontSize: 12,
  fontWeight: 800,
  color: "#0369a1",
  marginBottom: 10,
};

const editGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
};

const editLabelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontSize: 11,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: 0.3,
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
