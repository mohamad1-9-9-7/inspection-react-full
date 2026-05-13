// src/pages/Supervisor.jsx
// 👨‍🏫 Supervisor Panel — corrective actions are now stored on the server.
//   - Each action is saved as a separate record { type: "supervisor_corrective_action", payload: {...} }
//   - Images are uploaded to /api/images → only URLs are persisted (NOT base64), which keeps payloads small.
//   - Backwards compatible: existing localStorage data is loaded as a fallback and seamlessly migrated to
//     the server on the next save (base64 images get uploaded, then replaced with URLs).

import { useEffect, useState } from "react";
import { safeGetJSON } from "../utils/storage";
import API_BASE from "../config/api";
import Button     from "../components/Button";
import EmptyState from "../components/EmptyState";

const TYPE = "supervisor_corrective_action";

/* ============ Server helpers ============ */

/** Upload a single file (or a base64 data: URL) → returns the public URL. */
async function uploadImage(fileOrBase64) {
  let blob;
  let filename = "image.jpg";
  if (typeof fileOrBase64 === "string") {
    // Data URL ("data:image/jpeg;base64,...")
    const res = await fetch(fileOrBase64);
    blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "jpg").split(";")[0];
    filename = `image.${ext}`;
  } else if (fileOrBase64 instanceof Blob) {
    blob = fileOrBase64;
    filename = fileOrBase64.name || filename;
  } else {
    throw new Error("Invalid file");
  }
  const fd = new FormData();
  fd.append("file", blob, filename);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

/** Fetch all supervisor corrective-action records for a given inspection report. */
async function fetchActionsForReport(reportId) {
  if (!reportId) return [];
  try {
    const url = `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=1000`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    const arr = Array.isArray(data) ? data
              : Array.isArray(data?.data) ? data.data
              : Array.isArray(data?.items) ? data.items
              : Array.isArray(data?.rows)  ? data.rows
              : [];
    return arr.filter((r) => {
      const p = r?.payload || {};
      return r?.type === TYPE && String(p.reportId) === String(reportId);
    });
  } catch (e) {
    console.warn("fetchActionsForReport failed:", e);
    return [];
  }
}

/** POST or PUT a single corrective action. Returns the saved record. */
async function saveActionToServer(payload, existingServerId) {
  const url = existingServerId
    ? `${API_BASE}/api/reports/${encodeURIComponent(existingServerId)}`
    : `${API_BASE}/api/reports`;
  const method = existingServerId ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: TYPE, reporter: "supervisor", payload }),
  });
  if (!res.ok) throw new Error(`Save failed (HTTP ${res.status})`);
  return res.json().catch(() => ({}));
}

/* ============ Component ============ */

