// src/pages/shared/ReturnNoteImport.jsx
//
// Import a return note that was READ SOMEWHERE ELSE.
//
// The camera scanner in this same folder reads the paper here, in the browser,
// with an OCR engine that has to fight a phone photo. It is good, and on a
// clean note it is right - but a photographed form has failure modes no amount
// of image work removes, and the worst of them are SILENT: a weights column
// printed a little out of line with its product names can hand every row the
// weight of the row below it, and nothing on screen looks wrong.
//
// So this is the other door into the same report: the note is read away from
// the app - by a person, or by a stronger reader - and arrives as a small file
// of plain values. What comes in is already text, so there is nothing left to
// misread; what remains is checking it against our own catalog and branch list
// and letting someone correct it before it becomes rows.
//
// The file is deliberately forgiving about its shape (see `parseFile`): one
// note or many, a wrapper object or a bare list, and the obvious spellings of
// every field name. It is NOT forgiving about what it does with the values -
// every code is matched against the catalog, every branch against the branch
// list, every date and weight normalised, and anything it could not place is
// shown in amber rather than quietly dropped.
//
// Deliberately not supported: images inside the file. Photos belong in
// Cloudinary through the row's own image button, never in a payload.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PURPLE = "#512e5f";
const ACCENT = "#884ea0";

/* ================= reading the file ================= */

/* Field names people (and I) actually write. The first hit wins, so the
   canonical name is listed first in each row. */
const ALIASES = {
  code: ["code", "itemcode", "item_code", "item", "sku"],
  name: ["name", "description", "productname", "product", "desc"],
  qty: ["qty", "quantity", "ordered", "weight", "kg", "delivered"],
  unit: ["unit", "uom", "qtytype", "measure"],
  expiry: ["expiry", "expirydate", "expiration", "bestbefore", "best_before", "exp"],
  remarks: ["remarks", "remark", "reason", "note", "notes"],
  action: ["action", "disposition"],
  origin: ["origin", "country"],
  branch: ["branch", "butchery", "from", "source", "location", "pos", "store"],
  transferNo: [
    "transferno",
    "transfer",
    "transfernumber",
    "transfer_no",
    "doc",
    "docno",
    "reference",
    "ref",
  ],
};

const key = (s) => String(s || "").toLowerCase().replace(/[^a-z_]/g, "");

