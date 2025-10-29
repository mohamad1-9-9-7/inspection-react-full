// src/pages/monitor/branches/qcs/FreshChickenReportsView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ================= API base (متطابق مع FreshChickenInter) ================= */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const fromWindow = typeof window !== "undefined" ? window.__QCS_API__ : undefined;
const fromProcess =
  typeof process !== "undefined"
    ? (process.env?.REACT_APP_API_URL ||
       process.env?.VITE_API_URL ||
       process.env?.RENDER_EXTERNAL_URL)
    : undefined;
let fromVite;
try { fromVite = import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.RENDER_EXTERNAL_URL); }
catch { fromVite = undefined; }
const API_BASE = String(fromWindow || fromProcess || fromVite || API_ROOT_DEFAULT).replace(/\/$/, "");
const REPORTS_URL = `${API_BASE}/api/reports`;
const REPORT_TYPE_KEY = "pos_al_qusais_fresh_chicken_receiving";

/* ===== وثائق ===== */
const DOC_NO = "FS-QM/REC/FC-001";

/* ================= Helpers ================= */
const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; }
  catch { return false; }
})();

async function listReportsByType(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}`, {
    method: "GET",
    cache: "no-store",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to list reports for ${type}`);
  const json = await res.json().catch(() => null);
  const rows = Array.isArray(json) ? json : json?.data || [];
  return rows.map((r) => ({ id: r?._id || r?.id, payload: r?.payload || r })); // {id, payload}
}

async function deleteReportById(id) {
  if (!id) return false;
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  return res.ok || res.status === 404;
}

function toDMY(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return iso || "";
  const [y, m, d] = String(iso).split("-");
  return `${d}/${m}/${y}`;
}
function safeISO(value) {
  const s = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}
