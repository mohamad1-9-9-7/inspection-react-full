// src/pages/monitor/branches/production/PRDDefrostingRecordView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "https://inspection-server-4nvj.onrender.com";

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
    <div style={styles.page}>
      {/* شريط علوي */}
      <div style={styles.topBar}>
        <div style={{ fontWeight: 900, color: "#fff" }}>
          Defrosting details {selected ? `(${selected?.payload?.header?.reportDate || selected?.payload?.header?.month || ""})` : ""}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={btnBlue}>⟳ Refresh</button>
          <button onClick={exportPDF} style={btnDark} disabled={!selected}>⬇️ Export PDF</button>
          <button onClick={handleDelete} style={btnRed} disabled={!selected || loading} title="Delete current report">🗑️ Delete</button>
        </div>
      </div>

      <div style={styles.layout}>
        {/* سايدبار سنة/شهر/يوم */}
        <aside style={styles.sidebar}>
          {/* NEW: import/export toolbar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={exportJSONAll} style={btnDark}>⇩ Export JSON (all)</button>
            <button onClick={triggerImport} style={btnBlue} disabled={importing}>
              {importing ? "Importing…" : "⇧ Import JSON"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={handleImportFile}
            />
          </div>

          {loading && <div style={muted}>Loading…</div>}

          {Object.keys(groups.years)
            .sort((a, b) => Number(b) - Number(a)) // أحدث → أقدم
            .map((yy) => (
              <YearBlock
                key={yy}
                year={yy}
                months={groups.years[yy]}
                selectedKey={selectedKey}
                onPick={setSelected}
              />
            ))}
        </aside>

        {/* مساحة العرض */}
        <main style={styles.main}>
          {!selected ? (
            <div style={{ ...card, padding: 16 }}>No report selected</div>
          ) : (
            <div style={card}>
              <ReportSheet ref={sheetRef} report={selected} />
            </div>
          )}
        </main>
      </div>

      {/* CSS محلي: حدود واضحة + خط أكبر */}
      <style>{`
        .tbl {
          width: 100%;
          border-collapse: collapse;
          box-shadow: 0 6px 18px rgba(2,6,23,.06);
          border: 1.5px solid #94a3b8;
        }
        .tbl thead th {
          position: sticky;
          top: 0;
          background: #e2e8f0;
          border: 1.5px solid #94a3b8;
          padding: 10px 8px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: .04em;
          color: #0f172a;
          font-weight: 900;
        }
        .tbl td {
          border: 1.5px solid #94a3b8;
          padding: 10px 8px;
          font-size: 13px;
          font-weight: 700;
          color: #1f2937;
          background: #fff;
        }
        .tbl tbody tr:nth-child(2n) td { background:#f8fafc; }

        .hdrTable { width:100%; border-collapse: collapse; margin-bottom: 10px; }
        .hdrTable td { border:1px solid #e5e7eb; padding:8px 10px; font-weight:800; background:#fff; }
        .hdrTable tr:nth-child(odd) td { background:#fbfbff; }
      `}</style>
    </div>
  );
}

/* ===================== Sidebar Blocks ===================== */
function YearBlock({ year, months, onPick, selectedKey }) {
  const [open, setOpen] = useState(false);
  const daysCount = Object.values(months).reduce((acc, days) => acc + Object.keys(days).length, 0);
  return (
    <div style={sb.year}>
      <div style={sb.yearHeader} onClick={() => setOpen(!open)}>
        <span>{open ? "▾" : "▸"}</span>
        <strong>Year {year}</strong>
        <span style={sb.badge}>{daysCount} days</span>
      </div>
      {open &&
        Object.keys(months)
          .sort((a, b) => Number(b) - Number(a))
          .map((mm) => (
            <MonthBlock
              key={mm}
              year={year}
              month={mm}
              days={months[mm]}
              onPick={onPick}
              selectedKey={selectedKey}
            />
          ))}
    </div>
  );
}

function MonthBlock({ year, month, days, onPick, selectedKey }) {
  const [open, setOpen] = useState(false);
  const totalItems = Object.values(days).reduce((acc, v) => acc + (v.items || 0), 0);
  return (
    <div style={sb.month}>
      <div style={sb.monthHeader} onClick={() => setOpen(!open)}>
        <span>{open ? "▾" : "▸"}</span>
        <span style={{ fontWeight: 900 }}>Month {month}</span>
        <span style={sb.badge}>{Object.keys(days).length} days</span>
        <span style={sb.badgeMuted}>{totalItems} items</span>
      </div>
      {open &&
        Object.keys(days)
          .sort((a, b) => Number(b) - Number(a))
          .map((dd) => (
            <DateChip
              key={dd}
              y={year}
              m={month}
              d={dd}
              info={days[dd]}
              onPick={onPick}
              selectedKey={selectedKey}
            />
          ))}
    </div>
  );
}

