// src/pages/settings/PromoCodesTab.jsx
// Platform Center → Promo codes. One code per person who brings customers
// (a consultant, a friend, a partner): the owner writes the code, its discount,
// who holds it, how long it lasts and any notes, then sends that person a link
// (/demo?code=XYZ). Every demo request or free trial that came with the code is
// listed under it — that is how the owner knows who brought which customers.
// English or Arabic, following the Platform Center's one language button.
//
// Server: routes/promoCodes.cjs in the inspection-server repo
// (GET/POST /api/promo-codes, PATCH/DELETE /api/promo-codes/:id, super-admin).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { Button, ConfirmModal, StatusMessage, ui } from "./_shared/SettingsUIKit";
import { useSettingsLang } from "./_shared/settingsI18n";
import { getPublicOrigin } from "../../config/publicOrigin";
import { DEMO_STATUSES } from "./DemoRequestsTab";

const todayDubai = () => new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10);
const EMPTY = { code: "", kind: "pct", amount: "", holder: "", holderPhone: "", notes: "", expiresAt: "", maxUses: "", active: true };

const norm = (r = {}) => ({
  id: r.id,
  code: r.code || "",
  kind: r.kind === "aed" ? "aed" : "pct",
  amount: Number(r.amount) || 0,
  holder: r.holder || "",
  holderPhone: r.holder_phone || "",
  notes: r.notes || "",
  active: r.active !== false,
  expiresAt: r.expires_at || "",
  maxUses: r.max_uses ?? null,
  uses: Number(r.uses) || 0,
  createdAt: r.created_at || "",
});

async function readJson(res, fallback) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw new Error(j.error || `${fallback} (${res.status})`);
  return j;
}

const waNumber = (phone) => {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "971" + d.slice(1); // local UAE number
  return d;
};

/* A starting suggestion from the holder's name (Latin letters only), else random. */
function suggestCode(holder) {
  const latin = String(holder || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 10);
  const n = Math.floor(10 + Math.random() * 90);
  if (latin.length >= 3) return `${latin}${n}`;
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `IP-${Array.from({ length: 5 }, () => abc[Math.floor(Math.random() * abc.length)]).join("")}`;
}

