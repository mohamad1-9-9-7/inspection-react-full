// src/pages/monitor/branches/qcs/PersonalHygieneTab.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import {
  getLatestReport,
  getReportRowByDate,
  reportId,
} from "../_shared/reportApi";
import {
  useStaffDirectory,
  normalizeEmpNo,
  normalizeName,
} from "../_shared/staffRegistry";

const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

/* ---- Fallbacks ---- */
const LOGO_FALLBACK = "/brand/al-mawashi.jpg";
const MIN_ROWS_FALLBACK = 21;

const defaultPHHeader = {
  documentTitle: "Personal Hygiene Checklist",
  documentNo: "FS-QM/REC/PH",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH QC",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O. Sarhan",
};

const DEFAULT_SIGN_NAME = "MOHAMAD ABDULLAH";
const defaultPHFooter = {
  checkedBy: DEFAULT_SIGN_NAME,
  verifiedBy: DEFAULT_SIGN_NAME,
};

/* ---- Small UI helpers ---- */
function RowKV({ label, value }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
      <div
        style={{
          padding: "6px 8px",
          borderInlineEnd: "1px solid #000",
          minWidth: 170,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ padding: "6px 8px", flex: 1 }}>{value}</div>
    </div>
  );
}

function PHEntryHeader({ header, date, logoUrl }) {
  const h = header || defaultPHHeader;
  return (
    <div style={{ border: "1px solid #000", marginBottom: 8 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr 1fr",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            borderInlineEnd: "1px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          <img
            src={logoUrl || LOGO_FALLBACK}
            alt="Al Mawashi"
            style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }}
          />
        </div>
        <div style={{ borderInlineEnd: "1px solid #000" }}>
          <RowKV label="Document Title:" value={h.documentTitle} />
          <RowKV label="Issue Date:" value={h.issueDate} />
          <RowKV label="Area:" value={h.area} />
          <RowKV label="Controlling Officer:" value={h.controllingOfficer} />
        </div>
        <div>
          <RowKV label="Document No:" value={h.documentNo} />
          <RowKV label="Revision No:" value={h.revisionNo} />
          <RowKV label="Issued By:" value={h.issuedBy} />
          <RowKV label="Approved By:" value={h.approvedBy} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #000" }}>
        <div
          style={{
            background: "#c0c0c0",
            textAlign: "center",
            fontWeight: 900,
            padding: "6px 8px",
            borderBottom: "1px solid #000",
          }}
        >
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS
        </div>
        <div
          style={{
            background: "#d6d6d6",
            textAlign: "center",
            fontWeight: 900,
            padding: "6px 8px",
            borderBottom: "1px solid #000",
          }}
        >
          PERSONAL HYGIENE CHECKLIST
        </div>
        {date ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px" }}>
            <span style={{ fontWeight: 900, textDecoration: "underline" }}>Date:</span>
            <span>{date}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PHEntryFooter({ footer }) {
  const f = footer || defaultPHFooter;

  const sigCellStyle = {
    padding: "6px 8px",
    flex: 1,
    minHeight: 44,
    display: "flex",
    alignItems: "center",
  };

  return (
    <div style={{ border: "1px solid #000", marginTop: 8 }}>
      <div style={{ padding: "6px 8px", borderBottom: "1px solid #000", fontWeight: 900 }}>
        REMARKS / CORRECTIVE ACTIONS:
      </div>
      <div style={{ padding: "8px", borderBottom: "1px solid #000", minHeight: 40 }}>
        <em>*(C - Conform &nbsp;&nbsp; N/C - Non Conform)</em>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ display: "flex" }}>
          <div
            style={{
              padding: "6px 8px",
              borderInlineEnd: "1px solid #000",
              minWidth: 120,
              fontWeight: 700,
            }}
          >
            Checked By:
          </div>
          <div style={sigCellStyle}>{f.checkedBy || " "}</div>
        </div>
        <div style={{ display: "flex", borderInlineStart: "1px solid #000" }}>
          <div
            style={{
              padding: "6px 8px",
              borderInlineEnd: "1px solid #000",
              minWidth: 120,
              fontWeight: 700,
            }}
          >
            Verified By:
          </div>
          <div style={sigCellStyle}>{f.verifiedBy || " "}</div>
        </div>
      </div>
    </div>
  );
}

function PHHeaderEditor({ header, setHeader, footer, setFooter }) {
  const h = header || defaultPHHeader;
  const f = footer || defaultPHFooter;
  const updateHeader = (k, v) => typeof setHeader === "function" && setHeader({ ...h, [k]: v });
  const updateFooter = (k, v) => typeof setFooter === "function" && setFooter({ ...f, [k]: v });

  const row = { display: "grid", gridTemplateColumns: "160px 1fr", gap: 8, alignItems: "center" };
  const input = { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8 };

  return (
    <details style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 12, margin: "10px 0" }}>
      <summary style={{ cursor: "pointer", fontWeight: 800 }}>⚙️ Edit Header & Footer (Personal Hygiene)</summary>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={row}>
            <span>Document Title</span>
            <input style={input} value={h.documentTitle} onChange={(e) => updateHeader("documentTitle", e.target.value)} />
          </label>
          <label style={row}>
            <span>Issue Date</span>
            <input style={input} value={h.issueDate} onChange={(e) => updateHeader("issueDate", e.target.value)} />
          </label>
          <label style={row}>
            <span>Area</span>
            <input style={input} value={h.area} onChange={(e) => updateHeader("area", e.target.value)} />
          </label>
          <label style={row}>
            <span>Controlling Officer</span>
            <input
              style={input}
              value={h.controllingOfficer}
              onChange={(e) => updateHeader("controllingOfficer", e.target.value)}
            />
          </label>
        </div>

        <div>
          <label style={row}>
            <span>Document No</span>
            <input style={input} value={h.documentNo} onChange={(e) => updateHeader("documentNo", e.target.value)} />
          </label>
          <label style={row}>
            <span>Revision No</span>
            <input style={input} value={h.revisionNo} onChange={(e) => updateHeader("revisionNo", e.target.value)} />
          </label>
          <label style={row}>
            <span>Issued By</span>
            <input style={input} value={h.issuedBy} onChange={(e) => updateHeader("issuedBy", e.target.value)} />
          </label>
          <label style={row}>
            <span>Approved By</span>
            <input style={input} value={h.approvedBy} onChange={(e) => updateHeader("approvedBy", e.target.value)} />
          </label>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <label style={row}>
          <span>Checked By</span>
          <input style={input} value={f.checkedBy} onChange={(e) => updateFooter("checkedBy", e.target.value)} />
        </label>
        <label style={row}>
          <span>Verified By</span>
          <input style={input} value={f.verifiedBy} onChange={(e) => updateFooter("verifiedBy", e.target.value)} />
        </label>
      </div>
    </details>
  );
}

