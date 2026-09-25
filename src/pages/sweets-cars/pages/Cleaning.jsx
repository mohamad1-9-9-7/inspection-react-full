// src/pages/sweets-cars/pages/Cleaning.jsx
// Confectionery copy of the truck daily cleaning checklist — same design,
// own sweets_* report types, no data from any other company.
import React, { useEffect, useMemo, useState } from "react";
import { Bi, bi } from "../../monitor/branches/sweets/bilingual";

/* Arabic twins of the table heads (screen only; the payload keys are unchanged). */
const TRUCK_COL_AR = {
  "Truck No.": "رقم الشاحنة", "Truck floor": "أرضية الشاحنة", "Air Curtain": "الستارة الهوائية", "Truck body": "هيكل الشاحنة",
  "Truck door": "باب الشاحنة", "Shelves / tray racks": "الرفوف / حوامل الصواني", "Truck pallets": "طبليات الشاحنة",
  "Cake boxes / crates": "علب الكيك / الصناديق", "Informed to": "أُبلغ إلى", "Remarks": "ملاحظات",
};

/* ================= API base (CRA + Vite + window override) ================= */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const fromWindow = typeof window !== "undefined" ? window.__QCS_API__ : undefined;
const fromProcess =
  typeof process !== "undefined"
    ? process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL
    : undefined;
let fromVite;
try {
  fromVite = import.meta.env && import.meta.env.VITE_API_URL;
} catch {
  fromVite = undefined;
}

const API_BASE = String(fromWindow || fromProcess || fromVite || API_ROOT_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

async function sendToServer(path, { method = "GET", json } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: json ? { "Content-Type": "application/json" } : undefined,
    body: json ? JSON.stringify(json) : undefined,
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });

  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || data?.raw || res.statusText;
    throw new Error(`HTTP ${res.status} – ${msg}`);
  }
  return data ?? {};
}

/* ================= Helpers ================= */
const pad2 = (n) => String(n).padStart(2, "0");
const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const STATUS = ["C", "N/C"];

/* Default trucks (fallback if server list empty) */
const DEFAULT_TRUCKS = []; // the company adds its own vehicles (saved as lookups)

const LOOKUP_TRUCKS_TYPE = "sweets_truck_daily_cleaning_lookup_truck_numbers";
const REPORT_TYPE = "sweets_truck_daily_cleaning";

const makeEmptyRow = () => ({
  truckNo: "",
  truckFloor: "C",
  airCurtain: "C",
  truckBody: "C",
  truckDoor: "C",
  railHook: "C",
  truckPallets: "C",
  truckCrates: "C",
  informedTo: "",
  remarks: "",
});

