// src/pages/monitor/branches/qcs/CorrectiveActionReportsView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { DateTreeSidebar, GlassShell, GLASS, EmptyState, btn } from "../_shared/branchViewKit";

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

const DEFAULT_TYPE = "qcs_corrective_action";
const DEFAULT_HEADER_LINE = "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS";
const LOGO_FALLBACK = "/brand/al-mawashi.jpg";

const pad2 = (v) => String(v || "").padStart(2, "0");
const toYMD = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x)) return "";
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};

/* ===== Document card helpers ===== */
function CarSection({ color, title, children }) {
  return (
    <div style={{ margin: "0 14px 12px", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <div style={{ background: color, padding: "7px 16px", color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {title}
      </div>
      {children}
    </div>
  );
}
function CarRow({ items }) {
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
function CarText({ label, value }) {
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
    const d = String(r?.payload?.header?.dateIssued || "");
    const m = d.match(/^(\d{4})-(\d{2})-\d{2}$/);
    const key = m ? `${m[1]}-${m[2]}` : "Unknown";
    (map[key] ||= []).push(r);
  }
  return Object.entries(map)
    .sort(([a], [b]) => (a > b ? -1 : 1))
    .map(([month, items]) => [
      month,
      items.sort((a, b) =>
        String(b?.payload?.header?.dateIssued || "").localeCompare(
          String(a?.payload?.header?.dateIssued || "")
        )
      ),
    ]);
}

/* ===== Component ===== */
export default function CorrectiveActionReportsView(props) {
  const { type: typeProp, headerLine } = props || {};
  const TYPE = typeProp || DEFAULT_TYPE;
  const HEADER_LINE = headerLine || DEFAULT_HEADER_LINE;
  const [data, setData] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [busy, setBusy] = useState(false);
  const sheetRef = useRef(null);

  const current = useMemo(() => data.find((r) => r.id === activeId) || null, [data, activeId]);
  const safeRouteId = current?._id || current?.id || current?.rawId;
  const p = current?.payload;
  const h = p?.header || {};
  const b = p?.body || {};
  const f = p?.footer || {};

  useEffect(() => {
    (async () => {
      const rows = await listReports(TYPE);
      setData(rows);
      const g = groupByMonth(rows);
      if (g.length && g[0][1]?.length) setActiveId(g[0][1][0].id);
    })();
  }, [TYPE]);

  async function onDelete() {
    if (!safeRouteId) return;
    if (!window.confirm("حذف التقرير نهائيًا؟")) return;
    setBusy(true);
    const ok = await deleteReport(safeRouteId);
    if (!ok) alert("فشل الحذف");
    const rows = await listReports(TYPE);
    setData(rows);
    setActiveId("");
    setBusy(false);
  }

  function exportXlsx() {
    if (!p) return;
    const aoa = [
      ["CORRECTIVE ACTION REPORT"],
      [],
      ["Report Date", h?.dateIssued || ""],
      ["Department involved", h?.departmentInvolved || ""],
      ["Initiated by", h?.initiatedBy || ""],
      ["Origin of non-conformity", h?.originOfNonConformity || ""],
      ["CAR Completed date", h?.carCompletedDate || ""],
      [],
      ["Details of Non-Conformity", b?.detailsOfNC || ""],
      ["Root Cause(s) of Nonconformance", b?.rootCause || ""],
      ["Corrective Action", b?.correctiveAction || ""],
      ["Action taken to prevent recurrence", b?.preventiveAction || ""],
      [],
      ["Signed QA", f?.signedQA || "", "Date Closed out", f?.dateClosedOut || ""],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["A1"].s = { font: { bold: true, sz: 14 } };
    XLSX.utils.book_append_sheet(wb, ws, "CAR");
    XLSX.writeFile(wb, `CAR_${h?.dateIssued || "report"}.xlsx`);
  }

  async function exportPdf() {
    if (!sheetRef.current) return;
    const canvas = await html2canvas(sheetRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = (canvas.width * 25.4) / 96;
    const imgH = (canvas.height * 25.4) / 96;
    const ratio = Math.min(pageW / imgW, pageH / imgH);
    pdf.addImage(imgData, "PNG", (pageW - imgW * ratio) / 2, 5, imgW * ratio, imgH * ratio, undefined, "FAST");
    pdf.save(`${h?.dateIssued || "CAR_Report"}.pdf`);
  }

  const treeItems = useMemo(() =>
    data.map((r) => ({
      key: r.id,
      dateISO: r?.payload?.header?.dateIssued || "",
      label: (() => {
        const d = toYMD(r?.payload?.header?.dateIssued || "");
        if (!d) return r?.payload?.header?.departmentInvolved || "CAR";
        const [y, m, day] = d.split("-");
        return day ? `${day}/${m}/${y}` : d;
      })(),
    })),
  [data]);

  return (
    <GlassShell icon="✅" title="Corrective Action Reports">
      <div style={{ display: "grid", gridTemplateColumns: "285px 1fr", gap: 12 }}>
        <DateTreeSidebar
          items={treeItems}
          activeKey={activeId}
          onPick={(it) => setActiveId(it.key)}
          title="📂 CAR Archive"
          loading={busy && data.length === 0}
          maxHeight="calc(100vh - 220px)"
        />

        <div style={{ ...GLASS.content, overflowY: "auto" }}>
          {!p ? (
            <EmptyState text="اختر تقريرًا من الشجرة." />
          ) : (
            <>
              {/* toolbar */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <button disabled={busy} onClick={exportXlsx} style={btn("#059669")}>📄 Export XLSX</button>
                <button disabled={busy} onClick={exportPdf} style={btn("#7c3aed")}>🖨️ Export PDF</button>
                <button disabled={busy} onClick={async () => { await onDelete(); }} style={{ ...btn("#ef4444"), marginInlineStart: "auto" }} data-delete-action="true">🗑️ Delete</button>
              </div>

              {/* Modern full-width document */}
              <div ref={sheetRef} style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                {/* Header Banner */}
                <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #065f46 100%)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, color: "#fff" }}>
                  <img src={p?.logoUrl || LOGO_FALLBACK} crossOrigin="anonymous" alt="Al Mawashi"
                    style={{ maxHeight: 60, maxWidth: 100, objectFit: "contain", background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 3 }}>{HEADER_LINE}</div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>CORRECTIVE ACTION REPORT</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 10, opacity: 0.65, marginBottom: 2 }}>REPORT DATE</div>
                    {h?.dateIssued || "—"}
                  </div>
                </div>

                <div style={{ paddingTop: 14, paddingBottom: 6 }}>
                  <CarSection color="#0284c7" title="Report Information">
                    <CarRow items={[
                      { label: "Department Involved", value: h?.departmentInvolved },
                      { label: "Initiated By", value: h?.initiatedBy },
                      { label: "Origin of Non-Conformity", value: h?.originOfNonConformity },
                      { label: "CAR Completed Date", value: h?.carCompletedDate },
                    ]} />
                  </CarSection>

                  <CarSection color="#dc2626" title="Details of Non-Conformity">
                    <CarText value={b?.detailsOfNC} />
                  </CarSection>

                  <CarSection color="#f59e0b" title="Root Cause(s) of Nonconformance">
                    <CarText value={b?.rootCause} />
                  </CarSection>

                  <CarSection color="#10b981" title="Corrective Action">
                    <CarText value={b?.correctiveAction} />
                  </CarSection>

                  <CarSection color="#8b5cf6" title="Action Taken to Prevent Recurrence">
                    <CarText value={b?.preventiveAction} />
                  </CarSection>

                  <CarSection color="#475569" title="Sign-off">
                    <CarRow items={[
                      { label: "Signed QA", value: f?.signedQA },
                      { label: "Date Closed Out", value: f?.dateClosedOut },
                    ]} />
                  </CarSection>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </GlassShell>
  );
}
