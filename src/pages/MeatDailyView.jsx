// src/pages/MeatDailyView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ========== API ========== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchDays() {
  const res = await fetch(`${API_BASE}/api/reports?type=meat_daily`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch");
  const json = await res.json();
  return Array.isArray(json) ? json : json?.data || [];
}
async function saveDay(reportDate, items) {
  const payload = {
    reporter: "anonymous",
    type: "meat_daily",
    payload: { reportDate, items, _clientSavedAt: Date.now() },
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Save failed");
}
async function deleteDay(reportDate) {
  const res = await fetch(
    `${API_BASE}/api/reports?type=meat_daily&reportDate=${encodeURIComponent(reportDate)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Delete failed");
}

/* ========== Helpers ========== */
function toTs(x) {
  if (!x) return 0;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) return parseInt(x.slice(0, 8), 16) * 1000;
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : 0;
}
function pickLatestPerDate(raw) {
  const out = new Map();
  raw.forEach((rec) => {
    const p = rec?.payload || {};
    const d = p.reportDate || rec?.reportDate || "";
    if (!d) return;
    const ts =
      toTs(rec?.updatedAt) || toTs(rec?.createdAt) || toTs(rec?._id) || toTs(p?._clientSavedAt);
    const curr = out.get(d);
    if (!curr || ts > curr.ts) {
      out.set(d, { reportDate: d, items: Array.isArray(p.items) ? p.items : [], ts });
    }
  });
  // ASC: oldest first
  return Array.from(out.values()).sort((a, b) => a.reportDate.localeCompare(b.reportDate));
}

/* ========== Constants ========== */
const STATUS = ["Near Expiry", "Expired", "Color change", "Found smell", "OK"];
const QTY_TYPES = ["KG", "PCS", "PLT"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

/* Build Year→Month→Day tree (ASC) */
function buildTree(days) {
  const byYear = new Map();
  for (const d of days) {
    const rd = d.reportDate || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rd)) continue;
    const y = rd.slice(0, 4);
    const m = rd.slice(5, 7);
    if (!byYear.has(y)) byYear.set(y, new Map());
    const ym = byYear.get(y);
    if (!ym.has(m)) ym.set(m, []);
    ym.get(m).push({ date: rd, count: d.items?.length || 0 });
  }
  const years = [...byYear.keys()]
    .sort((a, b) => a.localeCompare(b)) // ASC
    .map((y) => {
      const monthsMap = byYear.get(y);
      const months = [...monthsMap.keys()]
        .sort((a, b) => a.localeCompare(b)) // ASC
        .map((m) => ({
          month: m,
          label: `${MONTHS[parseInt(m, 10) - 1]} (${m})`,
          days: monthsMap.get(m).sort((a, b) => a.date.localeCompare(b.date)), // ASC
        }));
      return { year: y, months };
    });
  return years;
}

export default function MeatDailyView() {
  const [days, setDays] = useState([]);
  const [selected, setSelected] = useState("");
  const [msg, setMsg] = useState("");
  const [openYears, setOpenYears] = useState(new Set());
  const [openMonths, setOpenMonths] = useState(new Set());
  const importRef = useRef(null);

  async function reload() {
    try {
      const raw = await fetchDays();
      const normalized = pickLatestPerDate(raw); // ASC now
      setDays(normalized);

      if (normalized.length) {
        const earliest = normalized[0].reportDate; // oldest
        const y = earliest.slice(0, 4);
        const m = earliest.slice(5, 7);
        setOpenYears(new Set([y]));
        setOpenMonths(new Set([`${y}-${m}`]));
        if (!selected) setSelected(earliest);
      }
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to fetch from server.");
      setTimeout(() => setMsg(""), 2500);
    }
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line
  }, []);

  const tree = useMemo(() => buildTree(days), [days]);
  const day = useMemo(() => days.find((d) => d.reportDate === selected) || null, [days, selected]);

  const editVal = (i, k, v) => {
    setDays((prev) =>
      prev.map((d) =>
        d.reportDate !== selected
          ? d
          : { ...d, items: d.items.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)) }
      )
    );
  };

  const handleSave = async () => {
    if (!day) return;
    try {
      setMsg("⏳ Saving…");
      await saveDay(day.reportDate, day.items);
      setMsg("✅ Saved.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Save failed.");
    } finally {
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const handleDelete = async () => {
    if (!day) return;
    const ok = window.confirm(`Delete report ${day.reportDate}?`);
    if (!ok) return;
    try {
      setMsg("⏳ Deleting…");
      await deleteDay(day.reportDate);
      await reload();
      setMsg("✅ Deleted.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Delete failed.");
    } finally {
      setTimeout(() => setMsg(""), 2500);
    }
  };

  // JSON import/export
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(days, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meat_daily_all.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJSON = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("bad data");
      setMsg("⏳ Importing & saving…");
      for (const entry of data) {
        const d = entry?.reportDate;
        const items = Array.isArray(entry?.items) ? entry.items : [];
        if (!d) continue;
        await saveDay(d, items);
      }
      await reload();
      setMsg("✅ Imported.");
    } catch (e) {
      console.error(e);
      setMsg("❌ JSON import failed.");
    } finally {
      if (importRef.current) importRef.current.value = "";
      setTimeout(() => setMsg(""), 3000);
    }
  };

  const toggleYear = (y) =>
    setOpenYears((prev) => {
      const s = new Set(prev);
      s.has(y) ? s.delete(y) : s.add(y);
      return s;
    });
  const toggleMonth = (y, m) =>
    setOpenMonths((prev) => {
      const key = `${y}-${m}`;
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });

  const s = styles;

  return (
    <div style={s.page}>
      <h2 style={s.h2}>📄 Meat Daily — Reports</h2>

      {msg && <div style={s.note}>{msg}</div>}

      {/* Left tree (Year → Month → Day) + right details */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Left: Date tree */}
        <div style={s.left}>
          {tree.map(({ year, months }) => {
            const yOpen = openYears.has(year);
            const yearTotal = months.reduce(
              (acc, m) => acc + m.days.reduce((a, d) => a + d.count, 0),
              0
            );
            return (
              <div key={year}>
                <div
                  onClick={() => toggleYear(year)}
                  style={{
                    ...s.treeRow,
                    fontWeight: 800,
                    background: yOpen ? "#f1f5f9" : "#fff",
                    borderLeft: yOpen ? "5px solid #3b82f6" : "5px solid transparent",
                  }}
                >
                  <span>{yOpen ? "▼" : "►"} {year}</span>
                  <b>{yearTotal} items</b>
                </div>

                {yOpen &&
                  months.map(({ month, label, days: daysInMonth }) => {
                    const key = `${year}-${month}`;
                    const mOpen = openMonths.has(key);
                    const mTotal = daysInMonth.reduce((a, d) => a + d.count, 0);
                    return (
                      <div key={key}>
                        <div
                          onClick={() => toggleMonth(year, month)}
                          style={{ ...s.treeRow, paddingLeft: 22 }}
                        >
                          <span>{mOpen ? "▼" : "►"} {label}</span>
                          <b>{mTotal} items</b>
                        </div>

                        {mOpen &&
                          daysInMonth.map((d) => {
                            const active = selected === d.date;
                            return (
                              <div
                                key={d.date}
                                onClick={() => setSelected(d.date)}
                                style={{
                                  ...s.treeRow,
                                  paddingLeft: 44,
                                  background: active ? "#e0f2fe" : "#fff",
                                  borderLeft: active ? "5px solid #3b82f6" : "5px solid transparent",
                                }}
                              >
                                <span>📅 {d.date}</span>
                                <b>{d.count} items</b>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>

        {/* Right: Day details */}
        <div style={s.right}>
          {day ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 900, color: "#111" }}>
                  Report details ({day.reportDate})
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleSave} style={s.btnSave}>💾 Save</button>
                  <button onClick={exportJSON} style={s.btnDark}>⬇️ Export JSON</button>
                  <button onClick={() => importRef.current?.click()} style={s.btnPurple}>
                    ⬆️ Import JSON
                  </button>
                  <input
                    ref={importRef}
                    type="file"
                    accept="application/json"
                    onChange={importJSON}
                    style={{ display: "none" }}
                  />
                  <button onClick={handleDelete} style={s.btnDel}>🗑️ Delete this day</button>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>SL</th>
                      <th style={s.th}>PRODUCT NAME</th>
                      <th style={s.th}>QUANTITY</th>
                      <th style={s.th}>QTY TYPE</th>
                      <th style={s.th}>STATUS</th>
                      <th style={s.th}>EXPIRY DATE</th>
                      <th style={s.th}>REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.items.map((r, i) => (
                      <tr key={i}>
                        <td style={s.td}>{i + 1}</td>
                        <td style={s.td}>
                          <input
                            value={r.productName || ""}
                            onChange={(e) => editVal(i, "productName", e.target.value)}
                            style={s.in}
                            aria-label="Product Name"
                          />
                        </td>
                        <td style={s.td}>
                          <input
                            type="number"
                            min="0"
                            value={r.quantity ?? ""}
                            onChange={(e) => editVal(i, "quantity", e.target.value)}
                            style={s.in}
                            aria-label="Quantity"
                          />
                        </td>
                        <td style={s.td}>
                          <select
                            value={r.qtyType || "KG"}
                            onChange={(e) => editVal(i, "qtyType", e.target.value)}
                            style={s.sel}
                            aria-label="Quantity Type"
                          >
                            {QTY_TYPES.map((x) => (
                              <option key={x} value={x}>{x}</option>
                            ))}
                          </select>
                        </td>
                        <td style={s.td}>
                          <select
                            value={r.status || "Near Expiry"}
                            onChange={(e) => editVal(i, "status", e.target.value)}
                            style={s.sel}
                            aria-label="Status"
                          >
                            {STATUS.map((x) => (
                              <option key={x} value={x}>{x}</option>
                            ))}
                          </select>
                        </td>
                        <td style={s.td}>
                          <input
                            type="date"
                            value={r.expiry || ""}
                            onChange={(e) => editVal(i, "expiry", e.target.value)}
                            style={s.in}
                            aria-label="Expiry Date"
                          />
                        </td>
                        <td style={s.td}>
                          <input
                            value={r.remarks || ""}
                            onChange={(e) => editVal(i, "remarks", e.target.value)}
                            style={s.in}
                            aria-label="Remarks"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "#6b7280", padding: 60 }}>Select a day.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========== styles ========== */
const styles = {
  page: {
    fontFamily: "Cairo, sans-serif",
    padding: "1.2rem",
    direction: "ltr",
    background:
      "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(16,185,129,0.08) 50%, rgba(147,51,234,0.08) 100%)",
    minHeight: "100vh",
    color: "#111",
  },
  h2: { margin: "0 0 12px", fontWeight: "900", color: "#111827" },
  note: { marginBottom: 10, fontWeight: 800 },

  left: {
    minWidth: 300,
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 1px 10px #e8daef66",
    border: "1px solid #e5e7eb",
    maxHeight: "70vh",
    overflow: "auto",
  },
  treeRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 14px",
    cursor: "pointer",
    borderBottom: "1px dashed #e5e7eb",
  },
  right: {
    flex: 1,
    background: "#fff",
    borderRadius: 15,
    boxShadow: "0 1px 12px #e8daef44",
    minHeight: 320,
    padding: "16px",
    color: "#111",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    border: "1px solid #b6c8e3",
    minWidth: 900,
    tableLayout: "fixed",
  },
  th: {
    padding: "10px 8px",
    textAlign: "center",
    fontWeight: "bold",
    border: "1px solid #b6c8e3",
    background: "#e6f0ff",
    color: "#0f172a",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "8px 6px",
    textAlign: "center",
    border: "1px solid #b6c8e3",
    background: "#f8fbff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle",
  },

  in: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid #b6c8e3",
    background: "#eef6ff",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  sel: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid #b6c8e3",
    background: "#eef6ff",
  },

  btnSave: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  btnDel: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  btnDark: {
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  btnPurple: {
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
