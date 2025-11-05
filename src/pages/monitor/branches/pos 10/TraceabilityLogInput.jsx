// D:\inspection-react-full\src\pages\monitor\branches\pos 10\TraceabilityLogInput.jsx
import React, { useEffect, useMemo, useState } from "react";
import { REPORTS_URL } from "../shipment_recc/qcsRawApi";

/* ===== API base ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== ثابت التقرير ===== */
const TYPE   = "pos10_traceability_log";
const BRANCH = "POS 10";

/* ===== Batch ID generator ===== */
let __batchCounter = 1;
function genBatchId() {
  try {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const n = String(__batchCounter++).padStart(3, "0");
    return `B-${y}${m}${dd}-${n}`;
  } catch { return `B-${Date.now()}`; }
}

/* ===== قوالب عناصر الإدخال/الإخراج ===== */
const emptyInput = () => ({
  rawName: "", origProdDate: "", origExpDate: "", openedDate: "", bestBefore: "", rawWeight: ""
});
const emptyOutput = () => ({
  finalName: "", finalProdDate: "", finalExpDate: "", finalWeight: ""
});

/* ===== Batch (سطر واحد) ===== */
function emptyBatch() {
  return { batchId: genBatchId(), inputs: [emptyInput()], outputs: [emptyOutput()] };
}

/* ===== Helpers ===== */
const pad2 = (v) => String(v || "").padStart(2, "0");
const toYMD = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x)) return "";
  return `${x.getFullYear()}-${pad2(x.getMonth()+1)}-${pad2(x.getDate())}`;
};
async function jsonFetch(url, opts = {}) {
  const { signal, ...rest } = opts || {};
  const res = await fetch(url, { headers:{Accept:"application/json"}, signal, ...rest });
  let data = null; try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}
const pick = (obj, paths, fb = "") => {
  for (const p of paths) {
    let cur = obj;
    for (const part of p.split(".")) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, part)) cur = cur[part];
      else { cur = undefined; break; }
    }
    if (cur !== undefined && cur !== null && cur !== "") return cur;
  }
  return fb;
};

/* ===== Date extraction for RAW ===== */
const MONTH_RE_1 = /^(\d{4})[\/\-](\d{1,2})$/;
const MONTH_RE_2 = /^(\d{1,2})[\/\-](\d{4})$/;
const DATE_RE = /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2})|(\d{1,2}[\/\-]\d{4})/g;

const normDate = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m1) { let d=+m1[1], mn=+m1[2], y=+m1[3]; if (y<100) y+=2000; return `${y}-${pad2(mn)}-${pad2(d)}`; }
  let m = s.match(MONTH_RE_1); if (m) { const y=+m[1], mn=+m[2]; return `${y}-${pad2(mn)}`; }
  m = s.match(MONTH_RE_2); if (m) { const mn=+m[1], y=+m[2]; return `${y}-${pad2(mn)}`; }
  return toYMD(s) || "";
};
function extractAllDates(value) {
  if (!value) return [];
  const s = String(value); const seen = new Set(); const out = [];
  const matches = s.match(DATE_RE) || [];
  for (const raw of matches) { const n = normDate(raw); if (n && !seen.has(n)) { seen.add(n); out.push(n); } }
  return out.sort();
}
const formatDateList = (arr) => !arr?.length ? "" : (arr.length===1 ? arr[0] : `${arr[0]} - ${arr[arr.length-1]}`);

/* ===== (aliases) ===== */
const _alias = (s) => String(s||"").toLowerCase().replace(/[\s_\-./]/g, "");
function _valuesByAliases(obj, aliases) {
  const out = []; if (!obj || typeof obj !== "object") return out;
  for (const [k,v] of Object.entries(obj)) {
    const nk = _alias(k);
    if (aliases.has(nk) && (typeof v==="string" || typeof v==="number")) out.push(String(v));
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [kk,vv] of Object.entries(v)) {
        const nnk = _alias(kk);
        if (aliases.has(nnk) && (typeof vv==="string" || typeof vv==="number")) out.push(String(vv));
      }
    }
  }
  return out;
}
const SLAUGHTER_KEYS = new Set(["slaughterdate","dateofslaughter","productiondate","manufacturedate","manufactureddate","mfgdate","mfd","proddate","dateofproduction"]);
const EXPIRY_KEYS    = new Set(["expirydate","expdate","expiry","bestbefore","bestbeforedate","bbd","useby","usebydate"]);

