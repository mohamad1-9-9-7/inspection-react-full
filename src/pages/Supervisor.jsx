import { useEffect, useState } from "react";
import { safeGetJSON } from "../utils/storage";
import Button     from "../components/Button";
import EmptyState from "../components/EmptyState";

export default function Supervisor() {
  const [reports,        setReports]        = useState([]);
  const [branchOpen,     setBranchOpen]     = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [actions,        setActions]        = useState({});
  const [tempImages,     setTempImages]     = useState({});
  const [language,       setLanguage]       = useState("ar");
  const [savingKey,      setSavingKey]      = useState(null); // للزر loading

  const t = (ar, en) => language === "ar" ? ar : en;
  const isRtl = language === "ar";

  useEffect(() => {
    setReports(safeGetJSON("reports", []));
  }, []);

  useEffect(() => {
    if (!selectedReport) return;
    const reportId =
      selectedReport.id ||
      selectedReport._id ||
      selectedReport.date + "_" + (selectedReport.branchName || "");
    setActions(safeGetJSON("correctiveActions_" + reportId, {}));
    setTempImages({});
  }, [selectedReport]);

  function formatDate(dateString) {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleString(isRtl ? "ar-EG" : "en-US", {
        year: "numeric", month: "numeric", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
    } catch { return dateString; }
  }

  const allQuestions = safeGetJSON("allQuestions", []);
  function getQuestionText(qText) {
    const found = allQuestions.find(
      q => q.textAr === qText || q.textEn === qText || q.text === qText
    );
    if (!found) {
      if (qText.includes("||")) return isRtl ? qText.split("||")[0] : qText.split("||")[1];
      return qText;
    }
    return isRtl ? (found.textAr || found.text || qText) : (found.textEn || found.text || qText);
  }

  const branches = Array.from(new Set(reports.map(r => r.branchName || "")))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ar"));

  const branchReports = branchOpen
    ? reports.filter(r => r.branchName === branchOpen).sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  const handleActionChange = (qText, val) =>
    setActions(prev => ({ ...prev, [qText]: { ...prev[qText], action: val } }));

  const handleReplyChange = (qText, val) =>
    setActions(prev => ({ ...prev, [qText]: { ...prev[qText], reply: val } }));

  const handleActionImagesChange = (qText, files) => {
    const imgs = [];
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        imgs.push(reader.result);
        if (imgs.length === files.length) {
          setTempImages(prev => ({ ...prev, [qText]: [...(prev[qText] || []), ...imgs] }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveActionImage = (qText, imgIdx) =>
    setTempImages(prev => ({ ...prev, [qText]: prev[qText].filter((_, i) => i !== imgIdx) }));

  const handleSaveAction = (qText) => {
    if (!selectedReport) return;
    setSavingKey(qText);
    const reportId =
      selectedReport.id ||
      selectedReport._id ||
      selectedReport.date + "_" + (selectedReport.branchName || "");
    const imgs = [...(actions[qText]?.images || []), ...(tempImages[qText] || [])];
    const toSave = {
      ...actions,
      [qText]: { action: actions[qText]?.action || "", reply: actions[qText]?.reply || "", images: imgs },
    };
    try {
      localStorage.setItem("correctiveActions_" + reportId, JSON.stringify(toSave));
      setActions(toSave);
      setTempImages(prev => ({ ...prev, [qText]: [] }));
    } catch (e) {
      console.error("Failed to save:", e);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div style={{
      padding: "var(--space-6)",
      direction: isRtl ? "rtl" : "ltr",
      fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-english)",
      background: "var(--bg-page)",
      minHeight: "100vh",
    }}>

      {/* ── الهيدر ── */}
      <div className="qms-card" style={{ marginBottom: "var(--space-5)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-black)", color: "var(--text-primary)", margin: 0 }}>
          👨‍🏫 {t("صفحة المشرف", "Supervisor Panel")}
        </h2>

        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", fontWeight: 600 }}>
          {t("اللغة:", "Language:")}
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="qms-input"
            style={{ width: "auto", padding: "var(--space-1) var(--space-3)" }}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>

      {/* ── لا توجد تقارير ── */}
      {reports.length === 0 && (
        <EmptyState
          icon="📋"
          message={t("لا توجد تقارير متاحة حالياً", "No reports available yet")}
          sub={t("ستظهر التقارير هنا بعد حفظها من صفحة التفتيش", "Reports will appear here after being saved from the Inspection page")}
        />
      )}

      {/* ── قائمة الفروع ── */}
      {reports.length > 0 && !selectedReport && !branchOpen && (
        <div className="qms-card">
          <h3 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)", marginBottom: "var(--space-5)" }}>
            🗂️ {t("قائمة الفروع", "Branches List")}
          </h3>

          {branches.length === 0 ? (
            <EmptyState icon="🏢" message={t("لا توجد فروع", "No branches found")} />
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
              {branches.map(branch => (
                <button
                  key={branch}
                  onClick={() => setBranchOpen(branch)}
                  style={{
                    minWidth: 140,
                    padding: "var(--space-4) var(--space-6)",
                    borderRadius: "var(--radius-lg)",
                    border: "2px solid var(--color-primary)",
                    background: "var(--bg-card)",
                    color: "var(--color-primary)",
                    fontSize: "var(--font-size-base)",
                    fontWeight: "var(--font-weight-bold)",
                    cursor: "pointer",
                    transition: "background var(--transition-base), color var(--transition-base), box-shadow var(--transition-base)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "var(--color-primary)";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "var(--bg-card)";
                    e.currentTarget.style.color = "var(--color-primary)";
                    e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                  }}
                >
                  🏢 {branch}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── تقارير الفرع ── */}
      {branchOpen && !selectedReport && (
        <div className="qms-card">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
            <Button variant="ghost" size="sm" onClick={() => setBranchOpen(null)}>
              ← {t("عودة للفروع", "Back to Branches")}
            </Button>
            <h4 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)", margin: 0 }}>
              {t("تقارير الفرع", "Branch Reports")}: <span style={{ color: "var(--color-primary)" }}>{branchOpen}</span>
            </h4>
          </div>

          {branchReports.length === 0 ? (
            <EmptyState icon="📄" message={t("لا توجد تقارير لهذا الفرع", "No reports for this branch")} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {branchReports.map((rep, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedReport(rep)}
                  style={{
                    background: "var(--bg-card-hover)",
                    border: "1.5px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-4) var(--space-5)",
                    fontWeight: "var(--font-weight-medium)",
                    fontSize: "var(--font-size-base)",
                    textAlign: isRtl ? "right" : "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    transition: "border-color var(--transition-base), box-shadow var(--transition-base)",
                    color: "var(--text-primary)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span style={{ fontSize: 20, color: "var(--color-primary)" }}>📝</span>
                  <span>{formatDate(rep.date)}</span>
                  {rep.percentage !== undefined && (
                    <span className="qms-badge qms-badge-success" style={{ marginInlineStart: "auto" }}>
                      {rep.percentage}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── تفاصيل التقرير ── */}
      {selectedReport && (
        <div className="qms-card qms-fade-in">

          {/* شريط العودة */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
            <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
              ← {t("عودة للتواريخ", "Back to Dates")}
            </Button>
            <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)", margin: 0 }}>
              {t("تفاصيل التقرير", "Report Details")} — {formatDate(selectedReport.date)}
            </h3>
          </div>

          {/* معلومات الفرع */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-3)",
            background: "var(--bg-card-hover)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
            marginBottom: "var(--space-5)",
            border: "1px solid var(--border-color)",
          }}>
            {[
              [t("اسم الفرع", "Branch"),           selectedReport.branchName],
              [t("تاريخ الزيارة", "Visit Date"),    formatDate(selectedReport.visitDate)],
              [t("اسم المشرف", "Supervisor"),       selectedReport.supervisorName],
              [t("النسبة المئوية", "Percentage"),   selectedReport.percentage ? `${selectedReport.percentage}%` : "-"],
              [t("التقييم النهائي", "Final Rating"), selectedReport.finalRating],
              [t("التعليق النهائي", "Comment"),     selectedReport.finalComment],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: "var(--font-size-base)", color: "var(--text-primary)", fontWeight: 600 }}>
                  {value || "-"}
                </div>
              </div>
            ))}
          </div>

          {/* الأسئلة والإجابات */}
          <h4 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)", color: "var(--text-primary)", marginBottom: "var(--space-4)", paddingBottom: "var(--space-2)", borderBottom: "2px solid var(--color-primary)" }}>
            {t("الأسئلة والإجابات", "Questions & Answers")}
          </h4>

          {Object.entries(selectedReport.answers || {}).length === 0 ? (
            <EmptyState icon="💬" message={t("لا توجد إجابات مسجلة", "No answers recorded")} />
          ) : (
            Object.entries(selectedReport.answers || {}).map(([qText, ans], i) => (
              <article
                key={i}
                style={{
                  marginBottom: "var(--space-5)",
                  padding: "var(--space-4)",
                  background: "var(--bg-card-hover)",
                  borderRadius: "var(--radius-md)",
                  border: `1.5px solid ${ans === "no" ? "var(--color-danger-light)" : "var(--border-color)"}`,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* السؤال والإجابة */}
                <div style={{ fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-2)", color: "var(--text-primary)" }}>
                  {i + 1}. {getQuestionText(qText)}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                  <span className={`qms-badge ${ans === "yes" ? "qms-badge-success" : "qms-badge-danger"}`}>
                    {ans === "yes" ? t("✔ نعم", "✔ Yes") : ans === "no" ? t("✘ لا", "✘ No") : "-"}
                  </span>
                  {selectedReport.risks?.[qText] && (
                    <span className="qms-badge qms-badge-warning">
                      {t("خطر:", "Risk:")} {selectedReport.risks[qText]}
                    </span>
                  )}
                </div>

                {selectedReport.comments?.[qText] && (
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
                    💬 {selectedReport.comments[qText]}
                  </p>
                )}

                {/* صور التقرير */}
                {selectedReport.images?.[qText]?.length > 0 && (
                  <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
                    {selectedReport.images[qText].map((img, imgIdx) => (
                      <img key={imgIdx} src={img} alt="" style={{ width: 100, height: 100, borderRadius: "var(--radius-md)", objectFit: "cover", boxShadow: "var(--shadow-sm)", cursor: "zoom-in" }} />
                    ))}
                  </div>
                )}

                {/* الإجراء التصحيحي */}
                <div style={{ marginTop: "var(--space-4)", background: "#eaf6ff", borderRadius: "var(--radius-md)", padding: "var(--space-4)", border: "1px solid #bfdbfe" }}>
                  <h5 style={{ color: "var(--color-info)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-3)", fontSize: "var(--font-size-sm)" }}>
                    🛠️ {t("الإجراء التصحيحي", "Corrective Action")}
                  </h5>

                  <textarea
                    value={actions[qText]?.action || ""}
                    onChange={e => handleActionChange(qText, e.target.value)}
                    placeholder={t("اكتب الإجراء التصحيحي هنا...", "Write the corrective action here...")}
                    rows={3}
                    className="qms-input"
                    style={{ marginBottom: "var(--space-3)", resize: "vertical" }}
                  />

                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => handleActionImagesChange(qText, e.target.files)}
                    style={{ marginBottom: "var(--space-3)", fontSize: "var(--font-size-sm)" }}
                  />

                  {/* معاينة الصور */}
                  {((actions[qText]?.images || []).length > 0 || (tempImages[qText] || []).length > 0) && (
                    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
                      {(actions[qText]?.images || []).map((img, imgIdx) => (
                        <img key={imgIdx} src={img} alt="" style={{ width: 68, height: 68, borderRadius: "var(--radius-md)", objectFit: "cover", border: "2px solid var(--color-info)" }} />
                      ))}
                      {(tempImages[qText] || []).map((img, imgIdx) => (
                        <div key={imgIdx} style={{ position: "relative" }}>
                          <img src={img} alt="" style={{ width: 68, height: 68, borderRadius: "var(--radius-md)", objectFit: "cover", border: "2px solid var(--color-primary)" }} />
                          <button
                            onClick={() => handleRemoveActionImage(qText, imgIdx)}
                            style={{ position: "absolute", top: 2, insetInlineEnd: 2, width: 20, height: 20, borderRadius: "50%", background: "var(--color-danger)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    value={actions[qText]?.reply || ""}
                    onChange={e => handleReplyChange(qText, e.target.value)}
                    placeholder={t("رد المشرف (اختياري)...", "Supervisor reply (optional)...")}
                    rows={2}
                    className="qms-input"
                    style={{ marginBottom: "var(--space-3)", resize: "vertical" }}
                  />

                  <Button
                    variant="primary"
                    size="sm"
                    loading={savingKey === qText}
                    onClick={() => handleSaveAction(qText)}
                  >
                    💾 {t("حفظ الإجراء", "Save Action")}
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
