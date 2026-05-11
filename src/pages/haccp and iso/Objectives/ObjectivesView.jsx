// src/pages/haccp and iso/Objectives/ObjectivesView.jsx
// FSMS Objectives — List view with progress bars and KPI cards

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "fsms_objective";

const STATUS_INFO = {
  OnTrack: { color: "#16a34a", bg: "#dcfce7", icon: "✅" },
  AtRisk: { color: "#d97706", bg: "#fef3c7", icon: "⚠️" },
  OffTrack: { color: "#dc2626", bg: "#fecaca", icon: "❌" },
  Achieved: { color: "#7c3aed", bg: "#ede9fe", icon: "🏆" },
  OnHold: { color: "#64748b", bg: "#f1f5f9", icon: "⏸️" },
};

const CATEGORY_COLOR = {
  FoodSafety: "#dc2626",
  Quality: "#0891b2",
  Customer: "#ea580c",
  Supplier: "#0d9488",
  Training: "#7c3aed",
  Operations: "#0284c7",
};

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "#eef2ff" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },
  title: { fontSize: 22, fontWeight: 950, color: "#3730a3" },
  card: { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid #c7d2fe", boxShadow: "0 6px 16px rgba(67,56,202,0.06)" },
  btn: (kind) => {
    const map = {
      primary: { bg: "linear-gradient(180deg, #6366f1, #4f46e5)", color: "#fff", border: "#4338ca" },
      secondary: { bg: "#fff", color: "#3730a3", border: "#c7d2fe" },
      danger: { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 };
  },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 700 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 },
  kpi: (color) => ({
    background: "#fff",
    borderRadius: 14,
    padding: "14px 16px",
    border: `1px solid ${color}33`,
    boxShadow: "0 6px 16px rgba(67,56,202,0.06)",
    borderLeft: `4px solid ${color}`,
  }),
  kpiVal: (color) => ({ fontSize: 26, fontWeight: 950, color }),
  kpiLabel: { fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 },
  rowHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 },
  meta: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4 },
  badge: (c) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    fontSize: 11, fontWeight: 900, background: c.bg, color: c.color,
  }),
  detailBlock: { marginTop: 10, paddingTop: 10, borderTop: "1px dashed #c7d2fe" },
  miniTitle: { fontSize: 12, fontWeight: 900, color: "#3730a3", marginBottom: 4 },
  miniText: { fontSize: 13, color: "#1e293b", whiteSpace: "pre-wrap", lineHeight: 1.5 },
  progressOuter: { width: "100%", height: 22, background: "#f1f5f9", borderRadius: 999, overflow: "hidden", border: "1px solid #e2e8f0", marginTop: 8 },
  progressInner: (pct, color) => ({
    width: `${Math.max(0, Math.min(100, pct))}%`,
    height: "100%",
    background: `linear-gradient(180deg, ${color}cc, ${color})`,
    transition: "width 0.4s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 8,
    color: "#fff",
    fontSize: 11,
    fontWeight: 900,
  }),
  filters: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  filterBtn: (active, color) => ({
    padding: "6px 14px",
    borderRadius: 999,
    border: `1.5px solid ${active ? color : "#c7d2fe"}`,
    background: active ? color : "#fff",
    color: active ? "#fff" : "#3730a3",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  }),

  /* Charter (static ISO 6.2 Objectives) */
  charterCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    border: "1px solid #c7d2fe",
    boxShadow: "0 6px 16px rgba(67,56,202,0.06)",
    borderLeft: "4px solid #0891b2",
  },
  charterHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  charterTitle: { fontSize: 18, fontWeight: 950, color: "#0891b2" },
  charterPara: { fontSize: 13, color: "#1e293b", lineHeight: 1.7, marginBottom: 8 },
  charterParaTelt: { fontSize: 13, color: "#1e293b", lineHeight: 1.7, marginBottom: 12 },
  teltMark: { color: "#dc2626", fontWeight: 900 },
  charterTableWrap: { overflowX: "auto", marginTop: 8, border: "1px solid #cbd5e1", borderRadius: 8 },
  charterTable: { width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 720 },
  charterTh: {
    background: "#ecfeff",
    color: "#0891b2",
    fontWeight: 900,
    textAlign: "start",
    padding: "10px 12px",
    borderBottom: "2px solid #0891b2",
    borderRight: "1px solid #cbd5e1",
    verticalAlign: "top",
    whiteSpace: "nowrap",
  },
  charterTd: {
    padding: "10px 12px",
    borderBottom: "1px solid #e2e8f0",
    borderRight: "1px solid #e2e8f0",
    color: "#1e293b",
    verticalAlign: "top",
    lineHeight: 1.5,
  },
};

