// Public page — /supplier-approval/docs/:token
//
// The supplier opens the link QA sent ("Request documents" on the results
// page) and uploads each listed document. No account: the token is the
// permission, checked by routes/supplierDocs.cjs. Files go to Cloudinary
// through the same public /api/images the questionnaire uses, then the URL is
// handed to POST /api/supplier-docs/:token/upload, which files it straight
// into the evaluation.
import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import { printHalalDeclaration } from "./halalDeclaration";

const T = {
  en: {
    title: "Supplier documents",
    hello: "Documents requested from",
    by: "by",
    intro: "Upload each document below — a clear photo or a PDF. Every file reaches the quality team as soon as it is uploaded.",
    upload: "⬆ Upload",
    more: "⬆ Upload another file",
    uploading: "Uploading...",
    done: "Received",
    pending: "Waiting",
    halalForm: "🖨 Download / print the Halal declaration form",
    halalHint: "Print the form, sign and stamp it, then upload a scan or photo of it here.",
    certNo: "Certificate no.",
    certBody: "Issued by",
    certExpiry: "Expiry date",
    validUntil: "This link is valid until",
    allDone: "Thank you — every requested document has been received.",
    loading: "Loading...",
    LINK_NOT_FOUND: "This link is not valid.",
    LINK_EXPIRED: "This link has expired. Please contact the quality team for a new one.",
    LINK_DISABLED: "This link has been closed by the quality team.",
    error: "Something went wrong. Please try again.",
    tooBig: "The file is larger than 15 MB.",
  },
  ar: {
    title: "مستندات المورد",
    hello: "المستندات المطلوبة من",
    by: "من قِبل",
    intro: "يرجى رفع كل مستند أدناه — صورة واضحة أو ملف PDF. يصل كل ملف لفريق الجودة فور رفعه.",
    upload: "⬆ رفع",
    more: "⬆ رفع ملف آخر",
    uploading: "جاري الرفع...",
    done: "تم الاستلام",
    pending: "بانتظار الرفع",
    halalForm: "🖨 تنزيل / طباعة نموذج إقرار الحلال",
    halalHint: "اطبع النموذج ووقّعه واختمه، ثم ارفع صورة أو نسخة ممسوحة منه هنا.",
    certNo: "رقم الشهادة",
    certBody: "الجهة المانحة",
    certExpiry: "تاريخ الانتهاء",
    validUntil: "هذا الرابط صالح حتى",
    allDone: "شكراً لكم — تم استلام جميع المستندات المطلوبة.",
    loading: "جاري التحميل...",
    LINK_NOT_FOUND: "هذا الرابط غير صالح.",
    LINK_EXPIRED: "انتهت صلاحية هذا الرابط. يرجى التواصل مع فريق الجودة لإرسال رابط جديد.",
    LINK_DISABLED: "تم إغلاق هذا الرابط من قِبل فريق الجودة.",
    error: "حدث خطأ، يرجى المحاولة مرة أخرى.",
    tooBig: "حجم الملف أكبر من 15 ميغابايت.",
  },
};

const MAX_BYTES = 15 * 1024 * 1024;

async function uploadToCloud(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) throw new Error(data?.error || "Upload failed");
  return { url: data.optimized_url || data.url, name: file.name, contentType: file.type || "" };
}

const fmt = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d) ? d.toLocaleDateString("en-GB") : "";
};

