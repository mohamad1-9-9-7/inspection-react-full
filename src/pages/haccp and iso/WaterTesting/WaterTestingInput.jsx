// src/pages/haccp and iso/WaterTesting/WaterTestingInput.jsx
// Potable Water & Ice Testing entry (ISO 22000:2018 §8.2.4c)
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";

const TYPE = "water_testing_log";

const SAMPLE_POINTS = ["Mains / municipal inlet", "Storage tank", "Ice machine", "Production tap", "Wash / preparation area", "Butchery tap", "Hand-wash station", "Other"];
const SITES = ["Al Qusais Warehouse", "Al Barsha Butchery", "Abu Dhabi Butchery", "Al Ain Butchery", "Deira Head Office", "Food Trucks", "All Sites"];
const TEST_TYPES = ["Microbiological", "Chemical", "Physical", "Full potability", "Chlorine residual (in-house)"];

const empty = {
  sampleRef: "",
  sampleDate: new Date().toISOString().slice(0, 10),
  samplePoint: SAMPLE_POINTS[0],
  site: "Al Qusais Warehouse",
  testType: "Full potability",
  parameters: "",
  resultDetails: "",
  result: "Pass",
  limitReference: "UAE.S GSO 149 / Dubai Municipality potable water limits",
  lab: "",
  reportRef: "",
  correctiveAction: "",
  verifiedBy: "",
  nextTestDate: "",
  notes: "",
};

