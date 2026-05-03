// src/pages/haccp and iso/InternalAudit/InternalAuditView.jsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "internal_audit_record";

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "#fef9c3" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },
  title: { fontSize: 22, fontWeight: 950, color: "#854d0e" },
  card: { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid #fde68a", boxShadow: "0 6px 16px rgba(245,158,11,0.08)" },
  btn: (kind) => {
    const map = {
      primary: { bg: "linear-gradient(180deg, #f59e0b, #d97706)", color: "#fff", border: "#b45309" },
      secondary: { bg: "#fff", color: "#854d0e", border: "#fde68a" },
      danger: { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 };
  },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 700 },
  rowHead: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 },
  meta: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4 },
  kpi: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 },
  kpiCard: { background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #fde68a", textAlign: "center" },
  pill: (color) => ({ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 950, color: "#fff", background: color }),
  finding: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 10, marginTop: 8 },
};

function findingTypeColor(t) {
  if (t === "MAJOR") return "#dc2626";
  if (t === "MINOR") return "#d97706";
  if (t === "OBS")   return "#0369a1";
  return "#15803d";
}

export default function InternalAuditView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(b?.payload?.auditDate || 0) - new Date(a?.payload?.auditDate || 0));
      setItems(arr);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const kpis = useMemo(() => {
    let total = items.length;
    let openNc = 0, closedNc = 0, major = 0;
    items.forEach((r) => {
      const findings = r?.payload?.findings || [];
      findings.forEach((f) => {
        if (f.closed) closedNc++; else openNc++;
        if (f.type === "MAJOR") major++;
      });
    });
    return { total, openNc, closedNc, major };
  }, [items]);

  async function del(id) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      load();
    } catch (e) { alert(t("deleteError") + ": " + e.message); }
  }

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("auditListTitle")}</div>
            <HaccpLinkBadge clauses={["9.2", "10.1"]} label={lang === "ar" ? "تدقيق داخلي + عدم مطابقة" : "Internal Audit + NC/CA"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "⏳" : t("refresh")}</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/internal-audit")}>{t("new")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        <div style={S.kpi}>
          <div style={S.kpiCard}>
            <div style={{ fontSize: 26, fontWeight: 950, color: "#0369a1" }}>{kpis.total}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{t("auditTotal")}</div>
          </div>
          <div style={S.kpiCard}>
            <div style={{ fontSize: 26, fontWeight: 950, color: "#dc2626" }}>{kpis.openNc}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{t("auditOpenNc")}</div>
          </div>
          <div style={S.kpiCard}>
            <div style={{ fontSize: 26, fontWeight: 950, color: "#15803d" }}>{kpis.closedNc}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{t("auditClosedNc")}</div>
          </div>
          <div style={S.kpiCard}>
            <div style={{ fontSize: 26, fontWeight: 950, color: "#b91c1c" }}>{kpis.major}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{t("auditMajor")}</div>
          </div>
        </div>

        {loading && <div style={S.empty}>{t("loading")}</div>}
        {!loading && items.length === 0 && <div style={S.empty}>{t("noRecords")}</div>}

        {items.map((rec) => {
          const p = rec?.payload || {};
          const isOpen = openId === rec.id;
          const open = (p.findings || []).filter((f) => !f.closed).length;
          return (
            <div key={rec.id} style={S.card}>
              <div style={S.rowHead}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 950, color: "#854d0e" }}>
                    {p.auditNumber || "AUDIT"} — {p.auditDate}
                  </div>
                  <div style={S.meta}>
                    🏢 {p.auditedDept || "—"} • 👤 {p.auditor || "—"} • {t("findings")}: {(p.findings || []).length} ({open} {lang === "ar" ? "مفتوح" : "open"})
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={S.btn("secondary")} onClick={() => setOpenId(isOpen ? null : rec.id)}>
                    {isOpen ? "▲" : "▼"} {t("findings")}
                  </button>
                  <button style={S.btn("secondary")} onClick={() => navigate(`/haccp-iso/internal-audit?edit=${rec.id}`)}>{t("edit")}</button>
                  <button style={S.btn("danger")} onClick={() => del(rec.id)}>{t("del")}</button>
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #fde68a" }}>
                  {p.scope && <div style={{ fontSize: 13, marginBottom: 8 }}><b>{t("auditScope")}:</b> {p.scope}</div>}
                  {(p.findings || []).map((f, i) => (
                    <div key={i} style={S.finding}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                        <div>
                          <span style={S.pill(findingTypeColor(f.type))}>{f.type}</span>
                          {f.clause && <span style={{ marginInlineStart: 6, fontSize: 11, fontWeight: 800, color: "#854d0e" }}>📕 {t("findingClause")} {f.clause}</span>}
                        </div>
                        {f.closed
                          ? <span style={S.pill("#16a34a")}>{t("statusClosed")}</span>
                          : <span style={S.pill("#d97706")}>{t("statusOpen")}</span>
                        }
                      </div>
                      {f.description && <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800 }}>{f.description}</div>}
                      {f.rootCause && <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}><b>{t("findingRootCause")}:</b> {f.rootCause}</div>}
                      {f.correctiveAction && <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}><b>{t("findingCorrective")}:</b> {f.correctiveAction}</div>}
                      {(f.responsiblePerson || f.dueDate) && (
                        <div style={{ marginTop: 4, fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                          {f.responsiblePerson && <>👤 {f.responsiblePerson} </>}
                          {f.dueDate && <>📅 {f.dueDate}</>}
                        </div>
                      )}
                    </div>
                  ))}
                  {p.conclusion && <div style={{ marginTop: 10, padding: 10, background: "#f0fdf4", borderRadius: 8, fontSize: 13 }}><b>{t("auditConclusion")}:</b> {p.conclusion}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
