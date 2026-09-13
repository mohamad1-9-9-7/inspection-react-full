// src/pages/monitor/branches/POS 11/POS11PersonalHygieneView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import SignatureName from "../../../shared/SignatureName";
import { canDelete } from "../../../../utils/perms";
import {
  safe,
  getId,
  btn,
  formatDMY,
  GlassShell,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "../_shared/branchViewKit";
import { listReportDates, getReportRowByDate, reportDateOf } from "../_shared/reportApi";

const TYPE = "pos11_personal_hygiene";
const BRANCH = "POS 11";

/* ✅ أعمدة النظافة فقط (مثل الإدخال الجديد) */
const HYGIENE_COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
];

export default function POS11PersonalHygieneView() {
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  const [date, setDate] = useState("");      // empty = nothing open until a date is picked
  const [allDates, setAllDates] = useState([]);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [exporting, setExporting] = useState(false);

  const payload = record?.payload || {};
  const entries = Array.isArray(payload.entries) ? payload.entries : [];

  const askPass = (label = "") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  // ✅ اظهار POS 11 ومعه الاسم (ملحمة العين) — يدعم القديم والجديد
  const branchLabel = useMemo(() => {
    const base =
      (payload?.branchLabel && String(payload.branchLabel).trim()) ||
      (payload?.branch && String(payload.branch).trim()) ||
      BRANCH;
    if (/^pos\s*11$/i.test(base)) return "POS 11 — Al Ain Butchery";
    return base;
  }, [payload?.branchLabel, payload?.branch]);

  const reportDate = payload?.reportDate || payload?.date || date || "—";

  // ✅ لو التقارير القديمة كانت تستخدم checkedBy/verifiedBy
  const checkedBySupervisor = payload?.checkedBySupervisor || payload?.checkedBy || "";
  const verifiedByQA = payload?.verifiedByQA || payload?.verifiedBy || "";

  /* ===== date tree =====
     A metadata-only index (?lite=1): dates, no payloads. The page used to pull
     every record of the type — full payloads — on mount and then filter them in
     the browser, which is what made it crawl. The record for one day is fetched
     only when that day is opened. */
  async function fetchAllDates() {
    try {
      const rows = await listReportDates(TYPE);
      const uniq = Array.from(new Set(rows.map((r) => reportDateOf(r)).filter(Boolean)))
        .sort((a, b) => String(b).localeCompare(String(a)));
      setAllDates(uniq);
    } catch (e) {
      console.warn("Dates fetch failed", e);
    }
  }

  async function fetchRecord(d = date) {
    setLoading(true); setErr(""); setRecord(null);
    try {
      setRecord(await getReportRowByDate(TYPE, d));
    } catch (e) {
      console.error(e);
      setErr("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);

  const treeItems = useMemo(
    () => allDates.map((d) => ({ key: d, dateISO: d, label: formatDMY(d) })),
    [allDates]
  );

  /* ===== KPIs ===== */
  const kpis = useMemo(() => {
    const unfit = entries.filter((e) => /^no$/i.test(String(e?.fitForFoodHandling || "").trim())).length;
    return { total: entries.length, unfit };
  }, [entries]);

  /* ===== PDF (loaded on demand — keeps html2canvas/jsPDF out of the bundle) ===== */
  async function handleExportPDF() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("l", "pt", "a4"); // Landscape
      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(`AL MAWASHI — ${branchLabel}`, pageWidth / 2, 30, { align: "center" });

      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 20, 50, imgWidth, imgHeight);
      pdf.save(`POS11_Personal_Hygiene_${reportDate}.pdf`);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  }

  /* ===== delete ===== */
  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing report ID.");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Report deleted successfully.");
      await fetchAllDates();
      setRecord(null);
      const next = allDates.find((d) => d !== payload.reportDate) || "";
      setDate(next);
    } catch (e) {
      console.error(e);
      alert("⚠️ Failed to delete report.");
    } finally {
      setLoading(false);
    }
  }

  /* ===== export / import JSON — the open record only.
     Exporting every sheet at once belongs to the Excel Backup tab; doing it here
     meant holding the whole table in the page just to have the button. */
  function exportJSON() {
    if (!record) return;
    const blob = new Blob([JSON.stringify({ type: TYPE, payload }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `POS11_Personal_Hygiene_${payload.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const triggerImport = () => fileInputRef.current?.click();

  async function handleImportJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const json = JSON.parse(await file.text());
      const itemsRaw =
        Array.isArray(json) ? json :
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json?.data) ? json.data :
        json?.payload ? [json] : [];

      if (!itemsRaw.length) return alert("⚠️ ملف JSON لا يحتوي عناصر قابلة للاستيراد.");

      let ok = 0, fail = 0;
      for (const item of itemsRaw) {
        const p = item?.payload ?? item;
        if (!p || typeof p !== "object") { fail++; continue; }
        try {
          const res = await fetch(`${API_BASE}/api/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reporter: "pos11", type: TYPE, payload: { branch: BRANCH, ...p } }),
          });
          if (res.ok) ok++; else fail++;
        } catch { fail++; }
      }

      alert(`✅ Imported: ${ok} ${fail ? `| ❌ Failed: ${fail}` : ""}`);
      await fetchAllDates();
      if (date) await fetchRecord(date);
    } catch (err2) {
      console.error(err2);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = "";
    }
  }

  /* ===== styles ===== */
  const thCell = {
    border: "1px solid rgba(255,255,255,0.30)",
    padding: "9px 6px",
    textAlign: "center",
    fontWeight: 800,
    background: "transparent",
    color: "#fff",
    fontSize: "0.85rem",
  };
  const tdCell = { border: "1px solid #c7d2fe", padding: "7px 6px", textAlign: "center" };
  const tdHeader = { border: "1px solid #9aa4ae", padding: "5px 8px", background: "#f8fbff", fontSize: "0.85rem" };

  return (
    <GlassShell
      icon="🧼"
      title={`Personal Hygiene — ${BRANCH}`}
      actions={
        <>
          <button onClick={handleExportPDF} disabled={!record || exporting} style={btn(record && !exporting ? "#dc2626" : "#94a3b8")}>
            {exporting ? "Exporting…" : "⬇ PDF"}
          </button>
          <button onClick={exportJSON} disabled={!record} style={btn(record ? "#0f766e" : "#94a3b8")}>⬇ JSON</button>
          <button onClick={triggerImport} style={btn("#d97706")}>⬆ Import</button>
          <button onClick={() => { fetchAllDates(); if (date) fetchRecord(date); }} style={btn("#2563eb")}>↻ Refresh</button>
          {canDelete("daily") && record && (
            <button onClick={handleDelete} style={btn("#dc2626")} data-delete-action="true">🗑 Delete</button>
          )}
          <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportJSON} />
        </>
      }
    >
      <SidebarLayout
        sidebar={
          <DateTreeSidebar
            items={treeItems}
            activeKey={date}
            onPick={(it) => setDate(it.key)}
            loading={loading && !allDates.length}
          />
        }
      >
        {loading && <p>Loading…</p>}
        {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
        {!loading && !err && !record && <EmptyState text={date ? "No report for this date." : "Pick a date from the tree."} />}

        {record && (
          <div style={{ overflowX: "auto", overflowY: "hidden" }}>
            <div ref={reportRef} style={{ width: "100%", minWidth: 0, background: "#fff", padding: 14, borderRadius: 12 }}>
              {/* meta badges */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginBottom: 10, fontSize: 14.5 }}>
                {[
                  ["Branch", safe(payload.branch) || BRANCH],
                  ["Report Date", formatDMY(safe(payload.reportDate) || date)],
                  ["Employees", String(kpis.total)],
                  ["Not fit", String(kpis.unfit)],
                ].map(([k, v]) => (
                  <div key={k} style={{
                    background: "linear-gradient(135deg, rgba(237,233,254,0.6), rgba(224,242,254,0.5))",
                    border: "1px solid rgba(139,92,246,0.25)",
                    borderRadius: 10,
                    padding: "7px 12px",
                  }}>
                    <strong style={{ color: "#5b21b6" }}>{k}:</strong> {v || "—"}
                  </div>
                ))}
              </div>

              {/* AL MAWASHI document header (kept as-is so the PDF/Excel backups stay faithful) */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.75rem" }}>
                <tbody>
                  <tr>
                    <td style={tdHeader}><strong>Document Title:</strong> Personal Hygiene Check List</td>
                    <td style={tdHeader}><strong>Document No:</strong> FS-QM /REC/PH</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}><strong>Issue Date:</strong> 05/02/2020</td>
                    <td style={tdHeader}><strong>Revision No:</strong> 0</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}>
                      <strong>Area:</strong> QA &nbsp;&nbsp;<span style={{ fontWeight: 800 }}>{branchLabel}</span>
                    </td>
                    <td style={tdHeader}><strong>Date:</strong> {reportDate}</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}><strong>Controlling Officer:</strong> Quality Controller</td>
                    <td style={tdHeader}><strong>Approved By:</strong> Hussam.O.Sarhan</td>
                  </tr>
                </tbody>
              </table>

              <h3 style={{ textAlign: "center", background: "#e5e7eb", padding: "6px", marginBottom: "0.5rem" }}>
                {branchLabel}
                <br />
                PERSONAL HYGIENE CHECKLIST
              </h3>

              <div style={{
                marginBottom: 10, padding: 10, borderRadius: 10,
                border: "1px solid #cbd5e1", background: "#f8fafc",
                fontWeight: 800, color: "#065f46", textAlign: "center",
              }}>
                ✅ This report is electronically approved; no signature is required.
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 14px rgba(99,102,241,0.10)" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(90deg,#7c3aed 0%,#0ea5e9 55%,#10b981 100%)" }}>
                    <th style={{ ...thCell, width: "50px" }}>S.No</th>
                    <th style={{ ...thCell, width: "160px" }}>Employee Name</th>
                    {HYGIENE_COLUMNS.map((col, i) => (
                      <th key={i} style={{ ...thCell, width: "120px" }}>{col}</th>
                    ))}
                    <th style={{ ...thCell, width: "150px" }}>Fit for Food Handling?<br />(Yes/No)</th>
                    <th style={{ ...thCell, width: "140px" }}>If No: Communicable disease<br />(Yes/No)</th>
                    <th style={{ ...thCell, width: "140px" }}>If No: Open wound<br />(Yes/No)</th>
                    <th style={{ ...thCell, width: "170px" }}>If No: Other</th>
                    <th style={{ ...thCell, width: "260px" }}>Remarks and Corrective Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => {
                    const unfit = /^no$/i.test(String(entry?.fitForFoodHandling || "").trim());
                    return (
                      <tr key={i} style={{ background: unfit ? "#fef2f2" : "#fff" }}>
                        <td style={tdCell}>{i + 1}</td>
                        <td style={{ ...tdCell, textAlign: "start" }}>{entry?.name || "—"}</td>
                        {HYGIENE_COLUMNS.map((col, cIndex) => (
                          <td key={cIndex} style={tdCell}>{entry?.[col] || "—"}</td>
                        ))}
                        <td style={{ ...tdCell, fontWeight: 800, color: unfit ? "#b91c1c" : "#065f46" }}>
                          {entry?.fitForFoodHandling || "—"}
                        </td>
                        <td style={tdCell}>{entry?.reasonCommunicableDisease || "—"}</td>
                        <td style={tdCell}>{entry?.reasonOpenWound || "—"}</td>
                        <td style={tdCell}>{entry?.reasonOther || "—"}</td>
                        <td style={{ ...tdCell, textAlign: "start" }}>{entry?.remarks || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontWeight: 800, gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  Checked By (Branch Supervisor - PIC):{" "}
                  <SignatureName name={checkedBySupervisor} underline={false} inline />
                </div>
                <div>
                  Verified by (QA): <SignatureName name={verifiedByQA} underline={false} inline />
                </div>
              </div>

              <div style={{
                marginTop: 10, textAlign: "center", fontWeight: 900,
                color: "#065f46", borderTop: "1px dashed #94a3b8", paddingTop: 8,
              }}>
                ✅ This report is electronically approved; no signature is required.
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </GlassShell>
  );
}
