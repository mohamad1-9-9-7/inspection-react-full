// src/pages/monitor/branches/qcs/GarbageDisposalView.jsx
// QCS — Garbage / Waste Disposal — Records list + Professional PDF Export

import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addFullPageImage, pdfSafeText } from "./pdfImageUtils";
import { GlassShell, KpiGrid, ReportActions, ResponsiveTableWrap } from "../_shared/branchViewKit";
import { deleteReport, downloadReportsJson, listReports, reportId } from "../_shared/reportApi";

const TYPE = "qcs_garbage_disposal";

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" },
  title: { fontSize: 18, fontWeight: 950, color: "#0f172a", margin: "0 0 8px" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  topActions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  filters: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 },
  input: { padding: "9px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "inherit", minWidth: 180 },
  btn: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 13 },
  btnPdf: { background: "linear-gradient(180deg,#16a34a,#15803d)", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 6 },
  btnDanger: { background: "linear-gradient(180deg,#ef4444,#dc2626)", color: "#fff", border: "1.5px solid #b91c1c", padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 12 },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 10, marginBottom: 12 },
  kpi: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, textAlign: "center" },
  kpiLabel: { fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase" },
  kpiValue: { fontSize: 26, fontWeight: 950, marginTop: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 18, background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 16px rgba(2,6,23,0.06)" },
  th: { padding: "12px 14px", background: "linear-gradient(180deg,#16a34a,#15803d)", color: "#fff", textAlign: "start", fontWeight: 900, fontSize: 15 },
  td: { padding: "11px 14px", borderTop: "1px solid #e2e8f0", fontWeight: 700, verticalAlign: "middle", fontSize: 18 },
  imgThumbBig: { width: 70, height: 70, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "zoom-in" },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 800 },
  imgThumb: { width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "zoom-in" },
  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 },
  modal: { background: "#fff", borderRadius: 18, padding: 28, width: 460, maxWidth: "95vw", boxShadow: "0 24px 72px rgba(0,0,0,0.28)" },
  modalTitle: { margin: "0 0 20px", fontSize: 17, fontWeight: 950, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 },
  sectionLabel: { fontWeight: 800, fontSize: 13, color: "#374151", marginBottom: 8, display: "block" },
  radioRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" },
  radioLabel: { fontWeight: 700, fontSize: 13, color: "#1e293b" },
  checkRow: { display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1.5px solid #e2e8f0", cursor: "pointer", marginBottom: 20 },
  dateInput: { padding: "8px 10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontWeight: 700, fontSize: 13, fontFamily: "inherit" },
  modalFooter: { display: "flex", gap: 10, justifyContent: "flex-end" },
  btnCancel: { padding: "10px 20px", border: "1.5px solid #cbd5e1", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13, background: "#fff", color: "#0f172a" },
  btnExport: (busy) => ({ padding: "10px 24px", background: busy ? "#94a3b8" : "linear-gradient(180deg,#16a34a,#15803d)", color: "#fff", border: "none", borderRadius: 10, cursor: busy ? "wait" : "pointer", fontWeight: 800, fontSize: 13 }),
};

function fmtDate(s) { if (!s) return "—"; try { const d = new Date(s); if (isNaN(d.getTime())) return s; return d.toLocaleDateString("en-GB"); } catch { return s; } }

async function buildGarbagePDF(records, includeImages) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();   // 297 (landscape)
  const ph = doc.internal.pageSize.getHeight();  // 210
  const M = 12;

  // ── Header band ──
  doc.setFillColor(21, 128, 61);
  doc.rect(0, 0, pw, 30, "F");
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, pw, 26, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Garbage & Waste Disposal Records", pw / 2, 11, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("AL MAWASHI — QCS | Quality Control System", pw / 2, 18, { align: "center" });
  doc.setFontSize(7.5);
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")}  |  Total Records: ${records.length}`, pw / 2, 24, { align: "center" });

  let y = 34;

  // ── KPI Summary ──
  let totalKg = 0, totalAmount = 0;
  records.forEach(r => {
    const p = r?.payload || {};
    const q = Number(p.quantity) || 0;
    if (p.unit === "kg") totalKg += q;
    else if (p.unit === "ton") totalKg += q * 1000;
    totalAmount += Number(p.vendor?.invoiceAmount) || 0;
  });

  const kpis = [
    { label: "Total Records", val: String(records.length), r: 3, g: 105, b: 161 },
    { label: "Total Qty (kg)", val: String(Math.round(totalKg)), r: 21, g: 128, b: 61 },
    { label: "Total Amount (AED)", val: totalAmount.toFixed(2), r: 161, g: 98, b: 7 },
  ];
  const bw = (pw - M * 2 - 8) / 3;
  kpis.forEach((k, i) => {
    const x = M + i * (bw + 4);
    doc.setFillColor(k.r, k.g, k.b);
    doc.roundedRect(x, y, bw, 16, 2, 2, "F");
    doc.setTextColor(255);
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    doc.text(k.label, x + bw / 2, y + 6.5, { align: "center" });
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text(k.val, x + bw / 2, y + 13, { align: "center" });
  });
  y += 22;

  // ── Main Table ──
  const tableBody = records.map((rec, i) => {
    const p = rec?.payload || {};
    return [
      i + 1,
      fmtDate(p.reportDate),
      pdfSafeText(p.location),
      pdfSafeText(p.wasteType),
      p.quantity ? `${p.quantity} ${p.unit || ""}` : "—",
      pdfSafeText(p.vendor?.name),
      pdfSafeText(p.vendor?.invoiceNumber),
      p.vendor?.invoiceAmount ? `${p.vendor.invoiceAmount} AED` : "—",
      pdfSafeText(p.disposedBy),
      pdfSafeText(p.supervisor),
      p.notes ? pdfSafeText(p.notes.length > 40 ? p.notes.slice(0, 40) + "..." : p.notes) : "—",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Date", "Location", "Waste Type", "Quantity", "Company", "Invoice #", "Amount", "Disposed By", "Supervisor", "Notes"]],
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 3, font: "helvetica", overflow: "linebreak" },
    headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 22 },
      3: { cellWidth: 26 },
      4: { cellWidth: 20 },
      6: { cellWidth: 22 },
      7: { cellWidth: 24 },
    },
    margin: { left: M, right: M },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Images Section (if requested) ──
  if (includeImages) {
    const recsWithImages = records.filter(r => {
      const p = r?.payload || {};
      return p.images?.invoice || (p.images?.extras || []).length > 0;
    });

    if (recsWithImages.length > 0) {
      doc.addPage();
      y = M;

      // Section header
      doc.setFillColor(21, 128, 61);
      doc.roundedRect(M, y, pw - M * 2, 10, 2, 2, "F");
      doc.setTextColor(255);
      doc.setFontSize(8); doc.setFont("helvetica", "bold");
      doc.text("Attachments / Images", pw / 2, y + 7, { align: "center" });
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7); doc.setFont("helvetica", "normal");
      doc.text("Each attachment is exported on a full page to keep invoices and evidence readable.", pw / 2, y + 17, { align: "center" });

      for (const [recIndex, rec] of recsWithImages.entries()) {
        const p = rec?.payload || {};
        const allImgs = [
          ...(p.images?.invoice ? [{ src: p.images.invoice, label: "Invoice" }] : []),
          ...(p.images?.extras || []).map((src, idx) => ({ src, label: `Extra Image ${idx + 1}` })),
        ].filter(img => img.src);

        for (const [imgIndex, img] of allImgs.entries()) {
          doc.addPage();
          try {
            await addFullPageImage(doc, img.src, {
              title: `Garbage Disposal Attachment ${recIndex + 1}.${imgIndex + 1} - ${img.label}`,
              subtitle: `${fmtDate(p.reportDate)} | ${pdfSafeText(p.location)} | ${pdfSafeText(p.wasteType)} | Invoice: ${pdfSafeText(p.vendor?.invoiceNumber)}`,
              accent: [21, 128, 61],
            });
          } catch {
            doc.setTextColor(185, 28, 28);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("Failed to load attachment image.", M, M + 12);
            doc.setTextColor(71, 85, 105);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(String(img.src).slice(0, 120), M, M + 20);
          }
        }
      }
    }
  }

  // ── Page footers ──
  const np = doc.internal.getNumberOfPages();
  for (let i = 1; i <= np; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(160);
    doc.text(`Page ${i} of ${np}`, pw - M, ph - 5, { align: "right" });
    doc.text("AL MAWASHI — Garbage Disposal | QCS", M, ph - 5);
    doc.setDrawColor(220); doc.setLineWidth(0.2);
    doc.line(M, ph - 8, pw - M, ph - 8);
  }

  return doc;
}

