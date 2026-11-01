// Halal declaration block on a supplier evaluation (SupplierEvaluationResults).
// Print a pre-filled declaration for the supplier, then attach the signed +
// stamped copy and their Halal certificate when they send it back.
import React, { useEffect, useState } from "react";
import { getHalal, halalStatus, halalApplies, printHalalDeclaration, HALAL_STATUS_STYLE } from "./halalDeclaration";

const T = {
  en: {
    title: "Halal Declaration",
    optional: "Optional for this supplier type.",
    received: "Received",
    requested: "Requested — waiting for the signed copy",
    missing: "Not received from supplier",
    requestedOn: "Requested on",
    receivedOn: "Received on",
    fromSubmission: "Found in the supplier's uploaded files",
    print: "🖨 Print declaration form",
    printLang: "Form language",
    signed: "Signed & stamped declaration",
    cert: "Company Halal certificate",
    upload: "⬆ Upload",
    replace: "🔁 Replace",
    remove: "🗑 Remove",
    view: "👁 View",
    uploading: "Uploading...",
    hasCert: "Supplier holds a Halal certificate?",
    yes: "Yes",
    no: "No",
    unknown: "Not stated",
    certNo: "Certificate no.",
    certBody: "Issuing body",
    certExpiry: "Expiry date",
    expired: "Expired",
    notes: "Notes",
    save: "💾 Save",
    saving: "Saving...",
    saved: "Saved ✅",
  },
  ar: {
    title: "إقرار الحلال",
    optional: "اختياري لهذا النوع من الموردين.",
    received: "تم الاستلام",
    requested: "تم الطلب — بانتظار النسخة الموقّعة",
    missing: "لم يصل من المورد",
    requestedOn: "تاريخ الطلب",
    receivedOn: "تاريخ الاستلام",
    fromSubmission: "موجود ضمن الملفات التي رفعها المورد",
    print: "🖨 طباعة نموذج الإقرار",
    printLang: "لغة النموذج",
    signed: "الإقرار الموقّع والمختوم",
    cert: "شهادة الحلال للشركة",
    upload: "⬆ رفع",
    replace: "🔁 استبدال",
    remove: "🗑 حذف",
    view: "👁 عرض",
    uploading: "جاري الرفع...",
    hasCert: "هل لدى المورد شهادة حلال؟",
    yes: "نعم",
    no: "لا",
    unknown: "غير محدد",
    certNo: "رقم الشهادة",
    certBody: "الجهة المانحة",
    certExpiry: "تاريخ الانتهاء",
    expired: "منتهية",
    notes: "ملاحظات",
    save: "💾 حفظ",
    saving: "جاري الحفظ...",
    saved: "تم الحفظ ✅",
  },
};

const fmtDate = (iso, lang) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB");
};

