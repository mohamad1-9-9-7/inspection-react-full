// src/pages/haccp and iso/ContinualImprovement/ContinualImprovementInput.jsx
// Continual Improvement Initiative — Input form (ISO 22000 Clause 10.2)
// 4 sections: Idea → Evaluation → Implementation → Effectiveness

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "continual_improvement";

const empty = {
  /* Idea */
  initiativeTitle: "",
  suggestionDate: new Date().toISOString().slice(0, 10),
  proposedBy: "",
  source: "Employee",
  category: "FoodSafety",
  description: "",

  /* Evaluation */
  expectedBenefit: "",
  expectedCost: "",
  riskAssessment: "Low",
  priority: "Medium",
  decision: "Pending",
  decisionDate: "",
  decisionBy: "",
  rejectionReason: "",

  /* Implementation */
  owner: "",
  startDate: "",
  dueDate: "",
  actualEndDate: "",
  status: "Idea",
  progress: 0,
  implementationNotes: "",
  resourcesUsed: "",

  /* Effectiveness */
  evaluationDate: "",
  actualResult: "",
  effective: "Pending",
  evaluatedBy: "",
  lessonsLearned: "",
};

const S = {
  shell: {
    minHeight: "100vh", padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 100%)",
    color: "#1f2937",
  },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },

  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14, border: "1px solid #86efac",
    boxShadow: "0 8px 24px rgba(22,163,74,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#14532d", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#166534", marginTop: 4, fontWeight: 700 },

  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #bbf7d0", boxShadow: "0 6px 16px rgba(22,163,74,0.06)" },
  sectionTitle: {
    fontSize: 15, fontWeight: 950, color: "#14532d",
    margin: "0 0 12px", paddingBottom: 6,
    borderBottom: "2px solid #16a34a",
    display: "flex", alignItems: "center", gap: 8,
  },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#14532d", marginBottom: 4, marginTop: 10 },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #bbf7d0", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff" },
  textarea: { width: "100%", padding: "10px 12px", border: "1.5px solid #bbf7d0", borderRadius: 10, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 80, resize: "vertical", background: "#fff" },
  select: { width: "100%", padding: "9px 11px", border: "1.5px solid #bbf7d0", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fff", cursor: "pointer" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  hint: { fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" },

  hintBox: {
    background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10,
    padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#713f12", marginBottom: 12,
  },

  progressOuter: { width: "100%", height: 18, background: "#f0fdf4", borderRadius: 999, overflow: "hidden", border: "1px solid #bbf7d0", marginTop: 6 },
  progressInner: (pct) => ({
    width: `${Math.max(0, Math.min(100, pct))}%`,
    height: "100%",
    background: "linear-gradient(90deg, #22c55e, #16a34a)",
    transition: "width 0.4s ease",
    display: "flex", alignItems: "center", justifyContent: "flex-end",
    paddingInlineEnd: 8, color: "#fff", fontSize: 10, fontWeight: 900,
  }),

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      secondary: { bg: "#fff",                                      color: "#14532d", border: "#bbf7d0" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "9px 18px", borderRadius: 999, cursor: "pointer",
      fontWeight: 900, fontSize: 13,
    };
  },
};

