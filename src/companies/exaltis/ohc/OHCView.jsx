// src/companies/exaltis/ohc/OHCView.jsx
import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../../config/api";
import { TYPE, jsonFetch, getCertStatus, STATUS_FILTERS, escapeHTML, downloadCSV, extractReportsList } from "./view/ohcViewModel";
import { ImageModal } from "./view/ImageModal";
import { OhcTableRow } from "./view/OhcTableRow";
import { OhcEditPanel } from "./view/OhcEditPanel";
import { JobSummary } from "./view/JobSummary";
import { BranchSummary } from "./view/BranchSummary";
import { OhcFilters } from "./view/OhcFilters";
import { OhcStatCards } from "./view/OhcStatCards";
import { OhcViewHeader } from "./view/OhcViewHeader";
import { useOhcRecordActions } from "./view/useOhcRecordActions";

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
  const [jobFilter, setJobFilter] = useState("all");
  const [sortBy, setSortBy] = useState("expiry_asc");
  const [groupByBranch, setGroupByBranch] = useState(false);
  const [groupByJob, setGroupByJob] = useState(false);
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

  // قائمة الوظائف مع عدد الموظفين في كل وظيفة
  const jobList = useMemo(() => {
    const m = new Map();
    enriched.forEach((r) => {
      const j = String(r.job || "").trim();
      if (!j) return;
      m.set(j, (m.get(j) || 0) + 1);
    });
    return Array.from(m.entries())
      .map(([job, count]) => ({ job, count }))
      .sort((a, b) => a.job.localeCompare(b.job));
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

  // إحصاءات لكل وظيفة (نتجاهل خارج دبي ومن ترك الشركة)
  const jobStats = useMemo(() => {
    const map = new Map();
    enriched.forEach((r) => {
      if (r.outsideDubai || r.leftCompany) return;
      const j = String(r.job || "").trim() || "—";
      const cur = map.get(j) || {
        job: j,
        total: 0,
        expired: 0,
        expiring_soon: 0,
        expiring: 0,
        valid: 0,
        no_expiry: 0,
      };
      cur.total += 1;
      cur[r.status.key] = (cur[r.status.key] || 0) + 1;
      map.set(j, cur);
    });
    return Array.from(map.values()).sort(
      (a, b) => b.total - a.total || a.job.localeCompare(b.job)
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
    if (jobFilter !== "all") {
      out = out.filter((r) => String(r.job || "").trim() === jobFilter);
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
        case "job_asc":
          return cmpStr(a.job, b.job) || cmpStr(a.name, b.name);
        case "job_desc":
          return cmpStr(b.job, a.job) || cmpStr(a.name, b.name);
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
    jobFilter,
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
    setJobFilter("all");
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
    downloadCSV(`sweets_ohc_certificates_${ts}.csv`, [header, ...body]);
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
  const { toggleOutsideDubai, toggleLeftCompany, handleDelete, startEdit, cancelEdit, setEditField, handleEditImageSelect, saveEdit, openImage, closeModal, handleDeleteImage } = useOhcRecordActions({ filtered, setMsg, load, setEditingIndex, setEdit, setEditImage, editingIndex, edit, editImage, setModalImage, rows });

  const total = rows.length;
  const showing = filtered.length;

  return (
    <div
      className="ohcv"
      style={{
        minHeight: "100vh",
        width: "100%",
        padding: 0,
        background:
          "radial-gradient(1100px 420px at 12% -8%, #fce7f3 0%, transparent 55%), radial-gradient(900px 360px at 92% 4%, #cffafe 0%, transparent 55%), #eef2f7",
        boxSizing: "border-box",
        fontFamily: 'Inter, ui-sans-serif, system-ui, "Segoe UI", Tahoma, sans-serif',
      }}
    >
      {/* خط الصفحة 16px بولد — الكلاس مضاعف لتخطّي !important في globals.css */}
      <style>{`
        #root .ohcv.ohcv,
        #root .ohcv.ohcv *,
        #root .ohcv.ohcv *::before,
        #root .ohcv.ohcv *::after {
          font-size: 16px !important;
          font-weight: 700 !important;
        }
        #root .ohcv.ohcv h2 { font-size: 22px !important; }
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          background: "transparent",
          padding: 0,
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "16px clamp(12px,2.5vw,28px) 22px",
            minHeight: "100vh",
            boxShadow: "0 20px 60px rgba(131,24,67,0.10)",
          }}
        >
          {/* Header */}
          <OhcViewHeader showing={showing} total={total} stats={stats} search={search} setSearch={setSearch} />

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
          <OhcStatCards stats={stats} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />

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
          <OhcFilters branchFilter={branchFilter} setBranchFilter={setBranchFilter} branchList={branchList} resultFilter={resultFilter} setResultFilter={setResultFilter} nationalityFilter={nationalityFilter} setNationalityFilter={setNationalityFilter} nationalityList={nationalityList} jobFilter={jobFilter} setJobFilter={setJobFilter} jobList={jobList} sortBy={sortBy} setSortBy={setSortBy} groupByBranch={groupByBranch} setGroupByBranch={setGroupByBranch} groupByJob={groupByJob} setGroupByJob={setGroupByJob} clearAllFilters={clearAllFilters} exportCSV={exportCSV} printList={printList} load={load} loading={loading} />

          {/* Group by Branch summary (when active) */}
          {groupByBranch && (
            <BranchSummary branchStats={branchStats} setBranchFilter={setBranchFilter} branchFilter={branchFilter} />
          )}

          {/* Group by Occupation summary (when active) */}
          {groupByJob && (
            <JobSummary jobStats={jobStats} setJobFilter={setJobFilter} jobFilter={jobFilter} />
          )}

          {/* Edit Panel */}
          {editingIndex !== null && (
            <OhcEditPanel filtered={filtered} editingIndex={editingIndex} edit={edit} setEditField={setEditField} editImage={editImage} handleEditImageSelect={handleEditImageSelect} setEditImage={setEditImage} saveEdit={saveEdit} cancelEdit={cancelEdit} />
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
                      <OhcTableRow key={i} i={i} rowBg={rowBg} showLeftBar={showLeftBar} leftBarColor={leftBarColor} r={r} st={st} resultBadgeStyle={resultBadgeStyle} openImage={openImage} handleDelete={handleDelete} toggleOutsideDubai={toggleOutsideDubai} toggleLeftCompany={toggleLeftCompany} startEdit={startEdit} />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ===== Image modal ===== */}
          {modalImage && (
            <ImageModal closeModal={closeModal} modalImage={modalImage} handleDeleteImage={handleDeleteImage} />
          )}
        </div>
      </div>
    </div>
  );
}

