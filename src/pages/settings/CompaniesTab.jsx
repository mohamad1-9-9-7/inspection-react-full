// src/pages/settings/CompaniesTab.jsx
import React, { useState, useEffect, useMemo } from "react";
import API_BASE from "../../config/api";
import { useSettingsLang } from "./_shared/settingsI18n";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";
import { logSettingsAudit } from "../../utils/settingsAudit";
import { industryOptions } from "../../industries";
import { companyStatus, currencyOf, daysLeft, priceOf } from "./_shared/companyBilling";
import { deleteImage, uploadImage } from "../../utils/imageUpload";

const emptyForm = {
  name:"", contact_name:"", contact_email:"", contact_phone:"",
  plan_id:"", status:"active", start_date:"", end_date:"", notes:"", industry:"meat",
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
              {/* Decides which system the company opens: "Meat manufacturing" =
                  the full Al Mawashi system; any other industry = the generic
                  engine built from that industry's template. */}
              <select value={form.industry} onChange={e => setForm(f=>({...f,industry:e.target.value}))} style={inputStyle}>
                {industryOptions().map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
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
                    <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                      <Button onClick={() => openEdit(c)} tone="secondary" style={{ minHeight:36 }}>{t("edit")}</Button>
                      {c.disabled_at ? (
                        <Button onClick={() => setConfirm({ company: c, action: "enable" })} tone="primary" style={{ minHeight:36 }}>{t("enableCompany")}</Button>
                      ) : Number(c.id) !== 1 && (
                        <Button onClick={() => setConfirm({ company: c, action: "disable" })} tone="danger" style={{ minHeight:36 }}>{t("disableCompany")}</Button>
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