export default function Supervisor() {
  const [reports,        setReports]        = useState([]);
  const [branchOpen,     setBranchOpen]     = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  // actions: { [qText]: { action, reply, images: [url, url, ...], _serverId } }
  const [actions,        setActions]        = useState({});
  // tempImages: { [qText]: [{ blobUrl, file }] } — picked but not yet uploaded
  const [tempImages,     setTempImages]     = useState({});
  const [uploadingKey,   setUploadingKey]   = useState(null);  // qText currently uploading
  const [language,       setLanguage]       = useState("en");
  const [savingKey,      setSavingKey]      = useState(null);
  const [loadingActions, setLoadingActions] = useState(false);
  const [msg,            setMsg]            = useState("");

  const t = (ar, en) => language === "ar" ? ar : en;
  const isRtl = language === "ar";
  const flash = (text, ms = 2500) => { setMsg(text); setTimeout(() => setMsg(""), ms); };

  useEffect(() => {
    setReports(safeGetJSON("reports", []));
  }, []);

  /* Load actions for the selected report (server first, then localStorage fallback) */
  useEffect(() => {
    if (!selectedReport) {
      setActions({});
      setTempImages({});
      return;
    }
    const reportId =
      selectedReport.id ||
      selectedReport._id ||
      selectedReport.date + "_" + (selectedReport.branchName || "");

    let cancelled = false;
    setLoadingActions(true);

    (async () => {
      // 1) Pull anything already on the server
      const serverRecords = await fetchActionsForReport(reportId);

      const merged = {};
      for (const rec of serverRecords) {
        const p = rec?.payload || {};
        if (!p.qText) continue;
        merged[p.qText] = {
          action: p.action || "",
          reply:  p.reply  || "",
          images: Array.isArray(p.images) ? p.images : [],
          _serverId: rec.id || rec._id,
        };
      }

      // 2) Fallback: legacy localStorage data (for questions not yet on server)
      const local = safeGetJSON("correctiveActions_" + reportId, {});
      if (local && typeof local === "object") {
        for (const [qText, val] of Object.entries(local)) {
          if (merged[qText]) continue;     // server already has it — ignore the local copy
          if (!val) continue;
          merged[qText] = {
            action: val.action || "",
            reply:  val.reply  || "",
            images: Array.isArray(val.images) ? val.images : [],
            _serverId: null,                // not yet on server
            _legacy: true,                  // mark — will be migrated on next save
          };
        }
      }

      if (!cancelled) {
        setActions(merged);
        setTempImages({});
        setLoadingActions(false);
      }
    })();

    return () => { cancelled = true; };
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

  /**
   * When the user picks images, we DON'T convert to base64 anymore.
   * We keep blob URLs for preview + the raw File objects for upload.
   */
  const handleActionImagesChange = (qText, files) => {
    const fileArr = Array.from(files || []);
    if (fileArr.length === 0) return;
    const previews = fileArr.map((file) => ({
      blobUrl: URL.createObjectURL(file),
      file,
    }));
    setTempImages(prev => ({ ...prev, [qText]: [...(prev[qText] || []), ...previews] }));
  };

  const handleRemoveActionImage = (qText, imgIdx) =>
    setTempImages(prev => {
      const arr = prev[qText] || [];
      // Revoke blob URL to free memory
      const removed = arr[imgIdx];
      if (removed?.blobUrl) try { URL.revokeObjectURL(removed.blobUrl); } catch {}
      return { ...prev, [qText]: arr.filter((_, i) => i !== imgIdx) };
    });

  /**
   * Save flow:
   *  1. Upload every pending temp image → URL.
   *  2. Migrate any legacy base64 strings already inside actions[qText].images.
   *  3. POST/PUT the record to the server.
   *  4. Clean localStorage for this question (legacy cleanup).
   */
  const handleSaveAction = async (qText) => {
    if (!selectedReport) return;
    const reportId =
      selectedReport.id ||
      selectedReport._id ||
      selectedReport.date + "_" + (selectedReport.branchName || "");

    setSavingKey(qText);
    setMsg("");
    try {
      const current = actions[qText] || {};
      const existingImages = Array.isArray(current.images) ? current.images : [];

      // 1) Upload pending picks (File objects) → URLs
      setUploadingKey(qText);
      const pending = tempImages[qText] || [];
      const uploadedFromPending = [];
      for (const item of pending) {
        const url = await uploadImage(item.file);
        uploadedFromPending.push(url);
        if (item.blobUrl) { try { URL.revokeObjectURL(item.blobUrl); } catch {} }
      }

      // 2) Upgrade any leftover base64 entries (legacy data) → URLs
      const migratedExisting = [];
      for (const img of existingImages) {
        if (typeof img === "string" && img.startsWith("data:")) {
          // legacy base64 → upload once, replace with URL
          const url = await uploadImage(img);
          migratedExisting.push(url);
        } else {
          migratedExisting.push(img);
        }
      }

      const finalImages = [...migratedExisting, ...uploadedFromPending];
      setUploadingKey(null);

      // 3) Build the payload and persist on the server
      const payload = {
        reportId,
        qText,
        action: current.action || "",
        reply:  current.reply  || "",
        images: finalImages,
        branchName: selectedReport.branchName || "",
        reportDate: selectedReport.date || "",
        savedAt: new Date().toISOString(),
      };
      const saved = await saveActionToServer(payload, current._serverId);
      const newServerId = saved?.id || saved?.data?.id || saved?._id || current._serverId;

      // 4) Reflect the saved state in the UI
      setActions(prev => ({
        ...prev,
        [qText]: {
          action: payload.action,
          reply:  payload.reply,
          images: finalImages,
          _serverId: newServerId,
          _legacy: false,
        },
      }));
      setTempImages(prev => ({ ...prev, [qText]: [] }));

      // 5) Best-effort: clean up the legacy localStorage entry for this question
      try {
        const localKey = "correctiveActions_" + reportId;
        const local = safeGetJSON(localKey, {});
        if (local && typeof local === "object" && qText in local) {
          delete local[qText];
          if (Object.keys(local).length === 0) localStorage.removeItem(localKey);
          else localStorage.setItem(localKey, JSON.stringify(local));
        }
      } catch {}

      flash(t("✅ تم حفظ الإجراء بالسيرفر", "✅ Action saved to server"));
    } catch (e) {
      console.error("Save failed:", e);
      flash(t("❌ فشل الحفظ: ", "❌ Save failed: ") + (e?.message || e), 4000);
    } finally {
      setSavingKey(null);
      setUploadingKey((u) => (u === qText ? null : u));
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

      {/* Flash message */}
      {msg && (
        <div
          role="status"
          style={{
            position: "fixed", top: 14, insetInlineEnd: 14, zIndex: 9999,
            padding: "10px 16px", borderRadius: 12,
            background: msg.startsWith("❌") ? "#fee2e2" : "#dcfce7",
            color: msg.startsWith("❌") ? "#7f1d1d" : "#166534",
            fontWeight: 900, fontSize: 13,
            boxShadow: "0 12px 30px rgba(2,6,23,.18)",
            border: `1px solid ${msg.startsWith("❌") ? "#fecaca" : "#bbf7d0"}`,
          }}
        >{msg}</div>
      )}

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
            {loadingActions && (
              <span style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                ⏳ {t("جاري تحميل الإجراءات…", "Loading actions…")}
              </span>
            )}
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
            Object.entries(selectedReport.answers || {}).map(([qText, ans], i) => {
              const a = actions[qText] || {};
              const isLegacy = !!a._legacy;
              return (
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: "var(--space-3)" }}>
                      <h5 style={{ color: "var(--color-info)", fontWeight: "var(--font-weight-bold)", margin: 0, fontSize: "var(--font-size-sm)" }}>
                        🛠️ {t("الإجراء التصحيحي", "Corrective Action")}
                      </h5>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {isLegacy && (
                          <span style={{ fontSize: 10, fontWeight: 1000, padding: "2px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                            {t("محلي — سيُرَحَّل عند الحفظ", "Local — will migrate on save")}
                          </span>
                        )}
                        {a._serverId && (
                          <span style={{ fontSize: 10, fontWeight: 1000, padding: "2px 8px", borderRadius: 999, background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }}>
                            ✓ {t("على السيرفر", "On server")}
                          </span>
                        )}
                      </div>
                    </div>

                    <textarea
                      value={a.action || ""}
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
                      onChange={e => { handleActionImagesChange(qText, e.target.files); e.target.value = ""; }}
                      style={{ marginBottom: "var(--space-3)", fontSize: "var(--font-size-sm)" }}
                    />

                    {/* معاينة الصور */}
                    {((a.images || []).length > 0 || (tempImages[qText] || []).length > 0) && (
                      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
                        {(a.images || []).map((img, imgIdx) => (
                          <a key={imgIdx} href={img} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block" }}>
                            <img src={img} alt="" style={{ width: 68, height: 68, borderRadius: "var(--radius-md)", objectFit: "cover", border: "2px solid var(--color-info)" }} />
                          </a>
                        ))}
                        {(tempImages[qText] || []).map((item, imgIdx) => (
                          <div key={imgIdx} style={{ position: "relative" }}>
                            <img src={item.blobUrl} alt="" style={{ width: 68, height: 68, borderRadius: "var(--radius-md)", objectFit: "cover", border: "2px dashed var(--color-primary)", opacity: uploadingKey === qText ? 0.6 : 1 }} />
                            <button
                              onClick={() => handleRemoveActionImage(qText, imgIdx)}
                              disabled={uploadingKey === qText}
                              style={{ position: "absolute", top: 2, insetInlineEnd: 2, width: 20, height: 20, borderRadius: "50%", background: "var(--color-danger)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {(tempImages[qText] || []).length > 0 && (
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#7c2d12", marginBottom: 6 }}>
                        ⓘ {t(
                          `${tempImages[qText].length} صورة جاهزة — سترفع للسيرفر عند الحفظ`,
                          `${tempImages[qText].length} image(s) queued — will upload to server when you Save`
                        )}
                      </div>
                    )}

                    <textarea
                      value={a.reply || ""}
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
                      {uploadingKey === qText
                        ? `📤 ${t("جاري رفع الصور…", "Uploading images…")}`
                        : `💾 ${t("حفظ الإجراء", "Save Action")}`}
                    </Button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
