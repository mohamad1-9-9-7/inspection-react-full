// src/pages/monitor/branches/POS 11/POS11TemperatureView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import SignatureName from "../../../shared/SignatureName";
import {
  safe,
  getId,
  btn,
  formatDMY,
  toISODate,
  GlassShell,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "../_shared/branchViewKit";

/* ===== Report constants ===== */
const TYPE   = "pos11_temperature";
const BRANCH = "POS 11";
const ADMIN_PIN = "9999";

/* ===== Domain helpers ===== */
const isFreezer = (name = "") => /freezer/i.test(String(name).trim());
const isRoom    = (name = "") => /production\s*room/i.test(String(name).trim());
const isChiller = (name = "") => /(cooler|chiller)/i.test(String(name).trim());

function calculateKPI(rows = []) {
  const all = [];
  let out = 0;
  for (const r of rows) {
    if (!isChiller(r.name) || isFreezer(r.name) || isRoom(r.name)) continue;
    for (const [k, v] of Object.entries(r.temps || {})) {
      if (k === "Corrective Action") continue;
      const n = Number(v);
      if (v !== "" && !isNaN(n)) {
        all.push(n);
        if (n < 0 || n > 5) out += 1;
      }
    }
  }
  const avg = all.length
    ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(2)
    : "—";
  const min = all.length ? Math.min(...all) : "—";
  const max = all.length ? Math.max(...all) : "—";
  return { avg, min, max, out };
}

const getReportDate = (r) => {
  try {
    const p = r?.payload ?? r ?? {};
    const d1 = p?.date ? new Date(p.date) : null;
    if (d1 && !isNaN(d1)) return d1;
    const d2 = r?.created_at ? new Date(r.created_at) : null;
    if (d2 && !isNaN(d2)) return d2;
  } catch { /* ignore */ }
  return new Date(0);
};

/* ====== Component ====== */
export default function POS11TemperatureView() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [opMsg, setOpMsg] = useState("");
  const printRef = useRef(null);

  /* Fetch all reports */
  useEffect(() => {
    let abort = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
          { cache: "no-store" }
        );
        const json = await res.json().catch(() => []);
        const arr = Array.isArray(json)
          ? json
          : json?.data || json?.items || [];

        if (!abort) {
          const sorted = [...arr].sort((a, b) => {
            const da = new Date(a?.payload?.date || a?.created_at || 0).getTime();
            const db = new Date(b?.payload?.date || b?.created_at || 0).getTime();
            return db - da;
          });
          setReports(sorted);
          if (sorted.length && !selectedId) {
            setSelectedId(getId(sorted[0]));
          }
        }
      } catch {
        if (!abort) setReports([]);
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => { abort = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => reports.find((r) => getId(r) === selectedId),
    [reports, selectedId]
  );
  const payload = selected?.payload ?? selected ?? {};
  const times = (payload?.times || []).filter((t) => t !== "Corrective Action");
  const rows = payload?.coolers || [];
  const kpi = useMemo(() => calculateKPI(rows), [rows]);

  /* Build treeItems from reports */
  const treeItems = useMemo(
    () =>
      reports.map((r) => {
        const id = getId(r);
        const d = getReportDate(r);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return { key: id, dateISO: iso, label: formatDMY(iso), data: r };
      }),
    [reports]
  );

  /* PDF export (dynamic) */
  const exportPDF = async () => {
    if (!printRef.current) return;
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const node = printRef.current;
    const canvas = await html2canvas(node, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "pt", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    pdf.addImage(imgData, "PNG", (pageW - w) / 2, 16, w, h);
    pdf.save(`POS11_Temperature_${formatDMY(payload?.date)}.pdf`);
  };

  /* CSV export */
  const csvSafe = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const exportCSV = () => {
    if (!rows.length) return;
    const headers = ["Cooler/Freezer", ...times, "Remarks"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      const row = [csvSafe(r.name)];
      for (const t of times) row.push(csvSafe(r?.temps?.[t] ?? ""));
      row.push(csvSafe(r?.remarks ?? r?.temps?.["Corrective Action"] ?? ""));
      lines.push(row.join(","));
    }
    const meta = [
      `Document Title:,Temperature Control Record`,
      `Document No:,FS-QM/REC/TMP`,
      `Area:,${BRANCH}`,
      `Date:,${formatDMY(payload?.date)}`,
    ].join("\n");
    const csv = meta + "\n\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS11_Temperature_${toISODate(payload?.date ? new Date(payload.date) : new Date()) || "report"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* Delete */
  const handleDelete = async () => {
    if (!selected) return;
    const pin = window.prompt("Enter PIN to delete:");
    if (pin !== ADMIN_PIN) {
      alert("❌ Wrong PIN.");
      return;
    }
    try {
      setOpMsg("⏳ Deleting…");
      const id = getId(selected);
      const res = await fetch(
        `${API_BASE}/api/reports/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setReports((prev) => {
        const rest = prev.filter((r) => getId(r) !== id);
        setSelectedId(rest[0] ? getId(rest[0]) : "");
        return rest;
      });

      setOpMsg("✅ Deleted.");
    } catch {
      setOpMsg("❌ Failed to delete.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  /* ===== Spectral table styles ===== */
  const gridStyle = useMemo(() => ({
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 15,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 2px 14px rgba(99,102,241,0.10)",
  }), []);
  const theadRow = {
    background: "linear-gradient(90deg,#7c3aed 0%,#0ea5e9 55%,#10b981 100%)",
  };
  const thCell = {
    border: "1px solid rgba(255,255,255,0.30)",
    padding: "10px 8px",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontWeight: 800,
    background: "transparent",
    color: "#fff",
  };
  const tdCell = {
    border: "1px solid #c7d2fe",
    padding: "9px 7px",
    textAlign: "center",
    verticalAlign: "middle",
  };

  const dateStr = payload?.date ? formatDMY(payload.date) : "—";

  return (
    <GlassShell
      icon="🌡️"
      title="Temperature Records — View (POS 11)"
      actions={
        <>
          <button onClick={exportPDF} style={btn("#0ea5e9")}>
            ⬇️ Export PDF
          </button>
          <button onClick={exportCSV} style={btn("#10b981")}>
            ⬇️ Export Excel (CSV)
          </button>
          <button onClick={handleDelete} style={btn("#ef4444")} data-delete-action="true">
            🗑️ Delete
          </button>
        </>
      }
    >
      <SidebarLayout
        sidebarWidth={300}
        sidebar={
          <DateTreeSidebar
            items={treeItems}
            activeKey={selectedId}
            onPick={(it) => setSelectedId(it.key)}
            loading={loading && !reports.length}
          />
        }
      >
        {loading && <p>Loading…</p>}
        {opMsg && (
          <div
            style={{
              marginBottom: 8,
              fontWeight: 700,
              color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46",
            }}
          >
            {opMsg}
          </div>
        )}
        {!loading && !selected && <EmptyState />}
        {selected && (
          <div ref={printRef} style={{ width: "100%", minWidth: 0 }}>
            {/* Glass meta badges */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: 10, fontSize: 14.5 }}>
              {[["Branch", BRANCH], ["Report Date", dateStr]].map(([k, v]) => (
                <div key={k} style={{
                  background: "linear-gradient(135deg, rgba(237,233,254,0.6), rgba(224,242,254,0.5))",
                  border: "1px solid rgba(139,92,246,0.25)",
                  borderRadius: 10,
                  padding: "7px 12px",
                }}>
                  <strong style={{ color: "#5b21b6" }}>{k}:</strong> {v || "—"}
                </div>
              ))}
            </div>

            {/* Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
              <SignatureName label="Checked By" name={safe(payload?.checkedBy)} align="start" />
              <SignatureName label="Verified By" name={safe(payload?.verifiedBy)} align="end" />
            </div>

            {/* Rules box */}
            <div style={{
              border: "1px solid rgba(139,92,246,0.25)",
              background: "rgba(241,245,249,0.7)",
              padding: "8px 10px",
              fontSize: 14,
              marginBottom: 10,
              borderRadius: 10,
            }}>
              <div>1. If the cooler temp is +5°C or more – corrective action should be taken.</div>
              <div>2. If the loading area is more than +16°C – corrective action should be taken.</div>
              <div>3. If the preparation area is more than +10°C – corrective action should be taken.</div>
              <div style={{ marginTop: 6 }}><b>Note (Freezers):</b> acceptable range -25°C to -12°C.</div>
              <div style={{ marginTop: 6 }}>
                <b>Corrective action:</b> Transfer the meat to another cold room and call maintenance department to check and solve the problem.
              </div>
            </div>

            {/* Data table */}
            <table style={gridStyle}>
              <thead>
                <tr style={theadRow}>
                  <th style={thCell}>Cooler/Freezer</th>
                  {times.map((t) => (
                    <th key={t} style={thCell}>{t}</th>
                  ))}
                  <th style={thCell}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...tdCell, textAlign: "left" }}>
                      <b>{safe(r.name)}</b>
                    </td>
                    {times.map((t) => (
                      <td key={t} style={tdCell}>{safe(r?.temps?.[t])}</td>
                    ))}
                    <td style={{ ...tdCell, textAlign: "left" }}>
                      {safe(r?.remarks || r?.temps?.["Corrective Action"])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* KPI */}
            <div style={{ marginTop: 10, fontWeight: 800, fontSize: 14 }}>
              KPI — Avg: {kpi.avg}°C | Min: {kpi.min}°C | Max: {kpi.max}°C | Out-of-range: {kpi.out}
              <span style={{ marginInlineStart: 10, fontWeight: 600, color: "#374151" }}>
                (Chillers/Coolers only)
              </span>
            </div>
          </div>
        )}
      </SidebarLayout>
    </GlassShell>
  );
}