function getEntryDate(payload) {
  return safeISO(payload?.header?.reportEntryDate || payload?.meta?.entryDate || "");
}
function variantLabel(id) {
  if (id === "griller") return "Fresh Full Chicken (Griller)";
  if (id === "liver") return "Fresh Chicken Liver";
  return "Fresh Wings, Gizzard & Bones";
}
function fmtDate(iso) {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${toDMY(iso)} (${iso})`;
  return iso;
}

/* ============= تجميع التواريخ: Year → Month → [Day => ids] ============= */
function groupByDateTree(rows) {
  const acc = {};
  for (const r of rows) {
    const iso = getEntryDate(r.payload);
    if (!iso) continue;
    const [Y, M, D] = iso.split("-");
    acc[Y] ??= {};
    acc[Y][M] ??= {};
    acc[Y][M][D] ??= [];
    acc[Y][M][D].push(r);
  }
  return acc; // {2025:{10:{28:[row,row]}}}
}

/* ================= ألوان/ستايل خفيف (بدون fullscreen) ================= */
const COLORS = {
  ink: "#0b132b",
  line: "#cbd5e1",
  bg: "#f7f9fc",
  card: "#ffffff",
  headerA: "#eaf2ff",
  headerB: "#e8fbf2",
  gridHeader: "#f2f6ff",
  chip: "#111827",
};

const card = {
  background: COLORS.card,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,.06)",
  overflow: "hidden",
};
const section = { ...card, padding: 14 };
const sectionBar = (color) => ({
  height: 8,
  borderRadius: 6,
  background: color,
  margin: "-4px -4px 10px -4px",
  border: `1px solid ${COLORS.line}`,
});

const btnBase = {
  padding: "9px 12px",
  borderRadius: 10,
  border: `1px solid ${COLORS.line}`,
  background: "#0b132b",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};
const btnGhost = {
  ...btnBase,
  background: "#fff",
  color: "#0b132b",
};

const tableWrap = { overflowX: "auto", border: `1px solid ${COLORS.line}`, borderRadius: 12, background: COLORS.card };
const table = { width: "100%", borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", fontSize: 14 };
const th = { background: COLORS.gridHeader, borderBottom: `1px solid ${COLORS.line}`, borderRight: `1px solid ${COLORS.line}`, textAlign: "left", padding: 10, fontWeight: 900, position: "sticky", top: 0, zIndex: 1, whiteSpace: "nowrap" };
const td = { borderTop: `1px solid ${COLORS.line}`, borderRight: `1px solid ${COLORS.line}`, padding: 8, verticalAlign: "top", whiteSpace: "pre-wrap", wordBreak: "break-word" };
const tdAttr = { ...td, fontWeight: 900, background: "#fff", position: "sticky", left: 0, zIndex: 2, minWidth: 220 };

const chip = { display: "inline-block", padding: "6px 10px", borderRadius: 999, background: "#e5e7eb", color: COLORS.chip, fontWeight: 900, fontSize: 12 };

/* ============== ترويسة كلاسيكية مع Document No (مثل النمط المطلوب) ============== */
const CLASSIC_HEADER_BORDER = "1px solid #cbd5e1";
function RowKVClassic({ label, value }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr" }}>
      <div style={{ padding: "8px 10px", borderRight: CLASSIC_HEADER_BORDER, fontWeight: 900 }}>
        {label}
      </div>
      <div style={{ padding: "8px 10px" }}>{value || "—"}</div>
    </div>
  );
}
function FCHeaderClassic({
  docTitle = "Raw Material Inspection Report [Fresh Chicken]",
  docNo = DOC_NO,                 // يعتمد الثابت FS-QM/REC/FC-001
  revisionNo = "0",
  issueDate = "05/02/2020",
  area = "QA",
  issuedBy = "MOHAMAD ABDULLAH",
  controllingOfficer = "Online Quality Controller",
  approvedBy = "Hussam O. Sarhan",
  entryDate,                      // YYYY-MM-DD
  variantLabelText,
  branchText,
}) {
  return (
    <div style={{ ...card, padding: 0 }}>
      {/* اسم الشركة أعلى اليمين */}
      <div style={{ padding: "6px 10px", textAlign: "right", fontStyle: "italic", opacity: .9 }}>
        Trans Emirates Livestock Trading L.L.C.
      </div>

      {/* جدول مفاتيح/قيم عمودين */}
      <div
        style={{
          borderTop: CLASSIC_HEADER_BORDER,
          borderBottom: CLASSIC_HEADER_BORDER,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        {/* العمود الأيسر */}
        <div style={{ borderRight: CLASSIC_HEADER_BORDER }}>
          <RowKVClassic label="Document Title:" value={docTitle} />
          <div style={{ borderTop: CLASSIC_HEADER_BORDER }} />
          <RowKVClassic label="Document No:" value={docNo} />
          <div style={{ borderTop: CLASSIC_HEADER_BORDER }} />
          <RowKVClassic label="Issue Date:" value={issueDate} />
          <div style={{ borderTop: CLASSIC_HEADER_BORDER }} />
          <RowKVClassic label="Area:" value={area} />
          <div style={{ borderTop: CLASSIC_HEADER_BORDER }} />
          <RowKVClassic label="Controlling Officer:" value={controllingOfficer} />
        </div>

        {/* العمود الأيمن */}
        <div>
          <RowKVClassic label="Revision No:" value={revisionNo} />
          <div style={{ borderTop: CLASSIC_HEADER_BORDER }} />
          <RowKVClassic label="Issued By:" value={issuedBy} />
          <div style={{ borderTop: CLASSIC_HEADER_BORDER }} />
          <RowKVClassic label="Approved By:" value={approvedBy} />
        </div>
      </div>

      {/* سطر معلومات إضافية (تاريخ الإدخال/النوع/الفرع) */}
      <div style={{ padding: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <div><strong>Report Entry Date:</strong> {entryDate ? `${toDMY(entryDate)} (${entryDate})` : "—"}</div>
        <div><strong>Variant:</strong> {variantLabelText || "—"}</div>
        <div><strong>Branch:</strong> {branchText || "—"}</div>
      </div>
    </div>
  );
}

/* ================= Component ================= */
export default function FreshChickenReportsView() {
  const [allRows, setAllRows] = useState([]);       // [{id, payload}]
  const [loading, setLoading] = useState(true);

  // شجرة التاريخ
  const [selectedDate, setSelectedDate] = useState(""); // ISO day
  const [activeId, setActiveId] = useState(null);       // تقرير مُختار (ضمن اليوم)
  const [exportingPDF, setExportingPDF] = useState(false);
  const printRef = useRef(null);

  /* ===== تحميل كل تقارير هذا النوع ===== */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const rows = await listReportsByType(REPORT_TYPE_KEY);

        // ترتيب تنازلي حسب تاريخ الإدخال + createdAt
        rows.sort((a, b) => {
          const da = String(getEntryDate(a.payload));
          const db = String(getEntryDate(b.payload));
          if (da !== db) return db.localeCompare(da);
          const ca = String(a.payload?.meta?.createdAt || "");
          const cb = String(b.payload?.meta?.createdAt || "");
          return cb.localeCompare(ca);
        });

        setAllRows(rows);

        // اختيار أحدث يوم تلقائياً
        const days = uniqueDates(rows);
        if (days.length) setSelectedDate(days[0]);
      } catch (e) {
        console.error(e);
        alert("Failed to fetch Fresh Chicken reports.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // شجرة مجمعة
  const grouped = useMemo(() => groupByDateTree(allRows), [allRows]);

  // كل التقارير ضمن اليوم
  const rowsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return allRows.filter((r) => getEntryDate(r.payload) === selectedDate);
  }, [allRows, selectedDate]);

  // المعرّف النشط: اختر الأول ضمن اليوم أو احتفظ بالقديم إن موجود
  useEffect(() => {
    if (!selectedDate) { setActiveId(null); return; }
    const sameDay = rowsForSelectedDate.find((r) => r.id === activeId);
    if (sameDay) return;
    setActiveId(rowsForSelectedDate[0]?.id || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, rowsForSelectedDate]);

  const activeReport = useMemo(
    () => rowsForSelectedDate.find((r) => r.id === activeId)?.payload || null,
    [rowsForSelectedDate, activeId]
  );

  // المتغيرات المتاحة لهذا اليوم (مرتبة)
  const variantsAvailable = useMemo(() => {
    const v = rowsForSelectedDate.map((r) => r?.payload?.reportVariant).filter(Boolean);
    const order = ["mixed_parts", "griller", "liver"];
    return order.filter((id) => v.includes(id));
  }, [rowsForSelectedDate]);

  const switchVariant = (variantId) => {
    const match = rowsForSelectedDate.find((r) => r?.payload?.reportVariant === variantId);
    if (match) setActiveId(match.id);
  };

  /* ===== طباعة / تصدير PDF ===== */
  const onPrint = () => {
    try { window.print(); } catch {}
  };

  const onExportPDF = async () => {
    if (!printRef.current) return;
    try {
      setExportingPDF(true);
      const el = printRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 0, heightLeft = imgHeight;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const fileName = `fresh_chicken_${selectedDate || "report"}.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF.");
    } finally {
      setExportingPDF(false);
    }
  };

  const onDeleteActive = async () => {
    const row = rowsForSelectedDate.find((r) => r.id === activeId);
    if (!row) return;
    if (!window.confirm("Delete this report permanently?")) return;
    try {
      const ok = await deleteReportById(row.id);
      if (!ok) throw new Error("Delete failed");
      const next = allRows.filter((r) => r.id !== row.id);
      setAllRows(next);
      const remainingSameDate = next.filter((r) => getEntryDate(r.payload) === selectedDate);
      setActiveId(remainingSameDate[0]?.id || null);
      if (remainingSameDate.length === 0) {
        const nextDates = uniqueDates(next);
        setSelectedDate(nextDates[0] || "");
      }
      alert("Deleted.");
    } catch (e) {
      console.error(e);
      alert("Failed to delete report.");
    }
  };

  /* ====================== UI ====================== */
  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      {/* ===== Sidebar: شجرة التاريخ + إجراءات ===== */}
      <aside style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <div style={section}>
          <div style={sectionBar(COLORS.headerA)} />
          <h3 style={{ margin: 0, fontWeight: 900 }}>Fresh Chicken Reports</h3>
          <div style={{ marginTop: 6, fontSize: 12, opacity: .75 }}>
            Type: <strong>{REPORT_TYPE_KEY}</strong>
          </div>
        </div>

        <div style={section}>
          <h4 style={{ margin: "0 0 8px", fontWeight: 900 }}>History</h4>
          {loading ? (
            <div style={{ fontStyle: "italic" }}>Loading…</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div style={{ color: "#6b7280" }}>No reports found.</div>
          ) : (
            Object.entries(grouped)
              .sort(([a],[b]) => Number(b) - Number(a)) // أحدث سنة أولاً
              .map(([Y, months]) => (
                <details key={Y} style={{ marginBottom: 6 }}>
                  {/* افتراضيًا مغلق */}
                  <summary style={{ fontWeight: 800, cursor: "pointer" }}>📅 Year {Y}</summary>
                  {Object.entries(months)
                    .sort(([a],[b]) => Number(b) - Number(a)) // أحدث شهر
                    .map(([M, daysObj]) => (
                      <details key={M} style={{ margin: "6px 0 6px 12px" }}>
                        <summary style={{ fontWeight: 700, cursor: "pointer" }}>📅 Month {M}</summary>
                        <ul style={{ listStyle: "none", paddingLeft: 12 }}>
                          {Object.entries(daysObj)
                            .sort(([a],[b]) => Number(b) - Number(a)) // أحدث يوم
                            .map(([D, arr]) => {
                              const iso = `${Y}-${M}-${D}`;
                              const active = selectedDate === iso;
                              return (
                                <li
                                  key={iso}
                                  onClick={() => setSelectedDate(iso)}
                                  style={{
                                    padding: "6px 10px",
                                    marginBottom: 4,
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    background: active ? "#0b132b" : "#eef2f7",
                                    color: active ? "#fff" : "#0b132b",
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                  title={active ? "Current day" : "Open day"}
                                >
                                  <span>{`${D}/${M}/${Y}`}</span>
                                  <span style={{ opacity: .8, fontWeight: 800 }}>{arr.length}</span>
                                </li>
                              );
                            })}
                        </ul>
                      </details>
                    ))}
                </details>
              ))
          )}
        </div>

        <div style={section}>
          <h4 style={{ margin: "0 0 8px", fontWeight: 900 }}>Variants (day)</h4>
          {variantsAvailable.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {variantsAvailable.map((v) => {
                const isActive = rowsForSelectedDate.find((r) => r.id === activeId)?.payload?.reportVariant === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => switchVariant(v)}
                    style={{
                      ...btnGhost,
                      background: isActive ? "#0b132b" : "#fff",
                      color: isActive ? "#fff" : "#0b132b",
                    }}
                  >
                    {variantLabel(v)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "#6b7280" }}>No variants for this day.</div>
          )}
        </div>

        <div style={section}>
          <h4 style={{ margin: "0 0 8px", fontWeight: 900 }}>Actions</h4>
          <div style={{ display: "grid", gap: 8 }}>
            <button type="button" onClick={onPrint} style={btnGhost}>🖨️ Print</button>
            <button type="button" onClick={onExportPDF} disabled={exportingPDF} style={btnBase}>
              {exportingPDF ? "… Exporting PDF" : "📄 Export PDF"}
            </button>
            {activeReport && (
              <button
                type="button"
                onClick={onDeleteActive}
                style={{ ...btnGhost, borderColor: "#dc2626", color: "#dc2626" }}
              >
                🗑️ Delete this report
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ===== Main Viewer ===== */}
      <main>
        <div ref={printRef} className="print-area" style={{ display: "grid", gap: 12 }}>
          {/* === Header (Classic) === */}
          <FCHeaderClassic
            docTitle="Raw Material Inspection Report [Fresh Chicken]"
            docNo={DOC_NO}
            revisionNo="0"
            issueDate="05/02/2020"
            area="QA"
            issuedBy="MOHAMAD ABDULLAH"
            controllingOfficer="Online Quality Controller"
            approvedBy="Hussam O. Sarhan"
            entryDate={activeReport?.header?.reportEntryDate || activeReport?.meta?.entryDate}
            variantLabelText={variantLabel(activeReport?.reportVariant)}
            branchText={activeReport?.branchCode}
          />

          {/* Meta / Header info */}
          <div style={section}>
            <div style={sectionBar(COLORS.headerB)} />
            <h3 style={{ margin: "0 0 10px", fontWeight: 900 }}>Header</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              <KV label="Report No" value={activeReport?.header?.reportNo} />
              <KV label="Sample Received On" value={fmtDate(activeReport?.header?.sampleReceivedOn)} />
              <KV label="Inspection Date" value={fmtDate(activeReport?.header?.inspectionDate)} />
              <KV label="Truck / Product Temp (°C)" value={activeReport?.header?.truckTemperature} />
              <KV label="Brand" value={activeReport?.header?.brand} />
              <KV label="Invoice Number" value={activeReport?.header?.invoiceNumber} />
              <KV label="Origin" value={activeReport?.header?.origin} />
              <KV label="Supplier" value={activeReport?.header?.supplier} />
              <KV style={{ gridColumn: "1 / -1" }} label="Product Name" value={activeReport?.header?.productName} />
            </div>
            {activeReport?.remarks && (
              <div style={{ marginTop: 10 }}>
                <span style={chip}>Remarks</span>
                <div style={{ marginTop: 6, fontWeight: 700 }}>{activeReport.remarks}</div>
              </div>
            )}
          </div>

          {/* Samples table */}
          {activeReport?.samplesTable && (
            <div style={section}>
              <div style={sectionBar(COLORS.headerA)} />
              <h3 style={{ margin: "0 0 10px", fontWeight: 900 }}>Samples</h3>
              <div style={tableWrap}>
                <table style={table}>
                  <colgroup>
                    <col style={{ width: 240 }} />
                    {(activeReport.samplesTable.columns || []).map((_, i) => (
                      <col key={i} style={{ width: 220 }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ ...th, left: 0, position: "sticky", zIndex: 2 }}>Attribute</th>
                      {(activeReport.samplesTable.columns || []).map((c, i) => (
                        <th key={i} style={th}>{`Sample ${c?.sampleId || i + 1}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(activeReport.samplesTable.rows || []).map((row) => (
                      <tr key={row.key}>
                        <td style={tdAttr}>{row.label}</td>
                        {(activeReport.samplesTable.columns || []).map((c, ci) => (
                          <td key={`${row.key}-${ci}`} style={td}>
                            {String(c?.[row.key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Break Up */}
          <div style={section}>
            <div style={sectionBar(COLORS.headerB)} />
            <h3 style={{ margin: "0 0 10px", fontWeight: 900 }}>Break Up</h3>
            {Array.isArray(activeReport?.breakup) && activeReport.breakup.length ? (
              <div style={tableWrap}>
                <table style={table}>
                  <colgroup>
                    <col style={{ width: 420 }} />
                    <col style={{ width: 300 }} />
                    <col style={{ width: 200 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={th}>Product Name</th>
                      <th style={th}>Packing</th>
                      <th style={th}>Total Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeReport.breakup.map((r, i) => (
                      <tr key={i}>
                        <td style={td}>{r?.productName || ""}</td>
                        <td style={td}>{r?.packing || ""}</td>
                        <td style={td}>{r?.totalQty || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: "#6b7280" }}>No breakup rows.</div>
            )}
          </div>

          {/* Attachments */}
          <div style={section}>
            <div style={sectionBar(COLORS.headerA)} />
            <h3 style={{ margin: "0 0 10px", fontWeight: 900 }}>Attachments</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <strong>Product Images</strong>
                <ThumbGrid items={activeReport?.images || []} />
              </div>
              <div>
                <strong>Certificates / Docs</strong>
                <ThumbGrid items={activeReport?.certificates || []} docMode />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={section}>
            <div style={sectionBar(COLORS.headerB)} />
            <h3 style={{ margin: "0 0 10px", fontWeight: 900 }}>Approval</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <KV label="CHECKED BY" value={activeReport?.footer?.checkedBy} />
              <KV label="VERIFIED BY" value={activeReport?.footer?.verifiedBy} />
            </div>
            {activeReport?.meta?.createdAt && (
              <div style={{ marginTop: 10, fontSize: 12, opacity: .8 }}>
                <span>Created at: </span>
                <code>{activeReport.meta.createdAt}</code>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ===== طباعة CSS مختصر ===== */}
      <style>
        {`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute !important; inset: 0 !important; }
        }
        `}
      </style>
    </div>
  );
}

/* ================== Small components ================== */
function KV({ label, value, style }) {
  return (
    <div style={style}>
      <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 800, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px", background: "#fff", minHeight: 38 }}>
        {value || "—"}
      </div>
    </div>
  );
}
function ThumbGrid({ items = [], docMode = false }) {
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginTop: 8 };
  const cell = { border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", overflow: "hidden", position: "relative", minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 6 };
  const nameTag = { position: "absolute", bottom: 0, right: 0, left: 0, background: "rgba(255,255,255,.9)", borderTop: "1px solid #cbd5e1", padding: "4px 6px", fontSize: 11, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", direction: "ltr" };

  if (!Array.isArray(items) || items.length === 0) {
    return <div style={{ color: "#6b7280", marginTop: 6 }}>No attachments.</div>;
  }
  return (
    <div style={grid}>
      {items.map((it, i) => (
        <div style={cell} key={it.url || i}>
          {docMode ? (
            <a href={it.url} target="_blank" rel="noreferrer" style={{ fontWeight: 800, textDecoration: "underline" }}>
              Open document
            </a>
          ) : (
            <img src={it.url} alt={it.name || `img-${i}`} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          )}
          <div style={nameTag} title={it.name || ""}>{it.name || ""}</div>
        </div>
      ))}
    </div>
  );
}

/* ================= Utilities ================= */
function uniqueDates(rows) {
  const s = new Set(rows.map((r) => getEntryDate(r.payload)).filter(Boolean));
  return Array.from(s).sort((a, b) => b.localeCompare(a)); // أحدث أولاً
}
