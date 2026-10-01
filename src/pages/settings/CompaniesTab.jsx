// src/pages/settings/CompaniesTab.jsx
import React, { useState, useEffect, useMemo } from "react";
import API_BASE from "../../config/api";
import { useSettingsLang } from "./_shared/settingsI18n";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";
import { logSettingsAudit } from "../../utils/settingsAudit";
import { industryOptions } from "../../industries";
import { defaultModuleFor, moduleOptions, MODULES } from "../../companies";
import { companyStatus, currencyOf, daysLeft, priceOf } from "./_shared/companyBilling";
import { deleteImage, uploadImage } from "../../utils/imageUpload";

const emptyForm = {
  name:"", contact_name:"", contact_email:"", contact_phone:"",
  plan_id:"", status:"active", start_date:"", end_date:"", notes:"", industry:"meat", module:"almawashi",
  price:"", currency:"", logo_url:"",
};

/* Server refusals → something the owner can act on. */
const SAVE_ERRORS = {
  name_required:    { en: "Company name is required.", ar: "اسم الشركة مطلوب." },
  end_before_start: { en: "The end date is before the start date.", ar: "تاريخ الانتهاء قبل تاريخ البداية." },
  status_invalid:   { en: "Unknown status.", ar: "حالة غير معروفة." },
  price_invalid:    { en: "The price must be 0 or more.", ar: "السعر لازم يكون 0 أو أكثر." },
  currency_invalid: { en: "Unsupported currency.", ar: "عملة غير مدعومة." },
  plan_not_found:   { en: "That plan no longer exists — pick another.", ar: "الخطة غير موجودة — اختر غيرها." },
  logo_must_be_hosted_url: { en: "Upload the picture with the button — a pasted image cannot be saved.", ar: "ارفع الصورة من الزر — ما بتنحفظ صورة ملصوقة." },
  super_admin_required: { en: "Only the platform owner can change companies.", ar: "مالك المنصّة وحده يعدّل الشركات." },
};

function getUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
}

