// src/pages/haccp and iso/FoodSafetyPolicy/FoodSafetyPolicyView.jsx
// Food Safety Policy — controlled document display + acknowledgment evidence (ISO 5.2)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";
import { POLICY_META, POLICY_EN, POLICY_AR } from "./policyContent";

const ACK_TYPE = "policy_acknowledgment";
const STORAGE_KEY = "fsp_acked_v1";

const S = {
  shell: {
    minHeight: "100vh",
    padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #fef3c7 0%, #fffbeb 60%, #ffffff 100%)",
    color: "#1f2937",
  },
  layout: { width: "100%", maxWidth: 980, margin: "0 auto" },

  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    border: "1px solid #fde68a",
    boxShadow: "0 8px 24px rgba(180,83,9,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#78350f", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#92400e", marginTop: 4, fontWeight: 700 },

  /* Policy document — formal/print-friendly */
  policyDoc: {
    background: "#fff",
    borderRadius: 14,
    border: "2px solid #d97706",
    boxShadow: "0 12px 32px rgba(180,83,9,0.12)",
    overflow: "hidden",
  },
  docHeader: {
    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
    padding: "20px 28px",
    borderBottom: "2px solid #d97706",
  },
  docHeaderRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 14,
  },
  brand: { display: "flex", alignItems: "center", gap: 14 },
  logo: {
    width: 56, height: 56, borderRadius: 12, objectFit: "cover",
    border: "1.5px solid #d97706", background: "#fff",
  },
  brandText: {},
  companyName: { fontSize: 16, fontWeight: 950, color: "#78350f", lineHeight: 1.2 },
  companySub: { fontSize: 12, fontWeight: 800, color: "#92400e", marginTop: 4 },
  metaBox: {
    display: "grid", gridTemplateColumns: "auto auto", gap: "4px 14px",
    padding: "10px 14px",
    background: "#fff", borderRadius: 10,
    border: "1.5px solid #d97706",
    fontSize: 12, fontWeight: 800,
  },
  metaLabel: { color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 10 },
  metaVal: { color: "#1f2937", fontWeight: 900 },

  docTitle: {
    fontSize: 32, fontWeight: 950, color: "#78350f",
    textAlign: "center", margin: "26px 0 6px",
    letterSpacing: "0.02em",
  },
  docSubtitle: { fontSize: 14, fontWeight: 800, color: "#92400e", textAlign: "center", marginBottom: 26 },
  docBody: { padding: "0 32px 32px", fontSize: 15, lineHeight: 1.75, color: "#1f2937" },
  preamble: {
    fontSize: 16, fontWeight: 700, fontStyle: "italic",
    padding: "16px 22px",
    background: "#fef3c7",
    borderRadius: 10,
    borderInlineStart: "4px solid #d97706",
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: 950, color: "#78350f",
    marginTop: 24, marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "2px solid #fde68a",
    display: "flex", alignItems: "center", gap: 8,
  },
  bullet: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  bulletDot: {
    flexShrink: 0, width: 20, height: 20, borderRadius: "50%",
    background: "linear-gradient(135deg, #d97706, #b45309)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 950, marginTop: 2,
  },
  signature: {
    marginTop: 28, paddingTop: 18,
    borderTop: "2px dashed #d97706",
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24,
  },
  sigBox: {},
  sigLabel: { fontSize: 11, fontWeight: 900, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 },
  sigValue: { fontSize: 14, fontWeight: 800, color: "#1f2937", borderBottom: "1px solid #d1d5db", paddingBottom: 4, fontStyle: "italic" },

  /* Acknowledgment card */
  ackCard: {
    background: "linear-gradient(180deg, #ecfdf5, #d1fae5)",
    borderRadius: 14,
    border: "2px solid #16a34a",
    padding: 22,
    marginTop: 16,
    boxShadow: "0 10px 28px rgba(22,163,74,0.16)",
  },
  ackTitle: { fontSize: 18, fontWeight: 950, color: "#14532d", marginBottom: 6 },
  ackHint: { fontSize: 13, color: "#166534", marginBottom: 14, fontWeight: 700 },

  ackedBanner: {
    background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
    border: "2px solid #16a34a",
    color: "#14532d",
    padding: "14px 18px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 800,
    marginTop: 16,
    display: "flex", alignItems: "center", gap: 10,
  },

  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#14532d", marginBottom: 4, marginTop: 10 },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #86efac", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #d97706, #b45309)", color: "#fff", border: "#92400e" },
      secondary: { bg: "#fff",                                      color: "#92400e", border: "#fde68a" },
      success:   { bg: "linear-gradient(180deg, #16a34a, #15803d)", color: "#fff", border: "#166534" },
      ghost:     { bg: "transparent", color: "#92400e", border: "#d97706" },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "9px 18px", borderRadius: 999, cursor: "pointer",
      fontWeight: 900, fontSize: 13, whiteSpace: "nowrap",
    };
  },

  /* Admin / stats panel */
  adminToggle: {
    background: "rgba(255,255,255,0.95)",
    border: "1.5px solid #fde68a",
    borderRadius: 999,
    padding: "10px 18px",
    fontSize: 13, fontWeight: 900,
    color: "#92400e",
    cursor: "pointer",
    margin: "16px auto",
    display: "block",
  },
  statsCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    marginTop: 12,
    border: "1px solid #fde68a",
    boxShadow: "0 6px 16px rgba(180,83,9,0.06)",
  },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 },
  kpi: (color) => ({
    background: "#fff",
    borderRadius: 12,
    padding: "12px 14px",
    border: `1px solid ${color}33`,
    borderInlineStart: `4px solid ${color}`,
  }),
  kpiVal: (color) => ({ fontSize: 24, fontWeight: 950, color, lineHeight: 1 }),
  kpiLabel: { fontSize: 11, fontWeight: 800, color: "#64748b", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 10 },
  th: { padding: "8px 10px", textAlign: "start", background: "#78350f", color: "#fff", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" },
  td: { padding: "8px 10px", borderTop: "1px solid #fef3c7", fontWeight: 700, color: "#1f2937" },

  /* Print styles via inline media query */
};

