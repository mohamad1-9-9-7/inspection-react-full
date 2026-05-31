// src/pages/admin/SubscriptionTab.jsx
import React, { useState, useEffect } from "react";
import API_BASE from "../../config/api";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";

/* الخطط الحقيقية تُجلب من /api/plans (تبويب Plans). الألوان دوّارة لأن الجدول لا يخزّن لوناً. */
const PLAN_COLORS = ["#64748b", "#3b82f6", "#7c3aed", "#0891b2", "#059669", "#db2777"];
const planColor = (idx) => PLAN_COLORS[((idx % PLAN_COLORS.length) + PLAN_COLORS.length) % PLAN_COLORS.length];
const fmtLimit  = (v) => (v === -1 || v == null || v === "") ? "∞" : v;

function getUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
}

/* مطابقة اسم الخطة المخزّن في الاشتراك مع خطة حقيقية — غير حسّاسة لحالة الأحرف */
function findPlan(plans, planName) {
  if (!planName) return null;
  const target = String(planName).trim().toLowerCase();
  return plans.find(p => String(p.name).trim().toLowerCase() === target) || null;
}

function daysRemaining(endDate) {
  if (!endDate) return null;
  const end   = new Date(endDate); end.setHours(0,0,0,0);
  const today = new Date();        today.setHours(0,0,0,0);
  return Math.ceil((end - today) / 86400000);
}

const inputStyle = {
  width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8,
  padding: "11px 14px", fontSize: 18, color: "#1e293b",
  fontFamily: "Cairo, sans-serif", boxSizing: "border-box",
  background: "#f8fafc",
};
const selectStyle = { ...inputStyle, cursor: "pointer" };

