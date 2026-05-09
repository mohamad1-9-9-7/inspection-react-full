// src/pages/haccp and iso/MRM/MRMInput.jsx
// Management Review Meeting (MRM) — Input form (HACCP Clause 9.3)

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "mrm_record";

const empty = {
  meetingDate: new Date().toISOString().slice(0, 10),
  meetingNumber: "",
  location: "Head Office — Dubai",
  chairperson: "",
  attendees: "",
  inputs: {
    previousActionsStatus: "",
    customerFeedback: "",
    audits: "",
    monitoringResults: "",
    nonConformities: "",
    correctiveActions: "",
    supplierPerformance: "",
    resourcesAdequacy: "",
    emergencyIncidents: "",
    changesAffectingFSMS: "",
  },
  outputs: {
    decisions: "",
    actions: "",
    resourceNeeds: "",
    policyUpdates: "",
  },
  signedBy: "",
};

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "#f0f9ff" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #e2e8f0", boxShadow: "0 8px 22px rgba(2,132,199,0.06)" },
  title: { fontSize: 20, fontWeight: 950, color: "#0c4a6e", marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 950, color: "#0c4a6e", margin: "12px 0 8px", borderBottom: "2px solid #0ea5e9", paddingBottom: 4 },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#0c4a6e", marginBottom: 4, marginTop: 8 },
  input: { width: "100%", padding: "8px 10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit" },
  textarea: { width: "100%", padding: "9px 11px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 70, resize: "vertical" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #0ea5e9, #06b6d4)", color: "#fff", border: "#0284c7" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      secondary: { bg: "#fff", color: "#0c4a6e", border: "#cbd5e1" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "9px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 };
  },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },
};