/** First present alias of `field` on `obj`, as a trimmed string. */
function pick(obj, field) {
  if (!obj || typeof obj !== "object") return "";
  const want = ALIASES[field] || [field];
  const flat = new Map();
  Object.keys(obj).forEach((k) => {
    const kk = key(k);
    if (!flat.has(kk)) flat.set(kk, obj[k]);
  });
  for (const a of want) {
    const v = flat.get(a);
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/**
 * Everything this accepts, in one place:
 *
 *   { notes: [ { branch, transferNo, rows: [ {code, qty, …} ] } ] }
 *   { branch, transferNo, rows: [ … ] }          one note, no wrapper
 *   { entries: [ … ] } / { rows: [ … ] }         flat, branch on each row
 *   [ … ]                                        a bare list of rows
 *
 * A flat list still becomes notes: consecutive rows sharing a branch and a
 * transfer number are one paper, which is what the preview groups by and what
 * the report's own "one transfer number per branch" rule expects.
 */
function parseFile(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error("This is not a valid JSON file - " + e.message);
  }
  if (!data || (typeof data !== "object" && !Array.isArray(data))) {
    throw new Error("The file has no data in it.");
  }

  const asRows = (list, inherit) =>
    (Array.isArray(list) ? list : [])
      .filter((r) => r && typeof r === "object")
      .map((r) => ({
        code: pick(r, "code"),
        name: pick(r, "name"),
        qty: pick(r, "qty"),
        unit: pick(r, "unit"),
        expiry: pick(r, "expiry"),
        remarks: pick(r, "remarks"),
        action: pick(r, "action"),
        origin: pick(r, "origin"),
        branch: pick(r, "branch") || inherit.branch,
        transferNo: pick(r, "transferNo") || inherit.transferNo,
      }));

  let notes = [];
  if (Array.isArray(data)) {
    notes = [{ branch: "", transferNo: "", rows: asRows(data, {}) }];
  } else if (Array.isArray(data.notes)) {
    notes = data.notes
      .filter((n) => n && typeof n === "object")
      .map((n) => {
        const head = { branch: pick(n, "branch"), transferNo: pick(n, "transferNo") };
        return { ...head, rows: asRows(n.rows || n.items || n.lines || n.entries, head) };
      });
  } else {
    const head = { branch: pick(data, "branch"), transferNo: pick(data, "transferNo") };
    const list = data.rows || data.entries || data.items || data.lines;
    notes = [{ ...head, rows: asRows(list, head) }];
  }

  // split a flat list into papers, so each keeps its own branch header
  const out = [];
  notes.forEach((n) => {
    if (n.branch || n.rows.every((r) => !r.branch)) {
      out.push(n);
      return;
    }
    let cur = null;
    n.rows.forEach((r) => {
      const k = `${r.branch}|${r.transferNo}`;
      if (!cur || cur.k !== k) {
        cur = { k, branch: r.branch, transferNo: r.transferNo, rows: [] };
        out.push(cur);
      }
      cur.rows.push(r);
    });
  });

  const total = out.reduce((s, n) => s + n.rows.length, 0);
  if (!total) throw new Error("The file has no rows in it.");
  return { notes: out, date: pick(data, "date") || "" };
}

/* ================= normalising the values ================= */

const digitsOf = (s) => String(s || "").replace(/[^0-9]/g, "");

/**
 * A weight as the report stores it.
 * A lone comma is a decimal point (1,68); a comma with a point beside it is a
 * thousands separator (1,234.50) and goes.
 */
function normQty(raw) {
  let s = String(raw || "").trim();
  if (!s) return { qty: "", bad: false };
  s = s.replace(/[^\d.,-]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  if (!s || !/^-?\d*\.?\d+$/.test(s)) return { qty: String(raw).trim(), bad: true };
  return { qty: s, bad: false };
}

/** The report's expiry cell is <input type="date">, so it wants YYYY-MM-DD. */
function normDate(raw) {
  const s = String(raw || "").trim();
  if (!s) return { date: "", bad: false };
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  let y;
  let m;
  let d;
  if (iso) [, y, m, d] = iso;
  else if (dmy) {
    [, d, m, y] = dmy;
    if (String(y).length === 2) y = `20${y}`;
  } else return { date: "", bad: true };
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  if (
    dt.getFullYear() !== Number(y) ||
    dt.getMonth() !== Number(m) - 1 ||
    dt.getDate() !== Number(d)
  ) {
    return { date: "", bad: true };
  }
  const p = (v) => String(v).padStart(2, "0");
  return { date: `${y}-${p(m)}-${p(d)}`, bad: false };
}

/**
 * Branch names are matched space-blind and case-blind, because a note written
 * by hand says "pos47" for what our list calls "POS 47" - and one of our own
 * branches really is spelled "W K C".
 */
function normBranch(raw, branches) {
  const s = String(raw || "").trim();
  if (!s) return { branch: "", known: false };
  const flat = (v) => String(v).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const want = flat(s);
  const hit = branches.find((b) => flat(b) === want);
  return { branch: hit || s, known: !!hit };
}

/* ================= the modal ================= */

/**
 * @param {object[]} branches   the report's branch list (without "Other")
 * @param {Map}      catalog    digits-only item code -> catalog item
 * @param {function} onApply    ({entries}) - the same payload the scanner sends
 */
export default function ReturnNoteImport({ open, onClose, branches = [], catalog = new Map(), onApply }) {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [showSpec, setShowSpec] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setText("");
    setNotes([]);
    setError("");
    setFileName("");
  }, [open]);

  /* One place where raw text becomes a draft, so the file button, the paste
     box and a drop all land in exactly the same state. */
  const load = useCallback(
    (raw, name = "") => {
      setFileName(name);
      if (!String(raw || "").trim()) {
        setNotes([]);
        setError("");
        return;
      }
      try {
        const parsed = parseFile(raw);
        let n = 0;
        setNotes(
          parsed.notes.map((note) => {
            const b = normBranch(note.branch, branches);
            return {
              id: `n${n++}`,
              branch: b.branch,
              branchKnown: b.known,
              transferNo: note.transferNo,
              rows: note.rows.map((r) => {
                const q = normQty(r.qty);
                const e = normDate(r.expiry);
                return {
                  key: `r${n}_${Math.random().toString(36).slice(2, 8)}`,
                  code: digitsOf(r.code) || String(r.code || "").trim(),
                  name: r.name,
                  qty: q.qty,
                  qtyBad: q.bad,
                  unit: r.unit,
                  expiry: e.date,
                  expiryBad: e.bad,
                  expiryRaw: r.expiry,
                  remarks: r.remarks,
                  action: r.action,
                  origin: r.origin,
                };
              }),
            };
          })
        );
        setError("");
      } catch (err) {
        setNotes([]);
        setError(err.message || String(err));
      }
    },
    [branches]
  );

  const onFile = async (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("That file is far too big for a note - 4 MB is the limit.");
      return;
    }
    try {
      const raw = await file.text();
      setText(raw);
      load(raw, file.name);
    } catch {
      setError("The file could not be read.");
    }
  };

  const patchNote = (id, patch) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  const patchRow = (id, k, patch) =>
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, rows: n.rows.map((r) => (r.key === k ? { ...r, ...patch } : r)) }
          : n
      )
    );

  const dropRow = (id, k) =>
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, rows: n.rows.filter((r) => r.key !== k) } : n))
    );

  /* What the preview shows and what apply() sends have to be the same list,
     so both read it from here. A row with no code at all is not a row - it can
     be typed in the report - so it is counted but never sent. */
  const stats = useMemo(() => {
    let rows = 0;
    let noCode = 0;
    let unknown = 0;
    let noQty = 0;
    let badBranch = 0;
    notes.forEach((n) => {
      if (n.branch && !branches.includes(n.branch)) badBranch++;
      n.rows.forEach((r) => {
        rows++;
        const d = digitsOf(r.code);
        if (!d) noCode++;
        else if (!catalog.has(d)) unknown++;
        if (!r.qty) noQty++;
      });
    });
    return { rows, noCode, unknown, noQty, badBranch, ready: rows - noCode };
  }, [notes, branches, catalog]);

  const apply = () => {
    const entries = [];
    notes.forEach((n) => {
      n.rows.forEach((r) => {
        if (!digitsOf(r.code)) return;
        entries.push({
          code: r.code,
          branch: n.branch,
          transferNo: n.transferNo,
          // `ordered` is what the scanner sends and what the paper's column is
          // called; the report puts it in QUANTITY either way
          ordered: r.qty,
          quantity: r.qty,
          unit: r.unit,
          expiry: r.expiry,
          remarks: r.remarks,
          action: r.action,
          origin: r.origin,
        });
      });
    });
    if (!entries.length) return;
    onApply({ entries });
    onClose();
  };

  if (!open) return null;

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <span style={{ fontSize: "1.15em", fontWeight: "bold" }}>📥 Import a read note</span>
          <button onClick={onClose} style={{ ...miniBtn, marginLeft: "auto" }}>
            ✕ Close
          </button>
        </div>

        <div style={{ padding: 14, overflow: "auto" }}>
          {/* ---- where the file comes in ---- */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files && e.dataTransfer.files[0]);
            }}
            style={dropZone}
          >
            <div style={{ fontWeight: "bold", color: PURPLE }}>
              Drop the file here, or
              <button style={{ ...miniBtn, margin: "0 6px" }} onClick={() => fileRef.current?.click()}>
                choose a file
              </button>
              {fileName && <span style={{ color: "#777", fontWeight: "normal" }}>— {fileName}</span>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.txt,application/json,text/plain"
              style={{ display: "none" }}
              onChange={(e) => {
                onFile(e.target.files && e.target.files[0]);
                e.target.value = "";
              }}
            />
            <div style={{ color: "#777", fontSize: ".88em", marginTop: 6 }}>
              …or paste the note text straight into the box below.
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              load(e.target.value, "");
            }}
            placeholder={'{ "branch": "POS 47", "transferNo": "00167", "rows": [ { "code": "27119", "qty": "1.68" } ] }'}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 110,
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #d9c7e4",
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              fontSize: ".85em",
              resize: "vertical",
            }}
          />

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
            <button style={miniBtn} onClick={() => setShowSpec((v) => !v)}>
              {showSpec ? "Hide the format" : "What should the file look like?"}
            </button>
            <button
              style={miniBtn}
              onClick={() => {
                setText(SAMPLE);
                load(SAMPLE, "");
              }}
            >
              Load an example
            </button>
            {(text || notes.length) && (
              <button
                style={miniBtn}
                onClick={() => {
                  setText("");
                  setNotes([]);
                  setError("");
                  setFileName("");
                }}
              >
                Clear
              </button>
            )}
          </div>

          {showSpec && (
            <pre style={specBox}>{SPEC}</pre>
          )}

          {error && (
            <div style={{ ...notice, background: "#fdecea", borderColor: "#e6b0aa", color: "#922b21" }}>
              {error}
            </div>
          )}

          {/* ---- what came out of it ---- */}
          {!!notes.length && (
            <>
              <div style={{ ...notice, background: "#eafaf1", borderColor: "#a9dfbf", color: "#1e6b40" }}>
                <b>{stats.ready}</b> row(s) ready from <b>{notes.length}</b> note(s).
                {stats.noCode > 0 && ` ${stats.noCode} row(s) have no item code and will be left out.`}
                {stats.unknown > 0 && ` ${stats.unknown} code(s) are not in the catalog - check them below.`}
                {stats.noQty > 0 && ` ${stats.noQty} row(s) have no weight.`}
                {stats.badBranch > 0 && " A branch name did not match our list - it will be filed as “Other branch”."}
              </div>

              {notes.map((n) => (
                <div key={n.id} style={noteCard}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: 10 }}>
                    <label style={{ fontWeight: "bold", color: PURPLE }}>Branch</label>
                    <select
                      value={branches.includes(n.branch) ? n.branch : ""}
                      onChange={(e) => patchNote(n.id, { branch: e.target.value, branchKnown: true })}
                      style={{ ...field, minWidth: 130 }}
                    >
                      <option value="">
                        {n.branch ? `${n.branch} (not in the list)` : "— pick a branch —"}
                      </option>
                      {branches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <label style={{ fontWeight: "bold", color: PURPLE }}>Transfer no.</label>
                    <input
                      value={n.transferNo}
                      onChange={(e) => patchNote(n.id, { transferNo: e.target.value })}
                      style={{ ...field, width: 110 }}
                      placeholder="00167"
                    />
                    <span style={{ marginLeft: "auto", color: "#777", fontSize: ".88em" }}>
                      {n.rows.length} row(s)
                    </span>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9em" }}>
                    <thead>
                      <tr style={{ background: "#f4ecf7", color: PURPLE }}>
                        <th style={th}>#</th>
                        <th style={th}>Item code</th>
                        <th style={th}>Catalog name</th>
                        <th style={th}>Weight</th>
                        <th style={th}>Expiry</th>
                        <th style={th}>Remarks</th>
                        <th style={th} />
                      </tr>
                    </thead>
                    <tbody>
                      {n.rows.map((r, i) => {
                        const d = digitsOf(r.code);
                        const hit = d ? catalog.get(d) : null;
                        return (
                          <tr key={r.key}>
                            <td style={{ ...td, color: "#999" }}>{i + 1}</td>
                            <td style={td}>
                              <input
                                value={r.code}
                                onChange={(e) => patchRow(n.id, r.key, { code: e.target.value })}
                                style={{
                                  ...field,
                                  width: 86,
                                  borderColor: !d ? "#e6b0aa" : hit ? "#a9dfbf" : "#e0c07a",
                                }}
                              />
                            </td>
                            <td style={{ ...td, color: hit ? "#2c3e50" : "#b9770e" }}>
                              {hit ? hit.description : r.name ? `${r.name} — not in catalog` : "not in catalog"}
                            </td>
                            <td style={td}>
                              <input
                                value={r.qty}
                                onChange={(e) => patchRow(n.id, r.key, { qty: e.target.value, qtyBad: false })}
                                inputMode="decimal"
                                placeholder="— — —"
                                style={{
                                  ...field,
                                  width: 76,
                                  borderColor: r.qtyBad ? "#e6b0aa" : r.qty ? "#d9c7e4" : "#e0c07a",
                                }}
                              />
                            </td>
                            <td style={td}>
                              <input
                                type="date"
                                value={r.expiry}
                                onChange={(e) => patchRow(n.id, r.key, { expiry: e.target.value, expiryBad: false })}
                                style={{ ...field, width: 140, borderColor: r.expiryBad ? "#e6b0aa" : "#d9c7e4" }}
                                title={r.expiryBad ? `Could not read "${r.expiryRaw}" as a date` : ""}
                              />
                            </td>
                            <td style={td}>
                              <input
                                value={r.remarks}
                                onChange={(e) => patchRow(n.id, r.key, { remarks: e.target.value })}
                                style={{ ...field, width: 150 }}
                              />
                            </td>
                            <td style={td}>
                              <button
                                onClick={() => dropRow(n.id, r.key)}
                                style={{ ...miniBtn, color: "#922b21" }}
                                title="Leave this line out"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={foot}>
          <button onClick={onClose} style={miniBtn}>
            Cancel
          </button>
          <button
            onClick={apply}
            disabled={!stats.ready}
            style={{
              ...miniBtn,
              background: stats.ready ? "#1e8449" : "#ccc",
              color: "#fff",
              fontWeight: "bold",
              padding: "9px 18px",
            }}
          >
            Add {stats.ready} row(s) to the report
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= the format, written where it is used ================= */

const SPEC = `A plain JSON file. One note:

{
  "date": "2026-09-04",
  "branch": "POS 47",
  "transferNo": "00167",
  "rows": [
    { "code": "27119", "qty": "1.68", "expiry": "10/09/2026", "remarks": "EXPIRED" },
    { "code": "20026", "qty": "12.40" }
  ]
}

Several notes in one file:

{ "date": "2026-09-04", "notes": [ { "branch": "POS 10", "transferNo": "01689", "rows": [ ... ] },
                                   { "branch": "POS 6",  "transferNo": "00678", "rows": [ ... ] } ] }

Only "code" is required on a row. Everything else is optional and can be
filled in the report afterwards:

  code      the item code as printed on the note, e.g. "27119" or "[27119]"
  qty       the weight - "1.68" or "1,68"; the report calls this QUANTITY
  unit      KG / PCS / PLATE (taken from the catalog when left out)
  expiry    2026-09-10 or 10/09/2026
  remarks   EXPIRED, BAD SMELL, DAMAGE, NEAR EXP, CRITICAL (comma separated)
  action    one of the report's actions; anything else lands as "Other..."
  name      only used to show you which product a code did not match

Branch names are matched loosely: "pos47", "POS-47" and "POS 47" all find
POS 47. A name that matches nothing is filed as "Other branch" and kept.

Photos never go in this file - add them from the row's own image button.`;

const SAMPLE = `{
  "date": "2026-09-04",
  "notes": [
    {
      "branch": "POS 47",
      "transferNo": "00167",
      "rows": [
        { "code": "27119", "qty": "1.68", "expiry": "10/09/2026", "remarks": "EXPIRED" },
        { "code": "20026", "qty": "12.40" },
        { "code": "34346", "qty": "0.75", "remarks": "NEAR EXP" }
      ]
    }
  ]
}`;

/* ================= styles ================= */

const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(30,10,40,.45)",
  zIndex: 4000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 14,
};

const sheet = {
  background: "#fff",
  borderRadius: 16,
  width: "min(1000px, 100%)",
  maxHeight: "92vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 18px 50px rgba(0,0,0,.3)",
  overflow: "hidden",
};

const head = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  background: `linear-gradient(135deg, ${PURPLE}, ${ACCENT})`,
  color: "#fff",
};

const foot = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  padding: "10px 14px",
  borderTop: "1px solid #eee",
  background: "#fcfaff",
};

const miniBtn = {
  border: "1px solid #d9c7e4",
  background: "#f4ecf7",
  color: PURPLE,
  borderRadius: 9,
  padding: "6px 12px",
  cursor: "pointer",
  fontWeight: "bold",
};

const dropZone = {
  border: "2px dashed #d9c7e4",
  borderRadius: 12,
  padding: 14,
  background: "#fcfaff",
  textAlign: "center",
};

const notice = {
  border: "1px solid",
  borderRadius: 10,
  padding: "9px 12px",
  marginTop: 10,
  fontSize: ".92em",
};

const noteCard = {
  border: "1px solid #e2d5ea",
  borderRadius: 12,
  marginTop: 12,
  overflow: "hidden",
};

const specBox = {
  background: "#2c2340",
  color: "#f2e9f7",
  borderRadius: 10,
  padding: 12,
  marginTop: 10,
  fontSize: ".8em",
  lineHeight: 1.5,
  overflowX: "auto",
  whiteSpace: "pre-wrap",
};

const field = {
  border: "1px solid #d9c7e4",
  borderRadius: 8,
  padding: "5px 8px",
  fontSize: "1em",
};

const th = { padding: "7px 8px", textAlign: "left", borderBottom: "1px solid #e2d5ea" };
const td = { padding: "5px 8px", borderBottom: "1px solid #f0e8f5", verticalAlign: "middle" };
