// src/pages/haccp and iso/CustomerComplaints/CustomerComplaintInput.jsx
// Customer Complaint — Input form (ISO 22000:2018 Clauses 7.4 & 9.1.2)
// Supports attachment upload (compressed images + PDFs) for complaint evidence.

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "customer_complaint";

/* ── Attachment limits ──────────────────────────────────────── */
const PDF_MAX_BYTES = 3 * 1024 * 1024; // 3 MB per PDF
const IMG_MAX_DIM = 1600;              // longest side after compression
const IMG_QUALITY = 0.82;              // JPEG quality

/* ── File helpers ───────────────────────────────────────────── */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { try { URL.revokeObjectURL(url); } catch {} resolve(img); };
    img.onerror = (e) => { try { URL.revokeObjectURL(url); } catch {} reject(e); };
    img.src = url;
  });
}

async function compressToDataURL(file, { maxDim = IMG_MAX_DIM, quality = IMG_QUALITY } = {}) {
  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error("Invalid image dimensions");
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function formatBytes(n) {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const empty = {
  complaintDate: new Date().toISOString().slice(0, 10),
  complaintNumber: "",
  complainant: "",
  channel: "",
  product: "",
  batch: "",
  type: "BPC",
  severity: "Low",
  description: "",
  investigation: "",
  rootCause: "",
  capa: "",
  status: "Open",
  closureDate: "",
  closedBy: "",
  customerSatisfied: "Pending",
  /* Effectiveness verification — required before closure (ISO 22000 §10.1.2 / §9.1.2). */
  effectivenessVerified: "Pending",   // Pending | Yes | No
  effectivenessVerifiedDate: "",
  effectivenessVerifiedBy: "",
  effectivenessNotes: "",
  images: [],
  pdfs: [],
};

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "#fff7ed" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #fed7aa", boxShadow: "0 8px 22px rgba(234,88,12,0.06)" },
  title: { fontSize: 20, fontWeight: 950, color: "#9a3412", marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 950, color: "#9a3412", margin: "12px 0 8px", borderBottom: "2px solid #f97316", paddingBottom: 4 },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#9a3412", marginBottom: 4, marginTop: 8 },
  input: { width: "100%", padding: "8px 10px", border: "1.5px solid #fed7aa", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit" },
  textarea: { width: "100%", padding: "9px 11px", border: "1.5px solid #fed7aa", borderRadius: 8, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 70, resize: "vertical" },
  select: { width: "100%", padding: "8px 10px", border: "1.5px solid #fed7aa", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fff" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #f97316, #ea580c)", color: "#fff", border: "#c2410c" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      secondary: { bg: "#fff", color: "#9a3412", border: "#fed7aa" },
      danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
      ghost:     { bg: "#fff7ed", color: "#9a3412", border: "#fdba74" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "9px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 };
  },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },

  /* Attachment styles */
  attachmentDropZone: {
    border: "2px dashed #fdba74",
    background: "linear-gradient(135deg, #fff7ed, #fff)",
    borderRadius: 12, padding: "14px 16px",
    display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
    marginBottom: 10,
  },
  thumbGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 8 },
  thumbBox: { position: "relative", borderRadius: 10, overflow: "hidden", border: "1.5px solid #fed7aa", background: "#fff", boxShadow: "0 4px 12px rgba(234,88,12,0.08)" },
  thumbImg: { width: "100%", height: 110, objectFit: "cover", display: "block" },
  thumbName: { fontSize: 10, color: "#475569", padding: "4px 8px", fontWeight: 700, lineHeight: 1.3, wordBreak: "break-word" },
  removeBtn: { position: "absolute", top: 4, insetInlineEnd: 4, width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(220,38,38,0.92)", color: "#fff", fontSize: 14, fontWeight: 950, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, boxShadow: "0 2px 6px rgba(0,0,0,0.18)" },
  pdfCard: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #fed7aa", background: "#fffbeb", marginTop: 4, position: "relative" },
};

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
export default function CustomerComplaintInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { t, lang, toggle, dir } = useHaccpLang();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [processingPdfs, setProcessingPdfs] = useState(false);

  const imgInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const p = j?.payload || j?.data?.payload || {};
        setForm({
          ...empty,
          ...p,
          images: Array.isArray(p.images) ? p.images : [],
          pdfs: Array.isArray(p.pdfs) ? p.pdfs : [],
        });
      })
      .catch(() => {});
  }, [editId]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /* ── Attachment handlers ───────────────────────────────────── */
  async function onPickImages(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    try {
      setProcessingImages(true);
      const newItems = [];
      for (const file of picked) {
        if (!String(file?.type || "").startsWith("image/")) continue;
        const dataUrl = await compressToDataURL(file);
        newItems.push({
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name: file?.name || "image.jpg",
          mime: "image/jpeg",
          dataUrl,
        });
      }
      if (!newItems.length) {
        alert(lang === "ar" ? "لم يتم اختيار صور صالحة." : "No valid images selected.");
        return;
      }
      setForm((f) => ({ ...f, images: [...(f.images || []), ...newItems] }));
    } catch (err) {
      console.error(err);
      alert(lang === "ar" ? "فشل معالجة الصور." : "Failed to process images.");
    } finally {
      setProcessingImages(false);
    }
  }

  async function onPickPdfs(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    try {
      setProcessingPdfs(true);
      const newItems = [];
      for (const file of picked) {
        const lower = String(file?.name || "").toLowerCase();
        if (file?.type !== "application/pdf" && !lower.endsWith(".pdf")) continue;
        if (file.size > PDF_MAX_BYTES) {
          alert((lang === "ar" ? "ملف PDF كبير جداً: " : "PDF too large: ") + file.name + `\n${lang === "ar" ? "الحد الأقصى" : "Max"}: ${formatBytes(PDF_MAX_BYTES)}`);
          continue;
        }
        const dataUrl = await readFileAsDataURL(file);
        newItems.push({
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          name: file?.name || "file.pdf",
          mime: "application/pdf",
          dataUrl,
          size: file.size || 0,
        });
      }
      if (!newItems.length) {
        alert(lang === "ar" ? "لم يتم اختيار ملفات PDF صالحة." : "No valid PDF files selected.");
        return;
      }
      setForm((f) => ({ ...f, pdfs: [...(f.pdfs || []), ...newItems] }));
    } catch (err) {
      console.error(err);
      alert(lang === "ar" ? "فشل معالجة ملفات PDF." : "Failed to process PDFs.");
    } finally {
      setProcessingPdfs(false);
    }
  }

  function removeImage(id) {
    setForm((f) => ({ ...f, images: (f.images || []).filter((x) => x.id !== id) }));
  }
  function removePdf(id) {
    setForm((f) => ({ ...f, pdfs: (f.pdfs || []).filter((x) => x.id !== id) }));
  }

  async function save() {
    if (!form.complaintDate || !form.complainant || !form.description) {
      alert(t("requiredField"));
      return;
    }
    /* Effectiveness verification gate — cannot mark "Closed" without evidence
       that the CAPA actually worked (ISO 22000 §10.1.2 + §9.1.2). */
    if (form.status === "Closed") {
      if (!form.effectivenessVerified || form.effectivenessVerified === "Pending") {
        alert(lang === "ar"
          ? "⚠️ لا يمكن إغلاق الشكوى قبل تأكيد فعالية الإجراء التصحيحي (Effectiveness Verification)."
          : "⚠️ Complaint cannot be closed before CAPA Effectiveness Verification is completed.");
        return;
      }
      if (!form.effectivenessVerifiedBy?.trim() || !form.effectivenessVerifiedDate) {
        alert(lang === "ar"
          ? "⚠️ لإغلاق الشكوى: حقول 'تم التحقق بواسطة' و'تاريخ التحقق' إلزامية."
          : "⚠️ To close: 'Verified By' and 'Verification Date' are required.");
        return;
      }
    }
    setSaving(true);
    try {
      const url = editId
        ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}`
        : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const payload = {
        ...form,
        images: (form.images || []).map(({ name, mime, dataUrl }) => ({ name, mime, dataUrl })),
        pdfs:   (form.pdfs   || []).map(({ name, mime, dataUrl, size }) => ({ name, mime, dataUrl, size })),
        savedAt: Date.now(),
        storage: "base64",
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.closedBy || form.complainant || "admin", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/customer-complaints/view");
    } catch (e) {
      alert(t("saveError") + ": " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || processingImages || processingPdfs;

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("ccTitle")}</div>
            <HaccpLinkBadge clauses={["7.4", "9.1.2"]} label={lang === "ar" ? "التواصل + التحليل" : "Communication + Analysis"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/customer-complaints/view")}>{t("past")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{t("ccDetails")}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("ccDate")}</label>
              <input type="date" style={S.input} value={form.complaintDate} onChange={(e) => setField("complaintDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("ccNumber")}</label>
              <input style={S.input} value={form.complaintNumber} onChange={(e) => setField("complaintNumber", e.target.value)} placeholder={t("ccNumberPh")} />
            </div>
            <div>
              <label style={S.label}>{t("ccChannel")}</label>
              <input style={S.input} value={form.channel} onChange={(e) => setField("channel", e.target.value)} placeholder={t("ccChannelPh")} />
            </div>
          </div>
          <label style={S.label}>{t("ccComplainant")}</label>
          <input style={S.input} value={form.complainant} onChange={(e) => setField("complainant", e.target.value)} placeholder={t("ccComplainantPh")} />

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("ccProduct")}</label>
              <input style={S.input} value={form.product} onChange={(e) => setField("product", e.target.value)} placeholder={t("ccProductPh")} />
            </div>
            <div>
              <label style={S.label}>{t("ccBatch")}</label>
              <input style={S.input} value={form.batch} onChange={(e) => setField("batch", e.target.value)} placeholder={t("ccBatchPh")} />
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("ccType")}</label>
              <select style={S.select} value={form.type} onChange={(e) => setField("type", e.target.value)}>
                <option value="BPC">{t("ccTypeBPC")}</option>
                <option value="Foreign">{t("ccTypeForeign")}</option>
                <option value="Allergen">{t("ccTypeAllergen")}</option>
                <option value="Quality">{t("ccTypeQuality")}</option>
                <option value="Packaging">{t("ccTypePackaging")}</option>
                <option value="Service">{t("ccTypeService")}</option>
                <option value="Other">{t("ccTypeOther")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("ccSeverity")}</label>
              <select style={S.select} value={form.severity} onChange={(e) => setField("severity", e.target.value)}>
                <option value="Low">{t("ccSeverityLow")}</option>
                <option value="Medium">{t("ccSeverityMed")}</option>
                <option value="High">{t("ccSeverityHigh")}</option>
                <option value="Critical">{t("ccSeverityCritical")}</option>
              </select>
            </div>
          </div>

          <label style={S.label}>{t("ccDescription")}</label>
          <textarea style={S.textarea} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder={t("ccDescriptionPh")} />
        </div>

        {/* Attachments */}
        <div style={S.card}>
          <div style={S.sectionTitle}>
            📎 {lang === "ar" ? "المرفقات (صور + PDF)" : "Attachments (Images + PDFs)"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>
            {lang === "ar"
              ? `🖼 الصور تُضغط تلقائياً (الحد الأقصى ${IMG_MAX_DIM}px). 📄 ملفات PDF حتى ${formatBytes(PDF_MAX_BYTES)} لكل ملف.`
              : `🖼 Images auto-compressed (max ${IMG_MAX_DIM}px). 📄 PDFs up to ${formatBytes(PDF_MAX_BYTES)} each.`}
          </div>

          {/* Image upload zone */}
          <div style={S.attachmentDropZone}>
            <span style={{ fontSize: 24 }}>🖼</span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#9a3412" }}>
                {lang === "ar" ? "صور دليلية للشكوى" : "Complaint evidence photos"}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 2 }}>
                {(form.images || []).length} {lang === "ar" ? "صورة محمّلة" : "image(s) attached"}
              </div>
            </div>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPickImages}
              style={{ display: "none" }}
            />
            <button
              type="button"
              style={S.btn("ghost")}
              onClick={() => imgInputRef.current?.click()}
              disabled={busy}
            >
              {processingImages
                ? (lang === "ar" ? "⏳ جاري المعالجة…" : "⏳ Processing…")
                : (lang === "ar" ? "+ إضافة صور" : "+ Add Images")}
            </button>
          </div>

          {(form.images || []).length > 0 && (
            <div style={S.thumbGrid}>
              {form.images.map((img) => (
                <div key={img.id} style={S.thumbBox}>
                  <img src={img.dataUrl} alt={img.name} style={S.thumbImg} />
                  <div style={S.thumbName}>{img.name}</div>
                  <button
                    type="button"
                    aria-label="Remove image"
                    title={lang === "ar" ? "إزالة" : "Remove"}
                    style={S.removeBtn}
                    onClick={() => removeImage(img.id)}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* PDF upload zone */}
          <div style={{ ...S.attachmentDropZone, marginTop: 14 }}>
            <span style={{ fontSize: 24 }}>📄</span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#9a3412" }}>
                {lang === "ar" ? "ملفات PDF (تقارير المختبر، رسائل العميل…)" : "PDF files (lab reports, customer letters…)"}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 2 }}>
                {(form.pdfs || []).length} PDF {lang === "ar" ? "محمّل" : "attached"}
              </div>
            </div>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={onPickPdfs}
              style={{ display: "none" }}
            />
            <button
              type="button"
              style={S.btn("ghost")}
              onClick={() => pdfInputRef.current?.click()}
              disabled={busy}
            >
              {processingPdfs
                ? (lang === "ar" ? "⏳ جاري المعالجة…" : "⏳ Processing…")
                : (lang === "ar" ? "+ إضافة PDF" : "+ Add PDFs")}
            </button>
          </div>

          {(form.pdfs || []).length > 0 && (
            <div style={{ marginTop: 6 }}>
              {form.pdfs.map((pdf) => (
                <div key={pdf.id} style={S.pdfCard}>
                  <span style={{ fontSize: 22 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#9a3412", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {pdf.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                      {formatBytes(pdf.size)}
                    </div>
                  </div>
                  <a
                    href={pdf.dataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...S.btn("secondary"), padding: "5px 12px", fontSize: 11, textDecoration: "none" }}
                  >
                    {lang === "ar" ? "👁 عرض" : "👁 Preview"}
                  </a>
                  <button
                    type="button"
                    style={{ ...S.btn("danger"), padding: "5px 12px", fontSize: 11 }}
                    onClick={() => removePdf(pdf.id)}
                  >
                    {lang === "ar" ? "حذف" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{lang === "ar" ? "التحقيق وتحليل السبب الجذري" : "Investigation & Root Cause"}</div>

          <label style={S.label}>{t("ccInvestigation")}</label>
          <textarea style={S.textarea} value={form.investigation} onChange={(e) => setField("investigation", e.target.value)} placeholder={t("ccInvestigationPh")} />

          <label style={S.label}>{t("ccRootCause")}</label>
          <textarea style={S.textarea} value={form.rootCause} onChange={(e) => setField("rootCause", e.target.value)} placeholder={t("ccRootCausePh")} />

          <label style={S.label}>{t("ccCAPA")}</label>
          <textarea style={S.textarea} value={form.capa} onChange={(e) => setField("capa", e.target.value)} placeholder={t("ccCAPAPh")} />
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{lang === "ar" ? "الإغلاق" : "Closure"}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("ccStatus")}</label>
              <select style={S.select} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="Open">{t("ccStatusOpen")}</option>
                <option value="Investigation">{t("ccStatusInvestigation")}</option>
                <option value="Closed">{t("ccStatusClosed")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("ccClosureDate")}</label>
              <input type="date" style={S.input} value={form.closureDate} onChange={(e) => setField("closureDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("ccClosedBy")}</label>
              <input style={S.input} value={form.closedBy} onChange={(e) => setField("closedBy", e.target.value)} placeholder="QA Lead" />
            </div>
          </div>
          <label style={S.label}>{t("ccCustomerSatisfied")}</label>
          <select style={S.select} value={form.customerSatisfied} onChange={(e) => setField("customerSatisfied", e.target.value)}>
            <option value="Pending">{t("ccCustomerSatisfiedPending")}</option>
            <option value="Yes">{t("ccCustomerSatisfiedYes")}</option>
            <option value="No">{t("ccCustomerSatisfiedNo")}</option>
          </select>
        </div>

        {/* Effectiveness Verification — required to close per ISO 22000 §10.1.2 */}
        <div style={{ ...S.card, border: "2px solid #f97316", background: "linear-gradient(180deg, #fffbeb, #fff)" }}>
          <div style={{ ...S.sectionTitle, color: "#c2410c" }}>
            ✅ {lang === "ar" ? "التحقق من فعالية الإجراء التصحيحي (CAPA Effectiveness)" : "CAPA Effectiveness Verification"}
          </div>
          <div style={{ fontSize: 12, color: "#7c2d12", marginBottom: 10, fontWeight: 700, lineHeight: 1.6 }}>
            {lang === "ar"
              ? "بعد تنفيذ الإجراء التصحيحي، تأكّد إن المشكلة ما تكررتش (مراقبة لمدة كافية، فحص شكاوى مماثلة). إجباري قبل الإغلاق وفق ISO 22000 §10.1.2."
              : "After implementing CAPA, verify the problem did NOT recur (sufficient monitoring period, check for similar complaints). Mandatory before closure per ISO 22000 §10.1.2."}
          </div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{lang === "ar" ? "هل CAPA كان فعّالاً؟" : "Was CAPA effective?"}</label>
              <select style={S.select} value={form.effectivenessVerified} onChange={(e) => setField("effectivenessVerified", e.target.value)}>
                <option value="Pending">{lang === "ar" ? "قيد المراجعة" : "Pending"}</option>
                <option value="Yes">{lang === "ar" ? "نعم — فعّال" : "Yes — Effective"}</option>
                <option value="No">{lang === "ar" ? "لا — تكررت المشكلة" : "No — Recurred"}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{lang === "ar" ? "تاريخ التحقق" : "Verification Date"}</label>
              <input type="date" style={S.input} value={form.effectivenessVerifiedDate} onChange={(e) => setField("effectivenessVerifiedDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{lang === "ar" ? "تم التحقق بواسطة" : "Verified By"}</label>
              <input style={S.input} value={form.effectivenessVerifiedBy} onChange={(e) => setField("effectivenessVerifiedBy", e.target.value)} placeholder="QA Manager" />
            </div>
          </div>
          <label style={S.label}>{lang === "ar" ? "ملاحظات / دليل الفعالية" : "Notes / Effectiveness Evidence"}</label>
          <textarea
            style={S.textarea}
            value={form.effectivenessNotes}
            onChange={(e) => setField("effectivenessNotes", e.target.value)}
            placeholder={lang === "ar"
              ? "مثلاً: تمت مراقبة 30 يوم بدون شكاوى مماثلة؛ تم تحسين عملية المراقبة في الاستلام…"
              : "e.g., Monitored 30 days without similar complaints; receiving inspection process improved…"}
          />
          {form.effectivenessVerified === "No" && (
            <div style={{
              marginTop: 8, padding: "8px 12px", borderRadius: 8,
              background: "#fee2e2", border: "1.5px solid #fca5a5",
              color: "#7f1d1d", fontSize: 12, fontWeight: 800,
            }}>
              {lang === "ar"
                ? "⚠️ CAPA غير فعّال — افتح إجراء تصحيحي جديد أو اتصل بـContinual Improvement Log."
                : "⚠️ CAPA was not effective — open a new corrective action or escalate via Continual Improvement Log."}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>{t("cancel")}</button>
          <button style={S.btn("success")} onClick={save} disabled={busy}>
            {saving ? t("saving") : t("ccSaveBtn")}
          </button>
        </div>
      </div>
    </main>
  );
}
