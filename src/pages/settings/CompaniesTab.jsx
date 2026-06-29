// src/pages/settings/CompaniesTab.jsx
import React, { useState, useEffect } from "react";
import API_BASE from "../../config/api";
import { useSettingsLang, LangToggle } from "./_shared/settingsI18n";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";

const emptyForm = {
  name:"", contact_name:"", contact_email:"", contact_phone:"",
  plan_id:"", status:"active", start_date:"", end_date:"", notes:"",
};

function getUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
}

function daysLeft(endDate) {
  if (!endDate) return null;
  const end   = new Date(endDate); end.setHours(0,0,0,0);
  const today = new Date();        today.setHours(0,0,0,0);
  return Math.ceil((end - today) / 86400000);
}

export default function CompaniesTab() {
  const { t, dir, lang, toggle: toggleLang } = useSettingsLang();
  const STATUS_META = {
    active:    { bg:"#d1fae5", text:"#065f46", label:t("stActive")    },
    trial:     { bg:"#fef3c7", text:"#92400e", label:t("stTrial")     },
    expired:   { bg:"#fee2e2", text:"#991b1b", label:t("stExpired")   },
    suspended: { bg:"#f3f4f6", text:"#6b7280", label:t("stSuspended") },
  };
  const [companies, setCompanies] = useState([]);
  const [plans,     setPlans]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(null); // null | "new" | company object
  const [form,      setForm]      = useState(emptyForm);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState("");
  const [confirm,   setConfirm]   = useState(null);

  const u = getUser();
  const isSuperAdmin = u.isSuperAdmin || u.isAdmin || false;

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
    });
    setEditing(c); setMsg("");
  }

  async function save() {
    if (!form.name.trim()) { setMsg("❌ " + t("companyNameReq")); return; }
    setSaving(true); setMsg("");
    const body = {
      ...form,
      name: form.name.trim(),
      plan_id: form.plan_id ? parseInt(form.plan_id) : null,
      start_date: form.start_date || null,
      end_date:   form.end_date   || null,
    };
    try {
      const isNew = editing === "new";
      const url   = isNew ? `${API_BASE}/api/companies` : `${API_BASE}/api/companies/${editing.id}`;
      const r = await fetch(url, { method: isNew ? "POST" : "PUT",
        headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.ok) {
        setEditing(null); setMsg(`✅ "${body.name}" ${t("companySaved")}`);
        load(); setTimeout(() => setMsg(""), 3000);
      } else setMsg("❌ " + t("failSave"));
    } catch { setMsg("❌ " + t("connError")); }
    setSaving(false);
  }

  async function deleteCompany(id) {
    try {
      await fetch(`${API_BASE}/api/companies/${id}`, { method:"DELETE" });
      setConfirm(null); setMsg("✅ " + t("companyDeleted")); load();
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("❌ " + t("failDelete")); }
  }

  return (
    <div style={ui.page} dir={dir}>
      <PageHeader
        eyebrow="Billing"
        title={t("companiesTitle")}
        subtitle="Connect companies to plans, contacts, status, and subscription dates."
        actions={
        <>
          <LangToggle lang={lang} toggle={toggleLang} style={{ background:"#0b1220", border:"1px solid #1e293b" }} />
          {isSuperAdmin && (
            <Button onClick={openNew} tone="primary">+ {t("newCompany")}</Button>
          )}
        </>
        }
      />

      <StatusMessage message={msg ? { kind: msg.startsWith("âœ…") ? "ok" : "err", text: msg } : null} />

      {/* Delete modal */}
      <ConfirmModal
        open={!!confirm}
        title={t("deleteCompanyQ")}
        body={t("deleteCompanyD")}
        confirmText={t("delete")}
        cancelText={t("cancel")}
        onConfirm={() => deleteCompany(confirm)}
        onCancel={() => setConfirm(null)}
      />

      {/* Edit form */}
      {editing && (
        <div style={ui.subtleCard}>
          <h3 style={{ fontSize:20, fontWeight:700, color:"#1e293b", marginBottom:18 }}>
            {editing === "new" ? t("newCompany") : `${t("edit")} — ${editing.name}`}
          </h3>
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
                    {p.name} ({p.price > 0 ? `${p.price} ${p.currency}/mo` : t("free")})
                  </option>
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
              <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))} style={inputStyle}>
                <option value="active">{t("stActive")}</option>
                <option value="trial">{t("stTrial")}</option>
                <option value="expired">{t("stExpired")}</option>
                <option value="suspended">{t("stSuspended")}</option>
              </select>
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
        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>Loading…</div>
      ) : companies.length === 0 ? (
        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>
          {t("noCompanies")}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {companies.map(c => {
            const sc   = STATUS_META[c.status] || STATUS_META.active;
            const days = daysLeft(c.end_date);
            const expiring = days !== null && days > 0 && days <= 14;
            const expired  = days !== null && days <= 0;
            return (
              <div key={c.id} style={{ ...ui.card, padding:"16px 20px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                  {/* Avatar */}
                  <div style={{
                    width:58, height:58, borderRadius:12,
                    background:"linear-gradient(135deg,#3b82f6,#1d4ed8)", color:"#fff",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:900, fontSize:22, flexShrink:0,
                  }}>{c.name?.[0]?.toUpperCase() || "?"}</div>

                  {/* Body */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:800, fontSize:20, color:"#1e293b" }}>{c.name}</span>
                      <span style={{ fontSize:14, fontWeight:700, background:sc.bg, color:sc.text,
                                     borderRadius:20, padding:"3px 12px" }}>{sc.label}</span>
                      {c.plan_name && (
                        <span style={{ fontSize:14, fontWeight:700, background:"#ede9fe", color:"#5b21b6",
                                       borderRadius:20, padding:"3px 12px" }}>
                          💳 {c.plan_name}{c.plan_price > 0 ? ` · ${c.plan_price} ${c.plan_currency}/mo` : ""}
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
                      <Button onClick={() => setConfirm(c.id)} tone="danger" style={{ minHeight:36 }}>{t("delete")}</Button>
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
const btnStyle = (bg) => ({
  background:bg, color:"#fff", border:"none", borderRadius:8,
  padding:"11px 24px", fontWeight:700, fontSize:18, cursor:"pointer",
});
const btnSmall = (bg) => ({
  background:bg, color:"#fff", border:"none", borderRadius:7,
  padding:"8px 16px", fontWeight:700, fontSize:16, cursor:"pointer",
});
const msgStyle = (msg) => ({
  background: msg.startsWith("✅") ? "#d1fae5" : "#fee2e2",
  color:       msg.startsWith("✅") ? "#065f46" : "#991b1b",
  border:`1px solid ${msg.startsWith("✅") ? "#6ee7b7" : "#fca5a5"}`,
  borderRadius:8, padding:"12px 18px", fontWeight:700, fontSize:18, marginBottom:16,
});
const overlayStyle = {
  position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
  display:"flex", alignItems:"center", justifyContent:"center", zIndex:999,
};
const modalStyle = {
  background:"#fff", borderRadius:14, padding:"28px 32px",
  maxWidth:380, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,.25)",
};
