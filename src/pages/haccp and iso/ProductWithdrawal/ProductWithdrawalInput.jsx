// src/pages/haccp and iso/ProductWithdrawal/ProductWithdrawalInput.jsx
// Product Withdrawal — input form (ISO 22000 Clause 8.9.5 "Withdrawal")
// Distinct from Real Recall: withdrawal covers product still inside the
// distribution chain that has NOT reached the end consumer. The moment the
// consumer is reached the case must be escalated to a Real Product Recall.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";
import { TYPE, summarizeLocations, computeSecureHours } from "./productWithdrawalUtils";
import WithdrawalAttachments from "./WithdrawalAttachments";
import TraceLinkPicker, { traceLinkTitle } from "./TraceLinkPicker";
import ProductPicker from "../../monitor/branches/_shared/ProductPicker";

/* Auto-generate the next withdrawal number for a given year.
   Scans every existing record for the WD-<year>-#### pattern and continues from
   the highest sequence so two people never allocate the same number. */
export function nextWithdrawalNumber(records, year) {
  const re = new RegExp(`^WD-${year}-(\\d+)$`);
  let max = 0;
  for (const rec of Array.isArray(records) ? records : []) {
    const n = String(rec?.payload?.withdrawalNumber || "").trim();
    const m = re.exec(n);
    if (m) {
      const v = parseInt(m[1], 10);
      if (Number.isFinite(v) && v > max) max = v;
    }
  }
  return `WD-${year}-${String(max + 1).padStart(4, "0")}`;
}