export default function PromoCodesTab() {
  const { lang, dir } = useSettingsLang();
  const L = useCallback((en, ar) => (lang === "ar" ? ar : en), [lang]);
  const [codes, setCodes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState(null); // null = closed; { ...EMPTY, id? } = adding / editing
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [query, setQuery] = useState("");

  const origin = getPublicOrigin();
  const linkOf = (code) => `${origin}/demo?code=${encodeURIComponent(code)}`;
  const offText = (c) => (c.kind === "aed"
    ? L(`AED ${c.amount} off / branch / month · first year`, `خصم ${c.amount} درهم لكل فرع شهريًا · السنة الأولى`)
    : L(`${c.amount} % off · first year`, `خصم ${c.amount}% · السنة الأولى`));

  const ERR = {
    bad_code: L("The code must be 3–30 letters or numbers (- and _ allowed).", "الكود لازم يكون من 3 إلى 30 حرف إنجليزي أو رقم (مسموح - و _)."),
    bad_amount: L("Discount: 1–90 for percent, 1–1000 for AED.", "الخصم: من 1 إلى 90 للنسبة، ومن 1 إلى 1000 للدرهم."),
    bad_date: L("Invalid expiry date.", "تاريخ الانتهاء غير صحيح."),
    bad_max_uses: L("Max uses must be a whole number from 1.", "الحد الأقصى للاستخدام لازم يكون رقم صحيح من 1 وطالع."),
    code_taken: L("This code already exists — pick another.", "هالكود موجود — اختار غيره."),
  };
  const errText = (e) => ERR[e.message] || e.message;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/promo-codes`, { cache: "no-store" });
      if (res.status === 404) throw new Error(L("The server has no /api/promo-codes yet — deploy the server part first.", "السيرفر ما فيه /api/promo-codes لسا — انشر جزء السيرفر أولاً."));
      const j = await readJson(res, L("Could not load promo codes", "تعذّر تحميل الأكواد"));
      setCodes((j.codes || []).map(norm));
      setLeads(j.leads || []);
      setMsg(null);
    } catch (e) {
      setMsg({ kind: "err", text: `❌ ${e.message}` });
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const leadsByCode = useMemo(() => {
    const m = {};
    leads.forEach((l) => { (m[l.promo_code] = m[l.promo_code] || []).push(l); });
    return m;
  }, [leads]);

  const stateOf = (c) => {
    if (!c.active) return { k: "off", label: L("Disabled", "معطّل"), color: "#64748b", bg: "#f1f5f9" };
    if (c.expiresAt && c.expiresAt < todayDubai()) return { k: "expired", label: L("Expired", "منتهي"), color: "#b91c1c", bg: "#fee2e2" };
    if (c.maxUses != null && c.uses >= c.maxUses) return { k: "full", label: L("Used up", "استُهلك"), color: "#b45309", bg: "#fef3c7" };
    return { k: "on", label: L("Active", "فعّال"), color: "#047857", bg: "#d1fae5" };
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return codes.filter((c) => !q || [c.code, c.holder, c.holderPhone, c.notes].some((v) => String(v).toLowerCase().includes(q)));
  }, [codes, query]);

  const totals = useMemo(() => {
    const won = leads.filter((l) => l.status === "won").length;
    return { active: codes.filter((c) => stateOf(c).k === "on").length, leads: leads.length, won };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes, leads]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        code: form.code, kind: form.kind, amount: Number(form.amount), holder: form.holder,
        holderPhone: form.holderPhone, notes: form.notes, expiresAt: form.expiresAt || "",
        maxUses: form.maxUses === "" ? null : Number(form.maxUses), active: form.active,
      };
      const res = await fetch(`${API_BASE}/api/promo-codes${form.id ? `/${form.id}` : ""}`, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await readJson(res, L("Save failed", "فشل الحفظ"));
      const saved = norm(j.code);
      setCodes((prev) => (form.id ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev]));
      // A renamed code keeps its leads on the server; mirror that here.
      if (form.id && form.oldCode && form.oldCode !== saved.code) {
        setLeads((prev) => prev.map((l) => (l.promo_code === form.oldCode ? { ...l, promo_code: saved.code } : l)));
      }
      setForm(null);
      setMsg({ kind: "ok", text: `✅ ${form.id ? L("Code updated", "انعدّل الكود") : L("Code created", "انضاف الكود")}: ${saved.code}` });
    } catch (err) {
      setMsg({ kind: "err", text: `❌ ${errText(err)}` });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c) => {
    try {
      const res = await fetch(`${API_BASE}/api/promo-codes/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !c.active }),
      });
      const j = await readJson(res, L("Update failed", "فشل التحديث"));
      const saved = norm(j.code);
      setCodes((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
      setMsg({ kind: "ok", text: `✅ ${saved.code}: ${saved.active ? L("enabled", "تفعّل") : L("disabled", "تعطّل")}` });
    } catch (err) {
      setMsg({ kind: "err", text: `❌ ${errText(err)}` });
    }
  };

  const remove = async (c) => {
    try {
      const res = await fetch(`${API_BASE}/api/promo-codes/${c.id}`, { method: "DELETE" });
      await readJson(res, L("Delete failed", "فشل الحذف"));
      setCodes((prev) => prev.filter((x) => x.id !== c.id));
      setMsg({ kind: "ok", text: `✅ ${L("Deleted", "انحذف")} ${c.code}` });
    } catch (err) {
      setMsg({ kind: "err", text: `❌ ${errText(err)}` });
    }
  };

  const copy = async (c) => {
    const link = linkOf(c.code);
    try { await navigator.clipboard.writeText(link); setMsg({ kind: "ok", text: `✅ ${L("Copied", "انتسخ")} ${link}` }); }
    catch { setMsg({ kind: "info", text: link }); }
  };

  const waHref = (c) => {
    const d = waNumber(c.holderPhone);
    const hi = c.holder ? L(`Hi ${c.holder},`, `مرحبا ${c.holder}،`) : L("Hi,", "مرحبا،");
    const text = [
      hi,
      L(`Here is your personal INSPECT PRO code: ${c.code} (${offText(c)}).`, `هذا كودك الخاص من INSPECT PRO: ${c.code} (${offText(c)}).`),
      L("Share this link with the food businesses you know — the discount is applied automatically:", "شارك هالرابط مع مطاعم ومحلات الأغذية اللي بتعرفها — الخصم بيتطبّق تلقائياً:"),
      linkOf(c.code),
      c.expiresAt ? L(`Valid until ${c.expiresAt}.`, `صالح حتى ${c.expiresAt}.`) : "",
    ].filter(Boolean).join("\n");
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
  };

  const put = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const statusOf = (v) => DEMO_STATUSES.find((s) => s.v === v) || DEMO_STATUSES[0];

  return (
    <div style={ui.page} dir={dir}>
      <div style={ui.toolbar}>
        <p style={{ ...ui.subtitle, margin: 0 }}>
          {L("Make a different code for each person who brings you customers, send them their link, and see who came through it.",
            "اعمل كود مختلف لكل شخص بيجبلك عملاء، ابعتله رابطه، وشوف مين إجا عن طريقه.")}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button tone="primary" onClick={() => setForm({ ...EMPTY })}>＋ {L("New code", "كود جديد")}</Button>
          <Button onClick={load} disabled={loading}>↻ {L("Refresh", "تحديث")}</Button>
        </div>
      </div>

      <StatusMessage message={msg} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
        <Stat label={L("Active codes", "أكواد فعّالة")} value={totals.active} color="#0f766e" />
        <Stat label={L("Leads that came with a code", "طلبات إجت بكود")} value={totals.leads} color="#2563eb" />
        <Stat label={L("Became customers", "صاروا عملاء")} value={totals.won} color="#059669" />
      </div>

      {form && (
        <form onSubmit={save} style={{ ...ui.card, padding: 16, borderTop: "3px solid #0f766e" }}>
          <b style={{ fontSize: 16 }}>{form.id ? L("Edit code", "تعديل الكود") : L("New code", "كود جديد")}</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 12 }}>
            <Field label={L("Who is it for?", "لمين الكود؟")}>
              <input value={form.holder} onChange={put("holder")} maxLength={120} placeholder={L("e.g. Tawfiq", "مثلاً توفيق")} style={inp} />
            </Field>
            <Field label={L("Their phone (WhatsApp)", "رقمه (واتساب)")}>
              <input value={form.holderPhone} onChange={put("holderPhone")} maxLength={40} dir="ltr" placeholder="05x xxx xxxx" style={inp} />
            </Field>
            <Field label={L("Code", "الكود")}>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  required value={form.code} maxLength={30} dir="ltr"
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, "") }))}
                  placeholder="TAWFIQ10" style={{ ...inp, fontWeight: 900, letterSpacing: ".05em" }}
                />
                <Button type="button" onClick={() => setForm((f) => ({ ...f, code: suggestCode(f.holder) }))} title={L("Suggest a code", "اقترح كود")}>🎲</Button>
              </div>
            </Field>
            <Field label={L("Discount", "الخصم")}>
              <div style={{ display: "flex", gap: 6 }}>
                <input required type="number" min={1} max={form.kind === "pct" ? 90 : 1000} step="any" value={form.amount} onChange={put("amount")} dir="ltr" style={{ ...inp, width: 100 }} />
                <select value={form.kind} onChange={put("kind")} style={{ ...inp, flex: 1 }}>
                  <option value="pct">{L("% off", "% نسبة")}</option>
                  <option value="aed">{L("AED off / branch / month", "درهم لكل فرع شهريًا")}</option>
                </select>
              </div>
            </Field>
            <Field label={L("Valid until (empty = no end)", "صالح لغاية (فاضي = بدون نهاية)")}>
              <input type="date" value={form.expiresAt} onChange={put("expiresAt")} style={inp} />
            </Field>
            <Field label={L("Max uses (empty = unlimited)", "أقصى عدد استخدام (فاضي = بلا حد)")}>
              <input type="number" min={1} value={form.maxUses} onChange={put("maxUses")} dir="ltr" style={inp} />
            </Field>
          </div>
          <Field label={L("My notes", "ملاحظاتي")} style={{ marginTop: 12 }}>
            <textarea value={form.notes} onChange={put("notes")} maxLength={2000} style={{ ...inp, minHeight: 70, resize: "vertical" }}
              placeholder={L("e.g. agreed 10 % commission on each customer", "مثلاً متفقين على عمولة 10% على كل عميل")} />
          </Field>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontWeight: 800 }}>
            <input type="checkbox" checked={form.active} onChange={put("active")} /> {L("Active", "فعّال")}
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <Button tone="primary" type="submit" disabled={saving}>{saving ? "…" : L("Save", "حفظ")}</Button>
            <Button type="button" onClick={() => setForm(null)}>{L("Cancel", "إلغاء")}</Button>
          </div>
        </form>
      )}

      <div style={{ ...ui.toolbar, justifyContent: "flex-start" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L("Search code, name, phone, notes…", "ابحث بالكود، الاسم، الرقم، الملاحظات…")}
          style={{ ...ui.input, flex: "1 1 220px", maxWidth: 360, minHeight: 38 }} />
      </div>

      {loading ? (
        <div style={{ ...ui.subtleCard, textAlign: "center", fontWeight: 800, color: "#64748b" }}>{L("Loading…", "جاري التحميل…")}</div>
      ) : !shown.length ? (
        <div style={{ ...ui.subtleCard, textAlign: "center", fontWeight: 800, color: "#64748b" }}>
          {codes.length ? L("No codes match.", "ما في أكواد مطابقة.") : L("No codes yet. Press “New code” to make the first one.", "ما في أكواد بعد. اضغط «كود جديد» لتعمل أول واحد.")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {shown.map((c) => {
            const st = stateOf(c);
            const its = leadsByCode[c.code] || [];
            const won = its.filter((l) => l.status === "won").length;
            const open = openId === c.id;
            return (
              <div key={c.id} style={{ ...ui.card, marginBottom: 0, padding: 14, borderInlineStart: `4px solid ${st.color}` }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <b dir="ltr" style={{ fontSize: 18, letterSpacing: ".05em" }}>{c.code}</b>
                      <span style={{ padding: "1px 9px", borderRadius: 999, background: st.bg, color: st.color, fontWeight: 900, fontSize: 12.5 }}>{st.label}</span>
                      <span style={{ padding: "1px 9px", borderRadius: 999, background: "#ccfbf1", color: "#0f766e", fontWeight: 900, fontSize: 12.5 }}>{offText(c)}</span>
                    </div>
                    <div style={{ color: "#334155", fontWeight: 750, marginTop: 4 }}>
                      {c.holder || L("(no name)", "(بدون اسم)")}
                      {c.holderPhone && <span dir="ltr" style={{ color: "#64748b" }}> · {c.holderPhone}</span>}
                      <span style={{ color: "#94a3b8" }}>
                        {" "}· {c.expiresAt ? L(`until ${c.expiresAt}`, `لغاية ${c.expiresAt}`) : L("no end date", "بدون تاريخ انتهاء")}
                        {" "}· {L("used", "استُخدم")} {c.uses}{c.maxUses != null ? ` / ${c.maxUses}` : ""}
                        {won > 0 && <> · <span style={{ color: "#047857", fontWeight: 900 }}>{won} {L("won", "اشتركوا")}</span></>}
                      </span>
                    </div>
                    {c.notes && <div style={{ color: "#64748b", fontWeight: 650, marginTop: 4, whiteSpace: "pre-wrap" }}>📝 {c.notes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Button onClick={() => copy(c)}>🔗 {L("Copy link", "نسخ الرابط")}</Button>
                    {waNumber(c.holderPhone) && (
                      <a href={waHref(c)} target="_blank" rel="noreferrer" style={{ ...linkBtn, color: "#15803d" }}>{L("Send on WhatsApp", "ابعت واتساب")}</a>
                    )}
                    <Button onClick={() => setOpenId(open ? null : c.id)} disabled={!its.length}>👥 {its.length}</Button>
                    <Button onClick={() => toggle(c)}>{c.active ? L("Disable", "تعطيل") : L("Enable", "تفعيل")}</Button>
                    <Button onClick={() => setForm({ ...EMPTY, ...c, oldCode: c.code, amount: String(c.amount), maxUses: c.maxUses == null ? "" : String(c.maxUses) })}>✏️</Button>
                    <Button tone="danger" onClick={() => setPendingDelete(c)} title={L("Delete", "حذف")}>🗑</Button>
                  </div>
                </div>
                {open && its.length > 0 && (
                  <div style={{ ...ui.subtleCard, marginTop: 10, marginBottom: 0, display: "grid", gap: 6 }}>
                    {its.map((l) => {
                      const s = statusOf(l.status);
                      return (
                        <div key={l.id} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontWeight: 750 }}>
                          <span style={{ padding: "1px 8px", borderRadius: 999, background: s.bg, color: s.color, fontWeight: 900, fontSize: 12.5 }}>{lang === "ar" ? s.ar : s.label}</span>
                          <b>{l.company_name || "—"}</b>
                          <span style={{ color: "#475569" }}>{l.contact_name}</span>
                          <span dir="ltr" style={{ color: "#64748b" }}>{l.phone}</span>
                          <span style={{ color: "#94a3b8" }}>{String(l.created_at || "").slice(0, 10)}{String(l.source || "").startsWith("trial") ? ` · ${L("free trial", "تجربة مجانية")}` : ""}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title={L("Delete this code?", "حذف هالكود؟")}
        body={pendingDelete ? L(
          `${pendingDelete.code} stops working right away. The ${pendingDelete.uses} request(s) that came with it stay in Demo Requests. To pause it instead, use Disable.`,
          `${pendingDelete.code} رح يوقف فوراً. الطلبات اللي إجت فيه (${pendingDelete.uses}) بتضل بطلبات العرض. إذا بدك توقفه مؤقتاً استعمل «تعطيل».`) : ""}
        confirmText={L("Delete", "حذف")}
        cancelText={L("Cancel", "إلغاء")}
        onConfirm={() => { const c = pendingDelete; setPendingDelete(null); remove(c); }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

const inp = { ...ui.input, minHeight: 40, width: "100%", boxSizing: "border-box" };
const linkBtn = { display: "inline-flex", alignItems: "center", minHeight: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 850, textDecoration: "none", color: "#0f172a" };

function Field({ label, children, style }) {
  return (
    <label style={{ display: "grid", gap: 6, fontWeight: 800, color: "#334155", ...style }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ ...ui.card, marginBottom: 0, padding: "12px 14px", borderTop: `3px solid ${color}` }}>
      <div style={{ color: "#64748b", fontWeight: 800, fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: 1000, fontSize: 24, marginTop: 4 }}>{value}</div>
    </div>
  );
}