/* ---- Table config ---- */
const COLUMNS = [
  { key: "nails", label: "Nails" },
  { key: "hair", label: "Hair" },
  { key: "notWearingJewelries", label: "Not wearing Jewelry" },
  { key: "wearingCleanCloth", label: "Wearing Clean Cloth / Hair Net / Hand Glove / Face masks / Shoe" },
  { key: "communicableDisease", label: "Communicable Disease" },
  { key: "openWounds", label: "Open wounds/sores & cut" },
];

/* ---- Helpers ---- */
function makeEmptyRow(name = "", employeeNo = "", active = false) {
  const row = { employeeNo, employName: name, remarks: "" };
  COLUMNS.forEach((c) => {
    row[c.key] = active ? "C" : "";
  });
  return row;
}

const isBlankRow = (r) =>
  !String(r?.employName || "").trim() &&
  !String(r?.employeeNo || "").trim() &&
  !String(r?.remarks || "").trim() &&
  COLUMNS.every((c) => !String(r?.[c.key] || "").trim());

/** Rows for the whole staff directory, padded out to `min` blank rows. */
function makeRowsFromStaff(staff, min = MIN_ROWS_FALLBACK) {
  const rows = (Array.isArray(staff) ? staff : []).map((s) => makeEmptyRow(s.name, s.empNo, true));
  while (rows.length < min) rows.push(makeEmptyRow("", "", false));
  return rows;
}

