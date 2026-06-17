import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";

const TYPE = "legal_register";

const empty = {
  requirementTitle: "",
  sourceAuthority: "",
  referenceNumber: "",
  category: "Food Safety",
  applicableArea: "",
  requirementSummary: "",
  responsibleOwner: "",
  complianceEvidence: "",
  evidenceLocation: "",
  status: "Compliant",
  reviewFrequency: "Annual",
  lastReviewDate: new Date().toISOString().slice(0, 10),
  nextReviewDate: "",
  actionRequired: "",
  notes: "",
};

const S = {
  shell: {
    minHeight: "100vh",
    padding: "24px clamp(18px, 3vw, 48px) 48px",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)",
    color: "#0f172a",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  layout: { width: "min(1760px, 100%)", margin: "0 auto" },
  hero: {
    position: "relative",
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 24,
    alignItems: "center",
    minHeight: 210,
    padding: "30px clamp(22px, 4vw, 56px)",
    borderRadius: 8,
    background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,118,110,0.94) 52%, rgba(8,145,178,0.92))",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.20)",
    boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
    marginBottom: 18,
  },
  eyebrow: { color: "rgba(255,255,255,0.78)", fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase" },
  title: { color: "#fff", fontWeight: 1000, lineHeight: 1.05, marginTop: 14 },
  subtitle: { color: "rgba(255,255,255,0.78)", fontWeight: 800, lineHeight: 1.45, marginTop: 12, maxWidth: 900 },
  heroPanel: {
    minWidth: 320,
    padding: 18,
    borderRadius: 8,
    background: "rgba(255,255,255,0.13)",
    border: "1px solid rgba(255,255,255,0.22)",
    backdropFilter: "blur(12px)",
    fontWeight: 850,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.45,
  },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  card: {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    padding: 22,
    marginBottom: 16,
  },
  sectionTitle: { color: "#0f766e", fontWeight: 1000, marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #ccfbf1" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 },
  field: { minWidth: 0 },
  label: { display: "block", color: "#334155", fontWeight: 950, marginBottom: 7 },
  hint: { color: "#64748b", fontWeight: 750, marginTop: 6, lineHeight: 1.35 },
  input: {
    width: "100%",
    minHeight: 54,
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.16)",
    background: "#f8fafc",
    color: "#0f172a",
    fontWeight: 850,
    fontFamily: "inherit",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: 112,
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.16)",
    background: "#f8fafc",
    color: "#0f172a",
    fontWeight: 800,
    lineHeight: 1.55,
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
  },
  select: {
    width: "100%",
    minHeight: 54,
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.16)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 900,
    fontFamily: "inherit",
    outline: "none",
  },
  btn: (kind = "secondary") => {
    const styles = {
      primary: { background: "#0f766e", color: "#fff", border: "#0f766e" },
      secondary: { background: "#fff", color: "#334155", border: "rgba(15,23,42,0.14)" },
      success: { background: "#16a34a", color: "#fff", border: "#16a34a" },
    };
    const c = styles[kind] || styles.secondary;
    return {
      minHeight: 52,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px 18px",
      borderRadius: 8,
      border: `1px solid ${c.border}`,
      background: c.background,
      color: c.color,
      fontWeight: 950,
      cursor: "pointer",
      fontFamily: "inherit",
      boxShadow: kind === "primary" ? "0 14px 28px rgba(15,118,110,0.22)" : "0 10px 20px rgba(15,23,42,0.07)",
    };
  },
};

function Field({ label, hint, children }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      {children}
      {hint && <div style={S.hint}>{hint}</div>}
    </div>
  );
}

