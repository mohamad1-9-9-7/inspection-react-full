// src/pages/settings/CompaniesTab.jsx
import React, { useState, useEffect, useMemo } from "react";
import API_BASE from "../../config/api";
import { useSettingsLang, LangToggle } from "./_shared/settingsI18n";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";
import { logSettingsAudit } from "../../utils/settingsAudit";

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
  const [query,     setQuery]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

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
    if (form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)) {
      setMsg("❌ End date cannot be before start date");
      return;
    }
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
        await logSettingsAudit({
          area: "companies",
          action: isNew ? "create_company" : "update_company",
          target: body.name,
          before: isNew ? null : editing,
          after: d.company || body,
          reason: isNew ? "Company created" : "Company updated",
        });
        setEditing(null); setMsg(`✅ "${body.name}" ${t("companySaved")}`);
        load(); setTimeout(() => setMsg(""), 3000);
      } else setMsg("❌ " + t("failSave"));
    } catch { setMsg("❌ " + t("connError")); }
    setSaving(false);
  }

  async function deleteCompany(id) {
    try {
      const company = companies.find((c) => c.id === id) || { id };
      await fetch(`${API_BASE}/api/companies/${id}`, { method:"DELETE" });
      await logSettingsAudit({
        area: "companies",
        action: "delete_company",
        target: company.name || String(id),
        before: company,
        after: null,
        reason: "Company deleted",
      });
      setConfirm(null); setMsg("✅ " + t("companyDeleted")); load();
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("❌ " + t("failDelete")); }
  }

  const enrichedCompanies = useMemo(() => companies.map((company) => {
    const days = daysLeft(company.end_date);
    const status = String(company.status || "active").toLowerCase();
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
      monthlyValue: Number(company.plan_price || plan?.price || 0),
      risk: days !== null && days <= 14,
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

  const companyStats = useMemo(() => {
    const active = enrichedCompanies.filter((company) => company.status === "active");
    const trial = enrichedCompanies.filter((company) => company.status === "trial");
    const renewalRisk = enrichedCompanies.filter((company) => company.risk);
    const withoutPlan = enrichedCompanies.filter((company) => !company.plan_id && !company.planDisplay);
    const mrr = active.reduce((sum, company) => sum + Number(company.monthlyValue || 0), 0);
    return { active: active.length, trial: trial.length, renewalRisk: renewalRisk.length, withoutPlan: withoutPlan.length, mrr };
  }, [enrichedCompanies]);

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

      <StatusMessage message={msg ? { kind: msg.startsWith("✅") ? "ok" : "err", text: msg } : null} />

      <div style={kpiGridStyle}>
        <MetricCard label="Active companies" value={companyStats.active} />
        <MetricCard label="Trial" value={companyStats.trial} />
        <MetricCard label="Renewal risk" value={companyStats.renewalRisk} />
        <MetricCard label="No plan" value={companyStats.withoutPlan} />
        <MetricCard label="MRR estimate" value={companyStats.mrr.toLocaleString()} />
      </div>

      <div style={toolbarStyle}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies"
          style={{ ...inputStyle, flex: "1 1 260px", minWidth: 0, fontSize: 16 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 170, fontSize: 16 }}>
          <option value="all">All statuses</option>
          <option value="active">{t("stActive")}</option>
          <option value="trial">{t("stTrial")}</option>
          <option value="expired">{t("stExpired")}</option>
          <option value="suspended">{t("stSuspended")}</option>
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={{ ...inputStyle, width: 190, fontSize: 16 }}>
          <option value="all">All plans</option>
          {plans.map((plan) => <option key={plan.id} value={String(plan.id)}>{plan.name}</option>)}
        </select>
      </div>

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
      ) : visibleCompanies.length === 0 ? (
        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>
          No companies match the current filters.
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {visibleCompanies.map(c => {
            const sc   = STATUS_META[c.status] || STATUS_META.active;
            const days = c.days;
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

function MetricCard({ label, value }) {
  return (
    <div style={{ ...ui.card, marginBottom: 0, padding: "14px 16px" }}>
      <div style={{ color:"#64748b", fontSize:12, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.04em" }}>{label}</div>
      <div style={{ color:"#0f172a", fontSize:26, fontWeight:950, marginTop:4 }}>{value}</div>
    </div>
  );
}

const inputStyle = {
  width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8,
  padding:"11px 14px", fontSize:18, color:"#1e293b",
  fontFamily:"Cairo, sans-serif", boxSizing:"border-box", background:"#fff",
};
const kpiGridStyle = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))",
  gap:12,
  marginBottom:14,
};
const toolbarStyle = {
  display:"flex",
  flexWrap:"wrap",
  alignItems:"center",
  gap:10,
  marginBottom:16,
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
