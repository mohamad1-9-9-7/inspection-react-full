// src/pages/monitor/branches/POS 11/POS11DailyCleaningView.jsx
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

const TYPE = "pos11_daily_cleanliness";
const BRANCH = "POS 11";

export default function POS11DailyCleaningView() {
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  }, []);

  const [date, setDate] = useState("");      // empty = nothing open until a date is picked
  const [allDates, setAllDates] = useState([]);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [exporting, setExporting] = useState(false);

  const payload = record?.payload || {};
  const entries = Array.isArray(payload.entries) ? payload.entries : [];

  const askPass = (label = "") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  /* ===== date tree =====
     A metadata-only index (?lite=1) — dates without payloads. This page used to
     download every record of the type, payload and all, on mount; that is what
     froze the screen once the branch had a year of sheets. The full record is
     now fetched only for the day the user opens. */
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
    const checks = entries.filter((e) => !e?.isSection);
    const c = checks.filter((e) => String(e?.status || "").toUpperCase() === "C").length;
    const nc = checks.filter((e) => String(e?.status || "").toUpperCase() === "NC").length;
    return { total: checks.length, c, nc };
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
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      let imgWidth = pageWidth - 40;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      if (imgHeight > pageHeight - 40) {
        imgHeight = pageHeight - 40;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      pdf.addImage(imgData, "PNG", (pageWidth - imgWidth) / 2, 20, imgWidth, imgHeight);
      pdf.save(`POS11_Cleanliness_${payload.reportDate || date || "report"}.pdf`);
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
    if (!window.confirm("⚠️ Delete this report?")) return;

    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing report ID.");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Report deleted.");
      await fetchAllDates();
      setRecord(null);
      const next = allDates.find((d) => d !== payload.reportDate) || "";
      setDate(next);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to delete.");
    } finally {
      setLoading(false);
    }
  }

  /* ===== export / import JSON — the open record only.
     Exporting every sheet of the type is what the Excel Backup tab is for; doing
     it here meant loading the whole table into the page just to have the button. */
  function exportJSON() {
    if (!record) return;
    const blob = new Blob([JSON.stringify({ type: TYPE, payload }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `POS11_Cleanliness_${payload.reportDate || date}.json`;
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
    padding: "10px 8px",
    textAlign: "center",
    fontWeight: 800,
    background: "transparent",
    color: "#fff",
  };
  const tdCell = { border: "1px solid #c7d2fe", padding: "8px 7px", verticalAlign: "middle" };
  const tdHeader = { border: "1px solid #9aa4ae", padding: "6px 8px", background: "#f8fbff", fontSize: "0.9rem" };

  return (
    <GlassShell
      icon="🧹"
      title={`Cleaning Checklist — ${BRANCH}`}
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
                  ["Checks", String(kpis.total)],
                  ["C / NC", `${kpis.c} / ${kpis.nc}`],
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
              <div style={{ textAlign: "right", marginBottom: "0.75rem" }}>
                <h2 style={{ margin: 0, color: "darkred" }}>AL MAWASHI</h2>
                <div style={{ fontSize: "0.95rem", color: "#333" }}>Trans Emirates Livestock Trading L.L.C.</div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
                <tbody>
                  <tr>
                    <td style={tdHeader}><b>Document Title:</b> Cleaning Checklist</td>
                    <td style={tdHeader}><b>Document No:</b> FF-QM/REC/CC</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
                    <td style={tdHeader}><b>Revision No:</b> 0</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}><b>Area:</b> {BRANCH}</td>
                    <td style={tdHeader}><b>Issued By:</b> MOHAMAD ABDULLAH</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}><b>Controlling Officer:</b> Quality Controller</td>
                    <td style={tdHeader}><b>Approved By:</b> Hussam O.Sarhan</td>
                  </tr>
                </tbody>
              </table>

              <h3 style={{ textAlign: "center", background: "#e5e7eb", padding: "6px", marginBottom: "1rem" }}>
                TRANS EMIRATES LIVESTOCK (AL AIN BUTCHERY) <br />
                CLEANING CHECKLIST – {BRANCH}
              </h3>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 14px rgba(99,102,241,0.10)" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(90deg,#7c3aed 0%,#0ea5e9 55%,#10b981 100%)" }}>
                    <th style={{ ...thCell, width: 60 }}>Sl-No</th>
                    <th style={thCell}>General Cleaning</th>
                    <th style={{ ...thCell, width: 90 }}>C / NC</th>
                    <th style={thCell}>Observation</th>
                    <th style={thCell}>Informed To</th>
                    <th style={thCell}>Remarks &amp; CA</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => {
                    const nc = !entry.isSection && String(entry.status || "").toUpperCase() === "NC";
                    return (
                      <tr key={i} style={{ background: entry.isSection ? "#eef2ff" : nc ? "#fef2f2" : "#fff" }}>
                        <td style={{ ...tdCell, textAlign: "center" }}>{entry.isSection ? entry.secNo : entry.subLetter}</td>
                        <td style={{ ...tdCell, fontWeight: entry.isSection ? 700 : 400 }}>{entry.section || entry.item}</td>
                        <td style={{ ...tdCell, textAlign: "center", fontWeight: 800, color: nc ? "#b91c1c" : "#065f46" }}>
                          {entry.isSection ? "—" : entry.status || ""}
                        </td>
                        <td style={tdCell}>{entry.isSection ? "—" : entry.observation || ""}</td>
                        <td style={tdCell}>{entry.isSection ? "—" : entry.informed || ""}</td>
                        <td style={tdCell}>{entry.isSection ? "—" : entry.remarks || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", fontWeight: 600, padding: "0 1rem", gap: 16, flexWrap: "wrap" }}>
                <SignatureName label="Checked By" name={payload.checkedBy} align="start" />
                <SignatureName label="Verified By" name={payload.verifiedBy} align="end" />
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </GlassShell>
  );
}
