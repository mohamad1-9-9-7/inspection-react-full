// src/pages/monitor/branches/production/OnlineCuttingRecordView.jsx
// View for On-Line Cutting Record — read-only display with date tree sidebar + export

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

const TYPE = "prod_online_cutting";

const QUALITY_KEYS = [
  { key: "shape",        labelKey: "oc_q_shape" },
  { key: "color",        labelKey: "oc_q_color" },
  { key: "fat",          labelKey: "oc_q_fat" },
  { key: "bloodSpot",    labelKey: "oc_q_blood" },
  { key: "whitePatches", labelKey: "oc_q_white" },
  { key: "badOdor",      labelKey: "oc_q_odor" },
  { key: "foreign",      labelKey: "oc_q_foreign" },
  { key: "cartilage",    labelKey: "oc_q_cartilage" },
  { key: "overall",      labelKey: "oc_q_overall" },
];

const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

function normYMD(s) {
  const str = String(s || "").trim();
  if (!str) return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { y: m[1], m: m[2], d: m[3], iso: `${m[1]}-${m[2]}-${m[3]}` } : null;
}

export default function OnlineCuttingRecordView() {
  const { t, dir, isAr } = useLang();

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  const [date, setDate]               = useState(todayDubai);
  const [loading, setLoading]         = useState(false);
  const [err, setErr]                 = useState("");
  const [record, setRecord]           = useState(null);
  const [allDates, setAllDates]       = useState([]);
  const [expandedYears, setExpandedYears]   = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

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
          setExpandedYears((p) => ({ ...p, [n.y]: true }));
          setExpandedMonths((p) => ({ ...p, [`${n.y}-${n.m}`]: true }));
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
    a.download = `PRD_CuttingRecord_${record?.payload?.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    if (!record) return;
    try {
      const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
      const p = record.payload || {};
      const products = p.products || [];
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("OnlineCutting");
      const border = {
        top:{style:"thin",color:{argb:"64748B"}},
        left:{style:"thin",color:{argb:"64748B"}},
        bottom:{style:"thin",color:{argb:"64748B"}},
        right:{style:"thin",color:{argb:"64748B"}},
      };

      ws.mergeCells(1, 1, 1, 8);
      ws.getCell(1,1).value = `On-Line Cutting Record — ${safe(p.reportDate)}`;
      ws.getCell(1,1).font = { bold: true, size: 14 };
      ws.getCell(1,1).alignment = { horizontal: "center" };
      ws.getCell(1,1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FCE7F3"} };
      ws.getRow(1).height = 22;

      ws.getCell(2,1).value = `Customer: Al Mawashi Retail Branches  |  Batch Code: ${safe(p.batchCode)}`;
      ws.mergeCells(2,1,2,8);

      let r = 4;
      products.forEach((prod, idx) => {
        ws.mergeCells(r, 1, r, 8);
        ws.getCell(r, 1).value = `Product ${idx+1}: ${safe(prod.productName)}`;
        ws.getCell(r, 1).font = { bold: true, size: 12 };
        ws.getCell(r, 1).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"E0F2FE"} };
        r++;

        const cw = prod.cuttingWeights || [];
        const mw = prod.marinatedWeights || [];
        const meta = [
          ["Customer", prod.customerName, "Brand", prod.brand],
          ["Pro Date", prod.prodDate, "Exp Date", prod.expDate],
          ["Batch No", prod.batchNo, "Pdt Temp", prod.pdtTemp],
          [
            `Cutting Piece Weight (${safe(prod.cuttingWeightSpec) || safe(prod.pieceWeight)})`,
            [cw[0], cw[1], cw[2], cw[3]].filter((v) => v !== "" && v != null).join(" / "),
            "",
            "",
          ],
          [
            `Marinated Piece Weight (${safe(prod.marinatedWeightSpec)})`,
            [mw[0], mw[1], mw[2], mw[3]].filter((v) => v !== "" && v != null).join(" / "),
            "",
            "",
          ],
        ];
        meta.forEach((row) => {
          row.forEach((v, c) => {
            ws.getCell(r, c+1).value = safe(v);
            ws.getCell(r, c+1).border = border;
            if (c % 2 === 0) ws.getCell(r, c+1).font = { bold: true };
          });
          r++;
        });

        r++;
        ws.getCell(r, 1).value = "Sample #";
        ws.getCell(r, 2).value = "Time";
        ws.getCell(r, 3).value = "Pdt Temp";
        [1,2,3].forEach((c) => {
          ws.getCell(r, c).font = { bold: true };
          ws.getCell(r, c).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"F1F5F9"} };
          ws.getCell(r, c).border = border;
        });
        r++;
        (prod.samples || []).forEach((s, si) => {
          ws.getCell(r, 1).value = si + 1;
          ws.getCell(r, 2).value = safe(s.time);
          ws.getCell(r, 3).value = safe(s.pdtTemp);
          [1,2,3].forEach(c => ws.getCell(r, c).border = border);
          r++;
        });

        r++;
        ws.getCell(r, 1).value = "Quality Parameter";
        ws.getCell(r, 2).value = "Result";
        [1,2].forEach(c => {
          ws.getCell(r, c).font = { bold: true };
          ws.getCell(r, c).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"F1F5F9"} };
          ws.getCell(r, c).border = border;
        });
        r++;
        QUALITY_KEYS.forEach((q) => {
          ws.getCell(r, 1).value = t(q.labelKey);
          const v = prod.quality?.[q.key] || "";
          ws.getCell(r, 2).value = v;
          [1,2].forEach(c => ws.getCell(r, c).border = border);
          if (v === "NC") {
            ws.getCell(r, 2).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FEE2E2"} };
          } else if (v === "C") {
            ws.getCell(r, 2).fill = { type:"pattern", pattern:"solid", fgColor:{argb:"DCFCE7"} };
          }
          r++;
        });

        r += 2;
      });

      ws.getCell(r, 1).value = `Remarks: ${safe(p.remarks)}`;
      r++;
      ws.getCell(r, 1).value = `Recorded By: ${safe(p.recordedBy)}`;
      ws.getCell(r, 2).value = `Verified By: ${safe(p.verifiedBy)}`;

      ws.columns = [
        { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 },
        { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
      ];

      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      a.download = `PRD_CuttingRecord_${p.reportDate || date}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error(e);
      alert("XLSX export failed");
    }
  }

  /* Date tree grouping */
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

  const toggleYear  = (y) => setExpandedYears((p) => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  const p = record?.payload;
  const products = p?.products || [];

  return (
    <div className="ocv-wrap" dir={dir}>
      <style>{STYLES}</style>

      {/* Top toolbar */}
      <div className="ocv-topbar">
        <div className="ocv-title">
          On-Line Cutting Record — {isAr ? "عرض" : "View"}
        </div>
        <div className="ocv-actions">
          <PrintButton
            title="On-Line Cutting Record"
            documentNo={p?.header?.documentNo || "TELT /QA/CCB/1"}
            reportDate={p?.reportDate}
          />
          <button onClick={exportXLSX} disabled={!record} className="ocv-btn ocv-btn-info">
            {isAr ? "تصدير XLSX" : "Export XLSX"}
          </button>
          <button onClick={exportJSON} disabled={!record} className="ocv-btn ocv-btn-info">
            {isAr ? "تصدير JSON" : "Export JSON"}
          </button>
          <button onClick={handleDelete} disabled={!record} className="ocv-btn ocv-btn-danger">
            {isAr ? "حذف" : "Delete"}
          </button>
        </div>
      </div>

      {/* Print-only official header */}
      <PrintOfficialHeader
        title="On-Line Cutting Record"
        documentNo={p?.header?.documentNo || "TELT /QA/CCB/1"}
        reportDate={p?.reportDate}
      />

      <div className="ocv-layout">
        {/* Sidebar date tree */}
        <aside className="ocv-sidebar">
          <div className="ocv-sidebar-title">
            📅 {isAr ? "شجرة التواريخ" : "Date Tree"}
          </div>
          <div className="ocv-tree">
            {Object.keys(grouped).length === 0 && (
              <div className="ocv-empty">{isAr ? "لا توجد تقارير" : "No reports"}</div>
            )}
            {Object.entries(grouped).map(([year, months]) => {
              const yOpen = !!expandedYears[year];
              return (
                <div key={year} className="ocv-year">
                  <button className="ocv-year-btn" onClick={() => toggleYear(year)}>
                    <span>{yOpen ? "▾" : "▸"}</span>
                    <strong>{year}</strong>
                  </button>
                  {yOpen && Object.entries(months).map(([month, days]) => {
                    const key = `${year}-${month}`;
                    const mOpen = !!expandedMonths[key];
                    return (
                      <div key={key} className="ocv-month">
                        <button className="ocv-month-btn" onClick={() => toggleMonth(year, month)}>
                          <span>{mOpen ? "▾" : "▸"}</span>
                          <span>{month}</span>
                        </button>
                        {mOpen && (
                          <ul className="ocv-days">
                            {days.map((d) => (
                              <li key={d}>
                                <button
                                  className={`ocv-day-btn ${d === date ? "active" : ""}`}
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

        {/* Main content */}
        <main className="ocv-main">
          {loading && <div className="ocv-msg">{t("status_loading")}</div>}
          {err && <div className="ocv-msg ocv-msg-err">{err}</div>}
          {!loading && !err && !record && (
            <div className="ocv-empty-panel">
              <div style={{ fontSize: 48, opacity: .3 }}>📋</div>
              <div>{isAr ? "لا يوجد تقرير لهذا التاريخ" : "No report for this date"}</div>
            </div>
          )}

          {record && (
            <>
              <PRDReportHeader
                title="On-Line Cutting Record"
                titleAr="سجل التقطيع المباشر"
                subtitle={t("oc_subtitle")}
                accent="#e11d48"
                fields={[
                  { labelKey: "hdr_document_no",  value: p?.header?.documentNo },
                  { labelKey: "hdr_issue_date",   value: p?.header?.issueDate },
                  { labelKey: "hdr_revision_no",  value: p?.header?.revisionNo },
                  { labelKey: "hdr_area",         value: p?.header?.area },
                  { labelKey: "hdr_issued_by",    value: p?.header?.issuedBy },
                  { labelKey: "hdr_controlling",  value: p?.header?.controllingOfficer },
                  { labelKey: "hdr_approved_by", value: p?.header?.approvedBy },
                  { labelKey: "hdr_report_date",  value: p?.reportDate },
                ]}
              />

              {/* Top info */}
              <div className="ocv-topinfo">
                <div className="ocv-topinfo-cell">
                  <label>{t("oc_customer")}</label>
                  <div className="ocv-topinfo-value">Al Mawashi Retail Branches</div>
                </div>
                <div className="ocv-topinfo-cell">
                  <label>{t("oc_batch_code")}</label>
                  <div className="ocv-topinfo-value">{safe(p?.batchCode) || "—"}</div>
                </div>
              </div>

              {/* Products */}
              <div className="ocv-products">
                {products.map((prod, idx) => {
                  const ACCENTS = ["#0ea5e9", "#22c55e", "#f59e0b", "#a855f7"];
                  const accent = ACCENTS[idx % ACCENTS.length];
                  return (
                    <div key={idx} className="ocv-card" style={{ "--accent": accent }}>
                      <div className="ocv-card-badge" style={{ background: accent }}>
                        {t("oc_product")} {idx + 1}
                      </div>
                      <h3 className="ocv-product-name">{safe(prod.productName) || "—"}</h3>

                      {/* Cutting Weight Group */}
                      {(prod.cuttingWeightSpec || (prod.cuttingWeights || []).some((w) => w) || prod.pieceWeight) && (
                        <div className="ocv-weight-group">
                          <div className="ocv-weight-title">
                            {t("oc_cutting_weight")}
                            {(prod.cuttingWeightSpec || prod.pieceWeight) && (
                              <span className="ocv-weight-spec">
                                · {safe(prod.cuttingWeightSpec) || safe(prod.pieceWeight)}
                              </span>
                            )}
                          </div>
                          <div className="ocv-weight-values">
                            {(prod.cuttingWeights && prod.cuttingWeights.length
                              ? prod.cuttingWeights
                              : [""]).map((w, i) => (
                              <div key={i} className="ocv-weight-chip">
                                <span className="ocv-weight-num">#{i + 1}</span>
                                <span className="ocv-weight-val">{w || "—"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Marinated Weight Group */}
                      {(prod.marinatedWeightSpec || (prod.marinatedWeights || []).some((w) => w)) && (
                        <div className="ocv-weight-group">
                          <div className="ocv-weight-title">
                            {t("oc_marinated_weight")}
                            {prod.marinatedWeightSpec && (
                              <span className="ocv-weight-spec">· {safe(prod.marinatedWeightSpec)}</span>
                            )}
                          </div>
                          <div className="ocv-weight-values">
                            {(prod.marinatedWeights || ["", "", "", ""]).map((w, i) => (
                              <div key={i} className="ocv-weight-chip">
                                <span className="ocv-weight-num">#{i + 1}</span>
                                <span className="ocv-weight-val">{w || "—"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="ocv-section">{t("oc_rm_details")}</div>
                      <div className="ocv-meta-grid">
                        <div><span className="ocv-label">{t("oc_brand")}:</span> <span className="ocv-value">{safe(prod.brand) || "—"}</span></div>
                        <div><span className="ocv-label">{t("oc_batch_no")}:</span> <span className="ocv-value">{safe(prod.batchNo) || "—"}</span></div>
                        <div><span className="ocv-label">{t("oc_prod_date")}:</span> <span className="ocv-value">{safe(prod.prodDate) || "—"}</span></div>
                        <div><span className="ocv-label">{t("oc_exp_date")}:</span> <span className="ocv-value">{safe(prod.expDate) || "—"}</span></div>
                        <div className="ocv-meta-span2">
                          <span className="ocv-label">{t("oc_pdt_temp")}:</span>
                          <span className={`ocv-value ${prod.pdtTemp && parseFloat(prod.pdtTemp) >= 10 ? "ocv-warn" : ""}`}>
                            {safe(prod.pdtTemp) || "—"}
                          </span>
                        </div>
                      </div>

                      <div className="ocv-section">{t("oc_samples")}</div>
                      <table className="ocv-samples">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{t("oc_time")}</th>
                            <th>{t("oc_pdt_temp")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(prod.samples || []).map((s, si) => (
                            <tr key={si}>
                              <td>{si + 1}</td>
                              <td>{safe(s.time) || "—"}</td>
                              <td className={s.pdtTemp && parseFloat(s.pdtTemp) >= 10 ? "ocv-warn" : ""}>
                                {safe(s.pdtTemp) || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="ocv-section">{t("oc_quality")}</div>
                      <div className="ocv-quality">
                        {QUALITY_KEYS.map((q) => {
                          const v = prod.quality?.[q.key] || "";
                          return (
                            <div key={q.key} className="ocv-quality-row">
                              <span>{t(q.labelKey)}</span>
                              <span className={`ocv-chip ocv-chip-${v === "C" ? "ok" : v === "NC" ? "bad" : "empty"}`}>
                                {v || "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Remarks */}
              {p?.remarks && (
                <div className="ocv-remarks">
                  <label>{t("oc_remarks")}</label>
                  <p>{p.remarks}</p>
                </div>
              )}

              {/* Footer */}
              <div className="ocv-footer">
                <div className="ocv-sig">
                  <label>{t("oc_recorded_by")}</label>
                  <div>{safe(p?.recordedBy) || "—"}</div>
                </div>
                <div className="ocv-sig">
                  <label>{t("oc_verified_by")}</label>
                  <div>{safe(p?.verifiedBy) || "—"}</div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const STYLES = `
  .ocv-wrap {
    padding: 22px;
    background: #f8fafc;
    min-height: 100%;
  }

  .ocv-topbar {
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
  .ocv-title {
    font-size: 17px;
    font-weight: 800;
    color: #0f172a;
  }
  .ocv-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .ocv-btn {
    padding: 8px 14px;
    border-radius: 8px;
    border: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all .15s;
  }
  .ocv-btn:disabled { opacity: .5; cursor: not-allowed; }
  .ocv-btn-info {
    background: #e0f2fe;
    color: #075985;
    border: 1px solid #bae6fd;
  }
  .ocv-btn-info:hover:not(:disabled) { background: #bae6fd; }
  .ocv-btn-danger {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
  .ocv-btn-danger:hover:not(:disabled) { background: #fee2e2; }

  .ocv-layout {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 14px;
  }

  .ocv-sidebar {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    max-height: calc(100vh - 240px);
    overflow-y: auto;
  }
  .ocv-sidebar-title {
    font-size: 12px;
    font-weight: 800;
    color: #64748b;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
    text-transform: uppercase;
    letter-spacing: .05em;
  }
  .ocv-tree { display: flex; flex-direction: column; gap: 4px; }
  .ocv-empty { color: #94a3b8; font-size: 13px; padding: 10px; text-align: center; }

  .ocv-year-btn, .ocv-month-btn {
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
  .ocv-year-btn:hover, .ocv-month-btn:hover { background: #f1f5f9; }
  .ocv-month { margin-left: 8px; margin-top: 4px; }
  .ocv-days { list-style: none; padding: 6px 0 0 8px; margin: 0; }
  .ocv-days li { margin-bottom: 4px; }
  .ocv-day-btn {
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
  .ocv-day-btn:hover { background: #f1f5f9; }
  .ocv-day-btn.active {
    background: #e11d48;
    color: #fff;
    border-color: #be123c;
  }

  .ocv-msg {
    padding: 14px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    text-align: center;
    color: #64748b;
    font-weight: 700;
  }
  .ocv-msg-err { color: #dc2626; }
  .ocv-empty-panel {
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

  .ocv-topinfo {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }
  .ocv-topinfo-cell {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 14px;
  }
  .ocv-topinfo-cell label {
    display: block;
    font-size: 10px;
    font-weight: 800;
    color: #e11d48;
    text-transform: uppercase;
    letter-spacing: .08em;
    margin-bottom: 4px;
  }
  .ocv-topinfo-value {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }

  .ocv-products {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 14px;
    margin-bottom: 14px;
  }
  .ocv-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-top: 4px solid var(--accent);
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
    position: relative;
  }
  .ocv-card-badge {
    position: absolute;
    top: -12px;
    left: 14px;
    color: #fff;
    font-size: 10.5px;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 999px;
    letter-spacing: .04em;
    text-transform: uppercase;
  }
  .ocv-product-name {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    margin: 6px 0 10px;
  }

  .ocv-field {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 4px 0;
    font-size: 13px;
  }
  .ocv-weight-group {
    background: #fafbfc;
    border: 1px solid #e2e8f0;
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    padding: 8px 10px;
    margin-bottom: 8px;
  }
  .ocv-weight-title {
    font-size: 11px;
    font-weight: 800;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: .04em;
    margin-bottom: 6px;
  }
  .ocv-weight-spec {
    color: #64748b;
    font-weight: 600;
    margin-left: 4px;
  }
  .ocv-weight-values {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .ocv-weight-chip {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 4px 6px;
    text-align: center;
  }
  .ocv-weight-num {
    display: block;
    font-size: 9px;
    color: #94a3b8;
    font-weight: 700;
  }
  .ocv-weight-val {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 1px;
  }

  .ocv-section {
    font-size: 11px;
    font-weight: 800;
    color: var(--accent);
    margin: 12px 0 6px;
    padding-bottom: 4px;
    border-bottom: 2px solid #f1f5f9;
    text-transform: uppercase;
    letter-spacing: .05em;
  }
  .ocv-label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .04em;
  }
  .ocv-value {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
  }
  .ocv-warn { color: #dc2626; }
  .ocv-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 14px;
    font-size: 12px;
  }
  .ocv-meta-span2 { grid-column: 1 / -1; }

  .ocv-samples {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
  .ocv-samples thead th {
    background: #0f172a;
    color: #fff;
    padding: 6px 8px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
  }
  .ocv-samples tbody td {
    padding: 5px 8px;
    text-align: center;
    font-weight: 600;
    color: #0f172a;
    border-bottom: 1px solid #f1f5f9;
  }
  .ocv-samples tbody tr:last-child td { border-bottom: none; }

  .ocv-quality {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .ocv-quality-row {
    display: grid;
    grid-template-columns: 1fr 60px;
    gap: 6px;
    padding: 5px 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    align-items: center;
  }
  .ocv-chip {
    padding: 3px 8px;
    border-radius: 5px;
    font-weight: 800;
    font-size: 11px;
    text-align: center;
  }
  .ocv-chip-empty { background: #f1f5f9; color: #94a3b8; }
  .ocv-chip-ok    { background: #dcfce7; color: #166534; }
  .ocv-chip-bad   { background: #fee2e2; color: #991b1b; }

  .ocv-remarks {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 14px;
  }
  .ocv-remarks label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #e11d48;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 6px;
  }
  .ocv-remarks p {
    margin: 0;
    font-size: 13px;
    color: #334155;
    line-height: 1.6;
  }

  .ocv-footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .ocv-sig {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
  }
  .ocv-sig label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 6px;
  }
  .ocv-sig div {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }

  @media (max-width: 900px) {
    .ocv-wrap { padding: 12px; }
    .ocv-layout { grid-template-columns: 1fr; }
    .ocv-topinfo { grid-template-columns: 1fr; }
    .ocv-footer { grid-template-columns: 1fr; }
  }
`;