const CHARTER_HEADERS_EN = ["Objective", "Target / Measure", "Action Plan", "Responsibility", "Frequency", "Monitoring / Verification"];
const CHARTER_HEADERS_AR = ["الهدف", "المستهدف / القياس", "خطة العمل", "المسؤولية", "التكرار", "المراقبة / التحقق"];

const CHARTER_ROWS_EN = [
  ["Achieve A Grade with zero major NCs", "100% compliance in internal & external audits", "Implement corrective/preventive actions, regular internal audits", "QA Manager / All Departments", "Every audit", "Internal audit reports, external audit reports"],
  ["Achieve A Grade from Abu Dhabi Municipality & Al Ain", "100% compliance with local regulations", "Review regulatory requirements, staff training, facility readiness", "QA Manager / Compliance Officer", "Every audit", "Municipal inspection reports"],
  ["100% staff trained in basic hygiene & EFST as per UAE regulation", "All production and support staff trained", "Conduct training programs, maintain attendance", "QA / HR", "Annually", "Training records, attendance sheets"],
  ["Achieve zero food safety complaints from customers", "<1 complaint per month", "Complaint handling system, root cause analysis & corrective actions", "QA / Customer Service", "Monthly", "Complaint logs, CAPA records"],
  ["Maintain cold storage temperature ≤5°C and processing area ≤10°C", "100% compliance with temperature limits", "Install sensors, alarms, monitor & record temperature", "Warehouse & Production Managers", "Daily", "Temperature logs, calibration reports"],
  ["Achieve ~50% GMP compliance across all sites", "≥50% score in GMP assessment", "Conduct site audits, corrective actions, staff training", "QA / Site Supervisors", "Quarterly", "GMP audit reports"],
  ["Ensure timely delivery of products", "≥ 95% on-time delivery", "Optimize routes, flexible delivery scheduling", "Logistics Manager", "Daily", "Delivery logs, transport records"],
  ["Prevent cross-contamination", "Zero contamination incidents", "Hygiene control, color-coded tools, training", "QA / Hygiene Officer", "Continuous", "Inspection checklist"],
  ["Ensure proper waste management", "100% compliance with waste disposal procedures", "Waste segregation, approved disposal contractor", "QA / Hygiene Officer", "Daily", "Waste disposal records, inspection"],
  ["Ensure continuous supply despite shipment delays", "No stock shortage / minimum buffer stock maintained", "Maintain multiple suppliers, safety stock, monitor global risks", "Procurement Manager", "Monthly", "Stock records, supplier performance review"],
  ["Prevent operational disruption due to flood", "Zero product loss due to flood", "Emergency plan, protect storage, backup transport", "Maintenance / Logistics", "As required", "Emergency drill, inspection records"],
];

