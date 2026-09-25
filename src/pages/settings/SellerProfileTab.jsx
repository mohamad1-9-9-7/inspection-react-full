// src/pages/settings/SellerProfileTab.jsx
// -----------------------------------------------------------------------------
// INSPECT PRO — the business profile of the platform owner (the SELLER).
//
// Everything a customer sees at the top of a quotation or an invoice comes
// from here: name, licence, tax status, contact, where to pay. The right-hand
// column is a live preview of that header, so nothing is filled in blind.
//
// Freelancer-aware on purpose: the licence can be "pending" (nothing printed
// until it is issued), and VAT stays off until there is a 15-digit TRN — in
// which case documents are titled "Invoice", never "Tax Invoice".
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, StatusMessage, ui } from "./_shared/SettingsUIKit";
import { useSettingsLang } from "./_shared/settingsI18n";
import {
  invoiceTitle,
  licenseLine,
  loadSeller,
  saveSeller,
  sellerGaps,
} from "./_shared/sellerProfile";
import { deleteImage, uploadImage } from "../../utils/imageUpload";
import { logSettingsAudit } from "../../utils/settingsAudit";

const TRN_OK = (v) => /^\d{15}$/.test(String(v || "").replace(/\s+/g, ""));
const IBAN_OK = (v) => !v || /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(String(v).replace(/\s+/g, "").toUpperCase());
const groupIban = (v) => String(v || "").replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function SellerProfileTab() {
  const { t, lang, dir } = useSettingsLang();
  const L = useCallback((en, ar) => t({ en, ar }), [t]);

  const [saved, setSaved] = useState(null);   // last value the server confirmed
  const [form, setForm] = useState(null);     // what is on screen
  const [loadErr, setLoadErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoadErr("");
    try {
      const s = await loadSeller();
      setSaved(s);
      setForm(s);
    } catch (e) {
      setLoadErr(e.message || "Load failed");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const dirty = useMemo(() => !!(form && saved) && JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const gaps = useMemo(() => sellerGaps(form), [form]);

  /* Problems that would make the server refuse — shown on the field, and
     they hold the Save button, so a save never "fails" after the fact. */
  const fieldErrors = useMemo(() => {
    if (!form) return {};
    const e = {};
    if (!form.name.trim()) e.name = L("Required", "مطلوب");
    if (form.vatRegistered && !TRN_OK(form.trn)) e.trn = L("15 digits", "15 رقم");
    if (!IBAN_OK(form.iban)) e.iban = L("Not a valid IBAN", "IBAN غير صحيح");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = L("Not a valid e-mail", "إيميل غير صحيح");
    return e;
  }, [form, L]);
  const blocked = Object.keys(fieldErrors).length > 0;

  /* Leaving with unsaved edits loses them — say so. */
  useEffect(() => {
    if (!dirty) return undefined;
    const onLeave = (ev) => { ev.preventDefault(); ev.returnValue = ""; };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  async function onSave() {
    if (!form || blocked) return;
    setSaving(true);
    setMsg(null);
    try {
      const clean = { ...form, trn: form.trn.replace(/\s+/g, ""), iban: form.iban.replace(/\s+/g, "").toUpperCase() };
      const next = await saveSeller(clean, lang);
      // The previous logo is no longer referenced by anything — drop the file.
      if (saved?.logoUrl && saved.logoUrl !== next.logoUrl) deleteImage(saved.logoUrl).catch(() => {});
      await logSettingsAudit({
        area: "seller_profile",
        action: "update_seller_profile",
        target: next.name,
        before: saved,
        after: next,
        reason: "INSPECT PRO profile updated",
      });
      setSaved(next);
      setForm(next);
      setMsg({ kind: "ok", text: L("Saved. New quotations and invoices use these details.", "تم الحفظ. العروض والفواتير الجديدة رح تستعمل هالبيانات.") });
    } catch (e) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function onPickLogo(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { setMsg({ kind: "err", text: L("Please choose an image.", "اختار صورة.") }); return; }
    setUploading(true);
    setMsg(null);
    try {
      const url = await uploadImage(file, "seller_logo");
      // A logo uploaded but never saved would be orphaned — drop the unsaved one.
      if (form.logoUrl && form.logoUrl !== saved?.logoUrl) deleteImage(form.logoUrl).catch(() => {});
      set({ logoUrl: url });
    } catch (e) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setUploading(false);
    }
  }

  if (loadErr) {
    return (
      <div style={ui.page} dir={dir}>
        <StatusMessage message={{ kind: "err", text: `${L("Could not load the profile", "تعذّر تحميل الملف")}: ${loadErr}` }} />
        <Button onClick={load}>{L("Try again", "إعادة المحاولة")}</Button>
      </div>
    );
  }
  if (!form) return <div style={{ ...ui.card, textAlign: "center", color: "#475569" }}>{L("Loading…", "جاري التحميل…")}</div>;

  return (
    <div style={ui.page} dir={dir}>
      <style>{CSS}</style>

      {/* Header + the one action */}
      <div style={sx.head}>
        <div>
          <p style={ui.eyebrow}>{L("Platform owner", "مالك المنصّة")}</p>
          <h2 className="bpx-xl" style={{ ...ui.title }}>{L("Business profile", "هوية INSPECT PRO")}</h2>
          <p className="bpx-sm" style={ui.subtitle}>
            {L(
              "Who you are on every quotation and invoice. Fill it once — every new document picks it up.",
              "هاي بياناتك اللي بتطلع على كل عرض سعر وكل فاتورة. بتعبّيها مرة وحدة، وكل مستند جديد بياخدها لحاله."
            )}
          </p>
        </div>
        <div style={sx.saveBox}>
          {dirty && <span className="bpx-xs" style={sx.dirtyPill}>● {L("Unsaved changes", "تعديلات غير محفوظة")}</span>}
          {dirty && <Button tone="muted" onClick={() => setForm(saved)} disabled={saving}>{L("Discard", "تراجع")}</Button>}
          <Button tone="primary" onClick={onSave} disabled={!dirty || saving || blocked || uploading}>
            {saving ? L("Saving…", "جاري الحفظ…") : `💾 ${L("Save", "حفظ")}`}
          </Button>
        </div>
      </div>

      <StatusMessage message={msg} />

      <div className="spt-grid">
        {/* ═════════ Form ═════════ */}
        <div style={{ minWidth: 0 }}>
          <Section n="1" title={L("Identity", "الهوية")} hint={L("The name customers know you by, and the person behind it.", "الاسم اللي بيعرفك فيه العميل، والشخص المسؤول.")}>
            <div className="spt-2">
              <Field label={L("Business name", "الاسم التجاري")} error={fieldErrors.name}>
                <input style={inp(fieldErrors.name)} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="INSPECT PRO" />
              </Field>
              <Field label={L("Owner (legal name)", "اسم المالك (الاسم القانوني)")} hint={L("As on your freelance permit.", "متل ما هو على تصريح الفري لانس.")}>
                <input style={inp()} value={form.ownerName} onChange={(e) => set({ ownerName: e.target.value })} />
              </Field>
            </div>
            <Field label={L("Logo", "الشعار")} style={{ marginTop: 14 }}>
              <div style={sx.logoRow}>
                <div style={sx.logoBox}>
                  {form.logoUrl ? <img src={form.logoUrl} alt="" style={sx.logoImg} /> : <span style={sx.logoInitials}>{initials(form.name)}</span>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; onPickLogo(f); }} />
                <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? L("Uploading…", "جاري الرفع…") : form.logoUrl ? `⬆ ${L("Change", "تغيير")}` : `⬆ ${L("Upload", "رفع")}`}
                </Button>
                {form.logoUrl && <Button tone="muted" onClick={() => set({ logoUrl: "" })}>{L("Remove", "حذف")}</Button>}
                <span className="bpx-xs" style={sx.muted}>{L("Square PNG/JPG works best. Without one, your initials are used.", "الأفضل صورة مربّعة. بدون شعار بتطلع أول حروف الاسم.")}</span>
              </div>
            </Field>
          </Section>

          <Section n="2" title={L("Licence", "الرخصة")} hint={L("Nothing about a licence is printed until it is issued.", "ما بينطبع شي عن الرخصة لحد ما تصدر.")}>
            <Segmented
              value={form.licenseStatus}
              onChange={(v) => set({ licenseStatus: v })}
              options={[
                { id: "pending", label: `⏳ ${L("Being issued", "قيد الإصدار")}` },
                { id: "issued", label: `✅ ${L("Issued", "صادرة")}` },
              ]}
            />
            {form.licenseStatus === "pending" ? (
              <Note tone="info">
                {L(
                  "Fine to start with. Quotations and invoices are issued in the owner's name without a licence line. Switch to “Issued” the day you get it.",
                  "عادي تبلّش هيك. العروض والفواتير بتطلع باسم المالك وبدون سطر رخصة. أول ما تستلمها حوّلها لـ«صادرة»."
                )}
              </Note>
            ) : (
              <div className="spt-3" style={{ marginTop: 14 }}>
                <Field label={L("Licence / permit No.", "رقم الرخصة / التصريح")}>
                  <input style={inp()} value={form.licenseNo} onChange={(e) => set({ licenseNo: e.target.value })} />
                </Field>
                <Field label={L("Issued by", "جهة الإصدار")} hint={L("e.g. the free zone or authority", "مثلاً المنطقة الحرة أو الدائرة")}>
                  <input style={inp()} value={form.licenseAuthority} onChange={(e) => set({ licenseAuthority: e.target.value })} />
                </Field>
                <Field label={L("Expires", "تاريخ الانتهاء")}>
                  <input type="date" style={inp()} value={form.licenseExpiry} onChange={(e) => set({ licenseExpiry: e.target.value })} />
                </Field>
              </div>
            )}
          </Section>

          <Section n="3" title={L("Tax (VAT)", "الضريبة (VAT)")} hint={L("Only a VAT-registered business may charge VAT.", "بس المسجّل بالضريبة بيحقّله يحسب VAT.")}>
            <Segmented
              value={form.vatRegistered ? "yes" : "no"}
              onChange={(v) => set({ vatRegistered: v === "yes" })}
              options={[
                { id: "no", label: L("Not registered", "غير مسجّل") },
                { id: "yes", label: L("VAT registered", "مسجّل بالضريبة") },
              ]}
            />
            {form.vatRegistered ? (
              <Field label="TRN" error={fieldErrors.trn} hint={L("Tax Registration Number, 15 digits.", "الرقم الضريبي، 15 رقم.")} style={{ marginTop: 14, maxWidth: 420 }}>
                <input style={inp(fieldErrors.trn)} inputMode="numeric" value={form.trn} onChange={(e) => set({ trn: e.target.value.replace(/[^\d\s]/g, "") })} placeholder="100xxxxxxxxxxx3" />
              </Field>
            ) : (
              <Note tone="ok">
                {L(
                  "VAT is 0 % on every document and the title is “Invoice”, not “Tax Invoice”. Registration becomes mandatory once your taxable sales pass AED 375,000 in 12 months.",
                  "الضريبة 0٪ على كل المستندات والعنوان «Invoice» مش «Tax Invoice». التسجيل بيصير إلزامي لما مبيعاتك تتجاوز 375,000 درهم خلال 12 شهر."
                )}
              </Note>
            )}
          </Section>

          <Section n="4" title={L("Contact", "التواصل")} hint={L("How a customer reaches you about a document.", "كيف العميل بيتواصل معك بخصوص أي مستند.")}>
            <div className="spt-3">
              <Field label={L("E-mail", "الإيميل")} error={fieldErrors.email}>
                <input type="email" style={inp(fieldErrors.email)} value={form.email} onChange={(e) => set({ email: e.target.value })} />
              </Field>
              <Field label={L("Phone", "الهاتف")}>
                <input style={inp()} value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+971 5x xxx xxxx" />
              </Field>
              <Field label={L("Website", "الموقع")}>
                <input style={inp()} value={form.website} onChange={(e) => set({ website: e.target.value })} />
              </Field>
            </div>
            <Field label={L("Address", "العنوان")} style={{ marginTop: 14 }}>
              <input style={inp()} value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder={L("City, Emirate, UAE", "المدينة، الإمارة، الإمارات")} />
            </Field>
          </Section>

          <Section n="5" title={L("Getting paid", "استلام الدفعات")} hint={L("Printed on every invoice so the customer knows where to transfer.", "بينطبع على كل فاتورة حتى يعرف العميل وين يحوّل.")}>
            <div className="spt-2">
              <Field label={L("Bank", "البنك")}>
                <input style={inp()} value={form.bankName} onChange={(e) => set({ bankName: e.target.value })} />
              </Field>
              <Field label={L("Account name", "اسم صاحب الحساب")}>
                <input style={inp()} value={form.accountName} onChange={(e) => set({ accountName: e.target.value })} placeholder={form.ownerName || ""} />
              </Field>
              <Field label="IBAN" error={fieldErrors.iban}>
                <input style={{ ...inp(fieldErrors.iban), fontFamily: "ui-monospace, Consolas, monospace", letterSpacing: ".04em" }}
                  value={groupIban(form.iban)} onChange={(e) => set({ iban: e.target.value.replace(/\s+/g, "").toUpperCase() })} placeholder="AE07 0331 2345 6789 0123 456" />
              </Field>
              <Field label="SWIFT / BIC" hint={L("Only needed for payments from abroad.", "بس للتحويلات من برّا الدولة.")}>
                <input style={inp()} value={form.swift} onChange={(e) => set({ swift: e.target.value.toUpperCase() })} />
              </Field>
            </div>
            <Field label={L("Payment due (days after the invoice)", "مهلة الدفع (أيام بعد الفاتورة)")} style={{ marginTop: 14, maxWidth: 320 }}>
              <input type="number" min="0" max="365" style={inp()} value={form.paymentTermsDays}
                onChange={(e) => set({ paymentTermsDays: Math.min(Math.max(parseInt(e.target.value, 10) || 0, 0), 365) })} />
            </Field>
          </Section>
        </div>

        {/* ═════════ Live preview + readiness ═════════ */}
        <aside className="spt-aside">
          <div style={sx.previewLabel} className="bpx-xs">{L("Live preview — top of an invoice", "معاينة مباشرة — رأس الفاتورة")}</div>
          <DocPreview seller={form} />

          <div style={{ ...ui.card, marginTop: 14 }}>
            <div className="bpx-sm" style={{ fontWeight: 1000, marginBottom: 10 }}>
              {gaps.length ? `🧩 ${L("Still missing", "لسا ناقص")} (${gaps.length})` : `✅ ${L("Ready to issue documents", "جاهز لإصدار المستندات")}`}
            </div>
            {gaps.length ? (
              <ul style={sx.gapList}>
                {gaps.map((g) => <li key={g.key} className="bpx-sm">{lang === "ar" ? g.ar : g.en}</li>)}
              </ul>
            ) : (
              <div className="bpx-sm" style={sx.muted}>{L("Everything a customer needs is on the document.", "كل شي بيحتاجه العميل موجود على المستند.")}</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* What a customer will actually see. English, like the documents it mirrors. */
function DocPreview({ seller: s }) {
  const lic = licenseLine(s);
  const contact = [s.email, s.phone, s.website].filter(Boolean).join("  ·  ");
  return (
    <div style={pv.paper} dir="ltr">
      <div style={pv.top}>
        <div style={pv.brand}>
          <div style={pv.logo}>{s.logoUrl ? <img src={s.logoUrl} alt="" style={pv.logoImg} /> : <span>{initials(s.name)}</span>}</div>
          <div style={{ minWidth: 0 }}>
            <div className="bpx-lg" style={pv.name}>{s.name || "—"}</div>
            {s.ownerName && <div className="bpx-xs" style={pv.line}>{s.ownerName}</div>}
            {lic && <div className="bpx-xs" style={pv.line}>{lic}</div>}
            {s.vatRegistered && s.trn && <div className="bpx-xs" style={pv.line}>TRN {s.trn.replace(/\s+/g, "")}</div>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="bpx-lg" style={pv.title}>{invoiceTitle(s).toUpperCase()}</div>
          <div className="bpx-xs" style={pv.line}>No. INV-2026-0001</div>
        </div>
      </div>
      {(s.address || contact) && (
        <div className="bpx-xs" style={pv.contact}>{[s.address, contact].filter(Boolean).join("  ·  ")}</div>
      )}
      <div style={pv.rule} />
      <div style={pv.row}><span className="bpx-xs">VAT</span><b className="bpx-xs">{s.vatRegistered ? "5 %" : "0 % — not VAT registered"}</b></div>
      <div style={pv.row}><span className="bpx-xs">Payment due</span><b className="bpx-xs">{s.paymentTermsDays ? `within ${s.paymentTermsDays} days` : "on receipt"}</b></div>
      <div style={pv.bank}>
        <div className="bpx-xs" style={{ fontWeight: 900, marginBottom: 4 }}>Pay to</div>
        {s.iban ? (
          <div className="bpx-xs" style={{ lineHeight: 1.55 }}>
            {s.accountName || s.ownerName || s.name}<br />
            {s.bankName && <>{s.bankName}<br /></>}
            <span style={{ fontFamily: "ui-monospace, Consolas, monospace" }}>IBAN {groupIban(s.iban)}</span>
            {s.swift && <><br />SWIFT {s.swift}</>}
          </div>
        ) : (
          <div className="bpx-xs" style={{ color: "#b45309" }}>— add an IBAN —</div>
        )}
      </div>
    </div>
  );
}

function Section({ n, title, hint, children }) {
  return (
    <section style={{ ...ui.card, padding: "18px 20px" }}>
      <div style={sx.secHead}>
        <span style={sx.secNum}>{n}</span>
        <div style={{ minWidth: 0 }}>
          <div className="bpx-lg" style={{ fontWeight: 1000 }}>{title}</div>
          {hint && <div className="bpx-xs" style={sx.muted}>{hint}</div>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, error, style, children }) {
  return (
    <label style={{ display: "block", minWidth: 0, ...style }}>
      <span className="bpx-xs" style={sx.label}>{label}</span>
      {children}
      {(error || hint) && <span className="bpx-xs" style={{ display: "block", marginTop: 5, color: error ? "#b91c1c" : "#64748b", fontWeight: error ? 900 : 700 }}>{error || hint}</span>}
    </label>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div style={sx.seg} role="radiogroup">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} style={sx.segBtn(value === o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Note({ tone, children }) {
  const c = tone === "ok" ? { bg: "#f0fdf4", bd: "#bbf7d0", fg: "#166534" } : { bg: "#eff6ff", bd: "#bfdbfe", fg: "#1e40af" };
  return <div className="bpx-sm" style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: c.bg, border: `1px solid ${c.bd}`, color: c.fg, lineHeight: 1.6 }}>{children}</div>;
}

const inp = (err) => ({ ...ui.input, minHeight: 48, borderColor: err ? "#f87171" : "rgba(15,23,42,0.16)" });

const CSS = `
#root .bpx.bpx .spt-grid{ display:grid; grid-template-columns:minmax(0,1fr) 440px; gap:18px; align-items:start; }
#root .bpx.bpx .spt-aside{ position:sticky; top:14px; }
#root .bpx.bpx .spt-2{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
#root .bpx.bpx .spt-3{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
@media (max-width: 1180px){
  #root .bpx.bpx .spt-grid{ grid-template-columns:1fr; }
  #root .bpx.bpx .spt-aside{ position:static; }
}
@media (max-width: 720px){
  #root .bpx.bpx .spt-2, #root .bpx.bpx .spt-3{ grid-template-columns:1fr; }
}
`;

const sx = {
  head: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 },
  saveBox: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  dirtyPill: { padding: "6px 12px", borderRadius: 999, background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", fontWeight: 900 },
  secHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  secNum: { width: 34, height: 34, flexShrink: 0, borderRadius: 10, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", fontWeight: 1000 },
  label: { display: "block", marginBottom: 6, color: "#334155", fontWeight: 900 },
  muted: { color: "#64748b", fontWeight: 700 },
  logoRow: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  logoBox: { width: 72, height: 72, borderRadius: 14, border: "1px dashed #cbd5e1", display: "grid", placeItems: "center", overflow: "hidden", background: "#fff", flexShrink: 0 },
  logoImg: { maxWidth: 64, maxHeight: 64, objectFit: "contain" },
  logoInitials: { fontWeight: 1000, color: "#0f766e" },
  seg: { display: "inline-flex", padding: 4, gap: 4, borderRadius: 12, background: "#f1f5f9", border: "1px solid #e2e8f0", flexWrap: "wrap" },
  segBtn: (on) => ({
    minHeight: 42, padding: "0 18px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 900,
    background: on ? "#0f766e" : "transparent", color: on ? "#fff" : "#475569", boxShadow: on ? "0 4px 12px rgba(15,118,110,.25)" : "none",
  }),
  previewLabel: { color: "#64748b", fontWeight: 900, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" },
  gapList: { margin: 0, paddingInlineStart: 20, color: "#92400e", fontWeight: 800, lineHeight: 1.8 },
};

const pv = {
  paper: { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 18px 40px rgba(15,23,42,.10)", padding: "20px 20px 18px", color: "#0f172a" },
  top: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  brand: { display: "flex", gap: 12, alignItems: "center", minWidth: 0 },
  logo: { width: 52, height: 52, borderRadius: 12, background: "#f0fdfa", border: "1px solid #ccfbf1", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0, fontWeight: 1000, color: "#0f766e" },
  logoImg: { maxWidth: 46, maxHeight: 46, objectFit: "contain" },
  name: { fontWeight: 1000, lineHeight: 1.2, overflowWrap: "anywhere" },
  title: { fontWeight: 1000, color: "#0f766e", letterSpacing: ".04em" },
  line: { color: "#475569", fontWeight: 700 },
  contact: { marginTop: 12, color: "#475569", fontWeight: 700, overflowWrap: "anywhere" },
  rule: { height: 1, background: "#e2e8f0", margin: "14px 0 10px" },
  row: { display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0", color: "#334155" },
  bank: { marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155" },
};
