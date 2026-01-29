// src/pages/car/pages/LoadingLog.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * VISUAL INSPECTION (OUTBOUND CHECKLIST) - English-only
 * - Header kept as-is
 * - Multiple vehicles per single report date (rows you can add/remove)
 * - Saves report to server: POST /api/reports  { reporter, type, payload }
 *
 * Updates:
 * - INFORMED TO is optional (not required)
 * - VEHICLE NO + DRIVER NAME are dropdowns (no duplicates)
 * - Add buttons appear ONLY on first row
 * - New values are saved permanently on server (as lookup types)
 *
 * NEW (Loading/Unloading Safety Controls):
 * - TRAFFIC CONTROL / SPOTTER USED (Yes/No)
 * - VEHICLE SECURED (HANDBRAKE + CHOCKS) (Yes/No)
 * - LOAD SECURED (STRAPS + INSPECTION) (Yes/No)
 * - AREA SAFE (LIGHTING/ANTI-SLIP/WALKWAY CLEAR) (Yes/No)
 * - MANUAL HANDLING CONTROLS APPLIED (Yes/No)
 */

const API_BASE_RAW =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL) ||
  "https://inspection-server-4nvj.onrender.com";

const API_BASE = String(API_BASE_RAW).replace(/\/$/, "");

const TYPE = "cars_loading_inspection";

// Lookup types (saved on server permanently)
const LOOKUP_VEHICLES_TYPE = "cars_loading_lookup_vehicle_numbers";
const LOOKUP_DRIVERS_TYPE = "cars_loading_lookup_driver_names";

async function saveToServer(payload) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "anonymous", type: TYPE, payload }),
  });
  if (!res.ok) throw new Error("Server " + res.status + ": " + (await res.text()));
  return res.json();
}

