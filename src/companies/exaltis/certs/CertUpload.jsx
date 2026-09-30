// D:\inspection-react-full\src\pages\BFS PIC EFST\TrainingCertificatesBFS.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import { uploadImage as uploadImageToServer } from "../../../utils/imageUpload";
import { Bi, bi } from "../reports/bilingual";
import { TYPE, jsonFetch, compressToFile, NATIONALITIES, EMPLOYEES, COURSE_TYPES, COURSE_DURATION_YEARS, computeExpiry, makeEmptyCert } from "./upload/certUploadModel";
import { Field, ReadOnlyField, DateField, Select } from "./upload/fields";

/* ========= Component ========= */
export default function TrainingCertificatesBFS() {
  const navigate = useNavigate();

  // بيانات الموظف (مشتركة لكل الشهادات في الصفحة)
  const [employee, setEmployee] = useState({
    employeeNo: "",
    name: "",
    nationality: "",
    job: "",
    branch: "",
  });

  // لستة الشهادات لهذا الموظف (أكثر من شهادة في نفس الشاشة)
  const [certs, setCerts] = useState([makeEmptyCert()]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const setEmpField = (k, v) => {
    setEmployee((p) => ({ ...p, [k]: v }));
    setMsg({ type: "", text: "" });
  };

  // تعبئة بيانات الموظف من جدول EMPLOYEES
  const handleEmployeeNumberChange = (v) => {
    setMsg({ type: "", text: "" });
    const id = String(v || "").trim();
    const emp = EMPLOYEES[id];
    setEmployee((prev) => ({
      ...prev,
      employeeNo: v,
      name: emp ? emp.name : "",
      branch: emp ? emp.branch : "",
      job: emp ? emp.job : "",
    }));
  };

  // تحديث حقل في شهادة معيّنة
  const updateCertField = (index, key, value) => {
    setCerts((prev) => {
      const next = [...prev];
      const current = { ...next[index] };

      if (key === "courseType") {
        current.courseType = value;
        if (COURSE_DURATION_YEARS[value] && current.issueDate) {
          current.expiryDate = computeExpiry(value, current.issueDate);
        } else if (value === "HACCP" || value === "OTHER" || value === "") {
          // HACCP / OTHER: لا حساب تلقائي (يدوي)
        }
      } else if (key === "issueDate") {
        current.issueDate = value;
        if (COURSE_DURATION_YEARS[current.courseType]) {
          current.expiryDate = computeExpiry(current.courseType, value);
        }
      } else {
        current[key] = value;
      }

      next[index] = current;
      return next;
    });
    setMsg({ type: "", text: "" });
  };

  // إضافة شهادة جديدة
  const addCertificateRow = () => {
    setCerts((prev) => [...prev, makeEmptyCert()]);
  };

  // حذف شهادة
  const removeCertificateRow = (index) => {
    setCerts((prev) => {
      if (prev.length === 1) {
        return [makeEmptyCert()];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const requiredEmpKeys = ["employeeNo", "name", "branch"];

  async function handleSave() {
    for (const k of requiredEmpKeys) {
      if (!String(employee[k] || "").trim()) {
        setMsg({
          type: "error",
          text: "Please complete employee details before saving. · أكمل بيانات الموظف قبل الحفظ.",
        });
        return;
      }
    }

    // منع الحفظ إذا صورة لسه بتُرفع
    if (certs.some((c) => c.imageUrl === "__uploading__")) {
      setMsg({ type: "error", text: "Please wait — image upload still in progress. · انتظر — رفع الصورة جارٍ." });
      return;
    }

    const activeCerts = certs.filter(
      (c) =>
        String(c.courseType || "").trim() &&
        String(c.issueDate || "").trim()
    );

    if (activeCerts.length === 0) {
      setMsg({
        type: "error",
        text:
          "Please add at least one certificate with course type and issue date. · أضف شهادة واحدة على الأقل بنوع الدورة وتاريخ الإصدار.",
      });
      return;
    }

    setBusy(true);
    setMsg({ type: "", text: "" });

    try {
      const results = [];

      for (const cert of activeCerts) {
        const courseTypeToSave =
          cert.courseType === "OTHER"
            ? cert.customCourseName || "OTHER"
            : cert.courseType;

        const payload = {
          ...employee,
          courseType: courseTypeToSave,
          issueDate: cert.issueDate,
          expiryDate: cert.expiryDate || undefined,
          imageUrl: cert.imageUrl || undefined,          // Cloudinary URL فقط
          imageName: cert.imageName || undefined,
          savedAt: new Date().toISOString(),
        };

        const body = JSON.stringify({
          reporter: "sweets",
          type: TYPE,
          payload,
        });

        const { ok, status, data } = await jsonFetch(
          `${API_BASE}/api/reports`,
          {
            method: "POST",
            body,
          }
        );

        results.push({ ok, status, data });
      }

      setBusy(false);

      const failed = results.find((r) => !r.ok);
      if (failed) {
        const serverMsg =
          failed.data?.message ||
          (failed.status >= 500
            ? "Server error. Please try again later."
            : "Failed to save some certificates. Please check and try again.");

        setMsg({
          type: "error",
          text: `Some certificates failed to save (HTTP ${failed.status}). ${serverMsg} · تعذّر حفظ بعض الشهادات.`,
        });
        return;
      }

      setMsg({
        type: "ok",
        text: `✅ Saved ${results.length} certificate(s) successfully. · تم حفظ ${results.length} شهادة.`,
      });

      setEmployee({
        employeeNo: "",
        name: "",
        nationality: "",
        job: "",
        branch: "",
      });
      setCerts([makeEmptyCert()]);
    } catch (err) {
      console.error("Training save error:", err);
      setBusy(false);
      setMsg({
        type: "error",
        text:
          "Network error while contacting the server. Please check your connection and try again. · خطأ في الاتصال بالخادم، تحقق من الاتصال وحاول مجدداً.",
      });
    }
  }

  async function handleCertImageSelect(index, e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      setMsg({ type: "error", text: "Please select an image file. · اختر ملف صورة." });
      e.target.value = "";
      return;
    }

    // أظهر حالة "جاري الرفع"
    setCerts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], imageUrl: "__uploading__", imageName: file.name };
      return next;
    });
    setMsg({ type: "", text: "" });

    try {
      const compressed = await compressToFile(file);
      const url = await uploadImageToServer(compressed, "sweets_training_certificate");
      setCerts((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], imageUrl: url, imageName: file.name };
        return next;
      });
    } catch {
      setCerts((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], imageUrl: "", imageName: "" };
        return next;
      });
      setMsg({ type: "error", text: "Image upload to Cloudinary failed. Try again. · فشل رفع الصورة، حاول مجدداً." });
    } finally {
      e.target.value = "";
    }
  }

  function removeCertImage(index) {
    setCerts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], imageUrl: "", imageName: "" };
      return next;
    });
  }

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
        direction: "ltr",
        boxSizing: "border-box",
        fontFamily: "Inter, Tahoma, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 980,
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
              "radial-gradient(circle at top right, #ecfeff 0%, #f9fafb 40%, #e5e7eb 100%)",
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
                    "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(8,47,73,0.08))",
                  color: "#15803d",
                  border: "1px solid rgba(74,222,128,0.6)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "999px",
                    background:
                      "radial-gradient(circle, #22c55e 0%, #166534 60%, #052e16 100%)",
                  }}
                />
                <Bi en="Training Certificates" />
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
                🎓 <Bi en="BFS / PIC / EFST / HACCP Certificates" ar="شهادات BFS / PIC / EFST / HACCP" />
              </h2>
              <div style={{ fontSize: 13, color: "#4b5563" }}>
                <Bi en="Multiple training certificates per employee, with auto expiry calculation for BFS / PIC / EFST, and manual options for HACCP / custom." ar="عدة شهادات لكل موظف، مع حساب تلقائي للانتهاء لـ BFS / PIC / EFST، وإدخال يدوي للهاسب / المخصص." />
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
                Mode:{" "}
                <span style={{ color: "#15803d" }}>
                  <Bi en="Server Save Only (Multi-certificate per employee)" ar="حفظ على الخادم فقط (عدة شهادات لكل موظف)" />
                </span>
              </div>
            </div>
          </div>

          {msg.text && (
            <div
              style={{
                margin: "10px 0 14px",
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
                    msg.type === "ok"
                      ? "#16a34a"
                      : "rgba(220,38,38,0.9)",
                  boxShadow:
                    msg.type === "ok"
                      ? "0 0 0 4px rgba(34,197,94,0.18)"
                      : "0 0 0 4px rgba(248,113,113,0.2)",
                }}
              />
              <span>{msg.text}</span>
            </div>
          )}

          {/* Employee Section label */}
          <div
            style={{
              marginBottom: 10,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.04)",
                color: "#0f172a",
                fontWeight: 600,
              }}
            >
              <Bi en="Employee Details" ar="بيانات الموظف" />
            </span>
          </div>

          {/* Employee Form */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <Field
              label="Employee Number"
              value={employee.employeeNo}
              onChange={handleEmployeeNumberChange}
            />
            <Field
              label="Name"
              value={employee.name}
              onChange={(v) => setEmpField("name", v)}
            />
            <Field
              label="Branch"
              value={employee.branch}
              onChange={(v) => setEmpField("branch", v)}
            />
            <Field
              label="Job Title"
              value={employee.job}
              onChange={(v) => setEmpField("job", v)}
            />
            <Select
              label="Nationality"
              value={employee.nationality}
              onChange={(v) => setEmpField("nationality", v)}
              options={[
                { value: "", label: "-- Select Nationality -- · -- اختر الجنسية --" },
                ...NATIONALITIES.map((n) => ({ value: n, label: n })),
              ]}
            />
          </div>

          {/* Certificates Section */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 999,
                background: "rgba(8,47,73,0.04)",
                color: "#0f172a",
                fontWeight: 600,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              <Bi en="Training Certificates (BFS / PIC / EFST / HACCP / Custom)" ar="شهادات التدريب" />
            </span>
            <button
              type="button"
              onClick={addCertificateRow}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg,#22c55e,#16a34a,#15803d)",
                color: "#f9fafb",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 8px 18px rgba(22,163,74,0.4)",
              }}
            >
              ➕ <Bi en="Add Certificate" />
            </button>
          </div>

          {/* Certificates List */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {certs.map((cert, index) => (
              <div
                key={index}
                style={{
                  padding: "12px 12px 14px",
                  borderRadius: 16,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background:
                    "linear-gradient(135deg,rgba(249,250,251,0.96),rgba(241,245,249,0.95))",
                  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    <Bi en={`Certificate #${index + 1}`} ar={`شهادة #${index + 1}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCertificateRow(index)}
                    style={{
                      border: "none",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      background:
                        certs.length === 1
                          ? "linear-gradient(135deg,#e5e7eb,#e5e7eb)"
                          : "linear-gradient(135deg,#f97373,#ef4444)",
                      color:
                        certs.length === 1 ? "#4b5563" : "#f9fafb",
                      cursor: certs.length === 1 ? "default" : "pointer",
                    }}
                    disabled={certs.length === 1}
                  >
                    {certs.length === 1
                      ? bi("Cannot remove last", "لا يمكن حذف الأخيرة")
                      : bi("Remove")}
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2,minmax(0,1fr))",
                    gap: 12,
                  }}
                >
                  <Select
                    label="Course Type"
                    value={cert.courseType}
                    onChange={(v) =>
                      updateCertField(index, "courseType", v)
                    }
                    options={COURSE_TYPES}
                  />

                  {cert.courseType === "OTHER" ? (
                    <Field
                      label="Custom Course Name"
                      value={cert.customCourseName}
                      onChange={(v) =>
                        updateCertField(index, "customCourseName", v)
                      }
                    />
                  ) : (
                    <DateField
                      label="Issue Date"
                      value={cert.issueDate}
                      onChange={(v) =>
                        updateCertField(index, "issueDate", v)
                      }
                    />
                  )}

                  {COURSE_DURATION_YEARS[cert.courseType] ? (
                    <ReadOnlyField
                      label="Expiry Date (auto)"
                      value={cert.expiryDate || ""}
                    />
                  ) : (
                    <DateField
                      label={
                        cert.courseType === "HACCP"
                          ? "Expiry Date (optional / HACCP usually no expiry)"
                          : "Expiry Date (manual)"
                      }
                      value={cert.expiryDate}
                      onChange={(v) =>
                        updateCertField(index, "expiryDate", v)
                      }
                    />
                  )}

                  {cert.courseType === "OTHER" && (
                    <DateField
                      label="Issue Date"
                      value={cert.issueDate}
                      onChange={(v) =>
                        updateCertField(index, "issueDate", v)
                      }
                    />
                  )}
                </div>

                {/* Image per certificate */}
                <div style={{ marginTop: 10 }}>
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      fontWeight: 600,
                      color: "#0f172a",
                      fontSize: 13,
                    }}
                  >
                    <Bi en="Certificate Image (Optional)" ar="صورة الشهادة (اختياري)" />
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleCertImageSelect(index, e)
                        }
                        style={{
                          flex: 1,
                          padding: 8,
                          border:
                            "1px dashed rgba(148,163,184,0.9)",
                          borderRadius: 10,
                          background:
                            "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
                          fontSize: 12,
                        }}
                      />
                    </div>
                  </label>

                  {cert.imageUrl === "__uploading__" && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#0369a1", fontWeight: 600 }}>
                      ⏳ <Bi en="Uploading…" ar="جارٍ الرفع…" />
                    </div>
                  )}

                  {cert.imageUrl && cert.imageUrl !== "__uploading__" && (
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 8,
                        borderRadius: 12,
                        background:
                          "linear-gradient(135deg,rgba(15,23,42,0.03),rgba(8,47,73,0.03))",
                        border:
                          "1px solid rgba(148,163,184,0.4)",
                      }}
                    >
                      <img
                        src={cert.imageUrl}
                        alt={`Certificate ${index + 1}`}
                        style={{
                          height: 90,
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          objectFit: "cover",
                          boxShadow:
                            "0 8px 20px rgba(15,23,42,0.28)",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => removeCertImage(index)}
                          style={{
                            padding: "8px 14px",
                            background:
                              "linear-gradient(135deg,#ef4444,#b91c1c)",
                            color: "#fff",
                            border: 0,
                            borderRadius: 999,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          <Bi en="Remove Image" ar="حذف الصورة" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {/* زر رجوع للقائمة الرئيسية */}
            <button
              type="button"
              onClick={() => navigate("/company-app?card=certificates")}
              style={{
                padding: "10px 18px",
                background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)",
                color: "#374151",
                border: "1px solid #cbd5e1",
                borderRadius: 999,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ← <Bi en="Back" />
            </button>
            {/* زر عرض الشهادات */}
            <button
              type="button"
              onClick={() => navigate("/company-app?card=certificates&mode=view")}
              style={{
                padding: "10px 18px",
                background:
                  "linear-gradient(135deg,#0f172a,#1e293b,#020617)",
                color: "#f9fafb",
                border: 0,
                borderRadius: 999,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
                boxShadow:
                  "0 10px 24px rgba(15,23,42,0.65)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              📋 <Bi en="View Certificates" />
            </button>

            <button
              onClick={handleSave}
              disabled={busy}
              style={{
                padding: "10px 18px",
                background: busy
                  ? "linear-gradient(135deg,#22c55e,#16a34a)"
                  : "linear-gradient(135deg,#22c55e,#16a34a,#15803d)",
                color: "#f9fafb",
                border: 0,
                borderRadius: 999,
                fontWeight: 800,
                cursor: busy ? "default" : "pointer",
                fontSize: 13,
                letterSpacing: 0.4,
                boxShadow:
                  "0 14px 30px rgba(22,163,74,0.55)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: busy ? 0.9 : 1,
              }}
            >
              {busy ? <Bi en="Saving..." /> : <>💾 <Bi en="Save Certificates" ar="حفظ الشهادات" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

