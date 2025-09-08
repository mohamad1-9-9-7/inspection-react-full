// index.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import SidebarTree from "./SidebarTree";
import ReportDetails from "./ReportDetails";
import {
  fetchFromServer, mergeUniqueById, loadFromLocal, saveToLocal,
  upsertReportOnServer, deleteOnServer,
  groupByYMD, getDisplayId, getCreatedDate,
} from "./viewUtils";

export default function QCSRawMaterialView() {
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverErr, setServerErr] = useState("");

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
        String((b.createdAt || b.date || "")).localeCompare(String(a.createdAt || a.date || ""))
      );
      setReports(merged);
      saveToLocal(merged);
    } catch (e) {
      if (e.name !== "AbortError") setServerErr("Unable to fetch from server now.");
    } finally {
      setLoadingServer(false);
    }
  };

  useEffect(() => {
    // show local immediately
    const local = loadFromLocal().sort((a, b) =>
      String((b.createdAt || b.date || "")).localeCompare(String(a.createdAt || a.date || ""))
    );
    setReports(local);
    refresh();
    const onFocus = () => refresh();
    const onStorage = () => setReports(loadFromLocal());
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
    if (!reports.length) { setSelectedReportId(null); return; }
    if (!reports.some((r) => r.id === selectedReportId)) setSelectedReportId(reports[0].id);
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

  // delete report
  const handleDelete = async (id) => {
    const rec = reports.find((r) => r.id === id);
    if (!rec) return;
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    setReports((prev) => {
      const newList = prev.filter((r) => r.id !== id);
      saveToLocal(newList);
      if (selectedReportId === id) setSelectedReportId(newList[0]?.id || null);
      return newList;
    });

    const ok = await deleteOnServer(rec);
    if (!ok) alert("⚠️ Failed to delete from server. Removed locally.");
  };

  // filter + tree
  const filteredReports = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();
    return reports.filter((r) => {
      const hay = [
        r.generalInfo?.airwayBill, r.generalInfo?.invoiceNo, r.uniqueKey,
        r.shipmentType, r.status, getCreatedDate(r),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [reports, searchTerm]);

  const tree = useMemo(() => groupByYMD(
    filteredReports.slice().sort((a, b) =>
      String((b.createdAt || b.date || "")).localeCompare(String(a.createdAt || a.date || ""))
    )
  ), [filteredReports]);

  const selectedReport =
    filteredReports.find((r) => r.id === selectedReportId) ||
    filteredReports[0] ||
    null;

  // PDF export (نفس طريقتك، أبقيناه في الرئيسي)
  const printAreaRef = useRef(null);
  const mainRef = useRef(null);
  const exportToPDF = async () => {
    if (!selectedReport) return alert("No selected report to export.");
    const prevOverflow = mainRef.current?.style.overflowY;
    const prevMax = mainRef.current?.style.maxHeight;
    const prevShadow = mainRef.current?.style.boxShadow;
    const prevBorder = mainRef.current?.style.border;
    if (mainRef.current) {
      mainRef.current.style.maxHeight = "none";
      mainRef.current.style.overflowY = "visible";
      mainRef.current.style.boxShadow = "none";
      mainRef.current.style.border = "none";
    }
    await new Promise((r) => setTimeout(r, 150));
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"), import("jspdf"),
      ]);
      const target = printAreaRef.current;
      const scale = window.devicePixelRatio > 1 ? 2 : 1;
      const canvas = await html2canvas(target, {
        scale, useCORS: true, backgroundColor: "#ffffff",
        scrollX: 0, scrollY: -window.scrollY, windowWidth: document.documentElement.offsetWidth,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      const idForFile = selectedReport?.generalInfo?.airwayBill || selectedReport?.generalInfo?.invoiceNo;
      const filename = idForFile ? `QCS-${idForFile}` : `QCS-Report-${Date.now()}`;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to create PDF. Make sure jspdf and html2canvas are installed.");
    } finally {
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
    const url = URL.createObjectURL(new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "qcs_raw_material_reports_backup.json" });
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
        if (!Array.isArray(data)) return alert("Invalid JSON: expected an array of reports.");
        const map = new Map();
        [...reports, ...data].forEach((r) => map.set(r.id, { ...map.get(r.id), ...r }));
        const merged = Array.from(map.values()).sort((a, b) =>
          String((b.createdAt || b.date || "")).localeCompare(String(a.createdAt || a.date || ""))
        );
        setReports(merged); saveToLocal(merged);
        alert("Reports imported successfully.");
      } catch { alert("Failed to parse the file or invalid format."); }
    };
    reader.readAsText(file);
  };

  // styles
  const styles = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
      fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Cairo, sans-serif",
    },
    hero: {
      position: "relative", height: 220,
      background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 35%, #0ea5e9 100%)",
      overflow: "hidden", zIndex: 0,
    },
    heroBlobA: {
      position: "absolute", width: 400, height: 400, left: -120, top: -180, borderRadius: "50%",
      background: "radial-gradient(closest-side, rgba(255,255,255,.25), rgba(255,255,255,0))",
    },
    heroBlobB: {
      position: "absolute", width: 500, height: 300, right: -140, top: -120, borderRadius: "50%",
      background: "radial-gradient(closest-side, rgba(255,255,255,.18), rgba(255,255,255,0))", transform: "rotate(-15deg)",
    },
    heroWave: { position: "absolute", left: 0, right: 0, bottom: -1, width: "100%", height: 140, display: "block", pointerEvents: "none", zIndex: 0 },
    contentWrap: { display: "flex", gap: "1rem", padding: "0 16px 24px", marginTop: -80, position: "relative", zIndex: 1 },
  };

  return (
    <div style={styles.page}>
      {/* Hero */}
      <div style={styles.hero} aria-hidden="true">
        <div style={styles.heroBlobA} />
        <div style={styles.heroBlobB} />
        <svg viewBox="0 0 1440 140" preserveAspectRatio="none" style={styles.heroWave}>
          <path fill="#ffffff" d="M0,64 C240,128 480,0 720,32 C960,64 1200,160 1440,96 L1440,140 L0,140 Z" />
        </svg>
      </div>

      <div style={styles.contentWrap}>
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
          onDeleteReport={handleDelete}
          onExportJSON={handleExportJSON}
          onImportJSON={handleImportJSON}
          getDisplayId={getDisplayId}
        />

        {/* Main */}
        <main
          ref={mainRef}
          className="print-main"
          style={{
            flex: 1, maxHeight: "80vh", overflowY: "auto",
            background: "#fff", borderRadius: 16, padding: "1rem",
            boxShadow: "0 10px 20px rgba(2,6,23,0.06), 0 1px 2px rgba(2,6,23,0.04)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div className="print-area" ref={printAreaRef}>
            <ReportDetails
              selectedReport={selectedReport}
              getDisplayId={getDisplayId}
              getCreatedDate={getCreatedDate}
              updateSelectedReport={updateSelectedReport}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