const S = {
  shell: { minHeight: "100vh", padding: "24px clamp(18px, 3vw, 48px) 48px", background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)", color: "#0f172a", fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  layout: { width: "min(1760px, 100%)", margin: "0 auto" },
  hero: { position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 24, alignItems: "center", minHeight: 200, padding: "30px clamp(22px, 4vw, 56px)", borderRadius: 8, background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(8,145,178,0.92) 52%, rgba(37,99,235,0.9))", color: "#fff", border: "1px solid rgba(255,255,255,0.20)", boxShadow: "0 24px 64px rgba(15,23,42,0.22)", marginBottom: 18 },
  eyebrow: { color: "rgba(255,255,255,0.82)", fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase" },
  title: { color: "#fff", fontWeight: 1000, lineHeight: 1.05, marginTop: 14, fontSize: 28 },
  subtitle: { color: "rgba(255,255,255,0.82)", fontWeight: 800, lineHeight: 1.45, marginTop: 12, maxWidth: 900 },
  heroPanel: { minWidth: 320, padding: 18, borderRadius: 8, background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(12px)", fontWeight: 850, color: "rgba(255,255,255,0.85)", lineHeight: 1.45 },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  card: { background: "#fff", border: "1px solid rgba(15,23,42,0.12)", borderRadius: 8, boxShadow: "0 12px 30px rgba(15,23,42,0.08)", padding: 22, marginBottom: 16 },
  sectionTitle: { color: "#0369a1", fontWeight: 1000, marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #bae6fd" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 },
  field: { minWidth: 0 },
  label: { display: "block", color: "#334155", fontWeight: 950, marginBottom: 7 },
  hint: { color: "#64748b", fontWeight: 750, marginTop: 6, lineHeight: 1.35, fontSize: 13 },
  input: { width: "100%", minHeight: 54, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.16)", background: "#f8fafc", color: "#0f172a", fontWeight: 850, fontFamily: "inherit", outline: "none" },
  textarea: { width: "100%", minHeight: 112, padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.16)", background: "#f8fafc", color: "#0f172a", fontWeight: 800, lineHeight: 1.55, fontFamily: "inherit", outline: "none", resize: "vertical" },
  select: { width: "100%", minHeight: 54, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.16)", background: "#fff", color: "#0f172a", fontWeight: 900, fontFamily: "inherit", outline: "none" },
  btn: (kind = "secondary") => {
    const styles = { primary: { background: "#0891b2", color: "#fff", border: "#0891b2" }, secondary: { background: "#fff", color: "#334155", border: "rgba(15,23,42,0.14)" } };
    const c = styles[kind] || styles.secondary;
    return { minHeight: 52, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 18px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.background, color: c.color, fontWeight: 950, cursor: "pointer", fontFamily: "inherit", boxShadow: kind === "primary" ? "0 14px 28px rgba(8,145,178,0.22)" : "0 10px 20px rgba(15,23,42,0.07)" };
  },
};

function Field({ label, hint, children }) {
  return (<div style={S.field}><label style={S.label}>{label}</label>{children}{hint && <div style={S.hint}>{hint}</div>}</div>);
}

export default function WaterTestingInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => setForm({ ...empty, ...(j?.payload || j?.data?.payload || {}) })).catch(() => {});
  }, [editId]);

  const setField = (k, v) => setForm((c) => ({ ...c, [k]: v }));

  async function save() {
    if (!form.samplePoint || !form.sampleDate || !form.testType) {
      alert("Please complete Sample Point, Sample Date, and Test Type.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, savedAt: Date.now() };
      const url = editId ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}` : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reporter: form.verifiedBy || "QA", type: TYPE, payload }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/water-testing/view");
    } catch (e) { alert(`Save failed: ${e?.message || e}`); } finally { setSaving(false); }
  }

  return (
    <main style={S.shell}>
      <style>{`input::placeholder,textarea::placeholder{color:#94a3b8;font-style:italic;font-weight:700}@media(max-width:920px){.wt-hero{grid-template-columns:1fr!important}.wt-hero-panel{min-width:0!important}}`}</style>
      <div style={S.layout}>
        <section className="wt-hero" style={S.hero}>
          <div>
            <div style={S.eyebrow}>ISO 22000:2018 · PRP 8.2.4(c)</div>
            <div style={S.title}>💧 Water / Ice Test Record</div>
            <div style={S.subtitle}>Log a potable water or ice sample result: where it was taken, which parameters were tested, the outcome against limits, and any corrective action.</div>
          </div>
          <div className="wt-hero-panel" style={S.heroPanel}>A "Fail" must always carry a corrective action (flush, disinfect, re-sample) and a re-test date. Attach the accredited lab certificate reference.</div>
        </section>

        <div style={S.toolbar}>
          <HaccpLinkBadge clauses={["8.2", "8.7"]} label="Water Supply — PRP & Verification" />
          <div style={S.actions}>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/water-testing/view")}>View Log</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>Back to HACCP / ISO</button>
            <button style={S.btn("primary")} disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Record"}</button>
          </div>
        </div>

        <section style={S.card}>
          <div style={S.sectionTitle}>Sample Identity</div>
          <div style={S.grid3}>
            <Field label="Sample Reference" hint="Optional internal / lab sample code.">
              <input style={S.input} value={form.sampleRef} onChange={(e) => setField("sampleRef", e.target.value)} placeholder="WT-2026-01" />
            </Field>
            <Field label="Sample Date" hint="Date the sample was collected.">
              <input type="date" style={S.input} value={form.sampleDate} onChange={(e) => setField("sampleDate", e.target.value)} />
            </Field>
            <Field label="Test Type" hint="Type of analysis performed.">
              <select style={S.select} value={form.testType} onChange={(e) => setField("testType", e.target.value)}>
                {TEST_TYPES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ ...S.grid2, marginTop: 14 }}>
            <Field label="Sample Point" hint="Exact tap / outlet / machine sampled.">
              <select style={S.select} value={form.samplePoint} onChange={(e) => setField("samplePoint", e.target.value)}>
                {SAMPLE_POINTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Site / Location" hint="Where the sample point is located.">
              <select style={S.select} value={form.site} onChange={(e) => setField("site", e.target.value)}>
                {SITES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section style={S.card}>
          <div style={S.sectionTitle}>Analysis & Result</div>
          <Field label="Parameters Tested" hint="List the analytes checked.">
            <textarea style={S.textarea} value={form.parameters} onChange={(e) => setField("parameters", e.target.value)} placeholder="e.g. E. coli, Total coliforms, Total viable count, pH, TDS, turbidity, residual chlorine, heavy metals." />
          </Field>
          <div style={{ marginTop: 14 }}>
            <Field label="Result Details / Values" hint="Measured values vs. limits.">
              <textarea style={S.textarea} value={form.resultDetails} onChange={(e) => setField("resultDetails", e.target.value)} placeholder="e.g. E. coli: 0 CFU/100ml (limit 0); TVC: 12 CFU/ml (limit 100); Cl2: 0.4 mg/l (0.2-0.5)." />
            </Field>
          </div>
          <div style={{ ...S.grid3, marginTop: 14 }}>
            <Field label="Result" hint="Overall pass / fail vs. potability limits.">
              <select style={S.select} value={form.result} onChange={(e) => setField("result", e.target.value)}>
                <option>Pass</option>
                <option>Pass with Observations</option>
                <option>Fail</option>
                <option>Pending</option>
              </select>
            </Field>
            <Field label="Accredited Lab" hint="Name of the testing laboratory.">
              <input style={S.input} value={form.lab} onChange={(e) => setField("lab", e.target.value)} placeholder="e.g. Dubai Central Laboratory" />
            </Field>
            <Field label="Certificate / Report Ref" hint="Lab report or certificate number.">
              <input style={S.input} value={form.reportRef} onChange={(e) => setField("reportRef", e.target.value)} placeholder="Report No. ..." />
            </Field>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Limit / Standard Reference" hint="Which potability standard the result is judged against.">
              <input style={S.input} value={form.limitReference} onChange={(e) => setField("limitReference", e.target.value)} placeholder="e.g. UAE.S GSO 149 / Dubai Municipality potable water limits" />
            </Field>
          </div>
        </section>

        <section style={S.card}>
          <div style={S.sectionTitle}>Follow-up</div>
          <Field label="Corrective Action" hint="Required when result is Fail or has observations.">
            <textarea style={S.textarea} value={form.correctiveAction} onChange={(e) => setField("correctiveAction", e.target.value)} placeholder="e.g. Flush and disinfect tank, shock-chlorinate line, re-sample after 48h." />
          </Field>
          <div style={{ ...S.grid2, marginTop: 14 }}>
            <Field label="Tested / Verified By" hint="Who reviewed and signed off the result.">
              <input style={S.input} value={form.verifiedBy} onChange={(e) => setField("verifiedBy", e.target.value)} placeholder="e.g. QA Officer" />
            </Field>
            <Field label="Next Test Date" hint="When the next sample is due.">
              <input type="date" style={S.input} value={form.nextTestDate} onChange={(e) => setField("nextTestDate", e.target.value)} />
            </Field>
          </div>
          <div style={{ marginTop: 14 }}>
            <Field label="Notes" hint="Optional context for the next reviewer.">
              <textarea style={S.textarea} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Any additional comments." />
            </Field>
          </div>
        </section>
      </div>
    </main>
  );
}