export default function FoodSafetyPolicyView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";
  const content = isAr ? POLICY_AR : POLICY_EN;

  const [acks, setAcks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedAck, setSavedAck] = useState(null);

  const [form, setForm] = useState({
    name: "",
    role: "",
    department: "",
    branch: "",
    empId: "",
    ackDate: new Date().toISOString().slice(0, 10),
    signature: "",
  });

  /* Local memory of "did this user already ack?" */
  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) setSavedAck(JSON.parse(v));
    } catch {}
  }, []);

  /* Load all acknowledgments (for admin stats) */
  async function loadAcks() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(ACK_TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(b?.payload?.ackDate || 0) - new Date(a?.payload?.ackDate || 0));
      setAcks(arr);
    } catch {
      setAcks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAcks(); }, []);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submitAck() {
    if (!form.name || !form.role || !form.signature) {
      alert(t("requiredField"));
      return;
    }
    if (form.signature.trim().toLowerCase() !== form.name.trim().toLowerCase()) {
      alert(isAr
        ? "❌ التوقيع يجب أن يطابق الاسم الكامل."
        : "❌ Signature must match the full name.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        policyDocNo: POLICY_META.docNo,
        policyRevision: POLICY_META.revision,
        savedAt: Date.now(),
      };
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.name, type: ACK_TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: form.name, ackDate: form.ackDate, revision: POLICY_META.revision })); } catch {}
      setSavedAck({ name: form.name, ackDate: form.ackDate, revision: POLICY_META.revision });
      setSubmitted(true);
      loadAcks();
    } catch (e) {
      alert(t("saveError") + ": " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const total = acks.length;
    const now = new Date();
    const thisMonth = acks.filter((a) => {
      const d = new Date(a?.payload?.ackDate || 0);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const thisYear = acks.filter((a) => {
      const d = new Date(a?.payload?.ackDate || 0);
      return d.getFullYear() === now.getFullYear();
    }).length;
    return { total, thisMonth, thisYear };
  }, [acks]);

  function newAck() {
    setSubmitted(false);
    setSavedAck(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setForm({
      name: "", role: "", department: "", branch: "", empId: "",
      ackDate: new Date().toISOString().slice(0, 10), signature: "",
    });
  }

  // Only consider "already acknowledged" if the saved revision matches the current one
  const alreadyAcked = !!savedAck && !submitted && savedAck.revision === POLICY_META.revision;

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div style={S.layout}>
        {/* Top bar */}
        <div style={S.topbar} className="no-print">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={S.title}>{t("fspTitle")}</div>
            <div style={S.subtitle}>{t("fspSubtitle")}</div>
            <HaccpLinkBadge clauses={["5.2"]} label={isAr ? "سياسة سلامة الغذاء" : "Food Safety Policy"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("ghost")} onClick={() => window.print()}>{t("fspPrintBtn")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* Policy document */}
        <article style={S.policyDoc}>
          {/* Document header */}
          <div style={S.docHeader}>
            <div style={S.docHeaderRow}>
              <div style={S.brand}>
                <img src={mawashiLogo} alt="Al Mawashi" style={S.logo} />
                <div style={S.brandText}>
                  <div style={S.companyName}>TRANS EMIRATES LIVESTOCK TRADING L.L.C.</div>
                  <div style={S.companySub}>AL MAWASHI — Food Safety Management System</div>
                </div>
              </div>
              <div style={S.metaBox}>
                <span style={S.metaLabel}>{isAr ? "رقم الوثيقة" : "Doc No."}</span>
                <span style={S.metaVal}>{POLICY_META.docNo}</span>
                <span style={S.metaLabel}>{t("fspIssueDate")}</span>
                <span style={S.metaVal}>{POLICY_META.issueDate}</span>
                <span style={S.metaLabel}>{t("fspRevision")}</span>
                <span style={S.metaVal}>{POLICY_META.revision}</span>
                <span style={S.metaLabel}>{isAr ? "البند ISO" : "ISO Clause"}</span>
                <span style={S.metaVal}>{POLICY_META.isoClause}</span>
              </div>
            </div>
          </div>

          {/* Document title */}
          <h1 style={S.docTitle}>
            {isAr ? "سياسة سلامة الغذاء" : "Food Safety Policy"}
          </h1>
          <div style={S.docSubtitle}>
            {isAr ? "نظام إدارة سلامة الغذاء — ISO 22000:2018 + HACCP" : "Food Safety Management System — ISO 22000:2018 + HACCP"}
          </div>

          {/* Document body */}
          <div style={S.docBody}>
            <div style={S.preamble}>{content.preamble}</div>

            <div style={S.sectionTitle}>📌 {t("fspPurposeTitle")}</div>
            <p>{content.purpose}</p>

            <div style={S.sectionTitle}>🎯 {t("fspScopeTitle")}</div>
            <p>{content.scope}</p>

            <div style={S.sectionTitle}>🤝 {t("fspCommitmentsTitle")}</div>
            <div>
              {content.commitments.map((line, i) => (
                <div key={i} style={S.bullet}>
                  <span style={S.bulletDot}>{i + 1}</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>

            <div style={S.sectionTitle}>📢 {t("fspCommunicationTitle")}</div>
            <p>{content.communication}</p>

            <div style={S.sectionTitle}>🔄 {t("fspReviewTitle")}</div>
            <p>{content.review}</p>

            {/* Signature block */}
            <div style={S.signature}>
              <div style={S.sigBox}>
                <div style={S.sigLabel}>{t("fspApprovedBy")}</div>
                <div style={S.sigValue}>{POLICY_META.approvedBy}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  {isAr ? POLICY_META.approvedRoleAr : POLICY_META.approvedRole}
                </div>
              </div>
              <div style={S.sigBox}>
                <div style={S.sigLabel}>{t("fspIssueDate")}</div>
                <div style={S.sigValue}>{POLICY_META.issueDate}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  {t("fspRevision")} {POLICY_META.revision}
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Acknowledgment block */}
        <div className="no-print">
          {alreadyAcked && !submitted && (
            <div style={S.ackedBanner}>
              <span style={{ fontSize: 22 }}>✅</span>
              <div style={{ flex: 1 }}>
                {isAr
                  ? `سبق وأن سجّلت اطلاعك (${savedAck.name}) بتاريخ ${savedAck.ackDate} على الإصدار ${savedAck.revision}.`
                  : `You already acknowledged this policy (${savedAck.name}) on ${savedAck.ackDate} for revision ${savedAck.revision}.`}
              </div>
              <button style={S.btn("ghost")} onClick={newAck}>{t("fspNewAckBtn")}</button>
            </div>
          )}

          {submitted ? (
            <div style={S.ackedBanner}>
              <span style={{ fontSize: 22 }}>✅</span>
              <div style={{ flex: 1 }}>{t("fspAckSuccess")}</div>
              <button style={S.btn("ghost")} onClick={newAck}>{t("fspNewAckBtn")}</button>
            </div>
          ) : !alreadyAcked && (
            <div style={S.ackCard}>
              <div style={S.ackTitle}>{t("fspAckBoxTitle")}</div>
              <div style={S.ackHint}>{t("fspAckHint")}</div>

              <div style={S.row}>
                <div>
                  <label style={S.label}>{t("fspName")}</label>
                  <input style={S.input} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder={t("fspNamePh")} />
                </div>
                <div>
                  <label style={S.label}>{t("fspRole")}</label>
                  <input style={S.input} value={form.role} onChange={(e) => setField("role", e.target.value)} placeholder={t("fspRolePh")} />
                </div>
              </div>

              <div style={S.row3}>
                <div>
                  <label style={S.label}>{t("fspDept")}</label>
                  <input style={S.input} value={form.department} onChange={(e) => setField("department", e.target.value)} placeholder={t("fspDeptPh")} />
                </div>
                <div>
                  <label style={S.label}>{t("fspBranch")}</label>
                  <input style={S.input} value={form.branch} onChange={(e) => setField("branch", e.target.value)} placeholder={t("fspBranchPh")} />
                </div>
                <div>
                  <label style={S.label}>{t("fspEmpId")}</label>
                  <input style={S.input} value={form.empId} onChange={(e) => setField("empId", e.target.value)} placeholder={t("fspEmpIdPh")} />
                </div>
              </div>

              <div style={S.row}>
                <div>
                  <label style={S.label}>{t("fspAckDate")}</label>
                  <input type="date" style={S.input} value={form.ackDate} onChange={(e) => setField("ackDate", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>{t("fspSignature")}</label>
                  <input
                    style={{ ...S.input, fontStyle: "italic", fontWeight: 800 }}
                    value={form.signature}
                    onChange={(e) => setField("signature", e.target.value)}
                    placeholder={t("fspSignaturePh")}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button style={S.btn("success")} onClick={submitAck} disabled={loading}>
                  {loading ? t("saving") : t("fspAckSubmit")}
                </button>
              </div>
            </div>
          )}

          {/* Admin / stats toggle */}
          <button style={S.adminToggle} onClick={() => setShowAdmin((v) => !v)}>
            {showAdmin ? t("fspHideAdmin") : t("fspShowAdmin")}
          </button>

          {showAdmin && (
            <div style={S.statsCard}>
              <div style={{ fontSize: 16, fontWeight: 950, color: "#78350f", marginBottom: 12 }}>
                {t("fspAckList")}
              </div>

              <div style={S.kpiGrid}>
                <div style={S.kpi("#d97706")}>
                  <div style={S.kpiVal("#d97706")}>{stats.total}</div>
                  <div style={S.kpiLabel}>{t("fspAckTotal")}</div>
                </div>
                <div style={S.kpi("#16a34a")}>
                  <div style={S.kpiVal("#16a34a")}>{stats.thisMonth}</div>
                  <div style={S.kpiLabel}>{t("fspAckThisMonth")}</div>
                </div>
                <div style={S.kpi("#0891b2")}>
                  <div style={S.kpiVal("#0891b2")}>{stats.thisYear}</div>
                  <div style={S.kpiLabel}>{t("fspAckThisYear")}</div>
                </div>
              </div>

              {acks.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>{t("fspAckColName")}</th>
                        <th style={S.th}>{t("fspAckColRole")}</th>
                        <th style={S.th}>{t("fspAckColDept")}</th>
                        <th style={S.th}>{t("fspAckColBranch")}</th>
                        <th style={S.th}>{t("fspAckColDate")}</th>
                        <th style={S.th}>{t("fspRevision")}</th>
                        <th style={S.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {acks.slice(0, 50).map((rec) => {
                        const p = rec?.payload || {};
                        return (
                          <tr key={rec.id}>
                            <td style={{ ...S.td, fontWeight: 900 }}>{p.name}</td>
                            <td style={S.td}>{p.role}</td>
                            <td style={S.td}>{p.department || "—"}</td>
                            <td style={S.td}>{p.branch || "—"}</td>
                            <td style={S.td}>{p.ackDate}</td>
                            <td style={S.td}>{p.policyRevision || "—"}</td>
                            <td style={{ ...S.td, color: "#16a34a", fontWeight: 900 }}>{t("fspAckSignedBadge")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 30, color: "#92400e", fontStyle: "italic" }}>
                  {t("noRecords")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
