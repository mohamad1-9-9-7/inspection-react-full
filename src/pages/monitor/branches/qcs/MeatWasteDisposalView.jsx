// src/pages/monitor/branches/qcs/MeatWasteDisposalView.jsx
// QCS — Meat Waste Disposal — Records list + Professional PDF Export

import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addFullPageImage, pdfSafeText } from "./pdfImageUtils";
import { GlassShell, KpiGrid, ReportActions } from "../_shared/branchViewKit";
import { deleteReport, downloadReportsJson, listReports, reportId } from "../_shared/reportApi";

const TYPE = "qcs_meat_waste_disposal";

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" },
  recordCard: { background: "#fff", border: "1.5px solid #fecaca", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 6px 18px rgba(220,38,38,0.06)" },
  recordHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingBottom: 10, borderBottom: "2px solid #fecaca", marginBottom: 10 },
  title: { fontSize: 18, fontWeight: 950, color: "#0f172a", margin: "0 0 8px" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  topActions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  filters: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 },
  input: { padding: "9px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "inherit", minWidth: 180 },
  btn: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 13 },
  btnPdf: { background: "linear-gradient(180deg,#dc2626,#b91c1c)", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 6 },
  btnDanger: { background: "linear-gradient(180deg,#ef4444,#dc2626)", color: "#fff", border: "1.5px solid #b91c1c", padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 12 },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 10, marginBottom: 12 },
  kpi: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, textAlign: "center" },
  kpiLabel: { fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase" },
  kpiValue: { fontSize: 26, fontWeight: 950, marginTop: 4 },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 800 },
  entryRow: { background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10, padding: 10, marginTop: 8 },
  pill: (color, bg) => ({ display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 15, fontWeight: 950, color, background: bg, border: `1px solid ${color}33`, marginInlineEnd: 6 }),
  imgGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 6, marginTop: 6 },
  imgThumb: { width: "100%", height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "zoom-in", display: "block" },
  meta: { fontSize: 15, color: "#475569", fontWeight: 700, marginTop: 4 },
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
  btnExport: (busy) => ({ padding: "10px 24px", background: busy ? "#94a3b8" : "linear-gradient(180deg,#dc2626,#b91c1c)", color: "#fff", border: "none", borderRadius: 10, cursor: busy ? "wait" : "pointer", fontWeight: 800, fontSize: 13 }),
};

function fmtDate(s) { if (!s) return "—"; try { const d = new Date(s); if (isNaN(d.getTime())) return s; return d.toLocaleDateString("en-GB"); } catch { return s; } }