export default function MRMInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { t, lang, toggle, dir } = useHaccpLang();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => {
        const p = j?.payload || j?.data?.payload || {};
        setForm({ ...empty, ...p, inputs: { ...empty.inputs, ...(p.inputs || {}) }, outputs: { ...empty.outputs, ...(p.outputs || {}) } });
      }).catch(() => {});
  }, [editId]);

  function setField(path, value) {
    setForm((f) => {
      const next = { ...f };
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = { ...cur[parts[i]] };
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  }

  /* ─── 🆕 Auto-pull from Customer Complaints (bi-yearly summary) ─── */
  async function pullComplaints() {
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=customer_complaint`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      if (arr.length === 0) {
        alert(lang === "ar" ? "لا توجد شكاوى مسجلة." : "No complaints recorded.");
        return;
      }
      // Last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const recent = arr.filter((r) => new Date(r?.payload?.complaintDate || 0) >= sixMonthsAgo);
      const total = recent.length;
      const open = recent.filter((r) => (r?.payload?.status || "Open") !== "Closed").length;
      const critical = recent.filter((r) => r?.payload?.severity === "Critical").length;
      const byType = {};
      recent.forEach((r) => {
        const t = r?.payload?.type || "Other";
        byType[t] = (byType[t] || 0) + 1;
      });
      const typesSummary = Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(", ");
      const summary = lang === "ar"
        ? `📊 ملخص شكاوى آخر 6 شهور (تلقائي):\n• الإجمالي: ${total}\n• مفتوحة: ${open}\n• حرجة: ${critical}\n• حسب النوع: ${typesSummary}\n\nالحالات الحرجة المفتوحة:\n` +
          recent.filter((r) => r?.payload?.severity === "Critical" && (r?.payload?.status || "Open") !== "Closed")
            .map((r) => `  - ${r?.payload?.complaintDate}: ${r?.payload?.complainant} — ${r?.payload?.product || "—"}`)
            .join("\n")
        : `📊 Complaints summary (last 6 months — auto-pulled):\n• Total: ${total}\n• Open: ${open}\n• Critical: ${critical}\n• By type: ${typesSummary}\n\nOpen critical cases:\n` +
          recent.filter((r) => r?.payload?.severity === "Critical" && (r?.payload?.status || "Open") !== "Closed")
            .map((r) => `  - ${r?.payload?.complaintDate}: ${r?.payload?.complainant} — ${r?.payload?.product || "—"}`)
            .join("\n");
      setField("inputs.customerFeedback", summary);
    } catch (e) {
      alert(t("saveError") + ": " + (e?.message || e));
    }
  }

  /* ─── 🆕 Auto-pull from Continual Improvement Log ─── */
  async function pullImprovement() {
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=continual_improvement`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      if (arr.length === 0) {
        alert(lang === "ar" ? "لا توجد مبادرات تحسين." : "No improvement initiatives.");
        return;
      }
      const completed = arr.filter((r) => r?.payload?.status === "Completed");
      const effective = arr.filter((r) => r?.payload?.effective === "Yes");
      const inProgress = arr.filter((r) => r?.payload?.status === "InProgress");
      const summary = lang === "ar"
        ? `📊 مبادرات التحسين المستمر (تلقائي):\n• الإجمالي: ${arr.length}\n• مكتملة: ${completed.length}\n• مُثبتة الفعالية: ${effective.length}\n• قيد التنفيذ: ${inProgress.length}\n\nالمبادرات الفعّالة:\n` +
          effective.map((r) => `  ✓ ${r?.payload?.initiativeTitle} — ${r?.payload?.actualResult || "—"}`).join("\n") +
          `\n\nالمبادرات قيد التنفيذ:\n` +
          inProgress.map((r) => `  🚀 ${r?.payload?.initiativeTitle} (${r?.payload?.progress || 0}%) — ${r?.payload?.owner || "—"}`).join("\n")
        : `📊 Continual Improvement Initiatives (auto-pulled):\n• Total: ${arr.length}\n• Completed: ${completed.length}\n• Proven effective: ${effective.length}\n• In progress: ${inProgress.length}\n\nEffective initiatives:\n` +
          effective.map((r) => `  ✓ ${r?.payload?.initiativeTitle} — ${r?.payload?.actualResult || "—"}`).join("\n") +
          `\n\nIn progress:\n` +
          inProgress.map((r) => `  🚀 ${r?.payload?.initiativeTitle} (${r?.payload?.progress || 0}%) — ${r?.payload?.owner || "—"}`).join("\n");
      // Append to "changes affecting FSMS" since improvements often drive system changes
      const existing = form.inputs.changesAffectingFSMS || "";
      const merged = existing ? `${existing}\n\n${summary}` : summary;
      setField("inputs.changesAffectingFSMS", merged);
    } catch (e) {
      alert(t("saveError") + ": " + (e?.message || e));
    }
  }

  async function save() {
    if (!form.meetingDate) { alert(t("requiredField")); return; }
    setSaving(true);
    try {
      const url = editId
        ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}`
        : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const payload = { ...form, savedAt: Date.now() };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.chairperson || "admin", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/mrm/view");
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
            <div style={S.title}>{t("mrmTitle")}</div>
            <HaccpLinkBadge clauses={["9.3"]} label={lang === "ar" ? "مراجعة الإدارة" : "Management Review"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/mrm/view")}>{t("past")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{t("mrmDetails")}</div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("mrmDate")}</label>
              <input type="date" style={S.input} value={form.meetingDate} onChange={(e) => setField("meetingDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("mrmNumber")}</label>
              <input style={S.input} value={form.meetingNumber} onChange={(e) => setField("meetingNumber", e.target.value)} placeholder="MRM-2026-Q2" />
            </div>
          </div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("mrmLocation")}</label>
              <input style={S.input} value={form.location} onChange={(e) => setField("location", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("mrmChair")}</label>
              <input style={S.input} value={form.chairperson} onChange={(e) => setField("chairperson", e.target.value)} placeholder="Hussam. O. Sarhan" />
            </div>
          </div>
          <label style={S.label}>{t("mrmAttendees")}</label>
          <textarea style={S.textarea} value={form.attendees} onChange={(e) => setField("attendees", e.target.value)} placeholder={t("mrmAttendeesPlaceholder")} />
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{t("mrmInputs")}</div>

          <label style={S.label}>{t("mrmInput1")}</label>
          <textarea style={S.textarea} value={form.inputs.previousActionsStatus} onChange={(e) => setField("inputs.previousActionsStatus", e.target.value)} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8, marginTop: 8 }}>
            <label style={{ ...S.label, marginTop: 0 }}>{t("mrmInput2")}</label>
            <button
              type="button"
              onClick={pullComplaints}
              style={{ ...S.btn("primary"), padding: "5px 12px", fontSize: 11 }}
              title={lang === "ar" ? "سحب آخر 6 شهور من شكاوى العملاء" : "Pull last 6 months of customer complaints"}
            >
              📥 {lang === "ar" ? "سحب من الشكاوى" : "Pull from Complaints"}
            </button>
          </div>
          <textarea style={S.textarea} value={form.inputs.customerFeedback} onChange={(e) => setField("inputs.customerFeedback", e.target.value)} />

          <label style={S.label}>{t("mrmInput3")}</label>
          <textarea style={S.textarea} value={form.inputs.audits} onChange={(e) => setField("inputs.audits", e.target.value)} />

          <label style={S.label}>{t("mrmInput4")}</label>
          <textarea style={S.textarea} value={form.inputs.monitoringResults} onChange={(e) => setField("inputs.monitoringResults", e.target.value)} />

          <label style={S.label}>{t("mrmInput5")}</label>
          <textarea style={S.textarea} value={form.inputs.nonConformities} onChange={(e) => setField("inputs.nonConformities", e.target.value)} />

          <label style={S.label}>{t("mrmInput6")}</label>
          <textarea style={S.textarea} value={form.inputs.correctiveActions} onChange={(e) => setField("inputs.correctiveActions", e.target.value)} />

          <label style={S.label}>{t("mrmInput7")}</label>
          <textarea style={S.textarea} value={form.inputs.supplierPerformance} onChange={(e) => setField("inputs.supplierPerformance", e.target.value)} />

          <label style={S.label}>{t("mrmInput8")}</label>
          <textarea style={S.textarea} value={form.inputs.resourcesAdequacy} onChange={(e) => setField("inputs.resourcesAdequacy", e.target.value)} />

          <label style={S.label}>{t("mrmInput9")}</label>
          <textarea style={S.textarea} value={form.inputs.emergencyIncidents} onChange={(e) => setField("inputs.emergencyIncidents", e.target.value)} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8, marginTop: 8 }}>
            <label style={{ ...S.label, marginTop: 0 }}>{t("mrmInput10")}</label>
            <button
              type="button"
              onClick={pullImprovement}
              style={{ ...S.btn("primary"), padding: "5px 12px", fontSize: 11 }}
              title={lang === "ar" ? "سحب مبادرات التحسين المستمر" : "Pull continual improvement initiatives"}
            >
              📥 {lang === "ar" ? "سحب من التحسين المستمر" : "Pull from Continual Improvement"}
            </button>
          </div>
          <textarea style={S.textarea} value={form.inputs.changesAffectingFSMS} onChange={(e) => setField("inputs.changesAffectingFSMS", e.target.value)} />
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{t("mrmOutputs")}</div>

          <label style={S.label}>{t("mrmDecisions")}</label>
          <textarea style={S.textarea} value={form.outputs.decisions} onChange={(e) => setField("outputs.decisions", e.target.value)} />

          <label style={S.label}>{t("mrmActions")}</label>
          <textarea style={S.textarea} value={form.outputs.actions} onChange={(e) => setField("outputs.actions", e.target.value)} placeholder={t("mrmActionsPlaceholder")} />

          <label style={S.label}>{t("mrmResources")}</label>
          <textarea style={S.textarea} value={form.outputs.resourceNeeds} onChange={(e) => setField("outputs.resourceNeeds", e.target.value)} />

          <label style={S.label}>{t("mrmPolicyUpdates")}</label>
          <textarea style={S.textarea} value={form.outputs.policyUpdates} onChange={(e) => setField("outputs.policyUpdates", e.target.value)} />
        </div>

        <div style={S.card}>
          <label style={S.label}>{t("mrmSignedBy")}</label>
          <input style={S.input} value={form.signedBy} onChange={(e) => setField("signedBy", e.target.value)} placeholder={t("mrmSignedByPlaceholder")} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>{t("cancel")}</button>
          <button style={S.btn("success")} onClick={save} disabled={saving}>
            {saving ? t("saving") : t("mrmSaveBtn")}
          </button>
        </div>
      </div>
    </main>
  );
}
