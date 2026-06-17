// src/pages/monitor/branches/qcs/NonConformanceReportsView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx-js-style";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { DateTreeSidebar, GlassShell, GLASS, EmptyState, btn, useLightbox } from "../_shared/branchViewKit";

/* ===== API base ===== */
const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const CRA =
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL) || undefined;
let VITE;
try { VITE = import.meta.env?.VITE_API_URL; } catch {}
const API_BASE = (VITE || CRA || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; }
})();

const DEFAULT_TYPE = "qcs_non_conformance";
const DEFAULT_HEADER_LINE = "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS";
const DEFAULT_INPUT_PATH = "/monitor/qcs";
const DEFAULT_INPUT_TAB = "nonConformance";
const LOGO_FALLBACK = "/brand/al-mawashi.jpg";

/* ===== Document card helpers ===== */
function NCSection({ color, title, children }) {
  return (
    <div style={{ margin: "0 14px 12px", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <div style={{ background: color, padding: "7px 16px", color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {title}
      </div>
      {children}
    </div>
  );
}
function NCRow({ items }) {
  const template = items.map((i) => `${i.colSpan || 1}fr`).join(" ");
  return (
    <div style={{ display: "grid", gridTemplateColumns: template }}>
      {items.map((it, i) => (
        <div key={i} style={{ padding: "9px 16px", borderRight: i < items.length - 1 ? "1px solid #e2e8f0" : undefined, borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 4, letterSpacing: 0.3 }}>{it.label}</div>
          <div style={{ fontSize: 20, color: "#0f172a" }}>{it.value || " "}</div>
        </div>
      ))}
    </div>
  );
}
function NCText({ label, value }) {
  return (
    <div style={{ padding: "10px 16px", borderBottom: "1px solid #e2e8f0" }}>
      {label && <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 5, letterSpacing: 0.3 }}>{label}</div>}
      <div style={{ fontSize: 20, color: "#0f172a", whiteSpace: "pre-wrap", minHeight: 24, lineHeight: 1.5 }}>{value || " "}</div>
    </div>
  );
}

/* ===== Server helpers ===== */
async function listReports(type) {
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(type || DEFAULT_TYPE)}`,
    { method: "GET", cache: "no-store", credentials: IS_SAME_ORIGIN ? "include" : "omit" }
  );
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  const arr = Array.isArray(json) ? json : json?.data || [];
  return arr
    .map((r) => ({ id: r._id || r.id, _id: r._id, rawId: r.id, ...r }))
    .filter((r) => r?.payload);
}

async function deleteReport(anyId) {
  const id = encodeURIComponent(anyId);
  const res = await fetch(`${API_BASE}/api/reports/${id}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  return res.ok;
}

function groupByMonth(reports) {
  const map = {};
  for (const r of reports) {
    const d = String(r?.payload?.headRow?.reportDate || "");
    const m = d.match(/^(\d{4})-(\d{2})-\d{2}$/);
    const key = m ? `${m[1]}-${m[2]}` : "Unknown";
    (map[key] ||= []).push(r);
  }
  return Object.entries(map)
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .map(([month, items]) => [
      month,
      items.sort((a, b) =>
        String(b?.payload?.headRow?.reportDate || "").localeCompare(
          String(a?.payload?.headRow?.reportDate || "")
        )
      ),
    ]);
}

function buildEditPath(inputPath, date, tab, reportId) {
  const [path, query = ""] = String(inputPath || DEFAULT_INPUT_PATH).split("?");
  const params = new URLSearchParams(query);
  if (tab) params.set("tab", tab);
  params.set("date", date);
  if (reportId) params.set("reportId", reportId);
  return `${path}?${params.toString()}`;
}

/* ===== Component ===== */
export default function NonConformanceReportsView(props) {
  const { type: typeProp, headerLine, inputPath, inputTab } = props || {};
  const TYPE = typeProp || DEFAULT_TYPE;
  const HEADER_LINE = headerLine || DEFAULT_HEADER_LINE;
  const INPUT_PATH = inputPath || DEFAULT_INPUT_PATH;
  const INPUT_TAB = inputTab || DEFAULT_INPUT_TAB;
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef(null);
  const { openImage, lightbox } = useLightbox();

  const current = useMemo(
    () => data.find((r) => r.id === activeId) || null,
    [data, activeId]
  );
  const safeRouteId = current?._id || current?.id || current?.rawId;
  const view = current?.payload;

  useEffect(() => {
    (async () => {
      const rows = await listReports(TYPE);
      setData(rows);
      const g = groupByMonth(rows);
      if (g.length && g[0][1]?.length) setActiveId(g[0][1][0].id);
    })();
  }, [TYPE]);

  async function refresh() {
    const rows = await listReports(TYPE);
    setData(rows);
  }

  async function onDelete() {
    if (!safeRouteId) return;
    if (!window.confirm("حذف التقرير نهائيًا؟")) return;
    setBusy(true);
    const ok = await deleteReport(safeRouteId);
    if (!ok) alert("فشل الحذف");
    await refresh();
    setActiveId("");
    setBusy(false);
  }

  function onEdit() {
    if (!view?.headRow?.reportDate) return alert("ما في تاريخ للتقرير.");
    const date = String(view.headRow.reportDate);
    navigate(buildEditPath(INPUT_PATH, date, INPUT_TAB, safeRouteId));
  }

  function exportXlsx() {
    if (!view) return;
    const p = view;
    const evidenceImgs = p?.correctiveActionExtras?.evidence?.images || [];
    const aoa = [
      ["NON-CONFORMANCE REPORT"],
      [],
      ["Document Title", p?.headerTop?.documentTitle || "", "Document No", p?.headerTop?.documentNo || ""],
      ["Issue Date", p?.headerTop?.issueDate || "", "Revision No", p?.headerTop?.revisionNo || ""],
      ["Area", p?.headerTop?.area || "", "Controlling Officer", p?.headerTop?.controllingOfficer || ""],
      ["Issued By", p?.headerTop?.issuedBy || "", "Approved By", p?.headerTop?.approvedBy || ""],
      [],
      ["Location", p?.location || ""],
      ["Date", p?.headRow?.reportDate || "", "NC No.", p?.headRow?.ncNo || ""],
      ["Issued to", p?.headRow?.issuedTo || "", "Issued by", p?.headRow?.issuedBy || ""],
      [],
      ["Reference", `${p?.reference?.inhouseQC ? "In-house QC; " : ""}${p?.reference?.customerComplaint ? "Customer Complaint; " : ""}${p?.reference?.internalAudit ? "Internal Audit; " : ""}${p?.reference?.externalAudit ? "External Audit" : ""}`],
      [],
      ["Nonconformance/Report Details", p?.detailsBlock || ""],
      ["Corrective Action", p?.correctiveAction || ""],
      [],
      ["Implementation Owner", p?.correctiveActionExtras?.implementationOwner || ""],
      ["Target Completion Date", p?.correctiveActionExtras?.targetCompletionDateISO || ""],
      ["Status", p?.correctiveActionExtras?.status || ""],
      [],
      ["Evidence Images (URLs)", evidenceImgs.join("\n")],
      [],
      ["Performed by", p?.performedBy || "", "Department", p?.department || ""],
      ["Verification of Corrective Action", p?.verificationOfCorrectiveAction || ""],
      [],
      ["QA Verified By", p?.qaVerification?.verifiedByQA || "", "QA Date", p?.qaVerification?.dateISO || ""],
      ["QA Result", p?.qaVerification?.result || "", "Closure Date", p?.qaVerification?.closureDateISO || ""],
      ["Follow-up Actions Required", p?.qaVerification?.followupActionsRequired || ""],
      ["Follow-up Responsible", p?.qaVerification?.followupResponsible || "", "Follow-up Target", p?.qaVerification?.followupTargetDateISO || ""],
      [],
      ["Final QA Name", p?.finalQaClosure?.name || "", "Final QA Date", p?.finalQaClosure?.dateISO || ""],
      ["Final QA Approved", p?.finalQaClosure?.approved ? "YES" : "NO"],
      [],
      ["Signature", p?.signature?.signature || "", "Date", p?.signature?.date || ""],
      ["Responsible Person", p?.signature?.responsiblePerson || "", "Signature", p?.signature?.responsibleSignature || ""],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["A1"].s = { font: { bold: true, sz: 14 } };
    XLSX.utils.book_append_sheet(wb, ws, "NC Report");
    XLSX.writeFile(wb, `NC_${p?.headRow?.reportDate || "report"}.xlsx`);
  }

  async function exportPdf() {
    if (!sheetRef.current) return;
    const canvas = await html2canvas(sheetRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = (canvas.width * 25.4) / 96;
    const imgH = (canvas.height * 25.4) / 96;
    const ratio = Math.min(pageW / imgW, pageH / imgH);
    pdf.addImage(imgData, "PNG", (pageW - imgW * ratio) / 2, 5, imgW * ratio, imgH * ratio, undefined, "FAST");
    pdf.save(`${view?.headRow?.reportDate || "NC_Report"}.pdf`);
  }

  const treeItems = useMemo(() =>
    data.map((r) => ({
      key: r.id,
      dateISO: r?.payload?.headRow?.reportDate || "",
      label: (() => {
        const d = r?.payload?.headRow?.reportDate || "";
        if (!d) return r?.payload?.headRow?.ncNo || "NC";
        const [y, m, day] = d.split("-");
        return day ? `${day}/${m}/${y}` : d;
      })(),
    })),
  [data]);

  const evidenceImgs = view?.correctiveActionExtras?.evidence?.images || [];

  return (
    <GlassShell icon="⚠️" title="Non-Conformance Reports">
      <div style={{ display: "grid", gridTemplateColumns: "285px 1fr", gap: 12 }}>
        <DateTreeSidebar
          items={treeItems}
          activeKey={activeId}
          onPick={(it) => setActiveId(it.key)}
          title="📂 NC Archive"
          loading={busy && data.length === 0}
          maxHeight="calc(100vh - 220px)"
        />

        <div style={{ ...GLASS.content, overflowY: "auto" }}>
          {!view ? (
            <EmptyState text="اختر تقريرًا من الشجرة." />
          ) : (
            <>
              {/* toolbar */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <button disabled={busy} onClick={onEdit} style={btn("#0ea5e9")}>✏️ Edit</button>
                <button disabled={busy} onClick={exportXlsx} style={btn("#059669")}>📄 Export XLSX</button>
                <button disabled={busy} onClick={exportPdf} style={btn("#7c3aed")}>🖨️ Export PDF</button>
                <button disabled={busy} onClick={onDelete} style={{ ...btn("#ef4444"), marginInlineStart: "auto" }} data-delete-action="true">🗑️ Delete</button>
              </div>

              {/* Modern full-width document */}
              <div ref={sheetRef} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                {/* Header Banner */}
                <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #1e3a8a 100%)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, color: "#fff" }}>
                  <img src={view?.logoUrl || LOGO_FALLBACK} crossOrigin="anonymous" alt="Al Mawashi"
                    style={{ maxHeight: 60, maxWidth: 100, objectFit: "contain", background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 3 }}>{HEADER_LINE}</div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>NON-CONFORMANCE REPORT</div>
                  </div>
                  <div style={{ fontSize: 11, display: "grid", gridTemplateColumns: "auto auto", gap: "2px 10px", textAlign: "right", flexShrink: 0 }}>
                    {[
                      ["Doc No", view?.headerTop?.documentNo],
                      ["Issue Date", view?.headerTop?.issueDate],
                      ["Revision", view?.headerTop?.revisionNo],
                      ["Area", view?.headerTop?.area],
                      ["Issued By", view?.headerTop?.issuedBy],
                      ["Approved By", view?.headerTop?.approvedBy],
                    ].map(([k, v], i) => (
                      <React.Fragment key={i}>
                        <span style={{ opacity: 0.6 }}>{k}:</span>
                        <span style={{ fontWeight: 600 }}>{v || "—"}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div style={{ paddingTop: 14, paddingBottom: 6 }}>
                  <NCSection color="#3b82f6" title="Report Information">
                    <NCRow items={[
                      { label: "Report Date", value: view?.headRow?.reportDate },
                      { label: "NC No.", value: view?.headRow?.ncNo },
                      { label: "Issued to", value: view?.headRow?.issuedTo },
                      { label: "Issued by", value: view?.headRow?.issuedBy },
                    ]} />
                    <NCRow items={[{ label: "Location", value: view?.location, colSpan: 4 }]} />
                  </NCSection>

                  <NCSection color="#8b5cf6" title="Reference">
                    <div style={{ padding: "8px 14px", display: "flex", gap: 10, flexWrap: "wrap", borderBottom: "1px solid #e2e8f0" }}>
                      {[
                        ["inhouseQC", "In-house QC"],
                        ["customerComplaint", "Customer Complaint"],
                        ["internalAudit", "Internal Audit"],
                        ["externalAudit", "External Audit"],
                      ].map(([key, lbl]) => {
                        const chk = view?.reference?.[key];
                        return (
                          <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, fontSize: 16, fontWeight: 700, background: chk ? "#8b5cf6" : "#f1f5f9", color: chk ? "#fff" : "#64748b", border: `1px solid ${chk ? "#7c3aed" : "#e2e8f0"}` }}>
                            {chk ? "☑" : "□"} {lbl}
                          </span>
                        );
                      })}
                    </div>
                  </NCSection>

                  <NCSection color="#0ea5e9" title="Nonconformance Details">
                    <NCText value={view?.detailsBlock} />
                  </NCSection>

                  <NCSection color="#f59e0b" title="Corrective Action">
                    <NCText value={view?.correctiveAction} />
                  </NCSection>

                  <NCSection color="#10b981" title="Corrective Action — Tracking">
                    <NCRow items={[
                      { label: "Implementation Owner", value: view?.correctiveActionExtras?.implementationOwner },
                      { label: "Target Completion Date", value: view?.correctiveActionExtras?.targetCompletionDateISO },
                      { label: "Status", value: view?.correctiveActionExtras?.status },
                    ]} />
                  </NCSection>

                  <NCSection color="#6366f1" title="Evidence / Attachments">
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0" }}>
                      {evidenceImgs.length === 0 ? (
                        <span style={{ color: "#94a3b8", fontSize: 16 }}>No images attached.</span>
                      ) : (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {evidenceImgs.slice(0, 10).map((src, i) => (
                            <img key={src + i} src={src} crossOrigin="anonymous" alt={`evidence-${i}`}
                              onClick={() => openImage(src, evidenceImgs)}
                              style={{ width: 130, height: 95, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "zoom-in" }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </NCSection>

                  <NCSection color="#64748b" title="Performed By / Verification">
                    <NCRow items={[
                      { label: "Performed by", value: view?.performedBy },
                      { label: "Department", value: view?.department },
                    ]} />
                    <NCText label="Verification of Corrective Action" value={view?.verificationOfCorrectiveAction} />
                  </NCSection>

                  <NCSection color="#7c3aed" title="QA Verification">
                    <NCRow items={[
                      { label: "Verified by (QA)", value: view?.qaVerification?.verifiedByQA },
                      { label: "Date", value: view?.qaVerification?.dateISO },
                      { label: "Result", value: view?.qaVerification?.result },
                      { label: "Closure Date", value: view?.qaVerification?.closureDateISO },
                    ]} />
                    <NCRow items={[
                      { label: "Follow-up Actions Required", value: view?.qaVerification?.followupActionsRequired, colSpan: 2 },
                      { label: "Follow-up Responsible", value: view?.qaVerification?.followupResponsible },
                      { label: "Target Date", value: view?.qaVerification?.followupTargetDateISO },
                    ]} />
                  </NCSection>

                  <NCSection color="#059669" title="Final QA Closure">
                    <NCRow items={[
                      { label: "Name", value: view?.finalQaClosure?.name },
                      { label: "Date", value: view?.finalQaClosure?.dateISO },
                      { label: "Approved", value: view?.finalQaClosure?.approved ? "✅ YES" : "NO" },
                    ]} />
                  </NCSection>

                  <NCSection color="#dc2626" title="Signature">
                    <NCRow items={[
                      { label: "Signature", value: view?.signature?.signature },
                      { label: "Date", value: view?.signature?.date },
                      { label: "Responsible Person", value: view?.signature?.responsiblePerson },
                      { label: "Signature (Resp.)", value: view?.signature?.responsibleSignature },
                    ]} />
                  </NCSection>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {lightbox}
    </GlassShell>
  );
}