/* One stock-hold row per location that received the affected batch. */
const emptyLocation = () => ({
  uid: `L${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
  location: "",
  dispatched: "",
  held: "",
  returned: "",
  sold: "",
  contact: "",
  notifiedAt: "",
  confirmed: false,
});

const empty = {
  withdrawalNumber: "",
  initDate: new Date().toISOString().slice(0, 10),
  initTime: "",
  initiatedBy: "",
  decisionBy: "",

  distributionLevel: "Warehouse",
  consumerReached: "no",
  recallRef: "",

  withdrawalClass: "B",
  source: "InternalQC",
  reason: "Micro",
  reasonDetail: "",

  product: "",
  productCode: "",
  batches: "",
  productionDates: "",
  expiryRange: "",
  packSize: "",
  traceRef: "",
  /* Summary of a real traceability record, set via TraceLinkPicker. */
  traceLink: null,

  unit: "kg",
  locations: [],

  holdStart: "",
  holdCompleted: "",
  holdArea: "",
  holdLabel: "yes",
  holdSegregated: "yes",
  holdSystemBlock: "no",

  notified: {
    Branches: false,
    Ops: false,
    Warehouse: false,
    Mgmt: false,
    Wholesale: false,
    Supplier: false,
  },
  authorityNotified: "no",
  authorityWhich: "",
  authorityAt: "",
  noticeIssued: "no",
  noticeRef: "",

  disposition: "Pending",
  dispositionDetails: "",
  destructionRef: "",

  cost: "",
  costBreakdown: "",

  verifiedBy: "",
  verificationDate: "",
  verificationNotes: "",

  rootCause: "",
  correctiveActions: "",
  preventiveActions: "",
  ncrRef: "",

  /* Supporting documents — Cloudinary URLs only, never base64. */
  attachments: [],

  status: "Open",
  closureDate: "",
  signedBy: "",
};

const S = {
  shell: {
    minHeight: "100vh", padding: "20px 18px",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
    background: "linear-gradient(150deg,#eef2ff,#f8fafc 55%,#ecfdf5)",
    color: "#1f2937",
  },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },

  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 12,
    padding: "18px 22px",
    background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
    color: "#fff",
    borderRadius: 14,
    boxShadow: "0 6px 18px rgba(30,58,95,0.20)",
  },
  title: { fontSize: "1.5rem", fontWeight: 900, color: "#fff", lineHeight: 1.2 },
  subtitle: { fontSize: "0.92rem", color: "#fff", opacity: 0.85, marginTop: 4, fontWeight: 600 },

  card: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  sectionTitle: {
    fontSize: "1.02rem", fontWeight: 800, color: "#0b1f4d",
    margin: "0 0 12px", paddingBottom: 6,
    borderBottom: "2px solid #e5e7eb",
  },
  label: { display: "block", fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 4, marginTop: 10 },
  input: { width: "100%", padding: "9px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 80, resize: "vertical", background: "#fff", boxSizing: "border-box" },
  select: { width: "100%", padding: "9px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fff", cursor: "pointer", boxSizing: "border-box" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  hint: { fontSize: 11, color: "#64748b", marginTop: 4, fontStyle: "italic" },

  banner: (kind) => {
    const map = {
      info:   { bg: "#eff6ff", border: "#bfdbfe", color: "#1e3a8a" },
      warn:   { bg: "#fffbeb", border: "#fcd34d", color: "#854d0e" },
      danger: { bg: "#fef2f2", border: "#fca5a5", color: "#7f1d1d" },
    };
    const c = map[kind] || map.info;
    return {
      padding: "10px 12px", borderRadius: 10,
      background: c.bg, border: `1.5px solid ${c.border}`, color: c.color,
      fontSize: 12, fontWeight: 800, lineHeight: 1.6, marginBottom: 10,
    };
  },

  classBox: (active, color) => ({
    flex: 1, minWidth: 210,
    padding: "12px 14px",
    borderRadius: 10,
    border: `2px solid ${active ? color : "#e5e7eb"}`,
    background: active ? `${color}15` : "#fff",
    cursor: "pointer",
    transition: "all .15s ease",
    boxShadow: active ? `0 6px 16px ${color}33` : "0 1px 3px rgba(0,0,0,0.04)",
  }),
  classTitle: (color) => ({ fontSize: 13, fontWeight: 900, color, marginBottom: 4 }),
  classDesc: { fontSize: 11, fontWeight: 700, color: "#475569", lineHeight: 1.5 },

  tableWrap: { overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 },
  th: { background: "#f1f5f9", color: "#0b1f4d", fontWeight: 800, padding: "8px 6px", border: "1px solid #e5e7eb", whiteSpace: "nowrap", textAlign: "start" },
  td: { border: "1px solid #f1f5f9", padding: 4, verticalAlign: "middle" },
  cellInput: { width: "100%", minWidth: 80, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "inherit", background: "#fff", boxSizing: "border-box" },

  progressOuter: { flex: 1, minWidth: 120, height: 10, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" },
  progressInner: (pct, color) => ({ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: color }),

  checkLabel: (active) => ({
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px",
    background: active ? "#eff6ff" : "#fff",
    border: `1.5px solid ${active ? "#3b82f6" : "#e5e7eb"}`,
    borderRadius: 8,
    fontSize: 13, fontWeight: 700, color: "#1f2937",
    cursor: "pointer",
  }),
  checkboxGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 },

  linkedCard: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    background: "#eef2ff", border: "1px solid #c7d2fe",
    borderRadius: 10, padding: "10px 12px",
  },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg,#3b82f6,#2563eb)", color: "#fff", border: "#1d4ed8" },
      secondary: { bg: "#fff",                                    color: "#0b1f4d", border: "#cbd5e1" },
      success:   { bg: "linear-gradient(180deg,#10b981,#059669)", color: "#fff", border: "#047857" },
      danger:    { bg: "#fef2f2",                                 color: "#991b1b", border: "#fca5a5" },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      padding: "9px 16px", borderRadius: 10, cursor: "pointer",
      fontWeight: 800, fontSize: "0.9rem", fontFamily: "inherit",
    };
  },
  /* Buttons that sit on the navy header need the translucent-white treatment. */
  headBtn: (primary) => ({
    background: primary ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.12)",
    border: `1px solid rgba(255,255,255,${primary ? 0.4 : 0.3})`,
    color: "#fff",
    padding: primary ? "9px 16px" : "9px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: primary ? 800 : 700,
    fontSize: primary ? "0.9rem" : "0.88rem",
    fontFamily: "inherit",
  }),
  miniBtn: (kind) => ({
    ...S.btn(kind),
    padding: "5px 10px", fontSize: 11, borderRadius: 8,
  }),
};

const CLASS_INFO = {
  A: { color: "#dc2626", titleKey: "pwClassA" },
  B: { color: "#d97706", titleKey: "pwClassB" },
  C: { color: "#0891b2", titleKey: "pwClassC" },
};

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export default function ProductWithdrawalInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [numGenerating, setNumGenerating] = useState(false);
  const [tracePickerOpen, setTracePickerOpen] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const p = j?.payload || j?.data?.payload || {};
        setForm({
          ...empty,
          ...p,
          notified: { ...empty.notified, ...(p.notified || {}) },
          locations: Array.isArray(p.locations) ? p.locations : [],
          attachments: Array.isArray(p.attachments) ? p.attachments : [],
          traceLink: p.traceLink || null,
        });
      })
      .catch(() => {});
  }, [editId]);

  /* Allocate the next WD-<year>-#### on a new record. Never overwrites a number
     the user already typed, and falls back to 0001 if the server is unreachable. */
  useEffect(() => {
    if (editId) return;
    let cancelled = false;
    (async () => {
      const year = new Date().getFullYear();
      try {
        setNumGenerating(true);
        const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
        const next = nextWithdrawalNumber(arr, year);
        if (!cancelled) setForm((f) => (f.withdrawalNumber ? f : { ...f, withdrawalNumber: next }));
      } catch {
        if (!cancelled) {
          setForm((f) => (f.withdrawalNumber ? f : { ...f, withdrawalNumber: `WD-${year}-0001` }));
        }
      } finally {
        if (!cancelled) setNumGenerating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId]);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleNotified(k) {
    setForm((f) => ({ ...f, notified: { ...f.notified, [k]: !f.notified[k] } }));
  }
  function addLocation() {
    setForm((f) => ({ ...f, locations: [...(f.locations || []), emptyLocation()] }));
  }
  function removeLocation(uid) {
    setForm((f) => ({ ...f, locations: (f.locations || []).filter((l) => l.uid !== uid) }));
  }
  function setLocation(uid, k, v) {
    setForm((f) => ({
      ...f,
      locations: (f.locations || []).map((l) => (l.uid === uid ? { ...l, [k]: v } : l)),
    }));
  }

  const totals = useMemo(() => summarizeLocations(form.locations), [form.locations]);
  const secureHours = useMemo(
    () => computeSecureHours(form.initDate, form.initTime, form.holdCompleted),
    [form.initDate, form.initTime, form.holdCompleted]
  );

  /* A withdrawal stops being a withdrawal once product reached the consumer,
     which the sold column also reveals even if the header answer says "no". */
  const mustEscalate = form.consumerReached === "yes" || totals.sold > 0;

  const rateColor = totals.accountedRate == null
    ? "#94a3b8"
    : totals.accountedRate >= 100 ? "#15803d"
    : totals.accountedRate >= 80 ? "#a16207"
    : "#b91c1c";

  async function save() {
    if (!form.withdrawalNumber || !form.initDate || !form.initiatedBy ||
        !form.product || !form.batches || !form.reasonDetail) {
      alert(t("requiredField"));
      return;
    }
    setSaving(true);
    try {
      const url = editId
        ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}`
        : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const payload = {
        ...form,
        totals,                       // denormalised so lists/exports stay cheap
        accountedRate: totals.accountedRate,
        secureHours,
        mustEscalate,
        savedAt: Date.now(),
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.initiatedBy, type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/product-withdrawal/view");
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
            <div style={S.title}>{t("pwTitle")}</div>
            <div style={S.subtitle}>{t("pwSubtitle")}</div>
            <HaccpLinkBadge clauses={["8.9.5"]} label={isAr ? "سحب المنتج" : "Withdrawal"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.headBtn(true)} onClick={() => navigate("/haccp-iso/product-withdrawal/view")}>{t("past")}</button>
            <button style={S.headBtn(false)} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        <div style={S.banner("info")}>ℹ️ {t("pwVsRecall")}</div>

        {/* Section 1: Identification */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwDetails")}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("pwNumber")}</label>
              <input
                style={S.input}
                value={form.withdrawalNumber}
                onChange={(e) => setField("withdrawalNumber", e.target.value)}
                placeholder={numGenerating ? t("pwNumGenerating") : t("pwNumberPh")}
              />
              {!editId && <div style={S.hint}>{t("pwNumAuto")}</div>}
            </div>
            <div>
              <label style={S.label}>{t("pwInitDate")}</label>
              <input type="date" style={S.input} value={form.initDate} onChange={(e) => setField("initDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("pwInitTime")}</label>
              <input type="time" style={S.input} value={form.initTime} onChange={(e) => setField("initTime", e.target.value)} />
            </div>
          </div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("pwInitiatedBy")}</label>
              <input style={S.input} value={form.initiatedBy} onChange={(e) => setField("initiatedBy", e.target.value)} placeholder={t("pwInitiatedByPh")} />
            </div>
            <div>
              <label style={S.label}>{t("pwDecisionBy")}</label>
              <input style={S.input} value={form.decisionBy} onChange={(e) => setField("decisionBy", e.target.value)} placeholder={t("pwDecisionByPh")} />
            </div>
          </div>
        </div>

        {/* Section 2: Distribution scope — the withdrawal ↔ recall boundary */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwScopeTitle")}</div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("pwLevel")}</label>
              <select style={S.select} value={form.distributionLevel} onChange={(e) => setField("distributionLevel", e.target.value)}>
                <option value="Warehouse">{t("pwLevelWarehouse")}</option>
                <option value="Transit">{t("pwLevelTransit")}</option>
                <option value="Branch">{t("pwLevelBranch")}</option>
                <option value="Shelf">{t("pwLevelShelf")}</option>
                <option value="Wholesale">{t("pwLevelWholesale")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("pwConsumerReached")}</label>
              <select style={S.select} value={form.consumerReached} onChange={(e) => setField("consumerReached", e.target.value)}>
                <option value="no">{t("pwConsumerNo")}</option>
                <option value="yes">{t("pwConsumerYes")}</option>
              </select>
            </div>
          </div>

          {mustEscalate && (
            <div style={{ ...S.banner("danger"), marginTop: 12, marginBottom: 0 }}>
              {t("pwEscalateWarn")}
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button style={S.miniBtn("danger")} onClick={() => navigate("/haccp-iso/real-recall")}>
                  {t("pwOpenRecall")}
                </button>
                <input
                  style={{ ...S.input, maxWidth: 220 }}
                  value={form.recallRef}
                  onChange={(e) => setField("recallRef", e.target.value)}
                  placeholder={t("pwRecallRefPh")}
                  title={t("pwRecallRef")}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Level + trigger + reason */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwClass")}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["A", "B", "C"]).map((cls) => {
              const ci = CLASS_INFO[cls];
              return (
                <div
                  key={cls}
                  style={S.classBox(form.withdrawalClass === cls, ci.color)}
                  onClick={() => setField("withdrawalClass", cls)}
                >
                  <div style={S.classTitle(ci.color)}>Level {cls}</div>
                  <div style={S.classDesc}>{t(ci.titleKey).replace(/^Level [^—]+—\s*/, "")}</div>
                </div>
              );
            })}
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("pwSource")}</label>
              <select style={S.select} value={form.source} onChange={(e) => setField("source", e.target.value)}>
                <option value="InternalQC">{t("pwSourceInternalQC")}</option>
                <option value="Lab">{t("pwSourceLab")}</option>
                <option value="Supplier">{t("pwSourceSupplier")}</option>
                <option value="Complaint">{t("pwSourceComplaint")}</option>
                <option value="Authority">{t("pwSourceAuthority")}</option>
                <option value="Trace">{t("pwSourceTrace")}</option>
                <option value="Other">{t("pwSourceOther")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("pwReason")}</label>
              <select style={S.select} value={form.reason} onChange={(e) => setField("reason", e.target.value)}>
                <option value="Micro">{t("pwReasonMicro")}</option>
                <option value="Chemical">{t("pwReasonChemical")}</option>
                <option value="Foreign">{t("pwReasonForeign")}</option>
                <option value="Allergen">{t("pwReasonAllergen")}</option>
                <option value="Label">{t("pwReasonLabel")}</option>
                <option value="Temperature">{t("pwReasonTemp")}</option>
                <option value="ShelfLife">{t("pwReasonShelfLife")}</option>
                <option value="Halal">{t("pwReasonHalal")}</option>
                <option value="Packaging">{t("pwReasonPackaging")}</option>
                <option value="Regulatory">{t("pwReasonRegulatory")}</option>
                <option value="Other">{t("pwReasonOther")}</option>
              </select>
            </div>
          </div>

          <label style={S.label}>{t("pwReasonDetail")}</label>
          <textarea style={S.textarea} value={form.reasonDetail} onChange={(e) => setField("reasonDetail", e.target.value)} placeholder={t("pwReasonDetailPh")} />
        </div>

        {/* Section 4: Affected product */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwAffectedTitle")}</div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("pwProduct")}</label>
              <ProductPicker
                value={form.product}
                itemCode={form.productCode}
                onPick={({ item_code, description }) =>
                  setForm((f) => ({ ...f, product: description, productCode: item_code }))
                }
                placeholder={t("pwProductPickerPh")}
                accent="#2563eb"
                inputStyle={S.input}
              />
              <div style={S.hint}>
                {form.productCode ? `${t("pwProductCode")}: ${form.productCode}` : t("pwProductFreeHint")}
              </div>
            </div>
            <div>
              <label style={S.label}>{t("pwBatches")}</label>
              <input style={S.input} value={form.batches} onChange={(e) => setField("batches", e.target.value)} placeholder={t("pwBatchesPh")} />
            </div>
          </div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("pwProductionDates")}</label>
              <input style={S.input} value={form.productionDates} onChange={(e) => setField("productionDates", e.target.value)} placeholder={t("pwProductionDatesPh")} />
            </div>
            <div>
              <label style={S.label}>{t("pwExpiryRange")}</label>
              <input style={S.input} value={form.expiryRange} onChange={(e) => setField("expiryRange", e.target.value)} placeholder={t("pwExpiryRangePh")} />
            </div>
          </div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("pwPackSize")}</label>
              <input style={S.input} value={form.packSize} onChange={(e) => setField("packSize", e.target.value)} placeholder={t("pwPackSizePh")} />
            </div>
            <div>
              <label style={S.label}>{t("pwTraceRef")}</label>
              <input style={S.input} value={form.traceRef} onChange={(e) => setField("traceRef", e.target.value)} placeholder={t("pwTraceRefPh")} />
              <div style={S.hint}>{t("pwTraceOrManual")}</div>
            </div>
          </div>

          {/* Real traceability link — replaces guessing at a reference by hand */}
          <div style={{ marginTop: 12 }}>
            {form.traceLink ? (
              <div style={S.linkedCard}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: "#0b1f4d", fontSize: "0.92rem" }}>
                    🔗 {traceLinkTitle(form.traceLink, t)}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, marginTop: 3 }}>
                    📅 {form.traceLink.date || "—"}
                    {form.traceLink.branch ? ` · 🏭 ${form.traceLink.branch}` : ""}
                    {form.traceLink.rowsCount ? ` · ${form.traceLink.rowsCount} ${t("pwTraceRows")}` : ""}
                    {form.traceLink.tracedPct != null ? ` · ${form.traceLink.tracedPct.toFixed(1)}%` : ""}
                  </div>
                </div>
                <button style={S.miniBtn("danger")} onClick={() => setField("traceLink", null)}>
                  {t("pwTraceUnlink")}
                </button>
              </div>
            ) : (
              <button style={S.btn("secondary")} onClick={() => setTracePickerOpen(true)}>
                {t("pwTraceLinkBtn")}
              </button>
            )}
          </div>
        </div>

        <TraceLinkPicker
          open={tracePickerOpen}
          onClose={() => setTracePickerOpen(false)}
          onPick={(summary) => {
            setForm((f) => ({
              ...f,
              traceLink: summary,
              /* Fill the blanks the drill already knows, without overwriting input. */
              product: f.product || summary.product || "",
              batches: f.batches || summary.batch || "",
              traceRef: f.traceRef || (summary.kind === "mock_recall"
                ? `${t("pwTraceKindDrill")} ${summary.date || ""}`.trim()
                : `${summary.branch || ""} ${summary.date || ""}`.trim()),
            }));
          }}
          t={t}
          lang={lang}
          dir={dir}
        />

        {/* Section 5: Stock hold table — the heart of a withdrawal */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwLocationsTitle")}</div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ minWidth: 140 }}>
              <label style={{ ...S.label, marginTop: 0 }}>{t("pwUnit")}</label>
              <select style={S.select} value={form.unit} onChange={(e) => setField("unit", e.target.value)}>
                <option value="kg">{t("pwUnitKg")}</option>
                <option value="units">{t("pwUnitUnits")}</option>
                <option value="packs">{t("pwUnitPacks")}</option>
                <option value="tons">{t("pwUnitTons")}</option>
              </select>
            </div>
            <button style={S.btn("primary")} onClick={addLocation}>{t("pwLocAdd")}</button>
            <div style={{ ...S.hint, marginInlineStart: "auto" }}>{t("pwLocationsHint")}</div>
          </div>

          {(form.locations || []).length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontWeight: 700, fontSize: 13 }}>
              {t("pwLocEmpty")}
            </div>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t("pwLocLocation")}</th>
                    <th style={S.th}>{t("pwLocDispatched")}</th>
                    <th style={S.th}>{t("pwLocHeld")}</th>
                    <th style={S.th}>{t("pwLocReturned")}</th>
                    <th style={S.th}>{t("pwLocSold")}</th>
                    <th style={S.th}>{t("pwLocContact")}</th>
                    <th style={S.th}>{t("pwLocNotifiedAt")}</th>
                    <th style={S.th}>{t("pwLocConfirmed")}</th>
                    <th style={S.th} />
                  </tr>
                </thead>
                <tbody>
                  {(form.locations || []).map((l) => {
                    const soldRow = num(l.sold) > 0;
                    return (
                      <tr key={l.uid} style={soldRow ? { background: "#fef2f2" } : undefined}>
                        <td style={S.td}>
                          <input style={{ ...S.cellInput, minWidth: 160 }} value={l.location} onChange={(e) => setLocation(l.uid, "location", e.target.value)} placeholder={t("pwLocLocationPh")} />
                        </td>
                        <td style={S.td}>
                          <input type="number" min="0" step="any" style={S.cellInput} value={l.dispatched} onChange={(e) => setLocation(l.uid, "dispatched", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <input type="number" min="0" step="any" style={S.cellInput} value={l.held} onChange={(e) => setLocation(l.uid, "held", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <input type="number" min="0" step="any" style={S.cellInput} value={l.returned} onChange={(e) => setLocation(l.uid, "returned", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <input type="number" min="0" step="any" style={{ ...S.cellInput, borderColor: soldRow ? "#fca5a5" : "#fde68a" }} value={l.sold} onChange={(e) => setLocation(l.uid, "sold", e.target.value)} />
                        </td>
                        <td style={S.td}>
                          <input style={{ ...S.cellInput, minWidth: 110 }} value={l.contact} onChange={(e) => setLocation(l.uid, "contact", e.target.value)} placeholder={t("pwLocContactPh")} />
                        </td>
                        <td style={S.td}>
                          <input type="datetime-local" style={{ ...S.cellInput, minWidth: 170 }} value={l.notifiedAt} onChange={(e) => setLocation(l.uid, "notifiedAt", e.target.value)} />
                        </td>
                        <td style={{ ...S.td, textAlign: "center" }}>
                          <input type="checkbox" checked={!!l.confirmed} onChange={(e) => setLocation(l.uid, "confirmed", e.target.checked)} style={{ width: 16, height: 16 }} />
                        </td>
                        <td style={{ ...S.td, textAlign: "center" }}>
                          <button style={S.miniBtn("danger")} onClick={() => removeLocation(l.uid)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: "#fffbeb", fontWeight: 900 }}>
                    <td style={{ ...S.td, padding: "8px 6px", color: "#78350f" }}>{t("pwLocTotals")}</td>
                    <td style={{ ...S.td, padding: "8px 6px" }}>{totals.dispatched || "—"}</td>
                    <td style={{ ...S.td, padding: "8px 6px" }}>{totals.held || "—"}</td>
                    <td style={{ ...S.td, padding: "8px 6px" }}>{totals.returned || "—"}</td>
                    <td style={{ ...S.td, padding: "8px 6px", color: totals.sold > 0 ? "#b91c1c" : undefined }}>{totals.sold || "—"}</td>
                    <td style={S.td} colSpan={4}>
                      <span style={{ fontSize: 11, color: "#78350f" }}>
                        {totals.confirmedCount} / {totals.locationCount} ✓
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {totals.accountedRate !== null && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 12, color: "#78350f" }}>
                {t("pwAccountedRate")}: <span style={{ color: rateColor }}>{totals.accountedRate.toFixed(1)}%</span>
              </strong>
              <div style={S.progressOuter}>
                <div style={S.progressInner(totals.accountedRate, rateColor)} />
              </div>
              <span style={S.hint}>{t("pwAccountedHint")}</span>
            </div>
          )}

          {totals.sold > 0 && (
            <div style={{ ...S.banner("danger"), marginTop: 10, marginBottom: 0 }}>{t("pwSoldWarn")}</div>
          )}
        </div>

        {/* Section 6: Hold & quarantine */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwHoldTitle")}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("pwHoldStart")}</label>
              <input type="datetime-local" style={S.input} value={form.holdStart} onChange={(e) => setField("holdStart", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("pwHoldCompleted")}</label>
              <input type="datetime-local" style={S.input} value={form.holdCompleted} onChange={(e) => setField("holdCompleted", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{t("pwHoldArea")}</label>
              <input style={S.input} value={form.holdArea} onChange={(e) => setField("holdArea", e.target.value)} placeholder={t("pwHoldAreaPh")} />
            </div>
          </div>

          {secureHours !== null && (
            <div style={{
              marginTop: 10, padding: "8px 12px", borderRadius: 8,
              background: secureHours <= 24 ? "#dcfce7" : secureHours <= 48 ? "#fef3c7" : "#fee2e2",
              border: `1.5px solid ${secureHours <= 24 ? "#86efac" : secureHours <= 48 ? "#fcd34d" : "#fca5a5"}`,
              color: secureHours <= 24 ? "#166534" : secureHours <= 48 ? "#854d0e" : "#7f1d1d",
              fontSize: 12, fontWeight: 900,
            }}>
              ⏱ {t("pwTimeToSecure")}: {secureHours.toFixed(1)} h {secureHours <= 24 ? "✓" : "⚠"}
              <span style={{ fontWeight: 700, opacity: 0.8 }}> — {t("pwTimeToSecureHint")}</span>
            </div>
          )}

          <div style={{ ...S.row3, marginTop: 12 }}>
            {[
              ["holdLabel", "pwHoldLabel"],
              ["holdSegregated", "pwHoldSegregated"],
              ["holdSystemBlock", "pwHoldSystemBlock"],
            ].map(([key, tk]) => (
              <div key={key}>
                <label style={S.label}>{t(tk)}</label>
                <select style={S.select} value={form[key]} onChange={(e) => setField(key, e.target.value)}>
                  <option value="yes">{t("pwYes")}</option>
                  <option value="partial">{t("pwPartial")}</option>
                  <option value="no">{t("pwNo")}</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Section 7: Notifications */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwNotifyTitle")}</div>
          <label style={{ ...S.label, marginTop: 0 }}>{t("pwNotifyInternalTitle")}</label>
          <div style={S.checkboxGrid}>
            {Object.entries({
              Branches: t("pwNotifyBranches"),
              Ops: t("pwNotifyOps"),
              Warehouse: t("pwNotifyWarehouse"),
              Mgmt: t("pwNotifyMgmt"),
              Wholesale: t("pwNotifyWholesale"),
              Supplier: t("pwNotifySupplier"),
            }).map(([key, label]) => (
              <label key={key} style={S.checkLabel(!!form.notified[key])}>
                <input type="checkbox" checked={!!form.notified[key]} onChange={() => toggleNotified(key)} style={{ width: 16, height: 16 }} />
                {label}
              </label>
            ))}
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("pwNoticeIssued")}</label>
              <select style={S.select} value={form.noticeIssued} onChange={(e) => setField("noticeIssued", e.target.value)}>
                <option value="no">{t("pwNo")}</option>
                <option value="yes">{t("pwYes")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("pwNoticeRef")}</label>
              <input style={S.input} value={form.noticeRef} onChange={(e) => setField("noticeRef", e.target.value)} placeholder={t("pwNoticeRefPh")} disabled={form.noticeIssued !== "yes"} />
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{t("pwAuthorityNotified")}</label>
              <select style={S.select} value={form.authorityNotified} onChange={(e) => setField("authorityNotified", e.target.value)}>
                <option value="no">{t("pwNo")}</option>
                <option value="yes">{t("pwYes")}</option>
              </select>
              <div style={S.hint}>{t("pwAuthorityNotifiedHint")}</div>
            </div>
            {form.authorityNotified === "yes" && (
              <div>
                <label style={S.label}>{t("pwAuthorityWhich")}</label>
                <input style={S.input} value={form.authorityWhich} onChange={(e) => setField("authorityWhich", e.target.value)} placeholder={t("pwAuthorityWhichPh")} />
                <label style={S.label}>{t("pwAuthorityAt")}</label>
                <input type="datetime-local" style={S.input} value={form.authorityAt} onChange={(e) => setField("authorityAt", e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* Section 8: Disposition */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwDispositionTitle")}</div>
          <div style={S.row}>
            <div>
              <select style={S.select} value={form.disposition} onChange={(e) => setField("disposition", e.target.value)}>
                <option value="Pending">{t("pwDispPending")}</option>
                <option value="Destroy">{t("pwDispDestroy")}</option>
                <option value="Rework">{t("pwDispRework")}</option>
                <option value="Redirect">{t("pwDispRedirect")}</option>
                <option value="ReturnSupplier">{t("pwDispReturnSupplier")}</option>
                <option value="Release">{t("pwDispRelease")}</option>
                <option value="Mixed">{t("pwDispMixed")}</option>
              </select>
            </div>
            <div>
              <input style={S.input} value={form.destructionRef} onChange={(e) => setField("destructionRef", e.target.value)} placeholder={t("pwDestructionRefPh")} title={t("pwDestructionRef")} />
            </div>
          </div>
          <label style={S.label}>{t("pwDispositionDetails")}</label>
          <textarea style={S.textarea} value={form.dispositionDetails} onChange={(e) => setField("dispositionDetails", e.target.value)} placeholder={t("pwDispositionDetailsPh")} />
        </div>

        {/* Section 9: Cost */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwCostTitle")}</div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("pwCost")}</label>
              <input type="number" min="0" step="0.01" style={S.input} value={form.cost} onChange={(e) => setField("cost", e.target.value)} placeholder={t("pwCostPh")} />
            </div>
          </div>
          <label style={S.label}>{t("pwCostBreakdown")}</label>
          <textarea style={S.textarea} value={form.costBreakdown} onChange={(e) => setField("costBreakdown", e.target.value)} placeholder={t("pwCostBreakdownPh")} />
        </div>

        {/* Section 10: Effectiveness verification */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwVerifyTitle")}</div>
          <div style={S.row}>
            <div>
              <label style={S.label}>{t("pwVerifiedBy")}</label>
              <input style={S.input} value={form.verifiedBy} onChange={(e) => setField("verifiedBy", e.target.value)} placeholder={t("pwVerifiedByPh")} />
            </div>
            <div>
              <label style={S.label}>{t("pwVerificationDate")}</label>
              <input type="date" style={S.input} value={form.verificationDate} onChange={(e) => setField("verificationDate", e.target.value)} />
            </div>
          </div>
          <label style={S.label}>{t("pwVerificationNotes")}</label>
          <textarea style={S.textarea} value={form.verificationNotes} onChange={(e) => setField("verificationNotes", e.target.value)} placeholder={t("pwVerificationNotesPh")} />
        </div>

        {/* Section 11: CAPA */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwCAPATitle")}</div>
          <label style={S.label}>{t("pwRootCause")}</label>
          <textarea style={S.textarea} value={form.rootCause} onChange={(e) => setField("rootCause", e.target.value)} placeholder={t("pwRootCausePh")} />

          <label style={S.label}>{t("pwCorrectiveActions")}</label>
          <textarea style={S.textarea} value={form.correctiveActions} onChange={(e) => setField("correctiveActions", e.target.value)} placeholder={t("pwCorrectiveActionsPh")} />

          <label style={S.label}>{t("pwPreventiveActions")}</label>
          <textarea style={S.textarea} value={form.preventiveActions} onChange={(e) => setField("preventiveActions", e.target.value)} placeholder={t("pwPreventiveActionsPh")} />

          <label style={S.label}>{t("pwNcrRef")}</label>
          <input style={{ ...S.input, maxWidth: 260 }} value={form.ncrRef} onChange={(e) => setField("ncrRef", e.target.value)} placeholder={t("pwNcrRefPh")} />
        </div>

        {/* Section 12: Supporting documents */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwAttTitle")}</div>
          <WithdrawalAttachments
            value={form.attachments}
            onChange={(next) => setField("attachments", next)}
            t={t}
            lang={lang}
            dir={dir}
            locations={form.locations}
          />
        </div>

        {/* Section 13: Status & closure */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{t("pwStatusTitle")}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{t("pwStatus")}</label>
              <select style={S.select} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="Open">{t("pwStatusOpen")}</option>
                <option value="InProgress">{t("pwStatusInProgress")}</option>
                <option value="Secured">{t("pwStatusSecured")}</option>
                <option value="Closed">{t("pwStatusClosed")}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{t("pwClosureDate")}</label>
              <input type="date" style={S.input} value={form.closureDate} onChange={(e) => setField("closureDate", e.target.value)} disabled={form.status !== "Closed"} />
            </div>
            <div>
              <label style={S.label}>{t("pwSignedBy")}</label>
              <input style={S.input} value={form.signedBy} onChange={(e) => setField("signedBy", e.target.value)} placeholder={t("pwSignedByPh")} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>{t("cancel")}</button>
          <button style={S.btn("success")} onClick={save} disabled={saving}>
            {saving ? t("saving") : t("pwSaveBtn")}
          </button>
        </div>
      </div>
    </main>
  );
}
