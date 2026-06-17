// src/pages/monitor/branches/qcs/CoolersView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionBar,
  ActionButton,
  DateTreeSidebar,
  GlassShell,
  ReportActions,
  ResponsiveReportLayout,
} from "../_shared/branchViewKit";
import {
  deleteReportByDate,
  downloadReportsJson,
  getReportPayloadByDate,
  importReportPayloads,
  listReports,
  parseJsonImport,
  reportDateOf,
  saveReport,
} from "../_shared/reportApi";
import ProductPicker from "../_shared/ProductPicker";

const TYPE_COOLERS = "qcs-coolers";

/* ===== Constants / helpers (design mirrors the input page) ===== */
const LOGO_URL = "/brand/al-mawashi.jpg";
const COOLER_TIMES = [
  "4:00 AM", "6:00 AM", "8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM",
];

function labelForCooler(i) {
  return i === 7 ? "FREEZER" : (i === 2 || i === 3) ? "Production Room" : `Cooler ${i + 1}`;
}
function coolerRange(index) {
  if (index === 7) return { min: -19, max: -14 };
  if (index === 2 || index === 3) return { min: 8, max: 12 };
  return { min: 0, max: 5 };
}
function inCoolerRange(index, t) {
  const { min, max } = coolerRange(index);
  return t >= min && t <= max;
}
function loadingAreaRange() { return { min: 0, max: 16 }; }
function inLoadingAreaRange(t) {
  const { min, max } = loadingAreaRange();
  return t >= min && t <= max;
}
function storageTypeOf(storageKey) {
  return storageKey === "cooler-7" ? "frozen" : "chilled";
}
function productTempLimit(type) {
  return type === "frozen"
    ? { label: "≤ -18°C", pass: (n) => n <= -18 }
    : { label: "0 to 5°C", pass: (n) => n >= 0 && n <= 5 };
}
function storageLabel(storageKey) {
  if (storageKey === "loading-area") return "Loading Area";
  const m = String(storageKey || "").match(/^cooler-(\d+)$/);
  return m ? labelForCooler(Number(m[1])) : storageKey;
}

function tempInputStyle(temp, idx, isLoading) {
  const t = Number(temp);
  const base = {
    width: 80, padding: "6px 8px", borderRadius: 8, border: "1.7px solid #94a3b8",
    textAlign: "center", fontWeight: 600, color: "#111827", background: "#fff",
  };
  if (Number.isNaN(t) || temp === "") return base;
  const { min, max } = isLoading ? loadingAreaRange() : coolerRange(idx);
  if (t < min || t > max) return { ...base, background: "#fee2e2", borderColor: "#ef4444", color: "#991b1b", fontWeight: 700 };
  const warnBand = isLoading ? 1 : idx === 7 ? 1 : idx === 2 || idx === 3 ? 1 : 2;
  if (t >= max - warnBand) return { ...base, background: "#e0f2fe", borderColor: "#38bdf8", color: "#075985" };
  return base;
}

/* ===== Date helpers ===== */
function formatDMYSmart(value) {
  if (!value) return "";
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s].*$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return s;
  const d = new Date(s);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  return s;
}
function extractAnyDate(payloadOrRow) { return reportDateOf(payloadOrRow); }
function toYMD(value) {
  if (!value) return "";
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return s;
}

