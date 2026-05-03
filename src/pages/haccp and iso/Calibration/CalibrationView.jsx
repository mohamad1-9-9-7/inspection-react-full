// src/pages/haccp and iso/Calibration/CalibrationView.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "calibration_record";

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "#ecfeff" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },
  title: { fontSize: 22, fontWeight: 950, color: "#155e75" },
  card: { background: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, border: "1px solid #cffafe", boxShadow: "0 6px 16px rgba(8,145,178,0.06)" },
  btn: (kind) => {
    const map = {
      primary: { bg: "linear-gradient(180deg, #06b6d4, #0891b2)", color: "#fff", border: "#0e7490" },
      secondary: { bg: "#fff", color: "#155e75", border: "#cffafe" },
      danger: { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
    };
    const c = map[kind] || map.secondary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 };
  },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 700 },
  kpi: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 },
  kpiCard: { background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #cffafe", textAlign: "center" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 6px 16px rgba(8,145,178,0.06)" },
  th: { padding: "10px 12px", background: "#06b6d4", color: "#fff", textAlign: "start", fontWeight: 900, fontSize: 12.5 },
  td: { padding: "9px 12px", borderTop: "1px solid #e2e8f0", fontWeight: 700 },
  pill: (color) => ({ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 950, color: "#fff", background: color }),
};

function statusOfRec(record, t) {
  const today = Date.now();
  const next = record?.payload?.nextDueDate;
  if (!next) return { label: "—", color: "#64748b" };
  const tm = new Date(next).getTime();
  const days = Math.ceil((tm - today) / 86400000);
  if (days < 0)  return { label: t("overdueDays", { n: Math.abs(days) }), color: "#dc2626" };
  if (days < 30) return { label: t("dueInDays", { n: days }), color: "#d97706" };
  return { label: `${t("okStatus")} (${days}${t("days").charAt(0)})`, color: "#16a34a" };
}

export default function CalibrationView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(a?.payload?.nextDueDate || "9999-12-31") - new Date(b?.payload?.nextDueDate || "9999-12-31"));
      setItems(arr);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const kpis = useMemo(() => {
    const today = Date.now();
    let overdue = 0, due30 = 0, ok = 0;
    items.forEach((r) => {
      const next = r?.payload?.nextDueDate;
      if (!next) return;
      const t = new Date(next).getTime();
      const days = Math.ceil((t - today) / 86400000);
      if (days < 0) overdue++;
      else if (days < 30) due30++;
      else ok++;
    });
    return { total: items.length, overdue, due30, ok };
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    const today = Date.now();
    return items.filter((r) => {
      const next = r?.payload?.nextDueDate;
      if (!next) return false;
      const days = Math.ceil((new Date(next).getTime() - today) / 86400000);
      if (filter === "overdue") return days < 0;
      if (filter === "due30")   return days >= 0 && days < 30;
      if (filter === "ok")      return days >= 30;
      return true;
    });
  }, [items, filter]);

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
            <div style={S.title}>{t("calibListTitle")}</div>
            <HaccpLinkBadge clauses={["8.7"]} label={lang === "ar" ? "ضبط المراقبة والقياس" : "Control of Monitoring & Measuring"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "⏳" : t("refresh")}</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/calibration")}>{t("new")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        <div style={S.kpi}>
          <div style={S.kpiCard}>
            <div style={{ fontSize: 26, fontWeight: 950, color: "#0369a1" }}>{kpis.total}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{t("calibTotal")}</div>
          </div>
          <div style={{ ...S.kpiCard, cursor: "pointer", border: filter === "overdue" ? "2px solid #dc2626" : "1px solid #cffafe" }} onClick={() => setFilter(filter === "overdue" ? "all" : "overdue")}>
            <div style={{ fontSize: 26, fontWeight: 950, color: "#dc2626" }}>{kpis.overdue}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{t("calibOverdue")}</div>
          </div>
          <div style={{ ...S.kpiCard, cursor: "pointer", border: filter === "due30" ? "2px solid #d97706" : "1px solid #cffafe" }} onClick={() => setFilter(filter === "due30" ? "all" : "due30")}>
            <div style={{ fontSize: 26, fontWeight: 950, color: "#d97706" }}>{kpis.due30}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{t("calibDue30")}</div>
          </div>
          <div style={{ ...S.kpiCard, cursor: "pointer", border: filter === "ok" ? "2px solid #16a34a" : "1px solid #cffafe" }} onClick={() => setFilter(filter === "ok" ? "all" : "ok")}>
            <div style={{ fontSize: 26, fontWeight: 950, color: "#16a34a" }}>{kpis.ok}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{t("calibOk")}</div>
          </div>
        </div>

        {loading && <div style={S.empty}>{t("loading")}</div>}
        {!loading && items.length === 0 && <div style={S.empty}>{t("noRecords")}</div>}

        {filtered.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{t("colId")}</th>
                  <th style={S.th}>{t("colEquipment")}</th>
                  <th style={S.th}>{t("colType")}</th>
                  <th style={S.th}>{t("colLocation")}</th>
                  <th style={S.th}>{t("colLastCal")}</th>
                  <th style={S.th}>{t("colNextDue")}</th>
                  <th style={S.th}>{t("colResult")}</th>
                  <th style={S.th}>{t("colStatus")}</th>
                  <th style={S.th}>{t("colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec, i) => {
                  const p = rec?.payload || {};
                  const st = statusOfRec(rec, t);
                  const resultColor = p.result === "PASS" ? "#16a34a" : p.result === "ADJUSTED" ? "#d97706" : "#dc2626";
                  return (
                    <tr key={rec.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={S.td}>{p.equipmentId || "—"}</td>
                      <td style={S.td}><b>{p.equipmentName || "—"}</b></td>
                      <td style={S.td}>{p.equipmentType || "—"}</td>
                      <td style={S.td}>{p.location || "—"}</td>
                      <td style={S.td}>{p.lastCalibrationDate || "—"}</td>
                      <td style={{ ...S.td, fontWeight: 950 }}>{p.nextDueDate || "—"}</td>
                      <td style={S.td}><span style={S.pill(resultColor)}>{p.result || "—"}</span></td>
                      <td style={S.td}><span style={S.pill(st.color)}>{st.label}</span></td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button style={S.btn("secondary")} onClick={() => navigate(`/haccp-iso/calibration?edit=${rec.id}`)}>{t("edit")}</button>
                          <button style={S.btn("danger")} onClick={() => del(rec.id)}>{t("del")}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