function Row({ label, value }) {
  return (
    <div style={{ display:"flex", gap:12, paddingBottom:12, marginBottom:12,
                  borderBottom:"1px solid #f1f5f9", alignItems:"flex-start" }}>
      <span style={{ minWidth:160, color:"#64748b", fontSize:16, fontWeight:600 }}>{label}</span>
      <span style={{ color:"#1e293b", fontSize:17, fontWeight:600 }}>{value}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:15, fontWeight:700, color:"#475569", marginBottom:6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SubscriptionTab() {
  const { t, dir, lang, toggle: toggleLang } = useSettingsLang();
  const STATUS_META = {
    active:    { bg: "#d1fae5", text: "#065f46", label: t("stActive")    },
    trial:     { bg: "#fef3c7", text: "#92400e", label: t("stTrial")     },
    expired:   { bg: "#fee2e2", text: "#991b1b", label: t("stExpired")   },
    suspended: { bg: "#f3f4f6", text: "#374151", label: t("stSuspended") },
  };
  const [sub,     setSub]     = useState(null);
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [form,    setForm]    = useState({});

  const user        = getUser();
  const isSuperAdmin = user.isSuperAdmin || false;

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([
        fetch(`${API_BASE}/api/subscription`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/plans`).then(r => r.json()).catch(() => ({})),
      ]);

      const livePlans = (plansRes.ok && Array.isArray(plansRes.plans))
        ? plansRes.plans.filter(p => p.is_active)
        : [];
      setPlans(livePlans);

      if (subRes.ok && subRes.subscription) {
        const s = subRes.subscription;
        setSub(s);
        // طابِق اسم الخطة المخزّن مع خطة حقيقية لتوحيد القيمة في القائمة المنسدلة
        const matched = findPlan(livePlans, s.plan);
        setForm({
          plan:       matched ? matched.name : (s.plan || ""),
          status:     s.status,
          start_date: s.start_date?.substring(0,10) || "",
          end_date:   s.end_date?.substring(0,10)   || "",
          price:      s.price    || "",
          currency:   s.currency || "USD",
          notes:      s.notes    || "",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  /* عند اختيار خطة في وضع التعديل: اقترح سعرها وعملتها تلقائياً (يبقى قابلاً للتعديل) */
  function pickPlan(name) {
    const p = findPlan(plans, name);
    setForm(f => ({
      ...f,
      plan: name,
      ...(p ? { price: p.price, currency: p.currency || f.currency } : {}),
    }));
  }

  async function save() {
    setSaving(true); setMsg("");
    try {
      const res  = await fetch(`${API_BASE}/api/subscription`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, updated_by: user.username || "admin" }),
      });
      const data = await res.json();
      if (data.ok) {
        setSub(data.subscription);
        setEditing(false);
        setMsg("✅ Subscription updated successfully");
        /* refresh the cached status used by the subscription guard */
        localStorage.setItem("subscription_cache", JSON.stringify({
          status:    data.subscription.status,
          end_date:  data.subscription.end_date,
          plan:      data.subscription.plan,
          fetchedAt: Date.now(),
        }));
        setTimeout(() => setMsg(""), 3000);
      }
    } catch {
      setMsg("❌ Failed to save — check connection");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ padding:40, textAlign:"center", color:"#64748b", fontFamily:"Cairo, sans-serif" }}>
      {t("loading")}
    </div>
  );
  if (!sub) return (
    <div style={{ padding:40, maxWidth:500, margin:"0 auto", fontFamily:"Cairo, sans-serif" }} dir={dir}>
      <div style={{
        background:"#fef3c7", border:"1px solid #fde68a", borderRadius:12,
        padding:"20px 24px", color:"#92400e",
      }}>
        <div style={{ fontWeight:800, fontSize:16, marginBottom:8 }}>⚠️ {t("subBackendMissing")}</div>
        <div style={{ fontSize:14, lineHeight:1.7 }}>
          The subscription table doesn't exist on the server yet.<br/>
          Please <strong>deploy the updated <code>index.cjs</code></strong> to Render,
          then come back here.
        </div>
        <button onClick={load} style={{
          marginTop:14, background:"#f59e0b", color:"#fff", border:"none",
          borderRadius:8, padding:"8px 20px", fontWeight:700, fontSize:13, cursor:"pointer",
        }}>🔄 Retry</button>
      </div>
    </div>
  );

  /* الخطة الحالية من الخطط الحقيقية + لونها حسب ترتيبها */
  const currentPlan  = findPlan(plans, sub.plan);
  const currentIdx   = currentPlan ? plans.findIndex(p => p.id === currentPlan.id) : -1;
  const color        = currentIdx >= 0 ? planColor(currentIdx) : "#7c3aed";
  const planLabel    = currentPlan ? currentPlan.name : (sub.plan || "—");
  const statusMeta   = STATUS_META[sub.status] || STATUS_META.active;
  const days         = daysRemaining(sub.end_date);
  const expiringSoon = days !== null && days > 0 && days <= 7;
  const isExpired    = days !== null && days <= 0;

  return (
    <div style={{ padding:"28px 24px", maxWidth:720, margin:"0 auto", fontFamily:"Cairo, sans-serif" }} dir={dir}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, gap:10, flexWrap:"wrap" }}>
        <h2 style={{ fontSize:26, fontWeight:800, color:"#1e293b", margin:0 }}>
          💳 {t("subTitle")}
        </h2>
        <LangToggle lang={lang} toggle={toggleLang} style={{ background:"#0b1220", border:"1px solid #1e293b" }} />
      </div>

      {/* Banners */}
      {expiringSoon && (
        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10,
                      padding:"14px 20px", color:"#92400e", fontWeight:700, marginBottom:16, fontSize:17 }}>
          ⚠️ Subscription expires in {days} day{days !== 1 ? "s" : ""}! Please renew soon.
        </div>
      )}
      {isExpired && (
        <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:10,
                      padding:"14px 20px", color:"#991b1b", fontWeight:700, marginBottom:16, fontSize:17 }}>
          🚫 Subscription has expired — users are currently blocked from the system.
        </div>
      )}
      {msg && (
        <div style={{
          background: msg.startsWith("✅") ? "#d1fae5" : "#fee2e2",
          border: `1px solid ${msg.startsWith("✅") ? "#6ee7b7" : "#fca5a5"}`,
          borderRadius:10, padding:"12px 18px",
          color: msg.startsWith("✅") ? "#065f46" : "#991b1b",
          fontWeight:700, marginBottom:16, fontSize:17,
        }}>{msg}</div>
      )}

      {/* Card */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e2e8f0",
                    overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>

        {/* Header strip */}
        <div style={{
          background: `linear-gradient(135deg, ${color}22, ${color}11)`,
          borderBottom:"1px solid #e2e8f0",
          padding:"20px 24px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
        }}>
          <div style={{ background:color, color:"#fff", borderRadius:10,
                        padding:"9px 22px", fontWeight:800, fontSize:19 }}>
            {planLabel}
          </div>
          <div style={{ background:statusMeta.bg, color:statusMeta.text, borderRadius:20,
                        padding:"5px 18px", fontWeight:700, fontSize:16 }}>
            {statusMeta.label}
          </div>
          {days !== null && (
            <div style={{ marginLeft:"auto", fontSize:17, fontWeight:700,
                          color: isExpired ? "#991b1b" : expiringSoon ? "#92400e" : "#064e3b" }}>
              {isExpired ? "Expired" : `${days} days remaining`}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding:"22px 24px" }}>
          {!editing ? (
            <>
              <Row label="Plan"          value={planLabel} />
              <Row label="Status"        value={statusMeta.label} />
              <Row label="Start Date"    value={sub.start_date?.substring(0,10) || "—"} />
              <Row label="End Date"      value={sub.end_date?.substring(0,10) || "—"} />
              <Row label="Price"         value={sub.price ? `${sub.price} ${sub.currency || "USD"} / month` : "—"} />
              <Row label="Plan Limits"   value={
                currentPlan
                  ? `${fmtLimit(currentPlan.max_branches)} branches · ${fmtLimit(currentPlan.max_users)} users`
                  : "—"
              } />
              {sub.notes && <Row label="Notes" value={sub.notes} />}
              <Row label="Last Updated"  value={sub.updated_by || "—"} />

              {isSuperAdmin ? (
                <button onClick={() => setEditing(true)} style={{
                  marginTop:20, background:"#3b82f6", color:"#fff",
                  border:"none", borderRadius:8, padding:"12px 28px",
                  fontWeight:700, fontSize:18, cursor:"pointer",
                }}>✏️ Edit Subscription</button>
              ) : (
                <div style={{ marginTop:16, fontSize:16, color:"#94a3b8" }}>
                  Contact your super-admin to modify subscription details.
                </div>
              )}
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <Field label="Plan">
                {plans.length > 0 ? (
                  <select value={form.plan} onChange={e => pickPlan(e.target.value)} style={selectStyle}>
                    {/* لو القيمة المخزّنة لا تطابق أي خطة حقيقية، اعرضها كي لا تُفقد */}
                    {!findPlan(plans, form.plan) && form.plan && (
                      <option value={form.plan}>{form.plan} (custom)</option>
                    )}
                    {plans.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                ) : (
                  <div style={{ fontSize:15, color:"#92400e", background:"#fef3c7",
                                border:"1px solid #fde68a", borderRadius:8, padding:"10px 14px" }}>
                    No plans defined yet. Create plans in the <strong>Plans</strong> tab first.
                  </div>
                )}
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} style={selectStyle}>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </Field>
              <Field label="Start Date">
                <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} style={inputStyle} />
              </Field>
              <Field label="End Date">
                <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} style={inputStyle} />
              </Field>
              <Field label="Price">
                <div style={{ display:"flex", gap:8 }}>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))}
                    placeholder="0.00" style={{ ...inputStyle, flex:1 }} />
                  <select value={form.currency} onChange={e => setForm(f => ({...f, currency: e.target.value}))}
                    style={{ ...selectStyle, width:90 }}>
                    <option>USD</option><option>AED</option><option>EUR</option><option>GBP</option>
                  </select>
                </div>
              </Field>
              <Field label="Notes">
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  rows={3} style={{ ...inputStyle, resize:"vertical" }} />
              </Field>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button onClick={save} disabled={saving} style={{
                  background:"#059669", color:"#fff", border:"none", borderRadius:8,
                  padding:"12px 28px", fontWeight:700, fontSize:18,
                  cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1,
                }}>
                  {saving ? "Saving…" : "✅ Save Changes"}
                </button>
                <button onClick={() => { setEditing(false); load(); }} style={{
                  background:"#f1f5f9", color:"#475569", border:"none", borderRadius:8,
                  padding:"12px 28px", fontWeight:700, fontSize:18, cursor:"pointer",
                }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plans comparison — الخطط الحقيقية من تبويب Plans */}
      {plans.length > 0 && (
        <div style={{ marginTop:28 }}>
          <h3 style={{ fontSize:18, fontWeight:700, color:"#475569", marginBottom:14 }}>Available Plans</h3>
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(plans.length, 3)},1fr)`, gap:12 }}>
            {plans.map((p, idx) => {
              const c        = planColor(idx);
              const isActive = currentPlan && p.id === currentPlan.id;
              return (
                <div key={p.id} style={{
                  background: isActive ? `${c}18` : "#fff",
                  border: `2px solid ${isActive ? c : "#e2e8f0"}`,
                  borderRadius:12, padding:"20px 16px", textAlign:"center",
                }}>
                  <div style={{ fontWeight:800, color:c, fontSize:19 }}>{p.name}</div>
                  <div style={{ fontSize:26, fontWeight:900, color:"#1e293b", margin:"10px 0 6px" }}>
                    {p.price > 0 ? `${p.price} ${p.currency}` : "Free"}
                  </div>
                  <div style={{ fontSize:15, color:"#64748b" }}>{fmtLimit(p.max_branches)} branches</div>
                  <div style={{ fontSize:15, color:"#64748b" }}>{fmtLimit(p.max_users)} users</div>
                  {isActive && (
                    <div style={{ marginTop:8, fontSize:14, color:c, fontWeight:700 }}>Current Plan</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