/* ===== Print header ===== */
function Row({ label, value }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
      <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 170, fontWeight: 700 }}>{label}</div>
      <div style={{ padding: "6px 8px", flex: 1 }}>{value}</div>
    </div>
  );
}
function TMPPrintHeader({ header, reportDate }) {
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8, breakInside: "avoid" }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", alignItems: "stretch" }}>
        <div style={{ borderInlineEnd: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <img src={LOGO_URL} crossOrigin="anonymous" alt="Al Mawashi" style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }} />
        </div>
        <div style={{ borderInlineEnd: "1px solid #000" }}>
          <Row label="Document Title:" value={header.documentTitle} />
          <Row label="Issue Date:" value={header.issueDate} />
          <Row label="Area:" value={header.area} />
          <Row label="Controlling Officer:" value={header.controllingOfficer} />
        </div>
        <div>
          <Row label="Document No:" value={header.documentNo} />
          <Row label="Revision No:" value={header.revisionNo} />
          <Row label="Issued by:" value={header.issuedBy} />
          <Row label="Approved by:" value={header.approvedBy} />
        </div>
      </div>
      <div style={{ borderTop: "1px solid #000" }}>
        <div style={{ background: "#c0c0c0", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC
        </div>
        <div style={{ background: "#d6d6d6", textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          TEMPERATURE CONTROL CHECKLIST (CCP)
        </div>
        <div style={{ padding: "6px 8px", lineHeight: 1.5 }}>
          <div>1. If the temp is +5°C or more / Check product temperature – corrective action should be taken.</div>
          <div>2. If the loading area is more than +16°C – corrective action should be taken.</div>
          <div>3. If the preparation area is more than +10°C – corrective action should be taken.</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>
            Corrective action: Transfer the meat to another cold room and call maintenance department to check and solve the problem.
          </div>
        </div>
        <div style={{ borderTop: "1px solid #000" }}>
          <div style={{ display: "flex" }}>
            <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 170, fontWeight: 700 }}>Report Date:</div>
            <div style={{ padding: "6px 8px", flex: 1 }}>{reportDate || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Component ===== */
export default function CoolersView() {
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [allRows, setAllRows] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const [report, setReport] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editCoolers, setEditCoolers] = useState([]);
  const [editLoadingArea, setEditLoadingArea] = useState({ temps: {}, remarks: "" });
  const [editPV, setEditPV] = useState([]);

  const fileInputRef = useRef(null);

  async function refreshList() {
    setLoadingList(true);
    try {
      const rows = await listReports(TYPE_COOLERS);
      rows.sort((a, b) => {
        const da = new Date(extractAnyDate(a)).getTime() || 0;
        const db = new Date(extractAnyDate(b)).getTime() || 0;
        return da - db;
      });
      setAllRows(rows);
      if (!selectedDate && rows.length) {
        setSelectedDate(toYMD(extractAnyDate(rows[rows.length - 1])));
      } else if (selectedDate) {
        const exists = rows.some((r) => toYMD(extractAnyDate(r)) === selectedDate);
        if (!exists && rows.length) setSelectedDate(toYMD(extractAnyDate(rows[rows.length - 1])));
      }
    } catch (e) {
      console.error(e);
      setAllRows([]);
      alert("Failed to list coolers reports.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => { refreshList(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedDate) { setReport(null); return; }
      try {
        const payload = await getReportPayloadByDate(TYPE_COOLERS, selectedDate);
        const rep = payload ? { date: selectedDate, ...payload } : null;
        if (cancelled) return;
        setReport(rep);
        hydrateEdit(rep);
        setEditing(false);
      } catch (e) {
        console.error(e);
        setReport(null);
        alert("Failed to load coolers report.");
      }
    })();
    return () => { cancelled = true; };
  }, [selectedDate]);

  function hydrateEdit(rep) {
    const src = Array.isArray(rep?.coolers) ? rep.coolers : [];
    setEditCoolers(src.map((c) => ({ remarks: c?.remarks || "", temps: { ...(c?.temps || {}) } })));
    const la = rep?.loadingArea || { temps: {}, remarks: "" };
    setEditLoadingArea({ remarks: la.remarks || "", temps: { ...(la.temps || {}) } });
    const pv = Array.isArray(rep?.productVerifications) ? rep.productVerifications : [];
    setEditPV(pv.map((r) => ({ ...r })));
  }

  const reportDateText = useMemo(() => formatDMYSmart(selectedDate), [selectedDate]);

  const tmpHeader = {
    documentTitle: "Temperature Control Record",
    documentNo: "FS-QM/REC/TMP",
    issueDate: "05/02/2020",
    revisionNo: "0",
    area: "QA",
    issuedBy: "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy: "Hussam O. Sarhan",
  };

  /* ===== Edit mutators ===== */
  const setTemp = (rowIdx, time, val) => {
    setEditCoolers((prev) => {
      const next = [...prev];
      const row = { ...(next[rowIdx] || { temps: {} }) };
      row.temps = { ...(row.temps || {}), [time]: val };
      next[rowIdx] = row;
      return next;
    });
  };
  const setRemarksRow = (rowIdx, val) => {
    setEditCoolers((prev) => {
      const next = [...prev];
      const row = { ...(next[rowIdx] || { temps: {} }) };
      row.remarks = val;
      next[rowIdx] = row;
      return next;
    });
  };
  const setLoadingTemp = (time, val) => setEditLoadingArea((prev) => ({ ...prev, temps: { ...(prev.temps || {}), [time]: val } }));
  const setLoadingRemarks = (val) => setEditLoadingArea((prev) => ({ ...prev, remarks: val }));

  const addPV = (storageKey) =>
    setEditPV((prev) => [...prev, { time: "12:00 PM", storageKey, itemCode: "", productName: "", productTemp: "", country: "", remarks: "" }]);
  const updatePV = (idx, key, value) =>
    setEditPV((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  const removePV = (idx) => setEditPV((prev) => prev.filter((_, i) => i !== idx));

  const cancelEditing = () => { hydrateEdit(report); setEditing(false); };

  const saveEditing = async () => {
    try {
      const dateToSave = selectedDate || toYMD(report?.reportDate) || toYMD(report?.date);
      if (!dateToSave) { alert("⚠️ No date to save with this report."); return; }
      setSaving(true);
      const payloadToSave = {
        ...(report || {}),
        reportDate: String(dateToSave),
        coolers: editCoolers,
        loadingArea: editLoadingArea,
        productVerifications: editPV,
      };
      delete payloadToSave.date;
      await saveReport(TYPE_COOLERS, payloadToSave);
      const fresh = await getReportPayloadByDate(TYPE_COOLERS, dateToSave);
      const rep = fresh ? { date: dateToSave, ...fresh } : null;
      setReport(rep);
      hydrateEdit(rep);
      setEditing(false);
      alert("✅ Saved coolers temperatures.");
      await refreshList();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to save coolers.");
    } finally {
      setSaving(false);
    }
  };

  /* ===== Tree ops ===== */
  const handleDeleteCurrent = async () => {
    if (!selectedDate) return;
    if (!window.confirm(`⚠️ Delete coolers report dated ${selectedDate}?`)) return;
    try {
      await deleteReportByDate(TYPE_COOLERS, selectedDate);
      alert("✅ Report deleted.");
      await refreshList();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to delete.");
    }
  };
  const handleExportJSON = async () => {
    try {
      const rows = await listReports(TYPE_COOLERS);
      downloadReportsJson(TYPE_COOLERS, rows, "QCS_Coolers_ALL");
    } catch (e) {
      console.error(e);
      alert("❌ Failed to export JSON.");
    }
  };
  const handleImportTrigger = () => fileInputRef.current?.click();
  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoadingList(true);
      const txt = await file.text();
      const data = JSON.parse(txt);
      const items = parseJsonImport(data);
      if (!items.length) { alert("⚠️ JSON file has no items."); return; }
      const { ok, fail } = await importReportPayloads(TYPE_COOLERS, items);
      alert(`✅ Imported: ${ok}${fail ? ` | ❌ Failed: ${fail}` : ""}`);
      await refreshList();
    } catch (e2) {
      console.error(e2);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoadingList(false);
      if (e?.target) e.target.value = "";
    }
  };

  const treeItems = useMemo(() => {
    return allRows
      .map((row, idx) => {
        const dateISO = toYMD(extractAnyDate(row));
        if (!dateISO) return null;
        return { key: dateISO || String(idx), dateISO, label: formatDMYSmart(dateISO) };
      })
      .filter(Boolean);
  }, [allRows]);

  /* ===== Display data ===== */
  const coolers = editing ? editCoolers : (Array.isArray(report?.coolers) ? report.coolers : []);
  const loadingArea = editing ? editLoadingArea : (report?.loadingArea || null);
  const pvList = editing ? editPV : (Array.isArray(report?.productVerifications) ? report.productVerifications : []);

  const pvByStorage = useMemo(() => {
    const map = {};
    (pvList || []).forEach((row, idx) => {
      const k = row.storageKey || "cooler-0";
      (map[k] = map[k] || []).push({ row, idx });
    });
    return map;
  }, [pvList]);

  const roomTempFor = (row) => {
    if (row.storageKey === "loading-area") return loadingArea?.temps?.[row.time] ?? "";
    const m = String(row.storageKey || "").match(/^cooler-(\d+)$/);
    if (!m) return "";
    return coolers?.[Number(m[1])]?.temps?.[row.time] ?? "";
  };
  const pvStatus = (row) => {
    const n = Number(row.productTemp);
    const limit = productTempLimit(storageTypeOf(row.storageKey));
    if (row.productTemp === "" || Number.isNaN(n)) return { text: "Pending", color: "#475569", bg: "#f1f5f9", limit: limit.label };
    return limit.pass(n)
      ? { text: "PASS", color: "#065f46", bg: "#dcfce7", limit: limit.label }
      : { text: "FAIL", color: "#991b1b", bg: "#fee2e2", limit: limit.label };
  };
  const sectionStatus = (temps, isInRange) => {
    let filled = 0, out = 0;
    COOLER_TIMES.forEach((t) => {
      const v = temps?.[t];
      const n = Number(v);
      if (v !== "" && v != null && !Number.isNaN(n)) { filled += 1; if (!isInRange(n)) out += 1; }
    });
    if (!filled) return { text: "No data", color: "#475569", bg: "#f1f5f9" };
    if (out) return { text: `${out} out of range`, color: "#991b1b", bg: "#fee2e2" };
    return { text: "All in range", color: "#065f46", bg: "#dcfce7" };
  };

  /* ===== Styles ===== */
  const statusChip = (s) => ({ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 999, background: s.bg, color: s.color, fontWeight: 900, fontSize: ".82rem", whiteSpace: "nowrap" });
  const rangeBadge = { padding: "3px 11px", borderRadius: 999, background: "#eef2ff", color: "#3730a3", fontWeight: 800, fontSize: ".78rem", border: "1px solid #c7d2fe", whiteSpace: "nowrap" };
  const subLabel = { fontSize: ".74rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8, display: "block" };
  const mField = { display: "flex", flexDirection: "column", gap: 4 };
  const mLabel = { fontSize: ".7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".3px" };
  const mReadOnly = { padding: "7px 9px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 800, textAlign: "center", boxSizing: "border-box", minWidth: 70 };
  const mInput = { padding: "7px 9px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 700, boxSizing: "border-box" };
  const accentFor = (i) => (i === 7 ? "#0ea5e9" : i === 2 || i === 3 ? "#7c3aed" : "#2563eb");
  const addMatchBtn = (accent) => ({ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${accent}`, background: "#fff", color: accent, fontWeight: 800, cursor: "pointer", fontSize: ".85rem" });
  const delBtn = { alignSelf: "flex-end", border: "1px solid #fecaca", background: "#fff", color: "#dc2626", borderRadius: 8, width: 36, height: 36, fontWeight: 900, cursor: "pointer", lineHeight: 1 };

  /* ===== Renderers ===== */
  const renderMatchPanel = (storageKey, accent) => {
    const list = pvByStorage[storageKey] || [];
    if (!editing && list.length === 0) return null;
    return (
      <div style={{ marginTop: 14, borderTop: `1px dashed ${accent}66`, paddingTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: list.length ? 10 : 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1rem" }}>🔗</span>
            <strong style={{ color: "#0f172a" }}>Product Match</strong>
            <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: ".82rem" }}>
              {list.length ? `${list.length} check${list.length === 1 ? "" : "s"}` : "optional"}
            </span>
          </div>
          {editing && (
            <button type="button" onClick={() => addPV(storageKey)} style={addMatchBtn(accent)}>+ Add product</button>
          )}
        </div>

        {list.length === 0 ? (
          <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: ".86rem", paddingBottom: 4 }}>No product matched yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {list.map(({ row, idx }, pos) => {
              const status = pvStatus(row);
              const roomTemp = roomTempFor(row);
              return (
                <div key={idx} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 10, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", boxShadow: "0 1px 4px rgba(15,23,42,.05)" }}>
                  <span style={{ alignSelf: "center", minWidth: 24, height: 24, borderRadius: 999, background: `${accent}1a`, color: accent, fontWeight: 900, fontSize: ".8rem", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{pos + 1}</span>

                  <div style={{ ...mField, width: 100 }}>
                    <span style={mLabel}>Time</span>
                    {editing ? (
                      <select value={row.time} onChange={(e) => updatePV(idx, "time", e.target.value)} style={mInput}>
                        {COOLER_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : <div style={{ ...mReadOnly, textAlign: "left" }}>{row.time || "—"}</div>}
                  </div>

                  <div style={{ ...mField, flex: "1 1 220px", minWidth: 200 }}>
                    <span style={mLabel}>Product {row.itemCode ? `· ${row.itemCode}` : ""}</span>
                    {editing ? (
                      <ProductPicker
                        value={row.productName}
                        itemCode={row.itemCode}
                        accent={accent}
                        onPick={(it) => setEditPV((prev) => prev.map((r, i) => (i === idx ? { ...r, productName: it.description, itemCode: it.item_code } : r)))}
                      />
                    ) : <div style={{ ...mReadOnly, textAlign: "left", minWidth: 0 }}>{row.productName || "—"}</div>}
                  </div>

                  <div style={{ ...mField, width: 130 }}>
                    <span style={mLabel}>Country</span>
                    {editing ? (
                      <input value={row.country || row.batchNo || ""} onChange={(e) => updatePV(idx, "country", e.target.value)} placeholder="Origin" style={mInput} />
                    ) : <div style={{ ...mReadOnly, textAlign: "left", minWidth: 0 }}>{row.country || row.batchNo || "—"}</div>}
                  </div>

                  <div style={{ ...mField, width: 92 }}>
                    <span style={mLabel}>Product °C</span>
                    {editing ? (
                      <input type="number" step="0.1" value={row.productTemp} onChange={(e) => updatePV(idx, "productTemp", e.target.value)} placeholder="°C" style={{ ...mInput, textAlign: "center", fontWeight: 900 }} />
                    ) : <div style={mReadOnly}>{row.productTemp === "" || row.productTemp == null ? "—" : `${row.productTemp}°C`}</div>}
                  </div>

                  <div style={{ ...mField, width: 92 }}>
                    <span style={mLabel}>Room °C</span>
                    <div style={{ ...mReadOnly, color: roomTemp === "" ? "#94a3b8" : "#0f172a" }}>{roomTemp === "" ? "—" : `${roomTemp}°C`}</div>
                  </div>

                  <div style={{ ...mField, width: 92 }}>
                    <span style={mLabel}>Limit</span>
                    <div style={{ ...mReadOnly, color: "#475569", fontSize: ".82rem" }}>{status.limit || "—"}</div>
                  </div>

                  <div style={mField}>
                    <span style={mLabel}>Status</span>
                    <span style={statusChip(status)}>{status.text}</span>
                  </div>

                  <div style={{ ...mField, flex: "1 1 200px", minWidth: 180 }}>
                    <span style={mLabel}>Remarks / Corrective</span>
                    {editing ? (
                      <input value={row.remarks} onChange={(e) => updatePV(idx, "remarks", e.target.value)} placeholder={status.text === "FAIL" ? "Corrective action required" : "Remarks"} style={mInput} />
                    ) : <div style={{ ...mReadOnly, textAlign: "left", minWidth: 0 }}>{row.remarks || "—"}</div>}
                  </div>

                  {editing && (
                    <button type="button" onClick={() => removePV(idx)} style={delBtn} title="Remove product check">✕</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTempGrid = (temps, onChange, idx, isLoading, color) => (
    <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      {COOLER_TIMES.map((time) => {
        const raw = temps?.[time];
        return (
          <label key={time} style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: "0.92rem", color, minWidth: 78 }}>
            <span style={{ marginBottom: 7, fontWeight: 600 }}>{time}</span>
            {editing ? (
              <input
                type="number" step="0.1" min="-50" max="50" placeholder="°C"
                value={raw ?? ""}
                onChange={(e) => onChange(time, e.target.value)}
                style={tempInputStyle(raw ?? "", idx, isLoading)}
              />
            ) : (
              <div style={tempInputStyle(raw ?? "", idx, isLoading)}>
                {raw === undefined || raw === "" || raw === null ? "—" : `${String(raw).trim()}°C`}
              </div>
            )}
          </label>
        );
      })}
    </div>
  );

  /* ===== UI ===== */
  return (
    <GlassShell
      icon="🧊"
      title="Coolers Temperature Control"
      actions={
        <ReportActions
          onRefresh={refreshList}
          onJson={handleExportJSON}
          onImport={handleImportTrigger}
          onDelete={handleDeleteCurrent}
          refreshing={loadingList}
          deleteDisabled={!selectedDate}
        />
      }
    >
      <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportJSON} />
      <ResponsiveReportLayout
        sidebar={
          <DateTreeSidebar
            items={treeItems}
            activeKey={selectedDate}
            onPick={(it) => setSelectedDate(it.dateISO)}
            title="Saved Reports"
            loading={loadingList}
            emptyText="No reports"
            maxHeight="calc(100vh - 250px)"
          />
        }
      >
        <main style={{ minWidth: 0 }}>
          <TMPPrintHeader header={tmpHeader} reportDate={reportDateText} />

          <ActionBar style={{ margin: "8px 0" }}>
            {!editing ? (
              <ActionButton onClick={() => setEditing(true)} tone="edit" disabled={!report}>Edit</ActionButton>
            ) : (
              <>
                <ActionButton onClick={saveEditing} tone="save" disabled={saving}>Save</ActionButton>
                <ActionButton onClick={cancelEditing} tone="cancel" disabled={saving}>Cancel</ActionButton>
              </>
            )}
          </ActionBar>

          {!report && !editing ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "#6b7280", fontWeight: 700 }}>
              No coolers data for this date.
            </div>
          ) : (
            <>
              {coolers.map((cooler, i) => {
                const accent = accentFor(i);
                const r = coolerRange(i);
                const status = sectionStatus(cooler?.temps, (n) => inCoolerRange(i, n));
                return (
                  <div key={i} style={{ marginBottom: "1.1rem", padding: "1rem 1.1rem", background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", borderLeft: `5px solid ${accent}`, boxShadow: "0 4px 16px rgba(2,132,199,.06)", breakInside: "avoid" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: ".85rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "1.15rem" }}>{i === 7 ? "❄️" : "🧊"}</span>
                        <strong style={{ fontSize: "1.08rem", color: "#0f172a" }}>{labelForCooler(i)}</strong>
                        <span style={rangeBadge}>{`${r.min}°C to ${r.max}°C`}</span>
                      </div>
                      <span style={statusChip(status)}>{status.text}</span>
                    </div>

                    <span style={subLabel}>Temperatures (°C)</span>
                    {renderTempGrid(cooler?.temps, (time, val) => setTemp(i, time, val), i, false, "#34495e")}

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginTop: 12 }}>
                      <span style={{ fontWeight: 600, color: "#475569" }}>Remarks</span>
                      {editing ? (
                        <input value={cooler?.remarks || ""} onChange={(e) => setRemarksRow(i, e.target.value)} placeholder="Notes / observations" style={{ ...mInput, minWidth: 260 }} />
                      ) : <div style={{ ...mReadOnly, textAlign: "left", minWidth: 260 }}>{cooler?.remarks || "—"}</div>}
                    </div>

                    {renderMatchPanel(`cooler-${i}`, accent)}
                  </div>
                );
              })}

              {(loadingArea || editing) && (() => {
                const accent = "#d97706";
                const status = sectionStatus(loadingArea?.temps, inLoadingAreaRange);
                return (
                  <div style={{ marginBottom: "1.1rem", padding: "1rem 1.1rem", background: "#fffbeb", borderRadius: 14, border: "1px solid #fde68a", borderLeft: `5px solid ${accent}`, boxShadow: "0 4px 16px rgba(217,119,6,.07)", breakInside: "avoid" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: ".85rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "1.15rem" }}>🚚</span>
                        <strong style={{ fontSize: "1.08rem", color: "#b45309" }}>Loading Area</strong>
                        <span style={{ ...rangeBadge, background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>≤ 16°C</span>
                      </div>
                      <span style={statusChip(status)}>{status.text}</span>
                    </div>

                    <span style={{ ...subLabel, color: "#a16207" }}>Temperatures (°C)</span>
                    {renderTempGrid(loadingArea?.temps, (time, val) => setLoadingTemp(time, val), 0, true, "#92400e")}

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginTop: 12 }}>
                      <span style={{ fontWeight: 600, color: "#92400e" }}>Remarks</span>
                      {editing ? (
                        <input value={loadingArea?.remarks || ""} onChange={(e) => setLoadingRemarks(e.target.value)} placeholder="Notes / observations" style={{ ...mInput, minWidth: 260 }} />
                      ) : <div style={{ ...mReadOnly, textAlign: "left", minWidth: 260 }}>{loadingArea?.remarks || "—"}</div>}
                    </div>

                    {renderMatchPanel("loading-area", accent)}
                  </div>
                );
              })()}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>Verified by:</span>
                  <span style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, minWidth: 240, background: "#fff", fontWeight: 700 }}>
                    {report?.verifiedByManager || "—"}
                  </span>
                </div>
              </div>
            </>
          )}
        </main>
      </ResponsiveReportLayout>
    </GlassShell>
  );
}
