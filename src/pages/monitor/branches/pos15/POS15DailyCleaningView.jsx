// src/pages/monitor/branches/pos15/POS15DailyCleaningView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import { canDelete, canWrite } from "../../../../utils/perms";
import {
  formatDMY,
  IsoShell,
  ISO_UI,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "../_shared/branchViewKit";
import {
  listReportDates,
  listReports,
  getReportById,
  getReportRowByDate,
  reportId,
  reportDateOf,
  payloadOf,
} from "../_shared/reportApi";

const TYPE = "pos15_daily_cleanliness";

function normYMD(dateStr) {
  const s = String(dateStr || "").trim();
  if (!s) return null;
  const iso = /^\d{4}-\d{2}$/.test(s) ? `${s}-01` : s;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { y, m, d: dd, iso: `${y}-${m}-${dd}` };
}
const gridStyle = { width: "100%", borderCollapse: "collapse", fontSize: 14, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 14px rgba(2,132,199,0.10)" };
const theadRow = { background: "#0ea5e9" };
const thCell = { border: "1px solid rgba(255,255,255,0.30)", padding: "10px 8px", textAlign: "center", whiteSpace: "pre-line", fontWeight: 800, background: "transparent", color: "#fff" };
const tdCell = { border: "1px solid #e2e8f0", padding: "9px 7px", textAlign: "center", verticalAlign: "middle" };
const zebra = (i) => ({ background: i % 2 ? "#f0f9ff" : "#fff" });

export default function POS15DailyCleaningView() {
  // `index` holds lightweight rows (id + reportDate, no payload); the full
  // report for the open date is fetched on demand into `selected`.
  const [index, setIndex] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [importing, setImporting] = useState(false);
  const sheetRef = useRef(null);
  const fileRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const rows = await listReportDates(TYPE);
      rows.sort((a, b) => String(reportDateOf(a)).localeCompare(String(reportDateOf(b))));
      setIndex(rows);
      const newest = rows[rows.length - 1] || null;
      if (newest) openRow(newest);
      else setSelected(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // Pull one full record (by id, falling back to a date-targeted read).
  async function openRow(row) {
    setLoadingReport(true);
    try {
      const id = reportId(row);
      let full = id ? await getReportById(id) : null;
      if (!full) full = await getReportRowByDate(TYPE, reportDateOf(row));
      setSelected(full);
    } finally {
      setLoadingReport(false);
    }
  }

  const selectedKey = selected
    ? reportId(selected) || normYMD(reportDateOf(selected))?.iso || ""
    : "";

  const treeItems = useMemo(() => {
    // One entry per date; when a date has duplicates the newest id wins.
    const byDate = new Map();
    for (const r of index) {
      const n = normYMD(reportDateOf(r));
      if (!n) continue;
      const prev = byDate.get(n.iso);
      if (!prev || Number(reportId(r)) > Number(reportId(prev))) byDate.set(n.iso, r);
    }
    return Array.from(byDate.entries())
      .map(([iso, r]) => ({ key: reportId(r) || iso, dateISO: iso, label: formatDMY(iso), data: r }))
      .sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
  }, [index]);

  function exportPDF() {
    if (!sheetRef.current || !selected) return;
    const titleDate = selected?.payload?.reportDate || "";
    const PRINT_CSS = `
      @page { size: A4 landscape; margin: 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin:0; font-family: Inter, Arial, sans-serif; color:#0f172a; }
      table { border-collapse: collapse; width:100%; }
      th, td { border:1.5px solid #94a3b8; padding:8px; font-size:12px; }
      thead th { background:#e2e8f0; font-weight:900; }
      tbody tr:nth-child(2n) td { background:#f8fafc; }
    `;
    const html = `<html><head><meta charset="utf-8"/><title>POS 15 Cleaning - ${titleDate}</title><style>${PRINT_CSS}</style></head><body>${sheetRef.current.outerHTML}</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 100);
  }

  async function exportJSONAll() {
    const rows = await listReports(TYPE);
    const dump = { meta: { type: TYPE, exportedAt: new Date().toISOString(), count: rows.length }, items: rows.map((r) => ({ type: TYPE, payload: payloadOf(r) })) };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${TYPE}-all-${new Date().toISOString().slice(0,19).replace(/[-:T]/g,"")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function triggerImport() { fileRef.current?.click(); }
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : parsed.items ?? parsed.data ?? parsed.reports ?? [];
      if (!Array.isArray(items) || items.length === 0) { alert("الملف لا يحتوي عناصر صالحة."); return; }
      let ok = 0, fail = 0;
      for (const raw of items) {
        const payload = raw?.payload ?? raw;
        const type = raw?.type ?? TYPE;
        try {
          const res = await fetch(`${API_BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, payload }) });
          if (res.ok) ok++; else fail++;
        } catch { fail++; }
      }
      await load();
      alert(`تم الاستيراد: ${ok} ناجحة / ${fail} فاشلة`);
    } catch (err) {
      alert("ملف JSON غير صالح: " + (err?.message || String(err)));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function handleDelete() {
    if (!selected) return;
    const reportDateIso = normYMD(reportDateOf(selected))?.iso;
    if (!reportDateIso) return alert("لا يوجد تاريخ صالح للحذف.");
    if (!window.confirm("هل تريد حذف هذا التقرير نهائيًا؟")) return;
    setLoading(true);
    let ok = false, errText = "";
    const tries = [
      { url: `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&reportDate=${encodeURIComponent(reportDateIso)}`, method: "DELETE" },
      { url: `${API_BASE}/api/reports/delete`, method: "POST", body: JSON.stringify({ type: TYPE, reportDate: reportDateIso }) },
    ];
    for (const t of tries) {
      try {
        const res = await fetch(t.url, { method: t.method, headers: t.body ? { "Content-Type": "application/json" } : undefined, body: t.body });
        if (res.ok) { ok = true; break; }
        errText = `HTTP ${res.status}`;
      } catch (e) { errText = e.message || String(e); }
    }
    setLoading(false);
    if (!ok) return alert("تعذّر الحذف: " + (errText || "Unknown error"));
    const nextIndex = index.filter((r) => normYMD(reportDateOf(r))?.iso !== reportDateIso);
    setIndex(nextIndex);
    const newest = nextIndex[nextIndex.length - 1] || null;
    if (newest) await openRow(newest); else setSelected(null);
    alert("تم الحذف بنجاح ✓");
  }

  return (
    <IsoShell
      icon="🧹"
      title="Daily Cleaning Checklist — POS 15"
      subtitle="View, export and manage daily cleaning records"
      actions={
        <>
          <button onClick={load} style={ISO_UI.btn("violet")}>Refresh</button>
          <button onClick={exportPDF} style={ISO_UI.btn("secondary", !selected)} disabled={!selected}>Export PDF</button>
          <button onClick={exportJSONAll} style={ISO_UI.btn("secondary")}>Export JSON (all)</button>
          {canWrite("daily") && (
            <button onClick={triggerImport} style={ISO_UI.btn("success", importing)} disabled={importing}>
              {importing ? "Importing…" : "Import JSON"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportFile} />
          {canDelete("daily") && <button onClick={handleDelete} style={ISO_UI.btn("danger", !selected || loading)} disabled={!selected || loading} data-delete-action="true">Delete</button>}
        </>
      }
    >
      <SidebarLayout
        sidebarWidth={300}
        sidebar={
          <DateTreeSidebar
            items={treeItems}
            activeKey={selectedKey}
            onPick={(it) => openRow(it.data)}
            loading={loading && !index.length}
          />
        }
      >
        {(loading || loadingReport) && <p>Loading…</p>}
        {!loading && !loadingReport && !selected && <EmptyState text="No report selected" />}
        {!loadingReport && selected && (
          <div style={{ overflowX: "auto" }}>
            <ReportSheet ref={sheetRef} data={payloadOf(selected)} />
          </div>
        )}
      </SidebarLayout>
    </IsoShell>
  );
}

const ReportSheet = React.forwardRef(function ReportSheet({ data }, ref) {
  const rows = data?.entries || [];

  const metaBadge = ISO_UI.metaBadge;

  return (
    <div ref={ref}>
      <div style={{ padding: 6 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          <span style={metaBadge}><strong>Document Title:</strong> Cleaning Checklist</span>
          <span style={metaBadge}><strong>Document No:</strong> FF-QM/REC/CC</span>
          <span style={metaBadge}><strong>Issue Date:</strong> 05/02/2020</span>
          <span style={metaBadge}><strong>Revision No:</strong> 0</span>
          <span style={metaBadge}><strong>Area:</strong> POS 15</span>
          <span style={metaBadge}><strong>Issued By:</strong> MOHAMAD ABDULLAH</span>
          <span style={metaBadge}><strong>Controlling Officer:</strong> Quality Controller</span>
          <span style={metaBadge}><strong>Approved By:</strong> Hussam O.Sarhan</span>
        </div>

        <div style={ISO_UI.band}>
          🧹 CLEANING CHECKLIST — POS 15
        </div>

        <div style={{ marginBottom: 8, fontWeight: 900 }}>Date: {data?.reportDate || "—"}</div>

        <div style={{ overflowX: "auto" }}>
          <table style={gridStyle}>
            <thead>
              <tr style={theadRow}>
                <th style={{ ...thCell, width: 70 }}>Sl-No</th>
                <th style={{ ...thCell, minWidth: 320 }}>General Cleaning</th>
                <th style={{ ...thCell, width: 90 }}>C / NC</th>
                <th style={{ ...thCell, minWidth: 180 }}>Observation</th>
                <th style={{ ...thCell, minWidth: 160 }}>Informed To</th>
                <th style={{ ...thCell, minWidth: 220 }}>Remarks &amp; CA</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} style={{ ...tdCell, textAlign: "center", color: "#64748b", fontWeight: 800 }}>No entries</td></tr>
              ) : rows.map((r, i) => r.isSection ? (
                <tr key={"sec-"+i} style={{ background: "#e0f2fe", fontWeight: 800 }}>
                  <td style={tdCell}>{r.secNo}</td>
                  <td style={tdCell}>{r.section}</td>
                  <td colSpan={4} style={{ ...tdCell, textAlign: "center" }}>—</td>
                </tr>
              ) : (
                <tr key={i} style={zebra(i)}>
                  <td style={tdCell}>{r.subLetter || "—"}</td>
                  <td style={{ ...tdCell, textAlign: "left" }}>{r.item || ""}</td>
                  <td style={tdCell}>{r.status || ""}</td>
                  <td style={{ ...tdCell, textAlign: "left" }}>{r.observation || ""}</td>
                  <td style={{ ...tdCell, textAlign: "left" }}>{r.informed || ""}</td>
                  <td style={{ ...tdCell, textAlign: "left" }}>{r.remarks || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>CHECKED BY: {data?.checkedBy || "—"}</div>
          <div>VERIFIED BY: {data?.verifiedBy || "—"}</div>
        </div>
        <div style={{ marginTop: 6, fontSize: ".9rem", fontWeight: 800 }}>
          Remark: Frequency — Daily &nbsp;&nbsp; (C = Conform, N/C = Non Conform)
        </div>
      </div>
    </div>
  );
});
