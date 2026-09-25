// src/pages/monitor/branches/sweets/NonConformanceReportsView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx-js-style";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { DateTreeSidebar, GlassShell, GLASS, EmptyState, btn, useLightbox } from "../_shared/branchViewKit";
import { printNode } from "./_sweetsReportKit";
import { canEdit, canDelete } from "../../../../utils/perms";
import { sweetsAreaLabel } from "./sweetsAreas";
import EmailSendModal from "../../../shared/EmailSendModal";
import EmailSendHistory from "../../../shared/EmailSendHistory";
import { makeNcrEmailConfig } from "./ncrEmailConfig";

/* The NC number is allocated by the server as `payload.refNo` ("NCR-000042").
   Reports written before that still only carry the hand-typed headRow.ncNo, so
   both are read here — the server-owned one first. */
const ncNumberOf = (p) => p?.refNo || p?.headRow?.ncNo || "";
/* Location is a factory-area code (sweetsAreas.js); show its label, and
   fall back to whatever free text a legacy record holds. */
const locationOf = (p) => {
  const code = p?.branch || p?.location || "";
  return code ? sweetsAreaLabel(code) : "";
};

/* Workflow state, with the colour it is shown in everywhere on this screen. */
const STATUS_TONE = {
  Open:          { bg: "#fef2f2", fg: "#991b1b", bd: "#fca5a5", dot: "🔴" },
  "In Progress": { bg: "#fffbeb", fg: "#92400e", bd: "#fcd34d", dot: "🟠" },
  Closed:        { bg: "#ecfdf5", fg: "#065f46", bd: "#6ee7b7", dot: "🟢" },
};
const statusOf = (p) => p?.correctiveActionExtras?.status || "Open";
const toneOf = (p) => STATUS_TONE[statusOf(p)] || STATUS_TONE.Open;

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

const DEFAULT_TYPE = "sweets_non_conformance";
const DEFAULT_HEADER_LINE = "";
/* The generic industry engine (src/pages/generic/GenericIndustryApp.jsx)
   mounts every Sweets screen at /company-app, driven by ?card=&type=, NOT
   the QCS app's own /monitor/qcs?tab= routing — sending an edit there would
   land the user in the QCS company's own NCR screen. */
