// src/pages/haccp and iso/EmergencyPreparedness/EmergencyPreparednessInput.jsx
// Emergency Preparedness & Response — Test / Drill entry (ISO 22000:2018 §8.4)
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";

const TYPE = "emergency_preparedness_test";

const SCENARIOS = [
  "Power failure affecting cold storage",
  "Chiller / freezer breakdown",
  "Cold-chain / transport failure",
  "Product contamination (biological / chemical / physical)",
  "Equipment failure during processing",
  "Pest infestation",
  "Flood / heavy rain / environmental hazard",
  "Fire / evacuation",
  "Water supply interruption / contamination",
  "Communication failure between departments",
  "Supplier non-conforming product / recall alert",
  "Other",
];
const SITES = ["Al Qusais Warehouse", "Al Barsha Butchery", "Abu Dhabi Butchery", "Al Ain Butchery", "Deira Head Office", "Food Trucks", "All Sites"];

const empty = {
  reference: "",
  testDate: new Date().toISOString().slice(0, 10),
  scenario: SCENARIOS[0],
  testType: "Drill (simulated)",
  site: "Al Qusais Warehouse",
  objective: "",
  participants: "",
  actionsTaken: "",
  responseTime: "",
  result: "Pass",
  weaknessesFound: "",
  correctiveActions: "",
  verifiedBy: "",
  nextTestDate: "",
  notes: "",
};

