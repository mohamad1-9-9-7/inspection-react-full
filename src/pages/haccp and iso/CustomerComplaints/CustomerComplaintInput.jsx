// src/pages/haccp and iso/CustomerComplaints/CustomerComplaintInput.jsx
// Customer complaint — log one, or edit one (?edit=<id>).
// ISO 22000:2018 clauses 7.4 (communication) and 9.1.2 (analysis).
// Design: _shared/pageKit.jsx. Lists + helpers: customerComplaintShared.js.
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";
import { uploadImageToServer } from "../../monitor/branches/shipment_recc/qcsRawApi";
import { HaccpPage, Btn, Panel, Field, Note, Pill, useToast } from "../_shared/pageKit";
import { BRANCHES, todayDubai, newId } from "../dmInspectionShared";
import {
  TYPE, TYPES, SEVERITIES, STATUSES, CHANNELS, TYPE_KEY, SEVERITY_KEY, STATUS_KEY, nextComplaintNumber,
} from "./customerComplaintShared";

const PDF_MAX_BYTES = 10 * 1024 * 1024;
const IMG_MAX_DIM = 1600;

const blank = () => ({
  complaintDate: todayDubai(), complaintNumber: "", branch: "", complainant: "", contact: "", channel: "",
  product: "", batch: "", type: "BPC", severity: "Low", description: "",
  investigation: "", rootCause: "", capa: "", capaOwner: "", capaDue: "",
  status: "Open", closureDate: "", closedBy: "", customerSatisfied: "Pending",
  /* Effectiveness verification — required before closure (ISO 22000 §10.1.2 / §9.1.2). */
  effectivenessVerified: "Pending", effectivenessVerifiedDate: "", effectivenessVerifiedBy: "", effectivenessNotes: "",
  images: [], pdfs: [],
});

