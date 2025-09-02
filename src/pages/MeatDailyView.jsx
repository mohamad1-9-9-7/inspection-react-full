// src/pages/MeatDailyView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ========== API ========== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/* رفع صورة للسيرفر -> يرجّع رابط Cloudinary (المضغوط إن وُجد) */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file); // موحّد مع السيرفر

  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url; // استخدم المضغوط إن متاح
}

/* حذف صورة من التخزين عبر السيرفر (Cloudinary) */
async function deleteImage(url) {
  if (!url) return;
  // مسار متوافق: DELETE /api/images?url=<encoded>
  const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Delete image failed");
  }
}

/* حذف مجموعة صور بتسلسل مع تحمّل الأخطاء */
async function deleteImagesMany(urls = []) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) return { ok: true, deleted: 0, failed: 0 };

  const results = await Promise.allSettled(unique.map((u) => deleteImage(u)));
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - deleted;
  return { ok: failed === 0, deleted, failed };
}

/* تقارير اليوميات */
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
  return Array.from(out.values()).sort((a, b) => a.reportDate.localeCompare(b.reportDate));
}

/* اجمع كل روابط الصور من عناصر يوم واحد */
function collectImages(items = []) {
  const all = [];
  for (const it of items) {
    const arr = Array.isArray(it?.images) ? it.images : [];
    for (const u of arr) if (u) all.push(u);
  }
  return all;
}

/* ========== Constants ========== */
const STATUS = ["Near Expiry", "Expired", "Color change", "Found smell", "OK"];
const QTY_TYPES = ["KG", "PCS", "PLT"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

/* ====== Build Year→Month→Day tree (ASC) ====== */
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
    .sort((a, b) => a.localeCompare(b))
    .map((y) => {
      const monthsMap = byYear.get(y);
      const months = [...monthsMap.keys()]
        .sort((a, b) => a.localeCompare(b))
        .map((m) => ({
          month: m,
          label: `${MONTHS[parseInt(m, 10) - 1]} (${m})`,
          days: monthsMap.get(m).sort((a, b) => a.date.localeCompare(b.date)),
        }));
      return { year: y, months };
    });
  return years;
}

