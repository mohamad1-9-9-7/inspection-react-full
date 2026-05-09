// src/pages/haccp and iso/CCPMonitoring/CCPInput.jsx
// نموذج إدخال CCP Monitoring مع تقييم تلقائي للقراءة + إجراء تصحيحي إجباري عند الانحراف

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import SignaturePad from "../../../components/SignaturePad";
import AttachmentsSection from "../MockRecall/AttachmentsSection";
import { notifyCCPDeviation, markCCPDeviationNotified } from "../../../utils/notifications";
import {
  useLang, LangToggle,
  ccpName, ccpHazard, ccpLimitDesc, ccpMethod, ccpFrequency, ccpAction,
  evaluateReading,
} from "./i18n";
import { useCCPCatalog } from "./useCCPCatalog";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";

const TYPE = "ccp_monitoring_record";

/* Certified branches within FSMS scope (per FSMS Manual §4.4 + §5.3).
   Kitchen (Al Warqa), Food Trucks (FTR 1/2), Silicon Oasis and Al Barsha South
   are NOT within the certification scope and intentionally excluded. */
const BRANCHES = [
  "Al Qusais (QCS) — Central Warehouse",
  "POS 10 — Abu Dhabi Butchery",
  "POS 11 — Al Ain Butchery",
  "POS 15 — Al Barsha Butchery",
  "Production",
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function CCPInput() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit") || null;
  const { t, lang, toggle, dir } = useLang();
  const { ccps, loading: ccpsLoading } = useCCPCatalog();

  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!editId);
  const [editLoadErr, setEditLoadErr] = useState("");
  const [modal, setModal] = useState({ open: false, text: "", kind: "info" });
  const openModal = (text, kind = "info") => setModal({ open: true, text, kind });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const [form, setForm] = useState({
    reportDate: todayISO(),
    timeRecorded: nowHHMM(),
    ccpId: "",
    product: { name: "", batch: "", branch: "Al Qusais (QCS) — Central Warehouse" },
    reading: { value: "" },
    deviation: {
      correctiveAction: "",
      productStatus: "corrected",
      finalReading: "",
    },
    signoff: {
      monitoredBy: "",
      monitoredBySignature: "",
      verifiedBy: "",
      verifiedBySignature: "",
    },
    attachments: [],
    notes: "",
  });

  /* ====== Setters ====== */
  const setRoot = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const setNested = (group, k, v) =>
    setForm((s) => ({ ...s, [group]: { ...s[group], [k]: v } }));

  /* ====== تحميل سجل موجود للتعديل ====== */
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    setLoadingExisting(true);
    fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((json) => {
        if (cancelled) return;
        const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
        const target = String(editId);
        const found = arr.find((x) => {
          const ids = [x?.id, x?._id, x?.payload?.id];
          return ids.some((c) => c !== undefined && c !== null && String(c) === target);
        });
        if (!found) {
          setEditLoadErr(t("drillNotFound"));
          return;
        }
        const p = typeof found.payload === "string"
          ? (() => { try { return JSON.parse(found.payload); } catch { return {}; } })()
          : (found.payload || {});
        setForm((prev) => ({
          ...prev,
          ...p,
          product: { ...prev.product, ...(p.product || {}) },
          reading: { ...prev.reading, ...(p.reading || {}) },
          deviation: { ...prev.deviation, ...(p.deviation || {}) },
          signoff: { ...prev.signoff, ...(p.signoff || {}) },
          attachments: Array.isArray(p.attachments) ? p.attachments : [],
        }));
      })
      .catch((e) => !cancelled && setEditLoadErr(String(e?.message || e)))
      .finally(() => !cancelled && setLoadingExisting(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  /* ====== CCP المختار ====== */
  const selectedCCP = useMemo(
    () => ccps.find((c) => c.id === form.ccpId) || null,
    [ccps, form.ccpId]
  );

  /* ====== تقييم القراءة ====== */
  const evaluation = useMemo(() => {
    if (!selectedCCP || !form.reading.value) return null;
    return evaluateReading(form.reading.value, selectedCCP.criticalLimit);
  }, [selectedCCP, form.reading.value]);

  const isDeviation = evaluation === false;

  /* ====== Save ====== */
  async function handleSave() {
    if (!form.ccpId) return alert(t("requireCCP"));
    if (!form.reading.value) return alert(t("requireReading"));
    if (isDeviation && !form.deviation.correctiveAction.trim()) {
      return alert(t("requireCorrective"));
    }
    if (!form.signoff.monitoredBy.trim()) return alert(t("requireMonitor"));
    if (!form.signoff.verifiedBy.trim()) return alert(t("requireVerifier"));
    if (form.signoff.verifiedBy.trim().toLowerCase() === form.signoff.monitoredBy.trim().toLowerCase()) {
      return alert(t("verifierSameAsMonitor"));
    }

    setSaving(true);
    openModal(t("saving"), "info");

    try {
      const payload = {
        ...form,
        // snapshot من تعريف CCP وقت الحفظ — مفيد لو عُدِّل لاحقاً
        ccpSnapshot: selectedCCP ? {
          id: selectedCCP.id,
          nameEn: selectedCCP.nameEn,
          nameAr: selectedCCP.nameAr,
          criticalLimit: selectedCCP.criticalLimit,
          hazardEn: selectedCCP.hazardEn,
          hazardAr: selectedCCP.hazardAr,
        } : null,
        autoEval: {
          withinLimit: evaluation,
          isDeviation,
        },
        savedAt: new Date().toISOString(),
      };

      const isEditing = !!editId;
      const url = isEditing
        ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}?type=${encodeURIComponent(TYPE)}`
        : `${API_BASE}/api/reports`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: form.signoff.monitoredBy || "QA",
          type: TYPE,
          payload,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 🆕 تنبيه فوري عند الانحراف
      if (isDeviation && selectedCCP) {
        try {
          notifyCCPDeviation({
            ccpName: ccpName(selectedCCP, lang),
            reading: form.reading.value,
            unit: selectedCCP.criticalLimit?.unit || "",
            limit: ccpLimitDesc(selectedCCP, lang),
            product: form.product.name,
            batch: form.product.batch,
            onClickUrl: "/haccp-iso/ccp-monitoring/view",
          });
          // ضع id الانحراف في قائمة المُبلَّغ بها لمنع تكرار التنبيه عبر polling
          const respJson = await res.clone().json().catch(() => null);
          const newId = respJson?.id || respJson?._id || editId;
          if (newId) markCCPDeviationNotified(newId);
        } catch {}
      }

      openModal(isEditing ? t("updated") : t("saved"), "success");
      setTimeout(() => {
        closeModal();
        navigate("/haccp-iso/ccp-monitoring/view");
      }, 1500);
    } catch (e) {
      console.error(e);
      openModal(`${t("saveFailed")}: ${e?.message || e}`, "error");
      setTimeout(closeModal, 2200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ ...S.shell, direction: dir }}>
      <div style={S.frame}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
          {editId ? (
            <div style={S.editBadge}>{t("editingMode")}</div>
          ) : <span />}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <HaccpLinkBadge clauses={["8.5", "8.6"]} label="CCP / Hazard Control" />
            <LangToggle lang={lang} toggle={toggle} />
          </div>
        </div>

        {loadingExisting && <div style={S.loadBox}>{t("loadingExisting")}</div>}
        {editLoadErr && <div style={S.errBox}>{editLoadErr}</div>}

        {/* Brand header */}
        <div style={{ marginBottom: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <tbody>
              <tr>
                <td rowSpan={3} style={S.brandLogo}>
                  <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.1 }}>AL<br />MAWASHI</div>
                </td>
                <td style={S.headerCell}><b>{t("docTitle")}:</b> CCP Monitoring Log</td>
                <td style={S.headerCell}><b>{t("docNo")}:</b> FS-QM/REC/CCP</td>
              </tr>
              <tr>
                <td style={S.headerCell}><b>{t("issueDate")}:</b> 05/02/2020</td>
                <td style={S.headerCell}><b>{t("revisionNo")}:</b> 01</td>
              </tr>
              <tr>
                <td style={S.headerCell}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b>{t("reportDate")}:</b>
                    <input type="date" value={form.reportDate}
                      onChange={(e) => setRoot("reportDate", e.target.value)}
                      style={{ padding: "4px 8px", border: "1.5px solid #2563eb", borderRadius: 6, fontSize: "0.92rem", fontWeight: 700 }} />
                  </div>
                </td>
                <td style={S.headerCell}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b>{t("timeRecorded")}:</b>
                    <input type="time" value={form.timeRecorded}
                      onChange={(e) => setRoot("timeRecorded", e.target.value)}
                      style={{ padding: "4px 8px", border: "1.5px solid #2563eb", borderRadius: 6, fontSize: "0.92rem", fontWeight: 700 }} />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div style={S.brandStrip}>{t("brandStrip")}</div>
        </div>

        {/* ===== Section: CCP Info ===== */}
        <Section title={t("ccpInfo")}>
          <Field label={t("selectCCP")}>
            <select
              value={form.ccpId}
              onChange={(e) => setRoot("ccpId", e.target.value)}
              style={S.input}
            >
              <option value="">— {t("selectCCP").replace(" *", "")} —</option>
              {ccps.map((c) => (
                <option key={c.id} value={c.id}>
                  {ccpName(c, lang)} — {ccpLimitDesc(c, lang)}
                </option>
              ))}
            </select>
          </Field>

          {selectedCCP && (
            <div style={S.infoBox}>
              <InfoRow label={t("ccpHazard")} value={ccpHazard(selectedCCP, lang)} color="#b91c1c" />
              <InfoRow label={t("criticalLimit")} value={ccpLimitDesc(selectedCCP, lang)} color="#0f766e" highlight />
              <InfoRow label={t("monitoringMethod")} value={ccpMethod(selectedCCP, lang)} />
              <InfoRow label={t("frequency")} value={ccpFrequency(selectedCCP, lang)} />
            </div>
          )}
        </Section>

        {/* ===== Section: Product ===== */}
        <Section title={t("productInfo")}>
          <div style={S.grid3}>
            <Field label={t("productName")}>
              <input style={S.input} value={form.product.name}
                onChange={(e) => setNested("product", "name", e.target.value)} />
            </Field>
            <Field label={t("batchNo")}>
              <input style={S.input} value={form.product.batch}
                onChange={(e) => setNested("product", "batch", e.target.value)} />
            </Field>
            <Field label={t("branch")}>
              <select style={S.input} value={form.product.branch}
                onChange={(e) => setNested("product", "branch", e.target.value)}>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        {/* ===== Section: Reading ===== */}
        <Section title={t("reading")}>
          <div style={S.grid3}>
            <Field label={t("readingValue")}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" step="0.1" style={{ ...S.input, flex: 1 }}
                  value={form.reading.value}
                  onChange={(e) => setNested("reading", "value", e.target.value)} />
                <span style={{ fontWeight: 800, color: "#475569", padding: "0 6px" }}>
                  {selectedCCP?.criticalLimit?.unit || ""}
                </span>
              </div>
            </Field>
            <div style={{ gridColumn: "span 2", display: "flex", alignItems: "flex-end" }}>
              <EvalBadge evaluation={evaluation} t={t} />
            </div>
          </div>
        </Section>

        {/* ===== Section: Deviation (يظهر فقط عند الانحراف) ===== */}
        {isDeviation && (
          <Section title={t("deviation")} accent="#b91c1c">
            <Field label={t("correctiveAction")}>
              <textarea rows={3} style={{ ...S.input, fontFamily: "inherit" }}
                value={form.deviation.correctiveAction}
                placeholder={t("correctiveActionPlaceholder")}
                onChange={(e) => setNested("deviation", "correctiveAction", e.target.value)} />
            </Field>
            <div style={{ ...S.grid3, marginTop: 12 }}>
              <Field label={t("productStatus")}>
                <select style={S.input} value={form.deviation.productStatus}
                  onChange={(e) => setNested("deviation", "productStatus", e.target.value)}>
                  <option value="corrected">{t("statusCorrected")}</option>
                  <option value="quarantined">{t("statusQuarantined")}</option>
                  <option value="discarded">{t("statusDiscarded")}</option>
                  <option value="released">{t("statusReleased")}</option>
                </select>
              </Field>
              <Field label={t("finalReading")}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="number" step="0.1" style={{ ...S.input, flex: 1 }}
                    value={form.deviation.finalReading}
                    onChange={(e) => setNested("deviation", "finalReading", e.target.value)} />
                  <span style={{ fontWeight: 800, color: "#475569", padding: "0 6px" }}>
                    {selectedCCP?.criticalLimit?.unit || ""}
                  </span>
                </div>
              </Field>
            </div>
          </Section>
        )}

        {/* ===== Section: Sign-off ===== */}
        <Section title={t("signoff")}>
          {(() => {
            const m = (form.signoff.monitoredBy || "").trim().toLowerCase();
            const v = (form.signoff.verifiedBy || "").trim().toLowerCase();
            const sameName = m && v && m === v;
            return (
              <>
                <div style={S.grid2}>
                  <Field label={`${t("monitoredBy")} *`}>
                    <input
                      style={{ ...S.input, borderColor: form.signoff.monitoredBy ? "#cbd5e1" : "#fca5a5" }}
                      value={form.signoff.monitoredBy}
                      onChange={(e) => setNested("signoff", "monitoredBy", e.target.value)}
                    />
                  </Field>
                  <Field label={`${t("verifiedBy")} *`}>
                    <input
                      style={{ ...S.input, borderColor: !form.signoff.verifiedBy ? "#fca5a5" : (sameName ? "#dc2626" : "#cbd5e1") }}
                      value={form.signoff.verifiedBy}
                      onChange={(e) => setNested("signoff", "verifiedBy", e.target.value)}
                    />
                  </Field>
                </div>
                {sameName && (
                  <div style={{
                    marginTop: 8, padding: "8px 12px", borderRadius: 8,
                    background: "#fee2e2", border: "1.5px solid #fca5a5",
                    color: "#7f1d1d", fontSize: 12, fontWeight: 800,
                  }}>
                    {t("verifierSameAsMonitor")}
                  </div>
                )}
              </>
            );
          })()}
          <div style={{ ...S.grid2, marginTop: 12 }}>
            <SignaturePad
              label={`${t("monitorSig")}${form.signoff.monitoredBy ? ` (${form.signoff.monitoredBy})` : ""}`}
              value={form.signoff.monitoredBySignature}
              onChange={(v) => setNested("signoff", "monitoredBySignature", v)}
              width={380} height={120}
            />
            <SignaturePad
              label={`${t("verifierSig")}${form.signoff.verifiedBy ? ` (${form.signoff.verifiedBy})` : ""}`}
              value={form.signoff.verifiedBySignature}
              onChange={(v) => setNested("signoff", "verifiedBySignature", v)}
              width={380} height={120}
            />
          </div>
        </Section>

        {/* ===== Section: Attachments ===== */}
        <Section title={t("attachments")}>
          <AttachmentsSection
            value={form.attachments}
            onChange={(next) => setRoot("attachments", next)}
            t={t}
            lang={lang}
            dir={dir}
          />
        </Section>

        {/* ===== Save buttons ===== */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
          {editId && (
            <button onClick={() => navigate("/haccp-iso/ccp-monitoring/view")}
              style={{ ...S.btnSecondary, background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" }}>
              {t("cancel")}
            </button>
          )}
          <button onClick={() => navigate("/haccp-iso/ccp-monitoring/view")} style={S.btnSecondary}>
            {t("viewPast")}
          </button>
          <button onClick={handleSave} disabled={saving || loadingExisting || ccpsLoading}
            style={{ ...S.btnPrimary, opacity: (saving || loadingExisting) ? 0.6 : 1 }}>
            {saving ? t("saving") : (editId ? t("update") : t("save"))}
          </button>
        </div>

        {modal.open && (
          <div style={S.modalOverlay}>
            <div style={{
              ...S.modalBox,
              borderTopColor:
                modal.kind === "success" ? "#22c55e" :
                modal.kind === "error" ? "#ef4444" : "#2563eb",
            }}>
              <strong style={{ fontSize: 16 }}>{modal.text}</strong>
              <div style={{ textAlign: "right", marginTop: 10 }}>
                <button onClick={closeModal} style={S.btnLight}>{t("close")}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Atoms ===== */
function Section({ title, children, accent }) {
  return (
    <div style={{
      background: "#f9fafb",
      border: `1px solid ${accent ? "#fca5a5" : "#e5e7eb"}`,
      borderInlineStart: accent ? `4px solid ${accent}` : "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 16,
      marginBottom: 14,
    }}>
      <div style={{ fontWeight: 800, fontSize: "1.05rem", color: accent || "#0b1f4d", marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontWeight: 700, color: "#374151", fontSize: "0.9rem" }}>{label}</span>
      {children}
    </label>
  );
}

function InfoRow({ label, value, color, highlight }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px dashed #e5e7eb" }}>
      <span style={{ fontWeight: 700, color: "#475569", minWidth: 130 }}>{label}:</span>
      <span style={{
        color: color || "#0f172a",
        fontWeight: highlight ? 800 : 600,
        fontFamily: highlight ? "monospace" : "inherit",
      }}>{value}</span>
    </div>
  );
}

function EvalBadge({ evaluation, t }) {
  if (evaluation === null || evaluation === undefined) {
    return (
      <div style={{ ...S.badge, background: "#f1f5f9", color: "#64748b", border: "1.5px solid #cbd5e1" }}>
        {t("notEvaluated")}
      </div>
    );
  }
  if (evaluation === true) {
    return (
      <div style={{ ...S.badge, background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", color: "#065f46", border: "2px solid #34d399" }}>
        {t("withinLimit")}
      </div>
    );
  }
  return (
    <div style={{ ...S.badge, background: "linear-gradient(135deg,#fef2f2,#fee2e2)", color: "#991b1b", border: "2px solid #f87171" }}>
      {t("outOfLimit")}
    </div>
  );
}

/* ===== Styles ===== */
const S = {
  shell: {
    minHeight: "100vh",
    padding: "20px 18px",
    background: "linear-gradient(150deg,#eef2ff,#f8fafc 55%,#fef2f2)",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  frame: {
    maxWidth: 1280, margin: "0 auto",
    background: "#fff", borderRadius: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)", padding: 20,
  },
  brandLogo: {
    border: "1px solid #9aa4ae", padding: 8, width: 110,
    textAlign: "center", background: "#f8fbff",
  },
  headerCell: { border: "1px solid #9aa4ae", padding: "6px 10px", background: "#f8fbff" },
  brandStrip: {
    textAlign: "center", background: "#dde3e9", fontWeight: 800,
    padding: "8px 6px", border: "1px solid #9aa4ae", borderTop: "none",
    fontSize: "1.05rem",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  input: {
    padding: "9px 11px", border: "1.5px solid #d1d5db", borderRadius: 8,
    fontSize: "0.92rem", width: "100%", boxSizing: "border-box", background: "#fff",
  },
  infoBox: {
    background: "linear-gradient(135deg,#f0fdf4,#ecfeff)",
    border: "1.5px solid #86efac",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  badge: {
    padding: "16px 20px", borderRadius: 12, fontWeight: 800,
    fontSize: "1.02rem", textAlign: "center", width: "100%",
  },
  btnPrimary: {
    background: "linear-gradient(180deg,#10b981,#059669)",
    color: "#fff", border: "none", padding: "12px 22px",
    borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: "0.95rem",
  },
  btnSecondary: {
    background: "#eef2ff", color: "#1e40af", border: "1px solid #c7d2fe",
    padding: "12px 18px", borderRadius: 10, fontWeight: 800, cursor: "pointer",
  },
  btnLight: {
    background: "#e5e7eb", color: "#111827", border: "none",
    padding: "8px 14px", borderRadius: 8, fontWeight: 700, cursor: "pointer",
  },
  editBadge: {
    background: "linear-gradient(135deg,#fff7ed,#fed7aa)",
    border: "1.5px solid #fb923c", color: "#9a3412",
    padding: "8px 14px", borderRadius: 999, fontWeight: 800, fontSize: "0.92rem",
  },
  loadBox: { background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af",
    padding: 12, borderRadius: 10, marginBottom: 12, fontWeight: 700, textAlign: "center" },
  errBox: { background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b",
    padding: 12, borderRadius: 10, marginBottom: 12, fontWeight: 700 },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
  },
  modalBox: {
    background: "#fff", borderRadius: 12, padding: "16px 20px",
    minWidth: 320, boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
    borderTop: "4px solid #2563eb",
  },
};
