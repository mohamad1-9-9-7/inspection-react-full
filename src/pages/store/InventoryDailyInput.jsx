// D:\inspection-react-full\src\pages\store\InventoryDailyInput.jsx
import React, { useMemo, useState } from "react";

/* ===== API base (مطابق لباقي المشروع) ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL || process.env?.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== Helpers ===== */
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_OPTIONS = [
  { value: "OK",          label: "OK" },
  { value: "NEAR_EXPIRY", label: "Near Expiry (≤7 days)" },
  { value: "EXPIRED",     label: "Expired" },
  { value: "DAMAGED",     label: "Damaged/Returned" },
  { value: "UNKNOWN",     label: "Unknown" },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(dateStr + "T00:00:00").getTime();
  return Math.round((target - startOfToday) / (1000 * 60 * 60 * 24));
}

function autoStatus(row) {
  if (!row.expDate) return "UNKNOWN";
  const d = daysUntil(row.expDate);
  if (d == null) return "UNKNOWN";
  if (d < 0) return "EXPIRED";
  if (d <= 7) return "NEAR_EXPIRY";
  return "OK";
}

const NEW_ROW = () => ({
  id: Math.random().toString(36).slice(2),
  code: "",
  name: "",
  qtyPcs: "",
  qtyKg: "",
  prodDate: "",
  expDate: "",
  awbNo: "",
  sifNo: "",
  supplierName: "",
  status: "OK",
  _manualStatus: false,
  remarks: "",
});

const NEW_SECTION = (title = "New Section", rowsCount = 5) => ({
  id: "sec_" + Math.random().toString(36).slice(2),
  title,
  rows: Array.from({ length: Math.max(1, rowsCount) }, NEW_ROW),
});

