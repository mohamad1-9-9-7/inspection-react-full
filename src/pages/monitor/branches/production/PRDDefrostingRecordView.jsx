// src/pages/monitor/branches/production/PRDDefrostingRecordView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import SignatureName from "../../../shared/SignatureName";
import API_BASE from "../../../../config/api";
import {
  btn,
  formatDMY,
  GlassShell,
  DateTreeSidebar,
  GLASS,
  EmptyState,
} from "../_shared/branchViewKit";

const TYPE = "prod_defrosting_record";

/* ===================== Helpers ===================== */
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
  const h = r.payload?.header || {};
  const n = normYMD(h.reportDate || h.month || h.issueDate || r.createdAt);
  const doc = String(h.documentNo || "");
  return `${n?.iso || "NA"}|${doc}`;
}

function groupByYMD(arr) {
  const years = {};
  arr.forEach((r) => {
    const h = r.payload?.header || {};
    const pick = h.reportDate || h.month || h.issueDate || r.createdAt || "";
    const n = normYMD(pick);
    if (!n) return;
    const itemsCount = (r.payload?.entries || []).length || 0;

    years[n.y] ||= {};
    years[n.y][n.m] ||= {};
    years[n.y][n.m][n.d] ||= { list: [], items: 0 };
    years[n.y][n.m][n.d].list.push(r);
    years[n.y][n.m][n.d].items += itemsCount;
  });
  return { years };
}

