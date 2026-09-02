// src/pages/shared/ReturnNoteScanner.jsx
// Scan one or many photos of branch return / transfer notes and pull out the
// ITEM CODES, the ORDERED weight, the BRANCH and the TRANSFER NUMBER. The
// product name is filled from our own catalog once the code is in.
//
// A whole stack is read on a single OCR worker (see utils/ocrScan.js), the
// pages can be reordered before or after reading, and the rows reach the
// report in exactly the order the pages are shown here.
// OCR runs in the browser - the images are never uploaded.
//
// NOTHING REACHES THE REPORT UNSEEN
// ---------------------------------
// What the scan produces is a DRAFT, not an answer. Every field on it is
// editable here - the code, the weight, the branch, the transfer number - a
// row can be deleted, and a line the camera missed can be typed in by hand.
// Each weight carries a magnified crop of the very cell it was read from, so
// it can be checked against the paper without hunting for the line.
//
// One class of reading is treated as unsafe rather than merely uncertain: a
// weight whose decimal point had to be placed with no proof anywhere on the
// page, and one printed with a precision this form never uses. Both are 100x
// mistakes if they are wrong, so the dialog refuses to hand the page over
// until they have been typed over or explicitly confirmed.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ocrImages, parseReturnNote, STD_DECIMALS } from "../../utils/ocrScan";

const PURPLE = "#512e5f";
const ACCENT = "#884ea0";
const MAX_PAGES = 15;
/** OCR confidence below which a weight is shown as doubtful, not read. */
const LOW_CONFIDENCE = 70;

let uid = 0;
const nextId = (p = "pg") => `${p}_${Date.now()}_${uid++}`;

const digitsOf = (s) => String(s || "").replace(/\D/g, "");

/** One editable draft row, built from a parsed entry (or from nothing). */
function makeRow(entry) {
  const meta = entry || {};
  return {
    key: nextId("row"),
    code: String(meta.code || ""),
    qty: String(meta.qty || ""),
    // a code we could not find in the catalog starts UNTICKED: it is the one
    // most likely to be an OCR ghost, and it must be a deliberate choice
    pick: !!meta.matched,
    manual: !entry,
    meta,
  };
}

