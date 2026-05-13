// src/pages/car/pages/FleetKPI.jsx
// 📈 Fleet KPI Dashboard — pulls from car_approvals, cars_loading_inspection, truck_daily_cleaning.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";

const APPROVALS_TYPE = "car_approvals";
const LOADING_TYPE   = "cars_loading_inspection";
const CLEANING_TYPE  = "truck_daily_cleaning";

/* ===== Helpers ===== */
function parseDateSmart(s) {
  if (!s) return null;
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const dt = new Date(str);
    return isNaN(dt.getTime()) ? null : dt;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/").map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

function daysFrom(dateStr) {
  const dt = parseDateSmart(dateStr);
  if (!dt) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  dt.setHours(0,0,0,0);
  return Math.round((dt.getTime() - today.getTime()) / 86400000);
}

function toCsv(headers, rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return "﻿" + [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\r\n");
}

function downloadBlob(content, filename, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Fetch all records of a type from server. */
async function fetchReports(type) {
  const urls = [
    `${API_BASE}/api/reports?type=${encodeURIComponent(type)}`,
    `${API_BASE}/api/reports`,
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json().catch(() => ({}));
      const rows = data?.rows || data?.data || (Array.isArray(data) ? data : []);
      if (!Array.isArray(rows)) continue;
      return rows.filter((x) => !type || x?.type === type);
    } catch {}
  }
  return [];
}

/* ===== Approvals helper ===== */
function extractApprovalItems(records) {
  const items = [];
  for (const rec of records || []) {
    const payload = rec?.payload || rec?.payload?.payload || null;
    const arr = payload?.items || payload?.payload?.items || [];
    if (Array.isArray(arr)) items.push(...arr);
  }
  // dedup
  const seen = new Set();
  const unique = [];
  for (const r of items) {
    const key = `${r?.vehicleNo}__${r?.tradeLicense}__${r?.expiryDate}__${r?.issueDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(r);
  }
  return unique;
}

/* ===== Time helpers for loading hours ===== */
function parseTimeToMin(t) {
  if (!t) return null;
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
function diffMinutes(start, end) {
  const s = parseTimeToMin(start);
  const e = parseTimeToMin(end);
  if (s == null || e == null) return null;
  let diff = e - s;
  if (diff < 0) diff += 24 * 60; // overnight
  return diff;
}

export default function FleetKPI() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("fleet_kpi_lang") || "en"; } catch { return "en"; }
  });
  const dir = lang === "ar" ? "rtl" : "ltr";
  const isAr = lang === "ar";
  const pick = (d) => d[lang] || d.ar || d.en || "";
  const toggleLang = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    try { localStorage.setItem("fleet_kpi_lang", next); } catch {}
  };

  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState([]);
  const [cleaningLogs, setCleaningLogs] = useState([]);
  const [periodDays, setPeriodDays] = useState(30); // 7 | 30 | 90

  async function loadAll() {
    setLoading(true);
    try {
      const [a, l, c] = await Promise.all([
        fetchReports(APPROVALS_TYPE),
        fetchReports(LOADING_TYPE),
        fetchReports(CLEANING_TYPE),
      ]);
      setApprovals(extractApprovalItems(a));
      setLoadingLogs(l || []);
      setCleaningLogs(c || []);
    } catch (e) {
      console.error("Fleet KPI load:", e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  /* ===== Aggregated KPIs ===== */
  const kpis = useMemo(() => {
    // Period range
    const cutoff = new Date(); cutoff.setHours(0,0,0,0);
    cutoff.setDate(cutoff.getDate() - periodDays);

    // Approvals analysis
    const totalVehicles = approvals.length;
    let activeApproval = 0, expired = 0, expiringSoon = 0, expiringCritical = 0, missingDate = 0;
    approvals.forEach((r) => {
      const d = daysFrom(r?.expiryDate);
      if (d == null) { missingDate++; return; }
      if (d < 0) expired++;
      else if (d <= 7) { expiringCritical++; expiringSoon++; activeApproval++; }
      else if (d <= 30) { expiringSoon++; activeApproval++; }
      else activeApproval++;
    });
    const emirates = new Set(approvals.map((r) => r?.emirate).filter(Boolean)).size;
    const companies = new Set(approvals.map((r) => r?.company).filter(Boolean)).size;
    const withImg = approvals.filter((r) => Array.isArray(r?.imageUrls) && r.imageUrls.length > 0).length;
    const imgCoverage = totalVehicles > 0 ? Math.round((withImg / totalVehicles) * 100) : 0;
    const complianceRate = totalVehicles > 0
      ? Math.round(((totalVehicles - expired) / totalVehicles) * 100)
      : 0;

    // ===== Loading logs — past `periodDays`  =====
    // Real structure: payload = { reportDate, rows: [ {vehicleNo, timeStart, timeEnd, ...} ] }
    let loadingInPeriod = 0, loadingTotalMinutes = 0, loadingWithDuration = 0;
    const loadingVehiclesSet = new Set();
    (loadingLogs || []).forEach((rec) => {
      const p = rec?.payload || {};
      const rows = p?.rows || p?.items || p?.payload?.rows || p?.payload?.items
                 || (Array.isArray(p) ? p : []);
      const recDateStr = p?.reportDate || p?.payload?.reportDate ||
                         (rec?.createdAt && new Date(rec.createdAt).toISOString().slice(0, 10));
      const recDate = parseDateSmart(recDateStr);
      if (recDate && recDate < cutoff) return;
      const arr = Array.isArray(rows) ? rows : [];
      for (const it of arr) {
        if (!it) continue;
        // Skip totally empty rows
        const vno = it.vehicleNo || it.vehicleNumber || it.truckNo;
        const hasAny = vno || it.timeStart || it.timeEnd || it.driverName;
        if (!hasAny) continue;
        loadingInPeriod++;
        if (vno) loadingVehiclesSet.add(String(vno).trim());
        const d = diffMinutes(it.timeStart || it.startTime, it.timeEnd || it.endTime);
        if (d != null && d > 0) { loadingTotalMinutes += d; loadingWithDuration++; }
      }
    });
    const avgLoadingHours = loadingWithDuration > 0
      ? (loadingTotalMinutes / loadingWithDuration / 60).toFixed(2)
      : "—";
    const loadingVehiclesActive = loadingVehiclesSet.size;

    // ===== Cleaning logs — past `periodDays` =====
    // Real structure: payload = { createdAt, rows: [ {truckNo, truckFloor, airCurtain, truckBody,
    //                              truckDoor, railHook, truckPallets, truckCrates} ] }
    // Status values: "C" = Clean, "N/C" = Not Clean. A row passes if ALL fields are "C".
    const CHECK_FIELDS = ["truckFloor","airCurtain","truckBody","truckDoor","railHook","truckPallets","truckCrates"];
    let cleaningInPeriod = 0, cleaningPassed = 0;
    const cleaningTrucksSet = new Set();
    const dailyCleaningMap = new Map();
    (cleaningLogs || []).forEach((rec) => {
      const p = rec?.payload || {};
      const rows = p?.rows || p?.items || p?.payload?.rows || p?.payload?.items
                 || (Array.isArray(p) ? p : []);
      const recDateStr = p?.reportDate || p?.payload?.reportDate || p?.createdAt
                       || (rec?.createdAt && new Date(rec.createdAt).toISOString().slice(0, 10));
      const recDate = parseDateSmart(recDateStr);
      if (recDate && recDate < cutoff) return;
      const arr = Array.isArray(rows) ? rows : [];
      const dateKey = recDateStr ? String(recDateStr).slice(0, 10) : "";
      for (const it of arr) {
        if (!it) continue;
        const truck = it.truckNo || it.truckNumber || it.vehicleNo;
        if (!truck) continue;
        cleaningInPeriod++;
        cleaningTrucksSet.add(String(truck).trim());
        if (dateKey) dailyCleaningMap.set(dateKey, (dailyCleaningMap.get(dateKey) || 0) + 1);
        // Pass if every inspected field is "C" (case-insensitive, ignore spaces)
        const allClean = CHECK_FIELDS.every((f) => {
          const v = String(it[f] || "").trim().toUpperCase();
          return v === "C" || v === "CLEAN" || v === "OK" || v === "✅";
        });
        if (allClean) cleaningPassed++;
      }
    });
    const cleaningPassRate = cleaningInPeriod > 0
      ? Math.round((cleaningPassed / cleaningInPeriod) * 100)
      : 0;
    const dailyAvgCleaning = dailyCleaningMap.size > 0
      ? Math.round(cleaningInPeriod / dailyCleaningMap.size)
      : 0;

    return {
      // Approvals
      totalVehicles, activeApproval, expired, expiringSoon, expiringCritical, missingDate,
      emirates, companies, withImg, imgCoverage, complianceRate,
      // Loading
      loadingInPeriod, avgLoadingHours, loadingVehiclesActive,
      // Cleaning
      cleaningInPeriod, cleaningPassRate, cleaningTrucks: cleaningTrucksSet.size, dailyAvgCleaning,
    };
  }, [approvals, loadingLogs, cleaningLogs, periodDays]);

  /* ===== Top expiring list ===== */
  const topExpiring = useMemo(() => {
    return approvals
      .map((r) => ({ ...r, _days: daysFrom(r?.expiryDate) }))
      .filter((r) => r._days != null && r._days <= 60)
      .sort((a, b) => a._days - b._days)
      .slice(0, 10);
  }, [approvals]);

  /* ===== Export ===== */
  function exportKpiCsv() {
    const headers = ["Metric", "Value", "Notes"];
    const rows = [
      ["Total Vehicles", kpis.totalVehicles, ""],
      ["Active Approvals", kpis.activeApproval, ""],
      ["Expired Permits", kpis.expired, "🚨 Action required"],
      ["Expiring ≤30d", kpis.expiringSoon, ""],
      ["Expiring ≤7d (critical)", kpis.expiringCritical, ""],
      ["Missing expiry date", kpis.missingDate, ""],
      ["Emirates covered", kpis.emirates, ""],
      ["Companies", kpis.companies, ""],
      ["Permits w/ image", kpis.withImg, `${kpis.imgCoverage}% coverage`],
      ["Compliance rate %", kpis.complianceRate, "(non-expired ratio)"],
      [`Loading records (last ${periodDays}d)`, kpis.loadingInPeriod, ""],
      ["Avg loading hours / record", kpis.avgLoadingHours, ""],
      ["Active vehicles (loading)", kpis.loadingVehiclesActive, ""],
      [`Cleaning records (last ${periodDays}d)`, kpis.cleaningInPeriod, ""],
      ["Cleaning pass rate %", kpis.cleaningPassRate, ""],
      ["Unique trucks (cleaning)", kpis.cleaningTrucks, ""],
      ["Avg cleanings per day", kpis.dailyAvgCleaning, ""],
    ];
    const csv = toCsv(headers, rows);
    downloadBlob(csv, `fleet-kpi_${new Date().toISOString().slice(0,10)}.csv`);
  }

  return (
    <main style={st.shell} dir={dir}>
      <style>{`
        @keyframes fk-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,.5); }
          50% { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
        }
        @media print {
          .fk-no-print { display: none !important; }
        }
      `}</style>

      <div style={st.layout}>
        {/* Header */}
        <header style={st.header} className="fk-no-print">
          <div style={st.brand}>
            <div style={st.brandIco}>📈</div>
            <div>
              <div style={st.brandTop}>{pick({ ar: "لوحة مؤشرات الأسطول", en: "Fleet KPI Dashboard" })}</div>
              <div style={st.brandSub}>
                {loading
                  ? pick({ ar: "⏳ جاري التحميل…", en: "⏳ Loading data…" })
                  : pick({ ar: "نظرة شاملة على أداء الأسطول والامتثال", en: "Comprehensive fleet performance & compliance" })}
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }} />

          {/* Period selector */}
          <div style={st.periodBox}>
            <span style={st.periodLabel}>{pick({ ar: "الفترة:", en: "Period:" })}</span>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPeriodDays(d)}
                style={st.periodBtn(periodDays === d)}
              >{d}d</button>
            ))}
          </div>

          <button type="button" onClick={toggleLang} style={st.btn}>🌐 {lang === "ar" ? "EN" : "AR"}</button>
          <button type="button" onClick={loadAll} disabled={loading} style={st.btn}>
            ↻ {pick({ ar: "تحديث", en: "Refresh" })}
          </button>
          <button type="button" onClick={exportKpiCsv} disabled={loading || kpis.totalVehicles === 0} style={st.btn}>
            📊 {pick({ ar: "تصدير CSV", en: "Export CSV" })}
          </button>
          <button type="button" onClick={() => window.print()} style={st.btn}>
            🖨️ {pick({ ar: "طباعة", en: "Print" })}
          </button>
          <button type="button" onClick={() => navigate("/cars")} style={st.btnGhost}>
            ← {pick({ ar: "للمركز", en: "Hub" })}
          </button>
        </header>

        {/* Alert banner */}
        {!loading && (kpis.expired > 0 || kpis.expiringCritical > 0) && (
          <div style={st.alertBanner} className="fk-no-print">
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span style={{ fontWeight: 1000 }}>
              {pick({ ar: "تنبيهات الانتهاء:", en: "Expiry alerts:" })}
            </span>
            {kpis.expired > 0 && (
              <button onClick={() => navigate("/car/approvals-view")} style={{ ...st.alertChip("#dc2626", "#fee2e2"), animation: "fk-pulse 1.5s infinite" }}>
                🚨 {kpis.expired} {pick({ ar: "منتهية", en: "expired" })}
              </button>
            )}
            {kpis.expiringCritical > 0 && (
              <button onClick={() => navigate("/car/approvals-view")} style={st.alertChip("#9a3412", "#ffedd5")}>
                ⏰ {kpis.expiringCritical} {pick({ ar: "خلال 7 أيام", en: "in ≤ 7 days" })}
              </button>
            )}
            <span style={{ flex: 1 }} />
            <button onClick={() => navigate("/car/approvals-view")} style={st.alertLink}>
              {pick({ ar: "إدارة التراخيص ←", en: "Manage permits →" })}
            </button>
          </div>
        )}

        {/* ===== SECTION 1: Approvals KPIs ===== */}
        <Section title={pick({ ar: "📋 التراخيص والموافقات", en: "📋 Permits & Approvals" })}>
          <KpiCard
            icon="🚚" label={pick({ ar: "إجمالي المركبات", en: "Total Vehicles" })}
            value={kpis.totalVehicles} color="#0f172a" bg="linear-gradient(135deg,#fff,#f1f5f9)"
          />
          <KpiCard
            icon="✅" label={pick({ ar: "تراخيص سارية", en: "Active Permits" })}
            value={kpis.activeApproval}
            color="#166534" bg="linear-gradient(135deg,#dcfce7,#f0fdf4)"
            hint={`${kpis.complianceRate}% ${pick({ ar: "امتثال", en: "compliance" })}`}
          />
          <KpiCard
            icon="⏰" label={pick({ ar: "تنتهي خلال 30 يوم", en: "Expiring ≤30d" })}
            value={kpis.expiringSoon}
            color="#92400e" bg="linear-gradient(135deg,#fef3c7,#fffbeb)"
            hint={pick({ ar: "تجديد قريب", en: "Renew soon" })}
            onClick={() => navigate("/car/approvals-view")}
          />
          <KpiCard
            icon="🚨" label={pick({ ar: "منتهية", en: "Expired" })}
            value={kpis.expired}
            color="#991b1b" bg="linear-gradient(135deg,#fee2e2,#fef2f2)"
            hint={kpis.expired > 0 ? pick({ ar: "إجراء فوري", en: "Action required" }) : pick({ ar: "ممتاز", en: "All good" })}
            onClick={() => navigate("/car/approvals-view")}
          />
          <KpiCard
            icon="📍" label={pick({ ar: "إمارات", en: "Emirates" })}
            value={kpis.emirates} color="#1e40af" bg="linear-gradient(135deg,#dbeafe,#eff6ff)"
          />
          <KpiCard
            icon="🏢" label={pick({ ar: "شركات", en: "Companies" })}
            value={kpis.companies} color="#5b21b6" bg="linear-gradient(135deg,#e9d5ff,#faf5ff)"
          />
          <KpiCard
            icon="🖼️" label={pick({ ar: "مع صور", en: "With Images" })}
            value={kpis.withImg}
            color="#0e7490" bg="linear-gradient(135deg,#cffafe,#ecfeff)"
            hint={`${kpis.imgCoverage}% ${pick({ ar: "تغطية", en: "coverage" })}`}
          />
          {kpis.missingDate > 0 && (
            <KpiCard
              icon="❓" label={pick({ ar: "بدون تاريخ", en: "Missing Date" })}
              value={kpis.missingDate}
              color="#64748b" bg="linear-gradient(135deg,#f1f5f9,#f8fafc)"
              hint={pick({ ar: "بحاجة لمراجعة", en: "Needs review" })}
            />
          )}
        </Section>

        {/* ===== SECTION 2: Loading KPIs ===== */}
        <Section title={`${pick({ ar: "🕐 أوقات التحميل", en: "🕐 Loading Times" })} (${periodDays}d)`}>
          <KpiCard
            icon="📝" label={pick({ ar: "سجلات تحميل", en: "Loading Records" })}
            value={kpis.loadingInPeriod} color="#1e40af" bg="linear-gradient(135deg,#dbeafe,#eff6ff)"
          />
          <KpiCard
            icon="⏱️" label={pick({ ar: "متوسط ساعات/سجل", en: "Avg Hrs / Record" })}
            value={kpis.avgLoadingHours} color="#0891b2" bg="linear-gradient(135deg,#cffafe,#ecfeff)"
            hint={pick({ ar: "زمن التحميل الفعلي", en: "Actual loading time" })}
          />
          <KpiCard
            icon="🚛" label={pick({ ar: "مركبات نشطة", en: "Active Vehicles" })}
            value={kpis.loadingVehiclesActive} color="#7c3aed" bg="linear-gradient(135deg,#e9d5ff,#faf5ff)"
          />
        </Section>

        {/* ===== SECTION 3: Cleaning KPIs ===== */}
        <Section title={`${pick({ ar: "🧼 تنظيف السيارات", en: "🧼 Truck Cleaning" })} (${periodDays}d)`}>
          <KpiCard
            icon="📊" label={pick({ ar: "سجلات تنظيف", en: "Cleaning Records" })}
            value={kpis.cleaningInPeriod} color="#0f766e" bg="linear-gradient(135deg,#ccfbf1,#f0fdfa)"
          />
          <KpiCard
            icon="✅" label={pick({ ar: "نسبة النجاح %", en: "Pass Rate %" })}
            value={`${kpis.cleaningPassRate}%`}
            color={kpis.cleaningPassRate >= 95 ? "#166534" : kpis.cleaningPassRate >= 80 ? "#92400e" : "#991b1b"}
            bg={kpis.cleaningPassRate >= 95 ? "linear-gradient(135deg,#dcfce7,#f0fdf4)" :
                kpis.cleaningPassRate >= 80 ? "linear-gradient(135deg,#fef3c7,#fffbeb)" :
                "linear-gradient(135deg,#fee2e2,#fef2f2)"}
            hint={pick({ ar: "الهدف ≥95%", en: "Target ≥95%" })}
          />
          <KpiCard
            icon="🚚" label={pick({ ar: "شاحنات فريدة", en: "Unique Trucks" })}
            value={kpis.cleaningTrucks} color="#5b21b6" bg="linear-gradient(135deg,#e9d5ff,#faf5ff)"
          />
          <KpiCard
            icon="📅" label={pick({ ar: "متوسط يومي", en: "Daily Average" })}
            value={kpis.dailyAvgCleaning} color="#0e7490" bg="linear-gradient(135deg,#cffafe,#ecfeff)"
            hint={pick({ ar: "تنظيفات/يوم", en: "cleanings/day" })}
          />
        </Section>

        {/* ===== Top expiring list ===== */}
        {topExpiring.length > 0 && (
          <section style={st.section}>
            <div style={st.sectionHead}>
              <div style={st.sectionPill}>
                ⚠️ {pick({ ar: "أهم 10 تراخيص تقترب من الانتهاء", en: "Top 10 Expiring Permits" })}
              </div>
            </div>
            <div style={st.tableCard}>
              <table style={st.table}>
                <thead>
                  <tr>
                    <th style={st.th}>{pick({ ar: "المركبة", en: "Vehicle" })}</th>
                    <th style={st.th}>{pick({ ar: "الشركة", en: "Company" })}</th>
                    <th style={st.th}>{pick({ ar: "الترخيص", en: "Trade License" })}</th>
                    <th style={st.th}>{pick({ ar: "الانتهاء", en: "Expiry" })}</th>
                    <th style={st.th}>{pick({ ar: "أيام", en: "Days" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {topExpiring.map((r, i) => {
                    const d = r._days;
                    const color = d < 0 ? "#991b1b" : d <= 7 ? "#9a3412" : d <= 30 ? "#92400e" : "#1e40af";
                    const bg = d < 0 ? "#fee2e2" : d <= 7 ? "#ffedd5" : d <= 30 ? "#fef3c7" : "#dbeafe";
                    return (
                      <tr key={i} style={{ borderTop: i ? "1px solid #f1f5f9" : "none" }}>
                        <td style={st.td}><strong>{r.vehicleNo || "—"}</strong></td>
                        <td style={st.td}>{r.company || "—"}</td>
                        <td style={{ ...st.td, fontFamily: "monospace", fontSize: 12 }}>{r.tradeLicense || "—"}</td>
                        <td style={st.td}>{r.expiryDate || "—"}</td>
                        <td style={st.td}>
                          <span style={{
                            background: bg, color, padding: "5px 11px", borderRadius: 999,
                            fontWeight: 1000, fontSize: 12, display: "inline-block",
                          }}>
                            {d < 0 ? `${Math.abs(d)} ${isAr ? "يوم متأخرة" : "d ago"}` : `${d} ${isAr ? "يوم" : "d"}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ textAlign: "center", padding: "10px 0" }} className="fk-no-print">
                <button onClick={() => navigate("/car/approvals-view")} style={st.btnLink}>
                  {pick({ ar: "عرض كل التراخيص →", en: "View all permits →" })}
                </button>
              </div>
            </div>
          </section>
        )}

        {loading && (
          <div style={st.loadingBox}>⏳ {pick({ ar: "جاري التحميل…", en: "Loading…" })}</div>
        )}
      </div>
    </main>
  );
}

