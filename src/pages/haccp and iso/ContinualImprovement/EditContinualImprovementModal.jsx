// src/pages/haccp and iso/ContinualImprovement/EditContinualImprovementModal.jsx
// Modal for editing Continual Improvement records inline

import React, { useState } from "react";
import ReactDOM from "react-dom";
import API_BASE from "../../../config/api";

const TYPE = "continual_improvement";

const S = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    backdropFilter: "blur(3px)",
    zIndex: 99998,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "24px 12px",
    overflowY: "auto",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
  },
  modal: {
    width: "min(700px, 100%)",
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 24px 80px rgba(0,0,0,.4)",
    overflow: "hidden",
    margin: "auto 0",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 22px",
    background: "linear-gradient(180deg, #22c55e, #16a34a)",
    color: "#fff",
  },
  title: {
    fontWeight: 900,
    fontSize: 17,
  },
  closeBtn: {
    background: "rgba(255,255,255,.18)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    width: 34,
    height: 34,
    fontSize: 18,
    fontWeight: 900,
    cursor: "pointer",
  },
  body: {
    padding: "6px 22px 20px",
    maxHeight: "72vh",
    overflowY: "auto",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    padding: "14px 22px",
    borderTop: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 900,
    color: "#14532d",
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    width: "100%",
    padding: "9px 11px",
    border: "1.5px solid #bbf7d0",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    background: "#fff",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #bbf7d0",
    borderRadius: 10,
    fontSize: 13,
    lineHeight: 1.55,
    fontFamily: "inherit",
    minHeight: 80,
    resize: "vertical",
    background: "#fff",
  },
  select: {
    width: "100%",
    padding: "9px 11px",
    border: "1.5px solid #bbf7d0",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "inherit",
    background: "#fff",
    cursor: "pointer",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  btn: (kind) => {
    const map = {
      primary: {
        bg: "linear-gradient(180deg, #22c55e, #16a34a)",
        color: "#fff",
        border: "#15803d",
      },
      secondary: {
        bg: "#fff",
        color: "#14532d",
        border: "#bbf7d0",
      },
      danger: {
        bg: "linear-gradient(180deg, #ef4444, #dc2626)",
        color: "#fff",
        border: "#b91c1c",
      },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg,
      color: c.color,
      border: `1.5px solid ${c.border}`,
      padding: "9px 18px",
      borderRadius: 999,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 13,
    };
  },
};

export default function EditContinualImprovementModal({
  record,
  onClose,
  onSave,
  t,
}) {
  const [form, setForm] = useState(() => ({
    initiativeTitle: record?.payload?.initiativeTitle || "",
    description: record?.payload?.description || "",
    status: record?.payload?.status || "Idea",
    priority: record?.payload?.priority || "Medium",
    category: record?.payload?.category || "FoodSafety",
    progress: record?.payload?.progress || 0,
    owner: record?.payload?.owner || "",
    decision: record?.payload?.decision || "Pending",
    actualResult: record?.payload?.actualResult || "",
    effective: record?.payload?.effective || "Pending",
  }));
  const [saving, setSaving] = useState(false);

  function setField(k, v) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "decision") {
        if (v === "Approve" && next.status === "Idea") next.status = "Planned";
        if (v === "Reject" || v === "Hold") next.status = "OnHold";
      }
      return next;
    });
  }

  async function handleSave() {
    try {
      setSaving(true);
      const payload = {
        ...record.payload,
        ...form,
        savedAt: Date.now(),
      };
      const res = await fetch(
        `${API_BASE}/api/reports/${encodeURIComponent(record.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reporter: record.payload?.proposedBy || "System",
            type: TYPE,
            payload,
          }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSave();
      onClose();
    } catch (e) {
      alert(t("saveError") + ": " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <div onClick={onClose} style={S.backdrop}>
      <div onClick={(e) => e.stopPropagation()} style={S.modal}>
        {/* header */}
        <div style={S.header}>
          <div style={S.title}>✏️ {t("ciEditTitle")}</div>
          <button onClick={onClose} style={S.closeBtn}>
            ✕
          </button>
        </div>

        {/* body */}
        <div style={S.body}>
          <label style={S.label}>{t("ciTitleField")}</label>
          <input
            style={S.input}
            value={form.initiativeTitle}
            onChange={(e) => setField("initiativeTitle", e.target.value)}
            placeholder={t("ciTitleFieldPh")}
          />

          <label style={S.label}>{t("ciDescription")}</label>
          <textarea
            style={S.textarea}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder={t("ciDescriptionPh")}
          />

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("ciCategory")}</label>
              <select
                style={S.select}
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
              >
                <option value="FoodSafety">{t("ciCategoryFoodSafety")}</option>
                <option value="Quality">{t("ciCategoryQuality")}</option>
                <option value="Cost">{t("ciCategoryCost")}</option>
                <option value="Efficiency">{t("ciCategoryEfficiency")}</option>
                <option value="Training">{t("ciCategoryTraining")}</option>
                <option value="Environment">
                  {t("ciCategoryEnvironment")}
                </option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("ciPriority")}</label>
              <select
                style={S.select}
                value={form.priority}
                onChange={(e) => setField("priority", e.target.value)}
              >
                <option value="High">{t("ciPriorityHigh")}</option>
                <option value="Med">{t("ciPriorityMed")}</option>
                <option value="Low">{t("ciPriorityLow")}</option>
              </select>
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("ciStatus")}</label>
              <select
                style={S.select}
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
              >
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
              <input
                type="number"
                style={S.input}
                min="0"
                max="100"
                value={form.progress}
                onChange={(e) =>
                  setField("progress", Math.min(100, parseInt(e.target.value, 10) || 0))
                }
              />
            </div>
          </div>

          <label style={S.label}>{t("ciOwner")}</label>
          <input
            style={S.input}
            value={form.owner}
            onChange={(e) => setField("owner", e.target.value)}
            placeholder="Owner name or ID"
          />

          <label style={S.label}>{t("ciDecision")}</label>
          <select
            style={S.select}
            value={form.decision}
            onChange={(e) => setField("decision", e.target.value)}
          >
            <option value="Pending">{t("ciDecisionPending")}</option>
            <option value="Approve">{t("ciDecisionApprove")}</option>
            <option value="Reject">{t("ciDecisionReject")}</option>
            <option value="Hold">{t("ciDecisionHold")}</option>
          </select>

          <label style={S.label}>{t("ciActualResult")}</label>
          <textarea
            style={S.textarea}
            value={form.actualResult}
            onChange={(e) => setField("actualResult", e.target.value)}
            placeholder="Actual result after implementation"
          />

          <label style={S.label}>{t("ciEffectiveness")}</label>
          <select
            style={S.select}
            value={form.effective}
            onChange={(e) => setField("effective", e.target.value)}
          >
            <option value="Pending">{t("ciEffectivePending")}</option>
            <option value="Yes">{t("ciEffectiveYes")}</option>
            <option value="Partial">{t("ciEffectivePartial")}</option>
            <option value="No">{t("ciEffectiveNo")}</option>
          </select>
        </div>

        {/* footer */}
        <div style={S.footer}>
          <button onClick={onClose} disabled={saving} style={S.btn("secondary")}>
            {t("cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...S.btn("primary"),
              opacity: saving ? 0.7 : 1,
              pointerEvents: saving ? "none" : "auto",
            }}
          >
            {saving ? t("saving") : "💾 " + t("save")}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