export default function ReturnNoteScanner({
  open,
  onClose,
  branches = [],
  catalog = new Map(),
  onApply,
}) {
  // { id, file, url, result, branch, transferNo, rows, open }
  const [pages, setPages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ index: 0, count: 0, overall: 0 });
  const [error, setError] = useState("");
  const [deep, setDeep] = useState(true);
  const [dragId, setDragId] = useState(null);
  // ticked once the flagged weights have been compared with the paper
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  /* dialog closed: drop the pages and release their object URLs */
  useEffect(() => {
    if (open) return;
    pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    setPages([]);
    setBusy(false);
    setError("");
    setConfirmed(false);
    setProgress({ index: 0, count: 0, overall: 0 });
  }, [open]);

  const addFiles = useCallback((files) => {
    const list = Array.from(files || []).filter((f) => f && /^image\//.test(f.type));
    if (!list.length) {
      setError("Please choose image files (JPG / PNG).");
      return;
    }
    setError("");
    setPages((prev) => {
      const room = MAX_PAGES - prev.length;
      if (room <= 0) {
        setError(`Up to ${MAX_PAGES} pages at a time.`);
        return prev;
      }
      const added = list.slice(0, room).map((file) => ({
        id: nextId(),
        file,
        url: URL.createObjectURL(file),
        result: null,
        branch: "",
        transferNo: "",
        rows: [],
        open: true,
      }));
      if (list.length > room) {
        setError(`Only ${room} more page(s) fit (max ${MAX_PAGES}).`);
      }
      return [...prev, ...added];
    });
  }, []);

  /* paste images straight from the clipboard */
  useEffect(() => {
    if (!open) return undefined;
    const onPaste = (e) => {
      const imgs = Array.from(e.clipboardData?.items || [])
        .filter((i) => /^image\//.test(i.type))
        .map((i) => i.getAsFile())
        .filter(Boolean);
      if (imgs.length) addFiles(imgs);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open, addFiles]);

  /* ---------- page list operations ---------- */
  const patchPage = (id, patch) =>
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const removePage = (id) =>
    setPages((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((p) => p.id !== id);
    });

  const movePage = (id, dir) =>
    setPages((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const dropOn = (targetId) => {
    if (!dragId || dragId === targetId) return;
    setPages((prev) => {
      const from = prev.findIndex((p) => p.id === dragId);
      const to = prev.findIndex((p) => p.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragId(null);
  };

  /* ---------- scanning ---------- */
  const pending = pages.filter((p) => !p.result);

  const scan = async (only) => {
    const todo = only || pending;
    if (!todo.length || busy) return;
    setBusy(true);
    setError("");
    // a fresh read brings fresh flagged weights: a confirmation given for the
    // PREVIOUS batch must not wave them through
    setConfirmed(false);
    setProgress({ index: 0, count: todo.length, overall: 0 });
    try {
      // one engine start-up for the whole stack
      const read = await ocrImages(todo.map((p) => p.file), setProgress, { deep });
      let empty = 0;
      setPages((prev) =>
        prev.map((p) => {
          const at = todo.findIndex((t) => t.id === p.id);
          if (at < 0) return p;
          const parsed = parseReturnNote(read[at] || "", { branches, catalog });
          parsed.raw = read[at]?.text || "";
          parsed.skew = read[at]?.skew || 0;
          if (!parsed.codes.length) empty++;
          return {
            ...p,
            result: parsed,
            branch: parsed.branch || "",
            transferNo: parsed.transferNo || "",
            rows: parsed.codes.map(makeRow),
            open: todo.length === 1,
          };
        })
      );
      if (empty) {
        setError(
          `${empty} page(s) gave no codes - retake those straight above the paper, in good light.`
        );
      }
    } catch (e) {
      setError(e?.message || "Scan failed.");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- the draft, and what it is still missing ---------- */
  const chosenOf = (p) => (p.rows || []).filter((r) => r.pick);
  const totalChosen = pages.reduce((n, p) => n + chosenOf(p).length, 0);

  /* A weight whose decimal point was placed with NO proof from the page, or
     one printed with a precision this form never uses, is a 100x mistake if
     it is wrong. Typing over the number counts as checking that one. */
  const unsafeOf = (p) =>
    chosenOf(p).filter(
      (r) => (r.meta.qtyAssumed || r.meta.qtyOdd) && r.qty === String(r.meta.qty || "")
    );
  const unsafeCount = pages.reduce((n, p) => n + unsafeOf(p).length, 0);

  const namelessOf = (p) => chosenOf(p).filter((r) => digitsOf(r.code).length < 3);
  const namelessCount = pages.reduce((n, p) => n + namelessOf(p).length, 0);

  /* a missing weight is not a WRONG weight, so it warns rather than blocks -
     the row still carries a code and a branch worth filing */
  const weightlessCount = pages.reduce(
    (n, p) => n + chosenOf(p).filter((r) => !String(r.qty).trim()).length,
    0
  );
  const branchlessCount = pages.filter((p) => p.result && !p.branch && chosenOf(p).length).length;

  const blocked = namelessCount > 0 || (unsafeCount > 0 && !confirmed);

  const apply = () => {
    if (blocked || !totalChosen) return;
    // page order on screen == row order in the report
    const entries = [];
    pages.forEach((p) => {
      chosenOf(p).forEach((r) =>
        entries.push({
          code: String(r.code || "").trim(),
          branch: p.branch,
          transferNo: String(p.transferNo || "").trim(),
          ordered: String(r.qty || "").trim(),
        })
      );
    });
    if (!entries.length) return;
    onApply?.({ entries });
    onClose?.();
  };

  if (!open) return null;

  const scanned = pages.filter((p) => p.result).length;

  return (
    <div
      dir="ltr"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30,15,40,.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 12px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 18,
          width: "min(1040px, 100%)",
          boxShadow: "0 18px 50px rgba(0,0,0,.28)",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div
          style={{
            background: ACCENT,
            color: "#fff",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: "bold", fontSize: "1.05em" }}>
            Scan Return Notes - check and correct before they reach the report
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {pages.length > 0 && (
              <span style={{ fontSize: ".9em", opacity: 0.9 }}>
                {scanned}/{pages.length} pages read
              </span>
            )}
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,.2)",
                border: "none",
                color: "#fff",
                borderRadius: 10,
                padding: "6px 12px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ padding: 18 }}>
          {/* add pages */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${ACCENT}`,
              borderRadius: 14,
              padding: pages.length ? 14 : 26,
              textAlign: "center",
              cursor: "pointer",
              background: "#faf6fc",
              color: PURPLE,
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div style={{ fontSize: pages.length ? 22 : 30 }}>📷</div>
            <div style={{ fontWeight: "bold", marginTop: 4 }}>
              {pages.length ? "Add more pages" : "Take / choose the photos of all the notes"}
            </div>
            <div style={{ fontSize: ".9em", opacity: 0.75, marginTop: 4 }}>
              Several at once. Drag them here or paste with Ctrl+V. Up to {MAX_PAGES}{" "}
              pages - they stay on this device.
            </div>
          </div>

          {/* actions */}
          {pages.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                marginTop: 14,
              }}
            >
              <button
                onClick={() => scan()}
                disabled={busy || !pending.length}
                style={{
                  background: busy || !pending.length ? "#b9a3c4" : "#229954",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 22px",
                  fontWeight: "bold",
                  cursor: busy || !pending.length ? "not-allowed" : "pointer",
                }}
              >
                {busy
                  ? `Reading page ${progress.index + 1} of ${progress.count}… ${Math.round(
                      progress.overall * 100
                    )}%`
                  : pending.length === pages.length
                  ? `🔍 Read ${pages.length} page${pages.length === 1 ? "" : "s"}`
                  : `🔍 Read ${pending.length} new page${pending.length === 1 ? "" : "s"}`}
              </button>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: PURPLE,
                  fontWeight: "bold",
                  fontSize: ".92em",
                  cursor: "pointer",
                }}
                title={
                  "Reads every page twice, then reads the weight column a third time " +
                  "from a magnified crop of the original photo. That last pass is what " +
                  "recovers the decimal points."
                }
              >
                <input
                  type="checkbox"
                  checked={deep}
                  disabled={busy}
                  onChange={(e) => setDeep(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                Deep scan (slower - recovers the decimal points)
              </label>

              {error && <span style={{ color: "#c0392b", fontWeight: "bold" }}>{error}</span>}
            </div>
          )}

          {busy && (
            <div
              style={{
                height: 8,
                background: "#eee",
                borderRadius: 6,
                marginTop: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.round(progress.overall * 100)}%`,
                  background: ACCENT,
                  transition: "width .2s",
                }}
              />
            </div>
          )}

          {/* pages */}
          {pages.map((p, idx) => (
            <PageCard
              key={p.id}
              page={p}
              index={idx}
              last={idx === pages.length - 1}
              branches={branches}
              catalog={catalog}
              busy={busy}
              dragging={dragId === p.id}
              onDragStart={() => setDragId(p.id)}
              onDragEnd={() => setDragId(null)}
              onDropHere={() => dropOn(p.id)}
              onMove={(dir) => movePage(p.id, dir)}
              onRemove={() => removePage(p.id)}
              onRescan={() => scan([p])}
              onPatch={(patch) => patchPage(p.id, patch)}
              chosenCount={chosenOf(p).length}
              unsafeCount={unsafeOf(p).length}
            />
          ))}

          {/* footer */}
          {scanned > 0 && (
            <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 14 }}>
              {namelessCount > 0 && (
                <Notice tone="bad">
                  <b>
                    {namelessCount} selected row{namelessCount === 1 ? " has" : "s have"} no
                    item code.
                  </b>{" "}
                  Type the code, or untick the row.
                </Notice>
              )}

              {(weightlessCount > 0 || branchlessCount > 0) && (
                <Notice tone="warn">
                  {branchlessCount > 0 && (
                    <div>
                      <b>
                        {branchlessCount} page{branchlessCount === 1 ? "" : "s"} still
                        {branchlessCount === 1 ? " has" : " have"} no branch.
                      </b>{" "}
                      Those rows will reach the report without one.
                    </div>
                  )}
                  {weightlessCount > 0 && (
                    <div>
                      <b>
                        {weightlessCount} selected row{weightlessCount === 1 ? "" : "s"}{" "}
                        {weightlessCount === 1 ? "has" : "have"} no weight.
                      </b>{" "}
                      Type it from the paper, or leave it and fill it in the report.
                    </div>
                  )}
                </Notice>
              )}

              {unsafeCount > 0 && (
                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    background: "#fdecea",
                    border: "1px solid #e6a7a2",
                    borderRadius: 12,
                    padding: "10px 14px",
                    color: "#a83228",
                    cursor: "pointer",
                    marginBottom: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 2 }}
                  />
                  <span style={{ fontSize: ".93em" }}>
                    <b>
                      {unsafeCount} weight{unsafeCount === 1 ? "" : "s"} still need
                      {unsafeCount === 1 ? "s" : ""} a human eye.
                    </b>{" "}
                    The scan had to place {unsafeCount === 1 ? "its" : "their"} decimal
                    point without a single readable one on the page. Compare the red cells
                    with the paper - typing over a number clears its flag - then tick this
                    box to confirm you have.
                  </span>
                </label>
              )}

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={apply}
                  disabled={!totalChosen || busy || blocked}
                  title={
                    blocked
                      ? "Fix or confirm the highlighted rows first"
                      : "Add the ticked rows to the report"
                  }
                  style={{
                    background: totalChosen && !busy && !blocked ? "#229954" : "#a9c8b8",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "11px 26px",
                    fontWeight: "bold",
                    fontSize: "1.02em",
                    cursor: totalChosen && !busy && !blocked ? "pointer" : "not-allowed",
                  }}
                >
                  ➕ Add {totalChosen} row{totalChosen === 1 ? "" : "s"} to the report
                </button>
                <span style={{ color: "#6b5b73", fontSize: ".92em" }}>
                  Rows are added in the page order above - drag a page, or use ↑ ↓, to
                  change it.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= one page ================= */

function PageCard({
  page,
  index,
  last,
  branches,
  catalog,
  busy,
  dragging,
  onDragStart,
  onDragEnd,
  onDropHere,
  onMove,
  onRemove,
  onRescan,
  onPatch,
  chosenCount,
  unsafeCount,
}) {
  const r = page.result;
  const rows = page.rows || [];

  const setRows = (next) => onPatch({ rows: next });
  const patchRow = (key, patch) =>
    setRows(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const dropRow = (key) => setRows(rows.filter((row) => row.key !== key));
  const addRow = (seed) => setRows([...rows, { ...makeRow(null), ...(seed || {}) }]);
  const setAll = (fn) => setRows(rows.map((row) => ({ ...row, pick: fn(row) })));

  const total = useMemo(
    () =>
      rows
        .filter((row) => row.pick)
        .reduce((sum, row) => {
          const n = Number(row.qty);
          return sum + (Number.isFinite(n) ? n : 0);
        }, 0),
    [rows]
  );

  /* anything hand-typed or hand-added, so a re-read can warn before losing it */
  const edited = useMemo(
    () =>
      rows.some(
        (row) =>
          row.manual ||
          row.code !== String(row.meta.code || "") ||
          row.qty !== String(row.meta.qty || "")
      ),
    [rows]
  );

  return (
    <div
      draggable={!busy}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropHere();
      }}
      style={{
        marginTop: 14,
        border: "1px solid #e6dced",
        borderRadius: 14,
        background: dragging ? "#f3e9f8" : "#fff",
        opacity: dragging ? 0.7 : 1,
        overflow: "hidden",
      }}
    >
      {/* summary row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 10,
          background: "#f8f4fb",
          flexWrap: "wrap",
        }}
      >
        <span
          title="Drag to reorder"
          style={{
            cursor: busy ? "default" : "grab",
            background: ACCENT,
            color: "#fff",
            borderRadius: 9,
            minWidth: 30,
            height: 30,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
          }}
        >
          {index + 1}
        </span>

        <img
          src={page.url}
          alt={`page ${index + 1}`}
          style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 8 }}
        />

        {r ? (
          <>
            <label style={{ fontWeight: "bold", color: PURPLE }}>Branch:</label>
            <select
              value={page.branch}
              onChange={(e) => onPatch({ branch: e.target.value })}
              style={{
                padding: "7px 10px",
                borderRadius: 10,
                // flagged the same way as an empty Transfer No, so a page that
                // is about to be filed without a branch is visible at a glance
                border: `1px solid ${page.branch ? "#d7c6e0" : "#e6a23c"}`,
                fontWeight: "bold",
                color: PURPLE,
                minWidth: 150,
              }}
            >
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <label style={{ fontWeight: "bold", color: PURPLE }}>Transfer No:</label>
            <input
              value={page.transferNo}
              onChange={(e) => onPatch({ transferNo: e.target.value })}
              placeholder="e.g. 02323"
              title={r.docNo ? `Read from ${r.docNo}` : "Not found on this page - type it"}
              style={{
                padding: "7px 10px",
                borderRadius: 10,
                border: `1px solid ${page.transferNo ? "#d7c6e0" : "#e6a23c"}`,
                fontWeight: "bold",
                color: PURPLE,
                width: 110,
              }}
            />
            <span style={{ color: PURPLE, fontWeight: "bold" }}>
              {chosenCount}/{rows.length} rows
            </span>
            {unsafeCount > 0 && (
              <span style={{ color: "#a83228", fontWeight: "bold" }}>
                ⚠ {unsafeCount} to check
              </span>
            )}
          </>
        ) : (
          <span style={{ color: "#8a7b92", fontWeight: "bold" }}>
            {busy ? "waiting…" : "not read yet"}
          </span>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {r && (
            <button onClick={() => onPatch({ open: !page.open })} style={miniBtn} disabled={busy}>
              {page.open ? "Hide rows" : "Show rows"}
            </button>
          )}
          {r && (
            <button
              onClick={() => {
                // re-reading rebuilds the draft from scratch: say so before
                // any hand-typed code or weight on this page is thrown away
                if (edited && !window.confirm("Read this page again? The corrections you typed on it will be lost.")) {
                  return;
                }
                onRescan();
              }}
              style={miniBtn}
              disabled={busy}
              title="Read this page again"
            >
              ↻
            </button>
          )}
          <button onClick={() => onMove(-1)} style={miniBtn} disabled={busy || index === 0}>
            ↑
          </button>
          <button onClick={() => onMove(1)} style={miniBtn} disabled={busy || last}>
            ↓
          </button>
          <button
            onClick={onRemove}
            style={{ ...miniBtn, color: "#c0392b" }}
            disabled={busy}
            title="Remove this page"
          >
            ✕
          </button>
        </div>
      </div>

      {/* rows */}
      {r && page.open && (
        <div style={{ padding: 10 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <button onClick={() => setAll(() => true)} style={miniBtn}>
              Select all
            </button>
            <button onClick={() => setAll(() => false)} style={miniBtn}>
              Clear all
            </button>
            <button
              onClick={() => setAll((row) => !!catalog.get(digitsOf(row.code)))}
              style={miniBtn}
            >
              Only known codes
            </button>
            <button onClick={() => addRow()} style={{ ...miniBtn, color: "#1e8449" }}>
              ＋ Add a row by hand
            </button>
          </div>

          {rows.length > 0 ? (
            <div style={{ border: "1px solid #eee", borderRadius: 10, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ background: "#e8daef", color: PURPLE }}>
                    <th style={th(40)}></th>
                    <th style={th(38)}>#</th>
                    <th style={th(110)}>ITEM CODE</th>
                    <th style={th()}>PRODUCT</th>
                    <th style={th(210)}>ORDERED (KG)</th>
                    <th style={th(40)}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <DraftRow
                      key={row.key}
                      row={row}
                      n={i + 1}
                      catalog={catalog}
                      onPatch={(patch) => patchRow(row.key, patch)}
                      onDropRow={() => dropRow(row.key)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: "#c0392b", fontWeight: "bold" }}>
              No rows on this page - add them by hand, or retake the photo.
            </div>
          )}

          {rows.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: 8,
                color: PURPLE,
                fontWeight: "bold",
                fontSize: ".92em",
              }}
            >
              <span>
                Total of the ticked rows:{" "}
                <b style={{ fontVariantNumeric: "tabular-nums" }}>
                  {total.toFixed(STD_DECIMALS)}
                </b>{" "}
                KG
              </span>
              <span style={{ opacity: 0.7, fontWeight: "normal" }}>
                compare it with the paper before you file the page
              </span>
            </div>
          )}

          {!!r.skew && (
            <Notice tone="ok">
              Page was tilted <b>{Math.abs(r.skew).toFixed(1)}°</b> and has been
              straightened before reading — the table columns line up now.
            </Notice>
          )}

          {!r.hasColumns && rows.length > 0 && (
            <Notice tone="warn">
              <b>The Ordered / Delivered columns were not found on this page.</b> The
              weights below were taken from the end of each line instead, which is the
              weaker reading - check them, or retake the photo with the whole table in
              frame.
            </Notice>
          )}

          {r.unread?.length > 0 && (
            <Notice tone="warn">
              <b>
                {r.unread.length} line{r.unread.length === 1 ? "" : "s"} could not be read
              </b>{" "}
              - add {r.unread.length === 1 ? "it" : "them"} by hand:
              <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                {r.unread.map((ln, i) => (
                  <li key={i} style={{ marginBottom: 3 }}>
                    <span style={{ opacity: 0.85 }}>{ln}</span>{" "}
                    <button
                      onClick={() => addRow({ meta: { line: ln } })}
                      style={{ ...miniBtn, padding: "2px 8px", fontSize: ".85em" }}
                    >
                      ＋ add
                    </button>
                  </li>
                ))}
              </ul>
            </Notice>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= one editable draft row ================= */

function DraftRow({ row, n, catalog, onPatch, onDropRow }) {
  const item = catalog.get(digitsOf(row.code));
  const edited = row.qty !== String(row.meta.qty || "");
  const tone = qtyTone(row, edited);

  return (
    <tr style={{ borderTop: "1px solid #f1e9f5" }}>
      <td style={{ textAlign: "center", padding: 6 }}>
        <input
          type="checkbox"
          checked={!!row.pick}
          onChange={(e) => onPatch({ pick: e.target.checked })}
          style={{ width: 18, height: 18 }}
        />
      </td>

      {/* the line's place on the paper, so a row can be called out by number */}
      <td
        style={{
          textAlign: "center",
          padding: 6,
          color: "#8a7b92",
          fontWeight: "bold",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {n}
      </td>

      <td style={{ padding: 6 }}>
        <input
          value={row.code}
          onChange={(e) => onPatch({ code: e.target.value })}
          inputMode="numeric"
          placeholder="code"
          title={
            row.meta.code && row.code !== row.meta.code
              ? `Scanned as ${row.meta.code}`
              : "The item code as it was read - correct it if it is wrong"
          }
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: 8,
            border: `1px solid ${item ? "#7dcea0" : "#e6a23c"}`,
            background: item ? "#f6fdf9" : "#fffaf2",
            fontWeight: "bold",
            fontSize: "1.05em",
            letterSpacing: ".5px",
            color: PURPLE,
          }}
        />
      </td>

      <td style={{ padding: "6px 8px", fontSize: ".92em" }}>
        {item ? (
          <span style={{ color: "#1e8449" }}>{item.description}</span>
        ) : (
          <span style={{ color: "#c0392b", fontWeight: "bold" }}>
            {digitsOf(row.code).length < 3 ? "type the code" : "not in our catalog"}
          </span>
        )}
        {VIA[row.meta.via] && (
          <span
            style={{
              marginLeft: 8,
              fontSize: ".78em",
              fontWeight: "bold",
              background: VIA[row.meta.via].bg,
              color: VIA[row.meta.via].fg,
              borderRadius: 8,
              padding: "2px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {VIA[row.meta.via].text}
          </span>
        )}
        {row.manual && (
          <span style={{ marginLeft: 8, fontSize: ".78em", color: "#6b5b73" }}>
            added by hand{row.meta.line ? ` - ${row.meta.line}` : ""}
          </span>
        )}

        {/* the code matched the catalog, but the NAME printed beside it belongs
            to a different product one digit away - offered, never applied */}
        {row.meta.suggest && row.code === row.meta.code && (
          <div style={{ marginTop: 4, fontSize: ".82em", color: "#a83228" }}>
            ⚠ the name on this line reads as{" "}
            <b>{row.meta.suggest.name}</b>{" "}
            <button
              onClick={() => onPatch({ code: row.meta.suggest.code })}
              style={{
                ...miniBtn,
                padding: "2px 8px",
                fontSize: ".95em",
                background: "#fdecea",
                color: "#a83228",
              }}
            >
              use {row.meta.suggest.code}
            </button>
          </div>
        )}
      </td>

      <td style={{ padding: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {row.meta.snip ? (
            <img
              src={row.meta.snip}
              alt="the cell on the paper"
              title="This is the cell it was read from - compare it with the number"
              style={{
                height: 26,
                maxWidth: 104,
                objectFit: "contain",
                border: "1px solid #eadff0",
                borderRadius: 5,
                background: "#fff",
              }}
            />
          ) : null}
          <input
            value={row.qty}
            onChange={(e) => onPatch({ qty: e.target.value })}
            inputMode="decimal"
            placeholder={(0).toFixed(STD_DECIMALS)}
            title={tone.tip}
            style={{
              width: 82,
              marginLeft: "auto",
              textAlign: "right",
              padding: "6px 8px",
              borderRadius: 8,
              border: `1px solid ${tone.border}`,
              background: tone.bg,
              color: tone.fg,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </div>
        {tone.note && (
          <div
            style={{
              fontSize: ".74em",
              fontWeight: "bold",
              color: tone.fg,
              textAlign: "right",
              marginTop: 2,
            }}
          >
            {tone.note}
          </div>
        )}
      </td>

      <td style={{ padding: 6, textAlign: "center" }}>
        <button
          onClick={onDropRow}
          title="Remove this row from the draft"
          style={{
            background: "none",
            border: "none",
            color: "#c0392b",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "1.05em",
          }}
        >
          ✕
        </button>
      </td>
    </tr>
  );
}

/**
 * What the ORDERED cell says about itself. The distinction that matters is
 * not "read" versus "not read" but how the DECIMAL POINT got there: read from
 * the paper, restored from a convention the page proved, or placed from the
 * form's standard with nothing on the page to back it up.
 */
function qtyTone(row, edited) {
  const m = row.meta || {};
  const asRead = m.qtyRaw ? `Scanned as "${m.qtyRaw}". ` : "";
  if (edited)
    return {
      bg: "#eef7ff",
      border: "#8fbfe8",
      fg: "#1a5276",
      note: "typed by you",
      tip: `${asRead}You typed this value.`,
    };
  if (!row.qty)
    return {
      bg: "#fffaf2",
      border: "#e6a23c",
      fg: "#8a5a00",
      note: "not read",
      tip: "No weight could be read on this line - type it from the paper.",
    };
  if (m.qtyAssumed)
    return {
      bg: "#fdecea",
      border: "#d9534f",
      fg: "#a83228",
      note: "check this ⚠",
      tip:
        `${asRead}Not one decimal point survived anywhere on this page, so the point ` +
        `was placed by the form's two-decimal rule. Compare it with the paper.`,
    };
  if (m.qtyOdd)
    return {
      bg: "#fffaf2",
      border: "#e6a23c",
      fg: "#8a5a00",
      note: "odd precision",
      tip: `${asRead}This form always prints two decimals, so this reading is doubtful.`,
    };
  if (m.qtyFixed)
    return {
      bg: "#fdf9ee",
      border: "#e0c07a",
      fg: "#7d5a1e",
      note: "point restored",
      tip: `${asRead}The decimal point was put back where this page prints it.`,
    };
  /* The engine's own confidence in the digits it returned. A clean printed
     weight scores in the high eighties; anything this low is a doubtful
     reading even when the decimal point is where it belongs. */
  if (m.qtyConf > 0 && m.qtyConf < LOW_CONFIDENCE)
    return {
      bg: "#fffaf2",
      border: "#e6a23c",
      fg: "#8a5a00",
      note: `read at ${Math.round(m.qtyConf)}%`,
      tip: `${asRead}The engine was only ${Math.round(
        m.qtyConf
      )}% sure of these digits - check them against the crop.`,
    };
  if (m.qtySrc === "zoom")
    return {
      bg: "#eafaf1",
      border: "#7dcea0",
      fg: "#1e8449",
      note: "",
      tip: "Read from a magnified crop of the ORDERED column - decimal point included.",
    };
  if (m.qtySrc === "column")
    return {
      bg: "#eafaf1",
      border: "#7dcea0",
      fg: "#1e8449",
      note: "",
      tip: "Read from the ORDERED column of the table.",
    };
  return {
    bg: "#fff",
    border: "#d7c6e0",
    fg: PURPLE,
    note: "",
    tip: "Read from the end of the line - the weaker reading.",
  };
}

function Notice({ tone = "warn", children }) {
  const skin =
    tone === "bad"
      ? { bg: "#fdecea", border: "#e6a7a2", fg: "#a83228" }
      : tone === "ok"
      ? { bg: "#eaf7ef", border: "#a7d8bb", fg: "#1e6b40" }
      : { bg: "#fdf3e7", border: "#f0c894", fg: "#7d5a1e" };
  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 10,
        background: skin.bg,
        border: `1px solid ${skin.border}`,
        borderRadius: 10,
        padding: "8px 12px",
        color: skin.fg,
        fontSize: ".92em",
      }}
    >
      {children}
    </div>
  );
}

/* how each code was obtained - shown as a small badge */
const VIA = {
  corrected: { text: "auto-corrected", bg: "#fdf3e7", fg: "#8a5a00" },
  name: { text: "recovered - verify", bg: "#fdf3e7", fg: "#8a5a00" },
  ocr: { text: "unverified", bg: "#fdecea", fg: "#a83228" },
};

const miniBtn = {
  background: "#f4ecf7",
  color: PURPLE,
  border: "none",
  borderRadius: 10,
  padding: "7px 12px",
  fontWeight: "bold",
  cursor: "pointer",
};

const th = (w) => ({
  padding: "8px 10px",
  fontSize: ".92em",
  textAlign: "left",
  width: w ? `${w}px` : undefined,
});
