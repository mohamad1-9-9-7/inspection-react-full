// src/pages/monitor/branches/qcs/RMInspectionReportPackagingView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof process !== "undefined" &&
      (process.env.REACT_APP_API_URL ||
        process.env.VITE_API_URL ||
        process.env.RENDER_EXTERNAL_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "qcs_rm_packaging";
const DOC_NO = "FF-QM/RMR/PKG"; // مطابق للترويسة الرسمية

const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

/* ===== ترتيب ثابت مطابق لملف الإدخال =====
   S. No | Item Name | Supplier Details | Specifications | Invoice No | Pest Activity |
   Broken / Damaged | Physical Contamination | Remarks
*/
const FIXED_COLUMNS = [
  { label: "S. No", aliases: [], isSerial: true },
  { label: "Item Name", aliases: ["item_name", "itemName", "item", "product", "product_name", "productName"] },
  { label: "Supplier Details", aliases: ["supplier", "supplier_name", "supplierDetails", "supplier_details", "supplierInfo"] },
  { label: "Specifications", aliases: ["specifications", "specs", "spec", "spec_detail", "specification"] },
  { label: "Invoice No", aliases: ["invoiceNo", "invoice", "inv", "invoice_no", "bill", "bill_no", "ref", "reference"] },
  { label: "Pest Activity", aliases: ["pest_activity", "pestActivity", "pest"] },
  { label: "Broken / Damaged", aliases: ["broken_damaged", "brokenDamaged", "broken", "damaged"] },
  { label: "Physical Contamination", aliases: ["physical_contamination", "physicalContamination", "physical"] },
  { label: "Remarks", aliases: ["remarks", "remark", "comment", "comments", "note", "notes"] },
];

/* مطابقة المفتاح داخل صف واحد */
function findKeyInRow(row, aliases) {
  if (!row) return null;
  const keys = Object.keys(row);
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "").replace(/[_-]+/g, "");
  const map = new Map(keys.map((k) => [norm(k), k]));
  for (const a of aliases) {
    const hit = map.get(norm(a));
    if (hit) return hit;
  }
  return null;
}
function getVal(row, col, index) {
  if (col.isSerial) return String(index + 1);
  const key = findKeyInRow(row, col.aliases);
  const v = key ? row?.[key] : "";
  return v == null ? "" : String(v);
}

function safeClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj ?? {}));
  } catch {
    return obj ?? {};
  }
}

function toISODateOnly(v) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
  const d = new Date(v);
  if (isNaN(d)) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ✅ سطر جديد فارغ */
function makeEmptyEntry() {
  const row = {};
  for (const c of FIXED_COLUMNS) {
    if (c.isSerial) continue;
    const key = c.aliases?.[0] || c.label;
    row[key] = "";
  }
  return row;
}