function normNo(v) {
  return String(v ?? "").trim();
}
function uniqSorted(arr) {
  const seen = new Set();
  const out = [];
  arr
    .map((x) => normNo(x))
    .filter(Boolean)
    .forEach((x) => {
      if (!seen.has(x)) {
        seen.add(x);
        out.push(x);
      }
    });
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export default function Cleaning() {
  /* ====== Header ====== */
  const [hdr, setHdr] = useState({
    documentTitle: "TRUCK DAILY CLEANING CHECKLIST",
    documentNo: "SW-SAN-TDCL-01",
    issueDate: "",
    revisionNo: "1",
    area: "QA",
    issuedBy: "",
    controllingOfficer: "Online Quality Controller",
    approvedBy: "",
  });

  /* ====== Body ====== */
  const [date, setDate] = useState(todayYMD());
  const [rows, setRows] = useState([makeEmptyRow()]);
  const [truckOptions, setTruckOptions] = useState(uniqSorted(DEFAULT_TRUCKS));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  /* ====== Lookups / add truck ====== */
  const [lookupBusy, setLookupBusy] = useState(false);
  const [newTruckNo, setNewTruckNo] = useState("");

  /* ====== Remarks block ====== */
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [chemicalUsed, setChemicalUsed] = useState("All-purpose cleaner (Multi clean)");
  const [cleaningProcedure, setCleaningProcedure] = useState(
    "Remove all left-over material inside, clean the floor with a broom or brush to remove debris, apply Multi clean detergent, scrub inside the chiller vehicle with clean brush, use water pressure pump to clean with water, after cleaning disinfect the inside truck."
  );
  const [frequencyRemark, setFrequencyRemark] = useState("Frequency: Daily");

  const validRows = useMemo(() => rows.filter((r) => normNo(r.truckNo).length > 0), [rows]);

  const isDuplicateTruck = (no, exceptIndex = -1) =>
    rows.some((r, i) => i !== exceptIndex && normNo(r.truckNo) === normNo(no));

  const setCell = (i, key, val) => {
    if (key === "truckNo") {
      const v = normNo(val);
      if (v && isDuplicateTruck(v, i)) {
        setMsg(`Truck No. "${v}" is already used for this date. Only one row per truck per day. · رقم الشاحنة مستخدم لهذا اليوم.`);
        return;
      }
    }
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  };

  const addRow = () => setRows((r) => [...r, makeEmptyRow()]);
  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));

  const clearAll = () => {
    setRows([makeEmptyRow()]);
    setCheckedBy("");
    setVerifiedBy("");
    setNewTruckNo("");
    setMsg("");
  };

  /* ====== Load truck numbers (server) once ====== */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLookupBusy(true);
        const data = await sendToServer(`/api/reports?type=${encodeURIComponent(LOOKUP_TRUCKS_TYPE)}`, {
          method: "GET",
        });

        const arr = Array.isArray(data) ? data : data?.data ?? [];
        const values = arr
          .map((x) => x?.payload?.value ?? x?.value ?? "")
          .map((x) => normNo(x))
          .filter(Boolean);

        if (!alive) return;
        setTruckOptions(uniqSorted([...DEFAULT_TRUCKS, ...values]));
      } catch (e) {
        console.warn("Failed to load truck lookup:", e);
        if (alive) setTruckOptions(uniqSorted(DEFAULT_TRUCKS));
      } finally {
        if (alive) setLookupBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function saveTruckToServer(value) {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + "-" + Math.random().toString(16).slice(2);

    await sendToServer("/api/reports", {
      method: "POST",
      json: {
        type: LOOKUP_TRUCKS_TYPE,
        payload: { id, value, createdAt: Date.now() },
      },
    });
  }

  const canAddNewTruck = useMemo(() => {
    const s = normNo(newTruckNo);
    if (!s) return false;
    if (!/^\d{3,}$/.test(s)) return false;
    if (truckOptions.includes(s)) return false;

    // لأنه رح نختاره تلقائياً بالسطر الأول: لازم ما يكون مستخدم بأي سطر تاني
    if (isDuplicateTruck(s, 0)) return false;
    return true;
  }, [newTruckNo, truckOptions, rows]);

  async function addNewTruckTop() {
    const s = normNo(newTruckNo);
    setMsg("");

    if (!s) return;
    if (!/^\d{3,}$/.test(s)) {
      setMsg("Truck number must be digits only (min 3). · رقم الشاحنة أرقام فقط (3 على الأقل).");
      return;
    }
    if (truckOptions.includes(s)) {
      setMsg(`Truck No. "${s}" already exists in the list. · الرقم موجود في القائمة.`);
      // اختياري: خليه يختاره بالسطر الأول لو موجود
      setCell(0, "truckNo", s);
      return;
    }
    if (isDuplicateTruck(s, 0)) {
      setMsg(`Truck No. "${s}" is already used in another row. · الرقم مستخدم في سطر آخر.`);
      return;
    }

    try {
      setLookupBusy(true);
      setMsg("Saving truck number... · جارٍ حفظ رقم الشاحنة…");
      await saveTruckToServer(s);

      setTruckOptions((prev) => uniqSorted([...prev, s]));

      // فقط أول سطر يتعبّى تلقائي
      setCell(0, "truckNo", s);

      setNewTruckNo("");
      setMsg("Truck number saved. · تم حفظ رقم الشاحنة.");
      setTimeout(() => setMsg(""), 1800);
    } catch (e) {
      setMsg(String(e.message || e));
    } finally {
      setLookupBusy(false);
    }
  }

  async function onSave() {
    try {
      setMsg("");
      if (!date) {
        setMsg("Select date. · اختر التاريخ.");
        return;
      }
      if (validRows.length === 0) {
        setMsg("Add at least one truck. · أضف شاحنة واحدة على الأقل.");
        return;
      }

      for (const r of validRows) {
        const no = normNo(r.truckNo);
        if (!truckOptions.includes(no)) {
          setMsg(`Truck No. "${no}" is not in the list. · الرقم غير موجود في القائمة.`);
          return;
        }
      }

      const seen = new Set();
      for (const r of validRows) {
        const no = normNo(r.truckNo);
        if (seen.has(no)) {
          setMsg(`Truck No. "${no}" is duplicated for this date. Only one row per truck per day. · الرقم مكرر لهذا اليوم.`);
          return;
        }
        seen.add(no);
      }

      const payload = {
        date,
        meta: {
          documentTitle: hdr.documentTitle,
          documentNo: hdr.documentNo,
          revisionNo: hdr.revisionNo,
          area: hdr.area,
          issuedBy: hdr.issuedBy,
          controllingOfficer: hdr.controllingOfficer,
          approvedBy: hdr.approvedBy,
          issueDate: hdr.issueDate,
        },
        checkedBy,
        verifiedBy,
        chemicalUsed,
        cleaningProcedure,
        frequencyRemark,
        rows: validRows,
        createdAt: new Date().toISOString(),
      };

      setSaving(true);

      const res = await sendToServer("/api/reports", {
        method: "POST",
        json: { type: REPORT_TYPE, payload },
      });

      // The server is the only store — no local copy of saved reports.
      void res;

      setMsg("Saved successfully. · تم الحفظ بنجاح.");
      clearAll();
    } catch (e) {
      setMsg(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  /* ================== Modern Styles ================== */
  const page = {
    padding: "18px",
    direction: "ltr",
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f3f6fb 0%, #eef2f7 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
  };

  const card = {
    background: "#ffffff",
    border: "1px solid #e5eaf3",
    borderRadius: 16,
    boxShadow: "0 12px 28px rgba(2,6,23,.08)",
    overflow: "hidden",
  };

  const cardPad = { padding: 14 };

  const headerGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  };

  const label = { fontWeight: 800, fontSize: 12, color: "#334155" };

  const input = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1.5px solid #c9d3e6",
    background: "#ffffff",
    boxSizing: "border-box",
    outline: "none",
  };

  const readOnlyBox = {
    ...input,
    display: "flex",
    alignItems: "center",
    fontWeight: 800,
    background: "#f8fafc",
  };

  const topTitle = { margin: "14px 0 4px", fontWeight: 900, letterSpacing: 0.2 };
  const subTitle = { margin: "0 0 12px", fontWeight: 800, color: "#334155" };

  const tableWrap = {
    overflowX: "auto",
    borderTop: "1px solid #e5eaf3",
  };

  const table = {
    borderCollapse: "separate",
    borderSpacing: 0,
    minWidth: 1100,
    width: "100%",
    tableLayout: "fixed",
  };

  const th = {
    position: "sticky",
    top: 0,
    zIndex: 1,
    background: "#f1f5ff",
    borderBottom: "1px solid #d9e3ff",
    padding: "12px 10px",
    fontWeight: 900,
    fontSize: 12,
    color: "#1f2a44",
    whiteSpace: "nowrap",
  };

  const td = {
    padding: "10px",
    borderBottom: "1px solid #edf2f7",
    background: "#ffffff",
    verticalAlign: "top",
  };

  const select = {
    ...input,
    padding: "10px 12px",
    appearance: "auto",
  };

  const btnBase = {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    letterSpacing: 0.2,
    boxShadow: "0 6px 16px rgba(2,6,23,.10)",
  };

  const btnPrimary = {
    ...btnBase,
    background: saving ? "#7aa2ff" : "#4054ec",
    color: "#ffffff",
    cursor: saving ? "not-allowed" : "pointer",
  };

  const btnGhost = {
    ...btnBase,
    background: "#ffffff",
    border: "1px solid #c9d3e6",
    color: "#0f172a",
    boxShadow: "none",
  };

  const btnDanger = {
    ...btnGhost,
    borderColor: "#fecaca",
    color: "#b91c1c",
  };

  const msgBox = (isErr) => ({
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 800,
    background: isErr ? "#fff1f2" : "#ecfdf5",
    border: isErr ? "1px solid #fecdd3" : "1px solid #a7f3d0",
    color: isErr ? "#b00020" : "#0a7a2a",
  });

  const topControlsRow = {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: 12,
    alignItems: "start",
  };

  const block = {
    border: "1px dashed #c9d3e6",
    background: "#f8fafc",
    borderRadius: 14,
    padding: 12,
  };

  const inlineGrid = {
    display: "grid",
    gridTemplateColumns: "1fr 120px",
    gap: 8,
    alignItems: "center",
    marginTop: 6,
  };

  const miniBtn = {
    ...btnGhost,
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 900,
    opacity: lookupBusy ? 0.7 : 1,
    cursor: lookupBusy ? "not-allowed" : "pointer",
  };

  return (
    <div style={page}>
      <div style={card}>
        {/* ===== Header ===== */}
        <div style={{ ...cardPad, background: "#f8fafc" }}>
          <div style={headerGrid}>
            <div>
              <div style={label}><Bi en="Document Title:" /></div>
              <input
                style={input}
                value={hdr.documentTitle}
                onChange={(e) => setHdr({ ...hdr, documentTitle: e.target.value })}
              />
            </div>
            <div>
              <div style={label}><Bi en="Document No.:" /></div>
              <input
                style={input}
                value={hdr.documentNo}
                onChange={(e) => setHdr({ ...hdr, documentNo: e.target.value })}
              />
            </div>
            <div>
              <div style={label}><Bi en="Issue Date:" /></div>
              <div style={readOnlyBox}>12/04/2025</div>
            </div>
            <div>
              <div style={label}><Bi en="Revision No.:" /></div>
              <input
                style={input}
                value={hdr.revisionNo}
                onChange={(e) => setHdr({ ...hdr, revisionNo: e.target.value })}
              />
            </div>

            <div>
              <div style={label}><Bi en="Area:" /></div>
              <input style={input} value={hdr.area} onChange={(e) => setHdr({ ...hdr, area: e.target.value })} />
            </div>
            <div>
              <div style={label}><Bi en="Issued By:" /></div>
              <input
                style={input}
                value={hdr.issuedBy}
                onChange={(e) => setHdr({ ...hdr, issuedBy: e.target.value })}
              />
            </div>
            <div>
              <div style={label}><Bi en="Controlling Officer:" /></div>
              <input
                style={input}
                value={hdr.controllingOfficer}
                onChange={(e) => setHdr({ ...hdr, controllingOfficer: e.target.value })}
              />
            </div>
            <div>
              <div style={label}><Bi en="Approved By:" /></div>
              <input
                style={input}
                value={hdr.approvedBy}
                onChange={(e) => setHdr({ ...hdr, approvedBy: e.target.value })}
              />
            </div>
          </div>

          <h2 style={topTitle}><Bi en="CONFECTIONERY" ar="الحلويات" /></h2>
          <h3 style={subTitle}><Bi en="TRUCK DAILY CLEANING CHECKLIST" ar="قائمة التنظيف اليومي للشاحنات" /></h3>

          {/* ===== Date + Add Truck (TOP, above table) ===== */}
          <div style={topControlsRow}>
            <div style={block}>
              <div style={{ fontWeight: 900 }}><Bi en="Date" /></div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...input, marginTop: 6 }} />
              {lookupBusy && (
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: "#64748b" }}><Bi en="Loading trucks…" ar="جارٍ تحميل الشاحنات…" /></div>
              )}
            </div>

            <div style={block}>
              <div style={{ fontWeight: 900 }}><Bi en="Add new truck number (saved to server)" ar="إضافة رقم شاحنة جديد (يُحفظ على الخادم)" /></div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", marginTop: 4 }}>
                <Bi en="This will auto-select in Row 1 and appear in all dropdowns." ar="يُختار تلقائياً في السطر الأول ويظهر في كل القوائم." />
              </div>

              <div style={inlineGrid}>
                <input
                  value={newTruckNo}
                  onChange={(e) => setNewTruckNo(e.target.value)}
                  style={input}
                  placeholder="Digits only (e.g. 12345) · أرقام فقط"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={addNewTruckTop}
                  style={miniBtn}
                  disabled={!canAddNewTruck || lookupBusy}
                  title={
                    !newTruckNo.trim()
                      ? "Enter number"
                      : truckOptions.includes(normNo(newTruckNo))
                      ? "Already exists"
                      : !/^\d{3,}$/.test(normNo(newTruckNo))
                      ? "Digits only (min 3)"
                      : lookupBusy
                      ? "Please wait..."
                      : "Add"
                  }
                >
                  <Bi en="+ Add" ar="+ إضافة" />
                </button>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: "#334155" }}>
                <Bi en="No duplicates • Stored permanently" ar="بدون تكرار • يُحفظ بشكل دائم" />
              </div>
            </div>
          </div>
        </div>

        {/* ===== Table ===== */}
        <div style={tableWrap}>
          <table style={table}>
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>

            <thead>
              <tr>
                {[
                  "Truck No.",
                  "Truck floor",
                  "Air Curtain",
                  "Truck body",
                  "Truck door",
                  "Shelves / tray racks",
                  "Truck pallets",
                  "Cake boxes / crates",
                  "Informed to",
                  "Remarks",
                  "",
                ].map((h) => (
                  <th key={h} style={th}>
                    <Bi en={h} ar={TRUCK_COL_AR[h]} stack center />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>
                    <select
                      value={r.truckNo}
                      onChange={(e) => setCell(i, "truckNo", e.target.value)}
                      style={select}
                      disabled={lookupBusy && truckOptions.length === 0}
                    >
                      <option value="">{lookupBusy ? bi("Loading...", "جارٍ التحميل…") : bi("Select...", "اختر…")}</option>
                      {truckOptions.map((no) => (
                        <option key={no} value={no}>
                          {no}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={td}><Select val={r.truckFloor} onChange={(v) => setCell(i, "truckFloor", v)} styleObj={select} /></td>
                  <td style={td}><Select val={r.airCurtain} onChange={(v) => setCell(i, "airCurtain", v)} styleObj={select} /></td>
                  <td style={td}><Select val={r.truckBody} onChange={(v) => setCell(i, "truckBody", v)} styleObj={select} /></td>
                  <td style={td}><Select val={r.truckDoor} onChange={(v) => setCell(i, "truckDoor", v)} styleObj={select} /></td>
                  <td style={td}><Select val={r.railHook} onChange={(v) => setCell(i, "railHook", v)} styleObj={select} /></td>
                  <td style={td}><Select val={r.truckPallets} onChange={(v) => setCell(i, "truckPallets", v)} styleObj={select} /></td>
                  <td style={td}><Select val={r.truckCrates} onChange={(v) => setCell(i, "truckCrates", v)} styleObj={select} /></td>

                  <td style={td}>
                    <input value={r.informedTo} onChange={(e) => setCell(i, "informedTo", e.target.value)} style={input} />
                  </td>
                  <td style={td}>
                    <input value={r.remarks} onChange={(e) => setCell(i, "remarks", e.target.value)} style={input} />
                  </td>

                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {rows.length > 1 && (
                      <button type="button" onClick={() => removeRow(i)} style={btnDanger} title="Delete this row · حذف السطر">
                        🗑 <Bi en="Delete" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== Actions ===== */}
        <div style={{ padding: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={addRow} style={btnGhost}>
            ＋ <Bi en="Add Row" />
          </button>

          <button type="button" onClick={onSave} disabled={saving} style={btnPrimary}>
            {saving ? <Bi en="Saving…" /> : <Bi en="Save Report" />}
          </button>

          <button type="button" onClick={clearAll} style={btnGhost}>
            <Bi en="Clear" />
          </button>
        </div>

        {/* ===== Remarks block ===== */}
        <div style={{ borderTop: "1px solid #e5eaf3", background: "#f8fafc" }}>
          <div style={{ padding: "12px 14px", fontWeight: 900, borderBottom: "1px solid #e5eaf3" }}>
            <Bi en="REMARKS/CORRECTIVE ACTIONS:" ar="الملاحظات / الإجراءات التصحيحية:" />
          </div>

          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={label}><Bi en="Checked By:" /></div>
              <input style={input} value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} />
            </div>
            <div>
              <div style={label}><Bi en="Verified By:" /></div>
              <input style={input} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={label}><Bi en="Chemical used:" /></div>
              <input style={input} value={chemicalUsed} onChange={(e) => setChemicalUsed(e.target.value)} />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={label}><Bi en="Cleaning Procedure:" /></div>
              <textarea
                rows={3}
                style={{ ...input, resize: "vertical" }}
                value={cleaningProcedure}
                onChange={(e) => setCleaningProcedure(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={label}><Bi en="Remark:" /></div>
              <input style={input} value={frequencyRemark} onChange={(e) => setFrequencyRemark(e.target.value)} />
            </div>

            <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 800, color: "#64748b" }}>
              *(C = Conform, N/C = Non-conform) <Bi en="" ar="(C = مطابق · N/C = غير مطابق)" />
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div
          style={msgBox(
            msg.toLowerCase().includes("not in the list") ||
              msg.toLowerCase().includes("duplicated") ||
              msg.toLowerCase().includes("already") ||
              msg.toLowerCase().includes("digits") ||
              msg.toLowerCase().includes("used")
          )}
        >
          {msg}
        </div>
      )}
    </div>
  );
}

function Select({ val, onChange, styleObj }) {
  return (
    <select value={val} onChange={(e) => onChange(e.target.value)} style={styleObj}>
      {STATUS.map((s) => (
        <option key={s} value={s}>
          {bi(s)}
        </option>
      ))}
    </select>
  );
}