/* Shrink a photo in the browser before it is uploaded (base64 never enters the record). */
async function compressToFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return file;
    const scale = Math.min(1, IMG_MAX_DIM / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], `${String(file.name || "photo").replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file; // a format the browser cannot draw: the server converts it
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function CustomerComplaintInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { t, lang, toggle } = useHaccpLang();
  const isAr = lang === "ar";
  const L = (ar, en) => (isAr ? ar : en);
  const [toast, say] = useToast();

  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  /* An edited record must be on screen before Save is allowed: saving a form
     that never loaded would overwrite the complaint with empty fields. */
  const [loadState, setLoadState] = useState(editId ? "loading" : "ready"); // loading | ready | missing
  const [numState, setNumState] = useState(editId ? "ok" : "loading");

  const imgRef = useRef(null);
  const pdfRef = useRef(null);
  const busy = saving || !!uploading || numState === "loading";

  /* Edit: GET /api/reports/:id answers { report: row } — the fields are in row.payload. */
  useEffect(() => {
    if (!editId) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const j = await res.json();
        const p = j?.report?.payload || j?.payload || j?.data?.payload;
        if (!p || typeof p !== "object") throw new Error("empty");
        if (!alive) return;
        const withIds = (list) => (Array.isArray(list) ? list : []).map((x) => ({ ...x, id: x.id || newId() }));
        setForm({ ...blank(), ...p, images: withIds(p.images), pdfs: withIds(p.pdfs) });
        setLoadState("ready");
      } catch {
        if (alive) setLoadState("missing");
      }
    })();
    return () => { alive = false; };
  }, [editId]);

  /* New complaint: the next number of the year, after every number already used. */
  useEffect(() => {
    if (editId) return undefined;
    let alive = true;
    const year = todayDubai().slice(0, 4);
    (async () => {
      let number = `CC-${year}-0001`;
      try {
        const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        number = nextComplaintNumber(Array.isArray(json) ? json : json?.data || json?.items || [], year);
      } catch { /* offline: the first number of the year; the register still shows it */ }
      if (alive) {
        setForm((f) => (f.complaintNumber ? f : { ...f, complaintNumber: number }));
        setNumState("ok");
      }
    })();
    return () => { alive = false; };
  }, [editId]);

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      // closing a complaint: today is the closure date unless one was typed
      if (key === "status" && value === "Closed" && !f.closureDate) next.closureDate = todayDubai();
      return next;
    });
    setErrors((p) => (p[key] ? { ...p, [key]: "" } : p));
  };

  async function addImages(e) {
    const picked = Array.from(e.target.files || []).filter((f) => String(f.type || "").startsWith("image/"));
    e.target.value = "";
    if (!picked.length) return;
    setUploading("img");
    try {
      const added = [];
      for (const file of picked) {
        const url = await uploadImageToServer(await compressToFile(file), TYPE);
        added.push({ id: newId(), name: file.name || "photo.jpg", mime: "image/jpeg", url });
      }
      setForm((f) => ({ ...f, images: [...f.images, ...added] }));
    } catch {
      say(L("فشل رفع الصور. حاول بصور أقل أو أصغر.", "Photo upload failed. Try fewer or smaller photos."), "err");
    } finally {
      setUploading("");
    }
  }

  async function addPdfs(e) {
    const picked = Array.from(e.target.files || []).filter(
      (f) => f.type === "application/pdf" || String(f.name || "").toLowerCase().endsWith(".pdf")
    );
    e.target.value = "";
    if (!picked.length) return;
    setUploading("pdf");
    try {
      const added = [];
      for (const file of picked) {
        if (file.size > PDF_MAX_BYTES) {
          say(L(`${file.name} أكبر من 10 ميغابايت وتم تخطّيه.`, `${file.name} is larger than 10 MB and was skipped.`), "err");
          continue;
        }
        const url = await uploadImageToServer(file, TYPE);
        added.push({ id: newId(), name: file.name || "file.pdf", mime: "application/pdf", url, size: file.size || 0 });
      }
      if (added.length) setForm((f) => ({ ...f, pdfs: [...f.pdfs, ...added] }));
    } catch {
      say(L("فشل رفع ملفات PDF.", "PDF upload failed."), "err");
    } finally {
      setUploading("");
    }
  }

  async function save() {
    const need = t("requiredField");
    const bad = {};
    if (!form.complaintDate) bad.complaintDate = need;
    if (!String(form.complainant).trim()) bad.complainant = need;
    if (!String(form.description).trim()) bad.description = need;
    /* A complaint is closed only with evidence that the corrective action
       worked (ISO 22000 §10.1.2 + §9.1.2). */
    if (form.status === "Closed") {
      if (form.effectivenessVerified === "Pending" || !form.effectivenessVerified) {
        bad.effectivenessVerified = L("حدّد نتيجة التحقق قبل الإغلاق.", "Record the verification result before closing.");
      }
      if (!String(form.effectivenessVerifiedBy || "").trim()) bad.effectivenessVerifiedBy = need;
      if (!form.effectivenessVerifiedDate) bad.effectivenessVerifiedDate = need;
      if (form.closureDate && form.complaintDate && form.closureDate < form.complaintDate) {
        bad.closureDate = L("تاريخ الإغلاق قبل تاريخ الشكوى.", "The closure date is before the complaint date.");
      }
    }
    setErrors(bad);
    if (Object.keys(bad).length) {
      say(L("أكمل الحقول المحدّدة بالأحمر.", "Complete the fields marked in red."), "err");
      return;
    }

    const payload = {
      ...form,
      complainant: String(form.complainant).trim(),
      closureDate: form.status === "Closed" ? form.closureDate || todayDubai() : form.closureDate,
      // Cloudinary URLs only — an old record may still carry dataUrl; keep it so editing is not destructive
      images: form.images.map(({ name, mime, url, dataUrl }) => (url ? { name, mime, url } : { name, mime, dataUrl })),
      pdfs: form.pdfs.map(({ name, mime, url, dataUrl, size }) => (url ? { name, mime, url, size } : { name, mime, dataUrl, size })),
      savedAt: Date.now(),
      storage: "cloudinary",
    };
    setSaving(true);
    try {
      // existing record → PUT :id (the generic PUT upserts by type + date and would overwrite another complaint)
      const res = await fetch(editId ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}` : `${API_BASE}/api/reports`, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.closedBy || form.complainant || "admin", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      say(L("تم حفظ الشكوى.", "Complaint saved."), "ok");
      setTimeout(() => navigate("/haccp-iso/customer-complaints/view"), 700);
    } catch (e) {
      say(`${t("saveError")}: ${e?.message || e}`, "err");
      setSaving(false);
    }
  }

  const cls = (key) => `pgk-in${errors[key] ? " bad" : ""}`;
  const toRegister = () => navigate("/haccp-iso/customer-complaints/view");
  const closing = form.status === "Closed";

  return (
    <HaccpPage
      lang={lang}
      icon="📞"
      title={editId ? L("تعديل شكوى عميل", "Edit Customer Complaint") : L("شكوى عميل جديدة", "New Customer Complaint")}
      sub={L("سجّل الشكوى، ثم التحقيق والسبب الجذري والإجراء التصحيحي، وأغلقها بعد التحقق من فاعليته.", "Log the complaint, then the investigation, root cause and corrective action, and close it once the action is verified.")}
      clause={L("البندان 7.4 و9.1.2", "ISO 7.4 · 9.1.2")}
      backTo="/haccp-iso/customer-complaints/view"
      backLabel={L("→ سجل الشكاوى", "← Complaints register")}
      actions={<HaccpLangToggle lang={lang} toggle={toggle} />}
    >
      {toast}

      {loadState === "loading" && <Note>{t("loading")}</Note>}
      {loadState === "missing" && (
        <Note error>
          {L("تعذّر تحميل الشكوى، والحفظ مقفل حتى لا تُمسح بياناتها. أعد فتح الصفحة.", "The complaint could not be loaded, and saving is locked so its data is not wiped. Reopen the page.")}
        </Note>
      )}

      {loadState === "ready" && (
        <>
          <Panel title={`📝 ${t("ccDetails")}`}>
            <div className="pgk-grid">
              <Field label={t("ccNumber")}>
                <input
                  className="pgk-in"
                  value={form.complaintNumber}
                  readOnly
                  placeholder={numState === "loading" ? L("جارٍ التوليد…", "Generating…") : "CC-YYYY-NNNN"}
                  title={L("رقم تلقائي متسلسل — لا يُعدّل", "Sequential number, set automatically")}
                  style={{ background: "#f1f5f9", color: "#475569" }}
                />
              </Field>
              <Field label={L("تاريخ الشكوى", "Complaint date")} required error={errors.complaintDate}>
                <input className={cls("complaintDate")} type="date" max={todayDubai()} value={form.complaintDate} onChange={set("complaintDate")} />
              </Field>
              <Field label={L("الفرع", "Branch")}>
                <input className="pgk-in" list="cc-branches" value={form.branch} onChange={set("branch")} placeholder={L("اختر الفرع أو اكتبه", "Pick or type the branch")} />
                <datalist id="cc-branches">{BRANCHES.map((b) => <option key={b} value={b} />)}</datalist>
              </Field>
              <Field label={t("ccChannel")}>
                <input className="pgk-in" list="cc-channels" value={form.channel} onChange={set("channel")} placeholder={t("ccChannelPh")} />
                <datalist id="cc-channels">{CHANNELS.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label={L("العميل / الجهة", "Customer / party")} required error={errors.complainant}>
                <input className={cls("complainant")} value={form.complainant} onChange={set("complainant")} placeholder={t("ccComplainantPh")} />
              </Field>
              <Field label={L("رقم التواصل", "Contact number")}>
                <input className="pgk-in" inputMode="tel" value={form.contact} onChange={set("contact")} />
              </Field>
              <Field label={t("ccProduct")}>
                <input className="pgk-in" value={form.product} onChange={set("product")} placeholder={t("ccProductPh")} />
              </Field>
              <Field label={t("ccBatch")}>
                <input className="pgk-in" value={form.batch} onChange={set("batch")} placeholder={t("ccBatchPh")} />
              </Field>
              <Field label={t("ccType")}>
                <select className="pgk-in" value={form.type} onChange={set("type")}>
                  {TYPES.map((x) => <option key={x} value={x}>{t(TYPE_KEY[x])}</option>)}
                </select>
              </Field>
              <Field label={t("ccSeverity")}>
                <select className="pgk-in" value={form.severity} onChange={set("severity")}>
                  {SEVERITIES.map((x) => <option key={x} value={x}>{t(SEVERITY_KEY[x])}</option>)}
                </select>
              </Field>
              <Field label={L("وصف الشكوى", "Complaint description")} required error={errors.description} wide>
                <textarea className={cls("description")} value={form.description} onChange={set("description")} placeholder={t("ccDescriptionPh")} />
              </Field>
            </div>
          </Panel>

          <Panel
            title={`📎 ${L("المرفقات", "Attachments")}`}
            hint={L("الصور تُضغط وتُرفع فور إضافتها. حجم ملف PDF حتى 10 ميغابايت.", "Photos are compressed and uploaded as you add them. PDF up to 10 MB each.")}
            actions={
              <>
                <Btn small onClick={() => imgRef.current?.click()} disabled={busy}>{uploading === "img" ? L("جارٍ الرفع…", "Uploading…") : L("+ إضافة صور", "+ Add photos")}</Btn>
                <Btn small onClick={() => pdfRef.current?.click()} disabled={busy}>{uploading === "pdf" ? L("جارٍ الرفع…", "Uploading…") : L("+ إضافة PDF", "+ Add PDFs")}</Btn>
              </>
            }
          >
            <input ref={imgRef} type="file" accept="image/*" multiple onChange={addImages} style={{ display: "none" }} />
            <input ref={pdfRef} type="file" accept="application/pdf,.pdf" multiple onChange={addPdfs} style={{ display: "none" }} />

            {form.images.length === 0 && form.pdfs.length === 0 && (
              <div className="pgk-drop">{L("لا مرفقات بعد — صور المنتج، رسالة العميل، تقرير المختبر…", "Nothing attached yet — product photos, the customer's message, a lab report…")}</div>
            )}

            {form.pdfs.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginBottom: form.images.length ? 12 : 0 }}>
                {form.pdfs.map((p) => (
                  <div key={p.id} className="pgk-file">
                    <span className="pgk-file-ic" aria-hidden="true">PDF</span>
                    <span className="pgk-file-name" title={p.name}>{p.name}{p.size ? ` · ${Math.round(p.size / 1024)} KB` : ""}</span>
                    <a className="pgk-btn sm" href={p.url || p.dataUrl} target="_blank" rel="noreferrer">{L("فتح", "Open")} ↗</a>
                    {/* removing an attachment of the form is not a "delete" permission — no data-delete-action */}
                    <Btn small kind="danger" onClick={() => setForm((f) => ({ ...f, pdfs: f.pdfs.filter((y) => y.id !== p.id) }))}>{L("إزالة", "Remove")}</Btn>
                  </div>
                ))}
              </div>
            )}

            {form.images.length > 0 && (
              <div className="pgk-thumbs">
                {form.images.map((img) => (
                  <div key={img.id} className="pgk-thumb" style={{ cursor: "default" }}>
                    <a href={img.url || img.dataUrl} target="_blank" rel="noreferrer"><img src={img.url || img.dataUrl} alt={img.name} loading="lazy" /></a>
                    <span className="pgk-thumb-cap">
                      <span title={img.name}>{img.name}</span>
                      <Btn small kind="danger" aria-label={L("إزالة", "Remove")} onClick={() => setForm((f) => ({ ...f, images: f.images.filter((y) => y.id !== img.id) }))}>✕</Btn>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`🔎 ${L("التحقيق والسبب الجذري والإجراء التصحيحي", "Investigation, root cause & corrective action")}`}>
            <div className="pgk-grid">
              <Field label={t("ccInvestigation")} wide>
                <textarea className="pgk-in" value={form.investigation} onChange={set("investigation")} placeholder={t("ccInvestigationPh")} />
              </Field>
              <Field label={t("ccRootCause")} wide>
                <textarea className="pgk-in" value={form.rootCause} onChange={set("rootCause")} placeholder={t("ccRootCausePh")} />
              </Field>
              <Field label={t("ccCAPA")} wide>
                <textarea className="pgk-in" value={form.capa} onChange={set("capa")} placeholder={t("ccCAPAPh")} />
              </Field>
              <Field label={L("مسؤول الإجراء", "Action owner")}>
                <input className="pgk-in" value={form.capaOwner} onChange={set("capaOwner")} />
              </Field>
              <Field label={L("تاريخ استحقاق الإجراء", "Action due date")}>
                <input className="pgk-in" type="date" value={form.capaDue} onChange={set("capaDue")} />
              </Field>
            </div>
          </Panel>

          <Panel
            title={`✅ ${L("التحقق من فاعلية الإجراء التصحيحي", "Corrective action effectiveness")}`}
            hint={L("بعد تنفيذ الإجراء، تأكّد أن المشكلة لم تتكرر (فترة مراقبة كافية، لا شكاوى مماثلة). مطلوب قبل الإغلاق.", "After the action, confirm the problem did not recur (long enough monitoring, no similar complaints). Required before closing.")}
            actions={closing ? <Pill tone="amber">{L("مطلوب للإغلاق", "Required to close")}</Pill> : null}
          >
            <div className="pgk-grid">
              <Field label={L("هل كان الإجراء فعّالًا؟", "Was the action effective?")} required={closing} error={errors.effectivenessVerified}>
                <select className={cls("effectivenessVerified")} value={form.effectivenessVerified} onChange={set("effectivenessVerified")}>
                  <option value="Pending">{L("قيد المراجعة", "Pending")}</option>
                  <option value="Yes">{L("نعم — فعّال", "Yes — effective")}</option>
                  <option value="No">{L("لا — تكررت المشكلة", "No — it recurred")}</option>
                </select>
              </Field>
              <Field label={L("تاريخ التحقق", "Verification date")} required={closing} error={errors.effectivenessVerifiedDate}>
                <input className={cls("effectivenessVerifiedDate")} type="date" value={form.effectivenessVerifiedDate} onChange={set("effectivenessVerifiedDate")} />
              </Field>
              <Field label={L("تم التحقق بواسطة", "Verified by")} required={closing} error={errors.effectivenessVerifiedBy}>
                <input className={cls("effectivenessVerifiedBy")} value={form.effectivenessVerifiedBy} onChange={set("effectivenessVerifiedBy")} />
              </Field>
              <Field label={L("ملاحظات / دليل الفاعلية", "Notes / evidence")} wide>
                <textarea
                  className="pgk-in"
                  value={form.effectivenessNotes}
                  onChange={set("effectivenessNotes")}
                  placeholder={L("مثال: مراقبة 30 يومًا بلا شكاوى مماثلة؛ تحسين فحص الاستلام…", "e.g. 30 days monitored without similar complaints; receiving inspection improved…")}
                />
              </Field>
            </div>
            {form.effectivenessVerified === "No" && (
              <Note error>
                {L("الإجراء لم يكن فعّالًا — افتح إجراءً تصحيحيًا جديدًا أو صعّده عبر سجل التحسين المستمر.", "The action was not effective — open a new corrective action or escalate it through the Continual Improvement Log.")}
              </Note>
            )}
          </Panel>

          <Panel title={`🔒 ${L("الحالة والإغلاق", "Status & closure")}`}>
            <div className="pgk-grid">
              <Field label={t("ccStatus")}>
                <select className="pgk-in" value={form.status} onChange={set("status")}>
                  {STATUSES.map((x) => <option key={x} value={x}>{t(STATUS_KEY[x])}</option>)}
                </select>
              </Field>
              <Field label={t("ccClosureDate")} error={errors.closureDate}>
                <input className={cls("closureDate")} type="date" value={form.closureDate} onChange={set("closureDate")} disabled={!closing} />
              </Field>
              <Field label={t("ccClosedBy")}>
                <input className="pgk-in" value={form.closedBy} onChange={set("closedBy")} disabled={!closing} />
              </Field>
              <Field label={t("ccCustomerSatisfied")}>
                <select className="pgk-in" value={form.customerSatisfied} onChange={set("customerSatisfied")}>
                  <option value="Pending">{t("ccCustomerSatisfiedPending")}</option>
                  <option value="Yes">{t("ccCustomerSatisfiedYes")}</option>
                  <option value="No">{t("ccCustomerSatisfiedNo")}</option>
                </select>
              </Field>
            </div>
          </Panel>

          <div className="pgk-actions" style={{ marginTop: 14 }}>
            <Btn onClick={toRegister} disabled={saving}>{t("cancel")}</Btn>
            <Btn kind="ok" onClick={save} disabled={busy}>{saving ? t("saving") : t("ccSaveBtn")}</Btn>
          </div>
        </>
      )}
    </HaccpPage>
  );
}