/* ==== زر التاريخ مع وسم العدد + تمييز أزرق ==== */
function DateChip({ y, m, d, info, onPick, selectedKey }) {
  const list = info?.list || [];
  const first = list[0];
  const isSel = list.some((r) => getKey(r) === selectedKey);
  const label = `${y}-${m}-${d}`;
  return (
    <button
      onClick={() => first && onPick(first)}
      style={{
        ...sb.dateChip,
        ...(isSel ? sb.dateChipActive : null),
      }}
      title={label}
    >
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      {list.length > 1 && (
        <span style={sb.badgeMuted}>{list.length}</span>
      )}
    </button>
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
        <div style={sigBox}><strong>Checked By</strong><span style={sigLine}>{sig.checkedBy || "—"}</span></div>
        <div style={sigBox}><strong>Verified By</strong><span style={sigLine}>{sig.verifiedBy || "—"}</span></div>
      </div>
    </div>
  );
});

/* ===================== Styles ===================== */
const styles = {
  page: {
    minHeight: "100vh",
    padding: 14,
    background:
      "linear-gradient(160deg,#4f46e5 0%, #5b6ee6 30%, #4aa7e9 60%, #27c3f1 100%)",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,.08)",
    border: "1px solid rgba(255,255,255,.35)",
    borderRadius: 14,
    padding: "10px 12px",
    color: "#fff",
    boxShadow: "0 12px 28px rgba(0,0,0,.18) inset, 0 8px 20px rgba(0,0,0,.1)",
    backdropFilter: "blur(6px)",
    marginBottom: 10,
    fontWeight: 900,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    gap: 12,
  },
  sidebar: {
    background: "rgba(255,255,255,.96)",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    boxShadow: "0 14px 32px rgba(2,6,23,.08)",
    padding: 10,
    overflow: "auto",
    maxHeight: "calc(100vh - 140px)",
  },
  main: {
    minHeight: "70vh",
  },
};

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  boxShadow: "0 14px 32px rgba(2,6,23,.08)",
  padding: 10,
};

const sb = {
  year: { marginBottom: 8 },
  yearHeader: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#f1f5f9",
    cursor: "pointer",
    fontWeight: 900,
  },
  month: { margin: "8px 0 6px 12px" },
  monthHeader: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#f8fafc",
    cursor: "pointer",
    fontWeight: 900,
  },
  dateChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    marginLeft: 24,
    marginTop: 6,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    background: "#fff",
    textAlign: "left",
    fontWeight: 900,
    boxShadow: "0 2px 6px rgba(2,6,23,.04)",
    cursor: "pointer",
    transition: "all .15s ease",
  },
  dateChipActive: {
    borderColor: "#2563eb",
    boxShadow: "0 0 0 3px rgba(37,99,235,.25)",
    background: "rgba(37,99,235,.08)",
    color: "#1e40af",
  },
  badge: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: 900,
    color: "#0f172a",
    background: "#e0e7ff",
    border: "1px solid #c7d2fe",
    padding: "2px 8px",
    borderRadius: 999,
  },
  badgeMuted: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: 900,
    color: "#334155",
    background: "#e2e8f0",
    border: "1px solid #cbd5e1",
    padding: "2px 8px",
    borderRadius: 999,
  },
};

const muted = { color: "#6b7280", fontWeight: 800 };

const baseBtn = {
  color: "#fff",
  border: "none",
  padding: "9px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 900,
  boxShadow: "0 10px 20px rgba(0,0,0,.12)",
};
const btnBlue = { ...baseBtn, background: "linear-gradient(180deg,#3b82f6,#2563eb)" };
const btnDark = { ...baseBtn, background: "linear-gradient(180deg,#111827,#0f172a)" };
const btnRed = { ...baseBtn, background: "linear-gradient(180deg,#ef4444,#dc2626)" };

const sigBox = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  background: "#fff",
  padding: "10px",
  display: "flex",
  alignItems: "flex-end",
  gap: 10,
  fontWeight: 800,
};
const sigLine = {
  borderBottom: "1px solid #111",
  flex: 1,
  paddingBottom: 2,
  fontWeight: 800,
};