async function fetchByType(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch ${type}: ${res.status}`);
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : json?.data ?? [];
}

async function saveLookupValue(type, value) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(16).slice(2);

  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reporter: "anonymous",
      type,
      payload: {
        id,
        value,
        createdAt: Date.now(),
      },
    }),
  });

  if (!res.ok) throw new Error("Server " + res.status + ": " + (await res.text()));
  return res.json().catch(() => ({ ok: true }));
}

/* =========================
   YES/NO fields (table)
========================= */
const YESNO_FIELDS = [
  // NEW safety controls
  "trafficControlSpotter",     // Traffic control / spotter used
  "vehicleSecured",            // Handbrake + chocks
  "loadSecured",               // Straps + inspection
  "areaSafe",                  // Lighting/anti-slip/walkway clear
  "manualHandlingControls",    // Lifting aids/team lift/no overload

  // Existing food/vehicle hygiene items (keep as-is)
  "floorSealingIntact",
  "floorCleaning",
  "pestActivites", // keep sheet spelling
  "plasticCurtain",
  "badOdour",
  "ppeAvailable",
];

// INFORMED TO is optional => removed from required validation
const REQUIRED_FIELDS = {
  vehicleNo: "VEHICLE NO",
  driverName: "DRIVER NAME",
  timeStart: "TIME START",
  timeEnd: "TIME END",
  tempCheck: "TRUCK TEMPERATURE",

  // NEW labels
  trafficControlSpotter: "TRAFFIC CONTROL / SPOTTER USED",
  vehicleSecured: "VEHICLE SECURED (HANDBRAKE + CHOCKS)",
  loadSecured: "LOAD SECURED (STRAPS + INSPECTION)",
  areaSafe: "AREA SAFE (LIGHTING/ANTI-SLIP/WALKWAY CLEAR)",
  manualHandlingControls: "MANUAL HANDLING CONTROLS APPLIED",

  // Existing labels
  floorSealingIntact: "FLOOR SEALING INTACT",
  floorCleaning: "FLOOR CLEANING",
  pestActivites: "PEST ACTIVITES",
  plasticCurtain: "PLASTIC CURTAIN AVAILABLE/ CLEANING",
  badOdour: "BAD ODOUR",
  ppeAvailable: "PPE AVAILABLE",
};

const HEAD_DEFAULT = {
  documentTitle: "OUTBOUND CHECKLIST",
  documentNo: "FSM-QM/REC/OCL",
  issueDate: "24/04/2025",
  revisionNo: "1",
  area: "LOGISTIC",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "LOGISTIC MANAGER",
  approvedBy: "ALTAF KHAN",
};

// Default row
function newRow() {
  return {
    vehicleNo: "",
    driverName: "",
    timeStart: "",
    timeEnd: "",
    tempCheck: "",

    // NEW safety controls (defaults)
    trafficControlSpotter: "yes",
    vehicleSecured: "yes",
    loadSecured: "yes",
    areaSafe: "yes",
    manualHandlingControls: "yes",

    // Existing
    floorSealingIntact: "yes",
    floorCleaning: "yes",
    pestActivites: "no",
    plasticCurtain: "yes",
    badOdour: "no",
    ppeAvailable: "yes",

    informedTo: "", // optional
    remarks: "",
  };
}

function normKey(s) {
  return String(s ?? "").trim().toLowerCase();
}

function uniqueSorted(values) {
  const seen = new Set();
  const out = [];
  values
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .forEach((v) => {
      const k = normKey(v);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(v);
      }
    });
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export default function LoadingLog() {
  const [header, setHeader] = useState({ ...HEAD_DEFAULT });
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [inspectedBy, setInspectedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [rows, setRows] = useState([newRow()]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({}); // { [rowIndex]: Set(fieldKeys) }

  // Lookups
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [driverOptions, setDriverOptions] = useState([]);
  const [lookupBusy, setLookupBusy] = useState(false);

  const setHead = (k, v) => setHeader((h) => ({ ...h, [k]: v }));
  const setRow = (i, k, v) =>
    setRows((rs) => {
      const n = rs.slice();
      n[i] = { ...n[i], [k]: v };
      return n;
    });

  const addRow = () => setRows((rs) => [...rs, newRow()]);

  const removeRow = (i) => {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
    setErrors((e) => {
      const ne = { ...e };
      delete ne[i];
      const reindexed = {};
      Object.keys(ne)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((oldIdx, j) => {
          reindexed[j] = ne[oldIdx];
        });
      return reindexed;
    });
  };

  const isInvalid = (i, key) => Boolean(errors[i] && errors[i].has(key));

  // Load lookups once
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLookupBusy(true);
        const [vehArr, drvArr] = await Promise.all([
          fetchByType(LOOKUP_VEHICLES_TYPE),
          fetchByType(LOOKUP_DRIVERS_TYPE),
        ]);

        const vehValues = vehArr.map((x) => x?.payload?.value ?? x?.value ?? "").filter(Boolean);
        const drvValues = drvArr.map((x) => x?.payload?.value ?? x?.value ?? "").filter(Boolean);

        if (!alive) return;
        setVehicleOptions(uniqueSorted(vehValues));
        setDriverOptions(uniqueSorted(drvValues));
      } catch (e) {
        console.warn("Lookup load failed:", e);
      } finally {
        if (alive) setLookupBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function addLookupAndSelect(kind, rowIndex) {
    // Buttons exist only on first row, but keep it safe:
    if (rowIndex !== 0) return;

    const isVehicle = kind === "vehicle";
    const currentList = isVehicle ? vehicleOptions : driverOptions;

    const label = isVehicle ? "Vehicle No" : "Driver Name";
    const raw = window.prompt(`Add new ${label}:`);
    const value = String(raw ?? "").trim();

    if (!value) return;

    // prevent duplicates (case-insensitive)
    const exists = currentList.some((x) => normKey(x) === normKey(value));
    if (exists) {
      setMsg(`${label} already exists.`);
      setTimeout(() => setMsg(""), 2200);
      const match = currentList.find((x) => normKey(x) === normKey(value));
      if (match) setRow(rowIndex, isVehicle ? "vehicleNo" : "driverName", match);
      return;
    }

    try {
      setLookupBusy(true);
      setMsg(`Saving new ${label}...`);
      await saveLookupValue(isVehicle ? LOOKUP_VEHICLES_TYPE : LOOKUP_DRIVERS_TYPE, value);

      // update global options => appears in ALL rows dropdowns automatically
      const next = uniqueSorted([...currentList, value]);
      if (isVehicle) setVehicleOptions(next);
      else setDriverOptions(next);

      // select it in first row (where you added)
      setRow(rowIndex, isVehicle ? "vehicleNo" : "driverName", value);

      setMsg(`${label} saved.`);
      setTimeout(() => setMsg(""), 1800);
    } catch (e) {
      console.error(e);
      setMsg(`Failed to save ${label}.`);
      setTimeout(() => setMsg(""), 2500);
    } finally {
      setLookupBusy(false);
    }
  }

  function validateRows(rawRows) {
    const meaningfulKeys = [
      "vehicleNo",
      "driverName",
      "timeStart",
      "timeEnd",
      "tempCheck",
      "informedTo",
      "remarks",
    ];

    const clean = rawRows.filter((r) =>
      meaningfulKeys.some((k) => String(r?.[k] ?? "").trim())
    );

    const errorMap = {};
    const messages = [];

    clean.forEach((r, idx) => {
      const missing = [];
      const setForRow = new Set();

      // INFORMED TO removed from required
      ["vehicleNo", "driverName", "timeStart", "timeEnd", "tempCheck"].forEach((k) => {
        const val = String(r[k] || "").trim();
        if (!val) {
          missing.push(REQUIRED_FIELDS[k]);
          setForRow.add(k);
        }
      });

      // Validate YES/NO for all yes/no columns
      YESNO_FIELDS.forEach((k) => {
        const val = String(r[k] || "").trim().toLowerCase();
        if (val !== "yes" && val !== "no") {
          missing.push(REQUIRED_FIELDS[k] || k);
          setForRow.add(k);
        }
      });

      if (missing.length) {
        errorMap[idx] = setForRow;
        messages.push("Row " + (idx + 1) + ": " + missing.join(", "));
      }
    });

    return { validCleanRows: clean, errorMap, messages };
  }

  const handleSave = async (e) => {
    e.preventDefault();
    const { validCleanRows, errorMap, messages } = validateRows(rows);

    if (!validCleanRows.length) {
      setErrors(errorMap);
      setMsg("Add at least one vehicle row.");
      setTimeout(() => setMsg(""), 2500);
      return;
    }

    if (Object.keys(errorMap).length) {
      setErrors(errorMap);
      setMsg("Please complete required fields:\n" + messages.join(" | "));
      return;
    }

    try {
      setBusy(true);
      setMsg("Saving to server...");
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

      await saveToServer({
        id,
        createdAt: Date.now(),
        header,
        reportDate,
        inspectedBy,
        verifiedBy,
        rows: validCleanRows,
      });

      setMsg("Saved successfully.");
      setRows([newRow()]);
      setErrors({});
    } catch (err) {
      console.error(err);
      setMsg("Save failed. Please try again.");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  /* ===== Styles ===== */
  const wrapStyle = {
    padding: "32px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f7f9fc",
    color: "#333333",
    minHeight: "100vh",
    boxSizing: "border-box",
    direction: "ltr",
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
    overflow: "hidden",
  };

  const sectionStyle = {
    padding: "16px 24px",
    borderBottom: "1px solid #e0e6ed",
  };

  const grid4Style = {
    display: "grid",
    gridTemplateColumns: "repeat(1, 1fr)",
    gap: "16px",
  };

  const grid2Style = {
    display: "grid",
    gridTemplateColumns: "repeat(1, 1fr)",
    gap: "24px",
  };

  const labelStyle = {
    fontSize: "13px",
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: "4px",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #c0d0e0",
    borderRadius: "8px",
    backgroundColor: "#fefefe",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  const inputInvalid = {
    ...inputStyle,
    border: "1px solid #ef4444",
    boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15)",
  };

  const titleStyle = {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a202c",
    textAlign: "left",
    padding: "8px 0",
    textTransform: "uppercase",
  };

  const tableWrapperStyle = {
    overflowX: "auto",
    padding: "0",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    // widened because we added 5 new Yes/No columns
    minWidth: "1750px",
  };

  const thStyle = {
    backgroundColor: "#f0f2f5",
    padding: "12px 8px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#4a5568",
    textAlign: "left",
    textTransform: "uppercase",
    border: "1px solid #c0d0e0",
  };

  const tdStyle = {
    padding: "10px 8px",
    border: "1px solid #c0d0e0",
    textAlign: "left",
    verticalAlign: "middle",
    boxSizing: "border-box",
  };

  const tdInvalid = {
    ...tdStyle,
    backgroundColor: "#fff1f2",
    border: "1px solid #ef4444",
  };

  const radioGroupStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
  };

  const radioLabelStyle = {
    fontSize: "13px",
    color: "#4a5568",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };

  const buttonStyle = {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    transition: "background-color 0.2s, box-shadow 0.2s",
  };

  const addButton = {
    ...buttonStyle,
    backgroundColor: "#e2e8f0",
    color: "#4a5568",
    border: "1px solid #cbd5e1",
  };

  const saveButton = {
    ...buttonStyle,
    backgroundColor: busy ? "#87b6f5" : "#4a90e2",
    color: "#ffffff",
    border: "1px solid #4a90e2",
    cursor: busy ? "not-allowed" : "pointer",
  };

  const removeBtnStyle = {
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#e53e3e",
    fontSize: "16px",
    padding: "0 6px",
  };

  const toolbarStyle = {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
    padding: "16px 24px",
  };

  const responsiveGrid4 =
    typeof window !== "undefined" && window.innerWidth <= 768
      ? grid4Style
      : { ...grid4Style, gridTemplateColumns: "repeat(4, 1fr)" };

  const responsiveGrid2 =
    typeof window !== "undefined" && window.innerWidth <= 768
      ? grid2Style
      : { ...grid2Style, gridTemplateColumns: "repeat(2, 1fr)" };

  const miniAddBtn = useMemo(
    () => ({
      ...buttonStyle,
      padding: "8px 10px",
      fontSize: "12px",
      backgroundColor: lookupBusy ? "#cbd5e1" : "#edf2f7",
      color: "#2d3748",
      border: "1px solid #cbd5e1",
      cursor: lookupBusy ? "not-allowed" : "pointer",
      width: "100%",
    }),
    [lookupBusy]
  );

  // For headers: custom order (new fields first, then old YESNO_FIELDS)
  const NEW_YESNO_ORDER = [
    "trafficControlSpotter",
    "vehicleSecured",
    "loadSecured",
    "areaSafe",
    "manualHandlingControls",
  ];

  const OLD_YESNO_ORDER = [
    "floorSealingIntact",
    "floorCleaning",
    "pestActivites",
    "plasticCurtain",
    "badOdour",
    "ppeAvailable",
  ];

  const YESNO_RENDER_ORDER = [...NEW_YESNO_ORDER, ...OLD_YESNO_ORDER];

  return (
    <form onSubmit={handleSave} style={wrapStyle}>
      <div style={cardStyle}>
        {/* Header row 1 & 2 */}
        <div style={{ ...sectionStyle, backgroundColor: "#f0f2f5" }}>
          <div style={responsiveGrid4}>
            <div>
              <label style={labelStyle}>Document Title:</label>
              <input
                style={inputStyle}
                value={header.documentTitle}
                onChange={(e) => setHead("documentTitle", e.target.value)}
                aria-required="true"
              />
            </div>
            <div>
              <label style={labelStyle}>Document No.:</label>
              <input
                style={inputStyle}
                value={header.documentNo}
                onChange={(e) => setHead("documentNo", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Issue Date:</label>
              <input
                style={inputStyle}
                placeholder="DD/MM/YYYY"
                value={header.issueDate}
                onChange={(e) => setHead("issueDate", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Revision No.:</label>
              <input
                style={inputStyle}
                value={header.revisionNo}
                onChange={(e) => setHead("revisionNo", e.target.value)}
              />
            </div>
          </div>
          <div style={{ ...responsiveGrid4, marginTop: "16px" }}>
            <div>
              <label style={labelStyle}>Area:</label>
              <input style={inputStyle} value={header.area} onChange={(e) => setHead("area", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Issued By:</label>
              <input style={inputStyle} value={header.issuedBy} onChange={(e) => setHead("issuedBy", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Controlling Officer:</label>
              <input
                style={inputStyle}
                value={header.controllingOfficer}
                onChange={(e) => setHead("controllingOfficer", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Approved By:</label>
              <input style={inputStyle} value={header.approvedBy} onChange={(e) => setHead("approvedBy", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Title + Report date */}
        <div
          style={{
            ...sectionStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={titleStyle}>VISUAL INSPECTION (OUTBOUND CHECKLIST)</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={labelStyle}>Report Date:</label>
            <input
              type="date"
              style={{ ...inputStyle, width: "auto" }}
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {[
                  "VEHICLE NO",
                  "DRIVER NAME",
                  "TIME START",
                  "TIME END",
                  "TRUCK TEMPERATURE",

                  // NEW columns
                  "TRAFFIC CONTROL / SPOTTER USED",
                  "VEHICLE SECURED (HANDBRAKE + CHOCKS)",
                  "LOAD SECURED (STRAPS + INSPECTION)",
                  "AREA SAFE (LIGHTING/ANTI-SLIP/WALKWAY CLEAR)",
                  "MANUAL HANDLING CONTROLS APPLIED",

                  // Existing
                  "FLOOR SEALING INTACT",
                  "FLOOR CLEANING",
                  "PEST ACTIVITES",
                  "PLASTIC CURTAIN AVAILABLE/ CLEANING",
                  "BAD ODOUR",
                  "PPE AVAILABLE",

                  "INFORMED TO (OPTIONAL)",
                  "REMARKS",
                ].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
                <th style={thStyle}></th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {/* VEHICLE NO (dropdown + add only on first row) */}
                  <td style={isInvalid(i, "vehicleNo") ? tdInvalid : tdStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <select
                        style={isInvalid(i, "vehicleNo") ? inputInvalid : inputStyle}
                        value={r.vehicleNo}
                        onChange={(e) => setRow(i, "vehicleNo", e.target.value)}
                      >
                        <option value="">Select...</option>
                        {vehicleOptions.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>

                      {i === 0 && (
                        <button
                          type="button"
                          style={miniAddBtn}
                          disabled={lookupBusy}
                          onClick={() => addLookupAndSelect("vehicle", 0)}
                          title="Add new vehicle number"
                        >
                          + Add Vehicle No
                        </button>
                      )}
                    </div>
                  </td>

                  {/* DRIVER NAME (dropdown + add only on first row) */}
                  <td style={isInvalid(i, "driverName") ? tdInvalid : tdStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <select
                        style={isInvalid(i, "driverName") ? inputInvalid : inputStyle}
                        value={r.driverName}
                        onChange={(e) => setRow(i, "driverName", e.target.value)}
                      >
                        <option value="">Select...</option>
                        {driverOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>

                      {i === 0 && (
                        <button
                          type="button"
                          style={miniAddBtn}
                          disabled={lookupBusy}
                          onClick={() => addLookupAndSelect("driver", 0)}
                          title="Add new driver name"
                        >
                          + Add Driver Name
                        </button>
                      )}
                    </div>
                  </td>

                  <td style={isInvalid(i, "timeStart") ? tdInvalid : tdStyle}>
                    <input
                      type="time"
                      style={isInvalid(i, "timeStart") ? inputInvalid : inputStyle}
                      value={r.timeStart}
                      onChange={(e) => setRow(i, "timeStart", e.target.value)}
                    />
                  </td>

                  <td style={isInvalid(i, "timeEnd") ? tdInvalid : tdStyle}>
                    <input
                      type="time"
                      style={isInvalid(i, "timeEnd") ? inputInvalid : inputStyle}
                      value={r.timeEnd}
                      onChange={(e) => setRow(i, "timeEnd", e.target.value)}
                    />
                  </td>

                  <td style={isInvalid(i, "tempCheck") ? tdInvalid : tdStyle}>
                    <input
                      type="number"
                      step="0.1"
                      style={isInvalid(i, "tempCheck") ? inputInvalid : inputStyle}
                      value={r.tempCheck}
                      onChange={(e) => setRow(i, "tempCheck", e.target.value)}
                    />
                  </td>

                  {/* Yes/No fields in chosen order */}
                  {YESNO_RENDER_ORDER.map((k) => (
                    <td key={k} style={isInvalid(i, k) ? tdInvalid : tdStyle}>
                      <div style={radioGroupStyle}>
                        <label style={radioLabelStyle}>
                          <input
                            type="radio"
                            name={k + "-" + i}
                            checked={r[k] === "yes"}
                            onChange={() => setRow(i, k, "yes")}
                            style={{ outline: "none" }}
                          />
                          YES
                        </label>
                        <label style={radioLabelStyle}>
                          <input
                            type="radio"
                            name={k + "-" + i}
                            checked={r[k] === "no"}
                            onChange={() => setRow(i, k, "no")}
                            style={{ outline: "none" }}
                          />
                          NO
                        </label>
                      </div>
                    </td>
                  ))}

                  {/* INFORMED TO (optional) */}
                  <td style={tdStyle}>
                    <input
                      style={inputStyle}
                      value={r.informedTo}
                      onChange={(e) => setRow(i, "informedTo", e.target.value)}
                      placeholder="Optional"
                    />
                  </td>

                  <td style={tdStyle}>
                    <input
                      style={inputStyle}
                      value={r.remarks}
                      onChange={(e) => setRow(i, "remarks", e.target.value)}
                    />
                  </td>

                  <td style={tdStyle}>
                    {rows.length > 1 && (
                      <button type="button" onClick={() => removeRow(i)} style={removeBtnStyle} title="Remove row">
                        X
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div style={sectionStyle}>
          <div style={responsiveGrid2}>
            <div>
              <label style={labelStyle}>INSPECTED BY:</label>
              <input style={inputStyle} value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>VERIFIED BY:</label>
              <input style={inputStyle} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={toolbarStyle}>
          <button type="button" onClick={addRow} style={addButton}>
            + Add Vehicle
          </button>
          <button type="submit" disabled={busy} style={saveButton}>
            {busy ? "Saving..." : "Save Report"}
          </button>
          {msg && (
            <strong style={{ marginLeft: "12px", color: "#4a5568", fontSize: "14px", whiteSpace: "pre-wrap" }}>
              {msg}
            </strong>
          )}
        </div>
      </div>
    </form>
  );
}