export default function ContinualImprovementInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const p = j?.payload || j?.data?.payload || {};
        setForm({ ...empty, ...p });
      })
      .catch(() => {});
  }, [editId]);

  function setField(k, v) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // Auto-update status when decision changes
      if (k === "decision") {
        if (v === "Approve" && next.status === "Idea") next.status = "Planned";
        if (v === "Reject" || v === "Hold") next.status = "OnHold";
      }
      // Auto-set actualEndDate when status changes to Completed
      if (k === "status" && v === "Completed" && !next.actualEndDate) {
        next.actualEndDate = new Date().toISOString().slice(0, 10);
        if (next.progress < 100) next.progress = 100;
      }
      return next;
    });
  }

  async function save() {
    if (!form.initiativeTitle || !form.proposedBy || !form.description) {
      alert(t("requiredField"));
      return;
    }
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
        body: JSON.stringify({ reporter: form.proposedBy, type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/continual-improvement/view");
    } catch (e) {
      alert(t("saveError") + ": " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  const showRejectionReason = form.decision === "Reject" || form.decision === "Hold";
  const showImplementation = form.decision === "Approve";
  const showEffectiveness = form.status === "Completed" || form.actualEndDate;

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("ciInputTitle")}</div>
            <div style={S.subtitle}>{t("ciSubtitle")}</div>
            <HaccpLinkBadge clauses={["10.2"]} label={isAr ? "التحسين المستمر" : "Continual Improvement"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/continual-improvement/view")}>{t("past")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* Section 1 — Idea */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("ciIdeaSection")}</div>

          <label style={S.label}>{t("ciTitleField")}</label>
          <input style={S.input} value={form.initiativeTitle} onChange={(e) => setField("initiativeTitle", e.target.value)} placeholder={t("ciTitleFieldPh")} />

          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("ciSuggestionDate")}</label>
              <input type="date" style={S.input} value={form.suggestionDate} onChange={(e) => setField("suggestionDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("ciProposedBy")}</label>
              <input style={S.input} value={form.proposedBy} onChange={(e) => setField("proposedBy", e.target.value)} placeholder={t("ciProposedByPh")} />
            </div>
            <div>
              <label style={S.label}>{t("ciSource")}</label>
              <select style={S.select} value={form.source} onChange={(e) => setField("source", e.target.value)}>
                <option value="MRM">{t("ciSourceMRM")}</option>
                <option value="Audit">{t("ciSourceAudit")}</option>
                <option value="Complaint">{t("ciSourceComplaint")}</option>
                <option value="Employee">{t("ciSourceEmployee")}</option>
                <option value="Incident">{t("ciSourceIncident")}</option>
                <option value="Regulatory">{t("ciSourceRegulatory")}</option>
                <option value="Benchmark">{t("ciSourceBenchmark")}</option>
                <option value="Other">{t("ciSourceOther")}</option>
              </select>
            </div>
          </div>

          <label style={S.label}>{t("ciCategory")}</label>
          <select style={S.select} value={form.category} onChange={(e) => setField("category", e.target.value)}>
            <option value="FoodSafety">{t("ciCategoryFoodSafety")}</option>
            <option value="Quality">{t("ciCategoryQuality")}</option>
            <option value="Cost">{t("ciCategoryCost")}</option>
            <option value="Efficiency">{t("ciCategoryEfficiency")}</option>
            <option value="Training">{t("ciCategoryTraining")}</option>
            <option value="Environment">{t("ciCategoryEnvironment")}</option>
          </select>

          <label style={S.label}>{t("ciDescription")}</label>
          <textarea style={S.textarea} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder={t("ciDescriptionPh")} />
        </div>

        {/* Section 2 — Evaluation & Decision */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("ciEvalSection")}</div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("ciExpectedBenefit")}</label>
              <input style={S.input} value={form.expectedBenefit} onChange={(e) => setField("expectedBenefit", e.target.value)} placeholder={t("ciExpectedBenefitPh")} />
            </div>
            <div>
              <label style={S.label}>{t("ciExpectedCost")}</label>
              <input type="number" min="0" style={S.input} value={form.expectedCost} onChange={(e) => setField("expectedCost", e.target.value)} placeholder={t("ciExpectedCostPh")} />
            </div>
          </div>

          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("ciRiskAssessment")}</label>
              <select style={S.select} value={form.riskAssessment} onChange={(e) => setField("riskAssessment", e.target.value)}>
                <option value="Low">{t("ciRiskLow")}</option>
                <option value="Medium">{t("ciRiskMedium")}</option>
                <option value="High">{t("ciRiskHigh")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("ciPriority")}</label>
              <select style={S.select} value={form.priority} onChange={(e) => setField("priority", e.target.value)}>
                <option value="High">{t("ciPriorityHigh")}</option>
                <option value="Medium">{t("ciPriorityMed")}</option>
                <option value="Low">{t("ciPriorityLow")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("ciDecision")}</label>
              <select style={S.select} value={form.decision} onChange={(e) => setField("decision", e.target.value)}>
                <option value="Pending">{t("ciDecisionPending")}</option>
                <option value="Approve">{t("ciDecisionApprove")}</option>
                <option value="Reject">{t("ciDecisionReject")}</option>
                <option value="Hold">{t("ciDecisionHold")}</option>
              </select>
            </div>
          </div>

          {form.decision !== "Pending" && (
            <div style={S.row}>
              <div>
                <label style={S.label}>{t("ciDecisionDate")}</label>
                <input type="date" style={S.input} value={form.decisionDate} onChange={(e) => setField("decisionDate", e.target.value)} />
              </div>
              <div>
                <label style={S.label}>{t("ciDecisionBy")}</label>
                <input style={S.input} value={form.decisionBy} onChange={(e) => setField("decisionBy", e.target.value)} placeholder={t("ciDecisionByPh")} />
              </div>
            </div>
          )}

          {showRejectionReason && (
            <>
              <label style={S.label}>{t("ciRejectionReason")}</label>
              <textarea style={S.textarea} value={form.rejectionReason} onChange={(e) => setField("rejectionReason", e.target.value)} placeholder={t("ciRejectionReasonPh")} />
            </>
          )}
        </div>

        {/* Section 3 — Implementation (only if approved) */}
        {showImplementation && (
          <div style={S.card}>
            <div style={S.sectionTitle}>{t("ciImplSection")}</div>

            <div style={S.row3}>
              <div>
                <label style={S.label}>{t("ciOwner")}</label>
                <input style={S.input} value={form.owner} onChange={(e) => setField("owner", e.target.value)} placeholder={t("ciOwnerPh")} />
              </div>
              <div>
                <label style={S.label}>{t("ciStartDate")}</label>
                <input type="date" style={S.input} value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
              </div>
              <div>
                <label style={S.label}>{t("ciDueDate")}</label>
                <input type="date" style={S.input} value={form.dueDate} onChange={(e) => setField("dueDate", e.target.value)} />
              </div>
            </div>

            <div style={S.row}>
              <div>
                <label style={S.label}>{t("ciStatus")}</label>
                <select style={S.select} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                  <option value="Idea">{t("ciStatusIdea")}</option>
                  <option value="Planned">{t("ciStatusPlanned")}</option>
                  <option value="InProgress">{t("ciStatusInProgress")}</option>
                  <option value="Completed">{t("ciStatusCompleted")}</option>
                  <option value="OnHold">{t("ciStatusOnHold")}</option>
                  <option value="Cancelled">{t("ciStatusCancelled")}</option>
                </select>
              </div>
              <div>
                <label style={S.label}>{t("ciProgress")}</label>
                <input type="number" min="0" max="100" style={S.input} value={form.progress} onChange={(e) => setField("progress", parseInt(e.target.value, 10) || 0)} />
                <div style={S.progressOuter}>
                  <div style={S.progressInner(form.progress)}>
                    {form.progress > 0 && `${form.progress}%`}
                  </div>
                </div>
              </div>
            </div>

            {form.status === "Completed" && (
              <div style={S.row}>
                <div>
                  <label style={S.label}>{t("ciActualEndDate")}</label>
                  <input type="date" style={S.input} value={form.actualEndDate} onChange={(e) => setField("actualEndDate", e.target.value)} />
                </div>
              </div>
            )}

            <label style={S.label}>{t("ciImplementationNotes")}</label>
            <textarea style={S.textarea} value={form.implementationNotes} onChange={(e) => setField("implementationNotes", e.target.value)} placeholder={t("ciImplementationNotesPh")} />

            <label style={S.label}>{t("ciResourcesUsed")}</label>
            <textarea style={{ ...S.textarea, minHeight: 60 }} value={form.resourcesUsed} onChange={(e) => setField("resourcesUsed", e.target.value)} placeholder={t("ciResourcesUsedPh")} />
          </div>
        )}

        {/* Section 4 — Effectiveness (only if completed) */}
        {showEffectiveness && (
          <div style={S.card}>
            <div style={S.sectionTitle}>{t("ciEffectivenessSection")}</div>
            <div style={S.hintBox}>{t("ciEffectivenessHint")}</div>

            <div style={S.row}>
              <div>
                <label style={S.label}>{t("ciEvaluationDate")}</label>
                <input type="date" style={S.input} value={form.evaluationDate} onChange={(e) => setField("evaluationDate", e.target.value)} />
              </div>
              <div>
                <label style={S.label}>{t("ciEvaluatedBy")}</label>
                <input style={S.input} value={form.evaluatedBy} onChange={(e) => setField("evaluatedBy", e.target.value)} placeholder={t("ciEvaluatedByPh")} />
              </div>
            </div>

            <label style={S.label}>{t("ciActualResult")}</label>
            <textarea style={S.textarea} value={form.actualResult} onChange={(e) => setField("actualResult", e.target.value)} placeholder={t("ciActualResultPh")} />

            <label style={S.label}>{t("ciEffective")}</label>
            <select style={S.select} value={form.effective} onChange={(e) => setField("effective", e.target.value)}>
              <option value="Pending">{t("ciEffectivePending")}</option>
              <option value="Yes">{t("ciEffectiveYes")}</option>
              <option value="Partial">{t("ciEffectivePartial")}</option>
              <option value="No">{t("ciEffectiveNo")}</option>
            </select>

            <label style={S.label}>{t("ciLessonsLearned")}</label>
            <textarea style={S.textarea} value={form.lessonsLearned} onChange={(e) => setField("lessonsLearned", e.target.value)} placeholder={t("ciLessonsLearnedPh")} />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>{t("cancel")}</button>
          <button style={S.btn("success")} onClick={save} disabled={saving}>
            {saving ? t("saving") : t("ciSaveBtn")}
          </button>
        </div>
      </div>
    </main>
  );
}