async function buildMeatWastePDF(records, includeImages) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 12;

  // ── Header band ──
  doc.setFillColor(127, 29, 29);
  doc.rect(0, 0, pw, 32, "F");
  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, pw, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Meat Waste Disposal Records", pw / 2, 11, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("AL MAWASHI — QCS | Quality Control System", pw / 2, 18, { align: "center" });
  doc.setFontSize(7.5);
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")}  |  Total Records: ${records.length}`, pw / 2, 25, { align: "center" });

  let y = 36;

  // ── KPI Summary ──
  const totalKg = records.reduce((s, r) => {
    const p = r?.payload || {};
    return s + (Number(p.totals?.totalKg) || (p.entries || []).reduce((ss, e) => ss + (Number(e.quantityKg) || 0), 0));
  }, 0);
  const totalEntries = records.reduce((s, r) => s + (r?.payload?.entries || []).length, 0);

  const kpis = [
    { label: "Total Records", val: String(records.length), r: 3, g: 105, b: 161 },
    { label: "Total Entries", val: String(totalEntries), r: 147, g: 51, b: 234 },
    { label: "Total Qty (kg)", val: totalKg.toFixed(2), r: 185, g: 28, b: 28 },
  ];
  const bw = (pw - M * 2 - 8) / 3;
  kpis.forEach((k, i) => {
    const x = M + i * (bw + 4);
    doc.setFillColor(k.r, k.g, k.b);
    doc.roundedRect(x, y, bw, 18, 2, 2, "F");
    doc.setTextColor(255);
    doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
    doc.text(k.label, x + bw / 2, y + 6.5, { align: "center" });
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text(k.val, x + bw / 2, y + 14, { align: "center" });
  });
  y += 24;

  // ── Records ──
  for (let ri = 0; ri < records.length; ri++) {
    const rec = records[ri];
    const p = rec?.payload || {};
    const entries = p.entries || [];
    const recKg = Number(p.totals?.totalKg) || entries.reduce((s, e) => s + (Number(e.quantityKg) || 0), 0);

    if (y > ph - 55) { doc.addPage(); y = M; }

    const hdrText = `#${ri + 1}  |  ${fmtDate(p.reportDate)}  |  ${pdfSafeText(p.location)}  |  By: ${pdfSafeText(p.disposedBy)}  |  Total: ${recKg.toFixed(2)} kg`;

    autoTable(doc, {
      startY: y,
      head: [
        [{ content: hdrText, colSpan: 7, styles: { fillColor: [254, 202, 202], textColor: [127, 29, 29], fontStyle: "bold", fontSize: 8, halign: "left", cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } } }],
        ["#", "Meat Type", "Qty (kg)", "Reason", "Method", "Product Code", "Batch No"],
      ],
      body: entries.length > 0
        ? entries.map((e, j) => [
            j + 1,
            pdfSafeText(e.meatType),
            e.quantityKg != null ? String(e.quantityKg) : "—",
            pdfSafeText(e.reason),
            pdfSafeText(e.disposalMethod),
            pdfSafeText(e.productCode),
            pdfSafeText(e.batchNo),
          ])
        : [[{ content: "No entries recorded", colSpan: 7, styles: { halign: "center", textColor: [150, 150, 150] } }]],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3, font: "helvetica", overflow: "linebreak" },
      headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [255, 249, 219] },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        2: { halign: "center", cellWidth: 20 },
        5: { cellWidth: 30 },
        6: { cellWidth: 26 },
      },
      margin: { left: M, right: M },
    });

    y = doc.lastAutoTable.finalY + 2;

    // Notes / signatures
    const noteParts = [
      p.witness ? `Witness: ${pdfSafeText(p.witness)}` : null,
      p.supervisor ? `Supervisor: ${pdfSafeText(p.supervisor)}` : null,
      p.generalNotes ? `Notes: ${pdfSafeText(p.generalNotes)}` : null,
    ].filter(Boolean);
    if (noteParts.length) {
      doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(100, 116, 139);
      const lines = doc.splitTextToSize(noteParts.join("   |   "), pw - M * 2);
      if (y + lines.length * 4 + 4 > ph - 10) { doc.addPage(); y = M; }
      doc.text(lines, M + 2, y + 4);
      y += lines.length * 4 + 5;
    }

    // Images
    if (includeImages) {
      const imgs = entries.flatMap((e, entryIndex) =>
        (e.images || []).filter(Boolean).map((src, imgIndex) => ({
          src,
          entryIndex,
          imgIndex,
          meatType: e.meatType,
          quantityKg: e.quantityKg,
          reason: e.reason,
          productCode: e.productCode,
          batchNo: e.batchNo,
        }))
      );
      if (imgs.length > 0) {
        for (let k = 0; k < imgs.length; k++) {
          const img = imgs[k];
          doc.addPage();
          try {
            await addFullPageImage(doc, img.src, {
              title: `Meat Waste Attachment ${ri + 1}.${img.entryIndex + 1}.${img.imgIndex + 1}`,
              subtitle: `${fmtDate(p.reportDate)} | ${pdfSafeText(p.location)} | Entry #${img.entryIndex + 1} | ${pdfSafeText(img.meatType)} | ${img.quantityKg || "-"} kg | ${pdfSafeText(img.reason)} | Batch: ${pdfSafeText(img.batchNo)} | Code: ${pdfSafeText(img.productCode)}`,
              accent: [185, 28, 28],
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
        y = ph;
      }
    }

    y += 6;
    if (ri < records.length - 1 && y < ph - 12) {
      doc.setDrawColor(220, 38, 38); doc.setLineWidth(0.25);
      doc.line(M, y - 3, pw - M, y - 3);
    }
  }

  // ── Page footers ──
  const np = doc.internal.getNumberOfPages();
  for (let i = 1; i <= np; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(160);
    doc.text(`Page ${i} of ${np}`, pw - M, ph - 5, { align: "right" });
    doc.text("AL MAWASHI — Meat Waste Disposal | QCS", M, ph - 5);
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2);
    doc.line(M, ph - 8, pw - M, ph - 8);
  }

  return doc;
}

export default function MeatWasteDisposalView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [meatFilter, setMeatFilter] = useState("all");
  const [preview, setPreview] = useState({ open: false, src: "" });

  // Export modal state
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

  const meatTypes = useMemo(() => {
    const set = new Set();
    items.forEach((r) => (r?.payload?.entries || []).forEach((e) => e.meatType && set.add(e.meatType)));
    return [...set];
  }, [items]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    return items.filter((r) => {
      const p = r?.payload || {};
      const txt = [p.location, p.disposedBy, p.witness, p.supervisor, p.generalNotes,
        ...(p.entries || []).flatMap((e) => [e.meatType, e.reason, e.reasonDetails, e.disposalMethod, e.productCode, e.batchNo, e.notes])
      ].map((x) => String(x || "").toLowerCase()).join(" ");
      const matchesQ = !q || txt.includes(q);
      const matchesMonth = !month || String(p.reportDate || "").startsWith(month);
      const matchesMeat = meatFilter === "all" || (p.entries || []).some((e) => e.meatType === meatFilter);
      return matchesQ && matchesMonth && matchesMeat;
    });
  }, [items, search, month, meatFilter]);

  const kpis = useMemo(() => {
    let totalKg = 0, totalEntries = 0;
    filtered.forEach((r) => {
      const p = r?.payload || {};
      totalKg += Number(p.totals?.totalKg) || (p.entries || []).reduce((s, e) => s + (Number(e.quantityKg) || 0), 0);
      totalEntries += (p.entries || []).length;
    });
    return { records: filtered.length, totalKg: totalKg.toFixed(2), totalEntries };
  }, [filtered]);

  // Compute export record count for modal display
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
      const doc = await buildMeatWastePDF(recs, exportModal.includeImages);
      doc.save(`MeatWaste_Disposal_${new Date().toISOString().slice(0, 10)}.pdf`);
      setExportModal(m => ({ ...m, open: false }));
    } catch (e) {
      alert("Export failed: " + (e?.message || e));
    } finally {
      setExporting(false);
    }
  }

  const exportJSON = () => downloadReportsJson(TYPE, filtered, "QCS_MeatWaste_Disposal");

  return (
    <GlassShell
      icon="🥩"
      title="Meat Waste Disposal Records"
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
          { label: "Total Records", value: kpis.records, color: "#0369a1" },
          { label: "Total Entries", value: kpis.totalEntries, color: "#9333ea" },
          { label: "Total Quantity (kg)", value: kpis.totalKg, color: "#dc2626" },
        ]}
      />

      <div style={S.filters}>
        <input style={S.input} placeholder="Search by meat, reason, batch, name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <input type="month" style={S.input} value={month} onChange={(e) => setMonth(e.target.value)} />
        <select style={S.input} value={meatFilter} onChange={(e) => setMeatFilter(e.target.value)}>
          <option value="all">All meat types</option>
          {meatTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || month || meatFilter !== "all") && (
          <button style={S.btn} onClick={() => { setSearch(""); setMonth(""); setMeatFilter("all"); }}>Clear filters</button>
        )}
      </div>

      {loading && <div style={S.empty}>Loading...</div>}
      {!loading && filtered.length === 0 && (
        <div style={S.empty}>{items.length === 0 ? "No records yet." : "No matching results."}</div>
      )}

      {filtered.map((rec, i) => {
        const p = rec?.payload || {};
        const entries = p.entries || [];
        const totalKg = Number(p.totals?.totalKg) || entries.reduce((s, e) => s + (Number(e.quantityKg) || 0), 0);
        return (
          <div key={reportId(rec) || i} style={S.recordCard}>
            <div style={S.recordHeader}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 950, color: "#0f172a" }}>
                  📅 {fmtDate(p.reportDate)} — {p.location || "—"}
                </div>
                <div style={S.meta}>
                  Disposed by: {p.disposedBy || "—"}
                  {p.witness && ` • Witness: ${p.witness}`}
                  {p.supervisor && ` • Supervisor: ${p.supervisor}`}
                </div>
                <div style={S.meta}>
                  <span style={S.pill("#dc2626", "#fee2e2")}>{totalKg.toFixed(2)} kg</span>
                  <span style={S.pill("#9333ea", "#f3e8ff")}>{entries.length} entries</span>
                </div>
              </div>
              <button style={S.btnDanger} onClick={() => del(reportId(rec))} data-delete-action="true">Delete Record</button>
            </div>

            {p.generalNotes && (
              <div style={{ fontSize: 16, color: "#475569", fontWeight: 700, marginBottom: 8 }}>
                Notes: {p.generalNotes}
              </div>
            )}

            {entries.map((e, j) => (
              <div key={j} style={S.entryRow}>
                <div style={{ fontWeight: 900, color: "#854d0e", marginBottom: 4 }}>Entry #{j + 1}</div>
                <div>
                  <span style={S.pill("#0369a1", "#e0f2fe")}>{e.meatType}</span>
                  <span style={S.pill("#dc2626", "#fee2e2")}>{e.quantityKg} kg</span>
                  <span style={S.pill("#a16207", "#fef3c7")}>{e.reason}</span>
                  <span style={S.pill("#15803d", "#dcfce7")}>{e.disposalMethod}</span>
                  {e.productCode && <span style={S.pill("#475569", "#f1f5f9")}>Code: {e.productCode}</span>}
                  {e.batchNo && <span style={S.pill("#475569", "#f1f5f9")}>Batch: {e.batchNo}</span>}
                </div>
                {e.reasonDetails && <div style={S.meta}>📌 {e.reasonDetails}</div>}
                {e.notes && <div style={S.meta}>Notes: {e.notes}</div>}
                {e.images?.length > 0 && (
                  <div style={S.imgGrid}>
                    {e.images.map((u, k) => (
                      <img key={`${u}-${k}`} src={u} alt={`Attachment ${k+1}`} style={S.imgThumb} onClick={() => setPreview({ open: true, src: u })} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

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
                <input type="radio" name="mw_range" value="all"
                  checked={exportModal.rangeMode === "all"}
                  onChange={() => setExportModal(m => ({ ...m, rangeMode: "all" }))} />
                <span style={S.radioLabel}>All displayed records ({filtered.length})</span>
              </label>

              <label style={S.radioRow}>
                <input type="radio" name="mw_range" value="range"
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
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>Attachment images may take extra time to export.</div>
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
