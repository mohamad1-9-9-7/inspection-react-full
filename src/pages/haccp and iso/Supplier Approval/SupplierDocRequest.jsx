// "Request documents" on a supplier evaluation.
//
// 1. Lists what is still missing — signed declaration, Halal declaration,
//    Halal certificate and the questionnaire's own attachment fields — ticked
//    by default when the document is required and absent.
// 2. Creates an upload link (payload.docRequest, served publicly by
//    routes/supplierDocs.cjs → /supplier-approval/docs/:token).
// 3. Opens the shared e-mail composer with the "missing documents (upload
//    link)" cliché; when the Halal declaration is requested, the pre-filled
//    form travels as a PDF attachment to sign and stamp.
import React, { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import EmailSendModal from "../../shared/EmailSendModal";
import { buildPublicUrl } from "../../../config/publicOrigin";
import { makeSupplierEmailConfig } from "./supplierEmailConfig";
import { attachmentFieldsForSupplierType, readFieldAttachments } from "./supplierAttachmentFields";
import { halalApplies, getHalal, halalDeclarationPdf } from "./halalDeclaration";

const T = {
  en: {
    title: "Request missing documents",
    sub: "Ticked items are listed in the e-mail and on the supplier's upload page.",
    signed: "Signed & stamped self-assessment declaration",
    halalDecl: "Halal declaration — signed & stamped (form attached)",
    halalCert: "Company Halal certificate (if available)",
    have: "received",
    expires: "Link valid for",
    days: "days",
    create: "Create link & compose e-mail",
    creating: "Creating...",
    preparing: "Preparing the Halal form PDF...",
    linkReady: "Upload link",
    copy: "📋 Copy link",
    copied: "Copied ✅",
    compose: "✉️ Compose e-mail",
    close: "Close",
    nothing: "Tick at least one document.",
    existing: "An upload link already exists — creating a new one replaces it.",
  },
  ar: {
    title: "طلب المستندات الناقصة",
    sub: "البنود المحددة تظهر في الإيميل وفي صفحة الرفع عند المورد.",
    signed: "إقرار التقييم الذاتي موقّع ومختوم",
    halalDecl: "إقرار الحلال — موقّع ومختوم (النموذج مرفق)",
    halalCert: "شهادة الحلال للشركة (إن وُجدت)",
    have: "مستلم",
    expires: "صلاحية الرابط",
    days: "يوم",
    create: "إنشاء الرابط وتجهيز الإيميل",
    creating: "جاري الإنشاء...",
    preparing: "جاري تجهيز نموذج الحلال PDF...",
    linkReady: "رابط الرفع",
    copy: "📋 نسخ الرابط",
    copied: "تم النسخ ✅",
    compose: "✉️ تجهيز الإيميل",
    close: "إغلاق",
    nothing: "اختر مستنداً واحداً على الأقل.",
    existing: "يوجد رابط رفع سابق — إنشاء رابط جديد يستبدله.",
  },
};

const OPTIONAL = /optional|if available|if any|if applicable|if you deliver|if products contain|اختياري|إن وُجدت|إن انطبق/i;

function newToken() {
  const a = new Uint8Array(16);
  window.crypto.getRandomValues(a);
  return "sdr_" + Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Every document this supplier could be asked for, with what is already on file. */
export function documentChoices(payload, supplierType, declarationState, halalStatusValue) {
  const t = { en: T.en, ar: T.ar };
  const halal = getHalal(payload);
  const fa = readFieldAttachments(payload);
  const out = [
    {
      key: "signed_declaration",
      en: t.en.signed,
      ar: t.ar.signed,
      have: declarationState === "signed",
      required: true,
    },
  ];
  if (halalApplies(supplierType)) {
    out.push(
      { key: "halal_declaration", en: t.en.halalDecl, ar: t.ar.halalDecl, have: halalStatusValue === "received", required: true },
      { key: "halal_certificate", en: t.en.halalCert, ar: t.ar.halalCert, have: !!halal.certificateFile?.url, required: halal.hasCertificate !== false }
    );
  }
  attachmentFieldsForSupplierType(supplierType || "other").forEach((f) => {
    const files = Array.isArray(fa[f.key]) ? fa[f.key].filter(Boolean) : [];
    out.push({ key: f.key, en: f.label, ar: f.labelAr, have: files.length > 0, required: !OPTIONAL.test(f.label) });
  });
  return out;
}

export default function SupplierDocRequest({
  lang,
  payload,
  supplierType,
  declarationState,
  halalStatusValue,
  buyer,
  logoUrl,
  fields,
  products,
  userName,
  onSaveRequest, // async (docRequest) => void — writes payload.docRequest
  onEmailSent, // (info) => void
  onClose,
  btn,
  input,
}) {
  const t = T[lang] || T.en;
  const choices = useMemo(
    () => documentChoices(payload, supplierType, declarationState, halalStatusValue),
    [payload, supplierType, declarationState, halalStatusValue]
  );
  const [picked, setPicked] = useState(() => Object.fromEntries(choices.map((c) => [c.key, !c.have && c.required])));
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState("");
  const [request, setRequest] = useState(null); // the created docRequest
  const [pdfAttachment, setPdfAttachment] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = request ? buildPublicUrl(`/supplier-approval/docs/${request.token}`) : "";
  const items = choices.filter((c) => picked[c.key]);

  const create = async () => {
    if (!items.length) return alert(t.nothing);
    setBusy("create");
    try {
      const now = new Date();
      const dr = {
        token: newToken(),
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + days * 864e5).toISOString(),
        by: userName || "",
        buyer: buyer || "",
        items: items.map(({ key, en, ar }) => ({ key, en, ar })),
        uploads: {},
      };
      await onSaveRequest(dr);
      setRequest(dr);
      if (dr.items.some((x) => x.key === "halal_declaration")) {
        setBusy("pdf");
        try {
          const blob = await halalDeclarationPdf({ buyer, fields, products, logoUrl });
          const safe = String(fields?.company_name || "Supplier").replace(/[^\w-]+/g, "_").slice(0, 40);
          setPdfAttachment({ url: URL.createObjectURL(blob), name: `Halal_Declaration_${safe}.pdf` });
        } catch (e) {
          // the link still works without the attachment: the form is on the upload page
          console.warn("Halal form PDF failed:", e);
        }
      }
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setBusy("");
    }
  };

  const emailConfig = useMemo(
    () =>
      request
        ? makeSupplierEmailConfig("docsLink", onEmailSent, {
            requestedDocuments: request.items.map((x) => ({ ...x, status: "missing" })),
            upload: { url, expiresAt: request.expiresAt, token: request.token },
            extraAttachment: pdfAttachment,
          })
        : null,
    [request, url, pdfAttachment, onEmailSent]
  );

  const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.55)",
    zIndex: 10000,
    display: "grid",
    placeItems: "center",
    padding: 16,
    direction: lang === "ar" ? "rtl" : "ltr",
  };
  const card = {
    width: "min(640px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: 16,
    padding: "18px 20px",
    boxShadow: "0 24px 60px rgba(2,6,23,0.35)",
  };

  return (
    <div style={overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 990, color: "#0f766e" }} className="ser-h1 ser-h1">
          📤 {t.title}
        </div>
        <div style={{ color: "#64748b", fontWeight: 800, margin: "4px 0 12px" }}>{t.sub}</div>

        {!request ? (
          <>
            {payload?.docRequest?.token ? (
              <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", borderRadius: 10, padding: "8px 12px", fontWeight: 800, marginBottom: 10 }}>
                ⚠ {t.existing}
              </div>
            ) : null}
            <div style={{ display: "grid", gap: 6 }}>
              {choices.map((c) => (
                <label
                  key={c.key}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid " + (picked[c.key] ? "#5eead4" : "rgba(15,23,42,0.12)"),
                    background: picked[c.key] ? "#f0fdfa" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <input type="checkbox" checked={!!picked[c.key]} onChange={(e) => setPicked((p) => ({ ...p, [c.key]: e.target.checked }))} />
                  <span style={{ flex: 1, fontWeight: 850 }}>{lang === "ar" ? c.ar : c.en}</span>
                  {c.have ? <span style={{ color: "#166534", fontWeight: 900 }}>✓ {t.have}</span> : null}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
              <span style={{ fontWeight: 900, color: "#475569" }}>{t.expires}:</span>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ ...input, width: 120, padding: "7px 10px" }}>
                {[7, 14, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>
                    {d} {t.days}
                  </option>
                ))}
              </select>
              <span style={{ flex: 1 }} />
              <button type="button" style={btn} onClick={onClose}>
                {t.close}
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={create}
                style={{ ...btn, background: "#0f766e", color: "#fff", borderColor: "#0f766e", opacity: busy ? 0.7 : 1 }}
              >
                {busy ? t.creating : t.create}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <QRCodeCanvas value={url} size={128} level="M" marginSize={2} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 950, color: "#0f766e" }}>{t.linkReady}</div>
                <div style={{ wordBreak: "break-all", color: "#0369a1", fontWeight: 800, margin: "4px 0 8px" }}>{url}</div>
                <button
                  type="button"
                  style={{ ...btn, padding: "7px 12px" }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      /* clipboard blocked — the link is on screen to select */
                    }
                  }}
                >
                  {copied ? t.copied : t.copy}
                </button>
              </div>
            </div>
            {busy === "pdf" ? <div style={{ color: "#64748b", fontWeight: 800 }}>⏳ {t.preparing}</div> : null}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" style={btn} onClick={onClose}>
                {t.close}
              </button>
              <button
                type="button"
                disabled={busy === "pdf"}
                onClick={() => setComposeOpen(true)}
                style={{ ...btn, background: "#0f766e", color: "#fff", borderColor: "#0f766e" }}
              >
                {t.compose}
              </button>
            </div>
          </div>
        )}
      </div>

      {composeOpen && emailConfig ? (
        <div onClick={(e) => e.stopPropagation()}>
          <EmailSendModal open onClose={() => setComposeOpen(false)} payload={payload} config={emailConfig} />
        </div>
      ) : null}
    </div>
  );
}
