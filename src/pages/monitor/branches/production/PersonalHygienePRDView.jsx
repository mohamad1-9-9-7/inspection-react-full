// src/pages/monitor/branches/production/PersonalHygienePRDView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "https://inspection-server-4nvj.onrender.com";

const TYPE = "prod_personal_hygiene";

const COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
  "Communicable Disease",
  "Open wounds/sores & cut",
];

/* ===== Helpers ===== */
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
function groupByYMD(arr) {
  const years = {};
  arr.forEach((r) => {
    const pick = r.payload?.reportDate || r.createdAt || "";
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

/* ===== Main View ===== */
export default function PersonalHygienePRDView() {
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

      // فرز قديم → جديد للسايدبار
      arr.forEach((r) => (r.__dateStr = r.payload?.reportDate || r.createdAt || ""));
      arr.sort((a, b) => new Date(a.__dateStr || 0) - new Date(b.__dateStr || 0));

      setReports(arr);
      setSelected(arr[arr.length - 1] || null); // آخر تقرير افتراضياً
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => groupByYMD(reports), [reports]);
  const selectedKey = getKey(selected);

  /* ===== Date tree: collapsed by default (like Traceability) ===== */
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({}); // key = "YYYY-MM"
  const toggleYear  = (y)    => setExpandedYears((p)  => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  /* ===== Export PDF (sheet only) ===== */
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
      .paper { background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
    `;
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Personal Hygiene (PRD) - ${titleDate}</title>
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

  /* ===== Export all reports as JSON ===== */
  function exportJSONAll() {
    const dump = {
      meta: {
        type: TYPE,
        exportedAt: new Date().toISOString(),
        count: reports.length,
      },
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

  /* ===== Import JSON → save to server → refresh ===== */
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
        const payload = raw?.payload ?? raw; // دعم الحالتين
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

  /* ===== Delete (type + reportDate) ===== */
  async function handleDelete() {
    if (!selected) return;
    const reportDateIso = normYMD(selected.payload?.reportDate || selected.createdAt)?.iso;
    if (!reportDateIso) return alert("لا يوجد تاريخ صالح للحذف.");

    if (!window.confirm("هل تريد حذف هذا التقرير نهائيًا؟")) return;

    setLoading(true);
    let ok = false, errText = "";
    const base = String(API_BASE).replace(/\/$/, "");
    const tries = [
      { url: `${base}/api/reports?type=${encodeURIComponent(TYPE)}&reportDate=${encodeURIComponent(reportDateIso)}`, method: "DELETE" },
      { url: `${base}/api/reports/${TYPE}?reportDate=${encodeURIComponent(reportDateIso)}`, method: "DELETE" },
      { url: `${base}/api/reports/delete`, method: "POST", body: JSON.stringify({ type: TYPE, reportDate: reportDateIso }) },
      { url: `${base}/api/reports/${TYPE}/delete`, method: "POST", body: JSON.stringify({ reportDate: reportDateIso }) },
    ];
    for (const t of tries) {
      try {
        const res = await fetch(t.url, {
          method: t.method,
          headers: t.body ? { "Content-Type": "application/json" } : undefined,
          body: t.body,
        });
        if (res.ok) { ok = true; break; }
        errText = `HTTP ${res.status} ${await res.text().catch(() => "")}`;
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
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={{ fontWeight: 900, color: "#fff" }}>
          Personal Hygiene details {selected ? `(${selected?.payload?.reportDate || ""})` : ""}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={btnBlue}>⟳ Refresh</button>
          <button onClick={exportPDF} style={btnDark} disabled={!selected}>⬇️ Export PDF</button>
          <button onClick={handleDelete} style={btnRed} disabled={!selected || loading}>🗑️ Delete</button>
        </div>
      </div>

      <div style={styles.layout}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          {/* import/export toolbar */}
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
            .sort((a, b) => Number(a) - Number(b)) // قديم → جديد
            .map((yy) => (
              <YearBlock
                key={yy}
                year={yy}
                months={groups.years[yy]}
                selectedKey={selectedKey}
                onPick={setSelected}
                expandedYears={expandedYears}
                expandedMonths={expandedMonths}
                toggleYear={toggleYear}
                toggleMonth={toggleMonth}
              />
            ))}
        </aside>

        {/* Main */}
        <main style={styles.main}>
          {!selected ? (
            <div style={{ ...card, padding: 16 }}>No report selected</div>
          ) : (
            <div style={card}>
              <ReportSheet ref={sheetRef} data={selected.payload} />
            </div>
          )}
        </main>
      </div>

      {/* Tables CSS */}
      <style>{`
        .tbl { width:100%; border-collapse:collapse; box-shadow:0 6px 18px rgba(2,6,23,.06); }
        .tbl th, .tbl td { border:1.5px solid #94a3b8; }
        .tbl thead th {
          position: sticky; top: 0;
          background:#e2e8f0; border-bottom:1.5px solid #94a3b8;
          padding:10px 8px; font-size:12px; letter-spacing:.04em;
          text-transform:uppercase; color:#0f172a; font-weight:900;
        }
        .tbl td { padding:10px 8px; font-weight:700; color:#1f2937; background:#fff; }
        .tbl tbody tr:nth-child(2n) td { background:#f8fafc; }

        .hdrTable { width:100%; border-collapse:collapse; margin-bottom:10px; }
        /* حدود الترويسة أوضح */
        .hdrTable td { border:2px solid #334155; padding:8px 10px; font-weight:800; background:#fff; }
        .hdrTable tr:nth-child(odd) td { background:#f1f5f9; }
      `}</style>
    </div>
  );
}

/* ===== Sidebar blocks (collapsed by default) ===== */
function YearBlock({
  year, months, onPick, selectedKey,
  expandedYears, expandedMonths, toggleYear, toggleMonth
}) {
  // مطوي افتراضيًا
  const [open, setOpen] = useState(false);
  useEffect(() => {
   if (expandedYears[year] !== undefined) setOpen(!!expandedYears[year]);
  }, [expandedYears, year]);

  useEffect(() => {
    // مزامنة مع الحالة العامة
    if (open !== !!expandedYears[year]) {
      // لا تغيير هنا؛ التحكم الأساسي عبر toggleYear
    }
  }, [open, expandedYears, year]);

  const daysCount = Object.keys(months).reduce((acc, m) => acc + Object.keys(months[m]).length, 0);
  return (
    <div style={sb.year}>
      <div
        style={sb.yearHeader}
        onClick={() => { toggleYear(year); setOpen(!open); }}
        title={open ? "Collapse" : "Expand"}
      >
        <span>{open ? "▾" : "▸"}</span>
        <strong>Year {year}</strong>
        <span style={sb.badge}>{daysCount} days</span>
      </div>

      {open &&
        Object.keys(months)
          .sort((a, b) => Number(a) - Number(b))
          .map((mm) => (
            <MonthBlock
              key={mm}
              year={year}
              month={mm}
              days={months[mm]}
              onPick={onPick}
              selectedKey={selectedKey}
              expandedMonths={expandedMonths}
              toggleMonth={toggleMonth}
            />
          ))}
    </div>
  );
}

function MonthBlock({ year, month, days, onPick, selectedKey, expandedMonths, toggleMonth }) {
  // مطوي افتراضيًا
  const [open, setOpen] = useState(false);
  const key = `${year}-${month}`;
  useEffect(() => {
    if (expandedMonths[key] !== undefined) setOpen(!!expandedMonths[key]);
  }, [expandedMonths, key]);

  const totalItems = Object.values(days).reduce((acc, v) => acc + (v.items || 0), 0);
  return (
    <div style={sb.month}>
      <div
        style={sb.monthHeader}
        onClick={() => { toggleMonth(year, month); setOpen(!open); }}
        title={open ? "Collapse" : "Expand"}
      >
        <span>{open ? "▾" : "▸"}</span>
        <span style={{ fontWeight: 900 }}>Month {month}</span>
        <span style={sb.badge}>{Object.keys(days).length} days</span>
        <span style={sb.badgeMuted}>{totalItems} items</span>
      </div>

      {open &&
        Object.keys(days)
          .sort((a, b) => Number(a) - Number(b))
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

function DateChip({ y, m, d, info, onPick, selectedKey }) {
  const list = info?.list || [];
  const first = list[0];
  const isSel = list.some((r) => getKey(r) === selectedKey);
  const label = `${y}-${m}-${d}`;
  return (
    <button
      onClick={() => first && onPick(first)}
      style={{ ...sb.dateChip, ...(isSel ? sb.dateChipActive : null) }}
      title={label}
    >
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      {list.length > 1 && <span style={sb.badgeMuted}>{list.length}</span>}
    </button>
  );
}

/* ===== Report Sheet ===== */
const ReportSheet = React.forwardRef(function ReportSheet({ data }, ref) {
  // Header (من البيانات أو قيم افتراضية مطابقة لصفحة الإدخال)
  const h = data?.header || {};
  const header = {
    documentTitle: h.documentTitle || "Personal Hygiene Check List",
    documentNo: h.documentNo || "FS-QM /REC/PH",
    issueDate: h.issueDate || "05/02/2020",
    revisionNo: h.revisionNo || "0",
    area: h.area || "Production",
    issuedBy: h.issuedBy || "QA",
    controllingOfficer: h.controllingOfficer || "Quality Controller",
    company: h.company || "TRANS EMIRATES LIVESTOCK TRADING LLC",
  };

  const date = data?.reportDate || "—";
  const entries = data?.entries || [];
  const checkedBy = data?.checkedBy || "—";
  const verifiedBy = data?.verifiedBy || "—";

  return (
    <div ref={ref} className="paper">
      <div style={{ padding: 12 }}>
        {/* Header */}
        <table className="hdrTable">
          <tbody>
            <tr>
              <td><strong>Document Title:</strong> {header.documentTitle}</td>
              <td><strong>Document No:</strong> {header.documentNo}</td>
            </tr>
            <tr>
              <td><strong>Issue Date:</strong> {header.issueDate}</td>
              <td><strong>Revision No:</strong> {header.revisionNo}</td>
            </tr>
            <tr>
              <td><strong>Area:</strong> {header.area}</td>
              <td><strong>Issued By:</strong> {header.issuedBy}</td>
            </tr>
            <tr>
              <td><strong>Controlling Officer:</strong> {header.controllingOfficer}</td>
              <td><strong>Company:</strong> {header.company}</td>
            </tr>
            {/* Approved By محذوف من الترويسة كما طلبت */}
          </tbody>
        </table>

        <h3 style={{ textAlign: "center", background: "#e5e7eb", padding: 6, marginBottom: 8 }}>
          AL MAWASHI — PRODUCTION<br/>PERSONAL HYGIENE CHECKLIST (PRD)
        </h3>

        {/* التاريخ */}
        <table className="hdrTable" style={{ marginTop: -6 }}>
          <tbody>
            <tr>
              <td colSpan={2}><strong>Date:</strong> {date}</td>
            </tr>
          </tbody>
        </table>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 70 }}>S.No</th>
                <th style={{ minWidth: 180 }}>Employee Name</th>
                {COLUMNS.map((c, i) => (<th key={i} style={{ minWidth: 140 }}>{c}</th>))}
                <th style={{ minWidth: 260 }}>Remarks and Corrective Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 3} style={{ textAlign:"center", color:"#64748b", fontWeight: 800 }}>
                    No entries
                  </td>
                </tr>
              ) : entries.map((row, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td style={{ textAlign:"left" }}>{row.name || ""}</td>
                  {COLUMNS.map((c, k) => (<td key={k}>{row[c] || ""}</td>))}
                  <td style={{ textAlign:"left" }}>{row.remarks || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures: Checked By يسار — Verified By يمين */}
        <div style={{
          marginTop: 10,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          width: "100%",
        }}>
          <div style={{ textAlign: "left", flex: 1 }}>
            Checked By: {checkedBy}
          </div>
          <div style={{ textAlign: "right", flex: 1 }}>
            Verified By: {verifiedBy}
          </div>
        </div>

        <div style={{ marginTop: 6, fontSize: ".9rem", fontWeight: 800 }}>
          *(C – Conform &nbsp;&nbsp; N/C – Non Conform)
        </div>
      </div>
    </div>
  );
});

/* ===== Styles ===== */
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
  main: { minHeight: "70vh" },
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
    borderRadius: 12,
    border: "2px solid #e5e7eb",
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
const btnRed  = { ...baseBtn, background: "linear-gradient(180deg,#ef4444,#dc2626)" };