export default function GarbageDisposalView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [wasteFilter, setWasteFilter] = useState("all");
  const [preview, setPreview] = useState({ open: false, src: "" });

  // Export modal
  const [exportModal, setExportModal] = useState({ open: false, rangeMode: "all", from: "", to: "", includeImages: true });
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const arr = await listReports(TYPE);
      arr.sort((a, b) => new Date(b?.payload?.reportDate || 0) - new Date(a?.payload?.reportDate || 0));
      setItems(arr);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!window.confirm("Delete this record permanently?")) return;
    try {
      await deleteReport(id);
      load();
    } catch (e) { alert("Delete failed: " + (e?.message || e)); }
  }

  const wasteTypes = useMemo(() => {
    const set = new Set();
    items.forEach((r) => { const t = r?.payload?.wasteType; if (t) set.add(t); });
    return [...set];
  }, [items]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    return items.filter((r) => {
      const p = r?.payload || {};
      const txt = [p.location, p.vendor?.name, p.vendor?.invoiceNumber, p.disposedBy, p.supervisor, p.notes]
        .map((x) => String(x || "").toLowerCase()).join(" ");
      const matchesQ = !q || txt.includes(q);
      const matchesMonth = !month || String(p.reportDate || "").startsWith(month);
      const matchesType = wasteFilter === "all" || p.wasteType === wasteFilter;
      return matchesQ && matchesMonth && matchesType;
    });
  }, [items, search, month, wasteFilter]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    let totalKg = 0, totalAmount = 0;
    filtered.forEach((r) => {
      const p = r?.payload || {};
      const q = Number(p.quantity) || 0;
      if (p.unit === "kg") totalKg += q;
      else if (p.unit === "ton") totalKg += q * 1000;
      totalAmount += Number(p.vendor?.invoiceAmount) || 0;
    });
    return { total, totalKg: Math.round(totalKg), totalAmount: totalAmount.toFixed(2) };
  }, [filtered]);

  const exportCount = useMemo(() => {
    if (exportModal.rangeMode === "all") return filtered.length;
    return filtered.filter(r => {
      const d = r?.payload?.reportDate || "";
      return (!exportModal.from || d >= exportModal.from) && (!exportModal.to || d <= exportModal.to);
    }).length;
  }, [filtered, exportModal.rangeMode, exportModal.from, exportModal.to]);

  async function doExport() {
    let recs = filtered;
    if (exportModal.rangeMode === "range") {
      recs = filtered.filter(r => {
        const d = r?.payload?.reportDate || "";
        return (!exportModal.from || d >= exportModal.from) && (!exportModal.to || d <= exportModal.to);
      });
    }
    if (recs.length === 0) { alert("No records found for the selected export range."); return; }
    setExporting(true);
    try {
      const doc = await buildGarbagePDF(recs, exportModal.includeImages);
      doc.save(`Garbage_Disposal_${new Date().toISOString().slice(0, 10)}.pdf`);
      setExportModal(m => ({ ...m, open: false }));
    } catch (e) {
      alert("Export failed: " + (e?.message || e));
    } finally {
      setExporting(false);
    }
  }

  const exportJSON = () => downloadReportsJson(TYPE, filtered, "QCS_Garbage_Disposal");

  return (
    <GlassShell
      icon="🗑️"
      title="Garbage Disposal Records"
      actions={
        <ReportActions
          onPdf={() => setExportModal(m => ({ ...m, open: true }))}
          onJson={exportJSON}
          onRefresh={load}
          refreshing={loading}
          jsonDisabled={filtered.length === 0}
        />
      }
    >

      <KpiGrid
        items={[
          { label: "Total Records", value: kpis.total, color: "#0369a1" },
          { label: "Total Quantity (kg)", value: kpis.totalKg, color: "#16a34a" },
          { label: "Total Invoices (AED)", value: kpis.totalAmount, color: "#a16207" },
        ]}
      />

      <div style={S.filters}>
        <input style={S.input} placeholder="Search by company, location, name, invoice..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <input type="month" style={S.input} value={month} onChange={(e) => setMonth(e.target.value)} />
        <select style={S.input} value={wasteFilter} onChange={(e) => setWasteFilter(e.target.value)}>
          <option value="all">All types</option>
          {wasteTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || month || wasteFilter !== "all") && (
          <button style={S.btn} onClick={() => { setSearch(""); setMonth(""); setWasteFilter("all"); }}>Clear filters</button>
        )}
      </div>

      {loading && <div style={S.empty}>Loading...</div>}
      {!loading && filtered.length === 0 && (
        <div style={S.empty}>{items.length === 0 ? "No records yet." : "No matching results."}</div>
      )}

      {filtered.length > 0 && (
        <ResponsiveTableWrap>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Date</th>
                <th style={S.th}>Location</th>
                <th style={S.th}>Waste Type</th>
                <th style={S.th}>Quantity</th>
                <th style={S.th}>Company</th>
                <th style={S.th}>Invoice No.</th>
                <th style={S.th}>Amount</th>
                <th style={S.th}>Disposed By</th>
                <th style={S.th}>Invoice</th>
                <th style={S.th}>Images</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec, i) => {
                const p = rec?.payload || {};
                const inv = p?.images?.invoice;
                const extras = p?.images?.extras || [];
                return (
                  <tr key={reportId(rec) || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                    <td style={S.td}>{fmtDate(p.reportDate)}</td>
                    <td style={S.td}>{p.location || "—"}</td>
                    <td style={S.td}>{p.wasteType || "—"}</td>
                    <td style={S.td}>{p.quantity ? `${p.quantity} ${p.unit || ""}` : "—"}</td>
                    <td style={S.td}>{p.vendor?.name || "—"}</td>
                    <td style={S.td}>{p.vendor?.invoiceNumber || "—"}</td>
                    <td style={S.td}>{p.vendor?.invoiceAmount ? `${p.vendor.invoiceAmount} AED` : "—"}</td>
                    <td style={S.td}>{p.disposedBy || "—"}</td>
                    <td style={S.td}>
                      {inv ? (
                        <img src={inv} alt="Invoice" style={S.imgThumb} onClick={() => setPreview({ open: true, src: inv })} />
                      ) : "—"}
                    </td>
                    <td style={S.td}>
                      {extras.length === 0 ? "—" : (
                        <div style={{ display: "flex", gap: 4 }}>
                          {extras.slice(0, 3).map((u, j) => (
                            <img key={`${u}-${j}`} src={u} alt={`Extra ${j+1}`} style={S.imgThumb} onClick={() => setPreview({ open: true, src: u })} />
                          ))}
                          {extras.length > 3 && <span style={{ alignSelf: "center", fontWeight: 800, color: "#64748b" }}>+{extras.length - 3}</span>}
                        </div>
                      )}
                    </td>
                    <td style={S.td}>
                      <button style={S.btnDanger} onClick={() => del(reportId(rec))} data-delete-action="true">Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ResponsiveTableWrap>
      )}

      {/* Image Lightbox */}
      {preview.open && (
        <div onClick={() => setPreview({ open: false, src: "" })}
             style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, cursor: "zoom-out" }}>
          <img src={preview.src} alt="Preview" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12 }} />
        </div>
      )}

      {/* PDF Export Modal */}
      {exportModal.open && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget && !exporting) setExportModal(m => ({ ...m, open: false })); }}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={S.modalTitle}>
                <span style={{ fontSize: 22 }}>PDF</span>
                Export PDF
              </h3>
              {!exporting && (
                <button onClick={() => setExportModal(m => ({ ...m, open: false }))}
                  style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>✕</button>
              )}
            </div>

            {/* Range section */}
            <div style={{ marginBottom: 18 }}>
              <span style={S.sectionLabel}>Export Range</span>

              <label style={S.radioRow}>
                <input type="radio" name="gb_range" value="all"
                  checked={exportModal.rangeMode === "all"}
                  onChange={() => setExportModal(m => ({ ...m, rangeMode: "all" }))} />
                <span style={S.radioLabel}>All displayed records ({filtered.length})</span>
              </label>

              <label style={S.radioRow}>
                <input type="radio" name="gb_range" value="range"
                  checked={exportModal.rangeMode === "range"}
                  onChange={() => setExportModal(m => ({ ...m, rangeMode: "range" }))} />
                <span style={S.radioLabel}>Date Range</span>
              </label>

              {exportModal.rangeMode === "range" && (
                <div style={{ display: "flex", gap: 10, marginTop: 10, paddingInlineStart: 22 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 4 }}>From</div>
                    <input type="date" value={exportModal.from}
                      onChange={e => setExportModal(m => ({ ...m, from: e.target.value }))}
                      style={S.dateInput} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 4 }}>To</div>
                    <input type="date" value={exportModal.to}
                      onChange={e => setExportModal(m => ({ ...m, to: e.target.value }))}
                      style={S.dateInput} />
                  </div>
                </div>
              )}

              {exportModal.rangeMode === "range" && (
                <div style={{ marginTop: 8, paddingInlineStart: 22, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                  {exportCount} records will be exported
                </div>
              )}
            </div>

            {/* Include images */}
            <label style={S.checkRow}>
              <input type="checkbox" checked={exportModal.includeImages}
                onChange={e => setExportModal(m => ({ ...m, includeImages: e.target.checked }))}
                style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#1e293b" }}>Include Images</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>Invoice and attachment images may take extra time to export.</div>
              </div>
            </label>

            {/* Footer */}
            <div style={S.modalFooter}>
              <button style={S.btnCancel} onClick={() => setExportModal(m => ({ ...m, open: false }))} disabled={exporting}>
                Cancel
              </button>
              <button style={S.btnExport(exporting)} onClick={doExport} disabled={exporting}>
                {exporting ? "Exporting..." : `Export (${exportCount} records)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </GlassShell>
  );
}
