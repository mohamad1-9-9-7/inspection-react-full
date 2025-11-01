// D:\inspection-react-full\src\pages\store\InventoryDailyBrowse.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ===== API base (متوافق مع باقي المشروع) ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL || process.env?.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== constants / helpers ===== */
const STATUS_LABELS = {
  OK: "OK",
  NEAR_EXPIRY: "Near Expiry (≤7 days)",
  EXPIRED: "Expired",
  DAMAGED: "Damaged/Returned",
  UNKNOWN: "Unknown",
};

/* فك التغليف وتطبيع شكل التقرير القادم من السيرفر */
function normalizeServerReport(r) {
  if (!r) return null;

  const p = r.payload && typeof r.payload === "object" ? r.payload : {};
  const base = {
    id: r.id || r._id || p.id || p._id || p.date || Math.random().toString(36).slice(2),
    type: r.type || p.type || "inventory_daily_grouped",
    date: p.date || r.date || "",
    createdAt: r.createdAt || p.createdAt || r.updatedAt || new Date().toISOString(),
    totals: p.totals || r.totals || null,
    sections: p.sections || r.sections || r.rows || [],
    branch: p.branch || r.branch || "",
  };

  return ensureGroupedShape(base);
}

/* يضمن وجود sections حتى لو رجع بصيغة rows قديمة */
function ensureGroupedShape(report) {
  if (!report) return null;
  if (Array.isArray(report.sections)) return report;

  if (Array.isArray(report.rows)) {
    return {
      ...report,
      sections: [
        {
          id: "sec_legacy",
          title: "General",
          rows: report.rows.map((r) => ({
            id: r.id || Math.random().toString(36).slice(2),
            code: r.code || r.item || "",
            name: r.name || r.productName || "",
            supplierName: r.supplierName || r.supplier || "",
            qtyPcs: r.qtyPcs ?? "",
            qtyKg: r.qtyKg ?? "",
            prodDate: r.prodDate || "",
            expDate: r.expDate || "",
            awbNo: r.awbNo || "",
            sifNo: r.sifNo || "",
            status: r.status || "UNKNOWN",
            _manualStatus: true,
            remarks: r.remarks || "",
          })),
        },
      ],
    };
  }
  return { ...report, sections: [] };
}

function groupByDateTree(reports) {
  const tree = {};
  for (const r of reports) {
    const d = String(r.date || "");
    const y = d.slice(0, 4) || "----";
    const m = d.slice(5, 7) || "--";
    tree[y] ||= {};
    tree[y][m] ||= [];
    tree[y][m].push(r);
  }
  Object.keys(tree).forEach((y) => {
    Object.keys(tree[y]).forEach((m) => {
      tree[y][m].sort((a, b) => (a.date < b.date ? 1 : -1));
    });
  });
  return tree;
}

