// src/pages/monitor/branches/ftr2/FTR2TemperatureView.jsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/* ========================================================
   Helper — استخراج قراءات كل التقارير في مصفوفة موحدة
   كل عنصر: { date, cooler, time, value }
======================================================== */
function extractAllReadings(reports) {
  const rows = [];
  reports.forEach((r) => {
    const date = r?.payload?.date || "—";
    const times = (r?.payload?.times || []).filter(
      (t) => String(t).toLowerCase() !== "corrective action"
    );
    const coolersRaw = (r?.payload?.coolers || []).map((c, idx) => ({
      ...c,
      __idx: idx,
      __name: String(c?.name || c?.label || `Cooler ${idx + 1}`),
    }));
    const coolers = coolersRaw.filter((c) => {
      const nm = c.__name.trim().toLowerCase().replace(/\s+/g, "");
      return nm !== "cooler9" && c.__idx !== 8;
    });
    coolers.forEach((c) => {
      times.forEach((t) => {
        const val = parseFloat(c?.temps?.[t]);
        if (!isNaN(val)) rows.push({ date, cooler: c.__name, time: t, value: val });
      });
    });
  });
  return rows;
}

/* ========================================================
   Drill-Down Modal
======================================================== */
function DrillModal({ title, rows, onClose }) {
  if (!rows) return null;
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1.5px solid #e0f2fe" }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "#0c4a6e" }}>{title}</div>
          <button onClick={onClose} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>✕ Close</button>
        </div>

        {/* Count */}
        <div style={{ padding: "8px 20px", background: "#f0f9ff", borderBottom: "1px solid #e0f2fe", fontSize: 12, fontWeight: 700, color: "#0ea5e9" }}>
          {rows.length} record{rows.length !== 1 ? "s" : ""} found
        </div>

        {/* Table */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#e0f2fe", position: "sticky", top: 0 }}>
                <th style={mTh}>#</th>
                <th style={mTh}>Date</th>
                <th style={mTh}>Cooler</th>
                <th style={mTh}>Time</th>
                <th style={mTh}>Temp (°C)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 ? "#f8faff" : "#fff" }}>
                  <td style={mTd}>{i + 1}</td>
                  <td style={{ ...mTd, fontWeight: 700, color: "#0c4a6e" }}>{row.date}</td>
                  <td style={mTd}>{row.cooler}</td>
                  <td style={{ ...mTd, color: "#6b7280" }}>{row.time}</td>
                  <td style={{ ...mTd, fontWeight: 800, color: row.value >= 5 ? "#ef4444" : row.value < -20 ? "#f59e0b" : "#10b981", textAlign: "center" }}>
                    {row.value}°C
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const mTh = { padding: "10px 12px", fontWeight: 800, color: "#0c4a6e", textAlign: "left", borderBottom: "1.5px solid #bae6fd" };
const mTd = { padding: "9px 12px", borderBottom: "1px solid #f0f0f0" };

