// src/pages/monitor/branches/pos15/POS15TemperatureView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import SignatureName from "../../../shared/SignatureName";
import API_BASE from "../../../../config/api";
import TemperatureMatchingReport from "../_shared/TemperatureMatchingReport";
import {
  btn,
  formatDMY,
  GlassShell,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "../_shared/branchViewKit";

const TYPE = "pos15_temperature";

const GRID_TIMES = ["8:00 AM", "11:00 AM", "2:00 PM", "5:00 PM", "8:00 PM", "10:00 PM"];
const isFreezer = (name = "") => /^freezer/i.test(String(name).trim());

function calculateKPI(coolers = []) {
  const all = [];
  let out = 0;
  for (const c of coolers) {
    if (isFreezer(c.name)) continue;
    for (const [key, v] of Object.entries(c.temps || {})) {
      if (key === "Corrective Action") continue;
      const n = Number(v);
      if (v !== "" && !isNaN(n)) {
        all.push(n);
        if (n < 0 || n > 5) out++;
      }
    }
  }
  const avg = all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(2) : "—";
  const min = all.length ? Math.min(...all) : "—";
  const max = all.length ? Math.max(...all) : "—";
  return { avg, min, max, out };
}

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
  const pick = r.payload?.date || r.payload?.reportDate || r.createdAt;
  const n = normYMD(pick);
  return n?.iso || "";
}

export default function POS15TemperatureView() {
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
      arr.forEach((r) => (r.__dateStr = r.payload?.date || r.payload?.reportDate || r.createdAt || ""));
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
      const pick = r.payload?.date || r.payload?.reportDate || r.createdAt || "";
      const n = normYMD(pick);
      if (!n) continue;
      seen.set(k, { key: k, dateISO: n.iso, label: formatDMY(n.iso), data: r });
    }
    return Array.from(seen.values());
  }, [reports]);

  const kpi = useMemo(() => calculateKPI(selected?.payload?.coolers), [selected]);

  function exportPDF() {
    if (!sheetRef.current || !selected) return;
    const titleDate = selected?.payload?.date || selected?.payload?.reportDate || "";
    const PRINT_CSS = `
      @page { size: A4 landscape; margin: 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin:0; font-family: Inter, Arial, sans-serif; color:#0f172a; }
      table { border-collapse: collapse; width:100%; }
      th, td { border:1.5px solid #94a3b8; padding:8px; font-size:12px; }
      thead th { background:#e2e8f0; font-weight:900; }
      tbody tr:nth-child(2n) td { background:#f8fafc; }
    `;
    const html = `<html><head><meta charset="utf-8"/><title>POS 15 Temperature - ${titleDate}</title><style>${PRINT_CSS}</style></head><body>${sheetRef.current.outerHTML}</body></html>`;
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
      if (!Array.isArray(items) || items.length === 0) { alert("The file has no valid items."); return; }
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
      alert(`Imported: ${ok} succeeded / ${fail} failed`);
    } catch (err) {
      alert("Invalid JSON file: " + (err?.message || String(err)));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function handleDelete() {
    if (!selected) return;
    const rid = selected?._id || selected?.id;
    if (!rid) return alert("⚠️ Missing report ID.");
    if (!window.confirm("Delete this report permanently?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = reports.filter((r) => getKey(r) !== selectedKey);
      setReports(next);
      setSelected(next[next.length - 1] || null);
      alert("Deleted successfully ✓");
    } catch (e) {
      alert("Failed to delete: " + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassShell
      icon="🌡️"
      title="Temperature Control Record — View (POS 15)"
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
            <ReportSheet ref={sheetRef} data={selected.payload} kpi={kpi} />
          </div>
        )}
      </SidebarLayout>
    </GlassShell>
  );
}

const ReportSheet = React.forwardRef(function ReportSheet({ data, kpi }, ref) {
  const coolers = data?.coolers || [];
  const date = data?.date || data?.reportDate || "—";
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
          <span style={metaBadge}><strong>Document Title:</strong> Temperature Control Record</span>
          <span style={metaBadge}><strong>Document No:</strong> FS-QM/REC/TMP</span>
          <span style={metaBadge}><strong>Issue Date:</strong> 05/02/2020</span>
          <span style={metaBadge}><strong>Revision No:</strong> 0</span>
          <span style={metaBadge}><strong>Area:</strong> POS 15</span>
          <span style={metaBadge}><strong>Issued By:</strong> MOHAMAD ABDULLAH</span>
          <span style={metaBadge}><strong>Approved By:</strong> Hussam O. Sarhan</span>
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
          🌡️ TEMPERATURE CONTROL CHECKLIST (CCP) — POS 15
        </div>

        <div style={{ marginBottom: 8, fontWeight: 900 }}>Date: {date}</div>

        {/* Temperatures + integrated product matching */}
        <TemperatureMatchingReport
          units={coolers}
          times={GRID_TIMES}
          productVerifications={data?.productVerifications || []}
          readOnly
        />

        {kpi && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(237,233,254,0.45)", border: "1px solid #c7d2fe", borderRadius: 10, fontWeight: 700, fontSize: 13, color: "#0b1f4d" }}>
            KPI (Coolers only) — Avg: {kpi.avg}°C | Min: {kpi.min}°C | Max: {kpi.max}°C | Out-of-range: {kpi.out}
          </div>
        )}

        <div style={{ marginTop: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, width: "100%" }}>
          <div style={{ flex: 1 }}>
            <SignatureName label="Checked By" name={checkedBy} align="start" />
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <SignatureName label="Verified By" name={verifiedBy} align="end" />
          </div>
        </div>
      </div>
    </div>
  );
});
