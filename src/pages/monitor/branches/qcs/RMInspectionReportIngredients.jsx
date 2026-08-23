// src/pages/monitor/branches/qcs/RMInspectionReportIngredients.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import { getReportRowByDate, reportId } from "../_shared/reportApi";

/* ====== API & هوية التقرير ====== */


const TYPE = "qcs_rm_ingredients";
const BRANCH_ID = "QCS";
const FILE_ID = "RMInspectionReportIngredients";

export default function RMInspectionReportIngredients() {
  /* ====== ترويسة (عرض فقط) ====== */
  const LOGO_FALLBACK = "/brand/al-mawashi.jpg";
  const DOC = {
    title: "RM INSPECTION REPORT [INGREDIANTS MATERIAL]",
    no: "FF-QM/RMR/ING",
    issueDate: "05/02/2020",
    revNo: "0",
    area: "QA",
    issuedBy: "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy: "Hussam O. Sarhan",
    company: "TRANS EMIRATES LIVESTOCK TRADING LLC",
    reportTitle:
      "RAW MATERIAL INSPECTION REPORT-TRANS EMIRATES LIVESTOCK [INGREDIANTS]",
    logoSrc: LOGO_FALLBACK,
  };

  const COLORS = {
    ink: "#111827",
    sub: "#374151",
    bg: "#f8fafc",
    white: "#ffffff",
    line: "#111827",
    lightLine: "#cbd5e1",
    thBg: "#f3f4f6",
    headBg: "#ffffff",
    ok: "#16a34a",
    err: "#dc2626",
    primary: "#0b132b",
    warn: "#f59e0b",
  };

  const page = {
    padding: "1rem",
    background: COLORS.bg,
    color: COLORS.ink,
    direction: "ltr",
    fontFamily:
      "Cairo, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    fontSize: 14,
    lineHeight: 1.6,
  };

  /* ====== ترويسة (مطابقة للصورة) ====== */
  const headWrap = {
    background: COLORS.white,
    border: `2px solid ${COLORS.line}`,
    borderRadius: 4,
    padding: 0,
    overflow: "hidden",
    marginBottom: 12,
  };
  const headTbl = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };
  const headCell = {
    border: `1px solid ${COLORS.line}`,
    padding: "8px 10px",
    background: COLORS.headBg,
    fontWeight: 700,
  };
  const headVal = {
    border: `1px solid ${COLORS.line}`,
    padding: "8px 10px",
    background: COLORS.white,
    fontWeight: 600,
  };
  const logoCell = {
    border: `1px solid ${COLORS.line}`,
    width: 110,
    textAlign: "center",
    verticalAlign: "middle",
    padding: 8,
  };
  const companyRow = {
    borderTop: `1px solid ${COLORS.line}`,
    borderBottom: `1px solid ${COLORS.line}`,
    textAlign: "center",
    fontWeight: 900,
    padding: "10px 6px",
  };
  const titleRow = {
    borderBottom: `1px solid ${COLORS.line}`,
    textAlign: "center",
    fontWeight: 900,
    padding: "10px 6px",
  };

  /* ====== بقية الصفحة ====== */
  const card = {
    background: COLORS.white,
    border: `1.5px solid ${COLORS.lightLine}`,
    borderRadius: 8,
    padding: "1rem",
  };
  const tbl = { width: "100%", borderCollapse: "collapse", marginTop: 8, tableLayout: "fixed" };
  const th = {
    border: `1.5px solid ${COLORS.lightLine}`,
    background: COLORS.thBg,
    padding: 10,
    fontWeight: 900,
    textAlign: "center",
    fontSize: 13.5,
  };
  const td = {
    border: `1.5px solid ${COLORS.lightLine}`,
    padding: 8,
    textAlign: "center",
    verticalAlign: "middle",
    background: "#fff",
  };
  const inp = {
    width: "100%",
    border: `1.5px solid ${COLORS.lightLine}`,
    borderRadius: 10,
    padding: "8px 10px",
    boxSizing: "border-box",
    height: 38,
    background: "#fff",
  };
  const select = { ...inp, appearance: "menulist" };
  const btn = (bg) => ({
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  });
  const btnGhost = {
    border: "1px solid #94a3b8",
    background: "#fff",
    color: "#0f172a",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  };

  /* ====== الحقول ====== */
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));

  // ✅ عدّلنا الحقل qty → invoiceNo
  const emptyRow = () => ({
    item: "",
    supplier: "",
    prodDate: "",
    expDate: "",
    invoiceNo: "",
    pest: "",
    broken: "",
    physical: "",
    remarks: "",
  });

  const [rows, setRows] = useState(Array.from({ length: 8 }, () => emptyRow()));
  const setCell = (i, key, value) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [key]: value };
      return copy;
    });
  };

  const yesNoOptions = (
    <>
      <option value="">--</option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </>
  );

  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");

  /* ====== إضافة/حذف أسطر ====== */
  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const deleteRow = (idx) => setRows((r) => r.filter((_, i) => i !== idx));

  /* ====== حفظ على السيرفر (مثل باقي الملفات) ====== */
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, text: "", kind: "info" }); // info | success | error

  const filteredRows = useMemo(() => {
    // تجاهل الصفوف الفارغة بالكامل
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v || "").trim() !== "")
    );
  }, [rows]);

  const buildPayload = () => ({
    reportDate,
    branch: BRANCH_ID,
    file: FILE_ID,
    entries: filteredRows,
    checkedBy,
    verifiedBy,
    correctiveAction,
    meta: {
      doc: { ...DOC },
      savedAt: new Date().toISOString(),
    },
  });

  /* ====== Existing report for the chosen date ======
     This used to block saving outright ("Not Allowed"), which forced anyone
     who missed one item to delete the whole day from the View page. Now the
     existing record is offered for editing instead. */
  const [existingId, setExistingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [dateCheckLoading, setDateCheckLoading] = useState(false);
  const [dateMsg, setDateMsg] = useState("");

  const existingRowRef = useRef(null);

  async function checkDateHasReport(dateStr) {
    const d = String(dateStr || "").trim();
    if (!d) {
      setExistingId("");
      existingRowRef.current = null;
      setDateMsg("");
      return;
    }

    setDateCheckLoading(true);
    setDateMsg("Checking this date…");

    try {
      // Targeted read — the old version downloaded every report of this type
      // on each keystroke in the date field.
      const row = await getReportRowByDate(TYPE, d);
      existingRowRef.current = row;
      const id = row ? reportId(row) : "";
      setExistingId(id);
      setDateMsg(
        id
          ? "A report already exists for this day — load it to edit, or save to replace it."
          : "This date is free."
      );
    } catch (e) {
      console.error(e);
      setExistingId("");
      existingRowRef.current = null;
      setDateMsg("Could not check this date right now. You can still save.");
    } finally {
      setDateCheckLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      checkDateHasReport(reportDate);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportDate]);

  /* Pull the existing day's record into the form so it can be corrected. */
  function loadExistingForEdit() {
    const row = existingRowRef.current;
    const p = row?.payload || {};
    const entries = Array.isArray(p.entries) ? p.entries : [];
    const next = entries.map((e) => ({ ...emptyRow(), ...e }));
    while (next.length < 8) next.push(emptyRow());
    setRows(next);
    setCheckedBy(String(p.checkedBy || ""));
    setVerifiedBy(String(p.verifiedBy || ""));
    setCorrectiveAction(String(p.correctiveAction || ""));
    setEditingId(existingId);
    setModal({ open: true, text: "📝 Loaded this day's report for editing.", kind: "info" });
  }

  /* ====== ✅ تصفير البيانات بعد حفظ ناجح ====== */
  function resetForm() {
    setRows(Array.from({ length: 8 }, () => emptyRow()));
    setCheckedBy("");
    setVerifiedBy("");
    setCorrectiveAction("");
    setEditingId("");
  }

  const handleSave = async () => {
    if (!reportDate) {
      setModal({ open: true, text: "⚠️ Pick a report date first.", kind: "error" });
      return;
    }

    // Saving over a day that already has a record and was not loaded first
    // would silently discard the stored rows — make that an explicit choice.
    const targetId = editingId || existingId;
    if (existingId && !editingId) {
      const ok = window.confirm(
        `A report already exists for ${reportDate}.\n\n` +
          "OK  = replace it with what is on screen now\n" +
          "Cancel = go back (use “Load for editing” to keep the saved rows)"
      );
      if (!ok) return;
    }

    setModal({ open: true, text: "⏳ Saving…", kind: "info" });
    setSaving(true);

    try {
      const url = targetId
        ? `${API_BASE}/api/reports/${encodeURIComponent(targetId)}`
        : `${API_BASE}/api/reports`;

      const res = await fetch(url, {
        method: targetId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: TYPE, payload: buildPayload() }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setModal({
        open: true,
        text: targetId ? "✅ Report updated." : "✅ Report saved.",
        kind: "success",
      });

      if (!targetId) resetForm();
      checkDateHasReport(reportDate);
    } catch (e) {
      console.error(e);
      setModal({ open: true, text: `❌ Save failed: ${e?.message || e}`, kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const saveDisabled = saving || dateCheckLoading;

  return (
    <div style={page}>
      {/* ====== الترويسة ====== */}
      <div style={headWrap}>
        <table style={headTbl}>
          <colgroup>
            <col style={{ width: "110px" }} />
            <col style={{ width: "44%" }} />
            <col style={{ width: "44%" }} />
          </colgroup>
          <tbody>
            <tr>
              <td rowSpan={4} style={logoCell}>
                <img
                  src={DOC.logoSrc}
                  alt="Al Mawashi"
                  style={{ maxWidth: "100%", maxHeight: 90, objectFit: "contain" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const fallback = document.createElement("div");
                      Object.assign(fallback.style, {
                        width: "90px", height: "90px", margin: "0 auto",
                        border: `1px solid ${COLORS.lightLine}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: "800", fontSize: "12px", lineHeight: "1.2",
                        textAlign: "center",
                      });
                      fallback.textContent = "AL MAWASHI Company Logo";
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </td>
              <td>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={headCell}>Document Title:</div>
                  <div style={headVal}>{DOC.title}</div>
                </div>
              </td>
              <td>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={headCell}>Document No:</div>
                  <div style={headVal}>{DOC.no}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={headCell}>Issue Date:</div>
                  <div style={headVal}>{DOC.issueDate}</div>
                </div>
              </td>
              <td>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={headCell}>Revision No:</div>
                  <div style={headVal}>{DOC.revNo}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={headCell}>Area:</div>
                  <div style={headVal}>{DOC.area}</div>
                </div>
              </td>
              <td>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={headCell}>Issued by:</div>
                  <div style={headVal}>{DOC.issuedBy}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={headCell}>Controlling Officer:</div>
                  <div style={headVal}>{DOC.controllingOfficer}</div>
                </div>
              </td>
              <td>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  <div style={headCell}>Approved by:</div>
                  <div style={headVal}>{DOC.approvedBy}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={3} style={companyRow}>
                {DOC.company}
              </td>
            </tr>
            <tr>
              <td colSpan={3} style={titleRow}>
                {DOC.reportTitle}
              </td>
            </tr>
          </tbody>
        </table>

        {/* تاريخ + أزرار */}
        <div
          style={{
            borderTop: `1px solid ${COLORS.line}`,
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <b>Report Date:</b>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                style={{
                  border: `1px solid ${COLORS.line}`,
                  borderRadius: 6,
                  padding: "6px 8px",
                  height: 36,
                }}
              />
            </div>

            {/* ✅ حالة التاريخ */}
            {dateMsg ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  fontSize: 12,
                  fontWeight: 800,
                  color: dateCheckLoading ? COLORS.warn : existingId ? COLORS.warn : COLORS.ok,
                }}
              >
                <span>{dateMsg}</span>
                {existingId && !editingId ? (
                  <button onClick={loadExistingForEdit} style={{ ...btnGhost, padding: "4px 10px", fontSize: 12 }}>
                    📝 Load for editing
                  </button>
                ) : null}
                {editingId ? (
                  <span style={{ color: COLORS.primary }}>• editing the saved report</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addRow} style={btnGhost} title="Add a row">
              + Add Row
            </button>
            <button
              onClick={handleSave}
              disabled={saveDisabled}
              style={btn(saveDisabled ? "#94a3b8" : COLORS.primary)}
              title="Save to server"
            >
              {saving ? "Saving…" : editingId || existingId ? "💾 Update" : "💾 Save"}
            </button>
          </div>
        </div>
      </div>

      {/* ====== الجدول ====== */}
      <div style={card}>
        <table style={tbl}>
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "12%" }} /> {/* Invoice No */}
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "6%" }} /> {/* delete */}
          </colgroup>
          <thead>
            <tr>
              <th style={th}>S. No</th>
              <th style={th}>Item Name</th>
              <th style={th}>Supplier Details</th>
              <th style={th}>Prod Date</th>
              <th style={th}>Exp Date</th>
              <th style={th}>Invoice No</th>
              <th style={th}>Pest Activity</th>
              <th style={th}>Broken / Damaged</th>
              <th style={th}>Physical Contamination</th>
              <th style={th}>Remarks</th>
              <th style={th}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={td}>{i + 1}</td>
                <td style={td}>
                  <input
                    style={inp}
                    value={r.item}
                    onChange={(e) => setCell(i, "item", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <input
                    style={inp}
                    value={r.supplier}
                    onChange={(e) => setCell(i, "supplier", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <input
                    style={inp}
                    type="date"
                    value={r.prodDate}
                    onChange={(e) => setCell(i, "prodDate", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <input
                    style={inp}
                    type="date"
                    value={r.expDate}
                    onChange={(e) => setCell(i, "expDate", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <input
                    style={inp}
                    value={r.invoiceNo}
                    onChange={(e) => setCell(i, "invoiceNo", e.target.value)}
                    placeholder="e.g., INV-12345"
                  />
                </td>
                <td style={td}>
                  <select
                    style={select}
                    value={r.pest}
                    onChange={(e) => setCell(i, "pest", e.target.value)}
                  >
                    {yesNoOptions}
                  </select>
                </td>
                <td style={td}>
                  <select
                    style={select}
                    value={r.broken}
                    onChange={(e) => setCell(i, "broken", e.target.value)}
                  >
                    {yesNoOptions}
                  </select>
                </td>
                <td style={td}>
                  <select
                    style={select}
                    value={r.physical}
                    onChange={(e) => setCell(i, "physical", e.target.value)}
                  >
                    {yesNoOptions}
                  </select>
                </td>
                <td style={td}>
                  <input
                    style={inp}
                    value={r.remarks}
                    onChange={(e) => setCell(i, "remarks", e.target.value)}
                  />
                </td>
                <td style={{ ...td, padding: 4 }}>
                  <button
                    onClick={() => deleteRow(i)}
                    title="Delete row"
                    style={{
                      width: 32,
                      height: 32,
                      border: "1px solid #ef4444",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      borderRadius: 8,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}>
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Corrective Action + التواقيع */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Corrective Action:</div>
          <textarea
            rows={4}
            style={{ ...inp, width: "100%", height: "unset" }}
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 16,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>CHECKED BY :</div>
            <input style={inp} value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} />
          </div>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>VERIFIED BY :</div>
            <input style={inp} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ====== Modal ====== */}
      {modal.open && (
        <div
          onClick={() => setModal((m) => ({ ...m, open: false }))}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              background: "#fff",
              borderRadius: 12,
              padding: "18px 16px",
              boxShadow: "0 10px 30px rgba(0,0,0,.25)",
              border: `2px solid ${
                modal.kind === "success"
                  ? COLORS.ok
                  : modal.kind === "error"
                  ? COLORS.err
                  : COLORS.primary
              }`,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              {modal.kind === "success"
                ? "تم الحفظ"
                : modal.kind === "error"
                ? "خطأ"
                : "جارٍ الحفظ"}
            </div>
            <div style={{ color: "#334155", marginBottom: 12 }}>{modal.text}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setModal((m) => ({ ...m, open: false }))} style={btn(COLORS.primary)}>
                تم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
