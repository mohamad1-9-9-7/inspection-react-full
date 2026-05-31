// src/pages/admin/QCSRawMaterialView/index.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import SidebarTree from "./SidebarTree";
import ReportDetails from "./ReportDetails";
import "./QCSRawMaterialView.css";
import {
  fetchFromServer,
  mergeUniqueById,
  loadFromLocal,
  saveToLocal,
  saveToSession,
  loadFromSession,
  upsertReportOnServer,
  deleteOnServer,
  groupByYMD,
  getDisplayId,
  getCreatedDate,
  base64ToFile,
  countBase64Certs,
  uploadImageViaServer,
} from "./viewUtils";

export default function QCSRawMaterialView() {
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [migrating, setMigrating]         = useState(false);
  const [migrateProgress, setMigrateProgress] = useState({ done: 0, total: 0 });

  // ── filters ──
  const [statusFilter, setStatusFilter] = useState("");   // "" | "Acceptable" | "Average" | "Not OK"
  const [typeFilter,   setTypeFilter]   = useState("");   // "" | shipmentType string
  const [dateFrom,     setDateFrom]     = useState("");   // "YYYY-MM-DD"
  const [dateTo,       setDateTo]       = useState("");

  const abortRef = useRef(null);

  // initial load + refresh hooks
  const refresh = async () => {
    setServerErr("");
    setLoadingServer(true);
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const server = await fetchFromServer(abortRef.current.signal);
      const merged = mergeUniqueById(server, loadFromLocal()).sort((a, b) =>
        String(b.createdAt || b.date || "").localeCompare(
          String(a.createdAt || a.date || "")
        )
      );
      setReports(merged);
      saveToLocal(merged);   // persists stripped list to localStorage
      saveToSession(merged); // fast cache for next refresh (cleared on tab close)
    } catch (e) {
      if (e.name !== "AbortError") setServerErr("Unable to fetch from server now.");
    } finally {
      setLoadingServer(false);
    }
  };

  useEffect(() => {
    // Priority: sessionStorage (fastest) → localStorage → empty
    const session = loadFromSession();
    const local   = loadFromLocal();
    const initial = (session.length >= local.length ? session : local)
      .sort((a, b) =>
        String(b.createdAt || b.date || "").localeCompare(
          String(a.createdAt || a.date || "")
        )
      );
    setReports(initial);
    refresh();
    const onFocus   = () => refresh();
    const onStorage = () => {
      const updated = loadFromLocal().sort((a, b) =>
        String(b.createdAt || b.date || "").localeCompare(
          String(a.createdAt || a.date || "")
        )
      );
      setReports(updated);
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      abortRef.current?.abort();
    };
  }, []);

  // keep selection valid
  useEffect(() => {
    if (!reports.length) {
      setSelectedReportId(null);
      return;
    }
    if (!reports.some((r) => r.id === selectedReportId))
      setSelectedReportId(reports[0].id);
  }, [reports, selectedReportId]);

  // update helper + sync server
  const updateSelectedReport = (mutateFn) => {
    setReports((prev) => {
      const idx = prev.findIndex((r) => r.id === selectedReportId);
      if (idx < 0) return prev;
      const updated = { ...prev[idx] };
      mutateFn(updated);
      const newList = [...prev];
      newList[idx] = updated;
      saveToLocal(newList);
      upsertReportOnServer(updated); // fire & forget
      return newList;
    });
  };

  // ===== delete report (now receives the whole record) =====
  const handleDelete = async (record) => {
    if (!record) return;
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    // تحديث الواجهة محليًا
    setReports((prev) => {
      const newList = prev.filter((r) => r.id !== record.id);
      saveToLocal(newList);
      if (selectedReportId === record.id) setSelectedReportId(newList[0]?.id || null);
      return newList;
    });

    const ok = await deleteOnServer(record);
    if (!ok) alert("⚠️ Failed to delete from server. Removed locally.");
  };

  // ===== Migrate base64 certificates → Cloudinary =====
  const handleMigrateBase64 = async () => {
    const toMigrate = reports.filter(
      (r) => typeof r?.certificateFile === "string" && r.certificateFile.startsWith("data:")
    );
    if (!toMigrate.length) {
      alert("✅ No base64 certificates found. All records already use Cloudinary URLs.");
      return;
    }
    if (
      !window.confirm(
        `Found ${toMigrate.length} report(s) with base64 certificates.\nUpload them to Cloudinary now?`
      )
    )
      return;

    setMigrating(true);
    setMigrateProgress({ done: 0, total: toMigrate.length });

    let updatedList = [...reports];
    let successCount = 0;
    const failures = [];

    for (const report of toMigrate) {
      try {
        const file = base64ToFile(
          report.certificateFile,
          report.certificateName || "certificate"
        );
        if (!file) throw new Error("base64ToFile returned null");

        const url = await uploadImageViaServer(file, "qcs_certificate");

        // patch in the local list
        updatedList = updatedList.map((r) =>
          r.id === report.id
            ? { ...r, certificateUrl: url, certificateFile: "" }
            : r
        );

        // persist to server
        const patched = updatedList.find((r) => r.id === report.id);
        if (patched) await upsertReportOnServer(patched);

        successCount++;
      } catch (err) {
        console.warn("Migration failed for report", report.id, err);
        failures.push(
          report?.generalInfo?.airwayBill ||
            report?.generalInfo?.invoiceNo ||
            report.id
        );
      }
      setMigrateProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setReports(updatedList);
    saveToLocal(updatedList);
    saveToSession(updatedList);
    setMigrating(false);
    setMigrateProgress({ done: 0, total: 0 });

    if (failures.length) {
      alert(
        `Migration done: ${successCount} ✅  |  ${failures.length} ❌ failed:\n${failures.join(", ")}`
      );
    } else {
      alert(`✅ Migration complete — ${successCount} certificate(s) uploaded to Cloudinary.`);
    }
  };

  // ── unique shipment types for filter dropdown ──
  const uniqueTypes = useMemo(
    () => [...new Set(reports.map((r) => r.shipmentType).filter(Boolean))].sort(),
    [reports]
  );

  // ── filter + tree ──
  const filteredReports = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();
    return reports.filter((r) => {
      // text search
      const hay = [
        r.generalInfo?.airwayBill,
        r.generalInfo?.invoiceNo,
        r.generalInfo?.supplierName,
        r.uniqueKey,
        r.shipmentType,
        r.status,
        getCreatedDate(r),
      ].filter(Boolean).join(" ").toLowerCase();
      if (term && !hay.includes(term)) return false;

      // status filter
      if (statusFilter) {
        const s = String(r.status || "").toLowerCase();
        if (statusFilter === "Acceptable" && s !== "acceptable") return false;
        if (statusFilter === "Average"    && s !== "average")    return false;
        if (statusFilter === "Not OK"     && (s === "acceptable" || s === "average" || !s)) return false;
      }

      // type filter
      if (typeFilter && r.shipmentType !== typeFilter) return false;

      // date range
      const d = getCreatedDate(r);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo   && d > dateTo)   return false;

      return true;
    });
  }, [reports, searchTerm, statusFilter, typeFilter, dateFrom, dateTo]);

  const tree = useMemo(
    () =>
      groupByYMD(
        filteredReports
          .slice()
          .sort((a, b) =>
            String(b.createdAt || b.date || "").localeCompare(
              String(a.createdAt || a.date || "")
            )
          )
      ),
    [filteredReports]
  );

  const selectedReport =
    filteredReports.find((r) => r.id === selectedReportId) ||
    filteredReports[0] ||
    null;

  // PDF export
  const printAreaRef = useRef(null);
  const mainRef = useRef(null);

  // ✅ NEW: thumbnails stay small in PDF + clickable -> jump to full-image pages
  const exportToPDF = async () => {
    if (!selectedReport) return alert("No selected report to export.");
    const target = printAreaRef.current;
    if (!target) return alert("Print area not found.");

    const prevOverflow = mainRef.current?.style.overflowY;
    const prevMax = mainRef.current?.style.maxHeight;
    const prevShadow = mainRef.current?.style.boxShadow;
    const prevBorder = mainRef.current?.style.border;

    // ✅ hide buttons/icons during PDF capture
    document.body.classList.add("qcs-pdf-exporting");

    try {
      if (mainRef.current) {
        mainRef.current.style.maxHeight = "none";
        mainRef.current.style.overflowY = "visible";
        mainRef.current.style.boxShadow = "none";
        mainRef.current.style.border = "none";
      }

      await new Promise((r) => setTimeout(r, 120));

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // 1) collect thumbnail rects (DOM positions) — based on .qcs-thumb
      const targetRect = target.getBoundingClientRect();
      const thumbs = Array.from(target.querySelectorAll("img.qcs-thumb"));
      const thumbRects = thumbs
        .map((el) => {
          const r = el.getBoundingClientRect();
          const idx = Number(el.dataset.thumbIndex || 0);
          const src = el.getAttribute("src") || "";
          if (!src) return null;
          return {
            index: idx,
            src,
            x: r.left - targetRect.left,
            y: r.top - targetRect.top,
            w: r.width,
            h: r.height,
          };
        })
        .filter(Boolean);

      // 2) capture report as one big canvas (thumbnails stay small)
      const scale = window.devicePixelRatio > 1 ? 2 : 1;
      const canvas = await html2canvas(target, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // mapping canvas px -> pdf mm
      const mmPerPx = imgWidth / canvas.width;

      // 3) add report pages
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      const reportPagesCount = pdf.getNumberOfPages();

      // 4) append FULL image pages (1 image per page)
      const images = Array.isArray(selectedReport?.images) ? selectedReport.images : [];
      const imagePageMap = new Map(); // imageIndex -> pageNumber

      const loadImageAsDataURL = async (src) => {
        if (!src) throw new Error("empty src");
        if (String(src).startsWith("data:image/")) return String(src);

        // try fetch -> blob
        try {
          const res = await fetch(src, { mode: "cors" });
          const blob = await res.blob();
          const b64 = await new Promise((resolve) => {
            const fr = new FileReader();
            fr.onloadend = () => resolve(String(fr.result || ""));
            fr.readAsDataURL(blob);
          });
          return b64;
        } catch {}

        // fallback: Image -> canvas (needs CORS headers)
        const img = await new Promise((resolve, reject) => {
          const im = new Image();
          im.crossOrigin = "anonymous";
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = src;
        });

        const c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return c.toDataURL("image/jpeg", 0.92);
      };

      for (let i = 0; i < images.length; i++) {
        const src = images[i];
        if (!src) continue;

        pdf.addPage();
        const pageNumber = pdf.getNumberOfPages();
        imagePageMap.set(i, pageNumber);

        pdf.setFontSize(12);
        pdf.text(`Attachment Image ${i + 1}`, 10, 12);

        try {
          const dataUrl = await loadImageAsDataURL(src);

          const margin = 10;
          const top = 18;
          const availW = pageWidth - margin * 2;
          const availH = pageHeight - top - margin;

          const im = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = dataUrl;
          });

          const iw = im.naturalWidth || im.width;
          const ih = im.naturalHeight || im.height;
          const ratio = Math.min(availW / iw, availH / ih);

          const w = iw * ratio;
          const h = ih * ratio;
          const x = (pageWidth - w) / 2;
          const y = top + (availH - h) / 2;

          pdf.addImage(dataUrl, "JPEG", x, y, w, h, undefined, "FAST");
        } catch (e) {
          pdf.setFontSize(11);
          pdf.text("Failed to load image (CORS or unsupported format).", 10, 26);
          pdf.setFontSize(9);
          pdf.text(String(src).slice(0, 90), 10, 32);
        }
      }

      // 5) add clickable links on thumbnails (jump to full image pages)
      for (const t of thumbRects) {
        const targetPage = imagePageMap.get(t.index);
        if (!targetPage) continue;

        const cx = t.x * scale;
        const cy = t.y * scale;
        const cw = t.w * scale;
        const ch = t.h * scale;

        const pdfX = cx * mmPerPx;
        const pdfYglobal = cy * mmPerPx;
        const pdfW = cw * mmPerPx;
        const pdfH = ch * mmPerPx;

        const pageIndex0 = Math.floor(pdfYglobal / pageHeight);
        const pageNumber = pageIndex0 + 1;
        if (pageNumber < 1 || pageNumber > reportPagesCount) continue;

        const pdfY = pdfYglobal - pageIndex0 * pageHeight;

        pdf.setPage(pageNumber);
        pdf.link(pdfX, pdfY, pdfW, pdfH, { pageNumber: targetPage });
      }

      const idForFile =
        selectedReport?.generalInfo?.airwayBill || selectedReport?.generalInfo?.invoiceNo;
      const filename = idForFile ? `QCS-${idForFile}` : `QCS-Report-${Date.now()}`;
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to create PDF. Make sure jspdf and html2canvas are installed.");
    } finally {
      document.body.classList.remove("qcs-pdf-exporting");

      if (mainRef.current) {
        mainRef.current.style.maxHeight = prevMax || "";
        mainRef.current.style.overflowY = prevOverflow || "";
        mainRef.current.style.boxShadow = prevShadow || "";
        mainRef.current.style.border = prevBorder || "";
      }
    }
  };

  // export/import JSON
  const handleExportJSON = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" })
    );
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "qcs_raw_material_reports_backup.json",
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ({ target }) => {
      try {
        const data = JSON.parse(target.result);
        if (!Array.isArray(data))
          return alert("Invalid JSON: expected an array of reports.");
        const map = new Map();
        [...reports, ...data].forEach((r) =>
          map.set(r.id, { ...map.get(r.id), ...r })
        );
        const merged = Array.from(map.values()).sort((a, b) =>
          String(b.createdAt || b.date || "").localeCompare(
            String(a.createdAt || a.date || "")
          )
        );
        setReports(merged);
        saveToLocal(merged);
        alert("Reports imported successfully.");
      } catch {
        alert("Failed to parse the file or invalid format.");
      }
    };
    reader.readAsText(file);
  };

  // ── Excel export (filtered reports) ──
  const handleExportExcel = async () => {
    if (!filteredReports.length) return alert("No reports to export.");
    const { utils, writeFile } = await import("xlsx");
    const rows = filteredReports.map((r) => ({
      "AWB / Invoice":   getDisplayId(r),
      "Date":            getCreatedDate(r),
      "Supplier":        r.generalInfo?.supplierName || "-",
      "Brand":           r.generalInfo?.brand        || "-",
      "Origin":          r.generalInfo?.origin       || "-",
      "Shipment Type":   r.shipmentType              || "-",
      "Status":          r.status                    || "-",
      "Total Qty (pcs)": r.totalQuantity             || "-",
      "Total Wt (kg)":   r.totalWeight               || "-",
      "Avg Wt (kg)":     r.averageWeight             || "-",
      "Inspector":       r.inspectedBy || r.inspectorName || r.generalInfo?.inspectorName || "-",
      "Notes":           r.notes       || r.generalInfo?.notes || "-",
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "QCS Shipments");
    // auto column widths
    const colW = Object.keys(rows[0] || {}).map((k) => ({
      wch: Math.max(k.length, ...rows.map((r) => String(r[k] || "").length), 10),
    }));
    ws["!cols"] = colW;
    writeFile(wb, `QCS_Shipments_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="qrm-page">
      {/* ── Hero banner ── */}
      <div className="qrm-hero">
        <div className="qrm-hero-blob-a" aria-hidden="true" />
        <div className="qrm-hero-blob-b" aria-hidden="true" />
        <div className="qrm-hero-content">
          <h1 className="qrm-hero-title">📦 QCS Raw Material Shipments</h1>
          <p className="qrm-hero-sub">Inspection records · certificates · history</p>
        </div>
        <svg viewBox="0 0 1440 140" preserveAspectRatio="none" className="qrm-hero-wave" aria-hidden="true">
          <path
            fill="#ffffff"
            d="M0,64 C240,128 480,0 720,32 C960,64 1200,160 1440,96 L1440,140 L0,140 Z"
          />
        </svg>
      </div>

      {/* ── Content: sidebar + details panel ── */}
      <div className="qrm-content-wrap">
        <SidebarTree
          tree={tree}
          selectedReportId={selectedReportId}
          setSelectedReportId={setSelectedReportId}
          loadingServer={loadingServer}
          serverErr={serverErr}
          onRefresh={refresh}
          canExportPDF={!!selectedReport}
          onExportPDF={exportToPDF}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onExportJSON={handleExportJSON}
          onImportJSON={handleImportJSON}
          onExportExcel={handleExportExcel}
          getDisplayId={getDisplayId}
          base64Count={countBase64Certs(reports)}
          migrating={migrating}
          migrateProgress={migrateProgress}
          onMigrateBase64={handleMigrateBase64}
          statusFilter={statusFilter}   setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}       setTypeFilter={setTypeFilter}
          dateFrom={dateFrom}           setDateFrom={setDateFrom}
          dateTo={dateTo}               setDateTo={setDateTo}
          uniqueTypes={uniqueTypes}
          filteredCount={filteredReports.length}
          totalCount={reports.length}
        />

        {/* Details panel — glassmorphism card */}
        <main
          ref={mainRef}
          className="qrm-main print-main"
        >
          <div className="print-area" ref={printAreaRef}>
            <ReportDetails
              selectedReport={selectedReport}
              getDisplayId={getDisplayId}
              getCreatedDate={getCreatedDate}
              updateSelectedReport={updateSelectedReport}
              onDeleteReport={handleDelete}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