export default function SupplierDocsUpload() {
  const { token } = useParams();
  const [lang, setLang] = useState(() => (navigator.language || "").startsWith("ar") ? "ar" : "en");
  const t = T[lang];
  const rtl = lang === "ar";
  const [req, setReq] = useState(null);
  const [err, setErr] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [cert, setCert] = useState({ no: "", body: "", expiry: "" });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/supplier-docs/${encodeURIComponent(token)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) return setErr(json.error || "error");
      setReq(json.request);
    } catch {
      setErr("error");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = t.title;
    document.documentElement.lang = lang;
  }, [lang, t.title]);

  const onFile = async (key, file) => {
    if (!file) return;
    if (file.size > MAX_BYTES) return alert(t.tooBig);
    setBusyKey(key);
    try {
      const up = await uploadToCloud(file);
      const res = await fetch(`${API_BASE}/api/supplier-docs/${encodeURIComponent(token)}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, file: up, ...(key === "halal_certificate" ? { cert } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(T[lang][json.error] || t.error);
      setReq(json.request);
    } catch (e) {
      alert(String(e?.message || t.error));
    } finally {
      setBusyKey("");
    }
  };

  const page = {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f0fdfa 0%, #ffffff 60%)",
    padding: "24px 16px 48px",
    direction: rtl ? "rtl" : "ltr",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
    color: "#0f172a",
  };
  const wrap = { maxWidth: 720, margin: "0 auto" };
  const card = { background: "#fff", border: "1px solid rgba(15,23,42,0.12)", borderRadius: 16, padding: "16px 18px", boxShadow: "0 10px 24px rgba(15,118,110,0.08)" };
  const btn = { padding: "9px 14px", borderRadius: 12, border: "1px solid rgba(15,23,42,0.16)", background: "#fff", fontWeight: 900, cursor: "pointer" };
  const field = { width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(15,23,42,0.18)", boxSizing: "border-box" };

  const header = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ fontWeight: 990, color: "#0f766e" }} className="ser-h1 ser-h1">
        📤 {t.title}
      </div>
      <button type="button" style={btn} onClick={() => setLang(rtl ? "en" : "ar")}>
        {rtl ? "English" : "العربية"}
      </button>
    </div>
  );
  const style = (
    <style>{`
      #root .ser-h1.ser-h1 { font-size: calc(21px * var(--app-fs, 1)) !important; }
      #root .ser-big.ser-big { font-size: calc(17px * var(--app-fs, 1)) !important; }
    `}</style>
  );

  if (err) {
    return (
      <main style={page}>
        {style}
        <div style={wrap}>
          {header}
          <div style={{ ...card, color: "#991b1b", fontWeight: 900 }}>⚠ {t[err] || t.error}</div>
        </div>
      </main>
    );
  }
  if (!req) {
    return (
      <main style={page}>
        {style}
        <div style={wrap}>
          {header}
          <div style={card}>{t.loading}</div>
        </div>
      </main>
    );
  }

  const received = (key) => (req.uploads?.[key] || []).length;
  const allDone = req.items.length > 0 && req.items.every((it) => received(it.key) > 0);
  const buyerIsMawashi = /mawashi|المواشي/i.test(req.buyer || "");

  return (
    <main style={page}>
      {style}
      <div style={wrap}>
        {header}

        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ color: "#64748b", fontWeight: 800 }}>{t.hello}</div>
          <div className="ser-big ser-big" style={{ fontWeight: 990 }}>
            {req.company || "—"}
          </div>
          {req.buyer ? (
            <div style={{ color: "#64748b", fontWeight: 800, marginTop: 2 }}>
              {t.by} {req.buyer}
            </div>
          ) : null}
          <div style={{ marginTop: 10, lineHeight: 1.6 }}>{t.intro}</div>
          {req.expiresAt ? (
            <div style={{ marginTop: 8, color: "#92400e", fontWeight: 900 }}>
              ⏳ {t.validUntil} {fmt(req.expiresAt)}
            </div>
          ) : null}
        </div>

        {allDone ? (
          <div style={{ ...card, background: "#dcfce7", borderColor: "#86efac", color: "#166534", fontWeight: 950, marginBottom: 12 }}>
            ✅ {t.allDone}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          {req.items.map((it, i) => {
            const n = received(it.key);
            const busy = busyKey === it.key;
            return (
              <div key={it.key} style={{ ...card, borderInlineStart: `5px solid ${n ? "#22c55e" : "#f59e0b"}` }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200, fontWeight: 950 }}>
                    {i + 1}. {rtl ? it.ar || it.en : it.en}
                  </div>
                  <span style={{ fontWeight: 900, color: n ? "#166534" : "#92400e" }}>{n ? `✅ ${t.done} (${n})` : `⏳ ${t.pending}`}</span>
                </div>

                {it.key === "halal_declaration" ? (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      style={{ ...btn, background: "#0f766e", color: "#fff", borderColor: "#0f766e" }}
                      onClick={() =>
                        printHalalDeclaration({
                          lang,
                          buyer: req.buyer,
                          fields: req.halalForm,
                          products: req.halalForm?.products || [],
                          logoUrl: buyerIsMawashi ? `${window.location.origin}/mawashi-logo.jpg` : "",
                        })
                      }
                    >
                      {t.halalForm}
                    </button>
                    <div style={{ color: "#64748b", fontWeight: 800, marginTop: 6 }}>{t.halalHint}</div>
                  </div>
                ) : null}

                {it.key === "halal_certificate" && !n ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginTop: 8 }}>
                    <input style={field} placeholder={t.certNo} value={cert.no} onChange={(e) => setCert((c) => ({ ...c, no: e.target.value }))} />
                    <input style={field} placeholder={t.certBody} value={cert.body} onChange={(e) => setCert((c) => ({ ...c, body: e.target.value }))} />
                    <input
                      style={field}
                      type="date"
                      title={t.certExpiry}
                      value={cert.expiry}
                      onChange={(e) => setCert((c) => ({ ...c, expiry: e.target.value }))}
                    />
                  </div>
                ) : null}

                {n ? (
                  <ul style={{ margin: "8px 0 0", paddingInlineStart: 20, color: "#475569" }}>
                    {req.uploads[it.key].map((f, j) => (
                      <li key={j}>
                        📎 {f.name} {f.uploadedAt ? `· ${fmt(f.uploadedAt)}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <label style={{ ...btn, display: "inline-block", marginTop: 10, opacity: busyKey ? 0.6 : 1, cursor: busyKey ? "not-allowed" : "pointer" }}>
                  {busy ? t.uploading : n ? t.more : t.upload}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: "none" }}
                    disabled={!!busyKey}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      onFile(it.key, f);
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