export default function LegalRegisterInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setForm({ ...empty, ...(j?.payload || j?.data?.payload || {}) }))
      .catch(() => {});
  }, [editId]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!form.requirementTitle.trim() || !form.sourceAuthority.trim() || !form.responsibleOwner.trim()) {
      alert("Please complete Requirement Title, Source / Authority, and Responsible Owner.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, savedAt: Date.now() };
      const url = editId
        ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}`
        : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.responsibleOwner || "QA", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/legal-register/view");
    } catch (error) {
      alert(`Save failed: ${error?.message || error}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={S.shell}>
      <style>{`
        input::placeholder,
        textarea::placeholder {
          color: #94a3b8;
          font-style: italic;
          font-weight: 700;
        }
        @media (max-width: 920px) {
          .legal-hero {
            grid-template-columns: 1fr !important;
          }
          .legal-hero-panel {
            min-width: 0 !important;
          }
        }
      `}</style>
      <div style={S.layout}>
        <section className="legal-hero" style={S.hero}>
          <div>
            <div style={S.eyebrow}>ISO 22000 Compliance Control</div>
            <div style={S.title}>Legal Register</div>
            <div style={S.subtitle}>
              Maintain a live register of statutory, regulatory, standard, and customer requirements with ownership, review dates, and compliance evidence.
            </div>
          </div>
          <div className="legal-hero-panel" style={S.heroPanel}>
            Use the ghost text inside each field as guidance. Keep entries short, evidence-based, and linked to a real record or procedure.
          </div>
        </section>

        <div style={S.toolbar}>
          <HaccpLinkBadge clauses={["4.2", "8.5.1", "9.1"]} label="Legal & Regulatory Requirements" />
          <div style={S.actions}>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/legal-register/view")}>View Register</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>Back to HACCP / ISO</button>
            <button style={S.btn("primary")} disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Requirement"}</button>
          </div>
        </div>

        <section style={S.card}>
          <div style={S.sectionTitle}>Requirement Identity</div>
          <div style={S.grid2}>
            <Field label="Requirement Title" hint="Short title used to identify the requirement in audits.">
              <input style={S.input} value={form.requirementTitle} onChange={(e) => setField("requirementTitle", e.target.value)} placeholder="e.g. Chilled meat must be stored and transported at 0-5°C" />
            </Field>
            <Field label="Source / Authority" hint="Name the regulator, standard, customer, or internal controlled document.">
              <input style={S.input} value={form.sourceAuthority} onChange={(e) => setField("sourceAuthority", e.target.value)} placeholder="e.g. Dubai Municipality / ISO 22000:2018 / Customer Specification" />
            </Field>
          </div>
          <div style={{ ...S.grid3, marginTop: 14 }}>
            <Field label="Reference Number / Clause" hint="Use the exact clause, circular number, permit condition, or document code.">
              <input style={S.input} value={form.referenceNumber} onChange={(e) => setField("referenceNumber", e.target.value)} placeholder="e.g. ISO 22000 clause 8.5.1 / DM Food Code section ..." />
            </Field>
            <Field label="Category" hint="Choose the type that best explains the requirement.">
              <select style={S.select} value={form.category} onChange={(e) => setField("category", e.target.value)}>
                <option>Food Safety</option>
                <option>HACCP / ISO 22000</option>
                <option>Licensing</option>
                <option>Labelling</option>
                <option>Cold Chain</option>
                <option>Supplier / Import</option>
                <option>Training</option>
                <option>Customer Requirement</option>
              </select>
            </Field>
            <Field label="Applicable Area" hint="Where this requirement applies in the business.">
              <input style={S.input} value={form.applicableArea} onChange={(e) => setField("applicableArea", e.target.value)} placeholder="e.g. QCS, Production, POS branches, FTR, all sites" />
            </Field>
          </div>
        </section>

        <section style={S.card}>
          <div style={S.sectionTitle}>Compliance Control</div>
          <Field label="Requirement Summary" hint="Explain the requirement in plain English so operations can understand it.">
            <textarea style={S.textarea} value={form.requirementSummary} onChange={(e) => setField("requirementSummary", e.target.value)} placeholder="Write what must be done, the limit or rule, and any mandatory condition." />
          </Field>
          <div style={{ ...S.grid2, marginTop: 14 }}>
            <Field label="Responsible Owner" hint="Person or department accountable for keeping this requirement compliant.">
              <input style={S.input} value={form.responsibleOwner} onChange={(e) => setField("responsibleOwner", e.target.value)} placeholder="e.g. QA Manager / Operations Manager / HR / Procurement" />
            </Field>
            <Field label="Compliance Status" hint="Current compliance condition based on available evidence.">
              <select style={S.select} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option>Compliant</option>
                <option>Action Needed</option>
                <option>Under Review</option>
                <option>Not Applicable</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Compliance Evidence" hint="List the records or controls that prove compliance.">
              <textarea style={S.textarea} value={form.complianceEvidence} onChange={(e) => setField("complianceEvidence", e.target.value)} placeholder="e.g. Chiller temperature logs, receiving logs, calibration records, training certificates, supplier approval, inspection report." />
            </Field>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Evidence Location / Link" hint="Where the auditor can find the evidence.">
              <input style={S.input} value={form.evidenceLocation} onChange={(e) => setField("evidenceLocation", e.target.value)} placeholder="e.g. /monitor/qcs reports, Document Register ref, shared folder path, certificate number" />
            </Field>
          </div>
        </section>

        <section style={S.card}>
          <div style={S.sectionTitle}>Review & Follow-up</div>
          <div style={S.grid3}>
            <Field label="Review Frequency" hint="How often this requirement must be checked.">
              <select style={S.select} value={form.reviewFrequency} onChange={(e) => setField("reviewFrequency", e.target.value)}>
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Semi-Annual</option>
                <option>Annual</option>
                <option>When Changed</option>
              </select>
            </Field>
            <Field label="Last Review Date" hint="Date this requirement was last checked against evidence.">
              <input type="date" style={S.input} value={form.lastReviewDate} onChange={(e) => setField("lastReviewDate", e.target.value)} />
            </Field>
            <Field label="Next Review Date" hint="Next planned check to keep the register live.">
              <input type="date" style={S.input} value={form.nextReviewDate} onChange={(e) => setField("nextReviewDate", e.target.value)} />
            </Field>
          </div>
          <div style={{ ...S.grid2, marginTop: 14 }}>
            <Field label="Action Required" hint="Use this when status is Action Needed or Under Review.">
              <textarea style={S.textarea} value={form.actionRequired} onChange={(e) => setField("actionRequired", e.target.value)} placeholder="e.g. Update label approval checklist, renew permit, upload latest inspection evidence, train staff." />
            </Field>
            <Field label="Notes" hint="Optional context, assumptions, or auditor comments.">
              <textarea style={S.textarea} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Add any useful comments for the next reviewer." />
            </Field>
          </div>
        </section>
      </div>
    </main>
  );
}