function deriveSlaughterAndExpiry(payloadIn) {
  const payload = payloadIn || {}; const header = payload.header || payload; const gi = payload.generalInfo || payload.info || {};
  const sDates = [], eDates = [];
  [payload, header, gi].forEach(o => {
    _valuesByAliases(o, SLAUGHTER_KEYS).forEach(v => extractAllDates(v).forEach(d => sDates.push(d)));
    _valuesByAliases(o, EXPIRY_KEYS).forEach(v => extractAllDates(v).forEach(d => eDates.push(d)));
  });
  const rows = payload.rows || payload.products || payload.items || payload.lines || payload.details || [];
  if (Array.isArray(rows)) rows.forEach(r => {
    _valuesByAliases(r, SLAUGHTER_KEYS).forEach(v => extractAllDates(v).forEach(d => sDates.push(d)));
    _valuesByAliases(r, EXPIRY_KEYS).forEach(v => extractAllDates(v).forEach(d => eDates.push(d)));
  });
  (Array.isArray(payload.samples) ? payload.samples : []).forEach(s => {
    _valuesByAliases(s, SLAUGHTER_KEYS).forEach(v => extractAllDates(v).forEach(d => sDates.push(d)));
    _valuesByAliases(s, EXPIRY_KEYS).forEach(v => extractAllDates(v).forEach(d => eDates.push(d)));
  });
  return { slaughterDate: formatDateList(Array.from(new Set(sDates)).sort()),
           expiryDate:    formatDateList(Array.from(new Set(eDates)).sort()) };
}

/* ===== RAW normalize (AWB/Invoice/…) ===== */
function normalizeRawForIndex(doc) {
  const payload = doc?.payload || doc || {};
  const header  = payload.header || payload;
  const gi      = payload.generalInfo || payload.info || {};

  const awb =
    pick(header, ["airWayBillNo","airWayBill","airwayBill","airway_bill","awb","AWB","airWaybillNo","airwayBillNo"]) ||
    pick(gi,     ["airWayBillNo","airWayBill","airwayBill","airway_bill","awb","AWB","airWaybillNo","airwayBillNo"]) ||
    pick(payload,["airWayBillNo","airWayBill","airwayBill","airway_bill","awb","AWB","airWaybillNo","airwayBillNo"]) ||
    pick(doc,    ["airWayBillNo","airWayBill","airwayBill","airway_bill","awb","AWB","airWaybillNo","airwayBillNo"]) || "";

  const invoice =
    pick(header,  ["invoiceNo","invoiceNumber","invoice","invNo","billNo","billNumber","invoice no"]) ||
    pick(gi,      ["invoiceNo","invoiceNumber","invoice","invNo","billNo","billNumber","invoice no"]) ||
    pick(payload, ["invoiceNo","invoiceNumber","invoice","invNo","billNo","billNumber","invoice no"]) ||
    pick(doc,     ["invoiceNo","invoiceNumber","invoice","invNo","billNo","billNumber","invoice no"]) || "";

  const shipment =
    pick(header, ["shipmentType","shipment","brandType","category","productGroup"]) ||
    pick(gi,     ["shipmentType","shipment"]) ||
    pick(payload,["shipmentType","shipment","brandType","category","productGroup"]) ||
    pick(doc,    ["shipmentType","shipment","brandType","category","productGroup"]) || "";

  const { slaughterDate, expiryDate } = deriveSlaughterAndExpiry(payload);

  return {
    id: doc?.id || doc?._id || payload?.id || payload?._id || "",
    awb: String(awb || "").trim(),
    invoice: String(invoice || "").trim(),
    shipment: String(shipment || "").trim(),
    slaughterDate: String(slaughterDate || "").trim(),
    expiryDate: String(expiryDate || "").trim(),
  };
}

