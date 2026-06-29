// src/pages/settings/PlansTab.jsx
import React, { useState, useEffect } from "react";
import API_BASE from "../../config/api";
import { useSettingsLang, LangToggle } from "./_shared/settingsI18n";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";

const CURRENCIES = ["USD", "AED", "EUR", "GBP", "SAR"];

const emptyForm = { name:"", price:"", currency:"USD", max_branches:"", max_users:"", description:"", is_active:true };

function getUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
}

export default function PlansTab() {
  const { t, dir, lang, toggle: toggleLang } = useSettingsLang();
  const STATUS_COLORS = {
    true:  { bg: "#d1fae5", text: "#065f46", label: t("active")   },
    false: { bg: "#f3f4f6", text: "#6b7280", label: t("inactive") },
  };
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | plan object
  const [form,    setForm]    = useState(emptyForm);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [confirm, setConfirm] = useState(null); // plan id to delete

  const u = getUser();
  const isSuperAdmin = u.isSuperAdmin || u.isAdmin || false;

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/plans`);
      const d = await r.json();
      if (d.ok) setPlans(d.plans);
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
      max_branches: plan.max_branches === -1 ? "" : plan.max_branches,
      max_users:    plan.max_users    === -1 ? "" : plan.max_users,
      description:  plan.description,
      is_active:    plan.is_active,
    });
    setEditing(plan);
    setMsg("");
  }

  async function save() {
    if (!form.name.trim()) { setMsg("❌ " + t("planNameReq")); return; }
    setSaving(true); setMsg("");
    const body = {
      name:         form.name.trim(),
      price:        parseFloat(form.price) || 0,
      currency:     form.currency,
      max_branches: form.max_branches === "" ? -1 : parseInt(form.max_branches),
      max_users:    form.max_users    === "" ? -1 : parseInt(form.max_users),
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
      await fetch(`${API_BASE}/api/plans/${id}`, { method: "DELETE" });
      setConfirm(null); setMsg("✅ " + t("planDeleted")); load();
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("❌ " + t("failDelete")); }
  }

  return (
    <div style={ui.page} dir={dir}>
      <PageHeader
        eyebrow="Billing"
        title={t("plansTitle")}
        subtitle="Create plans, pricing, and account limits used by companies and the subscription panel."
        actions={
          <>
          <LangToggle lang={lang} toggle={toggleLang} style={{ background:"#0b1220", border:"1px solid #1e293b" }} />
          {isSuperAdmin && (
            <Button onClick={openNew} tone="primary">+ {t("newPlan")}</Button>
          )}
          </>
        }
      />

      <StatusMessage message={msg ? { kind: msg.startsWith("✅") ? "ok" : "err", text: msg } : null} />

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
            <Field label={t("price")}>
              <div style={{ display:"flex", gap:8 }}>
                <input type="number" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))}
                  placeholder="0" style={{ ...inputStyle, flex:1 }} />
                <select value={form.currency} onChange={e => setForm(f=>({...f,currency:e.target.value}))}
                  style={{ ...inputStyle, width:90 }}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </Field>
            <Field label={t("maxBranches")}>
              <input type="number" value={form.max_branches} onChange={e => setForm(f=>({...f,max_branches:e.target.value}))}
                placeholder="∞" style={inputStyle} />
            </Field>
            <Field label={t("maxUsers")}>
              <input type="number" value={form.max_users} onChange={e => setForm(f=>({...f,max_users:e.target.value}))}
                placeholder="∞" style={inputStyle} />
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
        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>Loading…</div>
      ) : plans.length === 0 ? (
        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>{t("noPlans")}</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {plans.map(plan => {
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
                  {plan.price > 0 && <div style={{ fontSize:13, opacity:.85 }}>{plan.currency}/mo</div>}
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
                  <div style={{ display:"flex", gap:18, marginTop:8 }}>
                    <LimitChip icon="🏪" label={t("branches")} val={plan.max_branches} />
                    <LimitChip icon="👤" label={t("users")}    val={plan.max_users}    />
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
  borderRadius:8, padding:"12px 18px", fontWeight:700,
  fontSize:18, marginBottom:16,
});
const overlayStyle = {
  position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
  display:"flex", alignItems:"center", justifyContent:"center", zIndex:999,
};
const modalStyle = {
  background:"#fff", borderRadius:14, padding:"28px 32px",
  maxWidth:380, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,.25)",
};