/* ===== Helper components ===== */
function Section({ title, children }) {
  return (
    <section style={st.section}>
      <div style={st.sectionHead}>
        <div style={st.sectionPill}>{title}</div>
      </div>
      <div style={st.kpiGrid}>{children}</div>
    </section>
  );
}

function KpiCard({ icon, label, value, color, bg, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        background: bg, color,
        border: "1px solid rgba(226,232,240,.95)",
        borderRadius: 16, padding: "14px 16px",
        textAlign: "start",
        cursor: onClick ? "pointer" : "default",
        boxShadow: "0 8px 18px rgba(2,6,23,.08)",
        transition: "transform .15s, box-shadow .15s",
        display: "flex", flexDirection: "column", gap: 4,
        minWidth: 140,
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".05em", textTransform: "uppercase", opacity: 0.75 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 1000, lineHeight: 1.1 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.7 }}>{hint}</div>}
    </button>
  );
}

const st = {
  shell: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    fontFamily: 'Cairo, ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif',
    color: "#0f172a",
    paddingBottom: 40,
  },
  layout: { maxWidth: 1200, margin: "0 auto", padding: "16px 18px 0" },
  header: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    padding: "12px 16px",
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(226,232,240,0.95)",
    borderRadius: 18, boxShadow: "0 14px 36px rgba(2,6,23,.10)",
    backdropFilter: "blur(10px)",
    marginBottom: 18,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandIco: {
    width: 46, height: 46, borderRadius: 14,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff", display: "grid", placeItems: "center", fontSize: 22,
    boxShadow: "0 12px 24px rgba(37,99,235,.30)",
  },
  brandTop: { fontWeight: 1000, fontSize: 16, lineHeight: 1.1 },
  brandSub: { fontWeight: 800, fontSize: 12, color: "#64748b", marginTop: 4 },
  periodBox: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 10px", borderRadius: 999,
    background: "rgba(241,245,249,0.85)", border: "1px solid #e2e8f0",
  },
  periodLabel: { fontSize: 11, fontWeight: 900, color: "#475569" },
  periodBtn: (active) => ({
    padding: "6px 12px", borderRadius: 999,
    background: active ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#fff",
    color: active ? "#fff" : "#0f172a",
    border: active ? "1px solid #1d4ed8" : "1px solid #e2e8f0",
    fontWeight: 1000, fontSize: 12, cursor: "pointer",
    boxShadow: active ? "0 6px 14px rgba(37,99,235,.30)" : "none",
  }),
  btn: {
    border: "1px solid rgba(148,163,184,.55)",
    background: "linear-gradient(180deg,#fff,#f8fafc)",
    borderRadius: 14, padding: "9px 12px",
    fontWeight: 950, fontSize: 12, cursor: "pointer",
    boxShadow: "0 10px 22px rgba(2,6,23,.06)",
  },
  btnGhost: {
    border: "1px solid rgba(148,163,184,.55)",
    background: "transparent",
    borderRadius: 14, padding: "9px 12px",
    fontWeight: 950, fontSize: 12, cursor: "pointer",
  },
  btnLink: {
    border: "none", background: "transparent",
    color: "#2563eb", fontWeight: 1000, fontSize: 13,
    cursor: "pointer", padding: "8px 12px",
  },
  alertBanner: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    padding: "12px 16px", borderRadius: 16,
    background: "linear-gradient(180deg,#fffbeb,#fef3c7)",
    border: "1px solid #fde68a",
    boxShadow: "0 10px 24px rgba(146,64,14,.15)",
    marginBottom: 14, color: "#78350f",
  },
  alertChip: (color, bg) => ({
    border: `1px solid ${color}66`,
    background: bg, color,
    borderRadius: 999, padding: "6px 14px",
    fontWeight: 1000, fontSize: 12, cursor: "pointer",
  }),
  alertLink: {
    border: "none", background: "transparent",
    color: "#78350f", fontWeight: 1000, fontSize: 12, cursor: "pointer",
    textDecoration: "underline",
  },
  section: { marginBottom: 20 },
  sectionHead: { marginBottom: 10 },
  sectionPill: {
    display: "inline-block",
    padding: "8px 16px", borderRadius: 12,
    background: "linear-gradient(135deg,#0f172a,#1e293b)",
    color: "#fff", fontWeight: 1000, fontSize: 13,
    boxShadow: "0 8px 18px rgba(2,6,23,.18)",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  tableCard: {
    background: "#fff", borderRadius: 16,
    border: "1px solid rgba(226,232,240,.95)",
    overflow: "hidden",
    boxShadow: "0 14px 30px rgba(2,6,23,.08)",
  },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: {
    padding: "12px 14px", textAlign: "start",
    fontWeight: 1000, fontSize: 12,
    background: "linear-gradient(180deg, #0b1220, #1e293b)",
    color: "#fff", letterSpacing: ".03em",
  },
  td: { padding: "11px 14px", fontWeight: 800, fontSize: 13, color: "#0f172a" },
  loadingBox: {
    padding: 30, textAlign: "center",
    fontWeight: 900, color: "#64748b", fontSize: 14,
  },
};
