// src/pages/haccp and iso/RealRecall/RealRecallInput.jsx
// Real Product Recall — input form (ISO 22000 Clause 8.9.5)
// Distinct from Mock Recall — this is for actual recall events.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "real_recall";

const empty = {
  recallNumber: "",
  initDate: new Date().toISOString().slice(0, 10),
  initiatedBy: "",
  recallClass: "II",
  reason: "BPC",
  reasonDetail: "",

  affectedProduct: "",
  affectedBatches: "",
  productionDates: "",
  expiryRange: "",

  qtyDistributed: "",
  qtyRecovered: "",
  unit: "kg",

  authorities: {
    DM: false,
    ADAFSA: false,
    MOCCAE: false,
    MOH: false,
    Customer: false,
  },
  /* Per-authority notification timestamps (ISO 8601 datetime strings).
     Captured separately to compute hours-from-initiation SLA per ISO 22000 §8.9.5. */
  authoritiesNotifiedAt: {
    DM: "",
    ADAFSA: "",
    MOCCAE: "",
    MOH: "",
    Customer: "",
  },
  authorityOther: "",
  publicNotice: "no",
  mediaUsed: "",
  customersNotified: "",

  disposition: "Destroy",
  dispositionDetails: "",

  cost: "",
  costBreakdown: "",

  rootCause: "",
  correctiveActions: "",
  preventiveActions: "",

  status: "Active",
  closureDate: "",
  signedBy: "",
};

const S = {
  shell: {
    minHeight: "100vh", padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #fef2f2 0%, #fff7ed 100%)",
    color: "#1f2937",
  },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },

  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14, border: "1px solid #fecaca",
    boxShadow: "0 8px 24px rgba(220,38,38,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#7f1d1d", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#991b1b", marginTop: 4, fontWeight: 700 },

  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #fecaca", boxShadow: "0 6px 16px rgba(220,38,38,0.06)" },
  sectionTitle: {
    fontSize: 15, fontWeight: 950, color: "#7f1d1d",
    margin: "0 0 12px", paddingBottom: 6,
    borderBottom: "2px solid #ef4444",
  },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#7f1d1d", marginBottom: 4, marginTop: 10 },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #fecaca", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff" },
  textarea: { width: "100%", padding: "10px 12px", border: "1.5px solid #fecaca", borderRadius: 10, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 80, resize: "vertical", background: "#fff" },
  select: { width: "100%", padding: "9px 11px", border: "1.5px solid #fecaca", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fff", cursor: "pointer" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  hint: { fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" },

  classBox: (active, color) => ({
    flex: 1, minWidth: 200,
    padding: "12px 14px",
    borderRadius: 12,
    border: `2px solid ${active ? color : "#fecaca"}`,
    background: active ? `${color}15` : "#fff",
    cursor: "pointer",
    transition: "all .15s ease",
    boxShadow: active ? `0 6px 16px ${color}33` : "0 2px 6px rgba(0,0,0,0.04)",
  }),
  classTitle: (color) => ({ fontSize: 13, fontWeight: 950, color, marginBottom: 4 }),
  classDesc: { fontSize: 11, fontWeight: 700, color: "#475569", lineHeight: 1.5 },

  checkboxGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 },
  checkLabel: (active) => ({
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px",
    background: active ? "#fef2f2" : "#fff",
    border: `1.5px solid ${active ? "#ef4444" : "#fecaca"}`,
    borderRadius: 10,
    fontSize: 13, fontWeight: 700, color: "#1f2937",
    cursor: "pointer",
  }),

  recoveryBar: {
    marginTop: 8,
    padding: "8px 12px",
    background: "linear-gradient(90deg, #ecfdf5, #fff)",
    borderRadius: 8,
    border: "1px solid #86efac",
    fontSize: 12, fontWeight: 800, color: "#15803d",
    display: "flex", alignItems: "center", gap: 8,
  },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
      secondary: { bg: "#fff",                                      color: "#7f1d1d", border: "#fecaca" },
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

const CLASS_INFO = {
  I:   { color: "#dc2626", titleKey: "rrClassI" },
  II:  { color: "#ea580c", titleKey: "rrClassII" },
  III: { color: "#d97706", titleKey: "rrClassIII" },
};