export default function CompaniesTab() {
  const { t, dir, lang } = useSettingsLang();
  const L = (entry) => (lang === "ar" ? entry.ar : entry.en);
  const STATUS_META = {
    active:    { bg:"#d1fae5", text:"#065f46", label:t("stActive")    },
    trial:     { bg:"#fef3c7", text:"#92400e", label:t("stTrial")     },
    expired:   { bg:"#fee2e2", text:"#991b1b", label:t("stExpired")   },
    suspended: { bg:"#f3f4f6", text:"#6b7280", label:t("stSuspended") },
    disabled:  { bg:"#1f2937", text:"#f9fafb", label:"⛔ " + t("stDisabled") },
  };
  const [companies, setCompanies] = useState([]);
  const [plans,     setPlans]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(null); // null | "new" | company object
  const [form,      setForm]      = useState(emptyForm);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState("");
  const [confirm,   setConfirm]   = useState(null); // null | { company, action: "disable" | "enable" }
  const [deleting,  setDeleting]  = useState(null); // company being deleted (DeleteCompanyModal)
  const [query,     setQuery]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [uploading, setUploading] = useState(false);

  const u = getUser();
  // سوبر أدمن حقيقي بس — أدمن عادي (حتى لو بمستوى الأدمن) ما بيدير شركات
  // الحساب الآخرين. كانت هون بتقبل أي isAdmin، يعني أي أدمن فرع كان يقدر
  // يضيف/يحذف شركات كاملة.
  const isSuperAdmin = !!u.isSuperAdmin;

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        fetch(`${API_BASE}/api/companies`).then(r => r.json()),
        fetch(`${API_BASE}/api/plans`).then(r => r.json()),
      ]);
      if (c.ok) setCompanies(c.companies);
      if (p.ok) setPlans(p.plans.filter(x => x.is_active));
    } catch { }
    setLoading(false);
  }

  function openNew() {
    setForm({ ...emptyForm,
      start_date: new Date().toISOString().substring(0,10),
      end_date:   new Date(Date.now() + 365*86400000).toISOString().substring(0,10),
    });
    setEditing("new"); setMsg("");
  }

  function openEdit(c) {
    setForm({
      name:          c.name,
      contact_name:  c.contact_name  || "",
      contact_email: c.contact_email || "",
      contact_phone: c.contact_phone || "",
      plan_id:       c.plan_id ? String(c.plan_id) : "",
      status:        c.status,
      start_date:    c.start_date?.substring(0,10) || "",
      end_date:      c.end_date?.substring(0,10)   || "",
      notes:         c.notes || "",
      industry:      c.industry || "meat",
      module:        c.module || defaultModuleFor(c.industry || "meat"),
      price:         c.price != null ? String(Number(c.price)) : "",
      currency:      c.currency || "",
      logo_url:      c.logo_url || "",
    });
    setEditing(c); setMsg("");
  }

  /* The card picture goes to Cloudinary, never into the row as base64. */
  async function pickLogo(file) {
    if (!file) return;
    setUploading(true); setMsg("");
    try {
      const url = await uploadImage(file, "company_logo");
      // An uploaded-but-unsaved picture would be orphaned — drop the previous draft.
      const savedLogo = editing && editing !== "new" ? editing.logo_url : "";
      if (form.logo_url && form.logo_url !== savedLogo) deleteImage(form.logo_url).catch(() => {});
      setForm((f) => ({ ...f, logo_url: url }));
    } catch (e) {
      setMsg("❌ " + (e?.message || t("failSave")));
    }
    setUploading(false);
  }

  async function save() {
    if (!form.name.trim()) { setMsg("❌ " + t("companyNameReq")); return; }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setMsg("❌ " + L(SAVE_ERRORS.end_before_start));
      return;
    }
    if (form.price !== "" && !(Number(form.price) >= 0)) {
      setMsg("❌ " + L(SAVE_ERRORS.price_invalid));
      return;
    }
    setSaving(true); setMsg("");
    const body = {
      ...form,
      name: form.name.trim(),
      plan_id: form.plan_id ? parseInt(form.plan_id) : null,
      start_date: form.start_date || null,
      end_date:   form.end_date   || null,
      industry:   form.industry || "meat",
      module:     form.module || defaultModuleFor(form.industry || "meat"),
      // "" = no custom price → the plan's price applies.
      price:      form.price === "" ? null : Number(form.price),
      currency:   form.currency || null,
    };
    try {
      const isNew = editing === "new";
      const url   = isNew ? `${API_BASE}/api/companies` : `${API_BASE}/api/companies/${editing.id}`;
      const r = await fetch(url, { method: isNew ? "POST" : "PUT",
        headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.ok) {
        await logSettingsAudit({
          area: "companies",
          action: isNew ? "create_company" : "update_company",
          target: body.name,
          before: isNew ? null : editing,
          after: d.company || body,
          reason: isNew ? "Company created" : "Company updated",
        });
        // The old picture is no longer referenced by anything — drop the file.
        if (!isNew && editing.logo_url && editing.logo_url !== body.logo_url) deleteImage(editing.logo_url).catch(() => {});
        setEditing(null); setMsg(`✅ "${body.name}" ${t("companySaved")}`);
        load(); setTimeout(() => setMsg(""), 3000);
      } else setMsg("❌ " + (SAVE_ERRORS[d.error] ? L(SAVE_ERRORS[d.error]) : t("failSave")));
    } catch { setMsg("❌ " + t("connError")); }
    setSaving(false);
  }

  /* A company is never deleted — only disabled and re-enabled (the server
     has no delete route). Disabled = nobody but the super-admin gets in. */
  async function setCompanyEnabled(company, action) {
    try {
      const r = await fetch(`${API_BASE}/api/companies/${company.id}/${action}`, { method:"POST" });
      const d = await r.json().catch(() => ({}));
      setConfirm(null);
      if (!r.ok || d.ok === false) {
        setMsg("❌ " + (d.error === "primary_company" ? t("primaryCompany") : t("failToggle")));
        return;
      }
      await logSettingsAudit({
        area: "companies",
        action: action === "disable" ? "disable_company" : "enable_company",
        target: company.name || String(company.id),
        before: company,
        after: { ...company, disabled_at: action === "disable" ? new Date().toISOString() : null },
        reason: action === "disable" ? "Company disabled" : "Company re-enabled",
      });
      setMsg("✅ " + t(action === "disable" ? "companyDisabled" : "companyEnabled")); load();
      setTimeout(() => setMsg(""), 3000);
    } catch { setConfirm(null); setMsg("❌ " + t("failToggle")); }
  }

  const enrichedCompanies = useMemo(() => companies.map((company) => {
    const days = daysLeft(company.end_date);
    const status = companyStatus(company);
    const plan = plans.find((p) =>
      String(p.id || "") === String(company.plan_id || "") ||
      String(p.name || "").toLowerCase() === String(company.plan_name || "").toLowerCase()
    );
    return {
      ...company,
      days,
      status,
      planDisplay: company.plan_name || plan?.name || "",
      planKey: String(company.plan_id || plan?.id || company.plan_name || ""),
      // A custom price on the company wins over its plan's list price.
      customPrice: company.price != null,
      monthlyValue: priceOf(company) || Number(plan?.price || 0),
      currencyShown: company.currency || company.plan_currency || plan?.currency || currencyOf(company),
    };
  }), [companies, plans]);

  const visibleCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrichedCompanies
      .filter((company) => statusFilter === "all" || company.status === statusFilter)
      .filter((company) => planFilter === "all" || company.planKey === planFilter)
      .filter((company) => !q || [
        company.name,
        company.contact_name,
        company.contact_email,
        company.contact_phone,
        company.planDisplay,
      ].join(" ").toLowerCase().includes(q));
  }, [enrichedCompanies, query, statusFilter, planFilter]);

  return (
    <div style={ui.page} dir={dir}>
      <PageHeader
        eyebrow={t("plansEyebrow")}
        title={t("companiesTitle")}
        subtitle={t("companiesSubtitle")}
        actions={
          isSuperAdmin && (
            <Button onClick={openNew} tone="primary">+ {t("newCompany")}</Button>
          )
        }
      />

      <StatusMessage message={msg ? { kind: msg.startsWith("✅") ? "ok" : "err", text: msg } : null} />

      <div style={toolbarStyle}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchCompanies")}
          style={{ ...inputStyle, flex: "1 1 260px", minWidth: 0, fontSize: 16 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 170, fontSize: 16 }}>
          <option value="all">{t("allStatuses")}</option>
          <option value="active">{t("stActive")}</option>
          <option value="trial">{t("stTrial")}</option>
          <option value="expired">{t("stExpired")}</option>
          <option value="disabled">{t("stDisabled")}</option>
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={{ ...inputStyle, width: 190, fontSize: 16 }}>
          <option value="all">{t("allPlans")}</option>
          {plans.map((plan) => <option key={plan.id} value={String(plan.id)}>{plan.name}</option>)}
        </select>
      </div>

      {/* Disable / re-enable confirmation */}
      {deleting && (
        <DeleteCompanyModal
          company={deleting}
          lang={lang}
          onClose={() => setDeleting(null)}
          onDeleted={(name) => {
            setDeleting(null);
            logSettingsAudit({ area: "companies", action: "delete_company", target: name, before: deleting, after: null, reason: "Company deleted with all its data" });
            setMsg("✅ " + (lang === "ar" ? `انحذفت "${name}" مع كل بياناتها.` : `"${name}" was deleted with all its data.`));
            load(); setTimeout(() => setMsg(""), 4000);
          }}
        />
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirm?.action === "enable" ? t("enableCompanyQ") : t("disableCompanyQ")}
        body={confirm?.action === "enable" ? t("enableCompanyD") : t("disableCompanyD")}
        confirmText={confirm?.action === "enable" ? t("enableCompany") : t("disableCompany")}
        cancelText={t("cancel")}
        onConfirm={() => setCompanyEnabled(confirm.company, confirm.action)}
        onCancel={() => setConfirm(null)}
      />

      {/* Edit form */}
      {editing && (
        <div style={ui.subtleCard}>
          <h3 style={{ fontSize:20, fontWeight:700, color:"#1e293b", marginBottom:18 }}>
            {editing === "new" ? t("newCompany") : `${t("edit")} — ${editing.name}`}
          </h3>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap", marginBottom:16 }}>
            <CompanyAvatar name={form.name} logo={form.logo_url} size={72} />
            <div style={{ display:"grid", gap:6 }}>
              <span style={{ fontWeight:800, color:"#475569" }}>
                {lang === "ar" ? "صورة كرت الشركة" : "Company card picture"}
              </span>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <label style={{ display:"inline-flex", alignItems:"center", minHeight:40, padding:"0 16px", borderRadius:8,
                  background:"#0f766e", color:"#fff", fontWeight:900, cursor: uploading ? "wait" : "pointer" }}>
                  {uploading ? (lang === "ar" ? "جاري الرفع…" : "Uploading…")
                    : form.logo_url ? `⬆ ${lang === "ar" ? "تغيير" : "Change"}` : `⬆ ${lang === "ar" ? "رفع صورة" : "Upload picture"}`}
                  <input type="file" accept="image/*" hidden disabled={uploading}
                    onChange={e => { pickLogo(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                {form.logo_url && (
                  <Button tone="muted" onClick={() => setForm(f => ({ ...f, logo_url: "" }))} style={{ minHeight:40 }}>
                    {lang === "ar" ? "حذف الصورة" : "Remove"}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label={`${t("companyName")} *`}>
              <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                placeholder="Acme Foods Ltd." style={inputStyle} />
            </Field>
            <Field label={t("plan")}>
              <select value={form.plan_id} onChange={e => setForm(f=>({...f,plan_id:e.target.value}))} style={inputStyle}>
                <option value="">{t("noPlan")}</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.price > 0 ? `${p.price} ${p.currency}/${t("moShort")}` : t("free")})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("businessType")}>
              {/* What KIND of business it is (keys its permission list). The
                  system it opens is the "System" field next to it. Changing
                  the kind moves the system to that kind's default — unless a
                  system of its own was already picked. */}
              <select value={form.industry} style={inputStyle}
                onChange={e => { const industry = e.target.value; setForm(f => ({
                  ...f, industry,
                  module: !f.module || f.module === defaultModuleFor(f.industry) ? defaultModuleFor(industry) : f.module,
                })); }}>
                {industryOptions().map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </Field>
            <Field label={lang === "ar" ? "النظام (البرمجة الخاصة بالشركة)" : "System (the company's own programmed module)"}>
              {/* Every company runs its own code module (src/companies/<module>/).
                  A starter is the shared kit a new customer opens on until its
                  own module is programmed and added to the registry. */}
              <select value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))} style={inputStyle}>
                {moduleOptions().map(o => (
                  <option key={o.id} value={o.id}>
                    {(lang === "ar" ? o.labelAr : o.label)}{o.industry !== form.industry ? (lang === "ar" ? "  ⚠ نوع نشاط مختلف" : "  ⚠ different kind of business") : ""}
                  </option>
                ))}
                {form.module && !MODULES[form.module] && (
                  <option value={form.module}>{form.module} {lang === "ar" ? "(غير مسجّل بالكود)" : "(not in the code registry)"}</option>
                )}
              </select>
            </Field>
            <Field label={t("contactName")}>
              <input value={form.contact_name} onChange={e => setForm(f=>({...f,contact_name:e.target.value}))}
                placeholder="Ahmad Khalil" style={inputStyle} />
            </Field>
            <Field label={t("contactEmail")}>
              <input type="email" value={form.contact_email} onChange={e => setForm(f=>({...f,contact_email:e.target.value}))}
                placeholder="ahmad@acme.com" style={inputStyle} />
            </Field>
            <Field label={t("contactPhone")}>
              <input value={form.contact_phone} onChange={e => setForm(f=>({...f,contact_phone:e.target.value}))}
                placeholder="+971 50 ..." style={inputStyle} />
            </Field>
            <Field label={t("status")}>
              {/* Expired is worked out from the end date, and switching a
                  company off is the Disable button — so only these two are
                  picked by hand. An old row still holding expired/suspended
                  keeps that value listed until it is changed. */}
              <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))} style={inputStyle}>
                <option value="active">{t("stActive")}</option>
                <option value="trial">{t("stTrial")}</option>
                {form.status === "expired" && <option value="expired">{t("stExpired")}</option>}
                {form.status === "suspended" && <option value="suspended">{t("stSuspended")}</option>}
              </select>
            </Field>
            <Field label={lang === "ar" ? "سعر خاص / شهرياً (اختياري)" : "Custom monthly price (optional)"}>
              {(() => {
                const plan = plans.find(p => String(p.id) === String(form.plan_id));
                return (
                  <div style={{ display:"flex", gap:8 }}>
                    <input type="number" min="0" step="any" value={form.price}
                      onChange={e => setForm(f=>({...f,price:e.target.value}))}
                      placeholder={plan ? `${plan.price} (${lang === "ar" ? "سعر الخطة" : "plan price"})` : "—"}
                      style={{ ...inputStyle, flex:1 }} />
                    <select value={form.currency} onChange={e => setForm(f=>({...f,currency:e.target.value}))} style={{ ...inputStyle, width:110 }}>
                      <option value="">{plan?.currency || "AED"}</option>
                      {["AED","SAR","USD","EUR","GBP"].filter(c => c !== (plan?.currency || "AED")).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                );
              })()}
            </Field>
            <Field label={t("startDate")}>
              <input type="date" value={form.start_date} onChange={e => setForm(f=>({...f,start_date:e.target.value}))} style={inputStyle} />
            </Field>
            <Field label={t("endDate")}>
              <input type="date" value={form.end_date} onChange={e => setForm(f=>({...f,end_date:e.target.value}))} style={inputStyle} />
            </Field>
            <Field label={t("notes")} style={{ gridColumn:"1 / -1" }}>
              <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
                rows={2} placeholder="" style={{ ...inputStyle, resize:"vertical" }} />
            </Field>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:18 }}>
            <Button onClick={save} disabled={saving} tone="primary">
              {saving ? t("saving") : "✅ " + t("saveCompany")}
            </Button>
            <Button onClick={() => setEditing(null)} tone="secondary">{t("cancel")}</Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>{t("loadingDots")}</div>
      ) : companies.length === 0 ? (
        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>
          {t("noCompanies")}
        </div>
      ) : visibleCompanies.length === 0 ? (
        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>
          {t("noCompaniesMatch")}
        </div>
      ) : (
        <div className="bpx-cards" style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {visibleCompanies.map(c => {
            const sc   = STATUS_META[c.status] || STATUS_META.active;
            const days = c.days;
            const expiring = days !== null && days > 0 && days <= 14;
            const expired  = days !== null && days <= 0;
            return (
              <div key={c.id} style={{ ...ui.card, padding:"16px 20px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                  <CompanyAvatar name={c.name} logo={c.logo_url} size={58} />

                  {/* Body */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:800, fontSize:20, color:"#1e293b" }}>{c.name}</span>
                      <span style={{ fontSize:14, fontWeight:700, background:sc.bg, color:sc.text,
                                     borderRadius:20, padding:"3px 12px" }}>{sc.label}</span>
                      {(c.plan_name || c.customPrice) && (
                        <span style={{ fontSize:14, fontWeight:700, background:"#ede9fe", color:"#5b21b6",
                                       borderRadius:20, padding:"3px 12px" }}>
                          💳 {c.plan_name || (lang === "ar" ? "بدون خطة" : "No plan")}
                          {c.monthlyValue > 0 ? ` · ${c.monthlyValue.toLocaleString("en-US")} ${c.currencyShown}/mo` : ""}
                          {c.customPrice && <span style={{ marginInlineStart:6, color:"#b45309" }}>· {lang === "ar" ? "سعر خاص" : "custom"}</span>}
                        </span>
                      )}
                    </div>

                    <div style={{ display:"flex", gap:16, marginTop:8, flexWrap:"wrap", fontSize:15, color:"#64748b" }}>
                      {c.contact_name  && <span>👤 {c.contact_name}</span>}
                      {c.contact_email && <span>📧 {c.contact_email}</span>}
                      {c.contact_phone && <span>📞 {c.contact_phone}</span>}
                    </div>

                    {(c.start_date || c.end_date) && (
                      <div style={{ marginTop:8, fontSize:15, color:"#64748b" }}>
                        📅 {c.start_date?.substring(0,10) || "—"} → {c.end_date?.substring(0,10) || "—"}
                        {days !== null && (
                          <span style={{
                            marginLeft:8, fontWeight:700,
                            color: expired ? "#991b1b" : expiring ? "#92400e" : "#059669",
                          }}>
                            {expired ? `(${t("expiredAgo")} ${-days}${t("daysAgo")})` :
                             `(${days} ${t("daysRemaining")})`}
                          </span>
                        )}
                      </div>
                    )}

                    {c.notes && (
                      <div style={{ marginTop:8, fontSize:15, color:"#94a3b8", fontStyle:"italic" }}>{c.notes}</div>
                    )}
                  </div>

                  {/* Actions */}
                  {isSuperAdmin && (
                    <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                      <Button onClick={() => openEdit(c)} tone="secondary" style={{ minHeight:36 }}>{t("edit")}</Button>
                      {c.disabled_at ? (
                        <Button onClick={() => setConfirm({ company: c, action: "enable" })} tone="primary" style={{ minHeight:36 }}>{t("enableCompany")}</Button>
                      ) : Number(c.id) !== 1 && (
                        <Button onClick={() => setConfirm({ company: c, action: "disable" })} tone="muted" style={{ minHeight:36, color:"#b45309", borderColor:"#fcd34d", background:"#fffbeb" }}>{t("disableCompany")}</Button>
                      )}
                      {/* The primary company (Al Mawashi) can never be deleted. */}
                      {Number(c.id) !== 1 && (
                        <Button onClick={() => setDeleting(c)} tone="secondary"
                          style={{ minHeight:36, color:"#b91c1c", borderColor:"#fecaca" }}
                          title={lang === "ar" ? "حذف الشركة نهائياً مع كل بياناتها" : "Delete the company and all its data for good"}>
                          🗑 {lang === "ar" ? "حذف" : "Delete"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* The company's picture (logo_url, hosted) — or its first letter. The same
   picture shows on its card in the Platform Center (SelectCompany.jsx). */
export function CompanyAvatar({ name, logo, size = 58 }) {
  const box = { width:size, height:size, borderRadius:Math.round(size / 4.8), flexShrink:0, overflow:"hidden" };
  if (logo) {
    return (
      <div style={{ ...box, background:"#fff", border:"1px solid #e2e8f0", display:"grid", placeItems:"center" }}>
        <img src={logo} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
      </div>
    );
  }
  return (
    <div style={{ ...box, background:"linear-gradient(135deg,#3b82f6,#1d4ed8)", color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:Math.round(size * 0.38) }}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

/* Deleting a company erases it and everything it owns (server:
   POST /api/companies/:id/delete). The owner first sees what will go,
   then types the company's exact name AND the super-admin password —
   the server re-checks both and locks after 5 wrong passwords. */
const DELETE_ERRORS = {
  wrong_password:     { en: "Wrong password.", ar: "كلمة السر غلط." },
  name_mismatch:      { en: "The name you typed does not match the company.", ar: "الاسم اللي كتبته مش مطابق لاسم الشركة." },
  too_many_attempts:  { en: "Too many wrong passwords — try again in 15 minutes.", ar: "كلمة السر غلط كذا مرة — جرّب بعد 15 دقيقة." },
  primary_company:    { en: "The primary company cannot be deleted.", ar: "الشركة الأساسية ما بتنحذف." },
  super_admin_required: { en: "Only the platform owner can delete a company.", ar: "مالك المنصّة وحده بيقدر يحذف شركة." },
  not_found:          { en: "This company no longer exists.", ar: "الشركة مش موجودة." },
};

function DeleteCompanyModal({ company, lang, onClose, onDeleted }) {
  const ar = lang === "ar";
  const L = (en, a) => (ar ? a : en);
  const [counts, setCounts] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/companies/${company.id}/delete-preview`)
      .then((r) => r.json())
      .then((d) => { if (!alive) return; if (d.ok) setCounts(d.counts); else setLoadErr(d.error || "error"); })
      .catch(() => alive && setLoadErr("net"));
    return () => { alive = false; };
  }, [company.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const nameOk = name.trim() === String(company.name || "").trim();
  const canDelete = nameOk && password && counts && !busy;

  async function submit(e) {
    e.preventDefault();
    if (!canDelete) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch(`${API_BASE}/api/companies/${company.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmName: name.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { onDeleted(company.name); return; }
      const m = DELETE_ERRORS[d.error];
      let text = m ? (ar ? m.ar : m.en) : L("Could not delete — nothing was changed.", "ما انحذفت — ما تغيّر شي.");
      if (d.error === "wrong_password" && d.attemptsLeft != null) {
        text += " " + L(`${d.attemptsLeft} attempts left.`, `باقي ${d.attemptsLeft} محاولات.`);
      }
      setErr(text);
      setPassword("");
    } catch {
      setErr(L("Connection error — nothing was changed.", "خطأ بالاتصال — ما تغيّر شي."));
    }
    setBusy(false);
  }

  const rows = counts ? [
    [L("Reports", "التقارير"), counts.reports],
    [L("User accounts", "حسابات المستخدمين"), counts.accounts],
    [L("Audit trail entries", "سجل التعديلات"), counts.audit_rows],
    [L("E-mail log", "سجل الإيميلات"), counts.emails],
    [L("Invoices", "الفواتير"), counts.invoices],
    [L("Catalogue items", "أصناف الكتالوج"), counts.catalog_items],
  ] : [];

  return (
    <div role="dialog" aria-modal="true" dir={ar ? "rtl" : "ltr"}
      onClick={() => !busy && onClose()}
      style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(15,23,42,.55)", display:"grid", placeItems:"center", padding:16 }}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        style={{ width:"min(520px, 100%)", maxHeight:"92vh", overflow:"auto", background:"#fff", borderRadius:16,
          boxShadow:"0 30px 80px rgba(0,0,0,.35)", borderTop:"5px solid #dc2626" }}>
        <div style={{ padding:"20px 22px 6px" }}>
          <div style={{ fontWeight:1000, color:"#991b1b" }} className="bpx-lg">
            🗑 {L("Delete company for good", "حذف الشركة نهائياً")}
          </div>
          <div style={{ fontWeight:900, color:"#0f172a", marginTop:4 }}>{company.name}</div>
        </div>

        <div style={{ padding:"8px 22px 4px" }}>
          <div style={{ padding:"10px 12px", borderRadius:10, background:"#fef2f2", border:"1px solid #fecaca", color:"#991b1b", fontWeight:800 }}>
            {L("This cannot be undone. The company and everything below are erased, and its files are removed from storage. To only switch it off, use Disable instead.",
               "ما في تراجع. الشركة وكل شي تحت بينمسح، وملفاتها بتنشال من التخزين. إذا بدك توقفها بس، استعمل «تعطيل».")}
          </div>

          <div style={{ marginTop:12 }}>
            {loadErr ? (
              <div style={{ color:"#991b1b", fontWeight:800 }}>
                {DELETE_ERRORS[loadErr] ? (ar ? DELETE_ERRORS[loadErr].ar : DELETE_ERRORS[loadErr].en) : L("Could not load what will be deleted.", "تعذّر تحميل اللي رح ينحذف.")}
              </div>
            ) : !counts ? (
              <div style={{ color:"#64748b", fontWeight:800 }}>{L("Counting its data…", "عم نعدّ بياناتها…")}</div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"6px 16px", padding:"10px 12px", borderRadius:10, background:"#f8fafc", border:"1px solid #e2e8f0" }}>
                {rows.map(([k, v]) => (
                  <React.Fragment key={k}>
                    <span style={{ color:"#475569", fontWeight:800 }}>{k}</span>
                    <b style={{ color: v ? "#b91c1c" : "#94a3b8", textAlign:"end" }}>{Number(v || 0).toLocaleString("en-US")}</b>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          <label style={{ display:"block", marginTop:14 }}>
            <span style={{ display:"block", fontWeight:800, color:"#334155", marginBottom:6 }}>
              {L("Type the company name to confirm:", "اكتب اسم الشركة للتأكيد:")} <b dir="auto">{company.name}</b>
            </span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus autoComplete="off" dir="auto"
              style={{ ...inputStyle, borderColor: name && !nameOk ? "#fca5a5" : "#e2e8f0" }} />
          </label>

          <label style={{ display:"block", marginTop:12 }}>
            <span style={{ display:"block", fontWeight:800, color:"#334155", marginBottom:6 }}>
              {L("Your super-admin password:", "كلمة سر السوبر أدمن:")}
            </span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
              style={inputStyle} />
          </label>

          {err && <div role="alert" style={{ marginTop:10, color:"#991b1b", fontWeight:900 }}>❌ {err}</div>}
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", padding:"16px 22px 20px" }}>
          <Button onClick={onClose} disabled={busy} tone="secondary">{L("Cancel", "إلغاء")}</Button>
          <Button type="submit" tone="danger" disabled={!canDelete}>
            {busy ? L("Deleting…", "عم ينحذف…") : `🗑 ${L("Delete for good", "احذف نهائياً")}`}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ display:"block", fontSize:15, fontWeight:700, color:"#475569", marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8,
  padding:"11px 14px", fontSize:18, color:"#1e293b",
  fontFamily:"Cairo, sans-serif", boxSizing:"border-box", background:"#fff",
};
const toolbarStyle = {
  display:"flex",
  flexWrap:"wrap",
  alignItems:"center",
  gap:10,
  marginBottom:16,
};