export default function HalalDeclarationPanel({
  lang,
  payload,
  supplierType,
  fields,
  products,
  buyer,
  submissionFiles,
  uploadFile,
  onSave,
  onOpenFile,
  btn,
  input,
}) {
  const t = T[lang] || T.en;
  const halal = getHalal(payload);
  const status = halalStatus(payload, submissionFiles);
  const sc = HALAL_STATUS_STYLE[status];

  const [printLang, setPrintLang] = useState("en");
  const [busy, setBusy] = useState(""); // "declarationFile" | "certificateFile" | "save"
  const [flash, setFlash] = useState("");
  const [draft, setDraft] = useState({});

  const draftKey = JSON.stringify([halal.hasCertificate, halal.certNo, halal.certBody, halal.certExpiry, halal.notes]);
  useEffect(() => {
    setDraft({
      hasCertificate: halal.hasCertificate ?? null,
      certNo: halal.certNo || "",
      certBody: halal.certBody || "",
      certExpiry: halal.certExpiry || "",
      notes: halal.notes || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const save = async (patch, which) => {
    setBusy(which);
    try {
      await onSave({ ...halal, ...patch });
      if (which === "save") {
        setFlash(t.saved);
        setTimeout(() => setFlash(""), 2500);
      }
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setBusy("");
    }
  };

  const handlePrint = () => {
    const ok = printHalalDeclaration({ lang: printLang, buyer, fields, products });
    if (ok && !halal.requestedAt) save({ requestedAt: new Date().toISOString(), requestedLang: printLang }, "print");
  };

  const handleUpload = async (which, file) => {
    if (!file) return;
    setBusy(which);
    try {
      const up = await uploadFile(file);
      const patch = { [which]: { ...up, uploadedAt: new Date().toISOString() } };
      if (which === "declarationFile" && !halal.receivedAt) patch.receivedAt = new Date().toISOString();
      if (which === "certificateFile" && draft.hasCertificate == null) patch.hasCertificate = true;
      await onSave({ ...halal, ...patch });
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setBusy("");
    }
  };

  const fileRow = (which, label) => {
    const f = halal[which];
    const has = !!f?.url;
    const loading = busy === which;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 0", borderTop: "1px dashed rgba(15,23,42,0.12)" }}>
        <div style={{ fontWeight: 950, minWidth: 220 }}>📎 {label}</div>
        {has ? (
          <>
            <button type="button" style={{ ...btn, padding: "6px 10px", fontSize: 13 }} onClick={() => onOpenFile(f)}>
              {t.view} — {f.name || label}
            </button>
            <button type="button" style={{ ...btn, padding: "6px 10px", fontSize: 13 }} disabled={!!busy} onClick={() => save({ [which]: null }, which)}>
              {t.remove}
            </button>
          </>
        ) : null}
        <label style={{ ...btn, padding: "6px 10px", fontSize: 13, opacity: busy ? 0.6 : 1, cursor: busy ? "not-allowed" : "pointer" }}>
          {loading ? t.uploading : has ? t.replace : t.upload}
          <input
            type="file"
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            disabled={!!busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              handleUpload(which, file);
            }}
          />
        </label>
      </div>
    );
  };

  const expired = draft.certExpiry && new Date(draft.certExpiry) < new Date(new Date().toDateString());
  const field = { ...input, padding: "9px 11px", fontSize: 14 };
  const lbl = { fontSize: 13, fontWeight: 950, color: "#64748b", marginBottom: 4 };

  return (
    <div
      style={{
        marginTop: 16,
        padding: "18px 20px",
        borderRadius: 14,
        background: "linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)",
        border: "1px solid rgba(15,118,110,0.28)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ fontWeight: 990, fontSize: 17, color: "#0f766e" }}>📜 {t.title}</div>
        <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 900, background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}` }}>
          {status === "received" ? "✅ " : status === "requested" ? "⏳ " : "❌ "}
          {t[status]}
        </span>
        {halal.requestedAt ? <span style={{ fontSize: 13, color: "#64748b", fontWeight: 850 }}>{t.requestedOn}: {fmtDate(halal.requestedAt, lang)}</span> : null}
        {halal.receivedAt ? <span style={{ fontSize: 13, color: "#64748b", fontWeight: 850 }}>{t.receivedOn}: {fmtDate(halal.receivedAt, lang)}</span> : null}
      </div>
      {!halalApplies(supplierType) ? <div style={{ fontSize: 13, color: "#64748b", fontWeight: 850, marginBottom: 6 }}>{t.optional}</div> : null}

      {Array.isArray(submissionFiles) && submissionFiles.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#166534" }}>{t.fromSubmission}:</span>
          {submissionFiles.map((f, i) => (
            <button key={i} type="button" style={{ ...btn, padding: "6px 10px", fontSize: 13 }} onClick={() => onOpenFile(f)}>
              {t.view} — {f.name || f.filename || "Halal"}
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "6px 0 10px" }}>
        <button type="button" style={{ ...btn, background: "#0f766e", color: "#fff", borderColor: "#0f766e" }} disabled={busy === "print"} onClick={handlePrint}>
          {t.print}
        </button>
        <span style={{ fontSize: 13, fontWeight: 900, color: "#64748b" }}>{t.printLang}:</span>
        {["en", "ar"].map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setPrintLang(l)}
            style={{
              ...btn,
              padding: "6px 10px",
              fontSize: 13,
              background: printLang === l ? "#ccfbf1" : "rgba(255,255,255,0.95)",
              borderColor: printLang === l ? "#0f766e" : "rgba(15,23,42,0.16)",
            }}
          >
            {l === "en" ? "English" : "العربية"}
          </button>
        ))}
      </div>

      {fileRow("declarationFile", t.signed)}
      {fileRow("certificateFile", t.cert)}

      <div style={{ borderTop: "1px dashed rgba(15,23,42,0.12)", paddingTop: 10, marginTop: 2 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontWeight: 950 }}>{t.hasCert}</span>
          {[
            [true, t.yes],
            [false, t.no],
            [null, t.unknown],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, hasCertificate: v }))}
              style={{
                ...btn,
                padding: "6px 12px",
                fontSize: 13,
                background: draft.hasCertificate === v ? "#ccfbf1" : "rgba(255,255,255,0.95)",
                borderColor: draft.hasCertificate === v ? "#0f766e" : "rgba(15,23,42,0.16)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {draft.hasCertificate === true ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={lbl}>{t.certNo}</div>
              <input style={field} value={draft.certNo} onChange={(e) => setDraft((d) => ({ ...d, certNo: e.target.value }))} />
            </div>
            <div>
              <div style={lbl}>{t.certBody}</div>
              <input style={field} value={draft.certBody} onChange={(e) => setDraft((d) => ({ ...d, certBody: e.target.value }))} />
            </div>
            <div>
              <div style={lbl}>
                {t.certExpiry} {expired ? <span style={{ color: "#b91c1c" }}>— {t.expired}</span> : null}
              </div>
              <input type="date" style={field} value={draft.certExpiry} onChange={(e) => setDraft((d) => ({ ...d, certExpiry: e.target.value }))} />
            </div>
          </div>
        ) : null}

        <div style={lbl}>{t.notes}</div>
        <textarea
          style={{ ...field, minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
        />

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
          <button type="button" style={btn} disabled={!!busy} onClick={() => save(draft, "save")}>
            {busy === "save" ? t.saving : t.save}
          </button>
          {flash ? <span style={{ fontWeight: 900, color: "#166534" }}>{flash}</span> : null}
        </div>
      </div>
    </div>
  );
}
