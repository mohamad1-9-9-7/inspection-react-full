// src/pages/generic/GenericIndustryApp.jsx
// المحرّك العام لأي شركة نوعها ليس 'meat'. يبني الداشبورد + قائمة السجلات +
// نموذج الإدخال من ملف قالب النشاط (src/industries/*). لا يمسّ نظام المواشي
// إطلاقاً؛ يُوصل إليه فقط عندما تكون الشركة الفعّالة على نشاط له قالب.
//
// كل البيانات تمرّ عبر /api/reports العادي (type + payload)، فالعزل بالشركة
// يحصل تلقائياً: authFetch يُلحق ?company_id للسوبر أدمن، وتوكن الموظف العادي
// يحمل شركته. لا حاجة لأي مسار سيرفر جديد.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../config/api";
import logo from "../../assets/almawashi-logo.jpg";
import { clearAppSession } from "../../utils/authFetch";
import { getActiveCompany, getActiveIndustry, clearActiveCompany } from "../../utils/companyContext";
import { getIndustryTemplate, findReportType } from "../../industries";

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
}

export default function GenericIndustryApp() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const currentUser = getCurrentUser();
  const isSuperAdmin = !!currentUser.isSuperAdmin;

  const industry = getActiveIndustry();
  const template = getIndustryTemplate(industry);

  // نوع الشركة 'meat' أو غير معروف → هذا المحرّك لا يخصّه، رجّعه لنظامه.
  useEffect(() => {
    if (!template) navigate("/named-dashboard", { replace: true });
  }, [template, navigate]);
  if (!template) return null;

  const activeType = params.get("type") || null;
  const mode = params.get("mode") || null; // "new" | "edit" | null
  const editId = params.get("id") || null;

  const companyName = isSuperAdmin
    ? (getActiveCompany()?.name || template.label)
    : (currentUser.displayName || template.label);

  const setView = (next) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      ["type", "mode", "id"].forEach((k) => p.delete(k));
      if (next?.type) p.set("type", next.type);
      if (next?.mode) p.set("mode", next.mode);
      if (next?.id) p.set("id", next.id);
      return p;
    });
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username }),
      });
    } catch {}
    clearAppSession();
    navigate("/", { replace: true });
  };

  const found = activeType ? findReportType(template, activeType) : null;

  return (
    <main className="gia" style={S.page} dir="rtl">
      {/* globals.css يفرض #root * {font-size:14px !important} فيسطّح كل حجم
          inline. صنف مضاعف (.gia.gia) يتفوّق عليه فترجع الهرمية. */}
      <style>{`
        #root .gia.gia h1{font-size:24px !important}
        #root .gia.gia h2{font-size:22px !important}
        #root .gia.gia .gia-ct{font-size:17px !important}
      `}</style>
      <header style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.brand}>
            <img src={logo} alt="" style={S.logo} />
            <div style={{ minWidth: 0 }}>
              <p style={S.eyebrow}>{template.icon} {template.label}</p>
              <h1 style={S.title}>{companyName}</h1>
            </div>
          </div>
          <div style={S.heroActions}>
            {activeType && (
              <button style={S.btn} onClick={() => setView(null)}>▸ كل التقارير</button>
            )}
            {isSuperAdmin && (
              <button style={S.btn} onClick={() => { clearActiveCompany(); navigate("/select-company"); }}>
                🏢 تبديل الشركة
              </button>
            )}
            <button style={S.btnDanger} onClick={logout}>خروج</button>
          </div>
        </div>
      </header>

      <div style={S.body}>
        {!activeType && <Dashboard template={template} onOpen={(t) => setView({ type: t })} />}
        {activeType && found && !mode && (
          <ReportList
            def={found.report}
            onNew={() => setView({ type: activeType, mode: "new" })}
            onEdit={(id) => setView({ type: activeType, mode: "edit", id })}
          />
        )}
        {activeType && found && (mode === "new" || mode === "edit") && (
          <ReportForm
            def={found.report}
            editId={mode === "edit" ? editId : null}
            onDone={() => setView({ type: activeType })}
            onCancel={() => setView({ type: activeType })}
          />
        )}
      </div>
      <footer style={S.footer}>Built by Eng. Mohammed Abdullah</footer>
    </main>
  );
}

