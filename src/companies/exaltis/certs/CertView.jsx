// D:\inspection-react-full\src\pages\BFS PIC EFST\TrainingCertificatesView.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import { TYPE, jsonFetch, extractReportsList, getId, getCertStatus, STATUS_FILTERS, escapeHTML, downloadCSV } from "./view/certViewModel";
import { thStyle } from "./view/certViewUi";
import { ImagePreviewOverlay } from "./view/ImagePreviewOverlay";
import { CertTableRow } from "./view/CertTableRow";
import { BranchSummary } from "./view/BranchSummary";
import { CertFilters } from "./view/CertFilters";
import { CertStatCards } from "./view/CertStatCards";
import { CertViewHeader } from "./view/CertViewHeader";
import { useCertEditing } from "./view/useCertEditing";

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
  const { startEdit, cancelEdit, updateEditField, handleEditImageSelect, handleRemoveEditImage, saveEdit, toggleLeftCompany, handleDeleteCert } = useCertEditing({ setEditDraft, setEditingRid, setMsg, editingRid, editDraft, raw, setSavingEdit, reload, setDeletingRid });

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
          <CertViewHeader rows={rows} navigate={navigate} />

          {/* Stat cards */}
          <CertStatCards stats={stats} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />

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
          <CertFilters branchFilter={branchFilter} setBranchFilter={setBranchFilter} branchList={branchList} courseFilter={courseFilter} setCourseFilter={setCourseFilter} courseList={courseList} nationalityFilter={nationalityFilter} setNationalityFilter={setNationalityFilter} nationalityList={nationalityList} sortBy={sortBy} setSortBy={setSortBy} groupByBranch={groupByBranch} setGroupByBranch={setGroupByBranch} clearAllFilters={clearAllFilters} exportCSV={exportCSV} printList={printList} />

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
            <BranchSummary branchStats={branchStats} setBranchFilter={setBranchFilter} branchFilter={branchFilter} />
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
                      <CertTableRow key={r._rid || r.idx} r={r} rowBg={rowBg} showLeftBar={showLeftBar} idx={idx} isEditing={isEditing} editDraft={editDraft} updateEditField={updateEditField} setPreviewImage={setPreviewImage} handleEditImageSelect={handleEditImageSelect} handleRemoveEditImage={handleRemoveEditImage} saveEdit={saveEdit} savingEdit={savingEdit} cancelEdit={cancelEdit} startEdit={startEdit} toggleLeftCompany={toggleLeftCompany} handleDeleteCert={handleDeleteCert} deletingRid={deletingRid} />
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
        <ImagePreviewOverlay setPreviewImage={setPreviewImage} previewImage={previewImage} />
      )}
    </div>
  );
}

