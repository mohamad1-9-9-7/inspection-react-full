import { useEffect, useState } from "react";

export default function Supervisor() {
  const [reports, setReports] = useState([]);
  const [branchOpen, setBranchOpen] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [actions, setActions] = useState({});
  const [tempImages, setTempImages] = useState({});
  const [language, setLanguage] = useState("ar"); // إضافة اللغة

  useEffect(() => {
    const savedReports = JSON.parse(localStorage.getItem("reports") || "[]");
    setReports(savedReports);
  }, []);

  useEffect(() => {
    if (!selectedReport) return;
    const reportId =
      selectedReport.id ||
      selectedReport._id ||
      selectedReport.date + "_" + (selectedReport.branchName || "");
    const stored = JSON.parse(localStorage.getItem("correctiveActions_" + reportId) || "{}");
    setActions(stored);
    setTempImages({});
  }, [selectedReport]);

  // دالة الترجمة المختصرة
  const t = (ar, en) => (language === "ar" ? ar : en);

  // دالة تنسيق التاريخ حسب اللغة (AM/PM أو ص/م)
  function formatDate(dateString, lang = "ar") {
    if (!dateString) return "-";
    // إذا كان التاريخ محفوظ كنص جاهز، جرب تحويله إلى تاريخ صحيح
    let dateObj;
    // جرب تحويله لتاريخ
    try {
      dateObj = new Date(dateString);
      // إذا كان غير صالح، أعد النص نفسه
      if (isNaN(dateObj.getTime())) return dateString;
    } catch {
      return dateString;
    }
    return dateObj.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  // جلب كل الأسئلة المحفوظة (لو أردت دقة أكثر، استخدم نفس مصفوفة baseQuestions في نموذج التفتيش)
  const allQuestions =
    JSON.parse(localStorage.getItem("allQuestions") || "[]")
    // الأسئلة الأساسية (لو وضعت لها نسخة بالإنكليزي)
    .concat([
      // (لو تريد إضافة كل baseQuestions هنا يمكنك، أو استخدمها من ملف مشترك)
    ]);

  // استخراج نص السؤال أو القسم حسب اللغة
  function getQuestionText(qText, lang = "ar") {
    const found = allQuestions.find(
      (q) => q.textAr === qText || q.textEn === qText || q.text === qText
    );
    if (!found) {
      if (qText.includes("||")) {
        return lang === "ar" ? qText.split("||")[0] : qText.split("||")[1];
      }
      return qText;
    }
    if (lang === "ar") return found.textAr || found.text || qText;
    return found.textEn || found.text || qText;
  }

  // الفروع الفريدة
  const branches = Array.from(
    new Set(reports.map((r) => r.branchName || ""))
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ar"));

  // تقارير الفرع المفتوح
  const branchReports = branchOpen
    ? reports
        .filter((r) => r.branchName === branchOpen)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  // دوال الإجراءات التصحيحية (كما في كودك)
  const handleActionChange = (qText, val) => {
    setActions((prev) => ({
      ...prev,
      [qText]: { ...prev[qText], action: val },
    }));
  };
  const handleReplyChange = (qText, val) => {
    setActions((prev) => ({
      ...prev,
      [qText]: { ...prev[qText], reply: val },
    }));
  };
  const handleActionImagesChange = (qText, files) => {
    const readers = [];
    const imgs = [];
    for (let i = 0; i < files.length; i++) {
      readers[i] = new FileReader();
      readers[i].onloadend = () => {
        imgs.push(readers[i].result);
        if (imgs.length === files.length) {
          setTempImages((prev) => ({
            ...prev,
            [qText]: [...(prev[qText] || []), ...imgs],
          }));
        }
      };
      readers[i].readAsDataURL(files[i]);
    }
  };
  const handleRemoveActionImage = (qText, imgIdx) => {
    setTempImages((prev) => ({
      ...prev,
      [qText]: prev[qText].filter((_, i) => i !== imgIdx),
    }));
  };
  const handleSaveAction = (qText) => {
    const reportId =
      selectedReport.id ||
      selectedReport._id ||
      selectedReport.date + "_" + (selectedReport.branchName || "");
    const prevImgs = actions[qText]?.images || [];
    const imgs = [...prevImgs, ...(tempImages[qText] || [])];
    const toSave = {
      ...actions,
      [qText]: {
        action: actions[qText]?.action || "",
        reply: actions[qText]?.reply || "",
        images: imgs,
      },
    };
    localStorage.setItem("correctiveActions_" + reportId, JSON.stringify(toSave));
    setActions(toSave);
    setTempImages((prev) => ({ ...prev, [qText]: [] }));
    alert(t("تم حفظ الإجراء التصحيحي", "Corrective action saved ✅"));
  };

  // حقول ثابتة
  const label = (ar, en) => t(ar, en);

  return (
    <div
      style={{
        padding: "2rem",
        direction: language === "ar" ? "rtl" : "ltr",
        fontFamily: language === "ar" ? "'Segoe UI', Cairo, sans-serif" : "Arial, sans-serif",
        backgroundColor: "#f0f2f5",
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: "1rem", textAlign: language === "ar" ? "left" : "right" }}>
        <label>
          {t("اختر اللغة: ", "Select Language: ")}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ padding: "4px 8px", fontSize: "1rem" }}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>

      <h2
        style={{
          marginBottom: "2rem",
          color: "#2c3e50",
          fontWeight: "700",
          fontSize: "2rem",
          textAlign: "center",
          textShadow: "1px 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        {t("👨‍🏫 صفحة المشرف - تصفح تقارير الفروع", "👨‍🏫 Supervisor Reports - Branches")}
      </h2>

      {reports.length === 0 && (
        <p
          style={{
            textAlign: "center",
            fontSize: "1.1rem",
            color: "#555",
            marginTop: "3rem",
          }}
        >
          {t("لا توجد تقارير متاحة حالياً", "No reports available yet.")}
        </p>
      )}

      {/* الفروع */}
      {!selectedReport && (
        <div>
          <h3 style={{ color: "#2980b9", marginBottom: "1.5rem" }}>
            {t("🗂️ قائمة الفروع", "🗂️ Branches List")}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {branches.length === 0 && (
              <div style={{ color: "#aaa" }}>{t("لا توجد فروع", "No branches")}</div>
            )}
            {branches.map((branch) => (
              <button
                key={branch}
                style={{
                  minWidth: 150,
                  background: branchOpen === branch ? "#2980b9" : "#fff",
                  color: branchOpen === branch ? "#fff" : "#2980b9",
                  border: "2px solid #2980b9",
                  borderRadius: "10px",
                  padding: "18px 32px",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  boxShadow: branchOpen === branch ? "0 2px 10px #2980b97a" : "none",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s, box-shadow 0.3s",
                }}
                onClick={() => setBranchOpen(branchOpen === branch ? null : branch)}
              >
                🏢 {branch}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* تواريخ تقارير الفرع */}
      {branchOpen && !selectedReport && (
        <div style={{ marginTop: "2rem" }}>
          <h4 style={{ color: "#2c3e50", fontWeight: "bold", marginBottom: "1rem" }}>
            {t("تقارير الفرع", "Branch Reports")}: {branchOpen}
          </h4>
          <button
            onClick={() => setBranchOpen(null)}
            style={{
              background: "#eee",
              color: "#2980b9",
              border: "none",
              borderRadius: "6px",
              padding: "8px 20px",
              fontWeight: "bold",
              marginBottom: "1rem",
              cursor: "pointer",
            }}
          >
            ← {t("عودة للفروع", "Back to Branches")}
          </button>
          {branchReports.length === 0 && (
            <p style={{ color: "#888", marginTop: "2rem" }}>
              {t("لا توجد تقارير لهذا الفرع", "No reports for this branch.")}
            </p>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            {branchReports.map((rep, idx) => (
              <button
                key={idx}
                style={{
                  background: "#f7f9fb",
                  border: "1.5px solid #2980b9",
                  color: "#34495e",
                  borderRadius: "8px",
                  padding: "14px 24px",
                  fontWeight: "bold",
                  fontSize: "1.06rem",
                  textAlign: "right",
                  cursor: "pointer",
                  boxShadow: "0 1px 8px rgba(41,128,185,0.08)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
                onClick={() => setSelectedReport(rep)}
              >
                <span style={{ fontSize: "1.2rem", color: "#2980b9" }}>📝</span>
                {formatDate(rep.date, language)}
                <span style={{ marginRight: "auto", color: "#27ae60" }}>
                  {rep.percentage !== undefined ? `(${rep.percentage}%)` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* تفاصيل التقرير */}
      {selectedReport && (
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            padding: "2rem 2.5rem",
            marginTop: "2.5rem",
            boxShadow: "0 6px 24px rgba(41,128,185,0.09)",
            position: "relative",
          }}
        >
          <button
            onClick={() => setSelectedReport(null)}
            style={{
              position: "absolute",
              top: 20,
              left: 24,
              background: "#eee",
              color: "#2980b9",
              border: "none",
              borderRadius: "6px",
              padding: "6px 18px",
              fontWeight: "bold",
              fontSize: "1.05rem",
              cursor: "pointer",
              zIndex: 2,
            }}
          >
            ← {t("عودة للتواريخ", "Back to Dates")}
          </button>
          <h3
            style={{
              color: "#2980b9",
              fontWeight: "700",
              marginBottom: "1.6rem",
              textAlign: "right",
            }}
          >
            {t("تفاصيل التقرير", "Report Details")} {formatDate(selectedReport.date, language)}
          </h3>
          <div style={{ color: "#34495e", fontWeight: "400", fontSize: "1rem" }}>
            <p>
              <strong>{label("اسم الفرع", "Branch Name")}:</strong> {selectedReport.branchName || "-"}
            </p>
            <p>
              <strong>{label("تاريخ الزيارة", "Visit Date")}:</strong> {formatDate(selectedReport.visitDate, language)}
            </p>
            <p>
              <strong>{label("اسم المشرف", "Supervisor Name")}:</strong> {selectedReport.supervisorName || "-"}
            </p>
            <p>
              <strong>{label("أنواع التفتيش", "Inspection Types")}:</strong>{" "}
              {Array.isArray(selectedReport.types)
                ? selectedReport.types.join(", ")
                : selectedReport.type || "-"}
            </p>
            <p>
              <strong>{label("النسبة المئوية", "Percentage")}:</strong> {selectedReport.percentage || "-"}%
            </p>
            <p>
              <strong>{label("التقييم النهائي", "Final Rating")}:</strong> {selectedReport.finalRating || "-"}
            </p>
            <p>
              <strong>{label("التعليق النهائي", "Final Comment")}:</strong> {selectedReport.finalComment || "-"}
            </p>
          </div>
          <hr style={{ margin: "1.2rem 0", borderColor: "#ddd" }} />
          <h4
            style={{
              marginBottom: "1rem",
              color: "#2980b9",
              fontWeight: "700",
              fontSize: "1.15rem",
              borderBottom: "2px solid #2980b9",
              paddingBottom: "0.3rem",
            }}
          >
            {t("إجابات وتفاصيل الأسئلة", "Questions & Answers")}
          </h4>
          {Object.entries(selectedReport.answers || {}).length === 0 && (
            <p style={{ fontStyle: "italic", color: "#888" }}>
              {t("لا توجد إجابات مسجلة", "No answers available.")}
            </p>
          )}

          {Object.entries(selectedReport.answers || {}).map(([qText, ans], i) => (
            <article
              key={i}
              style={{
                marginBottom: "2.5rem",
                padding: "1rem",
                backgroundColor: "#f9fbff",
                borderRadius: "10px",
                boxShadow: "inset 0 0 5px rgba(41, 128, 185, 0.1)",
                position: "relative",
              }}
            >
              <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                {getQuestionText(qText, language)}
              </div>
              <p
                style={{
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: ans === "yes" ? "#27ae60" : "#c0392b",
                }}
              >
                {label("الإجابة", "Answer")}:{" "}
                {ans === "yes"
                  ? t("✔️ نعم", "✔️ Yes")
                  : ans === "no"
                  ? t("❌ لا", "❌ No")
                  : "-"}
              </p>

              {selectedReport.comments?.[qText] && (
                <p style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                  {label("تعليق", "Comment")}:{" "}
                  <span style={{ fontWeight: "400" }}>
                    {selectedReport.comments[qText]}
                  </span>
                </p>
              )}

              {selectedReport.risks?.[qText] && (
                <p style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                  {label("مستوى الخطورة", "Risk Level")}:{" "}
                  <span style={{ fontWeight: "400" }}>
                    {selectedReport.risks[qText]}
                  </span>
                </p>
              )}

              {selectedReport.images?.[qText] &&
                Array.isArray(selectedReport.images[qText]) &&
                selectedReport.images[qText].length > 0 && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    {selectedReport.images[qText].map((img, imgIdx) => (
                      <img
                        key={imgIdx}
                        src={img}
                        alt={t("صورة تقرير", "Report Image")}
                        style={{
                          width: "120px",
                          borderRadius: "8px",
                          boxShadow: "0 2px 6px rgba(41, 128, 185, 0.3)",
                          cursor: "zoom-in",
                          transition: "transform 0.2s ease",
                        }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.transform = "scale(1.07)")
                        }
                        onMouseLeave={e =>
                          (e.currentTarget.style.transform = "scale(1)")
                        }
                      />
                    ))}
                  </div>
                )}

              {/* إجراء تصحيحي */}
              <div
                style={{
                  marginTop: "1.5rem",
                  background: "#eaf6ff",
                  borderRadius: 8,
                  padding: "1.3rem 1rem",
                }}
              >
                <h5 style={{ color: "#0d47a1", fontWeight: "bold", marginBottom: 8 }}>
                  🛠️ {label("الإجراء التصحيحي", "Corrective Action")}
                </h5>
                <textarea
                  value={actions[qText]?.action || ""}
                  onChange={e => handleActionChange(qText, e.target.value)}
                  placeholder={t("اكتب الإجراء التصحيحي هنا...", "Write the corrective action here...")}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "7px",
                    border: "1.5px solid #2980b9",
                    marginBottom: "10px",
                    fontSize: "1rem",
                  }}
                  rows={3}
                />
                {/* صور الإجراء التصحيحي */}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => handleActionImagesChange(qText, e.target.files)}
                  style={{ marginBottom: "10px" }}
                />
                <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  {(actions[qText]?.images || []).map((img, imgIdx) => (
                    <img
                      key={imgIdx}
                      src={img}
                      alt={t("صورة إجراء تصحيحي محفوظة", "Saved Corrective Action Image")}
                      style={{
                        width: 70,
                        height: 70,
                        borderRadius: 7,
                        border: "2px solid #2196f3",
                        objectFit: "cover",
                        marginBottom: 2,
                        marginLeft: 2,
                        background: "#fff",
                      }}
                    />
                  ))}
                  {(tempImages[qText] || []).map((img, imgIdx) => (
                    <div key={imgIdx} style={{ position: "relative" }}>
                      <img
                        src={img}
                        alt={t("جاري الإضافة", "Adding")}
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: 7,
                          border: "2px solid #2196f3",
                          objectFit: "cover",
                          background: "#fff",
                        }}
                      />
                      <button
                        title={t("حذف الصورة", "Remove image")}
                        onClick={() => handleRemoveActionImage(qText, imgIdx)}
                        style={{
                          position: "absolute",
                          top: 2,
                          left: 2,
                          background: "rgba(220,0,0,0.75)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: 22,
                          height: 22,
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {/* رد المشرف */}
                <textarea
                  value={actions[qText]?.reply || ""}
                  onChange={e => handleReplyChange(qText, e.target.value)}
                  placeholder={t("رد المشرف (اختياري)...", "Supervisor reply (optional)...")}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "7px",
                    border: "1.5px solid #90caf9",
                    marginBottom: "10px",
                    fontSize: "1rem",
                  }}
                  rows={2}
                />
                <button
                  onClick={() => handleSaveAction(qText)}
                  style={{
                    background: "#2196f3",
                    color: "#fff",
                    padding: "8px 24px",
                    border: "none",
                    borderRadius: "7px",
                    fontWeight: "bold",
                    fontSize: "1.07rem",
                    cursor: "pointer",
                  }}
                >
                  💾 {label("حفظ الإجراء", "Save Action")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