/* ===== جلب فهرس RAW ===== */
async function fetchRawIndex({ signal } = {}) {
  const q = `${REPORTS_URL}?type=${encodeURIComponent("qcs_raw_material")}&limit=500`;
  const { ok, data } = await jsonFetch(q, { signal });
  if (!ok) return [];
  const items = Array.isArray(data) ? data : (data && (data.data || data.items || data.reports)) || [];
  return items.map(normalizeRawForIndex);
}

/* ===== أزرار مصغّرة ===== */
const miniBtn = {
  border: "1px solid",
  borderRadius: 8,
  padding: "4px 6px",
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer",
};

export default function TraceabilityLogInput() {
  /* ===== ترويسة ===== */
  const [section, setSection] = useState("");
  const [date, setDate] = useState(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  });

  /* ===== بيانات الدفعات ===== */
  const [batches, setBatches] = useState(() => [emptyBatch()]);
  const [checkedBy, setCheckedBy]   = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [saving, setSaving] = useState(false);

  /* ===== RAW Index للربط ===== */
  const [rawIndex, setRawIndex] = useState([]);
  const [rawQ, setRawQ] = useState("");
  const [showRawModal, setShowRawModal] = useState(false);
  const [activeBatch, setActiveBatch] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try { setRawIndex(await fetchRawIndex({ signal: ac.signal })); }
      catch (e) { if (e?.name !== "AbortError") console.error(e); }
    })();
    return () => ac.abort();
  }, []);

  const filteredRaw = useMemo(() => {
    const q = String(rawQ || "").toLowerCase().trim();
    if (!q) return rawIndex;
    return rawIndex.filter(r => {
      const hay = [r.awb, r.invoice, r.shipment, r.slaughterDate, r.expiryDate].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rawIndex, rawQ]);

  const openRawModal  = (bi) => { setActiveBatch(bi); setRawQ(""); setShowRawModal(true); };
  const closeRawModal = () => { setShowRawModal(false); setActiveBatch(null); setRawQ(""); };
  const chooseRaw = (r) => {
    if (activeBatch === null || activeBatch === undefined) return;
    const awbIsNil = !r.awb || r.awb.trim().toUpperCase() === "NIL";
    const val = awbIsNil
      ? (r.invoice || `${r.shipment || "Shipment"}-${(r.slaughterDate || "").replaceAll(" ", "")}`)
      : (r.awb     || `${r.shipment || "Shipment"}-${(r.slaughterDate || "").replaceAll(" ", "")}`);
    setBatches(prev => {
      const next = [...prev];
      next[activeBatch] = { ...next[activeBatch], batchId: val };
      return next;
    });
    closeRawModal();
  };

  /* ===== تنسيقات عامة ===== */
  const gridStyle = useMemo(() => ({ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }), []);
  const thCell = { border:"1px solid #1f3b70", padding:"6px 4px", textAlign:"center", whiteSpace:"pre-line", fontWeight:700, background:"#f5f8ff", color:"#0b1f4d" };
  const tdCell = { border:"1px solid #1f3b70", padding:"6px 4px", textAlign:"center", verticalAlign:"top" };
  const inputStyle = { width:"100%", boxSizing:"border-box", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px", display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0 };

  const topTable = { width:"100%", borderCollapse:"collapse", marginBottom:10, fontSize:"0.9rem", border:"1px solid #9aa4ae", background:"#f8fbff" };
  const tdHeader = { border:"1px solid #9aa4ae", padding:"6px 8px", verticalAlign:"middle" };
  const bandTitle = { textAlign:"center", background:"#dde3e9", fontWeight:700, padding:"6px 4px", border:"1px solid #9aa4ae", borderTop:"none", marginBottom:10 };

  const colDefs = useMemo(() => ([
    <col key="actions" style={{ width: 180 }} />,
    <col key="batchId" style={{ width: 260 }} />,
    <col key="inputs"  style={{ width: 520 }} />,
    <col key="outputs" style={{ width: 520 }} />,
  ]), []);

  /* ===== عمليات الدُفعات ===== */
  const addBatch = () => setBatches(prev => [...prev, emptyBatch()]);
  const deleteBatch = (bi) => setBatches(prev => prev.filter((_, i) => i !== bi));
  const duplicateBatch = (bi) => setBatches(prev => {
    const copy = JSON.parse(JSON.stringify(prev[bi])); copy.batchId = genBatchId();
    return [...prev.slice(0, bi+1), copy, ...prev.slice(bi+1)];
  });
  const updateBatchField = (bi, key, val) => setBatches(prev => {
    const next = [...prev]; next[bi] = { ...next[bi], [key]: val }; return next;
  });

  /* ===== عمليات داخل الدُفعة (RAW/FINAL) ===== */
  const addInput = (bi) => setBatches(prev => { const next=[...prev]; next[bi]={...next[bi], inputs:[...next[bi].inputs, emptyInput()]}; return next; });
  const deleteInput = (bi, ii) => setBatches(prev => { const next=[...prev]; const arr=[...next[bi].inputs]; arr.splice(ii,1); next[bi]={...next[bi], inputs: arr.length?arr:[emptyInput()]}; return next; });
  const updateInputField = (bi, ii, key, val) => setBatches(prev => { const next=[...prev]; const arr=[...next[bi].inputs]; arr[ii]={...arr[ii], [key]: val}; next[bi]={...next[bi], inputs:arr}; return next; });

  const addOutput = (bi) => setBatches(prev => { const next=[...prev]; next[bi]={...next[bi], outputs:[...next[bi].outputs, emptyOutput()]}; return next; });
  const deleteOutput = (bi, oi) => setBatches(prev => { const next=[...prev]; const arr=[...next[bi].outputs]; arr.splice(oi,1); next[bi]={...next[bi], outputs: arr.length?arr:[emptyOutput()]}; return next; });
  const updateOutputField = (bi, oi, key, val) => setBatches(prev => { const next=[...prev]; const arr=[...next[bi].outputs]; arr[oi]={...arr[oi], [key]: val}; next[bi]={...next[bi], outputs:arr}; return next; });

  /* ===== حفظ ===== */
  async function handleSave() {
    if (!date) { alert("الرجاء تحديد التاريخ."); return; }
    const hasAnyData = batches.some(b =>
      (b.inputs ?? []).some(inp => Object.values(inp).some(v => String(v||"").trim() !== "")) ||
      (b.outputs ?? []).some(out => Object.values(out).some(v => String(v||"").trim() !== "")));
    if (!hasAnyData) { alert("الرجاء تعبئة دفعة واحدة على الأقل بمادة أولية أو منتج نهائي قبل الحفظ."); return; }
    if (!checkedBy.trim())  { alert("حقل Checked by إلزامي."); return; }
    if (!verifiedBy.trim()) { alert("حقل Verified by إلزامي."); return; }

    setSaving(true);
    const entries = [];
    for (const b of batches) {
      const batchId = (b.batchId || "").trim();
      const inputs  = (b.inputs  ?? []).map(x => ({
        rawName:(x.rawName||"").trim(), origProdDate:(x.origProdDate||"").trim(), origExpDate:(x.origExpDate||"").trim(),
        openedDate:(x.openedDate||"").trim(), bestBefore:(x.bestBefore||"").trim(), rawWeight:(x.rawWeight||"").toString().trim(),
      }));
      const outputs = (b.outputs ?? []).map(x => ({
        finalName:(x.finalName||"").trim(), finalProdDate:(x.finalProdDate||"").trim(), finalExpDate:(x.finalExpDate||"").trim(),
        finalWeight:(x.finalWeight||"").toString().trim(),
      }));
      const hasInputs  = inputs.some(inp => Object.values(inp).some(v => v !== ""));
      const hasOutputs = outputs.some(out => Object.values(out).some(v => v !== ""));
      if (hasInputs && hasOutputs) {
        for (const inp of inputs) for (const out of outputs) entries.push({ batchId, ...inp, ...out });
      } else if (hasInputs) {
        for (const inp of inputs) entries.push({ batchId, ...inp, finalName:"", finalProdDate:"", finalExpDate:"", finalWeight:"" });
      } else if (hasOutputs) {
        for (const out of outputs) entries.push({ batchId, rawName:"", origProdDate:"", origExpDate:"", openedDate:"", bestBefore:"", rawWeight:"", ...out });
      }
    }
    const rowKeys = ["rawName","origProdDate","origExpDate","openedDate","bestBefore","finalName","finalProdDate","finalExpDate"];
    const cleaned = entries.filter(r => rowKeys.some(k => (r[k] ?? "").toString().trim() !== ""));

    const payload = {
      branch: BRANCH, section: section.trim(), reportDate: date, entries: cleaned,
      checkedBy: checkedBy.trim(), verifiedBy: verifiedBy.trim(), savedAt: Date.now(), uiMode: "single-row-batch",
    };

    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ reporter: "pos10", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ تم الحفظ بنجاح");
    } catch (e) { console.error(e); alert("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة."); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      {/* Header */}
      <table style={topTable}>
        <tbody>
          <tr>
            <td rowSpan={3} style={{ ...tdHeader, width:120, textAlign:"center" }}>
              <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.1 }}>AL<br/>MAWASHI</div>
            </td>
            <td style={tdHeader}><b>Document Title:</b> Traceability Log</td>
            <td style={tdHeader}><b>Document No:</b> FS-QM/REC/TL</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
            <td style={tdHeader}><b>Revision No:</b> 0</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Area:</b> {BRANCH}</td>
            <td style={tdHeader}><b>Date:</b> {date || "—"}</td>
          </tr>
        </tbody>
      </table>
      <div style={bandTitle}>TRACEABILITY LOG — {BRANCH}</div>

      {/* Header (Section + Date) */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, gap:12 }}>
        <div style={{ fontWeight:800, fontSize:18 }}>Traceability Log – {BRANCH}</div>
        <div style={{ display:"grid", gridTemplateColumns:"auto 180px", gap:6, alignItems:"center", fontSize:12 }}>
          <div>Section :</div><input value={section} onChange={(e)=>setSection(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
          <div>Date :</div><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Actions</th>
              <th style={thCell}>Batch / Lot ID</th>
              <th style={thCell}>Inputs (Raw Materials)</th>
              <th style={thCell}>Outputs (Final Products)</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b, bi) => (
              <tr key={bi}>
                {/* Actions */}
                <td style={{ ...tdCell, textAlign:"left" }}>
                  <div style={{ display:"grid", gap:6 }}>
                    <button
                      onClick={() => duplicateBatch(bi)}
                      style={{ ...miniBtn, background:"#eef2ff", borderColor:"#4f46e5", color:"#3730a3" }}
                      title="Duplicate batch (new Batch ID)"
                    >⎘ Duplicate batch</button>

                    {/* تم نقل Link from RAW إلى عمود Batch / Lot ID */}

                    <button
                      onClick={() => addInput(bi)}
                      style={{ ...miniBtn, background:"#f0fdf4", borderColor:"#16a34a", color:"#166534" }}
                      title="Add raw material row to this batch"
                    >+ Add RAW</button>

                    <button
                      onClick={() => addOutput(bi)}
                      style={{ ...miniBtn, background:"#ecfeff", borderColor:"#06b6d4", color:"#0e7490" }}
                      title="Add final product row to this batch"
                    >+ Add FINAL</button>

                    <button
                      onClick={() => deleteBatch(bi)}
                      style={{ ...miniBtn, background:"#fef2f2", borderColor:"#ef4444", color:"#b91c1c" }}
                      title="Delete batch"
                    >× Delete batch</button>
                  </div>
                </td>

                {/* Batch / Lot ID + زر Link from RAW هنا */}
                <td style={{ ...tdCell, textAlign:"left" }}>
                  <div style={{ display:"grid", gap:6 }}>
                    <input
                      type="text"
                      placeholder="e.g., B-YYYYMMDD-001 or AWB"
                      value={b.batchId}
                      onChange={(e) => updateBatchField(bi, "batchId", e.target.value)}
                      style={inputStyle}
                    />
                    <button
                      onClick={() => openRawModal(bi)}
                      style={{ ...miniBtn, background:"#e2e8f0", borderColor:"#475569", color:"#0f172a" }}
                      title="Link Batch / Lot ID from RAW shipments"
                    >Link from RAW</button>
                  </div>
                </td>

                {/* Inputs */}
                <td style={{ ...tdCell, textAlign:"left" }}>
                  <div style={{ display:"grid", gap:8 }}>
                    {b.inputs.map((inp, ii) => (
                      <div key={ii} style={{ border:"1px dashed #c7d2fe", borderRadius:8, padding:8 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:6, alignItems:"center", marginBottom:6 }}>
                          <label>Name</label>
                          <input placeholder="Raw material name" value={inp.rawName}
                            onChange={(e)=>updateInputField(bi, ii, "rawName", e.target.value)} style={inputStyle}/>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:6, alignItems:"center" }}>
                          <label>Original Production Date</label>
                          <input type="date" value={inp.origProdDate} onChange={(e)=>updateInputField(bi, ii, "origProdDate", e.target.value)} style={inputStyle}/>
                          <label>Original Expiry Date</label>
                          <input type="date" value={inp.origExpDate} onChange={(e)=>updateInputField(bi, ii, "origExpDate", e.target.value)} style={inputStyle}/>
                          <label>Opened Date</label>
                          <input type="date" value={inp.openedDate} onChange={(e)=>updateInputField(bi, ii, "openedDate", e.target.value)} style={inputStyle}/>
                          <label>Best Before Date</label>
                          <input type="date" value={inp.bestBefore} onChange={(e)=>updateInputField(bi, ii, "bestBefore", e.target.value)} style={inputStyle}/>
                          <label>Weight (kg)</label>
                          <input type="number" step="0.01" min="0" value={inp.rawWeight}
                            onChange={(e)=>updateInputField(bi, ii, "rawWeight", e.target.value)} style={inputStyle} placeholder="e.g., 2.50"/>
                        </div>
                        <div style={{ marginTop:6, textAlign:"right" }}>
                          <button onClick={()=>deleteInput(bi, ii)}
                            style={{ ...miniBtn, background:"#fff7ed", borderColor:"#f97316", color:"#9a3412" }}
                            title="Remove this raw line">– Remove RAW</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>

                {/* Outputs */}
                <td style={{ ...tdCell, textAlign:"left" }}>
                  <div style={{ display:"grid", gap:8 }}>
                    {b.outputs.map((out, oi) => (
                      <div key={oi} style={{ border:"1px dashed #bae6fd", borderRadius:8, padding:8 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:6, alignItems:"center", marginBottom:6 }}>
                          <label>Final Product Name</label>
                          <input placeholder="Final product name" value={out.finalName}
                            onChange={(e)=>updateOutputField(bi, oi, "finalName", e.target.value)} style={inputStyle}/>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:6, alignItems:"center" }}>
                          <label>Production Date</label>
                          <input type="date" value={out.finalProdDate} onChange={(e)=>updateOutputField(bi, oi, "finalProdDate", e.target.value)} style={inputStyle}/>
                          <label>Expiry Date</label>
                          <input type="date" value={out.finalExpDate} onChange={(e)=>updateOutputField(bi, oi, "finalExpDate", e.target.value)} style={inputStyle}/>
                          <label>Weight (kg)</label>
                          <input type="number" step="0.01" min="0" value={out.finalWeight}
                            onChange={(e)=>updateOutputField(bi, oi, "finalWeight", e.target.value)} style={inputStyle} placeholder="e.g., 1.20"/>
                        </div>
                        <div style={{ marginTop:6, textAlign:"right" }}>
                          <button onClick={()=>deleteOutput(bi, oi)}
                            style={{ ...miniBtn, background:"#fff1f2", borderColor:"#fb7185", color:"#9f1239" }}
                            title="Remove this final line">– Remove FINAL</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={addBatch} style={btnStyle("#10b981")}>+ Add Batch (one-row)</button>
        <button onClick={handleSave} disabled={saving} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : "Save Log"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, gap:12, width:"100%" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:260 }}>
          <span style={{ fontSize:12 }}>Checked by:</span>
          <input value={checkedBy} onChange={(e)=>setCheckedBy(e.target.value)} style={inputStyle} placeholder="Operator / Preparer"/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:260 }}>
          <span style={{ fontSize:12 }}>Verified by:</span>
          <input value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} style={inputStyle} placeholder="Supervisor / QA"/>
        </div>
      </div>

      <div style={{ marginTop:12, paddingTop:8, borderTop:"2px solid #1f3b70", fontSize:12, color:"#0b1f4d", lineHeight:1.6 }}>
        <strong style={{ color:"#0b1f4d" }}>Note:</strong>
        <span style={{ marginInlineStart:4 }}>
          This form uses a single row per <b>Batch / Lot</b> with dynamic inputs/outputs.
          Data is flattened to the legacy <b>entries</b> format on save for backend compatibility.
        </span>
      </div>

      {/* ===== RAW Modal ===== */}
      {showRawModal && (
        <>
          <div onClick={closeRawModal} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:50 }}/>
          <div role="dialog" aria-modal="true" style={{
            position:"fixed", top:"50%", left:"50%", transform:"translate(-50%, -50%)",
            width:"min(900px, 95vw)", maxHeight:"80vh", background:"#fff", borderRadius:12,
            border:"1px solid #cbd5e1", boxShadow:"0 20px 60px rgba(0,0,0,0.25)", zIndex:51, display:"flex", flexDirection:"column"
          }}>
            <div style={{ padding:"12px 16px", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontWeight:800, fontSize:16 }}>Link from RAW</div>
              <button onClick={closeRawModal} style={{ ...miniBtn, background:"#e2e8f0", borderColor:"#475569", color:"#0f172a" }}>Close</button>
            </div>
            <div style={{ padding:12, borderBottom:"1px solid #e2e8f0" }}>
              <input
                placeholder="Search AWB / Invoice / Shipment / Slaughter Date / Expiry Date"
                value={rawQ} onChange={(e)=>setRawQ(e.target.value)}
                style={{ width:"100%", border:"1px solid #94a3b8", borderRadius:8, padding:"8px 10px" }}
              />
            </div>
            <div style={{ padding:12, overflow:"auto" }}>
              {filteredRaw.length === 0 ? (
                <div style={{ fontSize:12, color:"#64748b" }}>No matches.</div>
              ) : (
                <div style={{ display:"grid", gap:8 }}>
                  {filteredRaw.map((r, idx) => {
                    const awbIsNil = !r.awb || r.awb.trim().toUpperCase() === "NIL";
                    return (
                      <div key={r.id || idx} onClick={() => chooseRaw(r)} style={{
                        display:"grid", gridTemplateColumns:"1fr auto", gap:8, alignItems:"center",
                        padding:"8px 10px", border:"1px solid #cbd5e1", borderRadius:8, background:"#ffffff", cursor:"pointer"
                      }} title="Click to fill Batch / Lot ID">
                        <div style={{ fontSize:12 }}>
                          <div><b>AWB:</b> {r.awb || "-"}</div>
                          {awbIsNil && <div><b>Invoice:</b> {r.invoice || "-"}</div>}
                          <div><b>Shipment:</b> {r.shipment || "-"}</div>
                        </div>
                        <div style={{ fontSize:12, textAlign:"right" }}>
                          <div><b>Slaughter Date:</b> {r.slaughterDate || "-"}</div>
                          <div><b>Expiry Date:</b> {r.expiryDate || "-"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function btnStyle(bg) {
  return { background:bg, color:"#fff", border:"none", borderRadius:10, padding:"10px 14px",
           fontWeight:700, cursor:"pointer", boxShadow:"0 4px 12px rgba(0,0,0,.15)" };
}