const DEFAULT_INPUT_PATH = "/company-app";
const DEFAULT_CARD = "daily";
const LOGO_FALLBACK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

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
  /* Without an explicit limit the server caps the answer at 200 rows, which
     silently hides the oldest NCRs from the archive tree. */
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(type || DEFAULT_TYPE)}&limit=5000`,
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

function buildEditPath(inputPath, date, card, type, reportId) {
  const [path, query = ""] = String(inputPath || DEFAULT_INPUT_PATH).split("?");
  const params = new URLSearchParams(query);
  if (card) params.set("card", card);
  if (type) params.set("type", type);
  params.set("date", date);
  if (reportId) params.set("reportId", reportId);
  return `${path}?${params.toString()}`;
}

/* ===== Component ===== */
export default function NonConformanceReportsView(props) {
  const { type: typeProp, headerLine, inputPath, inputCard } = props || {};
  const TYPE = typeProp || DEFAULT_TYPE;
  const HEADER_LINE = headerLine || DEFAULT_HEADER_LINE;
  const INPUT_PATH = inputPath || DEFAULT_INPUT_PATH;
  const INPUT_CARD = inputCard || DEFAULT_CARD;
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  /* Bumped when the modal closes so the send history re-reads the log — a send
     that just happened should show without a page refresh. */
  const [historyKey, setHistoryKey] = useState(0);
  const sheetRef = useRef(null);
  const { openImage, lightbox } = useLightbox();

  /* The e-mail log is keyed by report type, same as the reports. */
  const emailConfig = useMemo(
    () => makeNcrEmailConfig({
      reportType: TYPE,
      reportTitle: "Non-Conformance Report",
    }),
    [TYPE]
  );

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
    navigate(buildEditPath(INPUT_PATH, date, INPUT_CARD, TYPE, safeRouteId));
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
      ["Location", locationOf(p)],
      ["Date", p?.headRow?.reportDate || "", "NC No.", ncNumberOf(p)],
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

  /* Several NCRs can share one day — one per branch, or two on the same branch
     — so a leaf labelled with the date alone is ambiguous. Each leaf carries
     its status colour, its NC number and its branch code. */
  const treeItems = useMemo(() =>
    data.map((r) => {
      const p = r?.payload;
      const d = String(p?.headRow?.reportDate || "");
      const [y, m, day] = d.split("-");
      const dmy = day ? `${day}/${m}/${y}` : d;
      const ref = ncNumberOf(p);
      const shortRef = ref ? `#${ref.split("-").pop()}` : "";
      const branch = p?.branch || p?.location || "";
      return {
        key: r.id,
        dateISO: d,
        label: [toneOf(p).dot, dmy || "NC", shortRef, branch]
          .filter(Boolean)
          .join(" · "),
      };
    }),
  [data]);

  const evidenceImgs = view?.correctiveActionExtras?.evidence?.images || [];
  const tone = toneOf(view);

  /* EmailSendModal reads `payload.reportDate` for the audit row; this report
     keeps its date one level down, so lift it rather than teach the modal
     about every report shape. */
  const emailPayload = useMemo(
    () => (view ? { ...view, reportDate: view?.headRow?.reportDate || "" } : null),
    [view]
  );
  const currentRef = ncNumberOf(view);

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
                {canEdit("daily") && (
                  <button disabled={busy} onClick={onEdit} style={btn("#0ea5e9")}>✏️ Edit</button>
                )}
                <button disabled={busy} onClick={() => setEmailOpen(true)} style={btn("#2563eb")}>📧 Send by Email</button>
                <button disabled={busy} onClick={exportXlsx} style={btn("#059669")}>📄 Export XLSX</button>
                <button disabled={busy} onClick={exportPdf} style={btn("#7c3aed")}>📄 Export PDF</button>
                <button disabled={busy} onClick={() => printNode(sheetRef.current, "Non-Conformance Report")} style={btn("#0f766e")}>🖨️ Print</button>
                {canDelete("daily") && (
                  <button disabled={busy} onClick={onDelete} style={{ ...btn("#ef4444"), marginInlineStart: "auto" }} data-delete-action="true">🗑️ Delete</button>
                )}
              </div>

              {/* Send log for THIS report. Deliberately outside sheetRef so it
                  never lands in the exported PDF — the PDF is the report, not
                  the record of who received it. */}
              <EmailSendHistory
                reportType={TYPE}
                reportRef={currentRef}
                reportDate={view?.headRow?.reportDate}
                refreshKey={historyKey}
                onSendClick={() => setEmailOpen(true)}
              />

              {/* Modern full-width document */}
              <div ref={sheetRef} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                {/* Header Banner */}
                <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #1e3a8a 100%)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, color: "#fff" }}>
                  <img src={view?.logoUrl || LOGO_FALLBACK} crossOrigin="anonymous" alt=""
                    style={{ maxHeight: 60, maxWidth: 100, objectFit: "contain", background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 3 }}>{HEADER_LINE}</div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>NON-CONFORMANCE REPORT</div>
                    {/* The number and the workflow state are what a reader looks
                        for first; they used to be buried three sections down. */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                      <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.3)", fontSize: 12, fontWeight: 800, letterSpacing: 0.4 }}>
                        {ncNumberOf(view) || "No NC number"}
                      </span>
                      <span style={{ padding: "3px 10px", borderRadius: 999, background: tone.bg, color: tone.fg, border: `1px solid ${tone.bd}`, fontSize: 12, fontWeight: 800 }}>
                        {statusOf(view).toUpperCase()}
                      </span>
                      {locationOf(view) ? (
                        <span style={{ fontSize: 12, opacity: 0.8 }}>📍 {locationOf(view)}</span>
                      ) : null}
                    </div>
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
                      { label: "NC No.", value: ncNumberOf(view) },
                      { label: "Issued to", value: view?.headRow?.issuedTo },
                      { label: "Issued by", value: view?.headRow?.issuedBy },
                    ]} />
                    <NCRow items={[{ label: "Location", value: locationOf(view), colSpan: 4 }]} />
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
                    {/* Follow-up exists only because the result was not
                        satisfactory — four empty cells on every other report
                        just read as missing data. */}
                    {view?.qaVerification?.result === "Not Satisfactory" ? (
                      <NCRow items={[
                        { label: "Follow-up Actions Required", value: view?.qaVerification?.followupActionsRequired, colSpan: 2 },
                        { label: "Follow-up Responsible", value: view?.qaVerification?.followupResponsible },
                        { label: "Target Date", value: view?.qaVerification?.followupTargetDateISO },
                      ]} />
                    ) : null}
                  </NCSection>

                  <NCSection color={statusOf(view) === "Closed" ? "#059669" : "#94a3b8"} title="Final QA Closure">
                    {statusOf(view) === "Closed" ? (
                      <NCRow items={[
                        { label: "Name", value: view?.finalQaClosure?.name },
                        { label: "Date", value: view?.finalQaClosure?.dateISO },
                        { label: "Approved", value: view?.finalQaClosure?.approved ? "✅ YES" : "NO" },
                      ]} />
                    ) : (
                      <div style={{ padding: "12px 16px", color: "#64748b", fontSize: 15, borderBottom: "1px solid #e2e8f0" }}>
                        Not closed yet — this NCR is <b>{statusOf(view)}</b>.
                        <span style={{ direction: "rtl", display: "block", marginTop: 4 }}>
                          لم يُغلق بعد — حالة التقرير <b>{statusOf(view)}</b>.
                        </span>
                      </div>
                    )}
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
      <EmailSendModal
        open={emailOpen}
        onClose={() => {
          setEmailOpen(false);
          setHistoryKey((k) => k + 1);
        }}
        payload={emailPayload}
        config={emailConfig}
      />
      {lightbox}
    </GlassShell>
  );
}