export default function RealRecallInput() {
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
        setForm({ ...empty, ...p, authorities: { ...empty.authorities, ...(p.authorities || {}) } });
      })
      .catch(() => {});
  }, [editId]);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleAuth(k) {
    setForm((f) => {
      const next = !f.authorities[k];
      const nowIso = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
      return {
        ...f,
        authorities: { ...f.authorities, [k]: next },
        authoritiesNotifiedAt: {
          ...f.authoritiesNotifiedAt,
          [k]: next
            ? (f.authoritiesNotifiedAt?.[k] || nowIso)  // auto-stamp now if first check
            : "",                                         // clear when unchecked
        },
      };
    });
  }
  function setAuthNotifiedAt(k, v) {
    setForm((f) => ({
      ...f,
      authoritiesNotifiedAt: { ...f.authoritiesNotifiedAt, [k]: v },
    }));
  }

  /* Compute hours from recall initiation to notification.
     Returns: { hours, level: 'ok'|'warn'|'breach', label } or null. */
  function computeSLA(authKey) {
    const notifiedAt = form.authoritiesNotifiedAt?.[authKey];
    if (!notifiedAt || !form.initDate) return null;
    const start = new Date(form.initDate + "T00:00:00").getTime();
    const end = new Date(notifiedAt).getTime();
    if (isNaN(start) || isNaN(end)) return null;
    const hours = Math.max(0, (end - start) / (1000 * 60 * 60));
    let level = "ok", label;
    if (hours <= 24) { level = "ok"; label = `${hours.toFixed(1)}h ✓`; }
    else if (hours <= 48) { level = "warn"; label = `${hours.toFixed(1)}h ⚠`; }
    else { level = "breach"; label = `${hours.toFixed(1)}h ⛔ >24h`; }
    return { hours, level, label };
  }

  const recoveryRate = useMemo(() => {
    const d = parseFloat(form.qtyDistributed);
    const r = parseFloat(form.qtyRecovered);
    if (!d || isNaN(d) || isNaN(r)) return null;
    return Math.min(100, (r / d) * 100);
  }, [form.qtyDistributed, form.qtyRecovered]);

  async function save() {
    if (!form.recallNumber || !form.initDate || !form.initiatedBy || !form.affectedProduct || !form.affectedBatches || !form.qtyDistributed || !form.reasonDetail) {
      alert(t("requiredField"));
      return;
    }
    setSaving(true);
    try {
      const url = editId
        ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}`
        : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const payload = { ...form, recoveryRate, savedAt: Date.now() };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.initiatedBy, type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/real-recall/view");
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
            <div style={S.title}>{t("rrTitle")}</div>
            <div style={S.subtitle}>{t("rrSubtitle")}</div>
            <HaccpLinkBadge clauses={["8.9.5"]} label={isAr ? "السحب الفعلي" : "Withdrawal/Recall"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/real-recall/view")}>{t("past")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* Section 1: Identification */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("rrDetails")}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("rrRecallNumber")}</label>
              <input style={S.input} value={form.recallNumber} onChange={(e) => setField("recallNumber", e.target.value)} placeholder={t("rrRecallNumberPh")} />
            </div>
            <div>
              <label style={S.label}>{t("rrInitDate")}</label>
              <input type="date" style={S.input} value={form.initDate} onChange={(e) => setField("initDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("rrInitiatedBy")}</label>
              <input style={S.input} value={form.initiatedBy} onChange={(e) => setField("initiatedBy", e.target.value)} placeholder={t("rrInitiatedByPh")} />
            </div>
          </div>
        </div>

        {/* Section 2: Class + Reason */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("rrClass")}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["I", "II", "III"]).map((cls) => {
              const ci = CLASS_INFO[cls];
              return (
                <div
                  key={cls}
                  style={S.classBox(form.recallClass === cls, ci.color)}
                  onClick={() => setField("recallClass", cls)}
                >
                  <div style={S.classTitle(ci.color)}>Class {cls}</div>
                  <div style={S.classDesc}>{t(ci.titleKey).replace(/^Class [^—]+—\s*/, "")}</div>
                </div>
              );
            })}
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("rrReason")}</label>
              <select style={S.select} value={form.reason} onChange={(e) => setField("reason", e.target.value)}>
                <option value="BPC">{t("rrReasonBPC")}</option>
                <option value="Allergen">{t("rrReasonAllergen")}</option>
                <option value="Foreign">{t("rrReasonForeign")}</option>
                <option value="Label">{t("rrReasonLabel")}</option>
                <option value="Regulatory">{t("rrReasonRegulatory")}</option>
                <option value="Other">{t("rrReasonOther")}</option>
              </select>
            </div>
          </div>

          <label style={S.label}>{t("rrReasonDetail")}</label>
          <textarea style={S.textarea} value={form.reasonDetail} onChange={(e) => setField("reasonDetail", e.target.value)} placeholder={t("rrReasonDetailPh")} />
        </div>

        {/* Section 3: Affected products */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("rrAffectedTitle")}</div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("rrAffectedProduct")}</label>
              <input style={S.input} value={form.affectedProduct} onChange={(e) => setField("affectedProduct", e.target.value)} placeholder={t("rrAffectedProductPh")} />
            </div>
            <div>
              <label style={S.label}>{t("rrAffectedBatches")}</label>
              <input style={S.input} value={form.affectedBatches} onChange={(e) => setField("affectedBatches", e.target.value)} placeholder={t("rrAffectedBatchesPh")} />
            </div>
          </div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("rrProductionDates")}</label>
              <input style={S.input} value={form.productionDates} onChange={(e) => setField("productionDates", e.target.value)} placeholder={t("rrProductionDatesPh")} />
            </div>
            <div>
              <label style={S.label}>{t("rrExpiryRange")}</label>
              <input style={S.input} value={form.expiryRange} onChange={(e) => setField("expiryRange", e.target.value)} placeholder={t("rrExpiryRangePh")} />
            </div>
          </div>
        </div>

        {/* Section 4: Quantities */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("rrQuantitiesTitle")}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("rrQtyDistributed")}</label>
              <input type="number" min="0" step="any" style={S.input} value={form.qtyDistributed} onChange={(e) => setField("qtyDistributed", e.target.value)} placeholder={t("rrQtyDistributedPh")} />
            </div>
            <div>
              <label style={S.label}>{t("rrQtyRecovered")}</label>
              <input type="number" min="0" step="any" style={S.input} value={form.qtyRecovered} onChange={(e) => setField("qtyRecovered", e.target.value)} placeholder={t("rrQtyRecoveredPh")} />
            </div>
            <div>
              <label style={S.label}>{t("rrUnit")}</label>
              <select style={S.select} value={form.unit} onChange={(e) => setField("unit", e.target.value)}>
                <option value="kg">{t("rrUnitKg")}</option>
                <option value="units">{t("rrUnitUnits")}</option>
                <option value="packs">{t("rrUnitPacks")}</option>
                <option value="tons">{t("rrUnitTons")}</option>
              </select>
            </div>
          </div>
          {recoveryRate !== null && (
            <div style={S.recoveryBar}>
              📊 {t("rrRecoveryRate")}: <strong>{recoveryRate.toFixed(1)}%</strong>
              <div style={{ flex: 1, height: 8, background: "#fff", borderRadius: 999, overflow: "hidden", border: "1px solid #d1fae5" }}>
                <div style={{ width: `${recoveryRate}%`, height: "100%", background: "linear-gradient(90deg, #16a34a, #22c55e)" }} />
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Authorities & notification */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("rrAuthoritiesTitle")}</div>

          {/* SLA hint — Class I requires 24h notification per UAE practice */}
          {form.recallClass === "I" && (
            <div style={{
              padding: "8px 12px", borderRadius: 8,
              background: "#fef2f2", border: "1.5px solid #fca5a5",
              color: "#7f1d1d", fontSize: 12, fontWeight: 700, marginBottom: 10,
            }}>
              ⚠ {lang === "ar"
                ? "Class I — يجب إخطار السلطات خلال 24 ساعة من بدء السحب (DM / MoH / ADAFSA)."
                : "Class I — authorities must be notified within 24 hours of recall initiation (DM / MoH / ADAFSA)."}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries({ DM: t("rrAuthDM"), ADAFSA: t("rrAuthADAFSA"), MOCCAE: t("rrAuthMOCCAE"), MOH: t("rrAuthMOH"), Customer: t("rrAuthCustomer") }).map(([key, label]) => {
              const checked = !!form.authorities[key];
              const sla = checked ? computeSLA(key) : null;
              const slaColor = sla?.level === "breach" ? { bg: "#fee2e2", color: "#7f1d1d" }
                            : sla?.level === "warn"   ? { bg: "#fef3c7", color: "#854d0e" }
                            : sla?.level === "ok"     ? { bg: "#dcfce7", color: "#166534" }
                            : null;
              return (
                <div key={key} style={{
                  display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 10,
                  border: `1.5px solid ${checked ? "#fca5a5" : "#e5e7eb"}`,
                  background: checked ? "#fef2f2" : "#fff",
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13, color: "#7f1d1d", cursor: "pointer", minWidth: 180 }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleAuth(key)} style={{ width: 16, height: 16 }} />
                    {label}
                  </label>
                  {checked && (
                    <>
                      <input
                        type="datetime-local"
                        value={form.authoritiesNotifiedAt?.[key] || ""}
                        onChange={(e) => setAuthNotifiedAt(key, e.target.value)}
                        style={{ ...S.input, maxWidth: 220, padding: "6px 8px", fontSize: 12 }}
                        title={lang === "ar" ? "وقت إخطار السلطة" : "Notification timestamp"}
                      />
                      {sla && slaColor && (
                        <span style={{
                          padding: "3px 10px", borderRadius: 999,
                          background: slaColor.bg, color: slaColor.color,
                          fontWeight: 900, fontSize: 11, whiteSpace: "nowrap",
                        }}>
                          {sla.label}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("rrAuthOther")}</label>
              <input style={S.input} value={form.authorityOther} onChange={(e) => setField("authorityOther", e.target.value)} placeholder={t("rrAuthOtherPh")} />
            </div>
            <div>
              <label style={S.label}>{t("rrPublicNotice")}</label>
              <select style={S.select} value={form.publicNotice} onChange={(e) => setField("publicNotice", e.target.value)}>
                <option value="no">{t("rrPublicNoticeNo")}</option>
                <option value="yes">{t("rrPublicNoticeYes")}</option>
              </select>
            </div>
          </div>

          {form.publicNotice === "yes" && (
            <div style={S.row}>
              <div>
                <label style={S.label}>{t("rrMediaUsed")}</label>
                <input style={S.input} value={form.mediaUsed} onChange={(e) => setField("mediaUsed", e.target.value)} placeholder={t("rrMediaUsedPh")} />
              </div>
              <div>
                <label style={S.label}>{t("rrCustomersNotified")}</label>
                <input type="number" min="0" style={S.input} value={form.customersNotified} onChange={(e) => setField("customersNotified", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Section 6: Disposition */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("rrDispositionTitle")}</div>
          <select style={S.select} value={form.disposition} onChange={(e) => setField("disposition", e.target.value)}>
            <option value="Destroy">{t("rrDispositionDestroy")}</option>
            <option value="Rework">{t("rrDispositionRework")}</option>
            <option value="Redirect">{t("rrDispositionRedirect")}</option>
            <option value="Mixed">{t("rrDispositionMixed")}</option>
          </select>
          <label style={S.label}>{t("rrDispositionDetails")}</label>
          <textarea style={S.textarea} value={form.dispositionDetails} onChange={(e) => setField("dispositionDetails", e.target.value)} placeholder={t("rrDispositionDetailsPh")} />
        </div>

        {/* Section 7: Cost */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("rrCostTitle")}</div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("rrCost")}</label>
              <input type="number" min="0" step="0.01" style={S.input} value={form.cost} onChange={(e) => setField("cost", e.target.value)} placeholder={t("rrCostPh")} />
            </div>
          </div>
          <label style={S.label}>{t("rrCostBreakdown")}</label>
          <textarea style={S.textarea} value={form.costBreakdown} onChange={(e) => setField("costBreakdown", e.target.value)} placeholder={t("rrCostBreakdownPh")} />
        </div>

        {/* Section 8: CAPA */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("rrCAPATitle")}</div>
          <label style={S.label}>{t("rrRootCause")}</label>
          <textarea style={S.textarea} value={form.rootCause} onChange={(e) => setField("rootCause", e.target.value)} placeholder={t("rrRootCausePh")} />

          <label style={S.label}>{t("rrCorrectiveActions")}</label>
          <textarea style={S.textarea} value={form.correctiveActions} onChange={(e) => setField("correctiveActions", e.target.value)} placeholder={t("rrCorrectiveActionsPh")} />

          <label style={S.label}>{t("rrPreventiveActions")}</label>
          <textarea style={S.textarea} value={form.preventiveActions} onChange={(e) => setField("preventiveActions", e.target.value)} placeholder={t("rrPreventiveActionsPh")} />
        </div>

        {/* Section 9: Status & closure */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "الحالة والإغلاق" : "Status & Closure"}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("rrStatus")}</label>
              <select style={S.select} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="Active">{t("rrStatusActive")}</option>
                <option value="Contained">{t("rrStatusContained")}</option>
                <option value="Closed">{t("rrStatusClosed")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("rrClosureDate")}</label>
              <input type="date" style={S.input} value={form.closureDate} onChange={(e) => setField("closureDate", e.target.value)} disabled={form.status !== "Closed"} />
            </div>
            <div>
              <label style={S.label}>{t("rrSignedBy")}</label>
              <input style={S.input} value={form.signedBy} onChange={(e) => setField("signedBy", e.target.value)} placeholder={t("rrSignedByPh")} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>{t("cancel")}</button>
          <button style={S.btn("success")} onClick={save} disabled={saving}>
            {saving ? t("saving") : t("rrSaveBtn")}
          </button>
        </div>
      </div>
    </main>
  );
}
