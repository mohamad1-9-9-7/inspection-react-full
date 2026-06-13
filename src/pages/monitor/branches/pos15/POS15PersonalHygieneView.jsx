// src/pages/monitor/branches/pos15/POS15PersonalHygieneView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import SignatureName from "../../../shared/SignatureName";
import API_BASE from "../../../../config/api";
import {
  btn,
  formatDMY,
  GlassShell,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "../_shared/branchViewKit";

const TYPE = "pos15_personal_hygiene";

const COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
  "Communicable Disease",
  "Open wounds/sores & cut",
];

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
function getKey(r) {
  if (!r) return "";
  if (r._id) return r._id;
  const n = normYMD(r.payload?.reportDate || r.createdAt);
  return n?.iso || "";
}

const gridStyle = { width: "100%", borderCollapse: "collapse", fontSize: 20, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 14px rgba(99,102,241,0.10)" };
const theadRow = { background: "linear-gradient(90deg,#7c3aed 0%,#0ea5e9 55%,#10b981 100%)" };
const thCell = { border: "1px solid rgba(255,255,255,0.30)", padding: "10px 8px", textAlign: "center", whiteSpace: "pre-line", fontWeight: 800, background: "transparent", color: "#fff" };
const tdCell = { border: "1px solid #c7d2fe", padding: "9px 7px", textAlign: "center", verticalAlign: "middle" };
const zebra = (i) => ({ background: i % 2 ? "rgba(237,233,254,0.45)" : "#fff" });

export default function POS15PersonalHygieneView() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const sheetRef = useRef(null);
  const fileRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
      arr.forEach((r) => (r.__dateStr = r.payload?.reportDate || r.createdAt || ""));
      arr.sort((a, b) => new Date(a.__dateStr || 0) - new Date(b.__dateStr || 0));
      setReports(arr);
      setSelected(arr[arr.length - 1] || null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const selectedKey = getKey(selected);

  const treeItems = useMemo(() => {
    const seen = new Map();
    for (const r of reports) {
      const k = getKey(r);
      if (!k || seen.has(k)) continue;
      const pick = r.payload?.reportDate || r.createdAt || "";
      const n = normYMD(pick);
      if (!n) continue;
      seen.set(k, { key: k, dateISO: n.iso, label: formatDMY(n.iso), data: r });
    }
    return Array.from(seen.values());
  }, [reports]);

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
    const html = `<html><head><meta charset="utf-8"/><title>POS 15 Personal Hygiene - ${titleDate}</title><style>${PRINT_CSS}</style></head><body>${sheetRef.current.outerHTML}</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 100);
  }

  function exportJSONAll() {
    const dump = { meta: { type: TYPE, exportedAt: new Date().toISOString(), count: reports.length }, items: reports.map((r) => ({ type: TYPE, payload: r.payload })) };
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
    const reportDateIso = normYMD(selected.payload?.reportDate || selected.createdAt)?.iso;
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
    const next = reports.filter((r) => getKey(r) !== selectedKey);
    setReports(next);
    setSelected(next[next.length - 1] || null);
    alert("تم الحذف بنجاح ✓");
  }

  return (
    <GlassShell
      icon="🧑‍🔬"
      title="Personal Hygiene Checklist — View (POS 15)"
      actions={
        <>
          <button onClick={load} style={btn("#7c3aed")}>Refresh</button>
          <button onClick={exportPDF} style={btn("#374151")} disabled={!selected}>Export PDF</button>
          <button onClick={exportJSONAll} style={btn("#0284c7")}>Export JSON (all)</button>
          <button onClick={triggerImport} style={btn("#059669")} disabled={importing}>
            {importing ? "Importing…" : "Import JSON"}
          </button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportFile} />
          <button onClick={handleDelete} style={btn("#dc2626")} disabled={!selected || loading} data-delete-action="true">Delete</button>
        </>
      }
    >
      <SidebarLayout
        sidebarWidth={300}
        sidebar={
          <DateTreeSidebar
            items={treeItems}
            activeKey={selectedKey}
            onPick={(it) => setSelected(it.data)}
            loading={loading && !reports.length}
          />
        }
      >
        {loading && <p>Loading…</p>}
        {!loading && !selected && <EmptyState text="No report selected" />}
        {selected && (
          <div style={{ overflowX: "auto" }}>
            <ReportSheet ref={sheetRef} data={selected.payload} />
          </div>
        )}
      </SidebarLayout>
    </GlassShell>
  );
}

const ReportSheet = React.forwardRef(function ReportSheet({ data }, ref) {
  const entries = data?.entries || [];
  const date = data?.reportDate || "—";
  const checkedBy = data?.checkedBy || "—";
  const verifiedBy = data?.verifiedBy || "—";

  const metaBadge = {
    display: "inline-block",
    background: "rgba(255,255,255,0.6)",
    border: "1px solid #c7d2fe",
    borderRadius: 10,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 700,
    color: "#0b1f4d",
    marginRight: 8,
    marginBottom: 6,
  };

  return (
    <div ref={ref}>
      <div style={{ padding: 6 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          <span style={metaBadge}><strong>Document Title:</strong> Personal Hygiene Check List</span>
          <span style={metaBadge}><strong>Document No:</strong> FS-QM/REC/PH</span>
          <span style={metaBadge}><strong>Issue Date:</strong> 05/02/2020</span>
          <span style={metaBadge}><strong>Revision No:</strong> 0</span>
          <span style={metaBadge}><strong>Area:</strong> POS 15</span>
          <span style={metaBadge}><strong>Issued By:</strong> MOHAMAD ABDULLAH QC</span>
          <span style={metaBadge}><strong>Controlling Officer:</strong> Quality Controller</span>
          <span style={metaBadge}><strong>Approved By:</strong> Hussam.O.Sarhan</span>
        </div>

        <div style={{
          textAlign: "center",
          background: "linear-gradient(90deg,#ede9fe,#e0f2fe,#d1fae5)",
          border: "1px solid #c7d2fe",
          borderRadius: 10,
          padding: "9px 6px",
          fontWeight: 800,
          fontSize: 16,
          color: "#0b1f4d",
          marginBottom: 10,
        }}>
          🧑‍🔬 PERSONAL HYGIENE CHECKLIST — POS 15
        </div>

        <div style={{ marginBottom: 8, fontWeight: 900 }}>Date: {date}</div>

        <div style={{ overflowX: "auto" }}>
          <table style={gridStyle}>
            <thead>
              <tr style={theadRow}>
                <th style={{ ...thCell, width: 70 }}>S.No</th>
                <th style={{ ...thCell, minWidth: 180 }}>Employee Name</th>
                {COLUMNS.map((c, i) => (<th key={i} style={{ ...thCell, minWidth: 140 }}>{c}</th>))}
                <th style={{ ...thCell, minWidth: 260 }}>Remarks and Corrective Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 3} style={{ ...tdCell, textAlign: "center", color: "#64748b", fontWeight: 800 }}>No entries</td>
                </tr>
              ) : entries.map((row, i) => (
                <tr key={i} style={zebra(i)}>
                  <td style={tdCell}>{i + 1}</td>
                  <td style={{ ...tdCell, textAlign: "left" }}>{row.name || ""}</td>
                  {COLUMNS.map((c, k) => (<td key={k} style={tdCell}>{row[c] || ""}</td>))}
                  <td style={{ ...tdCell, textAlign: "left" }}>{row.remarks || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, width: "100%" }}>
          <div style={{ textAlign: "left", flex: 1 }}>
            <SignatureName label="Checked By" name={checkedBy} align="start" />
          </div>
          <div style={{ textAlign: "right", flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <SignatureName label="Verified By" name={verifiedBy} align="end" />
          </div>
        </div>
        <div style={{ marginTop: 6, fontSize: ".9rem", fontWeight: 800 }}>
          *(C – Conform &nbsp;&nbsp; N/C – Non Conform)
        </div>
      </div>
    </div>
  );
});