/* ===================== Main ===================== */
export default function PRDDefrostingRecordView() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const sheetRef = useRef(null);
  const fileRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `${String(API_BASE).replace(/\/$/, "")}/api/reports?type=${TYPE}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];

      arr.forEach((r) => {
        const h = r.payload?.header || {};
        r.__dateStr = h.reportDate || h.month || h.issueDate || r.createdAt || "";
      });

      // قديم → جديد (السايدبار)
      arr.sort((a, b) => new Date(a.__dateStr || 0) - new Date(b.__dateStr || 0));

      setReports(arr);
      setSelected(arr[arr.length - 1] || null); // الأحدث افتراضياً
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => groupByYMD(reports), [reports]);
  const selectedKey = getKey(selected);

  /* Build treeItems for DateTreeSidebar */
  const treeItems = useMemo(() => {
    const seen = new Map();
    for (const r of reports) {
      const k = getKey(r);
      if (!k || seen.has(k)) continue;
      const h = r.payload?.header || {};
      const pick = h.reportDate || h.month || h.issueDate || r.createdAt || "";
      const n = normYMD(pick);
      if (!n) continue;
      seen.set(k, { key: k, dateISO: n.iso, label: formatDMY(n.iso), data: r });
    }
    return Array.from(seen.values()).sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  }, [reports]);

  /* ============ Export PDF (التقرير فقط) ============ */
  function exportPDF() {
    if (!sheetRef.current || !selected) return;
    const h = selected?.payload?.header || {};
    const titleDate = h.reportDate || h.month || h.issueDate || "";
    const PRINT_CSS = `
      @page { size: A4 landscape; margin: 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0; font-family: Inter, Arial, sans-serif; color:#0f172a; }
      table{ border-collapse:collapse; width:100%; }
      th, td{ border:1.5px solid #94a3b8; padding:10px 8px; font-size:13px; }
      thead th{ background:#e2e8f0; font-weight:900; }
      .paper { background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
      .hdr td{ font-weight:800; }
    `;
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Defrosting Report - ${titleDate}</title>
          <style>${PRINT_CSS}</style>
        </head>
        <body>${sheetRef.current.outerHTML}</body>
      </html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 100);
  }

  /* ============ NEW: Export/Import JSON (all) ============ */
  function exportJSONAll() {
    const dump = {
      meta: { type: TYPE, exportedAt: new Date().toISOString(), count: reports.length },
      items: reports.map((r) => ({
        type: TYPE,
        reporter: r.reporter || "production",
        payload: r.payload,
      })),
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${TYPE}-all-${new Date().toISOString().slice(0,19).replace(/[-:T]/g,"")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function triggerImport() {
    fileRef.current?.click();
  }
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      const items =
        Array.isArray(parsed) ? parsed :
        parsed.items ?? parsed.data ?? parsed.reports ?? [];
      if (!Array.isArray(items) || items.length === 0) {
        alert("الملف لا يحتوي عناصر صالحة.");
        return;
      }
      const base = String(API_BASE).replace(/\/$/, "");
      let ok = 0, fail = 0;
      for (const raw of items) {
        const payload = raw?.payload ?? raw;
        const reporter = raw?.reporter ?? "production";
        const type = raw?.type ?? TYPE;
        try {
          const res = await fetch(`${base}/api/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reporter, type, payload }),
          });
          if (res.ok) ok++; else fail++;
        } catch {
          fail++;
        }
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

  /* ============ Delete (type + reportDate فقط) ============ */
  async function handleDelete() {
    if (!selected) return;

    const h = selected.payload?.header || {};
    const n = normYMD(h.reportDate || h.issueDate || h.month || selected.createdAt);
    const iso = n?.iso;

    if (!iso) {
      alert("لا يوجد reportDate صالح للحذف.");
      return;
    }
    if (!window.confirm("هل تريد حذف هذا التقرير نهائيًا؟")) return;

    setLoading(true);
    let ok = false;
    let lastErr = "";

    const base = String(API_BASE).replace(/\/$/, "");
    const tries = [
      { method: "DELETE", url: `${base}/api/reports?type=${encodeURIComponent(TYPE)}&reportDate=${encodeURIComponent(iso)}` },
      { method: "DELETE", url: `${base}/api/reports/${TYPE}?reportDate=${encodeURIComponent(iso)}` },
      { method: "POST",   url: `${base}/api/reports/delete`, body: JSON.stringify({ type: TYPE, reportDate: iso }) },
    ];

    for (const t of tries) {
      try {
        const res = await fetch(t.url, {
          method: t.method,
          headers: t.body ? { "Content-Type": "application/json" } : undefined,
          body: t.body,
        });
        if (res.ok) { ok = true; break; }
        lastErr = `HTTP ${res.status} ${await res.text().catch(() => "")}`;
      } catch (e) {
        lastErr = e?.message || String(e);
      }
    }

    if (!ok) {
      setLoading(false);
      alert("تعذّر الحذف من الخادم. الرجاء التأكد أن reportDate محفوظ بصيغة يوم/شهر/سنة.\n\n" + lastErr);
      return;
    }

    const nextLocal = reports.filter((r) => getKey(r) !== selectedKey);
    setReports(nextLocal);
    setSelected(nextLocal[nextLocal.length - 1] || null);
    await load();

    setLoading(false);
    alert("تم الحذف بنجاح ✓");
  }

  /* ===================== UI ===================== */
  return (
    <GlassShell
      icon="🧊"
      title="Defrosting Record — View (PRODUCTION)"
      actions={
        <>
          <button onClick={load} style={btn("#7c3aed")}>⟳ Refresh</button>
          <button onClick={exportPDF} style={btn("#374151")} disabled={!selected}>⬇️ Export PDF</button>
          <button onClick={exportJSONAll} style={btn("#0284c7")}>⇩ Export JSON</button>
          <button onClick={triggerImport} style={btn("#059669")} disabled={importing}>
            {importing ? "Importing…" : "⇧ Import JSON"}
          </button>
          <button onClick={handleDelete} style={btn("#dc2626")} disabled={!selected || loading} data-delete-action="true">🗑️ Delete</button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display:"none" }} onChange={handleImportFile} />
        </>
      }
    >
      {/* تخطيط: محتوى يسار + شجرة التواريخ يمين */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:14, alignItems:"start" }}>

        {/* المحتوى الرئيسي */}
        <div style={{ ...GLASS.content, minWidth:0 }}>
          {loading && <p style={{ color:"#7c3aed", fontWeight:700 }}>Loading…</p>}
          {!loading && !selected && <EmptyState text="No report selected." />}
          {selected && <ReportSheet ref={sheetRef} report={selected} />}
        </div>

        {/* شجرة التواريخ — يمين */}
        <DateTreeSidebar
          items={treeItems}
          activeKey={selectedKey}
          onPick={(it) => setSelected(it.data)}
          loading={loading && !reports.length}
          maxHeight="calc(100vh - 160px)"
        />
      </div>

      <style>{`
        .tbl {
          width: 100%;
          border-collapse: collapse;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 14px rgba(99,102,241,0.10);
        }
        .tbl thead tr {
          background: linear-gradient(90deg,#7c3aed 0%,#0ea5e9 55%,#10b981 100%);
        }
        .tbl thead th {
          border: 1px solid rgba(255,255,255,0.30);
          padding: 11px 9px;
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: .03em;
          color: #fff;
          font-weight: 900;
          background: transparent;
        }
        .tbl td {
          border: 1px solid #c7d2fe;
          padding: 11px 9px;
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          background: #fff;
        }
        .tbl tbody tr:nth-child(2n) td { background: rgba(237,233,254,0.18); }

        .hdrTable { width:100%; border-collapse:collapse; margin-bottom:12px; }
        .hdrTable td {
          border:1px solid #c7d2fe;
          padding:9px 12px;
          font-size:15px;
          font-weight:700;
          background: linear-gradient(135deg,rgba(237,233,254,0.4),rgba(224,242,254,0.3));
          color:#1e293b;
        }
        .hdrTable tr:nth-child(odd) td { background:rgba(237,233,254,0.25); }
      `}</style>
    </GlassShell>
  );
}