/* ========= Images manager modal ========= */
function ImageManagerModal({ open, row, onClose, onAddImages, onRemoveImage }) {
  const [previewSrc, setPreviewSrc] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) setPreviewSrc("");
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handlePick = () => inputRef.current?.click();

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const urls = [];
    for (const f of files) {
      try {
        const url = await uploadViaServer(f);
        urls.push(url);
      } catch (err) {
        console.error("upload failed:", err);
      }
    }
    if (urls.length) onAddImages(urls);
    e.target.value = "";
  };

  return (
    <div style={galleryBack} onClick={onClose}>
      <div style={galleryCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>
            🖼️ Product Images {row?.productName ? `— ${row.productName}` : ""}
          </div>
          <button onClick={onClose} style={galleryClose}>✕</button>
        </div>

        {previewSrc && (
          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <img src={previewSrc} alt="preview" style={{ maxWidth: "100%", maxHeight: 700, borderRadius: 15, boxShadow: "0 6px 18px rgba(0,0,0,.2)" }} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 8 }}>
          <button onClick={handlePick} style={btnBlueModal}>⬆️ Upload images</button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            style={{ display: "none" }}
          />
          <div style={{ fontSize: 13, color: "#334155" }}>Unlimited images per product (server processes automatically).</div>
        </div>

        <div style={thumbsWrap}>
          {(row?.images || []).length === 0 ? (
            <div style={{ color: "#64748b" }}>No images yet.</div>
          ) : (
            row.images.map((src, i) => (
              <div key={i} style={thumbTile} title={`Image ${i + 1}`}>
                <img src={src} alt={`img-${i}`} style={thumbImg} onClick={() => setPreviewSrc(src)} />
                <button title="Remove" onClick={() => onRemoveImage(i)} style={thumbRemove}>✕</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function MeatDailyView() {
  const [days, setDays] = useState([]);
  const [selected, setSelected] = useState("");
  const [msg, setMsg] = useState("");
  const [openYears, setOpenYears] = useState(new Set());
  const [openMonths, setOpenMonths] = useState(new Set());
  const importRef = useRef(null);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageRowIndex, setImageRowIndex] = useState(-1);

  async function reload() {
    try {
      const raw = await fetchDays();
      const normalized = pickLatestPerDate(raw);
      setDays(normalized);

      if (normalized.length) {
        const earliest = normalized[0].reportDate;
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
  }, []); // eslint-disable-line

  const tree = useMemo(() => buildTree(days), [days]);
  const day = useMemo(() => days.find((d) => d.reportDate === selected) || null, [days, selected]);

  const ensureImagesArray = (r) => (Array.isArray(r.images) ? r.images : []);

  const editVal = (i, k, v) => {
    setDays((prev) =>
      prev.map((d) =>
        d.reportDate !== selected
          ? d
          : {
              ...d,
              items: d.items.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)),
            }
      )
    );
  };

  const handleAddRow = () => {
    if (!day) return;
    const blank = {
      productName: "",
      quantity: "",
      qtyType: "KG",
      status: "Near Expiry",
      expiry: "",
      remarks: "",
      images: [],
    };
    setDays((prev) =>
      prev.map((d) => (d.reportDate !== selected ? d : { ...d, items: [...d.items, blank] }))
    );
  };

  const handleDeleteRow = async (i) => {
    if (!day) return;
    const ok = window.confirm("Delete this row?");
    if (!ok) return;
    try {
      const row = day.items[i] || {};
      const urls = ensureImagesArray(row);
      setMsg("⏳ Deleting row images…");
      const res = await deleteImagesMany(urls);
      if (res.failed > 0) {
        console.warn("Some images failed to delete from storage.");
      }

      const newItems = day.items.filter((_, idx) => idx !== i);
      setMsg("⏳ Deleting row…");
      await saveDay(day.reportDate, newItems);
      await reload();
      setMsg("✅ Row deleted.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to delete row.");
    } finally {
      setTimeout(() => setMsg(""), 2500);
    }
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
      // 1) احذف كل الصور من التخزين
      const urls = collectImages(day.items);
      setMsg("⏳ Deleting day images…");
      const res = await deleteImagesMany(urls);
      if (res.failed > 0) {
        console.warn("Some images failed to delete from storage.");
      }
      // 2) احذف اليوم من قاعدة البيانات
      setMsg("⏳ Deleting day…");
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

  // images modal handlers (persist immediately)
  const openImagesFor = (i) => { setImageRowIndex(i); setImageModalOpen(true); };
  const closeImages = () => setImageModalOpen(false);

  const addImagesToRow = async (urls) => {
    if (!day || imageRowIndex < 0) return;
    try {
      const items = day.items || [];
      const row = items[imageRowIndex] || {};
      const cur = ensureImagesArray(row);
      const merged = [...cur, ...urls];
      const newItems = items.map((r, i) => (i === imageRowIndex ? { ...r, images: merged } : r));
      setMsg("⏳ Updating images…");
      await saveDay(day.reportDate, newItems);
      await reload();
      setMsg("✅ Images updated.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to update images.");
    } finally {
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const removeImageFromRow = async (imgIndex) => {
    if (!day || imageRowIndex < 0) return;
    try {
      const items = day.items || [];
      const row = items[imageRowIndex] || {};
      const cur = [...ensureImagesArray(row)];
      const url = cur[imgIndex];

      // 1) حاول حذف الصورة من التخزين
      if (url) {
        setMsg("⏳ Removing image from storage…");
        try {
          await deleteImage(url);
        } catch (err) {
          console.warn("Storage delete failed; proceeding to unlink from report.", err);
        }
      }

      // 2) احذف الرابط من التقرير واحفظ
      cur.splice(imgIndex, 1);
      const newItems = items.map((r, i) => (i === imageRowIndex ? { ...r, images: cur } : r));
      setMsg("⏳ Updating report…");
      await saveDay(day.reportDate, newItems);
      await reload();
      setMsg("✅ Image removed.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to remove image.");
    } finally {
      setTimeout(() => setMsg(""), 2500);
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
  const activeRow =
    day && imageRowIndex >= 0 ? (day.items?.[imageRowIndex] || {}) : null;

  return (
    <div style={s.page}>
      <h2 style={s.h2}>📄 Meat Daily — Reports</h2>

      {msg && <div style={s.note}>{msg}</div>}

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
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

        <div style={s.right}>
          {day ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 900, color: "#111" }}>
                  Report details ({day.reportDate})
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={handleAddRow} style={s.btnBlue}>➕ Add Row</button>
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
                      <th style={s.th}>IMAGES</th>
                      <th style={s.th}>ACTIONS</th>
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

                        <td style={s.td}>
                          <button
                            onClick={() => { setImageRowIndex(i); setImageModalOpen(true); }}
                            style={s.btnBlue}
                            title="Manage images"
                          >
                            🖼️ Images ({Array.isArray(r.images) ? r.images.length : 0})
                          </button>
                        </td>

                        <td style={s.td}>
                          <button onClick={() => handleDeleteRow(i)} style={s.btnDelSmall}>🗑️ Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ImageManagerModal
                open={imageModalOpen}
                row={day && imageRowIndex >= 0 ? (day.items?.[imageRowIndex] || {}) : null}
                onClose={() => setImageModalOpen(false)}
                onAddImages={addImagesToRow}
                onRemoveImage={removeImageFromRow}
              />
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

  btnBlue: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 14px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 1px 6px #bfdbfe",
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
  btnDelSmall: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    padding: "4px 10px",
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

/* ====== Gallery modal styles ====== */
const galleryBack = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};
const galleryCard = {
  width: "min(1400px, 1000vw)",
  maxHeight: "80vh",
  overflow: "auto",
  background: "#fff",
  color: "#111",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: "14px 16px",
  boxShadow: "0 12px 32px rgba(0,0,0,.25)",
};
const galleryClose = {
  background: "transparent",
  border: "none",
  color: "#111",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 18,
};
const btnBlueModal = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 1px 6px #bfdbfe",
};
const thumbsWrap = {
  marginTop: 8,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
};
const thumbTile = {
  position: "relative",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  overflow: "hidden",
  background: "#f8fafc",
};
const thumbImg = {
  width: "100%",
  height: 150,
  objectFit: "cover",
  display: "block",
};
const thumbRemove = {
  position: "absolute",
  top: 6,
  right: 6,
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "2px 8px",
  fontWeight: 800,
  cursor: "pointer",
};