/** Normalises rows coming back from a saved report (older ones have no empNo). */
function adoptRows(raw, min = MIN_ROWS_FALLBACK) {
  const list = Array.isArray(raw) ? raw : [];
  const rows = list.map((r) => {
    const row = makeEmptyRow(
      String(r?.employName ?? r?.employeeName ?? ""),
      String(r?.employeeNo ?? r?.empNo ?? ""),
      false
    );
    COLUMNS.forEach((c) => {
      row[c.key] = String(r?.[c.key] ?? "");
    });
    row.remarks = String(r?.remarks ?? "");
    return row;
  });
  while (rows.length < min) rows.push(makeEmptyRow("", "", false));
  return rows;
}

const th = (w) => ({
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
  fontSize: "0.85rem",
  width: w,
});
const td = () => ({ padding: "6px", border: "1px solid #ccc", textAlign: "center" });
const inp = (w) => ({
  width: w,
  maxWidth: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
});
const sel = (w) => ({
  width: w,
  maxWidth: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  boxSizing: "border-box",
});

/* =========================
   Server helpers (PH only)
========================= */
const PH_TYPE = "qcs-ph";
/* Which Staff Directory assignment fills this sheet. */
const PH_FORM_KEY = "qcs_personal_hygiene";

/* ================================================================== */
/*                        PersonalHygieneTab                           */
/* ================================================================== */
export default function PersonalHygieneTab(props) {
  const {
    reportDate,
    personalHygiene,
    setPersonalHygiene,
    phHeader,
    setPhHeader,
    phFooter,
    setPhFooter,
    minRows = MIN_ROWS_FALLBACK,
    logoUrl,
    onSave,
    saving = false,
  } = props || {};

  const [date, setDate] = useState(() => reportDate || new Date().toISOString().split("T")[0]);

  const useExternalRows = Array.isArray(personalHygiene) && typeof setPersonalHygiene === "function";
  const [localRows, setLocalRows] = useState(() => makeRowsFromStaff([], minRows));
  const rows = useExternalRows ? personalHygiene : localRows;
  const setRows = useExternalRows ? setPersonalHygiene : setLocalRows;

  const useExternalHeader = phHeader && typeof setPhHeader === "function";
  const [localHeader, setLocalHeader] = useState(defaultPHHeader);
  const header = useExternalHeader ? phHeader : localHeader;
  const setHeader = useExternalHeader ? setPhHeader : setLocalHeader;

  const useExternalFooter = phFooter && typeof setPhFooter === "function";
  const [localFooter, setLocalFooter] = useState(defaultPHFooter);
  const footer = useExternalFooter ? phFooter : localFooter;
  const setFooter = useExternalFooter ? setPhFooter : setLocalFooter;

  const [savingLocal, setSavingLocal] = useState(false);
  const [loadingLast, setLoadingLast] = useState(false);
  const [note, setNote] = useState("");

  /* ===== Staff directory (Settings → Staff Directory) =====
     `roster` is only the people assigned to this form, so the daily sheet lists
     exactly who is supposed to be on it. `all` still backs the lookups, so a
     name typed for someone outside the roster is still matched to a number. */
  const { roster: staff, staff: allStaff, loading: staffLoading, byNo, byName } =
    useStaffDirectory(PH_FORM_KEY);

  /* Seed the table from the directory once it arrives — but only while the
     user has not typed anything, so a reload never wipes work in progress. */
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || staffLoading || !staff.length) return;
    const untouched = (Array.isArray(rows) ? rows : []).every(isBlankRow);
    if (!untouched) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    setRows(makeRowsFromStaff(staff, minRows));
    // `rows`/`setRows` deliberately omitted: this must run on directory load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, staffLoading, minRows]);

  const empNoOptions = useMemo(() => allStaff.map((s) => s.empNo), [allStaff]);
  const nameOptions = useMemo(() => allStaff.map((s) => s.name), [allStaff]);

  /* ===== Save ===== */
  async function savePHToServer() {
    if (!date) {
      setNote("⚠️ Pick a report date first.");
      return;
    }
    try {
      setSavingLocal(true);
      setNote("");

      // Targeted lookup — the old version downloaded every PH report ever
      // saved just to find out whether this one date already existed.
      const existing = await getReportRowByDate(PH_TYPE, date);
      const existingId = existing ? reportId(existing) : "";

      const payload = {
        reportDate: date,
        personalHygiene: rows,
        headers: {
          phHeader: header,
          phFooter: footer,
        },
      };

      const body = { reporter: "QCS/PH", type: PH_TYPE, payload };

      const url = existingId
        ? `${API_BASE}/api/reports/${encodeURIComponent(existingId)}`
        : `${API_BASE}/api/reports`;

      const res = await fetch(url, {
        method: existingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: IS_SAME_ORIGIN ? "include" : "omit",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
      }

      setNote(`✅ Personal Hygiene saved for ${date}.`);
    } catch (e) {
      setNote(`❌ Failed to save: ${e.message || e}`);
    } finally {
      setSavingLocal(false);
    }
  }

  /* ===== Load from the last saved report =====
     Brings back the employee list and the checks from the most recent record
     and clears the date, so the user picks the day they are filling in. */
  async function loadFromLast() {
    try {
      setLoadingLast(true);
      setNote("⏳ Loading the last report…");
      const hit = await getLatestReport(PH_TYPE);
      if (!hit) {
        setNote("ℹ️ No previous Personal Hygiene report found.");
        return;
      }
      const p = hit.payload || {};
      setRows(adoptRows(p.personalHygiene, minRows));
      if (p.headers?.phHeader) setHeader({ ...defaultPHHeader, ...p.headers.phHeader });
      if (p.headers?.phFooter) {
        const { checkedBy, verifiedBy } = p.headers.phFooter;
        setFooter({
          checkedBy: checkedBy || defaultPHFooter.checkedBy,
          verifiedBy: verifiedBy || defaultPHFooter.verifiedBy,
        });
      }
      setDate(""); // the day must be chosen deliberately
      seededRef.current = true;
      setNote(`✅ Loaded from ${hit.reportDate}. Pick the date for today's record.`);
    } catch (e) {
      setNote(`❌ Could not load the last report: ${e.message || e}`);
    } finally {
      setLoadingLast(false);
    }
  }

  const addRow = () => setRows((prev) => ([...(Array.isArray(prev) ? prev : []), makeEmptyRow("", "", false)]));
  const removeRow = (i) => setRows((prev) => (Array.isArray(prev) ? prev.filter((_, idx) => idx !== i) : prev));

  /** Repopulate the table from the staff directory. */
  const fillFromDirectory = () => {
    if (!staff.length) {
      setNote(
        allStaff.length
          ? "ℹ️ No employee is assigned to Personal Hygiene yet — tick that form for them in Settings → Staff Directory."
          : "ℹ️ The staff directory is empty — import employees in Settings → Staff Directory."
      );
      return;
    }
    setRows(makeRowsFromStaff(staff, minRows));
    setNote(`✅ Loaded ${staff.length} employees from the directory.`);
  };

  const ensureMin = () => {
    setRows((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];
      while (base.length < (minRows || MIN_ROWS_FALLBACK)) base.push(makeEmptyRow("", "", false));
      return base;
    });
  };

  /** Sets one check column to the same value down the whole active table. */
  const fillColumn = (key, value) => {
    setRows((prev) =>
      (Array.isArray(prev) ? prev : []).map((r) =>
        String(r?.employName || "").trim() || String(r?.employeeNo || "").trim()
          ? { ...r, [key]: value }
          : r
      )
    );
  };

  const fillAllConform = () => {
    setRows((prev) =>
      (Array.isArray(prev) ? prev : []).map((r) => {
        if (!String(r?.employName || "").trim() && !String(r?.employeeNo || "").trim()) return r;
        const next = { ...r };
        COLUMNS.forEach((c) => { next[c.key] = "C"; });
        return next;
      })
    );
  };

  /* Employee number ⇄ name stay matched: filling either side looks the other
     up in the directory, so a number is never paired with the wrong person. */
  const onCellChange = (rowIdx, key, value) => {
    setRows((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];
      const r = base[rowIdx] || makeEmptyRow("", "", false);

      if (key === "employeeNo") {
        const nextNo = String(value || "");
        const match = byNo.get(normalizeEmpNo(nextNo));
        const next = { ...r, employeeNo: nextNo };
        if (match) next.employName = match.name;
        if (nextNo.trim() || String(next.employName || "").trim()) {
          COLUMNS.forEach((c) => {
            if (!String(next[c.key] || "").trim()) next[c.key] = "C";
          });
        }
        base[rowIdx] = next;
        return base;
      }

      if (key === "employName") {
        const nextName = String(value || "");
        const match = byName.get(normalizeName(nextName));
        const next = { ...r, employName: nextName };
        if (match) next.employeeNo = match.empNo;
        if (nextName.trim()) {
          COLUMNS.forEach((c) => {
            if (!String(next[c.key] || "").trim()) next[c.key] = "C";
          });
        }
        base[rowIdx] = next;
        return base;
      }

      base[rowIdx] = { ...r, [key]: value };
      return base;
    });
  };

  const toolbar = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 12,
  };
  const btnBase = {
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 700,
  };
  const btnPrimary = { ...btnBase, background: "#059669", color: "#fff", border: "1px solid transparent" };
  const card = {
    background: "#fff",
    padding: "1rem",
    marginBottom: "1rem",
    borderRadius: 12,
    boxShadow: "0 0 8px rgba(0,0,0,.10)",
  };

  const noteTone = note.startsWith("❌")
    ? { bg: "#fee2e2", fg: "#991b1b" }
    : note.startsWith("✅")
      ? { bg: "#dcfce7", fg: "#166534" }
      : { bg: "#e0f2fe", fg: "#075985" };

  return (
    <div>
      {/* عنوان صغير + تاريخ إدخال داخل التبويب */}
      <div
        style={{
          ...card,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>🧼 Personal Hygiene</h3>
        <label style={{ fontWeight: 700 }}>
          Date:{" "}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: date ? "1px solid #cbd5e1" : "2px solid #f59e0b",
            }}
          />
        </label>
      </div>

      <PHEntryHeader header={header} date={date} logoUrl={logoUrl} />
      <PHHeaderEditor header={header} setHeader={setHeader} footer={footer} setFooter={setFooter} />

      <div style={toolbar}>
        <button onClick={loadFromLast} disabled={loadingLast} style={btnBase}>
          {loadingLast ? "⏳ Loading…" : "📋 Load from last report"}
        </button>
        <button
          onClick={fillFromDirectory}
          style={btnBase}
          title="Employees assigned to Personal Hygiene in Settings → Staff Directory"
        >
          👥 Load roster{staff.length ? ` (${staff.length})` : ""}
        </button>
        <button onClick={fillAllConform} style={btnBase}>
          ✅ Mark all C
        </button>
        <button onClick={ensureMin} style={btnBase}>
          Autofill to {minRows || MIN_ROWS_FALLBACK} rows
        </button>
        <button onClick={addRow} style={btnBase}>
          ➕ Add Row
        </button>
      </div>

      {note ? (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 13,
            background: noteTone.bg,
            color: noteTone.fg,
          }}
        >
          {note}
        </div>
      ) : null}

      {/* Directory-backed suggestions for both employee columns */}
      <datalist id="ph-empno-options">
        {empNoOptions.map((n) => {
          const rec = byNo.get(normalizeEmpNo(n));
          return <option key={n} value={n}>{rec?.name || ""}</option>;
        })}
      </datalist>
      <datalist id="ph-empname-options">
        {nameOptions.map((n) => {
          const rec = byName.get(normalizeName(n));
          return <option key={n} value={n}>{rec?.empNo || ""}</option>;
        })}
      </datalist>

      {/* جدول */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: "#2980b9", color: "#fff" }}>
            <th style={th(50)}>S.No</th>
            <th style={th(110)}>Employee No</th>
            <th style={th(180)}>Employee Name</th>
            {COLUMNS.map((c, i) => (
              <th key={i} style={th(150)}>
                {c.label}
                <div style={{ marginTop: 4, display: "flex", gap: 4, justifyContent: "center" }}>
                  <button
                    type="button"
                    title={`Set every employee to C for "${c.label}"`}
                    onClick={() => fillColumn(c.key, "C")}
                    style={{
                      padding: "1px 7px",
                      fontSize: 11,
                      fontWeight: 800,
                      borderRadius: 6,
                      border: "1px solid #ffffff66",
                      background: "#ffffff22",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    C
                  </button>
                  <button
                    type="button"
                    title={`Clear the "${c.label}" column`}
                    onClick={() => fillColumn(c.key, "")}
                    style={{
                      padding: "1px 7px",
                      fontSize: 11,
                      fontWeight: 800,
                      borderRadius: 6,
                      border: "1px solid #ffffff66",
                      background: "#ffffff22",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    ✖
                  </button>
                </div>
              </th>
            ))}
            <th style={th(240)}>Remarks and Corrective Actions</th>
            <th style={th(70)}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const noVal = String(r?.employeeNo || "");
            const nameVal = String(r?.employName || "");
            const known =
              (noVal.trim() && byNo.has(normalizeEmpNo(noVal))) ||
              (nameVal.trim() && byName.has(normalizeName(nameVal)));
            const unknown = (noVal.trim() || nameVal.trim()) && !known && allStaff.length > 0;

            return (
              <tr key={i}>
                <td style={td()}>{i + 1}</td>

                <td style={td()}>
                  <input
                    list="ph-empno-options"
                    value={noVal}
                    onChange={(e) => onCellChange(i, "employeeNo", e.target.value)}
                    style={{
                      ...inp(110),
                      borderColor: unknown ? "#f59e0b" : "#cbd5e1",
                    }}
                    placeholder="No."
                  />
                </td>

                <td style={td()}>
                  <input
                    list="ph-empname-options"
                    value={nameVal}
                    onChange={(e) => onCellChange(i, "employName", e.target.value)}
                    style={{
                      ...inp(180),
                      borderColor: unknown ? "#f59e0b" : "#cbd5e1",
                    }}
                    title={unknown ? "Not in the staff directory" : ""}
                  />
                </td>

                {/* All other hygiene columns are dropdowns: C / N\C */}
                {COLUMNS.map((c, idx) => (
                  <td key={idx} style={td()}>
                    <select value={r?.[c.key] || ""} onChange={(e) => onCellChange(i, c.key, e.target.value)} style={sel(140)}>
                      <option value=""></option>
                      <option value="C">C</option>
                      <option value={"N\\C"}>N\C</option>
                    </select>
                  </td>
                ))}

                <td style={td()}>
                  <input value={r?.remarks || ""} onChange={(e) => onCellChange(i, "remarks", e.target.value)} style={inp(240)} />
                </td>

                <td style={{ ...td(), textAlign: "center" }}>
                  <button
                    onClick={() => removeRow(i)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #ef4444",
                      color: "#ef4444",
                      background: "#fff",
                    }}
                   data-delete-action="true">
                    ✖
                  </button>
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 5} style={{ ...td(), textAlign: "center", color: "#6b7280" }}>
                No rows yet. Use “Load roster” or “Add Row”.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <PHEntryFooter footer={footer} />

      {/* زر الحفظ — إذا الأب مرّر onSave سنستعمله، وإلا نستعمل الحفظ المحلي للسيرفر الخارجي */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        <button
          onClick={typeof onSave === "function" ? onSave : savePHToServer}
          disabled={saving || savingLocal}
          style={btnPrimary}
        >
          {saving || savingLocal ? "⏳ Saving..." : "💾 Save Personal Hygiene"}
        </button>
      </div>
    </div>
  );
}