export default function InventoryDailyBrowse() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // لشجرة التاريخ (فتح/إغلاق)
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({}); // key "YYYY-MM"

  // تحميل جميع تقارير النوع inventory_daily_grouped من السيرفر فقط
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setMsg("Loading from server…");
        const res = await fetch(`${API_BASE}/api/reports?type=inventory_daily_grouped`);
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`Server ${res.status}: ${t || res.statusText}`);
        }
        const raw = await res.json();

        // الرد قد يكون مصفوفة مباشرة أو كائن { ok, data }
        const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        const normalized = arr
          .map(normalizeServerReport)
          .filter(Boolean)
          .sort((a, b) => (a.date < b.date ? 1 : -1)); // الأحدث أولًا

        if (!cancelled) {
          setList(normalized);
          setSelected(normalized[0] || null);
          setMsg(normalized.length ? "" : "No reports found on server.");

          if (normalized[0]?.date) {
            const y = normalized[0].date.slice(0, 4);
            const m = normalized[0].date.slice(5, 7);
            setOpenYears((p) => ({ ...p, [y]: true }));
            setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setMsg("Failed to load from server.");
          setList([]);
          setSelected(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const grandTotals = useMemo(() => {
    if (!selected?.sections?.length) return { qtyPcs: 0, qtyKg: 0 };
    const rows = selected.sections.flatMap((s) => s.rows || []);
    const sum = (k) => rows.reduce((a, r) => a + (parseFloat(r[k]) || 0), 0);
    return { qtyPcs: sum("qtyPcs"), qtyKg: sum("qtyKg") };
  }, [selected]);

  const dateTree = useMemo(() => groupByDateTree(list), [list]);

  function requirePassword() {
    const pwd = window.prompt("Enter password:");
    return pwd === "12345";
  }

  async function handleDelete() {
    if (!selected) return;
    if (!requirePassword()) return;
    if (!window.confirm(`Delete report dated ${selected.date}? This cannot be undone.`)) return;
    try {
      setMsg("Deleting…");
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "inventory_daily_grouped" }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Server ${res.status}: ${t || res.statusText}`);
      }
      const next = list.filter((r) => r.id !== selected.id);
      setList(next);
      setSelected(next[0] || null);
      setMsg("Deleted successfully.");
    } catch (e) {
      console.error(e);
      setMsg("Delete failed.");
    }
  }

  function handleEdit() {
    if (!selected) return;
    if (!requirePassword()) return;
    const url = `/store/inventory-daily/input?date=${encodeURIComponent(selected.date)}`;
    window.location.href = url;
  }

  async function handleExportXLSX() {
    if (!selected) return;
    setMsg("Preparing XLSX…");
    try {
      const xlsx = await import("xlsx");
      const rows = [];
      for (const sec of selected.sections || []) {
        rows.push({
          Section: sec.title,
          "#": "",
          "Product Code": "",
          "Product Name": "",
          "Qty (pcs)": "",
          "Qty (kg)": "",
          "Production Date": "",
          "Expiry Date": "",
          "AWB No.": "",
          "SIF No.": "",
          "Supplier Name": "",
          Status: "",
          Remarks: "",
        });
        let i = 1;
        for (const r of sec.rows || []) {
          rows.push({
            Section: sec.title,
            "#": i++,
            "Product Code": r.code || "",
            "Product Name": r.name || "",
            "Qty (pcs)": r.qtyPcs ?? "",
            "Qty (kg)": r.qtyKg ?? "",
            "Production Date": r.prodDate || "",
            "Expiry Date": r.expDate || "",
            "AWB No.": r.awbNo || "",
            "SIF No.": r.sifNo || "",
            "Supplier Name": r.supplierName || "",
            Status: STATUS_LABELS[r.status] || r.status || "",
            Remarks: r.remarks || "",
          });
        }
      }
      const ws = xlsx.utils.json_to_sheet(rows, { skipHeader: false });
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Inventory");
      const fname = `inventory_grouped_${selected.date}.xlsx`;
      xlsx.writeFile(wb, fname);
      setMsg("Exported.");
    } catch (e) {
      console.error(e);
      setMsg("XLSX export failed. Make sure 'xlsx' is installed.");
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={layout}>
        {/* ========== Date Tree (left) ========== */}
        <aside style={aside}>
          <div style={asideHeader}>Date Tree</div>
          <div style={treeWrap}>
            {Object.keys(dateTree)
              .sort((a, b) => (a < b ? 1 : -1))
              .map((year) => {
                const months = dateTree[year];
                const yOpen = !!openYears[year];
                return (
                  <div key={year} style={treeYear}>
                    <button
                      onClick={() => setOpenYears((p) => ({ ...p, [year]: !yOpen }))}
                      style={treeToggle}
                    >
                      <span style={{ marginInlineEnd: 6 }}>{yOpen ? "▾" : "▸"}</span>
                      <strong>{year}</strong>
                    </button>
                    {yOpen &&
                      Object.keys(months)
                        .sort((a, b) => (a < b ? 1 : -1))
                        .map((month) => {
                          const key = `${year}-${month}`;
                          const mOpen = !!openMonths[key];
                          const reps = months[month];
                          return (
                            <div key={key} style={treeMonth}>
                              <button
                                onClick={() =>
                                  setOpenMonths((p) => ({ ...p, [key]: !mOpen }))
                                }
                                style={treeToggle}
                              >
                                <span style={{ marginInlineEnd: 6 }}>
                                  {mOpen ? "▾" : "▸"}
                                </span>
                                <span>
                                  {year}-{month}
                                </span>
                              </button>
                              {mOpen && (
                                <div style={{ marginInlineStart: 20 }}>
                                  {reps
                                    .slice()
                                    .sort((a, b) => (a.date < b.date ? 1 : -1))
                                    .map((r) => (
                                      <div key={r.id} style={treeDayRow}>
                                        <button
                                          onClick={() => setSelected(r)}
                                          style={{
                                            ...treeDayBtn,
                                            ...(selected?.id === r.id ? treeDayBtnActive : null),
                                          }}
                                          title={new Date(r.createdAt).toLocaleString()}
                                        >
                                          {r.date}
                                        </button>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                  </div>
                );
              })}
          </div>
        </aside>

        {/* ========== Main Card (right) ========== */}
        <div style={{ flex: 1 }}>
          <div style={card}>
            {/* Header */}
            <div style={header}>
              <div>
                <h3 style={title}>Daily Inventory — Browse (Grouped)</h3>
                <p style={sub}>View saved grouped inventory reports by date (server data).</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={handleExportXLSX} style={pill("#ffffff", "#cbd5e1", "#0f172a")} disabled={!selected || loading}>
                  ⬇️ Export XLSX
                </button>
                <button onClick={handleEdit} style={pill("#fef9c3", "#fde68a", "#78350f")} disabled={!selected || loading}>
                  ✏️ Edit
                </button>
                <button onClick={handleDelete} style={pill("#fee2e2", "#fecaca", "#7f1d1d")} disabled={!selected || loading}>
                  🗑 Delete
                </button>
                <div style={{ color: "rgba(255,255,255,.9)", fontWeight: 700, marginInlineStart: 8 }}>
                  {loading
                    ? "Loading…"
                    : selected
                    ? `Saved @ ${new Date(selected.createdAt).toLocaleString()}`
                    : msg || ""}
                </div>
              </div>
            </div>

            {/* Top bar (quick select) */}
            <div style={bar}>
              <strong style={{ marginRight: 8 }}>Report date:</strong>
              <select
                value={selected?.date || ""}
                onChange={(e) =>
                  setSelected(list.find((x) => x.date === e.target.value) || null)
                }
                style={selectTop}
                disabled={loading || !list.length}
              >
                {list.map((x) => (
                  <option key={x.id || x.date} value={x.date}>
                    {x.date}
                  </option>
                ))}
              </select>

              <div style={{ marginInlineStart: "auto", color: "#64748b", fontWeight: 700 }}>
                {msg}
              </div>
            </div>

            {!selected ? (
              <div style={{ padding: 16, color: "#b91c1c" }}>
                {loading ? "Please wait…" : (msg || "No server data.")}
              </div>
            ) : (
              <div style={wrap}>
                <table style={table}>
                  <colgroup>
                    <col style={{ width: "3%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "10%" }} />
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
                    </tr>
                  </thead>

                  <tbody>
                    {selected.sections.map((sec, sIdx) => {
                      const sum = (k) =>
                        (sec.rows || []).reduce((a, r) => a + (parseFloat(r[k]) || 0), 0);
                      const secTotals = {
                        qtyPcs: sum("qtyPcs"),
                        qtyKg: sum("qtyKg"),
                      };

                      return (
                        <React.Fragment key={sec.id}>
                          {/* section header row */}
                          <tr>
                            <td style={secHeaderTd} colSpan={12}>
                              {sIdx + 1}. {sec.title}
                            </td>
                          </tr>

                          {(sec.rows || []).map((r, idx) => {
                            const rowNumber =
                              idx +
                              selected.sections
                                .slice(0, sIdx)
                                .reduce((a, ss) => a + (ss.rows?.length || 0), 0) +
                              1;
                            return (
                              <tr key={r.id || rowNumber}>
                                <td style={td}>{rowNumber}</td>
                                <td style={td}>{r.code}</td>
                                <td style={td}>{r.name}</td>
                                <td style={tdNum}>{(+r.qtyPcs || 0).toFixed(2)}</td>
                                <td style={tdNum}>{(+r.qtyKg || 0).toFixed(2)}</td>
                                <td style={td}>{r.prodDate || ""}</td>
                                <td style={td}>{r.expDate || ""}</td>
                                <td style={td}>{r.awbNo}</td>
                                <td style={td}>{r.sifNo}</td>
                                <td style={td}>{r.supplierName}</td>
                                <td style={td}>{STATUS_LABELS[r.status] || r.status || "—"}</td>
                                <td style={td}>{r.remarks}</td>
                              </tr>
                            );
                          })}

                          {/* section subtotal */}
                          <tr>
                            <td style={{ ...td, background: "#f8fafc", fontWeight: 700 }} colSpan={3}>
                              Section Total — {sec.title}
                            </td>
                            <td style={{ ...tdNum, background: "#f8fafc", fontWeight: 700 }}>
                              {secTotals.qtyPcs.toFixed(2)}
                            </td>
                            <td style={{ ...tdNum, background: "#f8fafc", fontWeight: 700 }}>
                              {secTotals.qtyKg.toFixed(2)}
                            </td>
                            <td style={{ ...td, background: "#f8fafc" }} colSpan={7}></td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                  {/* grand totals */}
                  <tfoot>
                    <tr>
                      <td style={{ ...td, background: "#eef2ff", fontWeight: 900 }} colSpan={3}>
                        Totals (All Sections)
                      </td>
                      <td style={{ ...tdNum, background: "#eef2ff", fontWeight: 900 }}>
                        {grandTotals.qtyPcs.toFixed(2)}
                      </td>
                      <td style={{ ...tdNum, background: "#eef2ff", fontWeight: 900 }}>
                        {grandTotals.qtyKg.toFixed(2)}
                      </td>
                      <td style={{ ...td, background: "#eef2ff" }} colSpan={7}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Layout styles ===== */
const layout = {
  display: "grid",
  gridTemplateColumns: "300px 1fr",
  gap: 16,
};

const aside = {
  borderRadius: 16,
  border: "1px solid #cfd8e3",
  background: "linear-gradient(180deg,#ffffff, #f8fafc)",
  boxShadow: "0 12px 40px rgba(2,6,23,.08)",
  overflow: "hidden",
  height: "calc(100vh - 120px)",
  position: "sticky",
  top: 16,
  display: "flex",
  flexDirection: "column",
};

const asideHeader = {
  padding: "12px 14px",
  background: "linear-gradient(135deg,#3b82f6 0%,#8b5cf6 60%,#22d3ee 100%)",
  color: "#fff",
  fontWeight: 900,
};

const treeWrap = {
  padding: 12,
  overflowY: "auto",
  flex: 1,
};

const treeYear = { marginBottom: 8 };
const treeMonth = { margin: "6px 0 6px 12px" };

const treeToggle = {
  background: "transparent",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 800,
  width: "100%",
  textAlign: "left",
};

const treeDayRow = { margin: "6px 0" };

const treeDayBtn = {
  width: "100%",
  textAlign: "left",
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const treeDayBtnActive = {
  borderColor: "#3b82f6",
  boxShadow: "0 0 0 2px rgba(59,130,246,.2) inset",
};

/* ===== Card/Table styles (مطابقة للإدخال) ===== */
const BORDER = "#cfd8e3";
const card = {
  width: "100%",
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
const title = { margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: 0.2 };
const sub = { margin: 0, opacity: 0.92, fontSize: 13, fontWeight: 600 };
const bar = {
  padding: "12px 16px",
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  borderBottom: `1px solid ${BORDER}`,
  background: "#fbfdff",
};
const selectTop = {
  padding: "8px 10px",
  border: "1px solid #c7d2fe",
  borderRadius: 10,
  outline: "none",
  background: "#fff",
  minWidth: 220,
  boxShadow: "0 1px 0 rgba(2,6,23,.02)",
};
const wrap = { padding: 16, overflowX: "hidden" };
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
const secHeaderTd = {
  ...td,
  background: "#f8fafc",
  fontWeight: 900,
  fontSize: 14,
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