const CHARTER_ROWS_AR = [
  ["الحصول على درجة A مع عدم وجود حالات عدم مطابقة كبيرة", "التزام 100% في التدقيق الداخلي والخارجي", "تنفيذ الإجراءات التصحيحية/الوقائية، تدقيقات داخلية منتظمة", "مدير الجودة / كل الأقسام", "كل تدقيق", "تقارير التدقيق الداخلي والخارجي"],
  ["الحصول على درجة A من بلدية أبوظبي والعين", "التزام 100% باللوائح المحلية", "مراجعة المتطلبات التنظيمية، تدريب الموظفين، جاهزية المنشأة", "مدير الجودة / مسؤول الالتزام", "كل تدقيق", "تقارير التفتيش البلدي"],
  ["تدريب 100% من الموظفين على النظافة الأساسية و EFST وفق لوائح الإمارات", "تم تدريب كل موظفي الإنتاج والدعم", "إجراء برامج التدريب وحفظ الحضور", "الجودة / الموارد البشرية", "سنوياً", "سجلات التدريب وأوراق الحضور"],
  ["تحقيق صفر شكاوى سلامة غذاء من العملاء", "أقل من شكوى واحدة شهرياً", "نظام معالجة الشكاوى، تحليل الأسباب الجذرية والإجراءات التصحيحية", "الجودة / خدمة العملاء", "شهرياً", "سجلات الشكاوى وسجلات CAPA"],
  ["الحفاظ على حرارة التخزين البارد ≤5°م ومنطقة التجهيز ≤10°م", "التزام 100% بحدود الحرارة", "تركيب حساسات وإنذارات ومراقبة وتسجيل الحرارة", "مدراء المستودع والإنتاج", "يومياً", "سجلات الحرارة وتقارير المعايرة"],
  ["تحقيق التزام GMP ~50% في جميع المواقع", "≥50% في تقييم GMP", "تدقيق المواقع، إجراءات تصحيحية، تدريب الموظفين", "الجودة / مشرفي المواقع", "ربع سنوي", "تقارير تدقيق GMP"],
  ["ضمان توصيل المنتجات في الوقت المحدد", "≥ 95% توصيل في الوقت", "تحسين الطرق، جدولة توصيل مرنة", "مدير اللوجستيات", "يومياً", "سجلات التوصيل وسجلات النقل"],
  ["منع التلوث المتقاطع", "صفر حالات تلوث", "ضبط النظافة، أدوات بألوان محددة، تدريب", "الجودة / مسؤول النظافة", "مستمر", "قائمة التفتيش"],
  ["ضمان إدارة سليمة للنفايات", "التزام 100% بإجراءات التخلص من النفايات", "فصل النفايات، مقاول تخلص معتمد", "الجودة / مسؤول النظافة", "يومياً", "سجلات التخلص من النفايات والتفتيش"],
  ["ضمان توريد مستمر رغم تأخيرات الشحن", "لا نقص بالمخزون / مخزون احتياطي محفوظ", "موردين متعددين، مخزون أمان، مراقبة المخاطر العالمية", "مدير المشتريات", "شهرياً", "سجلات المخزون ومراجعة أداء الموردين"],
  ["منع تعطّل العمليات بسبب الفيضانات", "صفر خسارة منتجات بسبب الفيضانات", "خطة طوارئ، حماية التخزين، نقل احتياطي", "الصيانة / اللوجستيات", "حسب الحاجة", "تمارين الطوارئ وسجلات التفتيش"],
];

function calcProgress(target, current, direction) {
  const t = parseFloat(target);
  const c = parseFloat(current);
  if (isNaN(t) || isNaN(c) || t === 0) return null;
  if (direction === "lower") {
    if (c <= t) return 100;
    return Math.max(0, 100 - ((c - t) / t) * 100);
  }
  return Math.min(150, (c / t) * 100);
}