/* ===== Component ===== */
export default function InventoryDailyInput() {
  const [date, setDate] = useState(today());
  const [sections, setSections] = useState([NEW_SECTION("General", 5)]);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Add-section controls
  const [newSecTitle, setNewSecTitle] = useState("");
  const [newSecRows, setNewSecRows] = useState(5);

  // Totals across all sections
  const totals = useMemo(() => {
    const allRows = sections.flatMap((s) => s.rows);
    const sum = (k) => allRows.reduce((a, r) => a + (parseFloat(r[k]) || 0), 0);
    return { qtyPcs: sum("qtyPcs"), qtyKg: sum("qtyKg") };
  }, [sections]);

  function updateRow(sectionId, rowId, key, value) {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const rows = sec.rows.map((r) => {
          if (r.id !== rowId) return r;
          const next = { ...r, [key]: value };
          if ((key === "expDate" || key === "prodDate") && !r._manualStatus) {
            next.status = autoStatus(next);
          }
          if (key === "status") next._manualStatus = true;
          return next;
        });
        return { ...sec, rows };
      })
    );
  }

  function addRow(sectionId) {
    setSections((prev) =>
      prev.map((sec) => (sec.id === sectionId ? { ...sec, rows: [...sec.rows, NEW_ROW()] } : sec))
    );
  }

  function removeRow(sectionId, rowId) {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const rows = sec.rows.length > 1 ? sec.rows.filter((r) => r.id !== rowId) : sec.rows;
        return { ...sec, rows };
      })
    );
  }

  function addSection() {
    const t = newSecTitle.trim() || "New Section";
    const n = Math.max(1, parseInt(newSecRows, 10) || 1);
    setSections((prev) => [...prev, NEW_SECTION(t, n)]);
    setNewSecTitle("");
    setNewSecRows(5);
  }

  function deleteSection(sectionId) {
    setSections((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== sectionId) : prev));
  }

  /* ===== Save to server only (no localStorage) ===== */
  async function save() {
    // Clean rows (status auto if not manually set)
    const cleanSections = sections.map((sec) => ({
      ...sec,
      rows: sec.rows
        .map((r) => ({ ...r, status: r._manualStatus ? r.status : autoStatus(r) }))
        .filter((r) => r.code?.trim() || r.name?.trim()),
    }));

    const hasAny = cleanSections.some((s) => s.rows.length);
    if (!hasAny) {
      setMessage("⚠️ Please add at least one line (product code or name).");
      return;
    }

    // ✅ الشكل الذي يطلبه السيرفر: type + payload
    const body = {
      type: "inventory_daily_grouped",
      payload: {
        date,                                // التاريخ داخل الـpayload
        createdAt: new Date().toISOString(),
        totals,
        sections: cleanSections,
        branch: "STORE",                     // اختياري
      },
    };

    try {
      setIsSaving(true);
      setMessage("⏳ Saving to server…");
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Server responded ${res.status}: ${txt || res.statusText}`);
      }
      setMessage("✅ Saved to server successfully.");
    } catch (err) {
      console.error(err);
      setMessage("❌ Server error: failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  /* ===== Styles ===== */
  const BORDER = "#cfd8e3";
  const page = { padding: 16 };
  const card = {
    width: "100%",
    margin: "0 auto",
    borderRadius: 16,
    border: `1px solid ${BORDER}`,
    background: "linear-gradient(180deg,#ffffff, #f8fafc)",
    boxShadow: "0 12px 40px rgba(2,6,23,.08)",
    overflow: "hidden",
  };
  const header = {
    padding: "18px 20px",
    background: "linear-gradient(135deg,#3b82f6 0%,#8b5cf6 60%,#22d3ee 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };
  const title = { margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: .2 };
  const sub = { margin: 0, opacity: .92, fontSize: 13, fontWeight: 600 };

  const bar = {
    padding: "12px 16px",
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    borderBottom: `1px solid ${BORDER}`,
    background: "#fbfdff",
  };
  const inputTop = {
    padding: "8px 10px",
    border: "1px solid #c7d2fe",
    borderRadius: 10,
    outline: "none",
    background: "#fff",
    minWidth: 220,
    boxShadow: "0 1px 0 rgba(2,6,23,.02)",
  };
  const smallInp = {
    padding: "8px 10px",
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    outline: "none",
    background: "#fff",
  };
  const pill = (bg, border, color = "#fff") => ({
    padding: "10px 14px",
    border: `1px solid ${border}`,
    borderRadius: 999,
    background: bg,
    color,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(2,6,23,.12)",
  });

  const wrap = { padding: 16 };
  const table = {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 13,
  };
  const th = {
    position: "sticky",
    top: 0,
    background: "#f1f5f9",
    color: "#0f172a",
    textAlign: "left",
    padding: "10px 8px",
    border: `1px solid ${BORDER}`,
    zIndex: 1,
    whiteSpace: "nowrap",
  };
  const td = {
    padding: "8px",
    border: `1px solid ${BORDER}`,
    verticalAlign: "top",
    background: "#fff",
  };
  const tdNum = { ...td, textAlign: "right", whiteSpace: "nowrap" };
  const inp = {
    width: "100%",
    padding: "7px 9px",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    outline: "none",
    background: "#ffffff",
    boxSizing: "border-box",
  };
  const inpNum = { ...inp, textAlign: "right" };
  const btnDel = {
    padding: "7px 10px",
    border: "1px solid #fecaca",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  };

  const secHeaderTd = {
    ...td,
    background: "#f8fafc",
    fontWeight: 900,
    fontSize: 14,
  };

  return (
    <div style={page}>
      <div style={card}>
        {/* Header */}
        <div style={header}>
          <div>
            <h3 style={title}>Daily Inventory — Store</h3>
            <p style={sub}>Group your lines by category (e.g., Chilled, Vacuum, etc.) and save.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ color: "rgba(255,255,255,.9)", fontWeight: 700 }}>{message}</div>
          </div>
        </div>

        {/* Top bar */}
        <div style={bar}>
          <label style={{ fontWeight: 700 }}>
            Date:
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputTop, marginLeft: 8 }} />
          </label>

          {/* Add Section Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              style={{ ...smallInp, minWidth: 200 }}
              placeholder="Section title (e.g., Chilled)"
              value={newSecTitle}
              onChange={(e) => setNewSecTitle(e.target.value)}
            />
            <input
              type="number"
              min={1}
              style={{ ...smallInp, width: 110 }}
              value={newSecRows}
              onChange={(e) => setNewSecRows(e.target.value)}
              placeholder="# rows"
            />
            <button onClick={addSection} style={pill("#ffffff", BORDER, "#0f172a")}>+ Add Section</button>
          </div>

          <div style={{ flex: 1 }} />
          <button onClick={save} disabled={isSaving} style={pill("linear-gradient(90deg,#22d3ee,#3b82f6)", "transparent")}>
            {isSaving ? "Saving…" : "💾 Save"}
          </button>
        </div>

        {/* Table */}
        <div style={wrap}>
          <table style={table}>
            {/* widths sum = 100% */}
            <colgroup>
              <col style={{ width: "3%"  }} />  {/* # */}
              <col style={{ width: "8%"  }} />  {/* Product Code */}
              <col style={{ width: "22%" }} />  {/* Product Name */}
              <col style={{ width: "6%"  }} />  {/* Qty (pcs) */}
              <col style={{ width: "6%"  }} />  {/* Qty (kg) */}
              <col style={{ width: "8%"  }} />  {/* Production Date */}
              <col style={{ width: "8%"  }} />  {/* Expiry Date */}
              <col style={{ width: "7%"  }} />  {/* AWB */}
              <col style={{ width: "6%"  }} />  {/* SIF */}
              <col style={{ width: "10%" }} />  {/* Supplier Name */}
              <col style={{ width: "6%"  }} />  {/* Status */}
              <col style={{ width: "6%"  }} />  {/* Remarks */}
              <col style={{ width: "4%"  }} />  {/* Actions */}
            </colgroup>

            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Product Code</th>
                <th style={th}>Product Name</th>
                <th style={th}>Qty (pcs)</th>
                <th style={th}>Qty (kg)</th>
                <th style={th}>Production Date</th>
                <th style={th}>Expiry Date</th>
                <th style={th}>AWB No.</th>
                <th style={th}>SIF No.</th>
                <th style={th}>Supplier Name</th>
                <th style={th}>Status</th>
                <th style={th}>Remarks</th>
                <th style={th}></th>
              </tr>
            </thead>

            <tbody>
              {sections.map((sec, sIdx) => (
                <React.Fragment key={sec.id}>
                  {/* Section header row */}
                  <tr>
                    <td style={secHeaderTd} colSpan={13}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>▦ {sIdx + 1}. {sec.title}</span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => addRow(sec.id)} style={pill("#ffffff", BORDER, "#0f172a")}>+ Add Row</button>
                          <button onClick={() => deleteSection(sec.id)} style={pill("#fee2e2", "#fecaca", "#7f1d1d")}>🗑 Delete Section</button>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Section rows */}
                  {sec.rows.map((r, idx) => {
                    const d = daysUntil(r.expDate);
                    const hint =
                      r._manualStatus
                        ? ""
                        : (r.expDate
                            ? d < 0
                              ? "Expired"
                              : d <= 7
                              ? `Near expiry (${d} day${d === 1 ? "" : "s"})`
                              : ""
                            : "No expiry date");

                    const rowNumber = sec.rows.slice(0, idx).length +
                      sections.slice(0, sIdx).reduce((a, ss) => a + ss.rows.length, 0) + 1;

                    return (
                      <tr key={r.id}>
                        <td style={td}>{rowNumber}</td>
                        <td style={td}>
                          <input style={inp} value={r.code} onChange={(e) => updateRow(sec.id, r.id, "code", e.target.value)} placeholder="e.g., 100245" />
                        </td>
                        <td style={td}>
                          <input style={inp} value={r.name} onChange={(e) => updateRow(sec.id, r.id, "name", e.target.value)} placeholder="Product name" />
                        </td>
                        <td style={tdNum}>
                          <input type="number" step="0.01" style={inpNum} value={r.qtyPcs} onChange={(e) => updateRow(sec.id, r.id, "qtyPcs", e.target.value)} />
                        </td>
                        <td style={tdNum}>
                          <input type="number" step="0.01" style={inpNum} value={r.qtyKg} onChange={(e) => updateRow(sec.id, r.id, "qtyKg", e.target.value)} />
                        </td>
                        <td style={td}>
                          <input type="date" style={inp} value={r.prodDate} onChange={(e) => updateRow(sec.id, r.id, "prodDate", e.target.value)} />
                        </td>
                        <td style={td}>
                          <input type="date" style={inp} value={r.expDate} onChange={(e) => updateRow(sec.id, r.id, "expDate", e.target.value)} />
                          {hint && <div style={{ fontSize: 11, color: "#b91c1c", marginTop: 4 }}>{hint}</div>}
                        </td>
                        <td style={td}>
                          <input style={inp} value={r.awbNo} onChange={(e) => updateRow(sec.id, r.id, "awbNo", e.target.value)} placeholder="Air Waybill" />
                        </td>
                        <td style={td}>
                          <input style={inp} value={r.sifNo} onChange={(e) => updateRow(sec.id, r.id, "sifNo", e.target.value)} placeholder="SIF No." />
                        </td>
                        <td style={td}>
                          <input style={inp} value={r.supplierName} onChange={(e) => updateRow(sec.id, r.id, "supplierName", e.target.value)} placeholder="Supplier" />
                        </td>
                        <td style={td}>
                          <select style={inp} value={r.status} onChange={(e) => updateRow(sec.id, r.id, "status", e.target.value)}>
                            {STATUS_OPTIONS.map((op) => (<option key={op.value} value={op.value}>{op.label}</option>))}
                          </select>
                        </td>
                        <td style={td}>
                          <input style={inp} value={r.remarks} onChange={(e) => updateRow(sec.id, r.id, "remarks", e.target.value)} placeholder="Notes…" />
                        </td>
                        <td style={td}>
                          <button onClick={() => removeRow(sec.id, r.id)} style={btnDel}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>

            <tfoot>
              <tr>
                <td style={{ ...td, background: "#f1f5f9", fontWeight: 900 }} colSpan={3}>Totals</td>
                <td style={{ ...tdNum, background: "#f1f5f9", fontWeight: 900 }}>{(+totals.qtyPcs || 0).toFixed(2)}</td>
                <td style={{ ...tdNum, background: "#f1f5f9", fontWeight: 900 }}>{(+totals.qtyKg || 0).toFixed(2)}</td>
                <td style={{ ...td, background: "#f1f5f9" }} colSpan={8}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
