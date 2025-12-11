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

export default function TrainingCertificatesView() {
  const navigate = useNavigate();

  const [raw, setRaw] = useState([]); // سجلات السيرفر
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

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

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base = raw.map((rec, idx) => {
      const p = rec?.payload || rec || {};
      const savedAt =
        p.savedAt || rec?.createdAt || rec?.created_at || "";

      const imageData = p.imageData || "";

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
        _record: rec,
      };
    });

    if (!q) return base;

    return base.filter((r) => {
      return (
        String(r.employeeNo).toLowerCase().includes(q) ||
        String(r.name).toLowerCase().includes(q) ||
        String(r.branch).toLowerCase().includes(q) ||
        String(r.job).toLowerCase().includes(q) ||
        String(r.courseType).toLowerCase().includes(q)
      );
    });
  }, [raw, search]);

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
              placeholder="Search by employee, branch, job, or course type..."
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
                    <th style={thStyle}>Saved At</th>
                    <th style={thStyle}>Image</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && !loading && (
                    <tr>
                      <td
                        colSpan={12}
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

                    return (
                      <tr
                        key={r._rid || r.idx}
                        style={{
                          backgroundColor:
                            idx % 2 === 0 ? "#f9fafb" : "#f3f4f6",
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
                            r.branch
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
