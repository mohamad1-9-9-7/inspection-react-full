// src/pages/monitor/branches/production/DriedMeatProcessView.jsx
// View for Dried Meat Process Record — read-only display with date tree + export

import React, { useEffect, useMemo, useRef, useState } from "react";
import PRDReportHeader from "./_shared/PRDReportHeader";
import PrintButton, { PrintOfficialHeader } from "./_shared/PrintButton";
import { useLang } from "./_shared/i18n";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
      process.env.VITE_API_URL ||
      process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "prod_dried_meat";

const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

function normYMD(s) {
  const str = String(s || "").trim();
  if (!str) return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { y: m[1], m: m[2], d: m[3], iso: `${m[1]}-${m[2]}-${m[3]}` } : null;
}

export default function DriedMeatProcessView() {
  const { t, dir, isAr } = useLang();

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  const [date, setDate]           = useState(todayDubai);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState("");
  const [record, setRecord]       = useState(null);
  const [allDates, setAllDates]   = useState([]);
  const [expYears, setExpYears]   = useState({});
  const [expMonths, setExpMonths] = useState({});

  async function fetchAllDates() {
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const uniq = Array.from(new Set(
        list.map((r) => r?.payload?.reportDate).filter(Boolean)
      )).sort((a, b) => b.localeCompare(a));
      setAllDates(uniq);
      if (uniq.length) {
        const n = normYMD(uniq[0]);
        if (n) {
          setExpYears((p) => ({ ...p, [n.y]: true }));
          setExpMonths((p) => ({ ...p, [`${n.y}-${n.m}`]: true }));
        }
      }
      if (!uniq.includes(date) && uniq.length) setDate(uniq[0]);
    } catch (e) { console.warn(e); }
  }

  async function fetchRecord(d = date) {
    setLoading(true); setErr(""); setRecord(null);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const matches = list.filter((r) => r?.payload?.reportDate === d);
      matches.sort((a, b) => (b?.payload?.savedAt || 0) - (a?.payload?.savedAt || 0));
      setRecord(matches[0] || null);
    } catch (e) {
      console.error(e);
      setErr("Failed to fetch data.");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchAllDates(); }, []); // eslint-disable-line
  useEffect(() => { if (date) fetchRecord(date); }, [date]); // eslint-disable-line

  async function handleDelete() {
    if (!record) return;
    if ((window.prompt("Enter password:") || "") !== "9999") return alert("❌ Wrong password");
    if (!window.confirm(isAr ? "هل تريد الحذف؟" : "Delete this report?")) return;
    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing id.");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      alert("✅ Deleted");
      await fetchAllDates();
      setRecord(null);
    } catch (e) { alert("❌ Delete failed."); }
    finally { setLoading(false); }
  }

  function exportJSON() {
    if (!record) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(
      [JSON.stringify({ type: TYPE, payload: record.payload }, null, 2)],
      { type: "application/json" }
    ));
    a.download = `PRD_DriedMeat_${record?.payload?.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    if (!record) return;
    try {
      const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
      const p = record.payload || {};
      const f = p.form || {};
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("DriedMeat");
      const border = {
        top:{style:"thin",color:{argb:"64748B"}},
        left:{style:"thin",color:{argb:"64748B"}},
        bottom:{style:"thin",color:{argb:"64748B"}},
        right:{style:"thin",color:{argb:"64748B"}},
      };

      ws.mergeCells(1, 1, 1, 8);
      ws.getCell(1,1).value = `Dried Meat Process Record — ${safe(p.reportDate)}`;
      ws.getCell(1,1).font = { bold: true, size: 14 };
      ws.getCell(1,1).alignment = { horizontal: "center" };
      ws.getCell(1,1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FEF3C7"} };
      ws.getRow(1).height = 22;

      let r = 3;
      const addSection = (title, rows) => {
        ws.mergeCells(r, 1, r, 8);
        ws.getCell(r, 1).value = title;
        ws.getCell(r, 1).font = { bold: true, size: 12, color:{argb:"B45309"} };
        ws.getCell(r, 1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FEF3C7"} };
        r++;
        rows.forEach(([k, v]) => {
          ws.getCell(r, 1).value = k;
          ws.getCell(r, 1).font = { bold: true };
          ws.getCell(r, 1).border = border;
          ws.getCell(r, 2).value = safe(v);
          ws.getCell(r, 2).border = border;
          ws.mergeCells(r, 2, r, 8);
          r++;
        });
        r++;
      };

      addSection("Batch Information", [
        ["Batch / Lot ID", f.batchId],
        ["Product Type", f.productType],
        ["Product Name", f.productName],
        ["Raw Meat Type", f.rawMeatType],
        ["Source / Supplier", f.rawSource],
        ["RM Lot No", f.rawLotNo],
        ["RM Production Date", f.rawProdDate],
        ["RM Expiry Date", f.rawExpDate],
        ["Initial Weight (kg)", f.initialWeight],
        ["Received Date", f.receivedDate],
        ["Start Date", f.startDate],
        ["Expected End Date", f.expectedEndDate],
      ]);

      addSection("Curing / Marination (CCP)", [
        ["Salt %", f.saltPct],
        ["Nitrite/Nitrate (ppm)", f.nitritePpm],
        ["Curing Temp (°C)", f.curingTemp],
        ["Curing Duration (hrs)", f.curingHours],
        ["Curing Start", f.curingStart],
        ["Curing End", f.curingEnd],
        ["Spices / Additives", f.spices],
        ["Notes", f.curingNotes],
      ]);

      addSection("Dehydrator Setup (Vertical Hanging)", [
        ["Batch Capacity (kg)", f.batchCapacity],
        ["Hanging Pieces", f.hangingPieces],
        ["Vertical Levels", f.hangingLevels],
        ["Target Temp (°C)", f.targetTemp],
        ["Target Humidity (%)", f.targetHumidity],
        ["Fan Speed", f.fanSpeed],
        ["Program / Mode", f.programMode],
        ["Planned Cycle (hrs)", f.cycleHours],
      ]);

      // Drying log
      ws.mergeCells(r, 1, r, 9);
      ws.getCell(r, 1).value = "Drying Process Log (CCP)";
      ws.getCell(r, 1).font = { bold: true, size: 12, color:{argb:"B45309"} };
      ws.getCell(r, 1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FEF3C7"} };
      r++;
      const dryHeaders = ["#", "Elapsed hrs", "Date", "Time", "Temp °C", "RH %", "Position", "Weight kg", "Notes"];
      dryHeaders.forEach((h, c) => {
        ws.getCell(r, c+1).value = h;
        ws.getCell(r, c+1).font = { bold: true };
        ws.getCell(r, c+1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"F1F5F9"} };
        ws.getCell(r, c+1).border = border;
      });
      r++;
      (f.dryingLog || []).forEach((row, i) => {
        const vals = [i+1, row.elapsedHrs, row.date, row.time, row.temperature, row.humidity, row.position || row.airflow || "", row.weight, row.notes];
        vals.forEach((v, c) => {
          ws.getCell(r, c+1).value = safe(v);
          ws.getCell(r, c+1).border = border;
        });
        r++;
      });
      r++;

      addSection("Post-Drying & Cooling", [
        ["Cooling Duration (min)", f.coolingTime],
        ["Cooling Temp (°C)", f.coolingTemp],
        ["Rotations Done", f.rotationCount],
        ["Rotation / Cooling Notes", f.rotationNote],
      ]);

      addSection("Final Critical Parameters", [
        ["Water Activity (aw)", f.waterActivity],
        ["pH", f.ph],
        ["Final Moisture %", f.finalMoisture],
        ["Salt Content %", f.saltContent],
        ["Final Weight (kg)", f.finalWeight],
        ["Weight Loss %", p.metrics?.weightLossPct],
        ["Yield %", p.metrics?.yieldPct || f.yieldPct],
        ["aw Status", p.metrics?.awPass ? "PASS" : "FAIL"],
        ["pH Status", p.metrics?.phPass ? "PASS" : "FAIL"],
      ]);

      addSection("Sensory Evaluation", [
        ["Color", f.senColor],
        ["Texture", f.senTexture],
        ["Odor", f.senOdor],
        ["Appearance", f.senAppearance],
      ]);

      addSection("Packaging & Storage", [
        ["Packaging Type", f.packagingType],
        ["Storage Temp °C", f.storageTemp],
        ["Best Before", f.bestBefore],
        ["Output", f.outputCount],
      ]);

      addSection("Signatures", [
        ["Checked By", f.checkedBy],
        ["Verified By", f.verifiedBy],
        ["Approved By", f.approvedBy],
      ]);

      ws.columns = [
        { width: 22 }, { width: 18 }, { width: 14 }, { width: 14 },
        { width: 14 }, { width: 14 }, { width: 14 }, { width: 18 },
      ];

      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      a.download = `PRD_DriedMeat_${p.reportDate || date}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error(e);
      alert("XLSX export failed");
    }
  }

  const grouped = useMemo(() => {
    const out = {};
    for (const d of allDates) {
      const n = normYMD(d);
      if (!n) continue;
      (out[n.y] ||= {});
      (out[n.y][n.m] ||= []).push(d);
    }
    for (const y of Object.keys(out)) {
      out[y] = Object.fromEntries(
        Object.entries(out[y])
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([m, arr]) => [m, arr.sort((a, b) => a.localeCompare(b))])
      );
    }
    return Object.fromEntries(
      Object.entries(out).sort(([a], [b]) => Number(a) - Number(b))
    );
  }, [allDates]);

  const p = record?.payload;
  const f = p?.form || {};
  const m = p?.metrics || {};

  return (
    <div className="dmv-wrap" dir={dir}>
      <style>{STYLES}</style>

      {/* Toolbar */}
      <div className="dmv-topbar">
        <div className="dmv-title">
          🥓 Dried Meat Process Record — {isAr ? "عرض" : "View"}
        </div>
        <div className="dmv-actions">
          <PrintButton
            title="Dried Meat Process Record"
            documentNo={p?.header?.documentNo}
            reportDate={p?.reportDate}
          />
          <button onClick={exportXLSX} disabled={!record} className="dmv-btn dmv-btn-info">
            {isAr ? "تصدير XLSX" : "Export XLSX"}
          </button>
          <button onClick={exportJSON} disabled={!record} className="dmv-btn dmv-btn-info">
            {isAr ? "تصدير JSON" : "Export JSON"}
          </button>
          <button onClick={handleDelete} disabled={!record} className="dmv-btn dmv-btn-danger">
            {isAr ? "حذف" : "Delete"}
          </button>
        </div>
      </div>

      {/* Print-only official header */}
      <PrintOfficialHeader
        title="Dried Meat Process Record"
        documentNo={p?.header?.documentNo}
        reportDate={p?.reportDate}
      />

      <div className="dmv-layout">
        {/* Sidebar */}
        <aside className="dmv-sidebar">
          <div className="dmv-sidebar-title">📅 {isAr ? "شجرة التواريخ" : "Date Tree"}</div>
          <div className="dmv-tree">
            {Object.keys(grouped).length === 0 && (
              <div className="dmv-empty">{isAr ? "لا توجد تقارير" : "No reports"}</div>
            )}
            {Object.entries(grouped).map(([year, months]) => {
              const yOpen = !!expYears[year];
              return (
                <div key={year}>
                  <button className="dmv-y-btn" onClick={() => setExpYears((p)=>({...p, [year]:!p[year]}))}>
                    <span>{yOpen ? "▾" : "▸"}</span>
                    <strong>{year}</strong>
                  </button>
                  {yOpen && Object.entries(months).map(([mo, days]) => {
                    const key = `${year}-${mo}`;
                    const mOpen = !!expMonths[key];
                    return (
                      <div key={key} className="dmv-month">
                        <button className="dmv-m-btn" onClick={() => setExpMonths((p)=>({...p, [key]:!p[key]}))}>
                          <span>{mOpen ? "▾" : "▸"}</span>
                          <span>{mo}</span>
                        </button>
                        {mOpen && (
                          <ul className="dmv-days">
                            {days.map((d) => (
                              <li key={d}>
                                <button
                                  className={`dmv-d-btn ${d === date ? "active" : ""}`}
                                  onClick={() => setDate(d)}
                                >
                                  {d}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main */}
        <main className="dmv-main">
          {loading && <div className="dmv-msg">{t("status_loading")}</div>}
          {err && <div className="dmv-msg dmv-msg-err">{err}</div>}
          {!loading && !err && !record && (
            <div className="dmv-empty-panel">
              <div style={{ fontSize: 48, opacity: .3 }}>🥓</div>
              <div>{isAr ? "لا يوجد تقرير لهذا التاريخ" : "No report for this date"}</div>
            </div>
          )}

          {record && (
            <>
              <PRDReportHeader
                title="Dried Meat Process Record"
                titleAr="سجل تصنيع اللحم المجفف"
                subtitle={t("dm_subtitle")}
                accent="#b45309"
                fields={[
                  { labelKey: "hdr_document_no",  value: p?.header?.documentNo },
                  { labelKey: "hdr_issue_date",   value: p?.header?.issueDate },
                  { labelKey: "hdr_revision_no",  value: p?.header?.revisionNo },
                  { labelKey: "hdr_area",         value: p?.header?.area },
                  { labelKey: "hdr_issued_by",    value: p?.header?.issuedBy },
                  { labelKey: "hdr_controlling",  value: p?.header?.controllingOfficer },
                  { labelKey: "hdr_approved_by",  value: p?.header?.approvedBy },
                  { labelKey: "hdr_report_date",  value: p?.reportDate },
                ]}
              />

              {/* Critical status at top for quick glance */}
              <div className="dmv-critical-bar">
                <div className={`dmv-chip-crit dmv-chip-${m.awPass ? "ok" : f.waterActivity ? "bad" : "empty"}`}>
                  💧 aw: <strong>{safe(f.waterActivity) || "—"}</strong>
                </div>
                <div className={`dmv-chip-crit dmv-chip-${m.phPass ? "ok" : f.ph ? "bad" : "empty"}`}>
                  ⚗️ pH: <strong>{safe(f.ph) || "—"}</strong>
                </div>
                <div className="dmv-chip-crit dmv-chip-empty">
                  📉 {isAr ? "فقد" : "Loss"}: <strong>{safe(m.weightLossPct) ? `${m.weightLossPct}%` : "—"}</strong>
                </div>
                <div className="dmv-chip-crit dmv-chip-empty">
                  🎯 {isAr ? "إنتاج" : "Yield"}: <strong>{safe(m.yieldPct || f.yieldPct) ? `${m.yieldPct || f.yieldPct}%` : "—"}</strong>
                </div>
              </div>

              <Panel title={t("dm_batch_section")} icon="📦" accent="#0ea5e9">
                <div className="dmv-grid-3">
                  <RowKV label={t("dm_batch_id")} value={f.batchId} />
                  <RowKV label={t("dm_product_type")} value={f.productType} />
                  <RowKV label={t("dm_product_name")} value={f.productName} />
                  <RowKV label={t("dm_raw_type")} value={f.rawMeatType} />
                  <RowKV label={t("dm_raw_source")} value={f.rawSource} />
                  <RowKV label={t("dm_raw_lot")} value={f.rawLotNo} />
                  <RowKV label={t("dm_raw_prod_date")} value={f.rawProdDate} />
                  <RowKV
                    label={t("dm_raw_exp_date")}
                    value={f.rawExpDate}
                    warn={(() => {
                      if (!f.rawExpDate) return false;
                      const exp = new Date(f.rawExpDate);
                      const now = new Date();
                      if (f.rawProdDate) {
                        const prod = new Date(f.rawProdDate);
                        if (prod > exp) return true;
                      }
                      return (exp - now) / (1000*60*60*24) < 7;
                    })()}
                  />
                  <RowKV label={t("dm_initial_weight")} value={f.initialWeight} />
                  <RowKV label={t("dm_received_date")} value={f.receivedDate} />
                  <RowKV label={t("dm_start_date")} value={f.startDate} />
                  <RowKV label={t("dm_expected_end")} value={f.expectedEndDate} />
                </div>
              </Panel>

              <Panel title={t("dm_curing_section")} icon="🧂" accent="#8b5cf6" ccp>
                <div className="dmv-grid-3">
                  <RowKV label={t("dm_salt_pct")} value={f.saltPct} />
                  <RowKV label={t("dm_nitrite_ppm")} value={f.nitritePpm} />
                  <RowKV label={t("dm_curing_temp")} value={f.curingTemp} warn={f.curingTemp && parseFloat(f.curingTemp) > 5} />
                  <RowKV label={t("dm_curing_hours")} value={f.curingHours} />
                  <RowKV label={t("dm_curing_start")} value={f.curingStart} />
                  <RowKV label={t("dm_curing_end")} value={f.curingEnd} />
                  <RowKV label={t("dm_spices")} value={f.spices} span={2} />
                  <RowKV label={t("dm_curing_notes")} value={f.curingNotes} />
                </div>
              </Panel>

              <Panel title={t("dm_machine_section")} icon="🏭" accent="#f97316">
                <div className="dmv-grid-3">
                  <RowKV label={t("dm_batch_capacity")} value={f.batchCapacity} />
                  <RowKV label={t("dm_hanging_pieces")} value={f.hangingPieces} />
                  <RowKV label={t("dm_hanging_levels")} value={f.hangingLevels} />
                  <RowKV label={t("dm_target_temp")} value={f.targetTemp} />
                  <RowKV label={t("dm_target_humidity")} value={f.targetHumidity} />
                  <RowKV label={t("dm_fan_speed")} value={
                    f.fanSpeed === "low"    ? t("dm_fan_low") :
                    f.fanSpeed === "medium" ? t("dm_fan_medium") :
                    f.fanSpeed === "high"   ? t("dm_fan_high") : ""
                  } />
                  <RowKV label={t("dm_program_mode")} value={f.programMode} />
                  <RowKV label={t("dm_cycle_hours")} value={f.cycleHours} />
                </div>
              </Panel>

              <Panel title={t("dm_drying_section")} icon="🌬️" accent="#ef4444" ccp>
                <div className="dmv-drying-wrap">
                  <table className="dmv-drying">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t("dm_elapsed_time")}</th>
                        <th>{t("dm_drying_date")}</th>
                        <th>{t("dm_drying_time")}</th>
                        <th>{t("dm_temp")}</th>
                        <th>{t("dm_humidity")}</th>
                        <th>{t("dm_position")}</th>
                        <th>{t("dm_current_weight")}</th>
                        <th>{t("dm_reading_notes")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(f.dryingLog || []).map((row, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{safe(row.elapsedHrs) !== "" && row.elapsedHrs != null ? `${row.elapsedHrs}h` : "—"}</td>
                          <td>{safe(row.date) || "—"}</td>
                          <td>{safe(row.time) || "—"}</td>
                          <td>{safe(row.temperature) || "—"}</td>
                          <td>{safe(row.humidity) || "—"}</td>
                          <td>{
                            row.position === "top"    ? t("dm_pos_top") :
                            row.position === "middle" ? t("dm_pos_middle") :
                            row.position === "bottom" ? t("dm_pos_bottom") :
                            safe(row.airflow) || "—"   /* legacy airflow */
                          }</td>
                          <td>{safe(row.weight) || "—"}</td>
                          <td>{safe(row.notes) || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title={t("dm_post_section")} icon="🧊" accent="#0ea5e9">
                <div className="dmv-grid-4">
                  <RowKV label={t("dm_cooling_time")} value={f.coolingTime} />
                  <RowKV label={t("dm_cooling_temp")} value={f.coolingTemp} />
                  <RowKV label={t("dm_rotation_count")} value={f.rotationCount} />
                  <RowKV label={t("dm_rotation_note")} value={f.rotationNote} />
                </div>
              </Panel>

              <Panel title={t("dm_final_section")} icon="🧪" accent="#dc2626" ccp>
                <div className="dmv-grid-3">
                  <RowKV label={t("dm_aw")} value={f.waterActivity} status={m.awPass ? "ok" : f.waterActivity ? "bad" : "empty"} />
                  <RowKV label={t("dm_ph")} value={f.ph} status={m.phPass ? "ok" : f.ph ? "bad" : "empty"} />
                  <RowKV label={t("dm_final_moisture")} value={f.finalMoisture} />
                  <RowKV label={t("dm_salt_content")} value={f.saltContent} />
                  <RowKV label={t("dm_final_weight")} value={f.finalWeight} />
                  <RowKV label={t("dm_weight_loss")} value={m.weightLossPct ? `${m.weightLossPct}%` : "—"} />
                  <RowKV label={t("dm_yield")} value={(m.yieldPct || f.yieldPct) ? `${m.yieldPct || f.yieldPct}%` : "—"} />
                </div>
              </Panel>

              <Panel title={t("dm_sensory_section")} icon="👃" accent="#06b6d4">
                <div className="dmv-sensory-grid">
                  <SensoryChip label={t("dm_color")} value={f.senColor} />
                  <SensoryChip label={t("dm_texture")} value={f.senTexture} />
                  <SensoryChip label={t("dm_odor")} value={f.senOdor} />
                  <SensoryChip label={t("dm_appearance")} value={f.senAppearance} />
                </div>
              </Panel>

              <Panel title={t("dm_pkg_section")} icon="📦" accent="#16a34a">
                <div className="dmv-grid-4">
                  <RowKV label={t("dm_pkg_type")} value={
                    f.packagingType === "vacuum"  ? t("dm_pkg_vacuum")  :
                    f.packagingType === "map"     ? t("dm_pkg_map")     :
                    f.packagingType === "regular" ? t("dm_pkg_regular") : ""
                  } />
                  <RowKV label={t("dm_storage_temp")} value={f.storageTemp} />
                  <RowKV label={t("dm_best_before")} value={f.bestBefore} />
                  <RowKV label={t("dm_output_count")} value={f.outputCount} />
                </div>
              </Panel>

              <div className="dmv-footer">
                <div className="dmv-sig"><label>{t("dm_checked")}</label><div>{safe(f.checkedBy) || "—"}</div></div>
                <div className="dmv-sig"><label>{t("dm_verified")}</label><div>{safe(f.verifiedBy) || "—"}</div></div>
                <div className="dmv-sig"><label>{t("dm_approved")}</label><div>{safe(f.approvedBy) || "—"}</div></div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Panel({ title, icon, accent, ccp, children }) {
  return (
    <section className="dmv-panel" style={{ "--accent": accent }}>
      <header className="dmv-panel-header">
        <span className="dmv-panel-icon" style={{ background: `${accent}20`, color: accent }}>{icon}</span>
        <span className="dmv-panel-title">{title}</span>
        {ccp && <span className="dmv-ccp">CCP</span>}
      </header>
      <div className="dmv-panel-body">{children}</div>
    </section>
  );
}

function RowKV({ label, value, warn, status, span }) {
  const cls = status === "ok" ? "dmv-value-ok" : status === "bad" ? "dmv-value-bad" : warn ? "dmv-value-bad" : "";
  return (
    <div className="dmv-row" style={span === 2 ? { gridColumn: "span 2" } : undefined}>
      <span className="dmv-label">{label}</span>
      <span className={`dmv-value ${cls}`}>{safe(value) || "—"}</span>
    </div>
  );
}

function SensoryChip({ label, value }) {
  return (
    <div className="dmv-sensory-row">
      <span>{label}</span>
      <span className={`dmv-chip dmv-chip-${value === "C" ? "ok" : value === "NC" ? "bad" : "empty"}`}>
        {value || "—"}
      </span>
    </div>
  );
}

const STYLES = `
  .dmv-wrap {
    padding: 22px;
    background: #f8fafc;
    min-height: 100%;
  }
  .dmv-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding: 12px 16px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .dmv-title {
    font-size: 17px;
    font-weight: 800;
    color: #0f172a;
  }
  .dmv-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .dmv-btn {
    padding: 8px 14px;
    border-radius: 8px;
    border: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all .15s;
  }
  .dmv-btn:disabled { opacity: .5; cursor: not-allowed; }
  .dmv-btn-info {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
  }
  .dmv-btn-info:hover:not(:disabled) { background: #fde68a; }
  .dmv-btn-danger {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
  .dmv-btn-danger:hover:not(:disabled) { background: #fee2e2; }

  .dmv-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 14px;
  }

  .dmv-sidebar {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    max-height: calc(100vh - 240px);
    overflow-y: auto;
  }
  .dmv-sidebar-title {
    font-size: 12px;
    font-weight: 800;
    color: #64748b;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
    text-transform: uppercase;
    letter-spacing: .05em;
  }
  .dmv-tree { display: flex; flex-direction: column; gap: 4px; }
  .dmv-empty { color: #94a3b8; font-size: 13px; padding: 10px; text-align: center; }
  .dmv-y-btn, .dmv-m-btn {
    display: flex; align-items: center; gap: 6px;
    width: 100%;
    padding: 6px 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    text-align: left;
    color: #0f172a;
  }
  .dmv-y-btn:hover, .dmv-m-btn:hover { background: #f1f5f9; }
  .dmv-month { margin-left: 8px; margin-top: 4px; }
  .dmv-days { list-style: none; padding: 6px 0 0 8px; margin: 0; }
  .dmv-days li { margin-bottom: 4px; }
  .dmv-d-btn {
    width: 100%;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: #fff;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    color: #334155;
  }
  .dmv-d-btn:hover { background: #f1f5f9; }
  .dmv-d-btn.active {
    background: #b45309;
    color: #fff;
    border-color: #92400e;
  }

  .dmv-msg {
    padding: 14px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    text-align: center;
    color: #64748b;
    font-weight: 700;
  }
  .dmv-msg-err { color: #dc2626; }
  .dmv-empty-panel {
    padding: 60px 20px;
    background: #fff;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
    text-align: center;
    color: #64748b;
    font-weight: 700;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
  }

  /* Critical bar */
  .dmv-critical-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .dmv-chip-crit {
    padding: 10px 16px;
    border-radius: 10px;
    border: 2px solid;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dmv-chip-crit strong { font-size: 15px; }
  .dmv-chip-ok    { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
  .dmv-chip-bad   { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
  .dmv-chip-empty { background: #f8fafc; color: #64748b; border-color: #e2e8f0; }

  /* Panels */
  .dmv-panel {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-top: 4px solid var(--accent);
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
    margin-bottom: 14px;
  }
  .dmv-panel-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f1f5f9;
  }
  .dmv-panel-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }
  .dmv-panel-title {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
  }
  .dmv-ccp {
    margin-left: auto;
    background: #fee2e2;
    color: #991b1b;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: .06em;
    border: 1px solid #fecaca;
  }

  /* Row display */
  .dmv-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .dmv-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .dmv-row {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
  }
  .dmv-label {
    display: block;
    font-size: 10px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-bottom: 3px;
  }
  .dmv-value {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
  }
  .dmv-value-ok  { color: #16a34a; }
  .dmv-value-bad { color: #dc2626; }

  /* Drying log */
  .dmv-drying-wrap {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow-x: auto;
  }
  .dmv-drying {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    min-width: 780px;
  }
  .dmv-drying thead th {
    background: #0f172a;
    color: #fff;
    padding: 8px 6px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    text-align: center;
  }
  .dmv-drying tbody td {
    padding: 6px 8px;
    text-align: center;
    font-weight: 600;
    color: #0f172a;
    border-bottom: 1px solid #f1f5f9;
  }
  .dmv-drying tbody tr:last-child td { border-bottom: none; }

  /* Sensory */
  .dmv-sensory-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .dmv-sensory-row {
    display: grid;
    grid-template-columns: 1fr 60px;
    gap: 8px;
    align-items: center;
    padding: 7px 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    color: #334155;
  }
  .dmv-chip {
    padding: 3px 8px;
    border-radius: 5px;
    font-weight: 800;
    font-size: 11px;
    text-align: center;
  }
  .dmv-chip-empty { background: #f1f5f9; color: #94a3b8; }
  .dmv-chip-ok    { background: #dcfce7; color: #166534; }
  .dmv-chip-bad   { background: #fee2e2; color: #991b1b; }

  /* Footer */
  .dmv-footer {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .dmv-sig {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
  }
  .dmv-sig label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 6px;
  }
  .dmv-sig div {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }

  @media (max-width: 900px) {
    .dmv-wrap { padding: 12px; }
    .dmv-layout { grid-template-columns: 1fr; }
    .dmv-grid-3, .dmv-grid-4 { grid-template-columns: 1fr; }
    .dmv-footer { grid-template-columns: 1fr; }
    .dmv-sensory-grid { grid-template-columns: 1fr; }
  }
`;