export default function RMInspectionReportPackagingView() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  /* ✅ Edit mode */
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const DOC = useMemo(
    () => ({
      title: "RM INSPECTION REPORT [PACKAGING MATERIALS]",
      no: DOC_NO,
      issueDate: "05/02/2020",
      revNo: "0",
      area: "QA",
      issuedBy: "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy: "Hussam O. Sarhan",
      company: "TRANS EMIRATES LIVESTOCK TRADING LLC",
      reportTitle: "RAW MATERIAL INSPECTION REPORT-TRANS EMIRATES LIVE STOCK LLC [PACKAGING MATERIALS]",
    }),
    []
  );

  const getReportDate = (r) => {
    const p = r?.payload || {};
    const d = new Date(p?.reportDate || p?.date || r?.created_at);
    return isNaN(d) ? new Date(0) : d;
  };

  async function fetchAll() {
    const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const arr = Array.isArray(json) ? json : json?.data || json?.items || json?.rows || [];
    arr.sort((a, b) => getReportDate(a) - getReportDate(b)); // الأقدم أولاً
    return arr;
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const arr = await fetchAll();
        setReports(arr);
        setSelected(arr[0] || null);
      } catch (e) {
        console.error(e);
        alert("⚠️ Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // لو المستخدم اختار تقرير ثاني أثناء التعديل: نطلع من التعديل
  useEffect(() => {
    setEditMode(false);
    setDraft(null);
  }, [getId(selected)]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload = useMemo(() => selected?.payload || selected || {}, [selected]);
  const currentPayload = editMode ? (draft || {}) : payload;

  const startEdit = () => {
    const base = safeClone(payload);

    // reportDate كنصيغة YYYY-MM-DD لتسهيل التعديل
    base.reportDate = toISODateOnly(base.reportDate || base.date || "");

    // entries
    if (!Array.isArray(base.entries)) base.entries = Array.isArray(payload?.entries) ? safeClone(payload.entries) : [];

    // حقول عامة
    if (base.branch == null && base.area != null) base.branch = base.area;
    setDraft(base);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setDraft(null);
  };

  const updateDraftField = (key, value) => {
    setDraft((prev) => ({ ...(prev || {}), [key]: value }));
  };

  const updateEntryCell = (rowIdx, col, value) => {
    setDraft((prev) => {
      const next = safeClone(prev || {});
      const entries = Array.isArray(next.entries) ? [...next.entries] : [];
      const row = { ...(entries[rowIdx] || {}) };

      const existingKey = findKeyInRow(row, col.aliases);
      const targetKey = existingKey || col.aliases?.[0] || col.label;

      row[targetKey] = value;
      entries[rowIdx] = row;
      next.entries = entries;
      return next;
    });
  };

  // ✅ إضافة/حذف أسطر أثناء التعديل
  const addEntryRow = () => {
    setDraft((prev) => {
      const next = safeClone(prev || {});
      const entries = Array.isArray(next.entries) ? [...next.entries] : [];
      entries.push(makeEmptyEntry());
      next.entries = entries;
      return next;
    });
  };

  const removeEntryRow = (idx) => {
    setDraft((prev) => {
      const next = safeClone(prev || {});
      const entries = Array.isArray(next.entries) ? [...next.entries] : [];
      next.entries = entries.filter((_, i) => i !== idx);
      return next;
    });
  };

  /* ================= Export / Delete ================= */
  const exportPDF = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      windowWidth: ref.current.scrollWidth,
      windowHeight: ref.current.scrollHeight,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("AL MAWASHI - QCS", pageWidth / 2, 28, { align: "center" });
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(DOC.reportTitle, pageWidth / 2, 46, { align: "center" });

    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 20, 60, imgWidth, imgHeight);

    const fileDate = currentPayload?.reportDate || payload?.reportDate || "report";
    pdf.save(`QCS_RM_Packaging_${fileDate}.pdf`);
  };

  const exportJSON = () => {
    try {
      const bundle = { type: TYPE, exportedAt: new Date().toISOString(), items: reports.map((r) => r?.payload ?? r) };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QCS_RM_Packaging_ALL_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("❌ Failed to export JSON.");
    }
  };

  const remove = async (r) => {
    if (!window.confirm("Delete this report?")) return;
    const rid = getId(r);
    if (!rid) return alert("⚠️ Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      alert("✅ Deleted.");
      const arr = await fetchAll();
      setReports(arr);
      setSelected(arr[0] || null);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to delete.");
    }
  };

  // ✅ حفظ تعديل التقرير
  const handleUpdate = async () => {
    const rid = getId(selected);
    if (!rid) return alert("⚠️ Missing report ID.");

    const rd = String(draft?.reportDate || "").trim();
    if (!rd) return alert("⚠️ Report Date is required.");

    try {
      setSavingEdit(true);

      const body = {
        reporter: selected?.reporter || "qcs",
        type: TYPE,
        payload: {
          ...(draft || {}),
          entries: Array.isArray(draft?.entries) ? draft.entries : [],
          updatedAt: Date.now(),
        },
      };

      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Update failed HTTP ${res.status}`);

      alert("✅ Updated.");
      const arr = await fetchAll();
      setReports(arr);

      const updated = arr.find((x) => getId(x) === rid) || arr[0] || null;
      setSelected(updated);
      setEditMode(false);
      setDraft(null);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to update. (Check if server supports PUT /api/reports/:id)");
    } finally {
      setSavingEdit(false);
    }
  };

  // تجميع بالتاريخ (سنة/شهر/يوم)
  const grouped = reports.reduce((acc, r) => {
    const d = getReportDate(r);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    acc[y] ??= {};
    acc[y][m] ??= [];
    acc[y][m].push({ ...r, _dt: d.getTime(), _day: day });
    return acc;
  }, {});

  /* ================= Styles (حدود سوداء واضحة) ================= */
  const tdHeader = {
    border: "1.5px solid #000",
    padding: "6px 8px",
    fontSize: 12,
  };
  const topTable = { width: "100%", borderCollapse: "collapse", marginBottom: 8 };
  const band = (bg) => ({
    background: bg,
    color: "#0f172a",
    fontWeight: 800,
    textAlign: "center",
    padding: "6px 8px",
    border: "1.5px solid #000",
  });

  const gridStyle = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12 };
  const thCell = { border: "1.5px solid #000", padding: "6px 4px", background: "#f5f5f5", textAlign: "center" };
  const tdCell = { border: "1.5px solid #000", padding: "6px 4px", textAlign: "center", background: "#fff" };

  const smallInput = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 12,
    background: "#fff",
  };

  const btn = (bg) => ({
    padding: "6px 12px",
    borderRadius: 6,
    background: bg,
    color: "#fff",
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
  });

  const miniBtn = (bg) => ({
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 10px",
    fontWeight: 800,
    cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      <aside
        style={{
          minWidth: 260,
          background: "#f9f9f9",
          padding: "1rem",
          borderRadius: 10,
          boxShadow: "0 3px 10px rgba(0,0,0,.1)",
        }}
      >
        <h4 style={{ textAlign: "center", marginBottom: 10 }}>🗓️ Saved Reports</h4>
        {loading ? (
          "⏳ Loading..."
        ) : Object.keys(grouped).length === 0 ? (
          "❌ No reports"
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([y, months]) => (
              <details key={y} open>
                <summary style={{ fontWeight: 800 }}>📅 Year {y}</summary>
                {Object.entries(months)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([m, arr]) => {
                    const days = [...arr].sort((a, b) => a._dt - b._dt);
                    return (
                      <details key={m} style={{ marginLeft: 12 }}>
                        <summary style={{ fontWeight: 600 }}>📅 Month {m}</summary>
                        <ul style={{ listStyle: "none", paddingLeft: 12 }}>
                          {days.map((r, i) => {
                            const active = getId(selected) && getId(selected) === getId(r);
                            return (
                              <li
                                key={i}
                                onClick={() => setSelected(r)}
                                style={{
                                  padding: "6px 10px",
                                  margin: "4px 0",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  textAlign: "center",
                                  background: active ? "#0b132b" : "#ecf0f1",
                                  color: active ? "#fff" : "#333",
                                  fontWeight: 600,
                                }}
                              >
                                {`${r._day}/${m}/${y}`}
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    );
                  })}
              </details>
            ))
        )}
      </aside>

      <main
        style={{
          flex: 1,
          background: "linear-gradient(120deg, #f6f8fa 65%, #e8daef 100%)",
          padding: "1rem",
          borderRadius: 14,
          boxShadow: "0 4px 18px #d2b4de44",
        }}
      >
        {!selected ? (
          <p>❌ No report selected.</p>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {!editMode ? (
                <button onClick={startEdit} style={miniBtn("#2563eb")}>
                  ✏️ Edit
                </button>
              ) : (
                <>
                  <button onClick={handleUpdate} disabled={savingEdit} style={miniBtn(savingEdit ? "#64748b" : "#0f766e")}>
                    {savingEdit ? "Saving..." : "✅ Save Changes"}
                  </button>
                  <button onClick={cancelEdit} disabled={savingEdit} style={miniBtn("#475569")}>
                    ↩ Cancel
                  </button>
                </>
              )}

              <button onClick={exportPDF} style={btn("#27ae60")}>
                ⬇ Export PDF
              </button>
              <button onClick={exportJSON} style={btn("#16a085")}>
                ⬇ Export JSON
              </button>
              <button
                onClick={() => remove(selected)}
                disabled={editMode}
                title={editMode ? "Exit edit mode first" : "Delete"}
                style={btn(editMode ? "#9ca3af" : "#c0392b")}
              >
                🗑 Delete
              </button>
            </div>

            {/* ====== العارض مع الترويسة ====== */}
            <div ref={ref} style={{ background: "#fff", border: "1.5px solid #000", borderRadius: 12, padding: 16 }}>
              {/* ترويسة ISO (نفس نمط الإدخال) */}
              <table style={topTable}>
                <tbody>
                  <tr>
                    <td rowSpan={4} style={{ ...tdHeader, width: 140, textAlign: "center" }}>
                      <div style={{ fontWeight: 900, color: "#a00", fontSize: 14, lineHeight: 1.2 }}>
                        AL<br />
                        MAWASHI
                      </div>
                    </td>
                    <td style={tdHeader}>
                      <b>Document Title:</b> {DOC.title}
                    </td>
                    <td style={tdHeader}>
                      <b>Document No:</b> {DOC.no}
                    </td>
                  </tr>
                  <tr>
                    <td style={tdHeader}>
                      <b>Issue Date:</b> {DOC.issueDate}
                    </td>
                    <td style={tdHeader}>
                      <b>Revision No:</b> {DOC.revNo}
                    </td>
                  </tr>
                  <tr>
                    <td style={tdHeader}>
                      <b>Area:</b> {DOC.area}
                    </td>
                    <td style={tdHeader}>
                      <b>Issued by:</b> {DOC.issuedBy}
                    </td>
                  </tr>
                  <tr>
                    <td style={tdHeader}>
                      <b>Controlling Officer:</b> {DOC.controllingOfficer}
                    </td>
                    <td style={tdHeader}>
                      <b>Approved by:</b> {DOC.approvedBy}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={band("#e5e7eb")}>{DOC.company}</div>
              <div style={band("#f3f4f6")}>{DOC.reportTitle}</div>

              {/* معلومات عامة للتقرير */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, margin: "10px 0 12px" }}>
                <div>
                  <b>Report Date:</b>{" "}
                  {!editMode ? (
                    currentPayload?.reportDate || "-"
                  ) : (
                    <input
                      type="date"
                      value={toISODateOnly(currentPayload?.reportDate)}
                      onChange={(e) => updateDraftField("reportDate", e.target.value)}
                      style={{ ...smallInput, maxWidth: 220, display: "inline-block", marginLeft: 8 }}
                    />
                  )}
                </div>

                <div>
                  <b>Branch/Area:</b>{" "}
                  {!editMode ? (
                    currentPayload?.branch || currentPayload?.area || "QCS"
                  ) : (
                    <input
                      value={String(currentPayload?.branch || currentPayload?.area || "QCS")}
                      onChange={(e) => updateDraftField("branch", e.target.value)}
                      style={{ ...smallInput, maxWidth: 320, display: "inline-block", marginLeft: 8 }}
                    />
                  )}
                </div>

                <div>
                  <b>Checked By:</b>{" "}
                  {!editMode ? (
                    currentPayload?.checkedBy || ""
                  ) : (
                    <input
                      value={String(currentPayload?.checkedBy || "")}
                      onChange={(e) => updateDraftField("checkedBy", e.target.value)}
                      style={{ ...smallInput, maxWidth: 320, display: "inline-block", marginLeft: 8 }}
                    />
                  )}
                </div>

                <div>
                  <b>Verified By:</b>{" "}
                  {!editMode ? (
                    currentPayload?.verifiedBy || ""
                  ) : (
                    <input
                      value={String(currentPayload?.verifiedBy || "")}
                      onChange={(e) => updateDraftField("verifiedBy", e.target.value)}
                      style={{ ...smallInput, maxWidth: 320, display: "inline-block", marginLeft: 8 }}
                    />
                  )}
                </div>
              </div>

              {/* ✅ أدوات الأسطر في وضع التعديل */}
              {editMode && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                  <button onClick={addEntryRow} style={miniBtn("#0ea5e9")}>
                    ➕ Add Row
                  </button>
                </div>
              )}

              {/* الجدول - ترتيب ثابت مطابق لملف الإدخال */}
              {Array.isArray(currentPayload?.entries) && currentPayload.entries.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={gridStyle}>
                    <colgroup>
                      <col style={{ width: "6%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "9%" }} />
                      {editMode && <col style={{ width: "10%" }} />}
                    </colgroup>
                    <thead>
                      <tr>
                        {FIXED_COLUMNS.map((c) => (
                          <th key={c.label} style={thCell}>
                            {c.label}
                          </th>
                        ))}
                        {editMode && <th style={thCell}>—</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentPayload.entries.map((row, i) => (
                        <tr key={i}>
                          {FIXED_COLUMNS.map((c) => {
                            if (c.isSerial) return <td key={c.label} style={tdCell}>{String(i + 1)}</td>;

                            const val = getVal(row, c, i);

                            return (
                              <td key={c.label} style={tdCell}>
                                {!editMode ? (
                                  val
                                ) : (
                                  <input
                                    value={val}
                                    onChange={(e) => updateEntryCell(i, c, e.target.value)}
                                    style={smallInput}
                                  />
                                )}
                              </td>
                            );
                          })}

                          {editMode && (
                            <td style={tdCell}>
                              <button onClick={() => removeEntryRow(i)} style={miniBtn("#dc2626")}>
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : editMode ? (
                <div style={{ color: "#6b7280" }}>
                  No entries available. اضغط <b>Add Row</b> لإضافة سطر.
                </div>
              ) : (
                <div style={{ color: "#6b7280" }}>No entries available.</div>
              )}

              {/* Corrective Action */}
              {!editMode ? (
                currentPayload?.correctiveAction && String(currentPayload.correctiveAction).trim() !== "" ? (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Corrective Action:</div>
                    <div
                      style={{
                        border: "1.5px solid #000",
                        borderRadius: 6,
                        padding: "8px 10px",
                        whiteSpace: "pre-wrap",
                        background: "#fff",
                      }}
                    >
                      {currentPayload.correctiveAction}
                    </div>
                  </div>
                ) : null
              ) : (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Corrective Action:</div>
                  <textarea
                    value={String(currentPayload?.correctiveAction || "")}
                    onChange={(e) => updateDraftField("correctiveAction", e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 80,
                      border: "1.5px solid #000",
                      borderRadius: 6,
                      padding: "8px 10px",
                      background: "#fff",
                      fontSize: 12,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              {/* التواقيع يمين/يسار بخانات صغيرة */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, alignItems: "end" }}>
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>CHECKED BY :</div>
                  <div style={{ border: "1.5px solid #000", borderRadius: 6, padding: "8px 10px", minHeight: 36, background: "#fff" }}>
                    {currentPayload?.checkedBy || ""}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 900, marginBottom: 6, textAlign: "right" }}>VERIFIED BY :</div>
                  <div
                    style={{
                      border: "1.5px solid #000",
                      borderRadius: 6,
                      padding: "8px 10px",
                      minHeight: 36,
                      background: "#fff",
                      textAlign: "right",
                    }}
                  >
                    {currentPayload?.verifiedBy || ""}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
