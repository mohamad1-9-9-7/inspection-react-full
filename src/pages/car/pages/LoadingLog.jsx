// src/pages/car/pages/LoadingLog.jsx
import React, { useEffect, useMemo, useState } from "react";
import { IsoShell, ISO_UI } from "../../monitor/branches/_shared/branchViewKit";

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
   DESTINATION (الوجهة) - required dropdown
========================= */
const DESTINATIONS = [
  "ABU DHABI BUTCHERY",
  "AL AIN BUTCHERY",
  "AL BARSHA BUTCHERY",
  "JUBAIL MARKET BUTCHERY",
  "THE MARKET",
  "DUBAI",
  "SHARJAH",
  "AJMAN",
  "RAS AL KHAIMAH",
  "FUJAIRAH",
  "UMM AL QUWAIN",
  "HOME DELIVERY",
];

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
  destination: "DESTINATION",
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
    destination: "",
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
  // Controlled document header — fixed values, not editable by the user
  const header = HEAD_DEFAULT;
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
  // the eight locked document boxes are folded away by default
  const [docOpen, setDocOpen] = useState(false);

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

  /* Adding a vehicle number or a driver name is a CATALOG action: the value is
     saved on the server and appears in every row's dropdown. The buttons sit in
     the document strip above the sheet, not in a row, so the new value is only
     dropped into the first row when that cell is still empty — it must never
     overwrite something already entered. */
  async function addLookupAndSelect(kind, rowIndex = 0) {
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
      const field = isVehicle ? "vehicleNo" : "driverName";
      if (match && !String(rows[rowIndex]?.[field] || "").trim()) setRow(rowIndex, field, match);
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

      // fill the first row only if it is still waiting for one
      const field = isVehicle ? "vehicleNo" : "driverName";
      if (!String(rows[rowIndex]?.[field] || "").trim()) setRow(rowIndex, field, value);

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
      "destination",
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
      ["vehicleNo", "driverName", "destination", "timeStart", "timeEnd", "tempCheck"].forEach((k) => {
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

  /* ═══════════════════════════════════════════════════════════════════════
     Presentation — the sheet stays a TABLE (one row per vehicle, the way the
     paper form and the crew's habit both work), wearing the ISO / HACCP colours
     from branchViewKit.

     What the old table got wrong was not the table: it was squeezing 17 columns
     into the page width with `tableLayout: auto` and no horizontal scroll, so
     every column collapsed to a few pixels. Here the columns keep a real
     minimum width and the sheet scrolls sideways inside its own frame, with the
     head row and the vehicle column pinned so nothing is ever lost.

     The saved payload is untouched, so the reports page and the backups read
     exactly what they always did.
     ═══════════════════════════════════════════════════════════════════════ */

  /* Column headings for the eleven checks, in the sheet's own order. */
  const CHECK_GROUPS = [
    {
      title: "Loading safety",
      items: [
        ["trafficControlSpotter", "TRAFFIC CONTROL /\nSPOTTER USED"],
        ["vehicleSecured", "VEHICLE SECURED\n(HANDBRAKE + CHOCKS)"],
        ["loadSecured", "LOAD SECURED\n(STRAPS + INSPECTION)"],
        ["areaSafe", "AREA SAFE\n(LIGHT / ANTI-SLIP / WALKWAY)"],
        ["manualHandlingControls", "MANUAL HANDLING\nCONTROLS APPLIED"],
      ],
    },
    {
      title: "Vehicle hygiene",
      items: [
        ["floorSealingIntact", "FLOOR SEALING\nINTACT"],
        ["floorCleaning", "FLOOR\nCLEANING"],
        ["pestActivites", "PEST\nACTIVITES"],
        ["plasticCurtain", "PLASTIC CURTAIN\nAVAILABLE / CLEAN"],
        ["badOdour", "BAD\nODOUR"],
        ["ppeAvailable", "PPE\nAVAILABLE"],
      ],
    },
  ];
  const CHECK_COLUMNS = CHECK_GROUPS.flatMap((g) => g.items);

  /* The compliant answer is not always YES — "Pest activities" and "Bad odour"
     are compliant at NO. newRow() already encodes that, so the defaults are the
     single source for it instead of a second list that could drift. */
  const COMPLIANT = useMemo(() => {
    const d = newRow();
    const out = {};
    YESNO_FIELDS.forEach((k) => { out[k] = d[k]; });
    return out;
  }, []);

  const setAllCompliant = (i) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...COMPLIANT } : r)));

  /* Ten trucks a day carry the same checks and destination; only the plate, the
     driver and the clock change. Duplicating a row keeps the answers and clears
     what must be entered fresh. */
  const duplicateRow = (i) =>
    setRows((rs) => {
      const src = rs[i] || newRow();
      const copy = { ...src, vehicleNo: "", driverName: "", timeStart: "", timeEnd: "", tempCheck: "" };
      const n = rs.slice();
      n.splice(i + 1, 0, copy);
      return n;
    });

  const deviations = (r) => YESNO_FIELDS.filter((k) => r[k] !== COMPLIANT[k]).length;

  /* ===== Styles ===== */
  const cardStyle = {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.14)",
    borderRadius: 16,
    boxShadow: "0 12px 32px rgba(2,132,199,0.08)",
    marginBottom: 14,
  };

  const label = { fontSize: 12, fontWeight: 800, color: "#0c4a6e", marginBottom: 5, display: "block" };

  const field = {
    width: "100%",
    padding: "9px 10px",
    minHeight: 40,
    fontSize: 13,
    border: "1.5px solid #cbd5e1",
    borderRadius: 9,
    background: "#fff",
    color: "#0f172a",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
  const fieldBad = { ...field, border: "1.5px solid #ef4444", boxShadow: "0 0 0 3px rgba(239,68,68,.15)" };
  const fieldOf = (i, k) => (isInvalid(i, k) ? fieldBad : field);

  const miniBtn = { ...ISO_UI.btn("secondary"), padding: "6px 12px", fontSize: 12, fontFamily: "inherit" };

  const iconBtn = (extra) => ({
    ...ISO_UI.btn("secondary"),
    width: 34, height: 34, padding: 0,
    borderRadius: 10, fontSize: 14, fontFamily: "inherit",
    ...extra,
  });

  /* the sheet frame: its own scrollport, so the pinned head and first column
     do not depend on the page (globals.css hides overflow-x on #root, which
     would otherwise kill position: sticky) */
  const sheetWrap = {
    overflow: "auto",
    maxHeight: "72vh",
    border: "1px solid rgba(15,23,42,0.14)",
    borderRadius: 14,
    background: "#fff",
  };

  const table = { borderCollapse: "separate", borderSpacing: 0, width: "max-content", minWidth: "100%" };

  const th = (extra) => ({
    ...ISO_UI.thCell,
    position: "sticky",
    top: 34,
    zIndex: 3,
    background: "#0ea5e9",
    padding: "8px 6px",
    fontSize: 10.5,
    lineHeight: 1.25,
    ...extra,
  });

  const thGroup = (bg) => ({
    ...ISO_UI.thCell,
    position: "sticky",
    top: 0,
    zIndex: 4,
    background: bg,
    padding: "6px",
    fontSize: 11,
    letterSpacing: ".5px",
  });

  const td = (extra) => ({
    border: "1px solid #e2e8f0",
    padding: "8px 6px",
    verticalAlign: "middle",
    height: 58,
    background: "#fff",
    ...extra,
  });

  /* the vehicle column stays visible while the checks scroll past it */
  const stickyCol = { position: "sticky", left: 0, zIndex: 2, boxShadow: "2px 0 0 rgba(15,23,42,.06)" };

  const toggle = (on, kind) => ({
    minWidth: 40,
    padding: "6px 9px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 11.5,
    fontFamily: "inherit",
    border: on ? "1.5px solid transparent" : "1.5px solid #cbd5e1",
    background: on
      ? kind === "yes"
        ? "linear-gradient(180deg,#0ea5e9,#0284c7)"
        : "linear-gradient(180deg,#64748b,#475569)"
      : "#fff",
    color: on ? "#fff" : "#64748b",
  });

  return (
    <form onSubmit={handleSave}>
      <IsoShell
        icon="🚚"
        title="Visual Inspection — Outbound Checklist"
        subtitle={`${header.documentNo} · Rev ${header.revisionNo} · ${header.area}`}
        actions={
          <>
            <label style={{ ...ISO_UI.metaBadge, marginBottom: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
              Report date
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                style={{ ...field, minHeight: 34, padding: "6px 10px", width: 168 }}
              />
            </label>
            <button type="button" onClick={addRow} style={ISO_UI.btn("secondary")}>+ Vehicle</button>
            <button type="submit" disabled={busy} style={ISO_UI.btn("success", busy)}>
              {busy ? "Saving…" : "💾 Save report"}
            </button>
          </>
        }
      >
        {/* ── Document control: one strip of badges, expandable.
              It used to be eight locked boxes eating the top third of the page. ── */}
        <div style={{ ...cardStyle, padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={ISO_UI.metaBadge}>📄 {header.documentTitle}</span>
            <span style={ISO_UI.metaBadge}>No. {header.documentNo}</span>
            <span style={ISO_UI.metaBadge}>Rev {header.revisionNo}</span>
            <span style={ISO_UI.metaBadge}>Issued {header.issueDate}</span>
            <button type="button" onClick={() => setDocOpen((v) => !v)} style={miniBtn}>
              {docOpen ? "▴ Hide document control" : "▾ Document control"}
            </button>

            {/* catalog actions — they belong to the sheet, not to one row */}
            <span style={{ width: 1, alignSelf: "stretch", background: "#e2e8f0", margin: "0 2px" }} />
            <button type="button" style={miniBtn} disabled={lookupBusy} onClick={() => addLookupAndSelect("vehicle")}>
              + Add vehicle no.
            </button>
            <button type="button" style={miniBtn} disabled={lookupBusy} onClick={() => addLookupAndSelect("driver")}>
              + Add driver name
            </button>
          </div>

          {docOpen && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
                gap: 10,
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px dashed #cbd5e1",
              }}
            >
              {[
                ["Area", header.area],
                ["Issued by", header.issuedBy],
                ["Controlling officer", header.controllingOfficer],
                ["Approved by", header.approvedBy],
              ].map(([k, v]) => (
                <div key={k}>
                  <span style={label}>{k}</span>
                  <div style={{ ...field, background: "#f1f5f9", fontWeight: 700, display: "flex", alignItems: "center" }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── The sheet ── */}
        <div style={{ ...cardStyle, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ ...ISO_UI.band, margin: 0, flex: 1, minWidth: 220 }}>
              VISUAL INSPECTION (OUTBOUND CHECKLIST)
            </span>
            <span style={{ ...ISO_UI.metaBadge, marginBottom: 0 }}>
              {rows.length} vehicle{rows.length === 1 ? "" : "s"}
            </span>
            <span style={{ ...ISO_UI.metaBadge, marginBottom: 0, color: "#64748b" }}>
              ⇄ scroll sideways for the checks
            </span>
          </div>

          <div style={sheetWrap}>
            <table style={table}>
              <thead>
                {/* grouped band, so eleven look-alike columns read as two families */}
                <tr>
                  <th style={thGroup("#0284c7")} colSpan={3}>VEHICLE</th>
                  <th style={thGroup("#0369a1")} colSpan={3}>TIMES &amp; TEMPERATURE</th>
                  <th style={thGroup("#0891b2")} colSpan={CHECK_GROUPS[0].items.length}>
                    {CHECK_GROUPS[0].title.toUpperCase()}
                  </th>
                  <th style={thGroup("#16a34a")} colSpan={CHECK_GROUPS[1].items.length}>
                    {CHECK_GROUPS[1].title.toUpperCase()}
                  </th>
                  <th style={thGroup("#475569")} colSpan={3}>NOTES</th>
                </tr>
                <tr>
                  <th style={th({ minWidth: 234, left: 0, zIndex: 5 })}>VEHICLE NO</th>
                  <th style={th({ minWidth: 150 })}>DRIVER NAME</th>
                  <th style={th({ minWidth: 140 })}>DESTINATION</th>
                  <th style={th({ minWidth: 110 })}>TIME START</th>
                  <th style={th({ minWidth: 110 })}>TIME END</th>
                  <th style={th({ minWidth: 105 })}>TRUCK{"\n"}TEMPERATURE</th>
                  {CHECK_COLUMNS.map(([k, text]) => (
                    <th key={k} style={th({ minWidth: 104 })}>{text}</th>
                  ))}
                  <th style={th({ minWidth: 130 })}>INFORMED TO{"\n"}(OPTIONAL)</th>
                  <th style={th({ minWidth: 160 })}>REMARKS</th>
                  <th style={th({ minWidth: 132 })}>ROW</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, i) => {
                  const dev = deviations(r);
                  const zebra = i % 2 ? "#f8fafc" : "#fff";
                  return (
                    <tr key={i}>
                      <td style={td({ ...stickyCol, background: zebra })}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span
                            style={{
                              width: 24, height: 24, flex: "0 0 auto", display: "grid", placeItems: "center",
                              borderRadius: 8, background: "linear-gradient(180deg,#0ea5e9,#0284c7)",
                              color: "#fff", fontWeight: 900, fontSize: 11,
                            }}
                          >
                            {i + 1}
                          </span>
                          <select style={fieldOf(i, "vehicleNo")} value={r.vehicleNo} onChange={(e) => setRow(i, "vehicleNo", e.target.value)}>
                            <option value="">Select…</option>
                            {vehicleOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                          {dev > 0 && (
                            <span
                              title={`${dev} answer${dev === 1 ? "" : "s"} away from the compliant one`}
                              style={{
                                flex: "0 0 auto",
                                fontSize: 11, fontWeight: 900, color: "#9a3412",
                                background: "#fff7ed", border: "1px solid #fdba74",
                                borderRadius: 999, padding: "3px 7px",
                              }}
                            >
                              ⚠ {dev}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={td({ background: zebra })}>
                        <select style={fieldOf(i, "driverName")} value={r.driverName} onChange={(e) => setRow(i, "driverName", e.target.value)}>
                          <option value="">Select…</option>
                          {driverOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>

                      <td style={td({ background: zebra })}>
                        <select style={fieldOf(i, "destination")} value={r.destination} onChange={(e) => setRow(i, "destination", e.target.value)}>
                          <option value="">Select…</option>
                          {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>

                      <td style={td({ background: zebra })}>
                        <input type="time" style={fieldOf(i, "timeStart")} value={r.timeStart} onChange={(e) => setRow(i, "timeStart", e.target.value)} />
                      </td>

                      <td style={td({ background: zebra })}>
                        <input type="time" style={fieldOf(i, "timeEnd")} value={r.timeEnd} onChange={(e) => setRow(i, "timeEnd", e.target.value)} />
                      </td>

                      <td style={td({ background: zebra })}>
                        <input
                          type="number"
                          step="0.1"
                          style={fieldOf(i, "tempCheck")}
                          value={r.tempCheck}
                          onChange={(e) => setRow(i, "tempCheck", e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </td>

                      {CHECK_COLUMNS.map(([k]) => {
                        const bad = r[k] !== COMPLIANT[k];
                        return (
                          <td
                            key={k}
                            style={td({
                              background: isInvalid(i, k) ? "#fff1f2" : bad ? "#fff7ed" : zebra,
                              textAlign: "center",
                            })}
                          >
                            <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                              <button type="button" style={toggle(r[k] === "yes", "yes")} onClick={() => setRow(i, k, "yes")}>YES</button>
                              <button type="button" style={toggle(r[k] === "no", "no")} onClick={() => setRow(i, k, "no")}>NO</button>
                            </div>
                          </td>
                        );
                      })}

                      <td style={td({ background: zebra })}>
                        <input style={field} value={r.informedTo} onChange={(e) => setRow(i, "informedTo", e.target.value)} placeholder="Optional" />
                      </td>

                      <td style={td({ background: zebra })}>
                        <input style={field} value={r.remarks} onChange={(e) => setRow(i, "remarks", e.target.value)} />
                      </td>

                      <td style={td({ background: zebra, textAlign: "center" })}>
                        <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                          <button type="button" style={iconBtn()} onClick={() => setAllCompliant(i)} title="Set every check to its compliant answer">
                            ✓
                          </button>
                          <button type="button" style={iconBtn()} onClick={() => duplicateRow(i)} title="Copy this vehicle's checks to a new row">
                            ⧉
                          </button>
                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              style={iconBtn({ color: "#b91c1c", borderColor: "#fecaca", background: "#fef2f2" })}
                              title="Remove this vehicle"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={addRow} style={{ ...ISO_UI.btn("primary"), width: "100%", padding: "11px", marginTop: 10 }}>
            + Add vehicle
          </button>
        </div>

        {/* ── Signatures ── */}
        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
            <div>
              <span style={label}>Inspected by</span>
              <input style={field} value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} />
            </div>
            <div>
              <span style={label}>Verified by</span>
              <input style={field} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Save bar: stays in reach however long the sheet gets ── */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            padding: "10px 14px",
            marginTop: 4,
            borderRadius: 14,
            background: "rgba(255,255,255,0.94)",
            border: "1px solid rgba(15,23,42,0.14)",
            boxShadow: "0 -6px 22px rgba(2,132,199,0.10)",
            backdropFilter: "blur(6px)",
          }}
        >
          {msg && <strong style={{ marginRight: "auto", color: "#0c4a6e", fontSize: 13, whiteSpace: "pre-wrap" }}>{msg}</strong>}
          <button type="submit" disabled={busy} style={ISO_UI.btn("success", busy)}>
            {busy ? "Saving…" : "💾 Save report"}
          </button>
        </div>
      </IsoShell>
    </form>
  );
}