/* ========================================================
   Global KPI Bar — مع drill-down عند الضغط
======================================================== */
function GlobalKPI({ reports }) {
  const [modal, setModal] = useState(null); // { title, rows }

  const allReadings = useMemo(() => extractAllReadings(reports), [reports]);

  const kpi = useMemo(() => {
    if (!allReadings.length) return null;
    const vals      = allReadings.map(r => r.value);
    const avg       = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    const minVal    = Math.min(...vals);
    const maxVal    = Math.max(...vals);
    const alerts    = allReadings.filter(r => r.value >= 5);
    const daysSet   = new Set(allReadings.filter(r => r.value >= 5).map(r => r.date));
    const compliance = (((allReadings.length - alerts.length) / allReadings.length) * 100).toFixed(1);
    return { avg, minVal: minVal.toFixed(1), maxVal: maxVal.toFixed(1), alerts, daysWithAlert: daysSet.size, compliance };
  }, [allReadings]);

  if (!kpi) return null;

  const open = (title, rows) => setModal({ title, rows });

  const cards = [
    {
      icon: "📋", label: "Total Reports",    value: reports.length,
      color: "#0ea5e9", bg: "#e0f2fe",
      onClick: () => open("All Reports", reports.map(r => ({ date: r?.payload?.date || "—", cooler: "—", time: "—", value: NaN, _isReport: true, _label: r?.payload?.date || "—" }))),
      // للتقارير بس نعرض تاريخ وليس درجة حرارة — نعالجها بشكل مختلف
    },
    {
      icon: "📊", label: "Total Readings",   value: allReadings.length,
      color: "#8b5cf6", bg: "#ede9fe",
      onClick: () => open(`All Readings (${allReadings.length})`, [...allReadings].sort((a,b)=>a.date.localeCompare(b.date))),
    },
    {
      icon: "🌡️", label: "Avg Temp",         value: `${kpi.avg}°C`,
      color: "#10b981", bg: "#d1fae5",
      onClick: () => open(`All Readings — Avg ${kpi.avg}°C`, [...allReadings].sort((a,b)=>a.value - b.value)),
    },
    {
      icon: "🔻", label: "Min Temp",          value: `${kpi.minVal}°C`,
      color: "#0284c7", bg: "#e0f2fe",
      onClick: () => open(`Min Temp Readings (≤ ${kpi.minVal}°C)`, allReadings.filter(r => r.value === parseFloat(kpi.minVal))),
    },
    {
      icon: "🔺", label: "Max Temp",          value: `${kpi.maxVal}°C`,
      color: "#f59e0b", bg: "#fef3c7",
      onClick: () => open(`Max Temp Readings (≥ ${kpi.maxVal}°C)`, allReadings.filter(r => r.value === parseFloat(kpi.maxVal))),
    },
    {
      icon: "⚠️", label: "Alerts (≥5°C)",    value: kpi.alerts.length,
      color: kpi.alerts.length > 0 ? "#ef4444" : "#10b981",
      bg:    kpi.alerts.length > 0 ? "#fee2e2" : "#d1fae5",
      onClick: () => open(`Alert Readings ≥5°C (${kpi.alerts.length})`, [...kpi.alerts].sort((a,b)=>b.value-a.value)),
    },
    {
      icon: "📅", label: "Days w/ Alerts",    value: kpi.daysWithAlert,
      color: kpi.daysWithAlert > 0 ? "#ef4444" : "#10b981",
      bg:    kpi.daysWithAlert > 0 ? "#fee2e2" : "#d1fae5",
      onClick: () => {
        const daysMap = {};
        kpi.alerts.forEach(r => { if (!daysMap[r.date]) daysMap[r.date] = []; daysMap[r.date].push(r); });
        const rows = Object.entries(daysMap).sort(([a],[b])=>a.localeCompare(b)).flatMap(([date, rs]) => rs.sort((a,b)=>b.value-a.value));
        open(`Days with Alerts (${kpi.daysWithAlert} days)`, rows);
      },
    },
    {
      icon: "✅", label: "Compliance",        value: `${kpi.compliance}%`,
      color: parseFloat(kpi.compliance) >= 95 ? "#10b981" : "#ef4444",
      bg:    parseFloat(kpi.compliance) >= 95 ? "#d1fae5" : "#fee2e2",
      onClick: () => open(`Compliant Readings <5°C`, allReadings.filter(r => r.value < 5).sort((a,b)=>a.date.localeCompare(b.date))),
    },
  ];

  return (
    <>
      {/* عنوان */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 4, height: 20, background: "#0ea5e9", borderRadius: 4 }} />
        <span style={{ fontWeight: 800, fontSize: 13, color: "#0c4a6e", letterSpacing: ".06em", textTransform: "uppercase" }}>
          Overall KPI — All {reports.length} Reports
        </span>
        <div style={{ flex: 1, height: 1, background: "#e0f2fe" }} />
        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Click any card for details</span>
      </div>

      {/* كاردات */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {cards.map((c, i) => (
          <div
            key={i}
            onClick={c.onClick}
            title="Click to see details"
            style={{ background: c.bg, border: `1.5px solid ${c.color}44`, borderRadius: 12, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", transition: "transform .12s, box-shadow .12s", userSelect: "none" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 18px ${c.color}33`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: 20 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: c.color, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 2 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
            </div>
            {/* سهم دليل */}
            <div style={{ marginLeft: "auto", fontSize: 14, color: c.color, opacity: .6 }}>›</div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <DrillModal
          title={modal.title}
          rows={modal.rows}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

/* ========================================================
   Main Component
======================================================== */
export default function FTR2TemperatureView() {
  const [reports,        setReports]        = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading,        setLoading]        = useState(false);

  const reportRef    = useRef();
  const fileInputRef = useRef(null);

  const getId  = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
  const toDate = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; };

  async function fetchReports() {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/reports?type=ftr2_temperature`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      const arr  = Array.isArray(json) ? json : json?.data ?? [];
      arr.sort((a, b) => {
        const da = toDate(a?.payload?.date)?.getTime() || 0;
        const db = toDate(b?.payload?.date)?.getTime() || 0;
        return db - da;
      });
      setReports(arr);
      setSelectedReport(arr[0] || null);
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReports(); }, []);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const buttons = document.querySelector(".action-buttons");
    if (buttons) buttons.style.display = "none";
    const canvas = await html2canvas(reportRef.current, { scale: 4, windowWidth: reportRef.current.scrollWidth, windowHeight: reportRef.current.scrollHeight });
    const pdf = new jsPDF("l", "pt", "a4");
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    let iw = pw - 20, ih = (canvas.height * iw) / canvas.width;
    if (ih > ph - 20) { ih = ph - 20; iw = (canvas.width * ih) / canvas.height; }
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pw-iw)/2, (ph-ih)/2, iw, ih);
    pdf.save(`FTR2_Temperature_${selectedReport?.payload?.date || "report"}.pdf`);
    if (buttons) buttons.style.display = "flex";
  };

  const handleDelete = async (report) => {
    if (!window.confirm("Are you sure?")) return;
    const rid = getId(report);
    if (!rid) return alert("⚠️ Missing ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      alert("✅ Deleted.");
      fetchReports();
    } catch (err) { console.error(err); alert("⚠️ Delete failed."); }
  };

  const handleExportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify({ type: "ftr2_temperature", exportedAt: new Date().toISOString(), count: reports.length, items: reports.map(r => r?.payload ?? r) }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a"); a.href = url; a.download = `FTR2_Temperature_ALL_${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err) { console.error(err); alert("❌ Export failed."); }
  };

  const triggerImport    = () => fileInputRef.current?.click();
  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setLoading(true);
      const json  = JSON.parse(await file.text());
      const items = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : Array.isArray(json?.data) ? json.data : [];
      if (!items.length) { alert("⚠️ No items."); return; }
      let ok = 0, fail = 0;
      for (const item of items) {
        const payload = item?.payload ?? item;
        if (!payload || typeof payload !== "object") { fail++; continue; }
        try { const r = await fetch(`${API_BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "ftr2_temperature", payload }) }); if (r.ok) ok++; else fail++; }
        catch { fail++; }
      }
      alert(`✅ Imported: ${ok}${fail ? ` | ❌ Failed: ${fail}` : ""}`);
      await fetchReports();
    } catch (err) { console.error(err); alert("❌ Invalid JSON."); }
    finally { setLoading(false); if (e?.target) e.target.value = ""; }
  };

  const groupedReports = reports.reduce((acc, r) => {
    const d = toDate(r?.payload?.date); if (!d) return acc;
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
    acc[y] ??= {}; acc[y][m] ??= [];
    acc[y][m].push({ ...r, day, _dt: d.getTime() });
    return acc;
  }, {});

  const times = (selectedReport?.payload?.times || [
    "4:00 AM","6:00 AM","8:00 AM","10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM",
  ]).filter(t => String(t).toLowerCase() !== "corrective action");

  const coolersRaw = (selectedReport?.payload?.coolers || []).map((c, idx) => ({
    ...c, __idx: idx, __name: String(c?.name || c?.label || `Cooler ${idx+1}`),
  }));
  const coolers = coolersRaw.filter(c => {
    const nm = c.__name.trim().toLowerCase().replace(/\s+/g,"");
    return nm !== "cooler9" && c.__idx !== 8;
  });

  return (
    <div style={{ display: "flex", gap: "1rem" }}>

      {/* Sidebar */}
      <div style={{ minWidth: 260, background: "#f9f9f9", padding: "1rem", borderRadius: 10, boxShadow: "0 3px 10px rgba(0,0,0,0.1)", height: "fit-content" }}>
        <h4 style={{ marginBottom: "1rem", color: "#6d28d9", textAlign: "center" }}>🗓️ Saved Reports</h4>
        {loading ? <p>⏳ Loading...</p>
          : Object.keys(groupedReports).length === 0 ? <p>❌ No reports</p>
          : Object.entries(groupedReports)
              .sort(([a],[b]) => Number(b)-Number(a))
              .map(([year, months]) => (
                <details key={year}>
                  <summary style={{ fontWeight: "bold", marginBottom: 6, cursor: "pointer" }}>📅 {year}</summary>
                  {Object.entries(months)
                    .sort(([a],[b]) => Number(b)-Number(a))
                    .map(([month, days]) => (
                      <details key={month} style={{ marginLeft: "1rem" }}>
                        <summary style={{ fontWeight: 500, cursor: "pointer" }}>📅 {year}/{month}</summary>
                        <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                          {[...days].sort((a,b) => b._dt-a._dt).map((r,i) => {
                            const active = getId(selectedReport) && getId(selectedReport) === getId(r);
                            return (
                              <li key={i} onClick={() => setSelectedReport(r)}
                                style={{ padding: "6px 10px", marginBottom: 4, borderRadius: 6, cursor: "pointer", background: active ? "#dcd6f7" : "#ecf0f1", color: active ? "#222" : "#333", fontWeight: 600, textAlign: "center" }}>
                                {`${r.day}/${month}/${year}`}
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    ))}
                </details>
              ))
        }
      </div>

      {/* Main */}
      <div style={{ flex: 1, background: "#eef3f8", padding: "1.5rem", borderRadius: 14, boxShadow: "0 4px 18px #d2b4de44" }}>

        {reports.length > 0 && <GlobalKPI reports={reports} />}

        {!selectedReport ? (
          <p style={{ color: "#94a3b8", textAlign: "center", marginTop: "2rem" }}>👈 Select a date to view the report</p>
        ) : (
          <div ref={reportRef}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 4, height: 20, background: "#8b5cf6", borderRadius: 4 }} />
              <span style={{ fontWeight: 800, fontSize: 13, color: "#4c1d95", letterSpacing: ".06em", textTransform: "uppercase" }}>
                Report — {selectedReport?.payload?.date || "—"}
              </span>
              <div style={{ flex: 1, height: 1, background: "#ede9fe" }} />
            </div>

            <div className="action-buttons" style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginBottom: "0.8rem" }}>
              <button onClick={handleExportPDF}                    style={btn("#27ae60")}>⬇ Export PDF</button>
              <button onClick={handleExportJSON}                   style={btn("#16a085")}>⬇ Export JSON</button>
              <button onClick={triggerImport}                      style={btn("#f39c12")}>⬆ Import JSON</button>
              <button onClick={() => handleDelete(selectedReport)} style={btn("#c0392b")}>🗑 Delete</button>
              <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportJSON} />
            </div>

            <table style={topTable}>
              <tbody>
                <tr>
                  <td rowSpan={4} style={{ ...tdHeader, width: 140, textAlign: "center" }}>
                    <div style={{ fontWeight: 900, color: "#a00", fontSize: 14, lineHeight: 1.2 }}>AL<br/>MAWASHI</div>
                  </td>
                  <td style={tdHeader}><b>Document Title:</b> Temperature Control Record</td>
                  <td style={tdHeader}><b>Document No:</b> FS-QM/REC/TMP</td>
                </tr>
                <tr>
                  <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
                  <td style={tdHeader}><b>Revision No:</b> 0</td>
                </tr>
                <tr>
                  <td style={tdHeader}><b>Area:</b> QA</td>
                  <td style={tdHeader}><b>Issued by:</b> MOHAMAD ABDULLAH</td>
                </tr>
                <tr>
                  <td style={tdHeader}><b>Controlling Officer:</b> Quality Controller</td>
                  <td style={tdHeader}><b>Approved by:</b> Hussam O. Sarhan</td>
                </tr>
              </tbody>
            </table>

            <div style={band1}>TRANS EMIRATES LIVESTOCK MEAT TRADING LLC</div>
            <div style={band2}>TEMPERATURE CONTROL CHECKLIST (CCP)</div>

            <div style={rulesBox}>
              <div>1. If the temp is +5°C or more / Check product temperature – corrective action should be taken.</div>
              <div>2. If the loading area is more than +16°C – corrective action should be taken.</div>
              <div>3. If the preparation area is more than +10°C – corrective action should be taken.</div>
              <div style={{ marginTop: 6 }}>
                <b>Corrective action:</b> Transfer the meat to another cold room and call maintenance department to check and solve the problem.
              </div>
            </div>

            <table style={gridTable}>
              <thead>
                <tr>
                  <th style={thCell}>Cooler</th>
                  {times.map((t,i) => <th key={i} style={thCell}>{t}</th>)}
                  <th style={thCell}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {coolers.map((c, idx) => (
                  <tr key={idx}>
                    <td style={tdCellLeft}>{c.__name}</td>
                    {times.map((t,j) => {
                      const val = c?.temps?.[t];
                      const num = parseFloat(val);
                      const isAlert = !isNaN(num) && num >= 5;
                      return (
                        <td key={j} style={{ ...tdCellCenter, color: isAlert ? "#ef4444" : "#2c3e50", fontWeight: isAlert ? 800 : 600, background: isAlert ? "#fee2e2" : "transparent" }}>
                          {val ?? "—"}
                        </td>
                      );
                    })}
                    <td style={tdCellLeft}>{c?.remarks ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={signRow}>
              <div>Checked By:- <span style={{ fontWeight: 500 }}>{selectedReport?.payload?.checkedBy || "—"}</span></div>
              <div>Verified By:- <span style={{ fontWeight: 500 }}>{selectedReport?.payload?.verifiedBy || "—"}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Styles ===== */
const topTable     = { width: "100%", borderCollapse: "collapse", marginBottom: 8, fontSize: "0.9rem", border: "1px solid #9aa4ae", background: "#f8fbff" };
const tdHeader     = { border: "1px solid #9aa4ae", padding: "6px 8px", verticalAlign: "middle" };
const band1        = { width: "100%", textAlign: "center", background: "#bfc7cf", color: "#2c3e50", fontWeight: 700, padding: "6px 4px", border: "1px solid #9aa4ae", borderTop: "none" };
const band2        = { width: "100%", textAlign: "center", background: "#dde3e9", color: "#2c3e50", fontWeight: 700, padding: "6px 4px", border: "1px solid #9aa4ae", borderTop: "none", marginBottom: 8 };
const rulesBox     = { border: "1px solid #9aa4ae", background: "#f1f5f9", padding: "8px 10px", fontSize: "0.92rem", marginBottom: 10 };
const gridTable    = { width: "100%", borderCollapse: "collapse", border: "1px solid #9aa4ae", background: "#ffffff" };
const thCell       = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "center", background: "#e0e6ed", fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap" };
const tdCellCenter = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "center", fontWeight: 600 };
const tdCellLeft   = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "left" };
const signRow      = { display: "flex", justifyContent: "space-between", marginTop: 12, fontWeight: 700 };
const btn = (bg) => ({ padding: "6px 12px", borderRadius: 6, background: bg, color: "#fff", fontWeight: 600, border: "none", cursor: "pointer" });