// src/pages/settings/PlansTab.jsx
import React, { useState, useEffect, useMemo } from "react";
import API_BASE from "../../config/api";
import { useSettingsLang } from "./_shared/settingsI18n";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";
import { logSettingsAudit } from "../../utils/settingsAudit";
import { companyStatus, mrrByCurrency, onPlan } from "./_shared/companyBilling";
import { moneyMap } from "./invoices/invoiceCore";

const CURRENCIES = ["AED", "SAR", "USD", "EUR", "GBP"];

const emptyForm = { name:"", price:"", currency:"AED", setup_fee:"", description:"", is_active:true };

function getUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
}

export default function PlansTab() {
  const { t, dir, lang } = useSettingsLang();
  const L = (en, ar) => (lang === "ar" ? ar : en);
  const STATUS_COLORS = {
    true:  { bg: "#d1fae5", text: "#065f46", label: t("active")   },
    false: { bg: "#f3f4f6", text: "#6b7280", label: t("inactive") },
  };
  const [plans,   setPlans]   = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | plan object
  const [form,    setForm]    = useState(emptyForm);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [confirm, setConfirm] = useState(null); // plan id to delete
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const u = getUser();
  // Pricing is INSPECT PRO's decision, not a tenant admin's (server: superOnly).
  const isSuperAdmin = !!u.isSuperAdmin;

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [planRes, companyRes] = await Promise.all([
        fetch(`${API_BASE}/api/plans`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/companies`).then(r => r.json()).catch(() => ({})),
      ]);
      if (planRes.ok) setPlans(Array.isArray(planRes.plans) ? planRes.plans : []);
      if (companyRes.ok) setCompanies(Array.isArray(companyRes.companies) ? companyRes.companies : []);
    } catch { }
    setLoading(false);
  }

  function openNew() {
    setForm(emptyForm);
    setEditing("new");
    setMsg("");
  }

  function openEdit(plan) {
    setForm({
      name:         plan.name,
      price:        plan.price,
      currency:     plan.currency,
      setup_fee:    plan.setup_fee || "",
      description:  plan.description,
      is_active:    plan.is_active,
    });
    setEditing(plan);
    setMsg("");
  }

  async function save() {
    if (!form.name.trim()) { setMsg("❌ " + t("planNameReq")); return; }
    if (Number(form.price || 0) < 0) { setMsg("❌ " + L("Price cannot be negative.", "السعر ما بيكون بالسالب.")); return; }
    if (Number(form.setup_fee || 0) < 0) { setMsg("❌ " + L("Setup fee cannot be negative.", "رسوم التأسيس ما بتكون بالسالب.")); return; }
    setSaving(true); setMsg("");
    const body = {
      name:         form.name.trim(),
      price:        parseFloat(form.price) || 0,
      currency:     form.currency,
      setup_fee:    parseFloat(form.setup_fee) || 0,
      description:  form.description,
      is_active:    form.is_active,
    };
    try {
      const isNew = editing === "new";
      const url   = isNew ? `${API_BASE}/api/plans` : `${API_BASE}/api/plans/${editing.id}`;
      const r     = await fetch(url, { method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.ok) {
        await logSettingsAudit({
          area: "plans",
          action: isNew ? "create_plan" : "update_plan",
          target: body.name,
          before: isNew ? null : editing,
          after: d.plan || body,
          reason: isNew ? "Plan created" : "Plan updated",
        });
        setEditing(null);
        setMsg(`✅ "${body.name}" ${t("planSaved")}`);
        load();
        setTimeout(() => setMsg(""), 3000);
      } else {
        setMsg(d.error === "name_taken" ? "❌ " + t("planNameTaken") : "❌ " + t("failSave"));
      }
    } catch { setMsg("❌ " + t("connError")); }
    setSaving(false);
  }

  async function deletePlan(id) {
    try {
      const plan = plans.find((p) => p.id === id) || { id };
      await fetch(`${API_BASE}/api/plans/${id}`, { method: "DELETE" });
      await logSettingsAudit({
        area: "plans",
        action: "delete_plan",
        target: plan.name || String(id),
        before: plan,
        after: null,
        reason: "Plan deleted",
      });
      setConfirm(null); setMsg("✅ " + t("planDeleted")); load();
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("❌ " + t("failDelete")); }
  }

  const planRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plans
      .map((plan) => {
        const assigned = companies.filter((company) => onPlan(company, plan));
        const activeAssigned = assigned.filter((company) => companyStatus(company) === "active");
        // Same rule as the Overview's MRR: each company at its own price.
        return { ...plan, assignedCount: assigned.length, activeAssignedCount: activeAssigned.length, mrr: mrrByCurrency(activeAssigned) };
      })
      .filter((plan) => statusFilter === "all" || (statusFilter === "active" ? plan.is_active : !plan.is_active))
      .filter((plan) => !q || [plan.name, plan.description, plan.currency].join(" ").toLowerCase().includes(q));
  }, [plans, companies, query, statusFilter]);

  return (
    <div style={ui.page} dir={dir}>
      <PageHeader
        eyebrow={t("plansEyebrow")}
        title={t("plansTitle")}
        subtitle={t("plansSubtitle")}
        actions={
          isSuperAdmin && (
            <Button onClick={openNew} tone="primary">+ {t("newPlan")}</Button>
          )
        }
      />

      <StatusMessage message={msg ? { kind: msg.startsWith("✅") ? "ok" : "err", text: msg } : null} />

      <div style={toolbarStyle}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlans")}
          style={{ ...inputStyle, flex: "1 1 260px", minWidth: 0, fontSize: 16 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...inputStyle, width: 170, fontSize: 16 }}
        >
          <option value="all">{t("allStatuses")}</option>
          <option value="active">{t("activeOnly")}</option>
          <option value="inactive">{t("inactiveOnly")}</option>
        </select>
      </div>

      {/* Delete confirm modal */}
      <ConfirmModal
        open={!!confirm}
        title={t("deletePlanQ")}
        body={t("deletePlanD")}
        confirmText={t("delete")}
        cancelText={t("cancel")}
        onConfirm={() => deletePlan(confirm)}
        onCancel={() => setConfirm(null)}
      />

      {/* Edit / New form */}
      {editing && (
        <div style={ui.subtleCard}>
          <h3 style={{ fontSize:20, fontWeight:700, color:"#1e293b", marginBottom:18 }}>
            {editing === "new" ? t("newPlan") : `${t("editPlan")} — ${editing.name}`}
          </h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label={`${t("planName")} *`}>
              <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                placeholder="e.g. Enterprise Plus" style={inputStyle} />
            </Field>
            <Field label={t("priceMonthly")}>
              <div style={{ display:"flex", gap:8 }}>
                <input type="number" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))}
                  placeholder="1500" style={{ ...inputStyle, flex:1 }} />
                <select value={form.currency} onChange={e => setForm(f=>({...f,currency:e.target.value}))}
                  style={{ ...inputStyle, width:90 }}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </Field>
            <Field label={t("setupFee")}>
              <input type="number" value={form.setup_fee} onChange={e => setForm(f=>({...f,setup_fee:e.target.value}))}
                placeholder="0" style={inputStyle} />
              <div style={{ fontSize:13, color:"#94a3b8", marginTop:5 }}>{t("setupFeeHint")}</div>
            </Field>
            <Field label={t("description")} style={{ gridColumn:"1 / -1" }}>
              <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                placeholder="" style={{ ...inputStyle, width:"100%" }} />
            </Field>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:14, cursor:"pointer", fontSize:17, fontWeight:600, color:"#475569" }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f=>({...f,is_active:e.target.checked}))} />
            {t("planActive")}
          </label>
          <div style={{ display:"flex", gap:10, marginTop:18 }}>
            <Button onClick={save} disabled={saving} tone="primary">
              {saving ? t("saving") : "✅ " + t("savePlan")}
            </Button>
            <Button onClick={() => setEditing(null)} tone="secondary">{t("cancel")}</Button>
          </div>
        </div>
      )}

      {/* Plans list */}
      {loading ? (
        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>{t("loadingDots")}</div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>{t("noPlans")}</div>
      ) : planRows.length === 0 ? (
        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>{t("noPlansMatch")}</div>
      ) : (
        <div className="bpx-cards" style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {planRows.map(plan => {
            const sc = STATUS_COLORS[String(plan.is_active)];
            return (
              <div key={plan.id} style={{
                ...ui.card,
                padding:"16px 20px", display:"flex", alignItems:"center", gap:16,
                marginBottom: 0,
              }}>
                {/* Price bubble */}
                <div style={{
                  minWidth:90, textAlign:"center",
                  background:"linear-gradient(135deg,#059669,#065f46)",
                  color:"#fff", borderRadius:10, padding:"10px 14px",
                }}>
                  <div style={{ fontSize:20, fontWeight:900 }}>
                    {plan.price > 0 ? `${plan.price}` : t("free")}
                  </div>
                  {plan.price > 0 && <div style={{ fontSize:13, opacity:.85 }}>{plan.currency}/{t("moShort")}</div>}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:800, fontSize:20, color:"#1e293b" }}>{plan.name}</span>
                    <span style={{ fontSize:14, fontWeight:700, background:sc.bg, color:sc.text,
                                   borderRadius:20, padding:"3px 12px" }}>{sc.label}</span>
                  </div>
                  {plan.description && (
                    <div style={{ fontSize:16, color:"#64748b", marginTop:4 }}>{plan.description}</div>
                  )}
                  <div style={{ display:"flex", gap:18, marginTop:8, flexWrap:"wrap" }}>
                    {Number(plan.setup_fee) > 0 && (
                      <LimitChip icon="🧾" label={t("setupFee")} val={`${plan.setup_fee} ${plan.currency || "AED"} · ${t("oneTime")}`} />
                    )}
                    <LimitChip icon="🏢" label={L("Companies (active / all)", "الشركات (فعّالة / الكل)")} val={`${plan.activeAssignedCount} / ${plan.assignedCount}`} />
                    <LimitChip icon="💰" label={L("Monthly revenue", "الإيراد الشهري")} val={moneyMap(plan.mrr)} />
                  </div>
                </div>

                {/* Actions */}
                {isSuperAdmin && (
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <Button onClick={() => openEdit(plan)} tone="secondary" style={{ minHeight: 36 }}>{t("edit")}</Button>
                    <Button onClick={() => setConfirm(plan.id)} tone="danger" style={{ minHeight: 36 }}>{t("delete")}</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LimitChip({ icon, label, val }) {
  const display = val === -1 || val == null ? "∞" : val;
  return (
    <span style={{ fontSize:15, color:"#475569", fontWeight:600 }}>
      {icon} {label}: <strong>{display}</strong>
    </span>
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