/* ── الداشبورد: الأقسام وتحتها أنواع التقارير ── */
function Dashboard({ template, onOpen }) {
  return (
    <>
      {template.sections.map((section) => (
        <section key={section.id} style={{ marginBottom: 26 }}>
          <div style={S.sectionHead}>
            <span>{section.icon} {section.label}</span>
          </div>
          <div style={S.grid}>
            {section.reports.map((r) => (
              <button key={r.type} style={S.card} onClick={() => onOpen(r.type)}>
                <div style={{ ...S.cardIcon, background: section.grad || "#0f766e" }}>{section.icon}</div>
                <div className="gia-ct" style={S.cardTitle}>{r.label}</div>
                {r.desc && <div style={S.cardDesc}>{r.desc}</div>}
                <div style={S.cardOpen}>فتح ←</div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

/* ── قائمة سجلات نوع تقرير واحد ── */
function ReportList({ def, onNew, onEdit }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(def.type)}`, { cache: "no-store" });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.data || [];
      arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setRows(arr);
    } catch {
      setErr("تعذّر تحميل السجلات.");
    }
    setLoading(false);
  }, [def.type]);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!window.confirm("حذف هذا السجل؟")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok !== false) load();
      else alert("تعذّر الحذف.");
    } catch { alert("تعذّر الحذف."); }
  };

  // نعرض أول 4 حقول كأعمدة، حتى يبقى الجدول مقروءاً.
  const cols = def.fields.slice(0, 4);

  return (
    <div>
      <div style={S.listHead}>
        <h2 style={S.listTitle}>{def.label}</h2>
        <button style={S.btnPrimary} onClick={onNew}>+ سجل جديد</button>
      </div>

      {loading ? (
        <div style={S.empty}>جارٍ التحميل…</div>
      ) : err ? (
        <div style={{ ...S.empty, color: "#b91c1c" }}>{err}</div>
      ) : rows.length === 0 ? (
        <div style={S.empty}>لا سجلات بعد. اضغط «سجل جديد» للبدء.</div>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {cols.map((f) => <th key={f.key} style={S.th}>{f.label}</th>)}
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {cols.map((f) => (
                    <td key={f.key} style={S.td}>{formatVal(row.payload?.[f.key])}</td>
                  ))}
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                    <button style={S.linkBtn} onClick={() => onEdit(row.id)}>تعديل</button>
                    <button style={{ ...S.linkBtn, color: "#b91c1c" }} onClick={() => del(row.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── نموذج إدخال/تعديل مبني من الحقول ── */
function ReportForm({ def, editId, onDone, onCancel }) {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" });
        const d = await res.json();
        setValues(d?.report?.payload || {});
      } catch { setErr("تعذّر تحميل السجل."); }
      setLoading(false);
    })();
  }, [editId]);

  const set = (k, v) => setValues((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    for (const f of def.fields) {
      if (f.required && !String(values[f.key] ?? "").trim()) {
        setErr(`الحقل «${f.label}» مطلوب.`);
        return;
      }
    }
    setSaving(true);
    try {
      let res;
      if (editId) {
        res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: def.type, payload: values }),
        });
      } else {
        res = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: def.type, payload: values }),
        });
      }
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok !== false) onDone();
      else setErr(d.error || "تعذّر الحفظ.");
    } catch { setErr("تعذّر الاتصال بالخادم."); }
    setSaving(false);
  };

  if (loading) return <div style={S.empty}>جارٍ التحميل…</div>;

  return (
    <form onSubmit={submit} style={S.formCard}>
      <h2 style={S.listTitle}>{editId ? "تعديل" : "سجل جديد"} — {def.label}</h2>
      <div style={S.formGrid}>
        {def.fields.map((f) => (
          <label key={f.key} style={f.type === "textarea" ? { gridColumn: "1 / -1" } : undefined}>
            <span style={S.fieldLabel}>{f.label}{f.required ? " *" : ""}</span>
            <FieldInput field={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
          </label>
        ))}
      </div>
      {err && <div style={S.formErr}>⚠️ {err}</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button type="submit" disabled={saving} style={S.btnPrimary}>
          {saving ? "جارٍ الحفظ…" : editId ? "حفظ التعديل" : "حفظ"}
        </button>
        <button type="button" style={S.btn} onClick={onCancel}>إلغاء</button>
      </div>
    </form>
  );
}

function FieldInput({ field, value, onChange }) {
  const v = value ?? "";
  if (field.type === "textarea")
    return <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }} value={v} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "select")
    return (
      <select style={S.input} value={v} onChange={(e) => onChange(e.target.value)}>
        <option value="">— اختر —</option>
        {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  if (field.type === "checkbox")
    return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20 }} />;
  return <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                style={S.input} value={v} onChange={(e) => onChange(e.target.value)} />;
}

function formatVal(v) {
  if (v === true) return "✓";
  if (v === false || v == null || v === "") return "—";
  return String(v);
}

const S = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg,#f8fafc,#eef7f4 44%,#f8fafc)", color: "#0f172a", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' },
  hero: { background: "linear-gradient(135deg,rgba(15,23,42,.96),rgba(190,24,93,.9) 55%,rgba(219,39,119,.9))", color: "#fff", padding: "22px clamp(16px,4vw,48px)" },
  heroInner: { width: "min(1200px,100%)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  brand: { display: "flex", alignItems: "center", gap: 14, minWidth: 0 },
  logo: { width: 54, height: 54, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,.3)", background: "#fff" },
  eyebrow: { margin: 0, fontWeight: 800, opacity: .85 },
  title: { margin: "4px 0 0", fontWeight: 1000, fontSize: 24 },
  heroActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  btn: { minHeight: 42, padding: "0 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.14)", color: "#fff", fontWeight: 800, cursor: "pointer" },
  btnDanger: { minHeight: 42, padding: "0 16px", borderRadius: 8, border: "1px solid rgba(254,202,202,.35)", background: "rgba(220,38,38,.34)", color: "#fff", fontWeight: 800, cursor: "pointer" },
  body: { width: "min(1200px,100%)", margin: "0 auto", padding: "26px clamp(16px,4vw,48px)" },
  sectionHead: { fontWeight: 1000, color: "#334155", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: 16 },
  card: { display: "grid", gap: 10, textAlign: "start", padding: "20px 22px", borderRadius: 10, background: "#fff", border: "1px solid rgba(15,23,42,.12)", boxShadow: "0 12px 30px rgba(15,23,42,.08)", cursor: "pointer" },
  cardIcon: { width: 48, height: 48, borderRadius: 8, display: "grid", placeItems: "center", color: "#fff", fontSize: 22 },
  cardTitle: { fontWeight: 950, fontSize: 17 },
  cardDesc: { color: "#64748b", fontWeight: 600, fontSize: 13, lineHeight: 1.5 },
  cardOpen: { color: "#be185d", fontWeight: 900 },
  listHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" },
  listTitle: { margin: 0, fontWeight: 1000, fontSize: 22 },
  btnPrimary: { minHeight: 44, padding: "0 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#be185d,#db2777)", color: "#fff", fontWeight: 950, cursor: "pointer" },
  empty: { padding: 40, textAlign: "center", background: "#fff", border: "1px solid rgba(15,23,42,.12)", borderRadius: 10, color: "#64748b", fontWeight: 700 },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid rgba(15,23,42,.12)", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "start", padding: "12px 14px", background: "#f8fafc", color: "#475569", fontWeight: 900, fontSize: 13, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  td: { padding: "11px 14px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, color: "#1e293b" },
  linkBtn: { border: "none", background: "none", color: "#be185d", fontWeight: 900, cursor: "pointer", padding: "4px 8px" },
  formCard: { background: "#fff", border: "1px solid rgba(15,23,42,.12)", borderRadius: 10, padding: "24px clamp(16px,3vw,30px)", boxShadow: "0 12px 30px rgba(15,23,42,.08)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 },
  fieldLabel: { display: "block", fontWeight: 800, color: "#475569", marginBottom: 6 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #dbe4ef", background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", fontWeight: 700, boxSizing: "border-box" },
  formErr: { marginTop: 14, padding: "12px 14px", borderRadius: 8, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", fontWeight: 800 },
  footer: { textAlign: "center", padding: 24, color: "#94a3b8", fontWeight: 800 },
};
