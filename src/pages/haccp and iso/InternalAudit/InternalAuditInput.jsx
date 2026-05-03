// src/pages/haccp and iso/InternalAudit/InternalAuditInput.jsx
// Internal Audit — Input form (HACCP Clause 9.2)

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "internal_audit_record";

const empty = {
  auditDate: new Date().toISOString().slice(0, 10),
  auditNumber: "",
  scope: "",
  auditedDept: "",
  auditor: "",
  auditeeManager: "",
  criteria: "ISO 22000:2018 + HACCP Plan + DM Food Code",
  findings: [],
  conclusion: "",
};

const emptyFinding = {
  id: "",
  type: "OBS",
  clause: "",
  description: "",
  rootCause: "",
  correctiveAction: "",
  responsiblePerson: "",
  dueDate: "",
  closed: false,
};

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "#fef9c3" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #fde68a", boxShadow: "0 8px 22px rgba(245,158,11,0.10)" },
  title: { fontSize: 22, fontWeight: 950, color: "#854d0e" },
  sectionTitle: { fontSize: 14, fontWeight: 950, color: "#854d0e", margin: "12px 0 8px", borderBottom: "2px solid #f59e0b", paddingBottom: 4 },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#854d0e", marginBottom: 4, marginTop: 8 },
  input: { width: "100%", padding: "8px 10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit" },
  textarea: { width: "100%", padding: "9px 11px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 60, resize: "vertical" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  row4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 },
  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #f59e0b, #d97706)", color: "#fff", border: "#b45309" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      secondary: { bg: "#fff", color: "#854d0e", border: "#fde68a" },
      danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 };
  },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },
  finding: { background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: 12, marginTop: 10 },
};

export default function InternalAuditInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { t, lang, toggle, dir } = useHaccpLang();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const p = j?.payload || j?.data?.payload || {};
        setForm({ ...empty, ...p, findings: Array.isArray(p.findings) ? p.findings : [] });
      })
      .catch(() => {});
  }, [editId]);

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function addFinding() {
    setForm((f) => ({ ...f, findings: [...f.findings, { ...emptyFinding, id: `F-${Date.now()}` }] }));
  }
  function setFinding(idx, k, v) {
    setForm((f) => ({ ...f, findings: f.findings.map((x, i) => i === idx ? { ...x, [k]: v } : x) }));
  }
  function removeFinding(idx) {
    setForm((f) => ({ ...f, findings: f.findings.filter((_, i) => i !== idx) }));
  }

  async function save() {
    if (!form.auditDate) { alert(t("requiredField")); return; }
    setSaving(true);
    try {
      const url = editId ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}` : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const payload = { ...form, savedAt: Date.now() };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.auditor || "admin", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/internal-audit/view");
    } catch (e) {
      alert(t("saveError") + ": " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("auditTitle")}</div>
            <HaccpLinkBadge clauses={["9.2", "10.1"]} label={lang === "ar" ? "تدقيق + عدم مطابقة وإجراء تصحيحي" : "Audit + Non-conformity & Corrective Action"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/internal-audit/view")}>{t("past")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{t("auditPlan")}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("auditDate")}</label>
              <input type="date" style={S.input} value={form.auditDate} onChange={(e) => setField("auditDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("auditNumber")}</label>
              <input style={S.input} value={form.auditNumber} onChange={(e) => setField("auditNumber", e.target.value)} placeholder="IA-2026-Q2" />
            </div>
            <div>
              <label style={S.label}>{t("auditedDept")}</label>
              <input style={S.input} value={form.auditedDept} onChange={(e) => setField("auditedDept", e.target.value)} placeholder={t("auditedDeptPlaceholder")} />
            </div>
          </div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("auditor")}</label>
              <input style={S.input} value={form.auditor} onChange={(e) => setField("auditor", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("auditeeManager")}</label>
              <input style={S.input} value={form.auditeeManager} onChange={(e) => setField("auditeeManager", e.target.value)} />
            </div>
          </div>
          <label style={S.label}>{t("auditScope")}</label>
          <textarea style={S.textarea} value={form.scope} onChange={(e) => setField("scope", e.target.value)} placeholder={t("auditScopePlaceholder")} />
          <label style={S.label}>{t("auditCriteria")}</label>
          <input style={S.input} value={form.criteria} onChange={(e) => setField("criteria", e.target.value)} />
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{t("findingsCount", { n: form.findings.length })}</div>
          {form.findings.length === 0 && (
            <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8, color: "#64748b", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
              {t("noFindings")}
            </div>
          )}
          {form.findings.map((f, i) => (
            <div key={i} style={S.finding}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 950, color: "#854d0e", fontSize: 13 }}>{t("finding")} #{i + 1}</div>
                <button style={S.btn("danger")} onClick={() => removeFinding(i)}>{t("removeFinding")}</button>
              </div>
              <div style={S.row4}>
                <div>
                  <label style={S.label}>{t("findingType")}</label>
                  <select style={S.input} value={f.type} onChange={(e) => setFinding(i, "type", e.target.value)}>
                    <option value="MAJOR">{t("typeMajor")}</option>
                    <option value="MINOR">{t("typeMinor")}</option>
                    <option value="OBS">{t("typeObs")}</option>
                    <option value="OFI">{t("typeOfi")}</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>{t("findingClause")}</label>
                  <input style={S.input} value={f.clause} onChange={(e) => setFinding(i, "clause", e.target.value)} placeholder="8.5 / 7.2..." />
                </div>
                <div>
                  <label style={S.label}>{t("findingResponsible")}</label>
                  <input style={S.input} value={f.responsiblePerson} onChange={(e) => setFinding(i, "responsiblePerson", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>{t("findingDueDate")}</label>
                  <input type="date" style={S.input} value={f.dueDate} onChange={(e) => setFinding(i, "dueDate", e.target.value)} />
                </div>
              </div>
              <label style={S.label}>{t("findingDescription")}</label>
              <textarea style={S.textarea} value={f.description} onChange={(e) => setFinding(i, "description", e.target.value)} />
              <label style={S.label}>{t("findingRootCause")}</label>
              <textarea style={S.textarea} value={f.rootCause} onChange={(e) => setFinding(i, "rootCause", e.target.value)} />
              <label style={S.label}>{t("findingCorrective")}</label>
              <textarea style={S.textarea} value={f.correctiveAction} onChange={(e) => setFinding(i, "correctiveAction", e.target.value)} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 13, fontWeight: 800, color: "#15803d", cursor: "pointer" }}>
                <input type="checkbox" checked={!!f.closed} onChange={(e) => setFinding(i, "closed", e.target.checked)} />
                {t("findingClosed")}
              </label>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <button style={S.btn("primary")} onClick={addFinding}>{t("addFinding")}</button>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{t("auditConclusion")}</div>
          <textarea style={S.textarea} value={form.conclusion} onChange={(e) => setField("conclusion", e.target.value)} placeholder={t("auditConclusionPlaceholder")} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>{t("cancel")}</button>
          <button style={S.btn("success")} onClick={save} disabled={saving}>
            {saving ? t("saving") : t("auditSaveBtn")}
          </button>
        </div>
      </div>
    </main>
  );
}