export default function ObjectivesView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCharter, setShowCharter] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(b?.payload?.startDate || 0) - new Date(a?.payload?.startDate || 0));
      setItems(arr);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      load();
    } catch (e) { alert(t("deleteError") + ": " + e.message); }
  }

  const stats = useMemo(() => {
    const counts = { total: items.length, OnTrack: 0, AtRisk: 0, OffTrack: 0, Achieved: 0 };
    for (const rec of items) {
      const s = rec?.payload?.status;
      if (counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((rec) => (rec?.payload?.status || "OnTrack") === statusFilter);
  }, [items, statusFilter]);

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("objListTitle")}</div>
            <HaccpLinkBadge clauses={["6.2"]} label={lang === "ar" ? "أهداف FSMS" : "FSMS Objectives"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "⏳" : t("refresh")}</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/objectives")}>{t("new")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* Charter — Static ISO 6.2 Objectives & Planning */}
        <div style={S.charterCard}>
          <div style={S.charterHeader}>
            <div style={S.charterTitle}>
              {lang === "ar" ? "الأهداف وتخطيط تحقيقها" : "Objectives and Planning to Achieve Them"}
            </div>
            <button style={S.btn("secondary")} onClick={() => setShowCharter(!showCharter)}>
              {showCharter ? (lang === "ar" ? "▲ طيّ" : "▲ Hide") : (lang === "ar" ? "▼ عرض" : "▼ Show")}
            </button>
          </div>

          {showCharter && (
            <>
              <div style={S.charterPara}>
                {lang === "ar"
                  ? "تضع المنظمة أهداف سلامة الغذاء وتخطّط الإجراءات لتحقيقها، وذلك لضمان التحكم الفعّال بمخاطر سلامة الغذاء والتحسين المستمر لـ FSMS."
                  : "The organization establishes food safety objectives and plans actions to achieve them in order to ensure effective control of food safety hazards and continual improvement of the FSMS."}
              </div>
              <div style={S.charterParaTelt}>
                <span style={S.teltMark}>{lang === "ar" ? "يتم تطوير أهداف سلامة الغذاء لـ TELT" : "TELT's"}</span>{" "}
                {lang === "ar"
                  ? "بناءً على: المخاطر والفرص المحددة (البند 6.1)، سياسة سلامة الغذاء، المتطلبات القانونية والتنظيمية (UAE Food Code، بلدية دبي)، المتطلبات التشغيلية وتوقعات العملاء."
                  : "Food safety objectives are developed based on: Identified risks and opportunities (Clause 6.1), Food safety policy, Legal and regulatory requirements (UAE Food Code, Dubai Municipality), Operational requirements and customer expectations."}
              </div>

              <div style={S.charterTableWrap}>
                <table style={S.charterTable}>
                  <thead>
                    <tr>
                      {(lang === "ar" ? CHARTER_HEADERS_AR : CHARTER_HEADERS_EN).map((h, i) => (
                        <th key={i} style={S.charterTh}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(lang === "ar" ? CHARTER_ROWS_AR : CHARTER_ROWS_EN).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={S.charterTd}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* KPIs */}
        <div style={S.kpiGrid}>
          <div style={S.kpi("#3730a3")}>
            <div style={S.kpiVal("#3730a3")}>{stats.total}</div>
            <div style={S.kpiLabel}>{t("objTotal")}</div>
          </div>
          <div style={S.kpi("#16a34a")}>
            <div style={S.kpiVal("#16a34a")}>{stats.OnTrack}</div>
            <div style={S.kpiLabel}>{t("objOnTrack")}</div>
          </div>
          <div style={S.kpi("#d97706")}>
            <div style={S.kpiVal("#d97706")}>{stats.AtRisk}</div>
            <div style={S.kpiLabel}>{t("objAtRisk")}</div>
          </div>
          <div style={S.kpi("#dc2626")}>
            <div style={S.kpiVal("#dc2626")}>{stats.OffTrack}</div>
            <div style={S.kpiLabel}>{t("objOffTrack")}</div>
          </div>
          <div style={S.kpi("#7c3aed")}>
            <div style={S.kpiVal("#7c3aed")}>{stats.Achieved}</div>
            <div style={S.kpiLabel}>{t("objAchieved")}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={S.filters}>
          <button style={S.filterBtn(statusFilter === "all", "#3730a3")} onClick={() => setStatusFilter("all")}>
            {lang === "ar" ? "الكل" : "All"} ({items.length})
          </button>
          {Object.entries(STATUS_INFO).map(([key, info]) => (
            <button key={key} style={S.filterBtn(statusFilter === key, info.color)} onClick={() => setStatusFilter(key)}>
              {t(`objStatus${key}`)} ({items.filter((r) => (r?.payload?.status || "OnTrack") === key).length})
            </button>
          ))}
        </div>

        {loading && <div style={S.empty}>{t("loading")}</div>}
        {!loading && filtered.length === 0 && <div style={S.empty}>{t("noRecords")}</div>}

        {filtered.map((rec) => {
          const p = rec?.payload || {};
          const isOpen = openId === rec.id;
          const st = STATUS_INFO[p.status] || STATUS_INFO.OnTrack;
          const cat = CATEGORY_COLOR[p.category] || "#64748b";
          const progress = calcProgress(p.target, p.currentValue, p.direction);
          const progressColor = progress === null ? "#94a3b8"
            : progress >= 100 ? "#16a34a"
            : progress >= 80 ? "#22c55e"
            : progress >= 50 ? "#d97706"
            : "#dc2626";
          return (
            <div key={rec.id} style={S.card}>
              <div style={S.rowHead}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 950, color: "#3730a3" }}>{p.name || "—"}</div>
                  <div style={S.meta}>
                    👤 {p.owner || "—"} {p.frequency ? `• 📅 ${t(`objFrequency${p.frequency}`)}` : ""} {p.linkedClause ? `• ISO ${p.linkedClause}` : ""}
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={S.badge({ bg: `${cat}22`, color: cat })}>
                      {t(`objCategory${p.category || "FoodSafety"}`)}
                    </span>
                    <span style={S.badge({ bg: st.bg, color: st.color })}>
                      {st.icon} {t(`objStatus${p.status || "OnTrack"}`)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", whiteSpace: "nowrap" }}>
                      {lang === "ar" ? "المستهدف:" : "Target:"} <span style={{ color: "#3730a3" }}>{p.target || "—"}{p.unit || ""}</span>
                      {" "}|{" "}
                      {lang === "ar" ? "الحالي:" : "Current:"} <span style={{ color: progressColor }}>{p.currentValue || "—"}{p.unit || ""}</span>
                    </div>
                  </div>
                  {progress !== null && (
                    <div style={S.progressOuter}>
                      <div style={S.progressInner(progress, progressColor)}>
                        {Math.round(progress)}%
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={S.btn("secondary")} onClick={() => setOpenId(isOpen ? null : rec.id)}>
                    {isOpen ? t("collapse") : t("expand")}
                  </button>
                  <button style={S.btn("secondary")} onClick={() => navigate(`/haccp-iso/objectives?edit=${rec.id}`)}>
                    {t("edit")}
                  </button>
                  <button style={S.btn("danger")} onClick={() => del(rec.id)}>{t("del")}</button>
                </div>
              </div>

              {isOpen && (
                <div style={S.detailBlock}>
                  {p.description && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("objDescription")}</div>
                      <div style={S.miniText}>{p.description}</div>
                    </div>
                  )}
                  {p.method && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("objMethod")}</div>
                      <div style={S.miniText}>{p.method}</div>
                    </div>
                  )}
                  {p.notes && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("objNotes")}</div>
                      <div style={S.miniText}>{p.notes}</div>
                    </div>
                  )}
                  <div style={S.meta}>
                    {p.startDate && <>📅 {t("objStartDate")}: {p.startDate} </>}
                    {p.endDate && <>• {t("objEndDate")}: {p.endDate} </>}
                    {p.currentValueDate && <>• {t("objCurrentValueDate")}: {p.currentValueDate}</>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