/* ===================== Sheet ===================== */
const ReportSheet = React.forwardRef(function ReportSheet({ report }, ref) {
  const h = report?.payload?.header || {};
  const entries = report?.payload?.entries || [];
  const sig = report?.payload?.signatures || {};
  return (
    <div ref={ref} className="paper">
      {/* Header */}
      <table className="hdrTable">
        <tbody>
          <tr>
            <td><strong>Document Title:</strong> {h.documentTitle || "Defrosting Report"}</td>
            <td><strong>Document No:</strong> {h.documentNo || "—"}</td>
          </tr>
          <tr>
            <td><strong>Issue Date:</strong> {h.issueDate || "—"}</td>
            <td><strong>Revision No:</strong> {h.revisionNo || "—"}</td>
          </tr>
          <tr>
            <td><strong>Area:</strong> {h.area || "—"}</td>
            <td><strong>Issued By:</strong> {h.issuedBy || "—"}</td>
          </tr>
          <tr>
            <td><strong>Controlling Officer:</strong> {h.coveringOfficer || "—"}</td>
            <td><strong>Approved By:</strong> {h.approvedBy || "—"}</td>
          </tr>
          <tr>
            <td colSpan={2}>
              <strong>Date:</strong> {h.reportDate || h.month || "—"} &nbsp;&nbsp; | &nbsp;&nbsp; TRANS EMIRATES LIVESTOCK TRADING LLC
            </td>
          </tr>
        </tbody>
      </table>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>RAW MATERIAL</th>
              <th>QUANTITY</th>
              <th>BRAND</th>
              <th>RM PRODN DATE</th>
              <th>RM EXP DATE</th>
              <th>DEFROST START DATE</th>
              <th>START TIME</th>
              <th>DFRST START TEMP</th>
              <th>DEFROST END DATE</th>
              <th>END TIME</th>
              <th>END TEMP</th>
              <th>DEFROST TEMP (&gt; 5ºC)</th>
              <th>REMARKS</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={13} style={{ textAlign: "center", color: "#64748b", fontWeight: 800 }}>No entries</td></tr>
            ) : (
              entries.map((r, i) => (
                <tr key={i}>
                  <td>{r.rawMaterial || ""}</td>
                  <td>{r.quantity || ""}</td>
                  <td>{r.brand || ""}</td>
                  <td>{r.rmProdDate || ""}</td>
                  <td>{r.rmExpDate || ""}</td>
                  <td>{r.defStartDate || ""}</td>
                  <td>{r.defStartTime || ""}</td>
                  <td>{r.startTemp || ""}</td>
                  <td>{r.defEndDate || ""}</td>
                  <td>{r.defEndTime || ""}</td>
                  <td>{r.endTemp || ""}</td>
                  <td>{r.defrostTemp || ""}</td>
                  <td style={{ textAlign: "left" }}>{r.remarks || ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <div style={sigBox}><strong>Checked By</strong><span style={sigLine}><SignatureName name={sig.checkedBy} underline={false} /></span></div>
        <div style={sigBox}><strong>Verified By</strong><span style={sigLine}><SignatureName name={sig.verifiedBy} underline={false} /></span></div>
      </div>
    </div>
  );
});


const sigBox = {
  border: "1px solid #c7d2fe",
  borderRadius: 10,
  background: "linear-gradient(135deg,rgba(237,233,254,0.4),rgba(224,242,254,0.3))",
  padding: "10px 14px",
  display: "flex",
  alignItems: "flex-end",
  gap: 10,
  fontWeight: 800,
  fontSize: 14,
};
const sigLine = {
  borderBottom: "2px solid #7c3aed",
  flex: 1,
  paddingBottom: 2,
  fontWeight: 700,
};