const S = {
  shell: { minHeight: "100vh", padding: "24px clamp(18px, 3vw, 48px) 48px", background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)", color: "#0f172a", fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  layout: { width: "min(1760px, 100%)", margin: "0 auto" },
  hero: { position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 24, alignItems: "center", minHeight: 200, padding: "30px clamp(22px, 4vw, 56px)", borderRadius: 8, background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(180,35,24,0.9) 55%, rgba(217,119,6,0.9))", color: "#fff", border: "1px solid rgba(255,255,255,0.20)", boxShadow: "0 24px 64px rgba(15,23,42,0.22)", marginBottom: 18 },
  eyebrow: { color: "rgba(255,255,255,0.82)", fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase" },
  title: { color: "#fff", fontWeight: 1000, lineHeight: 1.05, marginTop: 14, fontSize: 28 },
  subtitle: { color: "rgba(255,255,255,0.82)", fontWeight: 800, lineHeight: 1.45, marginTop: 12, maxWidth: 900 },
  heroPanel: { minWidth: 320, padding: 18, borderRadius: 8, background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(12px)", fontWeight: 850, color: "rgba(255,255,255,0.85)", lineHeight: 1.45 },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  card: { background: "#fff", border: "1px solid rgba(15,23,42,0.12)", borderRadius: 8, boxShadow: "0 12px 30px rgba(15,23,42,0.08)", padding: 22, marginBottom: 16 },
  sectionTitle: { color: "#b45309", fontWeight: 1000, marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #fde68a" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 },
  field: { minWidth: 0 },
  label: { display: "block", color: "#334155", fontWeight: 950, marginBottom: 7 },
  hint: { color: "#64748b", fontWeight: 750, marginTop: 6, lineHeight: 1.35, fontSize: 13 },
  input: { width: "100%", minHeight: 54, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.16)", background: "#f8fafc", color: "#0f172a", fontWeight: 850, fontFamily: "inherit", outline: "none" },
  textarea: { width: "100%", minHeight: 112, padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.16)", background: "#f8fafc", color: "#0f172a", fontWeight: 800, lineHeight: 1.55, fontFamily: "inherit", outline: "none", resize: "vertical" },
  select: { width: "100%", minHeight: 54, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.16)", background: "#fff", color: "#0f172a", fontWeight: 900, fontFamily: "inherit", outline: "none" },
  btn: (kind = "secondary") => {
    const styles = { primary: { background: "#b91c1c", color: "#fff", border: "#b91c1c" }, secondary: { background: "#fff", color: "#334155", border: "rgba(15,23,42,0.14)" } };
    const c = styles[kind] || styles.secondary;
    return { minHeight: 52, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 18px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.background, color: c.color, fontWeight: 950, cursor: "pointer", fontFamily: "inherit", boxShadow: kind === "primary" ? "0 14px 28px rgba(185,28,28,0.22)" : "0 10px 20px rgba(15,23,42,0.07)" };
  },
};

function Field({ label, hint, children }) {
  return (<div style={S.field}><label style={S.label}>{label}</label>{children}{hint && <div style={S.hint}>{hint}</div>}</div>);
}

export default function EmergencyPreparednessInput() {
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
    if (!form.scenario || !form.testDate || !form.participants.trim()) {
      alert("Please complete Scenario, Test Date, and Participants.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, savedAt: Date.now() };
      const url = editId ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}` : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reporter: form.verifiedBy || "QA", type: TYPE, payload }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/emergency-preparedness/view");
    } catch (e) { alert(`Save failed: ${e?.message || e}`); } finally { setSaving(false); }
  }

  return (
    <main style={S.shell}>
      <style>{`input::placeholder,textarea::placeholder{color:#94a3b8;font-style:italic;font-weight:700}@media(max-width:920px){.ep-hero{grid-template-columns:1fr!important}.ep-hero-panel{min-width:0!important}}`}</style>
      <div style={S.layout}>
        <section className="ep-hero" style={S.hero}>
          <div>
            <div style={S.eyebrow}>ISO 22000:2018 · Clause 8.4</div>
            <div style={S.title}>🚨 Emergency Test / Incident Record</div>
            <div style={S.subtitle}>Document a simulated drill or an actual emergency: what was tested, who took part, how the team responded, the result, and any corrective actions.</div>
          </div>
          <div className="ep-hero-panel" style={S.heroPanel}>Test procedures periodically (§8.4.2c). A "Fail" or "Pass with Observations" must always carry a corrective action and a next test date.</div>
        </section>

        <div style={S.toolbar}>
          <HaccpLinkBadge clauses={["8.4", "8.4.2"]} label="Emergency Preparedness & Response" />
          <div style={S.actions}>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/emergency-preparedness/view")}>View Log</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>Back to HACCP / ISO</button>
            <button style={S.btn("primary")} disabled={saving} onClick={save}>{saving ? "Saving..." : "Save Record"}</button>
          </div>
        </div>

        <section style={S.card}>
          <div style={S.sectionTitle}>Test Identity</div>
          <div style={S.grid3}>
            <Field label="Reference / Drill No." hint="Optional internal reference (e.g. EPR-2026-01).">
              <input style={S.input} value={form.reference} onChange={(e) => setField("reference", e.target.value)} placeholder="EPR-2026-01" />
            </Field>
            <Field label="Test Date" hint="Date the drill or incident happened.">
              <input type="date" style={S.input} value={form.testDate} onChange={(e) => setField("testDate", e.target.value)} />
            </Field>
            <Field label="Type" hint="Simulated drill or a real incident.">
              <select style={S.select} value={form.testType} onChange={(e) => setField("testType", e.target.value)}>
                <option>Drill (simulated)</option>
                <option>Actual incident</option>
              </select>
            </Field>
          </div>
          <div style={{ ...S.grid2, marginTop: 14 }}>
            <Field label="Emergency Scenario" hint="What situation was tested / occurred.">
              <select style={S.select} value={form.scenario} onChange={(e) => setField("scenario", e.target.value)}>
                {SCENARIOS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Site / Location" hint="Where the test took place.">
              <select style={S.select} value={form.site} onChange={(e) => setField("site", e.target.value)}>
                {SITES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section style={S.card}>
          <div style={S.sectionTitle}>Response & Result</div>
          <Field label="Objective / Scenario Description" hint="What the test aimed to verify (e.g. cold room holds ≤5°C for 4h on generator).">
            <textarea style={S.textarea} value={form.objective} onChange={(e) => setField("objective", e.target.value)} placeholder="Describe the emergency scenario and what the test set out to prove." />
          </Field>
          <div style={{ marginTop: 14 }}>
            <Field label="Response Actions Taken" hint="Step-by-step what the team did.">
              <textarea style={S.textarea} value={form.actionsTaken} onChange={(e) => setField("actionsTaken", e.target.value)} placeholder="e.g. Generator started, product isolated, temperatures logged every 30 min, authorities notified..." />
            </Field>
          </div>
          <div style={{ ...S.grid3, marginTop: 14 }}>
            <Field label="Participants" hint="Names / roles involved.">
              <input style={S.input} value={form.participants} onChange={(e) => setField("participants", e.target.value)} placeholder="e.g. QA, Maintenance, Warehouse In-charge" />
            </Field>
            <Field label="Response Time" hint="How long to control the situation.">
              <input style={S.input} value={form.responseTime} onChange={(e) => setField("responseTime", e.target.value)} placeholder="e.g. 12 minutes" />
            </Field>
            <Field label="Result" hint="Outcome of the test.">
              <select style={S.select} value={form.result} onChange={(e) => setField("result", e.target.value)}>
                <option>Pass</option>
                <option>Pass with Observations</option>
                <option>Fail</option>
                <option>Planned</option>
              </select>
            </Field>
          </div>
        </section>

        <section style={S.card}>
          <div style={S.sectionTitle}>Findings & Follow-up</div>
          <Field label="Weaknesses / Gaps Found" hint="What did not work well? Leave 'None' if fully effective.">
            <textarea style={S.textarea} value={form.weaknessesFound} onChange={(e) => setField("weaknessesFound", e.target.value)} placeholder="e.g. Generator took 4 min to auto-start; staff unsure who calls DM." />
          </Field>
          <div style={{ marginTop: 14 }}>
            <Field label="Corrective Actions" hint="Actions to close each gap, with owner and due date.">
              <textarea style={S.textarea} value={form.correctiveActions} onChange={(e) => setField("correctiveActions", e.target.value)} placeholder="e.g. Service generator (Maintenance, 15/07); update call tree poster (QA, 10/07)." />
            </Field>
          </div>
          <div style={{ ...S.grid2, marginTop: 14 }}>
            <Field label="Verified By" hint="Who reviewed and signed off the test.">
              <input style={S.input} value={form.verifiedBy} onChange={(e) => setField("verifiedBy", e.target.value)} placeholder="e.g. Food Safety Team Leader" />
            </Field>
            <Field label="Next Test Date" hint="When the next drill is planned.">
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
